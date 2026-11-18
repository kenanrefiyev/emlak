/**
 * Approximate coordinates for Baku reference places, keyed by slug. They are
 * used to place listings on the map at area level (metro station → area →
 * university → district centre); a listing's exact address is never mapped.
 * prisma/seed.ts copies them into the reference tables where an admin has not
 * set a value yet, and admins can correct them in the admin panel.
 */
export type LatLng = [lat: number, lng: number];

const metro = {
  // Red line
  icerisheher: [40.3659, 49.8317],
  sahil: [40.3718, 49.8442],
  "28-may": [40.3801, 49.8487],
  genclik: [40.4006, 49.852],
  nerimanov: [40.4024, 49.8708],
  bakmil: [40.4143, 49.8795],
  ulduz: [40.415, 49.8914],
  koroglu: [40.4207, 49.9184],
  "qara-qarayev": [40.4174, 49.9341],
  neftciler: [40.4109, 49.9435],
  "xalqlar-dostlugu": [40.3977, 49.9525],
  ehmedli: [40.3852, 49.9541],
  "hezi-aslanov": [40.3727, 49.9531],
  // Green line
  dernegul: [40.425, 49.8618],
  "azadliq-prospekti": [40.4258, 49.8429],
  nesimi: [40.4239, 49.8273],
  "memar-ecemi": [40.4105, 49.8143],
  "20-yanvar": [40.4041, 49.8085],
  insaatcilar: [40.3891, 49.8024],
  "elmler-akademiyasi": [40.375, 49.8146],
  nizami: [40.3795, 49.8301],
  "cefer-cabbarli": [40.3797, 49.8494],
  xetai: [40.3833, 49.8717],
  // Purple line
  xocesen: [40.427, 49.7752],
  avtovagzal: [40.4207, 49.7949],
  "memar-ecemi-2": [40.4098, 49.8156],
  "8-noyabr": [40.4027, 49.8202],
} satisfies Record<string, LatLng>;

export const METRO_COORDS: Record<string, LatLng> = metro;

export const NEIGHBORHOOD_COORDS: Record<string, LatLng> = {
  genclik: metro.genclik,
  "nerimanov-metro": metro.nerimanov,
  ulduz: metro.ulduz,
  "elmler-akademiyasi": metro["elmler-akademiyasi"],
  insaatcilar: metro.insaatcilar,
  "yeni-yasamal": [40.3925, 49.7935],
  "28-may": metro["28-may"],
  "nizami-kucesi": [40.3746, 49.8434],
  icerisheher: metro.icerisheher,
  sahil: metro.sahil,
  badamdar: [40.353, 49.801],
  "xetai-metro": metro.xetai,
  ehmedli: metro.ehmedli,
  "hezi-aslanov": metro["hezi-aslanov"],
  koroglu: metro.koroglu,
  neftciler: metro.neftciler,
  "qara-qarayev": metro["qara-qarayev"],
  "azadliq-prospekti": metro["azadliq-prospekti"],
  "8-mkr": [40.422, 49.813],
  bakixanov: [40.425, 49.955],
};

/** Main campus of each university, from OpenStreetMap (checked 2026-10). */
export const UNIVERSITY_COORDS: Record<string, LatLng> = {
  bdu: [40.3739, 49.811], // Z. Xəlilov küç. 33, Yasamal
  unec: [40.3677, 49.8321], // İstiqlaliyyət küç. 6, Səbail
  adnsu: [40.3786, 49.8487], // Azadlıq pr. 20, Nəsimi
  aztu: [40.3701, 49.8154], // H. Cavid pr. 25, Yasamal
  azmiu: [40.3698, 49.8126], // Ayna Sultanova küç. 11, Yasamal
  adpu: [40.3729, 49.8479], // Ü. Hacıbəyli küç. 68, Səbail
  atu: [40.3958, 49.8329], // Bakıxanov küç. 23, Nəsimi
  ada: [40.3964, 49.8498], // Əhmədbəy Ağaoğlu küç. 61, Nərimanov (Gənclik)
  bhos: [40.3823, 49.8721], // Xocalı pr. 30, Xətai
  khazar: [40.4082, 49.9372], // Məhsəti küç. 41, Nizami (Neftçilər)
  adu: [40.3835, 49.8429], // R. Behbudov küç. 134, Nəsimi
  bsu: [40.3837, 49.8437], // S. Rüstəm küç. 33, Nəsimi
};

