/**
 * Roommate matching — practical, rule-based, fully explainable.
 *
 * It compares the logistics of two roommate ads (money, area, dates, length of
 * stay, home type, household habits). It does NOT measure personality or
 * promise that people will get along; the UI says so next to every score.
 *
 * Points (max 100):
 *   budget      30  contribution inside the other's range / ranges overlap (15 if within 15%)
 *   area        20  place is in a preferred district / preferred districts intersect
 *   move-in     15  dates within 14 days (8 if within 45 days)
 *   duration    10  planned stays differ by ≤ 2 months (5 if ≤ 4 months)
 *   home        10  desired type matches (5) + enough free places for the group (5)
 *   household   15  smoking 4, sleep schedule 4, cleaning 4, noise 3 — each only
 *                   when both people answered (lifestyle answers are optional)
 * Two "I have a place" ads are never matched with each other (score = null).
 */

export interface MatchableAd {
  id: string;
  type: "HAS_PLACE" | "SEEKING_PARTNER";
  monthlyContribution: number | null;
  budgetMin: number | null;
  budgetMax: number | null;
  districtId: string | null;
  preferredDistrictIds: string[];
  moveInDate: Date;
  durationMonths: number;
  accommodationType: string | null;
  desiredPropertyType: string | null;
  availableSpaces: number | null;
  groupSize: number | null;
  smoking: "NO_SMOKING" | "OUTSIDE_ONLY" | "ALLOWED" | null;
  sleepSchedule: "EARLY" | "LATE" | "FLEXIBLE" | null;
  cleaning: "ROTA" | "EACH_OWN" | "HIRED_HELP" | "FLEXIBLE" | null;
  noise: "QUIET" | "MODERATE" | "LIVELY" | null;
}

export type MatchReason =
  | "budget"
  | "budgetNear"
  | "area"
  | "moveIn"
  | "moveInNear"
  | "duration"
  | "durationNear"
  | "homeType"
  | "spaces"
  | "smoking"
  | "sleep"
  | "cleaning"
  | "noise";

export interface MatchResult {
  score: number;
  reasons: MatchReason[];
}

const DAY = 86_400_000;

function within(value: number, min: number, max: number, tolerance = 0) {
  return value >= min * (1 - tolerance) && value <= max * (1 + tolerance);
}

function budgetPoints(a: MatchableAd, b: MatchableAd): [number, MatchReason?] {
  if (a.type === "HAS_PLACE" && b.type === "SEEKING_PARTNER") return budgetPoints(b, a);
  if (a.type === "SEEKING_PARTNER" && b.type === "HAS_PLACE") {
    if (a.budgetMin == null || a.budgetMax == null || b.monthlyContribution == null) return [0];
    if (within(b.monthlyContribution, a.budgetMin, a.budgetMax)) return [30, "budget"];
    if (within(b.monthlyContribution, a.budgetMin, a.budgetMax, 0.15)) return [15, "budgetNear"];
    return [0];
  }
  // both seeking
  if (a.budgetMin == null || a.budgetMax == null || b.budgetMin == null || b.budgetMax == null) return [0];
  if (a.budgetMin <= b.budgetMax && b.budgetMin <= a.budgetMax) return [30, "budget"];
  if (a.budgetMin <= b.budgetMax * 1.15 && b.budgetMin <= a.budgetMax * 1.15) return [15, "budgetNear"];
  return [0];
}

function areaPoints(a: MatchableAd, b: MatchableAd): number {
  if (a.type === "HAS_PLACE") return a.districtId && b.preferredDistrictIds.includes(a.districtId) ? 20 : 0;
  if (b.type === "HAS_PLACE") return b.districtId && a.preferredDistrictIds.includes(b.districtId) ? 20 : 0;
  return a.preferredDistrictIds.some((d) => b.preferredDistrictIds.includes(d)) ? 20 : 0;
}

function homePoints(a: MatchableAd, b: MatchableAd): [number, MatchReason[]] {
  const reasons: MatchReason[] = [];
  let pts = 0;
  const place = a.type === "HAS_PLACE" ? a : b.type === "HAS_PLACE" ? b : null;
  const seeker = place === a ? b : a;
  if (place) {
    if (seeker.desiredPropertyType && seeker.desiredPropertyType === place.accommodationType) {
      pts += 5;
      reasons.push("homeType");
    }
    if (place.availableSpaces != null && place.availableSpaces >= (seeker.groupSize ?? 1)) {
      pts += 5;
      reasons.push("spaces");
    }
  } else {
    if (a.desiredPropertyType && a.desiredPropertyType === b.desiredPropertyType) {
      pts += 5;
      reasons.push("homeType");
    }
    if ((a.groupSize ?? 1) + (b.groupSize ?? 1) <= 4) {
      pts += 5;
      reasons.push("spaces");
    }
  }
  return [pts, reasons];
}

/** Household habits: a facet counts only when both sides answered it. */
function householdPoints(a: MatchableAd, b: MatchableAd): [number, MatchReason[]] {
  const reasons: MatchReason[] = [];
  let pts = 0;
  if (a.smoking && b.smoking) {
    const ok =
      a.smoking === b.smoking ||
      (a.smoking !== "ALLOWED" && b.smoking !== "ALLOWED") ||
      (a.smoking === "OUTSIDE_ONLY" && b.smoking === "ALLOWED") ||
      (b.smoking === "OUTSIDE_ONLY" && a.smoking === "ALLOWED");
    if (ok) {
      pts += 4;
      reasons.push("smoking");
    }
  }
  if (a.sleepSchedule && b.sleepSchedule && (a.sleepSchedule === b.sleepSchedule || a.sleepSchedule === "FLEXIBLE" || b.sleepSchedule === "FLEXIBLE")) {
    pts += 4;
    reasons.push("sleep");
  }
  if (a.cleaning && b.cleaning && (a.cleaning === b.cleaning || a.cleaning === "FLEXIBLE" || b.cleaning === "FLEXIBLE")) {
    pts += 4;
    reasons.push("cleaning");
  }
  // Neighbouring levels are fine (quiet ↔ moderate); quiet ↔ lively is not.
  if (a.noise && b.noise && !((a.noise === "QUIET" && b.noise === "LIVELY") || (a.noise === "LIVELY" && b.noise === "QUIET"))) {
    pts += 3;
    reasons.push("noise");
  }
  return [pts, reasons];
}

export function matchAds(a: MatchableAd, b: MatchableAd): MatchResult | null {
  if (a.id === b.id) return null;
  if (a.type === "HAS_PLACE" && b.type === "HAS_PLACE") return null;

  const reasons: MatchReason[] = [];
  let score = 0;

  const [bp, br] = budgetPoints(a, b);
  score += bp;
  if (br) reasons.push(br);

  const ap = areaPoints(a, b);
  score += ap;
  if (ap) reasons.push("area");

  const days = Math.abs(a.moveInDate.getTime() - b.moveInDate.getTime()) / DAY;
  if (days <= 14) {
    score += 15;
    reasons.push("moveIn");
  } else if (days <= 45) {
    score += 8;
    reasons.push("moveInNear");
  }

  const months = Math.abs(a.durationMonths - b.durationMonths);
  if (months <= 2) {
    score += 10;
    reasons.push("duration");
  } else if (months <= 4) {
    score += 5;
    reasons.push("durationNear");
  }

  const [hp, hr] = homePoints(a, b);
  score += hp;
  reasons.push(...hr);

  const [lp, lr] = householdPoints(a, b);
  score += lp;
  reasons.push(...lr);

  return { score: Math.min(100, score), reasons };
}
