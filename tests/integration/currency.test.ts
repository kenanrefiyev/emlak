import { afterAll, beforeAll, describe, expect, it } from "vitest";
import sharp from "sharp";
import { db } from "@/server/db";
import { ServiceError } from "@/server/errors";
import { addListingImage, createListing, moderateListing, parseListingInput, submitListing, type Actor } from "@/server/listings/service";
import { searchListings } from "@/server/listings/queries";
import { createRoommateAd, parseRoommateInput } from "@/server/roommates/service";
import { getRates, refreshRates, resetRateMemory } from "@/server/exchange-rates";
import { parseListingFilters } from "@/lib/search/listing-filters";

const DOMAIN = "@cur.yuva.test";
const RATES = { USD: 1, AZN: 1.7, TRY: 50, EUR: 0.9 };

const fakeFetch = (body: unknown, status = 200) => (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;
const goodBody = { result: "success", base_code: "USD", time_last_update_unix: 1_793_577_751, rates: RATES };

async function expectCode(p: Promise<unknown>, code: string, field?: string) {
  await expect(p).rejects.toSatisfy((e: unknown) => e instanceof ServiceError && e.code === code && (!field || field in (e.fieldErrors ?? {})));
}

const listingRaw = (districtId: string, overrides: Record<string, unknown> = {}) => ({
  category: "PRIVATE_ROOM",
  title: "Öğrenci odası merkezde, metroya yakın",
  description: "Aydınlık oda, çalışma masası ve dolap var. Evde iki öğrenci yaşıyor, ulaşım çok kolay.",
  monthlyRent: "300",
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

let owner: Actor;
let admin: Actor;
let kadikoy: string;
let yasamal: string;
let istanbul: string;

async function publish(raw: Record<string, unknown>) {
  const { id } = await createListing(owner, parseListingInput(raw));
  const img = await sharp({ create: { width: 800, height: 600, channels: 3, background: "#88aacc" } }).jpeg().toBuffer();
  await addListingImage(owner, id, { buffer: img, type: "image/jpeg" });
  await submitListing(owner, id);
  await moderateListing(admin, id, "approve");
  return id;
}

beforeAll(async () => {
  await db.user.deleteMany({ where: { email: { endsWith: DOMAIN } } });
  await db.exchangeRate.deleteMany();
  resetRateMemory();
  const mk = async (name: string, role: "USER" | "ADMIN") =>
    ({ id: (await db.user.create({ data: { email: `${name}${DOMAIN}`, name, role, passwordHash: "disabled", profile: { create: {} } } })).id, role }) as Actor;
  owner = await mk("owner", "USER");
  admin = await mk("admin", "ADMIN");
  kadikoy = (await db.district.findUniqueOrThrow({ where: { slug: "kadikoy" } })).id;
  yasamal = (await db.district.findUniqueOrThrow({ where: { slug: "yasamal" } })).id;
  istanbul = (await db.city.findUniqueOrThrow({ where: { slug: "istanbul" } })).id;
});
afterAll(async () => {
  await db.user.deleteMany({ where: { email: { endsWith: DOMAIN } } });
  await db.exchangeRate.deleteMany();
  await db.$disconnect();
});

describe("exchange rates", () => {
  it("stores the rates the site needs, with the provider's update time", async () => {
    const snap = await refreshRates(fakeFetch(goodBody));
    expect(snap.rates).toEqual({ USD: 1, AZN: 1.7, TRY: 50 });
    expect(snap.updatedAt.toISOString()).toBe("2026-11-02T00:02:31.000Z");
    expect(await db.exchangeRate.count()).toBe(3);
  });

  it("rejects bad responses and keeps the last good rates", async () => {
    await expect(refreshRates(fakeFetch({ result: "error", "error-type": "unknown" }))).rejects.toThrow();
    await expect(refreshRates(fakeFetch(goodBody, 503))).rejects.toThrow();
    await expect(refreshRates(fakeFetch({ ...goodBody, rates: { USD: 1, AZN: 1.7 } }))).rejects.toThrow(/TRY/);
    await expect(refreshRates(fakeFetch({ ...goodBody, rates: { ...RATES, TRY: -1 } }))).rejects.toThrow(/TRY/);
    resetRateMemory();
    expect((await getRates())?.rates.TRY).toBe(50);
  });
});

describe("listings priced in their own currency", () => {
  let lira: string;
  let manat: string;

  beforeAll(async () => {
    lira = await publish(listingRaw(kadikoy, { currency: "TRY", monthlyRent: "15000" }));
    manat = await publish(listingRaw(yasamal, { currency: "AZN", monthlyRent: "300", title: "Yasamalda tələbə otağı, metroya yaxın" }));
  });

  it("stores the original amount and currency untouched", async () => {
    const row = await db.listing.findUniqueOrThrow({ where: { id: lira }, select: { currency: true, monthlyRent: true } });
    expect(row).toEqual({ currency: "TRY", monthlyRent: 15000 });
  });

  it("matches a budget typed in one currency against listings in another", async () => {
    const ids = async (q: Record<string, string>) => (await searchListings(parseListingFilters(q, "students"), "en", "students")).items.map((i) => i.id);
    // 600 AZN ≈ 17 647 TRY, so the 15 000 TRY room fits; 400 AZN ≈ 11 765 TRY does not.
    expect(await ids({ country: "tr", max: "600", cur: "AZN" })).toContain(lira);
    expect(await ids({ country: "tr", max: "400", cur: "AZN" })).not.toContain(lira);
    // 12 000 TRY ≈ 408 AZN covers the 300 AZN room.
    expect(await ids({ country: "az", max: "12000", cur: "TRY" })).toContain(manat);
    expect(await ids({ country: "az", max: "8000", cur: "TRY" })).not.toContain(manat);
  });

  it("without rates compares only listings in the typed currency", async () => {
    await db.exchangeRate.deleteMany();
    resetRateMemory();
    const f = parseListingFilters({ country: "tr", max: "600", cur: "AZN" }, "students");
    expect((await searchListings(f, "en", "students")).items.map((i) => i.id)).not.toContain(lira);
    await refreshRates(fakeFetch(goodBody));
  });

  it("checks amounts against the listing's currency and accepts only market currencies", async () => {
    // 25 000 is an ordinary lira rent but too much in manat.
    await expect(createListing(owner, parseListingInput(listingRaw(kadikoy, { currency: "TRY", monthlyRent: "25000", title: "İkinci oda Kadıköy merkezde" })))).resolves.toBeTruthy();
    expect(() => parseListingInput(listingRaw(yasamal, { currency: "AZN", monthlyRent: "25000" }))).toThrow();
    expect(() => parseListingInput(listingRaw(kadikoy, { currency: "TRY", monthlyRent: "300" }))).toThrow();
    await expectCode(createListing(owner, parseListingInput(listingRaw(kadikoy, { currency: "USD", monthlyRent: "300", title: "Dolar ile oda ilanı" }))), "validation", "currency");
  });
});

describe("roommate ads", () => {
  const common = { description: "Sakin, düzenli bir öğrenciyim, derslerime çok zaman ayırıyorum.", moveInDate: "2026-11-05", durationMonths: "9" };
  const place = (contribution: string, title: string) =>
    parseRoommateInput({ ...common, cityId: istanbul, type: "HAS_PLACE", title, monthlyContribution: contribution, accommodationType: "SHARED_APARTMENT", currentResidents: "1", availableSpaces: "1", districtId: kadikoy });

  it("take their country's currency and its limits", async () => {
    const ad = await createRoommateAd(owner, place("9000", "Kadıköy'de odam var, ev arkadaşı arıyorum"));
    expect((await db.roommateAd.findUniqueOrThrow({ where: { id: ad.id } })).currency).toBe("TRY");
    // 250 is a manat-sized share; in lira it is below the minimum.
    await expectCode(createRoommateAd(owner, place("250", "Kadıköy'de ucuz oda, ev arkadaşı")), "validation", "monthlyContribution");
  });
});
