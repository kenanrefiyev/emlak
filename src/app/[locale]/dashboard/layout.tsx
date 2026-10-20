import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BadgeCheck } from "lucide-react";
import type { AppLocale } from "@/i18n/routing";
import { requireUser } from "@/server/auth/current";
import { db } from "@/server/db";
import { dashboardKind } from "@/server/dashboard";
import { SideNav } from "@/components/account/side-nav";
import { VerifyBanner } from "@/components/account/verify-banner";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * One dashboard for landlords and realtors. The layout, data and actions are
 * shared; navigation and a few panels adapt to the signed-in role. Every page
 * loads only the current user's own records.
 */
export default async function DashboardLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const locale = (await params).locale as AppLocale;
  setRequestLocale(locale);
  const user = await requireUser(locale, `/${locale}/dashboard`);
  const kind = dashboardKind(user.role);
  const [t, newLeads, profile] = await Promise.all([
    getTranslations({ locale, namespace: "dashboard" }),
    db.contactRequest.count({ where: { recipientId: user.id, listingId: { not: null }, leadStatus: "NEW" } }),
    db.user.findUnique({
      where: { id: user.id },
      select: { profile: { select: { avatarUrl: true, verificationStatus: true } }, agentProfile: { select: { companyName: true, verificationStatus: true } } },
    }),
  ]);
  const verified = kind === "realtor" ? profile?.agentProfile?.verificationStatus === "VERIFIED" : profile?.profile?.verificationStatus === "VERIFIED";
  const displayName = kind === "realtor" ? (profile?.agentProfile?.companyName ?? user.name) : user.name;

  const items = [
    { href: "/dashboard", label: t("nav.overview") },
    { href: "/dashboard/listings", label: kind === "realtor" ? t("nav.portfolio") : t("nav.listings") },
    { href: "/dashboard/inquiries", label: kind === "realtor" ? t("nav.leads") : t("nav.inquiries"), badge: newLeads },
    { href: "/dashboard/statistics", label: t("nav.statistics") },
    { href: "/dashboard/profile", label: t("nav.profile") },
    { href: "/dashboard/subscription", label: kind === "realtor" ? t("nav.subscription") : t("nav.limits") },
    { href: "/dashboard/settings", label: t("nav.settings") },
  ];

  return (
    <div className="bg-gray pb-16">
      <div className="shell grid gap-[30px] pt-8 lg:grid-cols-[16.5rem_1fr] lg:pt-[30px]">
        <aside className="min-w-0 rounded-xl bg-paper p-3 lg:sticky lg:top-28 lg:self-start lg:p-4">
          <div className="mb-3 hidden items-center gap-3 border-b border-line px-1 pb-4 lg:flex">
            <span className="relative grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-mist text-lg font-bold text-brand">
              {profile?.profile?.avatarUrl ? (
                <Image src={profile.profile.avatarUrl} alt="" fill sizes="44px" className="object-cover" />
              ) : (
                displayName.charAt(0).toLocaleUpperCase(locale)
              )}
            </span>
            <span className="min-w-0">
              <span className="block truncate font-semibold">{displayName}</span>
              <span className="flex items-center gap-1 text-xs text-ink-2">
                {kind === "realtor" ? t("kind.realtor") : t("kind.landlord")}
                {verified && <BadgeCheck className="size-3.5 text-ok" aria-label={t("verified")} />}
              </span>
            </span>
          </div>
          <SideNav items={items} label={t("title")} />
          <Link href="/dashboard/listings/new" className="btn btn-primary btn-sm mt-4 hidden w-full lg:flex">
            {t("addListing")}
          </Link>
          <Link href="/account" className="mt-2 hidden min-h-10 items-center justify-center text-sm font-semibold text-ink-2 hover:text-brand lg:flex">
            {t("personalAccount")}
          </Link>
        </aside>
        <div className="min-w-0">
          {!user.emailVerifiedAt && <VerifyBanner />}
          <div className="panel min-h-[60vh]">{children}</div>
        </div>
      </div>
    </div>
  );
}
