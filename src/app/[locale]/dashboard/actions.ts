"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/server/auth/current";
import { failure, str } from "@/server/action-utils";
import { formObject } from "@/lib/validation/helpers";
import { ServiceError, type ActionState } from "@/server/errors";
import { createListing, parseListingInput, updateListing } from "@/server/listings/service";
import { BULK_OPS, bulkListingOp, updateLead, type BulkOp } from "@/server/dashboard";
import { requestVerification } from "@/server/agents";
import { db } from "@/server/db";
import { fieldErrorsOf, optionalPhone, optionalText, checkbox, V } from "@/lib/validation/helpers";
import { SPOKEN_LANGUAGES } from "@/lib/domain";
import { z } from "zod";

async function requireActor() {
  const user = await getCurrentUser();
  if (!user) throw new ServiceError("unauthorized");
  if (user.status !== "ACTIVE") throw new ServiceError("forbidden");
  return user;
}

const refresh = () => revalidatePath("/[locale]/dashboard", "layout");

/**
 * Wizard save. Creates a draft the first time (the client then moves on to
 * photos with the new id) and updates it afterwards. The whole listing is
 * validated on every save; field errors are mapped back to their step.
 */
export async function saveListingAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireActor();
    const input = parseListingInput(formObject(formData, ["amenityIds"]));
    const id = str(formData, "id");
    if (id) {
      const { requeued } = await updateListing(user, id, input);
      revalidatePath(`/[locale]/listings/${id}`, "page");
      refresh();
      return { status: "ok", data: { id, requeued } };
    }
    const created = await createListing(user, input);
    refresh();
    return { status: "ok", data: { id: created.id, created: true } };
  } catch (err) {
    return failure(err);
  }
}

export async function bulkListingAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireActor();
    const op = str(formData, "op") as BulkOp;
    if (!(op in BULK_OPS)) throw new ServiceError("validation");
    const ids = formData.getAll("ids").filter((v): v is string => typeof v === "string");
    const result = await bulkListingOp(user, op, ids);
    refresh();
    revalidatePath("/[locale]/account/listings", "page");
    return { status: "ok", data: { ok: result.ok, failed: result.failed.length, codes: [...new Set(result.failed.map((f) => f.code))] } };
  } catch (err) {
    return failure(err);
  }
}

export async function updateLeadAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireActor();
    await updateLead(user.id, formObject(formData));
    refresh();
    return { status: "ok" };
  } catch (err) {
    return failure(err);
  }
}

export async function requestVerificationDashboardAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireActor();
    await requestVerification(user, formObject(formData));
    refresh();
    return { status: "ok" };
  } catch (err) {
    return failure(err);
  }
}

const dashboardProfileSchema = z.object({
  name: z.string({ error: V.required }).trim().min(2, { error: V.tooShort }).max(80, { error: V.tooLong }),
  phone: optionalPhone,
  bio: optionalText(600),
  languages: z.array(z.enum(SPOKEN_LANGUAGES, { error: V.choice })).max(SPOKEN_LANGUAGES.length).default([]),
});

/** Public-facing profile basics. Role, verification and email are not editable here. */
export async function updateDashboardProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireActor();
    const parsed = dashboardProfileSchema.safeParse(formObject(formData, ["languages"]));
    if (!parsed.success) throw new ServiceError("validation", fieldErrorsOf(parsed.error));
    const v = parsed.data;
    await db.user.update({
      where: { id: user.id },
      data: {
        name: v.name,
        phone: v.phone ?? null,
        profile: {
          upsert: {
            create: { bio: v.bio ?? null, languages: v.languages },
            update: { bio: v.bio ?? null, languages: v.languages },
          },
        },
      },
    });
    refresh();
    return { status: "ok" };
  } catch (err) {
    return failure(err);
  }
}

const settingsSchema = z.object({
  preferredLocale: z.enum(["az", "tr", "ru", "en"], { error: V.choice }),
  sharePhoneOnAccept: checkbox,
});

export async function updateDashboardSettingsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireActor();
    const parsed = settingsSchema.safeParse(formObject(formData));
    if (!parsed.success) throw new ServiceError("validation", fieldErrorsOf(parsed.error));
    const v = parsed.data;
    await db.user.update({
      where: { id: user.id },
      data: {
        preferredLocale: v.preferredLocale,
        profile: { upsert: { create: { sharePhoneOnAccept: v.sharePhoneOnAccept }, update: { sharePhoneOnAccept: v.sharePhoneOnAccept } } },
      },
    });
    refresh();
    return { status: "ok" };
  } catch (err) {
    return failure(err);
  }
}
