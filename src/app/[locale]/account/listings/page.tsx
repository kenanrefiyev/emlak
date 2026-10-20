import { redirect } from "next/navigation";

/** Listing management moved into the dashboard. */
export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  redirect(`/${(await params).locale}/dashboard/listings`);
}
