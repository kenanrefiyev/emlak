import { afterAll, beforeAll, describe, expect, it } from "vitest";
import sharp from "sharp";
import { db } from "@/server/db";
import { ServiceError } from "@/server/errors";
import {
  addListingImage,
  confirmListingAvailability,
  createListing,
  moderateListing,
  parseListingInput,
  setListingAvailability,
  submitListing,
  type Actor,
} from "@/server/listings/service";
import { searchListings, searchMapPoints } from "@/server/listings/queries";
import { createRoommateAd, moderateRoommateAd, parseRoommateInput } from "@/server/roommates/service";
import { createContactRequest, createSavedSearch, respondToContact, setSavedRoommate } from "@/server/engagement";
import { notifySearchMatches } from "@/server/notifications";
import { ownerListings, parseListingFilter } from "@/server/dashboard";
import { parseListingFilters } from "@/lib/search/listing-filters";

const DOMAIN = "@sf.yuva.test";
const contactCopy = { subject: "c", body: (n: string, l: string) => `${n} ${l}` };

async function cleanup() {
  await db.user.deleteMany({ where: { email: { endsWith: DOMAIN } } });
}

async function makeUser(name: string, role: "USER" | "OWNER" | "AGENT" | "ADMIN" = "USER") {
  const u = await db.user.create({
    data: { email: `${name}${DOMAIN}`, name: `${name} Test`, role, passwordHash: "disabled", profile: { create: {} } },
  });
  return { id: u.id, role: u.role, name: u.name } as Actor & { name: string };
}

async function expectCode(p: Promise<unknown>, code: string) {
  await expect(p).rejects.toSatisfy((e: unknown) => e instanceof ServiceError && e.code === code);
}

let yasamal: string;
let baku: string;
let owner: Actor & { name: string };
let student: Actor & { name: string };
let stranger: Actor & { name: string };
let admin: Actor & { name: string };

beforeAll(async () => {
  await cleanup();
  yasamal = (await db.district.findUniqueOrThrow({ where: { slug: "yasamal" } })).id;
  baku = (await db.city.findUniqueOrThrow({ where: { slug: "baku" } })).id;
  owner = await makeUser("sf-owner", "OWNER");
  student = await makeUser("sf-student");
  stranger = await makeUser("sf-stranger");
  admin = await makeUser("sf-admin", "ADMIN");
});
afterAll(async () => {
  await cleanup();
  await db.$disconnect();
});

const TITLE = "Sakit otaq Yasamalda, tələbə üçün ideal";

function listingRaw(overrides: Record<string, unknown> = {}) {
  return {
    category: "PRIVATE_ROOM",
    title: TITLE,
    description: "İşıqlı otaq, dərs masası və qarderob var. Evdə iki tələbə yaşayır, metroya yaxındır.",
    monthlyRent: "220",
    districtId: yasamal,
    residentsCount: "2",
    availableSpaces: "1",
    furnishing: "FURNISHED",
    utilities: "NOT_INCLUDED",
    utilitiesCost: "25",
    internet: "on",
    internetCost: "10",
    otherCosts: "0",
    costSharers: "3",
    heating: "CENTRAL",
    availableFrom: "2026-11-01",
    minDurationMonths: "3",
    amenityIds: [],
    ...overrides,
  };
}

async function publishedListing(overrides: Record<string, unknown> = {}, by: Actor = owner) {
  const { id } = await createListing(by, parseListingInput(listingRaw(overrides)));
  const jpeg = await sharp({ create: { width: 800, height: 600, channels: 3, background: "#88aacc" } }).jpeg().toBuffer();
  await addListingImage(by, id, { buffer: jpeg, type: "image/jpeg" });
  await submitListing(by, id);
  await moderateListing(admin, id, "approve");
  return id;
}

const ids = async (q: Record<string, string>) =>
  (await searchListings(parseListingFilters({ district: "yasamal", ...q }, "students"), "az", "students")).items.map((i) => i.id);

