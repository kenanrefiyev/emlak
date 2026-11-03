import { afterAll, beforeAll, describe, expect, it } from "vitest";
import sharp from "sharp";
import { db } from "@/server/db";
import { ServiceError } from "@/server/errors";
import { authenticate, registerUser, type EmailCopy } from "@/server/auth/service";
import { createSessionRecord, findSessionUser } from "@/server/auth/sessions";
import {
  addListingImage,
  createListing,
  markRented,
  moderateListing,
  parseListingInput,
  submitListing,
  updateListing,
  type Actor,
} from "@/server/listings/service";
import { searchListings } from "@/server/listings/queries";
import { processImage } from "@/server/storage/images";
import { createRoommateAd, moderateRoommateAd, parseRoommateInput } from "@/server/roommates/service";
import { matchesForAd, searchRoommates } from "@/server/roommates/queries";
import { contactRequestsFor, createContactRequest, createReport, respondToContact, setSaved } from "@/server/engagement";
import { setUserSuspended } from "@/server/admin";
import { requestVerification, reviewVerification, updateAgentProfile } from "@/server/agents";
import { parseListingFilters } from "@/lib/search/listing-filters";
import { parseRoommateFilters } from "@/lib/search/roommate-filters";

const DOMAIN = "@it.yuva.test";
const copy: EmailCopy = { verifySubject: "v", verifyBody: (l) => l, resetSubject: "r", resetBody: (l) => l };
const contactCopy = { subject: "c", body: (n: string, l: string) => `${n} ${l}` };

async function cleanup() {
  await db.user.deleteMany({ where: { email: { endsWith: DOMAIN } } });
  await db.rateLimitHit.deleteMany({ where: { OR: [{ key: { contains: "it-" } }, { key: { contains: DOMAIN } }] } });
}

async function makeUser(name: string, role: "USER" | "OWNER" | "AGENT" | "ADMIN" = "USER", extra: { phone?: string } = {}) {
  const u = await db.user.create({
    data: {
      email: `${name}${DOMAIN}`,
      name: `${name} Test`,
      role,
      passwordHash: "disabled",
      phone: extra.phone ?? null,
      profile: { create: {} },
      ...(role === "AGENT" ? { agentProfile: { create: {} } } : {}),
    },
  });
  return { id: u.id, role: u.role, name: u.name } as Actor & { name: string };
}

async function expectCode(p: Promise<unknown>, code: string) {
  await expect(p).rejects.toSatisfy((e: unknown) => e instanceof ServiceError && e.code === code);
}

async function jpeg(w = 800, h = 600) {
  return sharp({ create: { width: w, height: h, channels: 3, background: "#88aacc" } }).jpeg().toBuffer();
}

let yasamal: string;
let nesimi: string;
let baku: string;

beforeAll(async () => {
  await cleanup();
  yasamal = (await db.district.findUniqueOrThrow({ where: { slug: "yasamal" } })).id;
  baku = (await db.city.findUniqueOrThrow({ where: { slug: "baku" } })).id;
  nesimi = (await db.district.findUniqueOrThrow({ where: { slug: "nesimi" } })).id;
});
afterAll(async () => {
  await cleanup();
  await db.$disconnect();
});

function listingRaw(overrides: Record<string, unknown> = {}) {
  return {
    category: "PRIVATE_ROOM",
    title: "Test otağı Elmlər Akademiyasında",
    description: "İşıqlı otaq, dərs masası və qarderob var. Evdə iki tələbə yaşayır, metroya yaxındır.",
    monthlyRent: "240",
    districtId: yasamal,
    residentsCount: "2",
    availableSpaces: "1",
    furnishing: "FURNISHED",
    utilities: "INCLUDED",
    heating: "CENTRAL",
    availableFrom: "2026-11-01",
    minDurationMonths: "3",
    amenityIds: [],
    ...overrides,
  };
}

