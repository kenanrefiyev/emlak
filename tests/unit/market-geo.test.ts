import { describe, expect, it } from "vitest";
import { approxPosition, BAKU_CENTER } from "@/lib/baku-geo";

describe("listing map position outside Baku", () => {
  it("uses the district's own centre, then its city's — never Baku", () => {
    const kadikoy = { slug: "kadikoy", latitude: 40.991, longitude: 29.027, city: { latitude: 41.0082, longitude: 28.9784 } };
    expect(approxPosition({ district: kadikoy })).toEqual([40.991, 29.027]);
    expect(approxPosition({ district: { ...kadikoy, latitude: null, longitude: null } })).toEqual([41.0082, 28.9784]);
  });

  it("prefers a finer place with its own coordinates", () => {
    const moda = { slug: "moda", latitude: 40.9845, longitude: 29.0262 };
    expect(approxPosition({ neighborhood: moda, district: { slug: "kadikoy", latitude: 40.991, longitude: 29.027 } })).toEqual([40.9845, 29.0262]);
  });

  it("keeps the built-in Baku tables for Baku places", () => {
    expect(approxPosition({ district: { slug: "yasamal" } })).not.toEqual(BAKU_CENTER);
  });
});