describe("rental cost fields", () => {
  it("stores running costs and drops a utilities amount when utilities are included", async () => {
    const a = await createListing(owner, parseListingInput(listingRaw()));
    const b = await createListing(owner, parseListingInput(listingRaw({ utilities: "INCLUDED", utilitiesCost: "40", title: `${TITLE} 2` })));
    const [ra, rb] = await Promise.all([db.listing.findUniqueOrThrow({ where: { id: a.id } }), db.listing.findUniqueOrThrow({ where: { id: b.id } })]);
    expect(ra).toMatchObject({ utilitiesCost: 25, internetCost: 10, otherCosts: 0, costSharers: 3 });
    expect(rb.utilitiesCost).toBeNull();
  });

  it("puts the estimated total on search cards only when every part is known", async () => {
    const id = await publishedListing({ title: `${TITLE} kart` });
    const card = (await searchListings(parseListingFilters({ district: "yasamal" }, "students"), "az", "students")).items.find((i) => i.id === id);
    // Per-place price: 220 + (25 + 10 + 0) / 3 ≈ 232.
    expect(card?.monthlyTotal).toEqual({ value: 232, complete: true });
  });
});

describe("availability lifecycle", () => {
  let id: string;
  beforeAll(async () => {
    id = await publishedListing({ title: `${TITLE} status` });
  });

  it("is confirmed when submitted and can be updated only by the owner, without re-moderation", async () => {
    const row = await db.listing.findUniqueOrThrow({ where: { id } });
    expect(row.availabilityConfirmedAt).not.toBeNull();
    await expectCode(setListingAvailability(stranger, id, "RESERVED"), "forbidden");
    await expectCode(confirmListingAvailability(stranger, id), "forbidden");
    await setListingAvailability(owner, id, "RESERVED");
    const after = await db.listing.findUniqueOrThrow({ where: { id } });
    expect(after.status).toBe("PUBLISHED");
    expect(after.availability).toBe("RESERVED");
  });

  it("filters reserved listings out of 'available only' but keeps them in default search", async () => {
    expect(await ids({})).toContain(id);
    expect(await ids({ avail: "1" })).not.toContain(id);
    await setListingAvailability(owner, id, "AVAILABLE");
    expect(await ids({ avail: "1" })).toContain(id);
  });

  it("flags listings not confirmed for a while and clears the flag on confirmation", async () => {
    await db.listing.update({ where: { id }, data: { availabilityConfirmedAt: new Date(Date.now() - 30 * 86_400_000) } });
    const flagged = await ownerListings(owner.id, "az", parseListingFilter({}));
    expect(flagged.items.find((i) => i.id === id)?.needsConfirmation).toBe(true);
    await confirmListingAvailability(owner, id);
    const fresh = await ownerListings(owner.id, "az", parseListingFilter({}));
    expect(fresh.items.find((i) => i.id === id)?.needsConfirmation).toBe(false);
  });
});

describe("search filters and map", () => {
  it("separates included and excluded utilities and returns map points for the same filters", async () => {
    const incl = await publishedListing({ title: `${TITLE} daxil`, utilities: "INCLUDED" });
    const excl = await publishedListing({ title: `${TITLE} ayrıca` });
    expect(await ids({ utilities: "1" })).toContain(incl);
    expect(await ids({ utilities: "1" })).not.toContain(excl);
    expect(await ids({ utilities: "0" })).toContain(excl);
    expect(await ids({ utilities: "0" })).not.toContain(incl);
    const map = await searchMapPoints(parseListingFilters({ district: "yasamal", utilities: "0" }, "students"), "az", "students");
    expect(map.points.map((p) => p.id)).toContain(excl);
    expect(map.points.map((p) => p.id)).not.toContain(incl);
  });

  it("'verified owner' needs a completed identity review", async () => {
    const id = await publishedListing({ title: `${TITLE} sahib` });
    expect(await ids({ vowner: "1" })).not.toContain(id);
    await db.userProfile.update({ where: { userId: owner.id }, data: { verificationStatus: "VERIFIED", verifiedAt: new Date() } });
    expect(await ids({ vowner: "1" })).toContain(id);
    await db.userProfile.update({ where: { userId: owner.id }, data: { verificationStatus: "NONE", verifiedAt: null } });
  });
});

