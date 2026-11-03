import { afterAll, beforeAll, describe, expect, it } from "vitest";
import sharp from "sharp";
import { db } from "@/server/db";
import { ServiceError } from "@/server/errors";
import { addListingImage, createListing, moderateListing, parseListingInput, submitListing, type Actor } from "@/server/listings/service";
import { searchListings } from "@/server/listings/queries";
import { createRoommateAd, parseRoommateInput } from "@/server/roommates/service";
import { deleteReference } from "@/server/admin";
import { getLocationOptions } from "@/server/locations";
import { parseListingFilters } from "@/lib/search/listing-filters";

const DOMAIN = "@mk.yuva.test";

async function cleanup() {
  await db.user.deleteMany({ where: { email: { endsWith: DOMAIN } } });
}

async function makeUser(name: string, role: "USER" | "ADMIN" = "USER") {
  const u = await db.user.create({ data: { email: `${name}${DOMAIN}`, name: `${name} Test`, role, passwordHash: "disabled", profile: { create: {} } } });
  return { id: u.id, role: u.role } as Actor;
}

async function expectCode(p: Promise<unknown>, code: string, field?: string) {
  await expect(p).rejects.toSatisfy((e: unknown) => e instanceof ServiceError && e.code === code && (!field || field in (e.fieldErrors ?? {})));
}

const listingRaw = (districtId: string, overrides: Record<string, unknown> = {}) => ({
  category: "PRIVATE_ROOM",
  title: "Öğrenci odası Kadıköy merkezde",
  description: "Aydınlık oda, çalışma masası ve dolap var. Evde iki öğrenci yaşıyor, metroya yakın.",
  monthlyRent: "240",
  districtId,
  residentsCount: "2",
  availableSpaces: "1",
  furnishing: "FURNISHED",
  utilities: "INCLUDED",
  heating: "CENTRAL",
  availableFrom: "2026-11-01",
  minDurationMonths: "3",
  amenityIds: [],
  ...overrides,
});

let kadikoy: string;
let yasamal: string;
let bakuMetro: string;

beforeAll(async () => {
  await cleanup();
  kadikoy = (await db.district.findUniqueOrThrow({ where: { slug: "kadikoy" } })).id;
  yasamal = (await db.district.findUniqueOrThrow({ where: { slug: "yasamal" } })).id;
  bakuMetro = (await db.metroStation.findUniqueOrThrow({ where: { slug: "elmler-akademiyasi" } })).id;
});
afterAll(async () => {
  await cleanup();
  await db.$disconnect();
});

describe("countries and cities", () => {
  it("has both markets with their currencies, and Baku's places stay in Azerbaijan", async () => {
    const countries = await db.country.findMany({ orderBy: { sortOrder: "asc" }, select: { code: true, currency: true } });
    expect(countries).toEqual([
      { code: "az", currency: "AZN" },
      { code: "tr", currency: "TRY" },
    ]);
    const yas = await db.district.findUniqueOrThrow({
      where: { slug: "yasamal" },
      select: { city: { select: { slug: true, country: { select: { code: true } } } } },
    });
    expect(yas.city).toEqual({ slug: "baku", country: { code: "az" } });
    expect(await db.metroStation.count({ where: { city: { slug: { not: "baku" } } } })).toBe(0);
  });

  it("never mixes places from different countries in one option list", async () => {
    const tr = await getLocationOptions("en", "slug", "tr");
    expect(tr.cities.map((c) => c.slug)).toEqual(["istanbul", "ankara", "izmir", "antalya", "bursa", "eskisehir"]);
    expect(tr.districts.map((d) => d.slug)).toContain("kadikoy");
    expect(tr.districts.map((d) => d.slug)).not.toContain("yasamal");
    expect(tr.metros).toHaveLength(0);
    const az = await getLocationOptions("en", "slug", "az");
    expect(az.districts.map((d) => d.slug)).not.toContain("kadikoy");
    expect(az.metros.length).toBeGreaterThan(0);
  });

  it("refuses to delete a city or country that still has places", async () => {
    const admin = await makeUser("admin", "ADMIN");
    const istanbul = await db.city.findUniqueOrThrow({ where: { slug: "istanbul" } });
    await expectCode(deleteReference(admin, "city", istanbul.id), "in_use");
    await expectCode(deleteReference(admin, "country", istanbul.countryId), "in_use");
  });
});

