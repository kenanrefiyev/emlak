"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/server/auth/current";
import { failure, str } from "@/server/action-utils";
import { ServiceError, type ActionState } from "@/server/errors";
import { formObject } from "@/lib/validation/helpers";
import { adminSetListingStatus, deleteListing, moderateListing, setListingVerified } from "@/server/listings/service";
import { deleteRoommateAd, moderateRoommateAd } from "@/server/roommates/service";
import { adminFeatureListing, adminSetSubscription, endFeatured, reviewVerification, revokeAgentVerification } from "@/server/agents";
import { resolveReport } from "@/server/engagement";
import { deleteReference, saveReference, savePackage, saveSettings, setSupportStatus, setUserRole, setUserSuspended, type LocationKind } from "@/server/admin";

/** Every admin action re-checks the role on the server; hidden buttons are not a security boundary. */
async function admin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") throw new ServiceError("forbidden");
  return user;
}

function done(path: string): ActionState {
  revalidatePath(path, "layout");
  return { status: "ok" };
}

export async function moderateListingAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const a = await admin();
    const op = str(fd, "op");
    const id = str(fd, "id");
    if (op === "approve" || op === "reject") await moderateListing(a, id, op, str(fd, "reason"));
    else if (op === "verify" || op === "unverify") await setListingVerified(a, id, op === "verify");
    else if (op === "archive") await adminSetListingStatus(a, id, "ARCHIVED");
    else if (op === "delete") await deleteListing(a, id);
    else if (op === "feature") await adminFeatureListing(a, id, Number(str(fd, "days") || 7));
    else throw new ServiceError("validation");
    return done("/emlk-xyz");
  } catch (err) {
    return failure(err);
  }
}

export async function moderateRoommateAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const a = await admin();
    const op = str(fd, "op");
    const id = str(fd, "id");
    if (op === "approve" || op === "reject") await moderateRoommateAd(a, id, op, str(fd, "reason"));
    else if (op === "delete") await deleteRoommateAd(a, id);
    else throw new ServiceError("validation");
    return done("/emlk-xyz");
  } catch (err) {
    return failure(err);
  }
}

export async function userAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const a = await admin();
    const op = str(fd, "op");
    const id = str(fd, "id");
    if (op === "suspend" || op === "unsuspend") await setUserSuspended(a, id, op === "suspend", str(fd, "reason"));
    else if (op === "role") await setUserRole(a, id, str(fd, "role"));
    else if (op === "revoke") await revokeAgentVerification(a, id, str(fd, "reason"));
    else throw new ServiceError("validation");
    return done("/emlk-xyz");
  } catch (err) {
    return failure(err);
  }
}

export async function verificationAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const a = await admin();
    await reviewVerification(a, str(fd, "id"), str(fd, "op") === "approve", str(fd, "reason"));
    return done("/emlk-xyz");
  } catch (err) {
    return failure(err);
  }
}

export async function reportAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const a = await admin();
    const op = str(fd, "op");
    if (op === "answered" || op === "closed") await setSupportStatus(a, str(fd, "id"), op === "answered" ? "ANSWERED" : "CLOSED");
    else await resolveReport(a, str(fd, "id"), op === "dismiss" ? "DISMISSED" : "RESOLVED", str(fd, "reason"));
    return done("/emlk-xyz");
  } catch (err) {
    return failure(err);
  }
}

export async function subscriptionAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const a = await admin();
    const op = str(fd, "op");
    if (op === "activate" || op === "cancel") await adminSetSubscription(a, str(fd, "id"), op, str(fd, "reason") || undefined);
    else if (op === "endFeatured") await endFeatured(a, str(fd, "id"));
    else throw new ServiceError("validation");
    return done("/emlk-xyz");
  } catch (err) {
    return failure(err);
  }
}

export async function featureByIdAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const a = await admin();
    await adminFeatureListing(a, str(fd, "listingId").trim(), Number(str(fd, "days")));
    return done("/emlk-xyz");
  } catch (err) {
    return failure(err);
  }
}

export async function packageAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const a = await admin();
    await savePackage(a, str(fd, "id") || null, formObject(fd));
    return done("/emlk-xyz");
  } catch (err) {
    return failure(err);
  }
}

const KINDS: LocationKind[] = ["country", "city", "district", "neighborhood", "metro", "university", "amenity"];

export async function referenceAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const a = await admin();
    const kind = str(fd, "kind") as LocationKind;
    if (!KINDS.includes(kind)) throw new ServiceError("validation");
    if (str(fd, "op") === "delete") await deleteReference(a, kind, str(fd, "id"));
    else await saveReference(a, kind, str(fd, "id") || null, formObject(fd));
    return done("/emlk-xyz");
  } catch (err) {
    return failure(err);
  }
}

export async function settingsAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await saveSettings(await admin(), formObject(fd));
    return done("/emlk-xyz");
  } catch (err) {
    return failure(err);
  }
}