describe("notifications", () => {
  // A second landlord: the first one has used up the per-user listing quota above.
  let landlord: Actor & { name: string };
  beforeAll(async () => {
    landlord = await makeUser("sf-landlord", "OWNER");
  });

  it("alerts matching saved searches once per listing, never the owner or non-matching searches", async () => {
    await createSavedSearch(student.id, { kind: "LISTINGS", name: "Yasamal ucuz", query: "district=yasamal&max=300" });
    await createSavedSearch(student.id, { kind: "LISTINGS", name: "Yasamal otaq", query: "district=yasamal&type=private_room" });
    await createSavedSearch(stranger.id, { kind: "LISTINGS", name: "Bahalı", query: "district=yasamal&min=500" });
    await createSavedSearch(landlord.id, { kind: "LISTINGS", name: "Öz axtarışım", query: "district=yasamal" });
    const id = await publishedListing({ title: `${TITLE} bildiriş` }, landlord);
    await notifySearchMatches(id); // a repeated trigger must not duplicate
    const rows = await db.notification.findMany({ where: { type: "SEARCH_MATCH", href: `/listings/${id}` } });
    expect(rows.map((r) => r.userId)).toEqual([student.id]);
  });

  it("tells the owner about an inquiry and the sender about the answer", async () => {
    const id = await publishedListing({ title: `${TITLE} sorğu` }, landlord);
    const req = await createContactRequest(student, { listingId: id, message: "Salam, otaq hələ boşdur? Baxmaq istərdim." }, { locale: "az", copy: contactCopy });
    const received = await db.notification.findFirst({ where: { userId: landlord.id, dedupeKey: `inquiry:${req.id}` } });
    expect(received).toMatchObject({ type: "INQUIRY_RECEIVED", href: "/dashboard/inquiries" });
    await respondToContact(landlord.id, req.id, true);
    const answer = await db.notification.findFirst({ where: { userId: student.id, dedupeKey: `response:${req.id}` } });
    expect(answer?.type).toBe("INQUIRY_ACCEPTED");
  });
});

describe("roommate profiles", () => {
  it("keeps lifestyle answers optional and saves only other people's public ads", async () => {
    const ad = await createRoommateAd(
      stranger,
      parseRoommateInput({
        type: "SEEKING_PARTNER",
        cityId: baku,
        title: "Yasamalda birlikdə ev tutmaq istəyirəm",
        description: "Sakit, səliqəli tələbəyəm, dərsə çox vaxt ayırıram.",
        budgetMin: "200",
        budgetMax: "280",
        groupSize: "1",
        preferredDistrictIds: [yasamal],
        moveInDate: "2026-11-05",
        durationMonths: "9",
        noise: "QUIET",
      }),
    );
    const row = await db.roommateAd.findUniqueOrThrow({ where: { id: ad.id } });
    expect(row).toMatchObject({ smoking: null, cleaning: null, sleepSchedule: null, guests: null, noise: "QUIET", showProfile: false });

    await expectCode(setSavedRoommate(student.id, ad.id, true), "not_found"); // not approved yet
    await moderateRoommateAd(admin, ad.id, "approve");
    await expectCode(setSavedRoommate(stranger.id, ad.id, true), "own_item");
    await setSavedRoommate(student.id, ad.id, true);
    await setSavedRoommate(student.id, ad.id, true);
    expect(await db.savedRoommateAd.count({ where: { roommateAdId: ad.id } })).toBe(1);
    await setSavedRoommate(student.id, ad.id, false);
    expect(await db.savedRoommateAd.count({ where: { roommateAdId: ad.id } })).toBe(0);
  });
});
