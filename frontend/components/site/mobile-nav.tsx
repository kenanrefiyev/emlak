"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { FilePlus2, Heart, LogOut, UserRound, X } from "lucide-react";
import NextLink from "next/link";
import { Link, usePathname } from "@/i18n/navigation";
import { NavLinks } from "./nav-links";
import { LanguageSwitcher } from "./language-switcher";
import { CountrySwitcher, type CountryChoice } from "./country-switcher";
import { CurrencySwitcher, type CurrencyInfo } from "./currency-switcher";
import { Logo } from "./logo";

interface Props {
  links: { href: string; label: string }[];
  countries: CountryChoice[];
  country: string;
  currency: CurrencyInfo;
  user: { name: string; accountHref: string; isAdmin: boolean } | null;
  logout: () => Promise<void>;
}

/** Off-canvas menu (Homelengo mobile pattern) shown below the xl breakpoint. */
export function MobileNav({ links, countries, country, currency, user, logout }: Props) {
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();
  const [lastPath, setLastPath] = useState(pathname);

  if (pathname !== lastPath) {
    setLastPath(pathname);
    if (open) setOpen(false);
  }

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <>
      <button type="button" className="grid size-11 place-items-center xl:hidden" aria-label={t("menu")} aria-expanded={open} onClick={() => setOpen(true)}>
        <span aria-hidden className="flex w-7 flex-col gap-[7px]">
          <span className="h-0.5 w-full rounded bg-ink" />
          <span className="h-0.5 w-full rounded bg-ink" />
          <span className="h-0.5 w-full rounded bg-ink" />
        </span>
      </button>
      <dialog
        ref={dialogRef}
        onClose={() => setOpen(false)}
        onClick={(e) => e.target === dialogRef.current && setOpen(false)}
        className="m-0 h-dvh max-h-dvh w-[min(22rem,100vw)] max-w-none bg-paper p-0 backdrop:bg-ink/50"
        aria-label={t("menu")}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-[70px] items-center justify-between border-b border-line px-5">
            <Logo />
            <button type="button" className="icon-btn !rounded-full" aria-label={t("closeMenu")} onClick={() => setOpen(false)}>
              <X className="size-5" aria-hidden />
            </button>
          </div>
          <nav aria-label={t("mainNav")} className="flex-1 overflow-y-auto px-5 py-3">
            <NavLinks links={[{ href: "/", label: t("home") }, ...links]} vertical onNavigate={() => setOpen(false)} />
            <div className="mt-6 space-y-2">
              {user ? (
                <>
                  <Link href={user.accountHref} className="btn btn-outline w-full">
                    <UserRound className="size-5" aria-hidden /> {t("account")}
                  </Link>
                  <Link href="/account/saved" className="btn btn-ghost w-full">
                    <Heart className="size-5" aria-hidden /> {t("saved")}
                  </Link>
                  {user.isAdmin && (
                    <NextLink href="/admin" className="btn btn-ghost w-full">
                      {t("adminPanel")}
                    </NextLink>
                  )}
                  <form action={logout}>
                    <button type="submit" className="btn btn-ghost w-full text-ink-2">
                      <LogOut className="size-5" aria-hidden /> {t("logout")}
                    </button>
                  </form>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link href="/login" className="btn btn-outline !px-4">
                    {t("login")}
                  </Link>
                  <Link href="/register" className="btn btn-outline !px-4">
                    {t("register")}
                  </Link>
                </div>
              )}
            </div>
            {countries.length > 1 && (
              <div className="mt-6">
                <p className="mb-2 text-sm font-semibold text-ink-2">{t("country")}</p>
                <Suspense>
                  <CountrySwitcher countries={countries} current={country} variant="list" />
                </Suspense>
              </div>
            )}
            {currency.currencies.length > 1 && (
              <div className="mt-6">
                <p className="mb-2 text-sm font-semibold text-ink-2">{t("currency")}</p>
                <CurrencySwitcher info={currency} variant="list" />
              </div>
            )}
            <div className="mt-6">
              <p className="mb-2 text-sm font-semibold text-ink-2">{t("language")}</p>
              <Suspense>
                <LanguageSwitcher variant="list" />
              </Suspense>
            </div>
          </nav>
          <div className="border-t border-line p-5">
            <Link href="/post" className="btn btn-primary w-full">
              <FilePlus2 className="size-5" aria-hidden /> {t("post")}
            </Link>
          </div>
        </div>
      </dialog>
    </>
  );
}
