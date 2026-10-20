import { z } from "zod";
import { optionalPhone, V } from "./helpers";

export const emailField = z
  .string({ error: V.required })
  .trim()
  .toLowerCase()
  .min(1, { error: V.required })
  .max(160, { error: V.tooLong })
  .pipe(z.email({ error: V.email }));

/** At least 8 characters with one letter and one digit. */
export const passwordField = z
  .string({ error: V.required })
  .min(8, { error: V.password })
  .max(128, { error: V.tooLong })
  .refine((p) => /\p{L}/u.test(p) && /\d/.test(p), { error: V.password });

export const registerSchema = z
  .object({
    name: z.string({ error: V.required }).trim().min(2, { error: V.tooShort }).max(80, { error: V.tooLong }),
    email: emailField,
    phone: optionalPhone,
    password: passwordField,
    passwordConfirm: z.string(),
    // ADMIN can never be chosen here; admins are created with `npm run admin:create`.
    accountType: z.enum(["USER", "OWNER", "AGENT"], { error: V.choice }),
    acceptTerms: z.literal("on", { error: V.required }),
  })
  .refine((v) => v.password === v.passwordConfirm, { path: ["passwordConfirm"], error: V.passwordMatch });

export const loginSchema = z.object({
  email: emailField,
  password: z.string({ error: V.required }).min(1, { error: V.required }).max(128),
});

export const resetRequestSchema = z.object({ email: emailField });

export const resetSchema = z
  .object({ token: z.string().min(20).max(100), password: passwordField, passwordConfirm: z.string() })
  .refine((v) => v.password === v.passwordConfirm, { path: ["passwordConfirm"], error: V.passwordMatch });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, { error: V.required }),
    password: passwordField,
    passwordConfirm: z.string(),
  })
  .refine((v) => v.password === v.passwordConfirm, { path: ["passwordConfirm"], error: V.passwordMatch });
