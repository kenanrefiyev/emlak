import { redirect } from "next/navigation";

/** The realtor area moved into the shared dashboard. */
export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  redirect(`/${(await params).locale}/dashboard`);
}
