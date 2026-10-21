import { z } from "zod";
import { REPORT_REASONS, SPOKEN_LANGUAGES } from "@/lib/domain";
import { checkbox, optionalId, optionalInt, optionalPhone, optionalText, requiredText, V } from "./helpers";
import { emailField } from "./auth";

export const contactRequestSchema = z
  .object({
    listingId: optionalId,
    roommateAdId: optionalId,
    message: requiredText(10, 1000),
  })
  .refine((v) => Boolean(v.listingId) !== Boolean(v.roommateAdId), { path: ["_form"], error: V.required });

export const reportSchema = z
  .object({
    listingId: optionalId,
    roommateAdId: optionalId,
    reason: z.enum(REPORT_REASONS, { error: V.choice }),
    details: optionalText(1000),
  })
  .refine((v) => Boolean(v.listingId) !== Boolean(v.roommateAdId), { path: ["_form"], error: V.required });

export const profileSchema = z.object({
  name: z.string({ error: V.required }).trim().min(2, { error: V.tooShort }).max(80, { error: V.tooLong }),
  phone: optionalPhone,
  bio: optionalText(600),
  hometown: optionalText(80),
  universityId: optionalId,
  studyYear: optionalInt(1, 8),
  sharePhoneOnAccept: checkbox,
  preferredLocale: z.enum(["az", "tr", "ru", "en"]),
  languages: z.array(z.enum(SPOKEN_LANGUAGES, { error: V.choice })).max(SPOKEN_LANGUAGES.length).default([]),
});

export const agentProfileSchema = z.object({
  companyName: optionalText(120),
  licenseNumber: optionalText(60),
  businessPhone: optionalPhone,
  businessEmail: z.preprocess((v) => (v === "" ? undefined : v), emailField.optional()),
  website: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() || undefined : v),
    z.url({ error: V.url, protocol: /^https?$/ }).max(200).optional(),
  ),
  about: optionalText(1500),
  officeAddress: optionalText(200),
});

export const verificationRequestSchema = z.object({
  message: requiredText(20, 1500),
});

export const supportSchema = z.object({
  name: requiredText(2, 80),
  email: emailField,
  subject: requiredText(3, 140),
  message: requiredText(20, 3000),
});

export const savedSearchSchema = z.object({
  kind: z.enum(["LISTINGS", "ROOMMATES"]),
  name: requiredText(2, 60),
  query: z.string().max(1000),
});

export { checkbox };
