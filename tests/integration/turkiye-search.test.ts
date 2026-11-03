import { afterAll, beforeAll, describe, expect, it } from "vitest";
import sharp from "sharp";
import { db } from "@/server/db";
import { addListingImage, createListing, moderateListing, parseListingInput, submitListing, type Actor } from "@/server/listings/service";
import { searchListings } from "@/server/listings/queries";
import { getLocationOptions } from "@/server/locations";
import { parseListingFilters } from "@/lib/search/listing-filters";

const DOMAIN = "@trs.yuva.test";
let listingId: string;

beforeAll(async () => {
  await db.user.deleteMany({ where: { email: { endsWith: DOMAIN } } });
  const mk = async (name: string, role: "USER" | "ADMIN") =>
    ({ id: (await db.user.create({ data: { email: `${name}${DOMAIN}`, name, role, passwordHash: "disabled", profile: { create: {} } } })).id, role }) as Actor;
  const owner = await mk("owner", "USER");
  const admin = await mk("admin", "ADMIN");
  const [kadikoy, goztepe] = await Promise.all([
    db.district.findUniqueOrThrow({ where: { slug: "kadikoy" } }),
    db.neighborhood.findUniqueOrThrow({ where: { slug: "goztepe" } }),
  ]);
  ({ id: listingId } = await createListing(
    owner,
    parseListingInput({
      category: "PRIVATE_ROOM",
      title: "Göztepe'de öğrenciye oda, Marmara'ya yürüme mesafesi",
      description: "Aydınlık oda, çalışma masası ve dolap var. Evde iki öğrenci yaşıyor, kampüse yürüyerek on dakika.",
      currency: "TRY",
      monthlyRent: "14000",
      districtId: kadikoy.id,
      neighborhoodId: goztepe.id,
      residentsCount: "2",
      availableSpaces: "1",
      furnishing: "FURNISHED",
      utilities: "INCLUDED",
      heating: "COMBI",
      availableFrom: "2026-11-01",
      minDurationMonths: "3",
      amenityIds: [],
    }),
  ));
  const img = await sharp({ create: { width: 800, height: 600, channels: 3, background: "#88aacc" } }).jpeg().toBuffer();
  await addListingImage(owner, listingId, { buffer: img, type: "image/jpeg" });
  await submitListing(owner, listingId);
  await moderateListing(admin, listingId, "approve");
});
afterAll(async () => {
  await db.user.deleteMany({ where: { email: { endsWith: DOMAIN } } });
  await db.$disconnect();
});

describe("Türkiye places", () => {
  it("offers Turkish neighbourhoods and universities only in Türkiye", async () => {
    const tr = await getLocationOptions("en", "slug", "tr");
    expect(tr.neighborhoods.map((n) => n.slug)).toEqual(expect.arrayContaining(["moda", "kizilay", "alsancak"]));
    expect(tr.universities.map((u) => u.slug)).toEqual(expect.arrayContaining(["itu", "odtu", "ege"]));
    expect(tr.universities.find((u) => u.slug === "odtu")).toMatchObject({ short: "ODTÜ", latitude: expect.any(Number) });
    const az = await getLocationOptions("en", "slug", "az");
    expect(az.universities.map((u) => u.slug)).not.toContain("itu");
    expect(az.neighborhoods.map((n) => n.slug)).not.toContain("moda");
  });

  it("finds a listing near a Turkish university by distance", async () => {
    const near = async (uni: string) => (await searchListings(parseListingFilters({ country: "tr", uni }, "students"), "en", "students")).items.map((i) => i.id);
    expect(await near("marmara")).toContain(listingId); // Göztepe ↔ Marmara (Göztepe campus) ≈ 1 km
    expect(await near("bogazici")).not.toContain(listingId); // across the Bosphorus
  });

  it("filters by Turkish city and neighbourhood", async () => {
    const ids = async (q: Record<string, string>) => (await searchListings(parseListingFilters(q, "students"), "en", "students")).items.map((i) => i.id);
    expect(await ids({ country: "tr", city: "istanbul", area: "goztepe" })).toContain(listingId);
    expect(await ids({ country: "tr", city: "istanbul", area: "moda" })).not.toContain(listingId);
  });
});
