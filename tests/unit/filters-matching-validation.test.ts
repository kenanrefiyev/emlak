import { describe, expect, it } from "vitest";
import { activeListingFilters, listingFiltersToQuery, parseListingFilters, withoutFilter } from "@/lib/search/listing-filters";
import { parseRoommateFilters, roommateFiltersToQuery } from "@/lib/search/roommate-filters";
import { matchAds, type MatchableAd } from "@/lib/matching";
import { normalizeAzPhone } from "@/lib/validation/helpers";
import { listingInputSchema, normalizeListingInput } from "@/lib/validation/listing";
import { roommateInputSchema } from "@/lib/validation/roommate";
import { registerSchema } from "@/lib/validation/auth";

describe("listing filters (URL state)", () => {
  it("parses, clamps and round-trips combined filters", () => {
    const f = parseListingFilters(new URLSearchParams("type=private_room,dormitory&district=yasamal&min=500&max=200&rooms=9&sort=price_asc&page=3&verified=1"), "students");
    expect(f.categories).toEqual(["PRIVATE_ROOM", "DORMITORY"]);
    expect([f.priceMin, f.priceMax]).toEqual([200, 500]); // swapped
    expect(f.rooms).toBeUndefined(); // out of range dropped
    expect(f.sort).toBe("price_asc");
    expect(f.page).toBe(3);
    const again = parseListingFilters(new URLSearchParams(listingFiltersToQuery(f)), "students");
    expect(again).toEqual(f);
  });

  it("rejects categories outside the segment and malformed values", () => {
    const f = parseListingFilters({ type: "family_apartment,private_room", district: "../etc", movein: "2026-13-45", sort: "drop" }, "students");
    expect(f.categories).toEqual(["PRIVATE_ROOM"]);
    expect(f.district).toBeUndefined();
    expect(f.moveIn).toBeUndefined();
    expect(f.sort).toBe("newest");
  });

  it("lists active filters and removing a district also clears the neighbourhood", () => {
    const f = parseListingFilters({ district: "yasamal", area: "insaatcilar", max: "300" });
    expect(activeListingFilters(f)).toEqual(["district", "neighborhood", "priceMax"]);
    const next = withoutFilter(f, "district");
    expect(next.district).toBeUndefined();
    expect(next.neighborhood).toBeUndefined();
    expect(next.priceMax).toBe(300);
  });

  it("parses roommate filters", () => {
    const f = parseRoommateFilters({ type: "has_place", budget: "250", gender: "FEMALE", sort: "match" });
    expect(f).toMatchObject({ type: "HAS_PLACE", budget: 250, gender: "FEMALE", sort: "match" });
    expect(roommateFiltersToQuery(f)).toBe("type=has_place&budget=250&gender=FEMALE&sort=match");
  });
});

const base: MatchableAd = {
  id: "a",
  type: "SEEKING_PARTNER",
  monthlyContribution: null,
  budgetMin: 200,
  budgetMax: 280,
  districtId: null,
  preferredDistrictIds: ["d1"],
  moveInDate: new Date("2026-11-01"),
  durationMonths: 9,
  accommodationType: null,
  desiredPropertyType: "SHARED_APARTMENT",
  availableSpaces: null,
  groupSize: 1,
  smoking: "NO_SMOKING",
  sleepSchedule: "EARLY",
  cleaning: "ROTA",
  noise: "QUIET",
};

describe("roommate matching rules", () => {
  it("scores a perfect seeker ↔ place pair at 100 with reasons", () => {
    const place: MatchableAd = { ...base, id: "b", type: "HAS_PLACE", monthlyContribution: 250, budgetMin: null, budgetMax: null, districtId: "d1", preferredDistrictIds: [], accommodationType: "SHARED_APARTMENT", desiredPropertyType: null, availableSpaces: 1 };
    const r = matchAds(base, place)!;
    expect(r.score).toBe(100);
    expect(r.reasons).toEqual(expect.arrayContaining(["budget", "area", "moveIn", "duration", "homeType", "spaces", "smoking", "sleep", "cleaning", "noise"]));
  });

  it("never matches two place-havers or an ad with itself", () => {
    const place: MatchableAd = { ...base, id: "p", type: "HAS_PLACE" };
    expect(matchAds(place, { ...place, id: "q" })).toBeNull();
    expect(matchAds(base, base)).toBeNull();
  });

  it("gives no budget or area points when nothing overlaps", () => {
    const other: MatchableAd = { ...base, id: "c", budgetMin: 600, budgetMax: 800, preferredDistrictIds: ["d9"], moveInDate: new Date("2027-03-01"), durationMonths: 3, smoking: "ALLOWED", sleepSchedule: "LATE", cleaning: "EACH_OWN", noise: "LIVELY" };
    const r = matchAds(base, other)!;
    expect(r.reasons).not.toContain("budget");
    expect(r.reasons).not.toContain("area");
    expect(r.score).toBeLessThan(20);
  });

  it("skips household facets someone left unanswered instead of guessing", () => {
    const place: MatchableAd = { ...base, id: "b", type: "HAS_PLACE", monthlyContribution: 250, budgetMin: null, budgetMax: null, districtId: "d1", preferredDistrictIds: [], accommodationType: "SHARED_APARTMENT", desiredPropertyType: null, availableSpaces: 1, smoking: null, noise: null };
    const r = matchAds(base, place)!;
    expect(r.reasons).not.toContain("smoking");
    expect(r.reasons).not.toContain("noise");
    expect(r.score).toBe(93);
  });

  it("rewards similar planned stay lengths", () => {
    const near = matchAds(base, { ...base, id: "n", durationMonths: 12 })!;
    const far = matchAds(base, { ...base, id: "f", durationMonths: 24 })!;
    expect(near.reasons).toContain("durationNear");
    expect(far.reasons).not.toContain("duration");
    expect(far.reasons).not.toContain("durationNear");
  });
});

