import { describe, expect, it } from "vitest";
import { METRO_COORDS, UNIVERSITY_COORDS, UNIVERSITY_RADIUS_KM, distanceKm, universityNearness } from "@/lib/baku-geo";
import { UNIVERSITIES } from "../../backend/prisma/reference-data";

const station = (slug: string) => ({ slug, latitude: null, longitude: null });
const uni = (slug: string, districtId: string | null = null) => ({ slug, latitude: null, longitude: null, districtId });

describe("university locations", () => {
  it("every university's nearest metro is the closest station to its campus", () => {
    for (const u of UNIVERSITIES) {
      const campus = UNIVERSITY_COORDS[u.slug]!;
      expect(campus, u.slug).toBeDefined();
      const closest = Object.entries(METRO_COORDS).sort((a, b) => distanceKm(campus, a[1]) - distanceKm(campus, b[1]))[0]![0];
      // 28 May and Cəfər Cabbarlı are one interchange; either is right.
      const expected = closest === "cefer-cabbarli" ? "28-may" : closest;
      expect(u.metro, u.slug).toBe(expected);
    }
  });

  it("ADA University is at Gənclik, not Ulduz", () => {
    expect(distanceKm(UNIVERSITY_COORDS.ada!, METRO_COORDS.genclik!)).toBeLessThan(1);
    expect(distanceKm(UNIVERSITY_COORDS.ada!, METRO_COORDS.ulduz!)).toBeGreaterThan(UNIVERSITY_RADIUS_KM);
  });
});

describe("universityNearness", () => {
  it("accepts a tag within walking radius and reports the distance", () => {
    const near = universityNearness({ districtId: "d1", metroStation: station("genclik") }, uni("ada"));
    expect(near?.km).toBeLessThan(1);
  });

  it("rejects a tag far from the listing's own area, whatever the district", () => {
    expect(universityNearness({ districtId: "d1", metroStation: station("ulduz") }, uni("ada", "d1"))).toBeNull();
  });

  it("falls back to the district when the listing has no metro or area", () => {
    expect(universityNearness({ districtId: "d1" }, uni("ada", "d1"))).toEqual({ km: null });
    expect(universityNearness({ districtId: "d2" }, uni("ada", "d1"))).toBeNull();
  });
});
