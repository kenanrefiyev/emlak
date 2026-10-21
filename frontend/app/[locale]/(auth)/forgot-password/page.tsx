import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";
import { ForgotForm } from "@/components/forms/auth-forms";

type Props = { params: Promise<{ locale: AppLocale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return { title: t("forgotTitle"), robots: { index: false } };
}

export default async function ForgotPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "auth" });
  return (
    <>
      <h1 className="t-h2">{t("forgotTitle")}</h1>
      <p className="mt-2 mb-8 text-ink-2">{t("forgotLead")}</p>
      <ForgotForm />
    </>
  );
}