describe("validation", () => {
  it("normalises Azerbaijani phone numbers", () => {
    expect(normalizeAzPhone("050 123 45 67")).toBe("+994501234567");
    expect(normalizeAzPhone("+994 55 111 22 33")).toBe("+994551112233");
    expect(normalizeAzPhone("12345")).toBeNull();
    expect(normalizeAzPhone("+7 900 123 45 67")).toBeNull();
  });

  const listing = {
    title: "Gənclikdə tələbə üçün otaq",
    description: "Otaq işıqlıdır, masa və şkaf var. Evdə iki tələbə yaşayır, metroya yaxındır.",
    monthlyRent: "250",
    districtId: "x",
    furnishing: "FURNISHED",
    utilities: "INCLUDED",
    heating: "CENTRAL",
    availableFrom: "2026-11-01",
    minDurationMonths: "6",
  };

  it("requires fields by category and clears irrelevant ones", () => {
    const room = listingInputSchema.safeParse({ ...listing, category: "PRIVATE_ROOM" });
    expect(room.success).toBe(false);
    expect(room.error?.issues.map((i) => i.path.join("."))).toEqual(expect.arrayContaining(["availableSpaces", "residentsCount"]));

    const flat = listingInputSchema.safeParse({ ...listing, category: "ENTIRE_APARTMENT", residentsCount: "3" });
    expect(flat.success).toBe(false);
    expect(flat.error?.issues.map((i) => i.path.join("."))).toContain("rooms");

    const ok = listingInputSchema.parse({ ...listing, category: "FAMILY_APARTMENT", rooms: "3", residentsCount: "4", availableSpaces: "1" });
    const db = normalizeListingInput(ok);
    expect(db.residentsCount).toBeNull();
    expect(db.availableSpaces).toBeNull();
    expect(db.pricePerPlace).toBe(false);
  });

  it("rejects non-https and non-video links", () => {
    const r = listingInputSchema.safeParse({ ...listing, category: "ENTIRE_APARTMENT", rooms: "1", videoUrl: "http://evil.example/x" });
    expect(r.success).toBe(false);
    expect(r.error?.issues.some((i) => i.path[0] === "videoUrl")).toBe(true);
  });

  it("validates both roommate scenarios", () => {
    const common = { title: "Ev yoldaşı axtarıram Yasamalda", description: "BDU tələbəsiyəm, sakit və səliqəli ev yoldaşı axtarıram.", moveInDate: "2026-11-01", durationMonths: "9", smoking: "NO_SMOKING", cleaning: "ROTA", sleepSchedule: "EARLY", guests: "RARELY" };
    const a = roommateInputSchema.safeParse({ ...common, type: "HAS_PLACE" });
    expect(a.error?.issues.map((i) => i.path[0])).toEqual(expect.arrayContaining(["monthlyContribution", "districtId", "accommodationType"]));
    const b = roommateInputSchema.safeParse({ ...common, type: "SEEKING_PARTNER", budgetMin: "300", budgetMax: "200", groupSize: "1", preferredDistrictIds: ["d"] });
    expect(b.error?.issues.map((i) => i.message)).toContain("budgetRange");
  });

  it("never lets registration choose the admin role", () => {
    const r = registerSchema.safeParse({ name: "Test", email: "a@b.test", password: "abcdefg1", passwordConfirm: "abcdefg1", accountType: "ADMIN", acceptTerms: "on" });
    expect(r.success).toBe(false);
  });
});
