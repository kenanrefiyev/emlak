"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser, currentSessionToken, endSession } from "@/server/auth/current";
import { changePassword, deleteAccount } from "@/server/auth/service";
import { createSavedSearch, deleteSavedSearch, markRequestsRead, respondToContact } from "@/server/engagement";
import { failure, localeFrom, str } from "@/server/action-utils";
import { formObject, fieldErrorsOf } from "@/lib/validation/helpers";
import { profileSchema } from "@/lib/validation/misc";
import { ServiceError, type ActionState } from "@/server/errors";
import { db } from "@/server/db";
import { archiveListing, deleteListing, markRented, renewListing, saveTranslation, submitListing } from "@/server/listings/service";
import {
  archiveRoommateAd,
  closeRoommateAd,
  createRoommateAd,
  deleteRoommateAd,
  parseRoommateInput,
  renewRoommateAd,
  updateRoommateAd,
} from "@/server/roommates/service";
import { isLocale } from "@/i18n/routing";

async function requireActor() {
  const user = await getCurrentUser();
  if (!user) throw new ServiceError("unauthorized");
  return user;
}

// ───────────── profile & security ─────────────

export async function updateProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireActor();
    const parsed = profileSchema.safeParse(formObject(formData, ["languages"]));
    if (!parsed.success) throw new ServiceError("validation", fieldErrorsOf(parsed.error));
    const v = parsed.data;
    if (v.universityId && !(await db.university.findUnique({ where: { id: v.universityId } })))
      throw new ServiceError("validation", { universityId: "choice" });
    await db.user.update({
      where: { id: user.id },
      data: {
        name: v.name,
        phone: v.phone ?? null,
        preferredLocale: v.preferredLocale,
        profile: {
          upsert: {
            create: { bio: v.bio ?? null, hometown: v.hometown ?? null, universityId: v.universityId ?? null, studyYear: v.studyYear ?? null, sharePhoneOnAccept: v.sharePhoneOnAccept, languages: v.languages },
            update: {
              bio: v.bio ?? null,
              hometown: v.hometown ?? null,
              universityId: v.universityId ?? null,
              studyYear: v.studyYear ?? null,
              sharePhoneOnAccept: v.sharePhoneOnAccept,
              // Forms without the languages picker must not wipe the saved list.
              ...(formData.has("languagesField") ? { languages: v.languages } : {}),
            },
          },
        },
      },
    });
    revalidatePath("/[locale]/account", "layout");
    revalidatePath("/[locale]/dashboard", "layout");
    return { status: "ok" };
  } catch (err) {
    return failure(err);
  }
}

export async function changePasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireActor();
    await changePassword(user.id, formObject(formData), await currentSessionToken());
    return { status: "ok" };
  } catch (err) {
    return failure(err);
  }
}

export async function deleteAccountAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const locale = localeFrom(formData);
  try {
    const user = await requireActor();
    await deleteAccount(user.id, str(formData, "password"));
    await endSession();
  } catch (err) {
    return failure(err);
  }
  redirect(`/${locale}`);
}

// ───────────── listings ─────────────

export async function saveTranslationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireActor();
    const target = formData.get("targetLocale");
    if (!isLocale(target)) throw new ServiceError("validation");
    await saveTranslation(user, str(formData, "id"), target, {
      title: str(formData, "title"),
      description: str(formData, "description"),
      paymentTerms: str(formData, "paymentTerms"),
    });
    return { status: "ok" };
  } catch (err) {
    return failure(err);
  }
}

const listingOps = {
  submit: submitListing,
  rented: markRented,
  archive: archiveListing,
  renew: renewListing,
  delete: deleteListing,
} as const;

/** Status changes from the dashboard. `op` comes from the submit button; ownership is checked in the service. */
export async function listingOpAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireActor();
    const op = str(formData, "op") as keyof typeof listingOps;
    const fn = listingOps[op];
    if (!fn) throw new ServiceError("validation");
    const result = await fn(user, str(formData, "id"));
    revalidatePath("/[locale]/account/listings", "page");
    revalidatePath("/[locale]/dashboard", "layout");
    return { status: "ok", data: { op, requeued: Boolean(result && "requeued" in result && result.requeued) } };
  } catch (err) {
    return failure(err);
  }
}

// ───────────── roommate ads ─────────────

export async function createRoommateAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const locale = localeFrom(formData);
  try {
    const user = await requireActor();
    await createRoommateAd(user, parseRoommateInput(formObject(formData, ["preferredDistrictIds"])));
  } catch (err) {
    return failure(err);
  }
  redirect(`/${locale}/account/roommates?created=1`);
}

export async function updateRoommateAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireActor();
    const id = str(formData, "id");
    await updateRoommateAd(user, id, parseRoommateInput(formObject(formData, ["preferredDistrictIds"])));
    revalidatePath(`/[locale]/roommates/${id}`, "page");
    return { status: "ok" };
  } catch (err) {
    return failure(err);
  }
}

const roommateOps = {
  close: closeRoommateAd,
  archive: archiveRoommateAd,
  renew: renewRoommateAd,
  delete: deleteRoommateAd,
} as const;

export async function roommateOpAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireActor();
    const op = str(formData, "op") as keyof typeof roommateOps;
    const fn = roommateOps[op];
    if (!fn) throw new ServiceError("validation");
    const result = await fn(user, str(formData, "id"));
    revalidatePath("/[locale]/account/roommates", "page");
    return { status: "ok", data: { op, requeued: Boolean(result && "requeued" in result && result.requeued) } };
  } catch (err) {
    return failure(err);
  }
}

// ───────────── contact requests & searches ─────────────

export async function respondContactAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireActor();
    await respondToContact(user.id, str(formData, "id"), str(formData, "decision") === "accept");
    revalidatePath("/[locale]/account/requests", "page");
    revalidatePath("/[locale]/dashboard", "layout");
    return { status: "ok" };
  } catch (err) {
    return failure(err);
  }
}

export async function markRequestsReadAction() {
  const user = await getCurrentUser();
  if (user) await markRequestsRead(user.id);
}

export async function saveSearchAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireActor();
    await createSavedSearch(user.id, formObject(formData));
    return { status: "ok" };
  } catch (err) {
    return failure(err);
  }
}

export async function deleteSearchAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireActor();
    await deleteSavedSearch(user.id, str(formData, "id"));
    revalidatePath("/[locale]/account/searches", "page");
    return { status: "ok" };
  } catch (err) {
    return failure(err);
  }
}
