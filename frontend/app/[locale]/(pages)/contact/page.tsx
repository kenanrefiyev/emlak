import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";
import { alternatesFor } from "@/lib/seo";
import { getSettings } from "@/server/settings";
import { getCurrentUser } from "@/server/auth/current";
import { SupportForm } from "@/components/forms/support-form";

type Props = { params: Promise<{ locale: AppLocale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages" });
  return { title: t("contactTitle"), alternates: alternatesFor(locale, "/contact") };
}

export default async function ContactPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, settings, user] = await Promise.all([getTranslations({ locale, namespace: "pages" }), getSettings(), getCurrentUser()]);
  return (
    <div className="shell max-w-3xl pt-10">
      <h1 className="t-h2">{t("contactTitle")}</h1>
      <p className="mt-2 text-ink-2">{t("contactLead")}</p>
      {settings.contactEmail && <p className="mt-4 font-medium">{t("contactEmail", { email: settings.contactEmail })}</p>}
      <div className="mt-8">
        <SupportForm defaults={{ name: user?.name ?? "", email: user?.email ?? "" }} />
      </div>
    </div>
  );
}
