import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";
import { requireUser } from "@/server/auth/current";
import { db } from "@/server/db";
import { unreadNotificationCount } from "@/server/notifications";
import { SideNav } from "@/components/account/side-nav";
import { VerifyBanner } from "@/components/account/verify-banner";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AccountLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const locale = (await params).locale as AppLocale;
  setRequestLocale(locale);
  const user = await requireUser(locale, `/${locale}/account`);
  const [t, nav, pending, unread] = await Promise.all([
    getTranslations({ locale, namespace: "account" }),
    getTranslations({ locale, namespace: "nav" }),
    db.contactRequest.count({ where: { recipientId: user.id, status: "PENDING" } }),
    unreadNotificationCount(user.id),
  ]);
  const items = [
    { href: "/account", label: t("nav.overview") },
    { href: "/dashboard", label: t("nav.dashboard") },
    { href: "/account/roommates", label: t("nav.roommates") },
    { href: "/account/saved", label: t("nav.saved") },
    { href: "/account/notifications", label: t("nav.notifications"), badge: unread },
    { href: "/account/requests", label: t("nav.requests"), badge: pending },
    { href: "/account/searches", label: t("nav.searches") },
    { href: "/account/profile", label: t("nav.profile") },
    { href: "/account/security", label: t("nav.security") },
  ];
  return (
    <div className="bg-gray pb-16">
    <div className="shell grid gap-[30px] pt-8 lg:grid-cols-[16.5rem_1fr] lg:pt-[30px]">
      <aside className="min-w-0 rounded-xl bg-paper p-3 lg:sticky lg:top-28 lg:self-start lg:p-4">
        <p className="mb-3 hidden px-3.5 text-sm font-semibold text-ink-3 lg:block">{t("title")}</p>
        <SideNav items={items} label={t("title")} />
        <Link href="/dashboard/listings/new" className="btn btn-outline btn-sm mt-4 hidden w-full lg:flex">
          {nav("post")}
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