describe("registration and login", () => {
  it("registers a hashed-password user and rejects a duplicate email", async () => {
    const raw = { name: "Reg User", email: `reg${DOMAIN}`, password: "secret123", passwordConfirm: "secret123", accountType: "USER", acceptTerms: "on" };
    const user = await registerUser(raw, { ip: "it-reg", locale: "az", copy });
    const row = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(row.passwordHash).toMatch(/^\$2/);
    expect(row.passwordHash).not.toContain("secret123");
    await expect(registerUser(raw, { ip: "it-reg", locale: "az", copy })).rejects.toMatchObject({ code: "validation", fieldErrors: { email: "emailTaken" } });
  });

  it("logs in with the right password, rejects a wrong one and throttles repeated failures", async () => {
    const ok = await authenticate({ email: `reg${DOMAIN}`, password: "secret123" }, "it-ip1");
    expect(ok.role).toBe("USER");
    await expectCode(authenticate({ email: `reg${DOMAIN}`, password: "nope12345" }, "it-ip1"), "invalid_credentials");
    for (let i = 0; i < 4; i++) await authenticate({ email: `reg${DOMAIN}`, password: "nope12345" }, "it-ip1").catch(() => undefined);
    await expectCode(authenticate({ email: `reg${DOMAIN}`, password: "secret123" }, "it-ip1"), "rate_limited");
  });
});

