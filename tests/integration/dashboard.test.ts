import { afterAll, beforeAll, describe, expect, it } from "vitest";
import sharp from "sharp";
import { db } from "@/server/db";
import { ServiceError } from "@/server/errors";
import { addListingImage, createListing, moderateListing, parseListingInput, recordListingEvent, submitListing, type Actor } from "@/server/listings/service";
import { bulkListingOp, ownerInquiries, ownerListings, parseLeadFilter, parseListingFilter, statistics, updateLead } from "@/server/dashboard";
import { createContactRequest, respondToContact } from "@/server/engagement";
import { requestVerification, reviewVerification } from "@/server/agents";
import { duplicateHints } from "@/server/listings/duplicates";

const DOMAIN = "@dash.yuva.test";
const contactCopy = { subject: "c", body: (n: string, l: string) => `${n} ${l}` };

async function cleanup() {
  await db.user.deleteMany({ where: { email: { endsWith: DOMAIN } } });
  await db.rateLimitHit.deleteMany({ where: { OR: [{ key: { startsWith: "bulk:" } }, { key: { startsWith: "lead:" } }, { key: { startsWith: "contact:" } }] } });
}

async function makeUser(name: string, role: "USER" | "OWNER" | "AGENT" | "ADMIN" = "USER", phone: string | null = null) {
  const u = await db.user.create({
    data: {
      email: `${name}${DOMAIN}`,
      name: `${name} Test`,
      role,
      passwordHash: "disabled",
      phone,
      profile: { create: {} },
      ...(role === "AGENT" ? { agentProfile: { create: {} } } : {}),
    },
  });
  return { id: u.id, role: u.role, name: u.name } as Actor & { name: string };
}

async function expectCode(p: Promise<unknown>, code: string) {
  await expect(p).rejects.toSatisfy((e: unknown) => e instanceof ServiceError && e.code === code);
}

const jpeg = () => sharp({ create: { width: 800, height: 600, channels: 3, background: "#7799bb" } }).jpeg().toBuffer();

let yasamal: string;

function raw(overrides: Record<string, unknown> = {}) {
  return {
    category: "ENTIRE_APARTMENT",
    propertyType: "HOUSE",
    title: "Yasamalda iki otaqlı həyət evi tələbələr üçün",
    description: "İşıqlı, təmirli ev. Metroya on dəqiqə piyada, yaxınlıqda market və aptek var. Kommunal ayrıca ödənilir.",
    monthlyRent: "600",
    districtId: yasamal,
    rooms: "2",
    furnishing: "FURNISHED",
    utilities: "NOT_INCLUDED",
    heating: "COMBI",
    availableFrom: "2026-11-01",
    minDurationMonths: "6",
    amenityIds: [],
    ...overrides,
  };
}

/** Creates, photographs, submits and approves a listing so it is public. */
async function publish(owner: Actor, admin: Actor, overrides: Record<string, unknown> = {}) {
  const { id } = await createListing(owner, parseListingInput(raw(overrides)));
  await addListingImage(owner, id, { buffer: await jpeg(), type: "image/jpeg" });
  await submitListing(owner, id);
  await moderateListing(admin, id, "approve");
  return id;
}

let landlord: Actor & { name: string };
let realtor: Actor & { name: string };
let student: Actor & { name: string };
let admin: Actor & { name: string };

beforeAll(async () => {
  await cleanup();
  yasamal = (await db.district.findUniqueOrThrow({ where: { slug: "yasamal" } })).id;
  landlord = await makeUser("landlord", "OWNER");
  realtor = await makeUser("realtor", "AGENT");
  student = await makeUser("student", "USER", "+994501234567");
  admin = await makeUser("admin", "ADMIN");
});
afterAll(async () => {
  await cleanup();
  await db.$disconnect();
});

describe("listing wizard data", () => {
  it("stores property type, rules and contact settings", async () => {
    const { id } = await createListing(
      landlord,
      parseListingInput(raw({ rules: "Siqaret çəkmək olmaz.", contactName: "Rəna", contactPhone: "050 111 22 33", contactPreference: "WHATSAPP", contactWhatsapp: "on" })),
    );
    const row = await db.listing.findUniqueOrThrow({ where: { id }, include: { translations: true } });
    expect(row.propertyType).toBe("HOUSE");
    expect(row.contactPhone).toBe("+994501112233");
    expect(row.contactPreference).toBe("WHATSAPP");
    expect(row.contactWhatsapp).toBe(true);
    expect(row.translations[0]!.rules).toBe("Siqaret çəkmək olmaz.");
  });

  it("requires a phone when phone or WhatsApp contact is chosen", () => {
    expect(() => parseListingInput(raw({ contactPreference: "PHONE" }))).toThrow(ServiceError);
    try {
      parseListingInput(raw({ contactPreference: "PHONE" }));
    } catch (e) {
      expect((e as ServiceError).fieldErrors?.contactPhone).toBe("required");
    }
  });
});

