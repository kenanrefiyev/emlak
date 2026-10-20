"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/server/auth/current";
import { cancelSubscriptionRequest, featureListing, requestSubscription, requestVerification, updateAgentProfile } from "@/server/agents";
import { failure, str } from "@/server/action-utils";
import { formObject } from "@/lib/validation/helpers";
import { ServiceError, type ActionState } from "@/server/errors";

async function requireAgent() {
  const user = await getCurrentUser();
  if (!user) throw new ServiceError("unauthorized");
  if (user.role !== "AGENT") throw new ServiceError("forbidden");
  return user;
}

export async function updateAgentProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await updateAgentProfile(await requireAgent(), formObject(formData));
    revalidatePath("/[locale]/agent", "layout");
    revalidatePath("/[locale]/dashboard", "layout");
    return { status: "ok" };
  } catch (err) {
    return failure(err);
  }
}

export async function requestVerificationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await requestVerification(await requireAgent(), formObject(formData));
    revalidatePath("/[locale]/agent/verification", "page");
    return { status: "ok" };
  } catch (err) {
    return failure(err);
  }
}

export async function requestSubscriptionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await requestSubscription(await requireAgent(), str(formData, "id"));
    revalidatePath("/[locale]/agent/subscription", "page");
    revalidatePath("/[locale]/dashboard", "layout");
    return { status: "ok" };
  } catch (err) {
    return failure(err);
  }
}

export async function cancelSubscriptionRequestAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await cancelSubscriptionRequest(await requireAgent(), str(formData, "id"));
    revalidatePath("/[locale]/agent/subscription", "page");
    revalidatePath("/[locale]/dashboard", "layout");
    return { status: "ok" };
  } catch (err) {
    return failure(err);
  }
}

export async function featureListingAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await featureListing(await requireAgent(), str(formData, "id"));
    revalidatePath("/[locale]/account/listings", "page");
    revalidatePath("/[locale]/agent", "layout");
    return { status: "ok" };
  } catch (err) {
    return failure(err);
  }
}
