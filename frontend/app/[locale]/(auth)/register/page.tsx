import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { getCurrentUser, safeNext } from "@/server/auth/current";
import { RegisterForm } from "@/components/forms/auth-forms";

type Props = { params: Promise<{ locale: AppLocale }>; searchParams: Promise<{ next?: string; type?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return { title: t("registerTitle"), robots: { index: false } };
}

export default async function RegisterPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { next, type } = await searchParams;
  if (await getCurrentUser()) redirect(`/${locale}/account`);
  const t = await getTranslations({ locale, namespace: "auth" });
  const safe = next ? safeNext(next, "") : "";
  const defaultType = type === "agent" ? "AGENT" : type === "owner" ? "OWNER" : "USER";
  return (
    <>
      <h1 className="t-h2">{t("registerTitle")}</h1>
      <p className="mt-2 mb-8 text-ink-2">{t("registerLead")}</p>
      <RegisterForm next={safe || undefined} defaultType={defaultType} />
      <p className="mt-8 border-t border-line pt-6 text-ink-2">
        {t("haveAccount")}{" "}
        <Link href="/login" className="font-semibold text-brand hover:underline">
          {t("loginTitle")}
        </Link>
      </p>
    </>
  );
}