describe("market-scoped listings and roommates", () => {
  let owner: Actor;
  let listingId: string;

  beforeAll(async () => {
    owner = await makeUser("owner");
    const admin = await makeUser("admin2", "ADMIN");
    ({ id: listingId } = await createListing(owner, parseListingInput(listingRaw(kadikoy))));
    const img = await sharp({ create: { width: 800, height: 600, channels: 3, background: "#88aacc" } })
      .jpeg()
      .toBuffer();
    await addListingImage(owner, listingId, { buffer: img, type: "image/jpeg" });
    await submitListing(owner, listingId);
    await moderateListing(admin, listingId, "approve");
  });

  it("a listing in Istanbul is found in Türkiye and its city, never in Azerbaijan", async () => {
    const ids = async (q: Record<string, string>) => (await searchListings(parseListingFilters(q, "students"), "az", "students")).items.map((i) => i.id);
    expect(await ids({ country: "tr" })).toContain(listingId);
    expect(await ids({ country: "tr", city: "istanbul" })).toContain(listingId);
    expect(await ids({ country: "tr", city: "ankara" })).not.toContain(listingId);
    expect(await ids({ country: "az" })).not.toContain(listingId);
  });

  it("rejects a metro station from another city", async () => {
    await expectCode(
      createListing(owner, parseListingInput(listingRaw(kadikoy, { metroStationId: bakuMetro, title: "Kadıköy odası Bakü metrosu ile" }))),
      "validation",
      "metroStationId",
    );
  });

  it("a roommate ad names its city, and every place on it must be in that city", async () => {
    const [istanbul, baku] = await Promise.all(["istanbul", "baku"].map(async (slug) => (await db.city.findUniqueOrThrow({ where: { slug } })).id));
    const common = { description: "Sakin, düzenli bir öğrenciyim, derslerime çok zaman ayırıyorum.", moveInDate: "2026-11-05", durationMonths: "9" };
    const place = { ...common, type: "HAS_PLACE", monthlyContribution: "9000", accommodationType: "SHARED_APARTMENT", currentResidents: "1", availableSpaces: "1" };
    const ad = await createRoommateAd(owner, parseRoommateInput({ ...place, cityId: istanbul, title: "Kadıköy'de odam var, ev arkadaşı arıyorum", districtId: kadikoy }));
    const row = await db.roommateAd.findUniqueOrThrow({ where: { id: ad.id }, select: { currency: true, city: { select: { slug: true } } } });
    expect(row).toEqual({ currency: "TRY", city: { slug: "istanbul" } });

    // A city is required, and a district from another city is refused.
    expect(() => parseRoommateInput({ ...place, title: "Şehri olmayan bir ilan başlığı", districtId: kadikoy })).toThrow();
    await expectCode(createRoommateAd(owner, parseRoommateInput({ ...place, cityId: baku, title: "Bakıda otaq, amma rayon İstanbulda", districtId: kadikoy })), "validation", "districtId");

    // Preferred districts must all be in the ad's city.
    const seeking = { ...common, type: "SEEKING_PARTNER", budgetMin: "200", budgetMax: "280", groupSize: "1", desiredPropertyType: "SHARED_APARTMENT" };
    await expectCode(
      createRoommateAd(owner, parseRoommateInput({ ...seeking, cityId: baku, title: "Bakı və ya İstanbul, fərq etmir", preferredDistrictIds: [yasamal, kadikoy] })),
      "validation",
      "preferredDistrictIds",
    );
  });
});
