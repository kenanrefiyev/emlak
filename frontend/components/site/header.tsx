import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Bell, FilePlus2, UserRound } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { getCurrentUser } from "@/server/auth/current";
import { savedCount } from "@/server/engagement";
import { unreadNotificationCount } from "@/server/notifications";
import { Logo } from "./logo";
import { LanguageSwitcher } from "./language-switcher";
import { MobileNav } from "./mobile-nav";
import { NavLinks } from "./nav-links";
import { SavedLink, SavedToaster } from "./saved-indicator";
import { logoutAction } from "@/app/[locale]/(auth)/actions";

export async function SiteHeader({ locale }: { locale: AppLocale }) {
  const [t, meta, user] = await Promise.all([
    getTranslations({ locale, namespace: "nav" }),
    getTranslations({ locale, namespace: "meta" }),
    getCurrentUser(),
  ]);
  const links = [
    { href: "/students", label: t("students") },
    { href: "/roommates", label: t("roommates") },
    { href: "/family", label: t("family") },
    { href: "/areas", label: t("areas") },
  ];
  const [saved, unread] = user ? await Promise.all([savedCount(user.id), unreadNotificationCount(user.id)]) : [0, 0];
  const accountHref = user?.role === "AGENT" || user?.role === "OWNER" ? "/dashboard" : "/account";

  return (
    <header className="sticky top-0 z-40 bg-paper shadow-header">
      <div className="mx-auto flex h-[70px] max-w-[1440px] items-center gap-6 px-4 xl:h-[78px] xl:gap-10 xl:px-[15px]">
        <Link href="/" className="shrink-0" aria-label={`Yuva — ${t("home")}`}>
          <Logo tagline={meta("logoTagline")} />
        </Link>

        <nav aria-label={t("mainNav")} className="hidden xl:block">
          <NavLinks links={links} />
        </nav>

        <div className="ml-auto flex items-center gap-2 xl:gap-3">
          <div className="hidden md:block">
            <Suspense>
              <LanguageSwitcher />
            </Suspense>
          </div>
          {user ? (
            <>
              <Link href="/account/notifications" className="icon-btn relative !rounded-full" aria-label={unread ? t("notificationsCount", { count: unread }) : t("notifications")} title={t("notifications")}>
                <Bell className="size-5" aria-hidden />
                {unread > 0 && (
                  <span aria-hidden className="absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-[11px] leading-none font-bold text-white tabular-nums">
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </Link>
              <SavedLink initialCount={saved} />
              <Link href={accountHref} className="btn btn-outline btn-sm hidden !min-h-[3.25rem] !px-6 md:inline-flex">
                <UserRound className="size-5" aria-hidden />
                <span className="max-w-32 truncate">{user.name.split(" ")[0]}</span>
              </Link>
            </>
          ) : (
            <Link href="/login" className="btn btn-outline hidden !px-7 md:inline-flex">
              <UserRound className="size-5" aria-hidden />
              {t("login")}
            </Link>
          )}
          <Link href="/post" className="btn btn-primary hidden !px-7 sm:inline-flex">
            <FilePlus2 className="size-5" aria-hidden />
            {t("post")}
          </Link>
          <MobileNav links={links} user={user ? { name: user.name, accountHref, isAdmin: user.role === "ADMIN" } : null} logout={logoutAction.bind(null, locale)} />
        </div>
      </div>
      <SavedToaster />
    </header>
  );
}