describe("owner listings and bulk actions", () => {
  let mine: string[];
  let theirs: string;

  beforeAll(async () => {
    mine = [await publish(realtor, admin, { title: "Portfel elanı bir — Yasamalda mənzil" }), await publish(realtor, admin, { title: "Portfel elanı iki — Yasamalda mənzil" })];
    theirs = await publish(landlord, admin, { title: "Başqasının elanı — toxunulmamalıdır" });
  });

  it("lists only the owner's own listings, filtered by status", async () => {
    const all = await ownerListings(realtor.id, "az", parseListingFilter({}));
    expect(all.items.map((i) => i.id).sort()).toEqual([...mine].sort());
    const active = await ownerListings(realtor.id, "az", parseListingFilter({ status: "ACTIVE" }));
    expect(active.items).toHaveLength(2);
    expect(active.statusCounts.ACTIVE).toBe(2);
  });

  it("applies a bulk change to own listings and refuses someone else's", async () => {
    const result = await bulkListingOp(realtor, "archive", [...mine, theirs]);
    expect(result.ok).toBe(2);
    expect(result.failed).toEqual([{ id: theirs, code: "forbidden" }]);
    expect((await db.listing.findUniqueOrThrow({ where: { id: theirs } })).status).toBe("PUBLISHED");
    expect((await db.listing.findMany({ where: { id: { in: mine } } })).every((l) => l.status === "ARCHIVED")).toBe(true);
  });

  it("cannot delete another user's listing in bulk", async () => {
    const result = await bulkListingOp(student, "delete", [theirs]);
    expect(result.ok).toBe(0);
    expect(await db.listing.count({ where: { id: theirs } })).toBe(1);
  });
});

describe("inquiries and lead tracking", () => {
  let listingId: string;
  let requestId: string;

  beforeAll(async () => {
    listingId = await publish(landlord, admin, { title: "Sorğu testi üçün mənzil Yasamalda" });
    ({ id: requestId } = await createContactRequest(student, { listingId, message: "Salam, mənzil hələ boşdur? Baxmaq istərdim." }, { locale: "az", copy: contactCopy }));
  });

  it("hides the sender's contact details until the owner accepts", async () => {
    let data = await ownerInquiries(landlord.id, "az", parseLeadFilter({}));
    const item = data.items.find((i) => i.id === requestId)!;
    expect(item.leadStatus).toBe("NEW");
    expect(item.contact).toBeNull();
    await respondToContact(landlord.id, requestId, true);
    data = await ownerInquiries(landlord.id, "az", parseLeadFilter({}));
    expect(data.items.find((i) => i.id === requestId)!.contact?.phone).toBe("+994501234567");
  });

  it("persists stage, viewing time and private note for the recipient only", async () => {
    await expectCode(updateLead(landlord.id, { id: requestId, leadStatus: "VIEWING_SCHEDULED" }), "validation");
    await updateLead(landlord.id, { id: requestId, leadStatus: "VIEWING_SCHEDULED", viewingAt: "2026-11-03T15:30", ownerNote: "Cümə günü zəng et" });
    const row = await db.contactRequest.findUniqueOrThrow({ where: { id: requestId } });
    expect(row.leadStatus).toBe("VIEWING_SCHEDULED");
    expect(row.ownerNote).toBe("Cümə günü zəng et");
    expect(row.viewingAt?.toISOString()).toBe("2026-11-03T11:30:00.000Z");
    // The sender and strangers cannot touch it.
    await expectCode(updateLead(student.id, { id: requestId, leadStatus: "CLOSED" }), "not_found");
    await expectCode(updateLead(realtor.id, { id: requestId, leadStatus: "CLOSED" }), "not_found");
    expect((await ownerInquiries(realtor.id, "az", parseLeadFilter({}))).items.some((i) => i.id === requestId)).toBe(false);
  });
});

describe("statistics", () => {
  it("counts only real events and withholds rates without enough data", async () => {
    const id = await publish(landlord, admin, { title: "Statistika testi üçün ev Yasamalda" });
    for (let i = 0; i < 3; i++) await recordListingEvent(id, "VIEW", null);
    await recordListingEvent(id, "IMPRESSION", null);
    await recordListingEvent(id, "WHATSAPP_CLICK", student.id);
    const stats = await statistics(landlord.id, "az", 7);
    const row = stats.rows.find((r) => r.id === id)!;
    expect(row.VIEW).toBe(3);
    expect(row.IMPRESSION).toBe(1);
    expect(row.WHATSAPP_CLICK).toBe(1);
    expect(row.conversion).toBeNull();
    expect(stats.series).toHaveLength(7);
    expect(stats.series.at(-1)!.VIEW).toBeGreaterThanOrEqual(3);
  });
});

describe("landlord verification", () => {
  it("needs a phone, then a document review by an admin", async () => {
    const noPhone = await makeUser("nophone", "OWNER");
    await expectCode(requestVerification(noPhone, { message: "Çıxarışı göstərə bilərəm, ünvanda görüşə bilərik." }), "phone_required");
    const owner = await makeUser("verifyowner", "OWNER", "+994551112233");
    await requestVerification(owner, { message: "Çıxarışı göstərə bilərəm, ünvanda görüşə bilərik." });
    expect((await db.userProfile.findUniqueOrThrow({ where: { userId: owner.id } })).verificationStatus).toBe("PENDING");
    await expectCode(requestVerification(owner, { message: "İkinci sorğu, eyni vaxtda olmamalıdır." }), "already_requested");
    const req = await db.verificationRequest.findFirstOrThrow({ where: { applicantId: owner.id } });
    await reviewVerification(admin, req.id, true, "");
    expect((await db.userProfile.findUniqueOrThrow({ where: { userId: owner.id } })).verificationStatus).toBe("VERIFIED");
  });
});

describe("duplicate hints", () => {
  it("flags another live listing with the same title", async () => {
    const a = await publish(landlord, admin, { title: "Eyni başlıqlı dublikat elan Yasamalda" });
    const b = await publish(realtor, admin, { title: "Eyni başlıqlı dublikat elan Yasamalda" });
    const hints = await duplicateHints([b]);
    expect(hints.get(b)?.some((h) => h.id === a && h.reason === "title" && !h.sameOwner)).toBe(true);
  });
});
