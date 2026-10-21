"use server";

import { createSupportMessage } from "@/server/engagement";
import { getCurrentUser } from "@/server/auth/current";
import { clientIp } from "@/server/request-info";
import { failure, localeFrom } from "@/server/action-utils";
import { formObject } from "@/lib/validation/helpers";
import type { ActionState } from "@/server/errors";

export async function supportAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await getCurrentUser();
    await createSupportMessage(formObject(formData), { ip: await clientIp(), locale: localeFrom(formData), userId: user?.id });
    return { status: "ok" };
  } catch (err) {
    return failure(err);
  }
}
