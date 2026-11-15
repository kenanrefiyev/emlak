import { getTranslations } from "next-intl/server";
import { Mail } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { getSettings } from "@/server/settings";
import { Logo } from "./logo";

/** Compact ink footer: brand + about, two link columns, one legal bar. */
export async function SiteFooter({ locale }: { locale: AppLocale }) {
  const [t, nav, settings] = await Promise.all([
    getTranslations({ locale, namespace: "footer" }),
    getTranslations({ locale, namespace: "nav" }),
    getSettings(),
  ]);
  const year = new Date().getFullYear();
  const cols = [
    {
      title: t("explore"),
      links: [
        { href: "/students", label: nav("students") },
        { href: "/roommates", label: nav("roommates") },
        { href: "/family", label: nav("family") },
        { href: "/areas", label: nav("areas") },
        { href: "/post", label: t("post") },
      ],
    },
    {
      title: t("help"),
      links: [
        { href: "/help", label: t("faq") },
        { href: "/safety", label: t("safety") },
        { href: "/contact", label: t("contact") },
        { href: "/register?type=agent", label: t("agents") },
      ],
    },
  ];
  return (
    <footer className="mt-auto bg-ink text-[#a3abb0]">
      <div className="shell grid grid-cols-2 gap-x-6 gap-y-8 py-10 md:grid-cols-[1.6fr_1fr_1fr] lg:py-12">
        <div className="col-span-2 max-w-sm md:col-span-1">
          <Link href="/" aria-label="Yuva" className="inline-block">
            <Logo inverse />
          </Link>
          <p className="mt-4 text-sm leading-relaxed">{t("about")}</p>
          {settings.contactEmail && (
            <a href={`mailto:${settings.contactEmail}`} className="mt-3 inline-flex items-center gap-2 text-sm text-white hover:text-brand-soft">
              <Mail className="size-4" aria-hidden />
              {settings.contactEmail}
            </a>
          )}
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <h2 className="text-sm font-semibold text-white">{c.title}</h2>
            <ul className="mt-2">
              {c.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="inline-flex min-h-8 items-center text-sm transition-colors hover:text-white">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="shell flex flex-col gap-2 border-t border-white/10 py-5 text-xs sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <p>
          {t("rights", { year })} · {t("demoNote")}
        </p>
        <ul className="flex shrink-0 gap-5">
          <li>
            <Link href="/terms" className="hover:text-white">
              {t("terms")}
            </Link>
          </li>
          <li>
            <Link href="/privacy" className="hover:text-white">
              {t("privacy")}
            </Link>
          </li>
        </ul>
      </div>
    </footer>
  );
}