describe("listing lifecycle, ownership and moderation", () => {
  let owner: Actor;
  let stranger: Actor;
  let admin: Actor;
  let listingId: string;

  beforeAll(async () => {
    owner = await makeUser("owner");
    stranger = await makeUser("stranger");
    admin = await makeUser("admin", "ADMIN");
  });

  it("creates a draft and refuses edits by someone else", async () => {
    ({ id: listingId } = await createListing(owner, parseListingInput(listingRaw())));
    const row = await db.listing.findUniqueOrThrow({ where: { id: listingId }, include: { translations: true } });
    expect(row.status).toBe("DRAFT");
    expect(row.translations).toHaveLength(1);
    expect(row.translations[0]!.isOriginal).toBe(true);
    await expectCode(updateListing(stranger, listingId, parseListingInput(listingRaw({ monthlyRent: "100" }))), "forbidden");
  });

  it("cannot be submitted without a photo; accepts a real image", async () => {
    await expectCode(submitListing(owner, listingId), "needs_image");
    const img = await addListingImage(owner, listingId, { buffer: await jpeg(), type: "image/jpeg" });
    expect(img.url).toMatch(/\.webp$/);
    await expectCode(addListingImage(stranger, listingId, { buffer: await jpeg(), type: "image/jpeg" }), "forbidden");
    await submitListing(owner, listingId);
    expect((await db.listing.findUniqueOrThrow({ where: { id: listingId } })).status).toBe("PENDING_REVIEW");
  });

  it("is not public until an admin approves it", async () => {
    const f = parseListingFilters({ district: "yasamal", max: "250", type: "private_room" }, "students");
    expect((await searchListings(f, "az", "students")).items.map((i) => i.id)).not.toContain(listingId);
    await expectCode(moderateListing(owner, listingId, "approve"), "forbidden");
    await expectCode(moderateListing(admin, listingId, "reject", "  "), "validation");
    await moderateListing(admin, listingId, "approve");
    const audit = await db.auditLog.findFirst({ where: { entityId: listingId, action: "listing.approve" } });
    expect(audit?.actorId).toBe(admin.id);
  });

  it("is found by combined filters and excluded by non-matching ones", async () => {
    const hit = await searchListings(parseListingFilters({ district: "yasamal", max: "250", type: "private_room" }, "students"), "az", "students");
    expect(hit.items.map((i) => i.id)).toContain(listingId);
    const missPrice = await searchListings(parseListingFilters({ district: "yasamal", max: "200" }, "students"), "az", "students");
    expect(missPrice.items.map((i) => i.id)).not.toContain(listingId);
    const missArea = await searchListings(parseListingFilters({ district: "nesimi" }, "students"), "az", "students");
    expect(missArea.items.map((i) => i.id)).not.toContain(listingId);
    const family = await searchListings(parseListingFilters({}, "family"), "az", "family");
    expect(family.items.map((i) => i.id)).not.toContain(listingId);
  });

  it("an owner edit of a live listing sends it back to review", async () => {
    const { requeued } = await updateListing(owner, listingId, parseListingInput(listingRaw({ monthlyRent: "230" })));
    expect(requeued).toBe(true);
    await moderateListing(admin, listingId, "approve");
  });

  it("saves are unique per user and listing", async () => {
    await setSaved(stranger.id, listingId, true);
    await setSaved(stranger.id, listingId, true);
    expect(await db.savedListing.count({ where: { userId: stranger.id, listingId } })).toBe(1);
    await setSaved(stranger.id, listingId, false);
    expect(await db.savedListing.count({ where: { userId: stranger.id, listingId } })).toBe(0);
  });

  it("contact requests hide details until accepted and block duplicates and self-contact", async () => {
    await db.user.update({ where: { id: owner.id }, data: { phone: "+994501112233" } });
    const sender = { ...stranger, name: "Stranger Test" };
    await createContactRequest(sender, { listingId, message: "Salam, otaqla maraqlanıram." }, { locale: "az", copy: contactCopy });
    await expectCode(createContactRequest(sender, { listingId, message: "Yenə yazıram, cavab verin." }, { locale: "az", copy: contactCopy }), "already_requested");
    await expectCode(createContactRequest({ ...owner, name: "o" }, { listingId, message: "Öz elanıma yazıram." }, { locale: "az", copy: contactCopy }), "own_item");

    let outgoing = (await contactRequestsFor(stranger.id)).outgoing;
    expect(outgoing[0]!.contact).toBeNull();
    const incoming = (await contactRequestsFor(owner.id)).incoming;
    await expectCode(respondToContact(stranger.id, incoming[0]!.id, true), "not_found");
    await respondToContact(owner.id, incoming[0]!.id, true);
    outgoing = (await contactRequestsFor(stranger.id)).outgoing;
    expect(outgoing[0]!.contact).toEqual({ email: `owner${DOMAIN}`, phone: "+994501112233" });

    await db.userProfile.update({ where: { userId: owner.id }, data: { sharePhoneOnAccept: false } });
    outgoing = (await contactRequestsFor(stranger.id)).outgoing;
    expect(outgoing[0]!.contact?.phone).toBeNull();
  });

  it("reports are recorded once per open case", async () => {
    await createReport(stranger.id, { listingId, reason: "WRONG_PRICE", details: "Qiymət fərqlidir" });
    await expectCode(createReport(stranger.id, { listingId, reason: "SPAM" }), "already_reported");
    await expectCode(createReport(owner.id, { listingId, reason: "SPAM" }), "own_item");
  });

  it("a rented listing leaves search", async () => {
    await markRented(owner, listingId);
    const res = await searchListings(parseListingFilters({ district: "yasamal" }, "students"), "az", "students");
    expect(res.items.map((i) => i.id)).not.toContain(listingId);
  });
});

describe("image upload validation", () => {
  it("rejects non-images, wrong declared types and tiny images", async () => {
    await expectCode(processImage(Buffer.from("<svg onload=alert(1)>"), "image/jpeg"), "upload_type");
    await expectCode(processImage(await jpeg(), "image/svg+xml"), "upload_type");
    await expectCode(processImage(await jpeg(200, 150), "image/jpeg"), "upload_small");
    const out = await processImage(await jpeg(3000, 2000), "image/jpeg");
    expect(out.mimeType).toBe("image/webp");
    expect(Math.max(out.width, out.height)).toBeLessThanOrEqual(1920);
  });
});

