import { z } from "zod";
import {
  COMMISSION_TYPES,
  CONTACT_PREFS,
  FURNISHING,
  GENDER_PREFS,
  HEATING,
  LISTING_CATEGORIES,
  PROPERTY_TYPES,
  PRICE_MAX,
  PRICE_MIN,
  SHARED_CATEGORIES,
  UTILITIES,
  WHOLE_UNIT_CATEGORIES,
} from "@/lib/domain";
import { checkbox, dateString, optionalId, optionalInt, optionalPhone, optionalText, requiredInt, requiredText, V } from "./helpers";

const choice = <T extends readonly [string, ...string[]]>(values: T) => z.enum(values, { error: V.choice });

/**
 * One schema for create and edit. Fields irrelevant to the chosen category are
 * dropped (set to null) in `normalizeListingInput`, so a single-room ad never
 * has to fill whole-apartment fields and vice versa.
 */
export const listingInputSchema = z
  .object({
    category: choice(LISTING_CATEGORIES),
    propertyType: choice(PROPERTY_TYPES).default("APARTMENT"),
    title: requiredText(10, 120),
    description: requiredText(40, 5000),
    paymentTerms: optionalText(500),
    originalLocale: z.enum(["az", "tr", "ru", "en"]).default("az"),
    monthlyRent: requiredInt(PRICE_MIN, PRICE_MAX),
    pricePerPlace: checkbox,
    deposit: optionalInt(0, 50000),
    commissionType: choice(COMMISSION_TYPES).default("NONE"),
    commissionValue: optionalInt(0, 50000),
    // Monthly running costs for the whole home; empty = not stated, 0 = none.
    utilitiesCost: optionalInt(0, 5000),
    internetCost: optionalInt(0, 1000),
    otherCosts: optionalInt(0, 5000),
    otherCostsNote: optionalText(200),
    costSharers: optionalInt(1, 30),
    districtId: z.string({ error: V.required }).min(1, { error: V.required }),
    neighborhoodId: optionalId,
    metroStationId: optionalId,
    universityId: optionalId,
    addressPrivate: optionalText(200),
    addressPublic: optionalText(160),
    rooms: optionalInt(1, 20),
    bathrooms: optionalInt(0, 10),
    areaSqm: optionalInt(8, 1000),
    floor: optionalInt(-2, 60),
    totalFloors: optionalInt(1, 60),
    residentsCount: optionalInt(0, 30),
    availableSpaces: optionalInt(1, 30),
    furnishing: choice(FURNISHING),
    utilities: choice(UTILITIES),
    internet: checkbox,
    heating: choice(HEATING),
    airConditioning: checkbox,
    genderPreference: choice(GENDER_PREFS).default("ANY"),
    availableFrom: dateString,
    minDurationMonths: requiredInt(1, 36),
    videoUrl: z.preprocess(
      (v) => (typeof v === "string" ? v.trim() || undefined : v),
      z
        .url({ error: V.url, protocol: /^https$/ })
        .refine((u) => /^(www\.)?(youtube\.com|youtu\.be|vimeo\.com)$/.test(new URL(u).hostname), { error: V.url })
        .optional(),
    ),
    amenityIds: z.array(z.string().max(40)).max(40).default([]),
    rules: optionalText(1000),
    contactName: optionalText(80),
    contactPhone: optionalPhone,
    contactWhatsapp: checkbox,
    contactPreference: choice(CONTACT_PREFS).default("IN_APP"),
  })
  .superRefine((v, ctx) => {
    const shared = SHARED_CATEGORIES.includes(v.category);
    const whole = WHOLE_UNIT_CATEGORIES.includes(v.category);
    if (whole && v.rooms === undefined) ctx.addIssue({ code: "custom", path: ["rooms"], message: V.required });
    if (shared && v.availableSpaces === undefined)
      ctx.addIssue({ code: "custom", path: ["availableSpaces"], message: V.required });
    if (v.category !== "DORMITORY" && shared && v.residentsCount === undefined)
      ctx.addIssue({ code: "custom", path: ["residentsCount"], message: V.required });
    if (v.commissionType !== "NONE" && v.commissionValue === undefined)
      ctx.addIssue({ code: "custom", path: ["commissionValue"], message: V.required });
    if (v.commissionType === "PERCENT" && (v.commissionValue ?? 0) > 100)
      ctx.addIssue({ code: "custom", path: ["commissionValue"], message: V.max });
    if (v.floor !== undefined && v.totalFloors !== undefined && v.floor > v.totalFloors)
      ctx.addIssue({ code: "custom", path: ["floor"], message: V.max });
    if ((v.contactPreference !== "IN_APP" || v.contactWhatsapp) && v.contactPhone === undefined)
      ctx.addIssue({ code: "custom", path: ["contactPhone"], message: V.required });
  });

export type ListingInput = z.infer<typeof listingInputSchema>;

/** Returns DB-ready values with category-irrelevant fields cleared. */
export function normalizeListingInput(v: ListingInput) {
  const shared = SHARED_CATEGORIES.includes(v.category);
  return {
    category: v.category,
    propertyType: v.propertyType,
    originalLocale: v.originalLocale,
    monthlyRent: v.monthlyRent,
    pricePerPlace: v.category === "DORMITORY" || v.category === "PRIVATE_ROOM" ? true : shared ? v.pricePerPlace : false,
    deposit: v.deposit ?? null,
    commissionType: v.commissionType,
    commissionValue: v.commissionType === "NONE" ? null : (v.commissionValue ?? null),
    // Included utilities cost nothing extra; a separate amount would contradict that.
    utilitiesCost: v.utilities === "INCLUDED" ? null : (v.utilitiesCost ?? null),
    internetCost: v.internetCost ?? null,
    otherCosts: v.otherCosts ?? null,
    otherCostsNote: v.otherCosts ? (v.otherCostsNote ?? null) : null,
    costSharers: v.costSharers ?? null,
    districtId: v.districtId,
    neighborhoodId: v.neighborhoodId ?? null,
    metroStationId: v.metroStationId ?? null,
    universityId: v.universityId ?? null,
    addressPrivate: v.addressPrivate ?? null,
    addressPublic: v.addressPublic ?? null,
    rooms: v.rooms ?? null,
    bathrooms: v.bathrooms ?? null,
    areaSqm: v.areaSqm ?? null,
    floor: v.floor ?? null,
    totalFloors: v.totalFloors ?? null,
    residentsCount: shared ? (v.residentsCount ?? null) : null,
    availableSpaces: shared ? (v.availableSpaces ?? null) : null,
    furnishing: v.furnishing,
    utilities: v.utilities,
    internet: v.internet,
    heating: v.heating,
    airConditioning: v.airConditioning,
    genderPreference: shared ? v.genderPreference : "ANY",
    availableFrom: new Date(`${v.availableFrom}T00:00:00Z`),
    minDurationMonths: v.minDurationMonths,
    videoUrl: v.videoUrl ?? null,
    contactName: v.contactName ?? null,
    contactPhone: v.contactPhone ?? null,
    contactWhatsapp: v.contactPhone ? v.contactWhatsapp : false,
    contactPreference: v.contactPhone ? v.contactPreference : ("IN_APP" as const),
  } as const;
}
