"use server";

import { redirect } from "next/navigation";
import { endSession } from "@/server/auth/current";

export async function adminLogoutAction() {
  await endSession();
  redirect("/emlk-xyz/giris");
}