describe("roommates", () => {
  it("creates both scenarios, keeps them private until approved, then searches and matches", async () => {
    const a = await makeUser("mateA");
    const b = await makeUser("mateB");
    const admin = await makeUser("admin2", "ADMIN");
    const common = { cityId: baku, description: "Sakit, səliqəli tələbəyəm, dərsə çox vaxt ayırıram.", moveInDate: "2026-11-05", durationMonths: "9", smoking: "NO_SMOKING", cleaning: "ROTA", sleepSchedule: "EARLY", guests: "RARELY" };
    const place = await createRoommateAd(a, parseRoommateInput({ ...common, type: "HAS_PLACE", title: "Yasamalda otağım var, yoldaş axtarıram", monthlyContribution: "250", accommodationType: "SHARED_APARTMENT", currentResidents: "1", availableSpaces: "1", districtId: yasamal }));
    const seek = await createRoommateAd(b, parseRoommateInput({ ...common, type: "SEEKING_PARTNER", title: "Yasamalda birlikdə ev tutmaq istəyirəm", budgetMin: "200", budgetMax: "280", groupSize: "1", desiredPropertyType: "SHARED_APARTMENT", preferredDistrictIds: [yasamal, nesimi] }));

    const before = await searchRoommates(parseRoommateFilters({ district: "yasamal" }), "az");
    expect(before.items.map((i) => i.id)).not.toContain(place.id);

    await moderateRoommateAd(admin, place.id, "approve");
    await moderateRoommateAd(admin, seek.id, "approve");
    const after = await searchRoommates(parseRoommateFilters({ district: "yasamal", budget: "260" }), "az");
    expect(after.items.map((i) => i.id)).toEqual(expect.arrayContaining([place.id, seek.id]));

    const matches = await matchesForAd(seek.id, b.id, "az");
    const m = matches.find((x) => x.id === place.id);
    expect(m?.match?.score).toBeGreaterThanOrEqual(90);

    await expectCode(createRoommateAd(a, parseRoommateInput({ ...common, type: "HAS_PLACE", title: "Yasamalda otağım var, yoldaş axtarıram", monthlyContribution: "250", accommodationType: "SHARED_APARTMENT", currentResidents: "1", availableSpaces: "1", districtId: yasamal })), "duplicate");
  });
});

describe("admin-only operations and account status", () => {
  it("only admins suspend; suspension ends sessions and blocks login", async () => {
    const user = await makeUser("suspendee");
    const other = await makeUser("notadmin");
    const admin = await makeUser("admin3", "ADMIN");
    const { token } = await createSessionRecord(user.id, null);
    await expectCode(setUserSuspended(other, user.id, true, "spam"), "forbidden");
    await expectCode(setUserSuspended(admin, admin.id, true, "self"), "forbidden");
    await setUserSuspended(admin, user.id, true, "Spam elanlar");
    expect(await findSessionUser(token)).toBeNull();
  });

  it("agent verification requires a profile and an admin decision", async () => {
    const agent = await makeUser("agent", "AGENT");
    const admin = await makeUser("admin4", "ADMIN");
    await expectCode(requestVerification(agent, { message: "Zəhmət olmasa hesabımı yoxlayın, VÖEN əlavə edirəm." }), "profile_incomplete");
    await updateAgentProfile(agent, { companyName: "Test Əmlak MMC", licenseNumber: "1234567890" });
    await requestVerification(agent, { message: "Zəhmət olmasa hesabımı yoxlayın, VÖEN əlavə edirəm." });
    const req = await db.verificationRequest.findFirstOrThrow({ where: { applicantId: agent.id } });
    await expectCode(reviewVerification(agent, req.id, true, ""), "forbidden");
    await reviewVerification(admin, req.id, true, "Sənədlər yoxlanıldı");
    expect((await db.agentProfile.findUniqueOrThrow({ where: { userId: agent.id } })).verificationStatus).toBe("VERIFIED");
  });

  it("a student cannot use agent-only operations", async () => {
    const student = await makeUser("student2");
    await expectCode(updateAgentProfile(student, { companyName: "X" }), "forbidden");
  });
});
