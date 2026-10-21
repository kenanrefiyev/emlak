import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";
import { ResetForm } from "@/components/forms/auth-forms";

type Props = { params: Promise<{ locale: AppLocale; token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return { title: t("resetTitle"), robots: { index: false }, referrer: "no-referrer" };
}

export default async function ResetPage({ params }: Props) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "auth" });
  return (
    <>
      <h1 className="t-h2 mb-8">{t("resetTitle")}</h1>
      <ResetForm token={token} />
    </>
  );
}
