import { getTranslations, setRequestLocale } from "next-intl/server";
import { Building2, Heart, MessageSquare, UsersRound } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { requireUser } from "@/server/auth/current";
import { db } from "@/server/db";
import { FormSuccess } from "@/components/forms/action-form";

export default async function AccountOverview({ params, searchParams }: { params: Promise<{ locale: AppLocale }>; searchParams: Promise<{ welcome?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireUser(locale);
  const { welcome } = await searchParams;
  const [t, auth, e] = await Promise.all([
    getTranslations({ locale, namespace: "account" }),
    getTranslations({ locale, namespace: "auth" }),
    getTranslations({ locale, namespace: "enums" }),
  ]);
  const [listings, roommates, pending, saved] = await Promise.all([
    db.listing.count({ where: { ownerId: user.id, status: { not: "ARCHIVED" } } }),
    db.roommateAd.count({ where: { ownerId: user.id, status: { in: ["PENDING_REVIEW", "PUBLISHED"] } } }),
    db.contactRequest.count({ where: { recipientId: user.id, status: "PENDING" } }),
    db.savedListing.count({ where: { userId: user.id } }),
  ]);
  const tiles = [
    { href: "/dashboard/listings", label: t("overviewListings"), value: listings, icon: <Building2 className="size-7" strokeWidth={1.5} aria-hidden /> },
    { href: "/account/roommates", label: t("overviewRoommates"), value: roommates, icon: <UsersRound className="size-7" strokeWidth={1.5} aria-hidden /> },
    { href: "/account/requests", label: t("overviewRequests"), value: pending, icon: <MessageSquare className="size-7" strokeWidth={1.5} aria-hidden /> },
    { href: "/account/saved", label: t("overviewSaved"), value: saved, icon: <Heart className="size-7" strokeWidth={1.5} aria-hidden /> },
  ];
  return (
    <div>
      {welcome && (
        <div className="mb-6">
          <FormSuccess message={auth("registered")} />
        </div>
      )}
      <h1 className="t-h2">{t("greeting", { name: user.name.split(" ")[0] ?? user.name })}</h1>
      <p className="mt-1 text-ink-2">
        {t("role")}: {e(`role.${user.role}`)} · {user.email}
      </p>
      <ul className="mt-8 grid gap-3 sm:grid-cols-2">
        {tiles.map((tile) => (
          <li key={tile.href}>
            <Link href={tile.href} className="flex items-center gap-5 rounded-xl border border-line p-5 transition-colors hover:border-brand">
              <span className="grid size-[4.5rem] shrink-0 place-items-center rounded-full border border-line text-brand">{tile.icon}</span>
              <span>
                <span className="block font-semibold">{tile.label}</span>
                <span className="t-price mt-1 block text-3xl">{tile.value}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/dashboard/listings/new" className="btn btn-primary">
          {t("newListing")}
        </Link>
        <Link href="/roommates/new" className="btn btn-dark">
          {t("newRoommate")}
        </Link>
      </div>
    </div>
  );
}