/** Rough centre of each district's residential area — the last-resort fallback. */
export const DISTRICT_CENTERS: Record<string, LatLng> = {
  yasamal: [40.388, 49.805],
  nesimi: [40.384, 49.84],
  nerimanov: [40.405, 49.875],
  sebail: [40.362, 49.832],
  xetai: [40.385, 49.9],
  nizami: [40.408, 49.935],
  binegedi: [40.448, 49.83],
  sabuncu: [40.445, 49.95],
  suraxani: [40.42, 50.01],
  xezer: [40.4, 50.1],
  qaradag: [40.24, 49.65],
  pirallahi: [40.47, 50.33],
};

export const BAKU_CENTER: LatLng = [40.3953, 49.8822];

type Place = { slug: string; latitude?: number | null; longitude?: number | null } | null | undefined;
type Point = { latitude: number | null; longitude: number | null } | null | undefined;

function coordsOf(place: Place, table: Record<string, LatLng>): LatLng | null {
  if (!place) return null;
  if (place.latitude != null && place.longitude != null) return [place.latitude, place.longitude];
  return table[place.slug] ?? null;
}

/**
 * Area-level position of a listing; admin-set coordinates win over the built-in
 * table. Falls back from the finest known place to the district and then its
 * city, so a listing outside Baku is never placed in Baku.
 */
export function approxPosition(l: {
  metroStation?: Place;
  neighborhood?: Place;
  university?: Place;
  district: NonNullable<Place> & { city?: Point };
}): LatLng {
  const city = l.district.city;
  return (
    coordsOf(l.metroStation, METRO_COORDS) ??
    coordsOf(l.neighborhood, NEIGHBORHOOD_COORDS) ??
    coordsOf(l.university, UNIVERSITY_COORDS) ??
    coordsOf(l.district, DISTRICT_CENTERS) ??
    (city?.latitude != null && city.longitude != null ? ([city.latitude, city.longitude] as LatLng) : null) ??
    BAKU_CENTER
  );
}

/** Walking-scale radius for "near this university" search and labels. */
export const UNIVERSITY_RADIUS_KM = 2;

/**
 * Where a listing actually is, judged only from its own location fields
 * (metro → area → district). Unlike approxPosition it never falls back to the
 * tagged university, so a wrong university tag cannot pull a listing "near" it.
 * Returns null when only the district is known — too coarse to measure from.
 */
export function ownAreaPosition(l: { metroStation?: Place; neighborhood?: Place }): LatLng | null {
  return coordsOf(l.metroStation, METRO_COORDS) ?? coordsOf(l.neighborhood, NEIGHBORHOOD_COORDS);
}

/** University position; admin-set coordinates win over the built-in table. */
export function universityPosition(u: Place): LatLng | null {
  return coordsOf(u, UNIVERSITY_COORDS);
}

/**
 * Whether a listing's tagged university is really nearby, and how far it is.
 * With a known area (metro / neighborhood) it must be within walking radius;
 * with only a district it must at least be the university's district (km is
 * then unknown). Returns null when the tag should not be shown.
 */
export function universityNearness(
  l: { districtId: string; metroStation?: Place; neighborhood?: Place },
  u: Place & { districtId: string | null },
): { km: number | null } | null {
  if (!u) return null;
  const here = ownAreaPosition(l);
  const there = universityPosition(u);
  if (here && there) {
    const km = distanceKm(here, there);
    return km <= UNIVERSITY_RADIUS_KM ? { km } : null;
  }
  return u.districtId === l.districtId ? { km: null } : null;
}

/**
 * Spreads listings that share an area point so their markers do not stack:
 * a stable offset of up to ~250 m derived from the id.
 */
export function spread([lat, lng]: LatLng, id: string): LatLng {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  const angle = ((h >>> 0) % 360) * (Math.PI / 180);
  const dist = 0.0008 + (((h >>> 9) % 1000) / 1000) * 0.0015; // degrees ≈ 90–250 m
  return [lat + Math.sin(angle) * dist, lng + (Math.cos(angle) * dist) / Math.cos((lat * Math.PI) / 180)];
}

/** Great-circle distance in kilometres. */
export function distanceKm([lat1, lng1]: LatLng, [lat2, lng2]: LatLng): number {
  const r = (d: number) => (d * Math.PI) / 180;
  const a = Math.sin(r(lat2 - lat1) / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lng2 - lng1) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}
