import { z } from "zod";
import {
  CLEANING,
  CONTACT_PREFS,
  GENDER_PREFS,
  GUESTS,
  LISTING_CATEGORIES,
  NOISE,
  PRICE_MAX,
  PRICE_MIN,
  ROOMMATE_TYPES,
  SLEEP,
  SMOKING,
} from "@/lib/domain";
import { checkbox, dateString, optionalId, optionalInt, optionalText, requiredInt, requiredText, V } from "./helpers";

const choice = <T extends readonly [string, ...string[]]>(values: T) => z.enum(values, { error: V.choice });
const optionalChoice = <T extends readonly [string, ...string[]]>(values: T) =>
  z.preprocess((v) => (v === "" || v === null ? undefined : v), choice(values).optional());

export const roommateInputSchema = z
  .object({
    type: choice(ROOMMATE_TYPES),
    title: requiredText(10, 120),
    description: requiredText(30, 3000),
    originalLocale: z.enum(["az", "tr", "ru", "en"]).default("az"),
    // Scenario A — I have a place
    monthlyContribution: optionalInt(PRICE_MIN, PRICE_MAX),
    accommodationType: optionalChoice(LISTING_CATEGORIES),
    currentResidents: optionalInt(1, 20),
    availableSpaces: optionalInt(1, 10),
    districtId: optionalId,
    neighborhoodId: optionalId,
    metroStationId: optionalId,
    houseRules: optionalText(1000),
    // Scenario B — looking for someone to rent with
    budgetMin: optionalInt(PRICE_MIN, PRICE_MAX),
    budgetMax: optionalInt(PRICE_MIN, PRICE_MAX),
    desiredPropertyType: optionalChoice(LISTING_CATEGORIES),
    groupSize: optionalInt(1, 6),
    preferredDistrictIds: z.array(z.string().max(40)).max(8).default([]),
    // Shared
    universityId: optionalId,
    moveInDate: dateString,
    durationMonths: requiredInt(1, 48),
    genderPreference: choice(GENDER_PREFS).default("ANY"),
    // Lifestyle answers are optional ("" = prefer not to say).
    smoking: optionalChoice(SMOKING),
    cleaning: optionalChoice(CLEANING),
    sleepSchedule: optionalChoice(SLEEP),
    guests: optionalChoice(GUESTS),
    noise: optionalChoice(NOISE),
    petsOk: checkbox,
    showProfile: checkbox,
    contactPreference: choice(CONTACT_PREFS).default("IN_APP"),
  })
  .superRefine((v, ctx) => {
    const req = (path: string) => ctx.addIssue({ code: "custom", path: [path], message: V.required });
    if (v.type === "HAS_PLACE") {
      if (v.monthlyContribution === undefined) req("monthlyContribution");
      if (!v.districtId) req("districtId");
      if (!v.accommodationType) req("accommodationType");
      if (v.currentResidents === undefined) req("currentResidents");
      if (v.availableSpaces === undefined) req("availableSpaces");
    } else {
      if (v.budgetMin === undefined) req("budgetMin");
      if (v.budgetMax === undefined) req("budgetMax");
      if (v.budgetMin !== undefined && v.budgetMax !== undefined && v.budgetMin > v.budgetMax)
        ctx.addIssue({ code: "custom", path: ["budgetMax"], message: V.budgetRange });
      if (v.preferredDistrictIds.length === 0) req("preferredDistrictIds");
      if (v.groupSize === undefined) req("groupSize");
    }
  });

export type RoommateInput = z.infer<typeof roommateInputSchema>;

/** DB-ready values; fields of the other scenario are cleared. */
export function normalizeRoommateInput(v: RoommateInput) {
  const a = v.type === "HAS_PLACE";
  return {
    type: v.type,
    title: v.title,
    description: v.description,
    originalLocale: v.originalLocale,
    monthlyContribution: a ? (v.monthlyContribution ?? null) : null,
    accommodationType: a ? (v.accommodationType ?? null) : null,
    currentResidents: a ? (v.currentResidents ?? null) : null,
    availableSpaces: a ? (v.availableSpaces ?? null) : null,
    districtId: a ? (v.districtId ?? null) : null,
    neighborhoodId: a ? (v.neighborhoodId ?? null) : null,
    metroStationId: a ? (v.metroStationId ?? null) : null,
    houseRules: v.houseRules ?? null,
    budgetMin: a ? null : (v.budgetMin ?? null),
    budgetMax: a ? null : (v.budgetMax ?? null),
    desiredPropertyType: a ? null : (v.desiredPropertyType ?? null),
    groupSize: a ? null : (v.groupSize ?? null),
    universityId: v.universityId ?? null,
    moveInDate: new Date(`${v.moveInDate}T00:00:00Z`),
    durationMonths: v.durationMonths,
    genderPreference: v.genderPreference,
    smoking: v.smoking ?? null,
    cleaning: v.cleaning ?? null,
    sleepSchedule: v.sleepSchedule ?? null,
    guests: v.guests ?? null,
    noise: v.noise ?? null,
    petsOk: v.petsOk,
    showProfile: v.showProfile,
    contactPreference: v.contactPreference,
  } as const;
}
