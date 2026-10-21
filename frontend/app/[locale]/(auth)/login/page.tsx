import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { getCurrentUser, safeNext } from "@/server/auth/current";
import { LoginForm } from "@/components/forms/auth-forms";
import { FormSuccess } from "@/components/forms/action-form";

type Props = { params: Promise<{ locale: AppLocale }>; searchParams: Promise<{ next?: string; reset?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return { title: t("loginTitle"), robots: { index: false } };
}

export default async function LoginPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { next, reset } = await searchParams;
  const safe = next ? safeNext(next, "") : "";
  const user = await getCurrentUser();
  if (user) redirect(safe || `/${locale}/account`);
  const t = await getTranslations({ locale, namespace: "auth" });
  return (
    <>
      <h1 className="t-h2">{t("loginTitle")}</h1>
      <p className="mt-2 mb-8 text-ink-2">{t("loginLead")}</p>
      {reset && <div className="mb-6"><FormSuccess message={t("resetDone")} /></div>}
      <LoginForm next={safe || undefined} />
      <p className="mt-8 border-t border-line pt-6 text-ink-2">
        {t("noAccount")}{" "}
        <Link href={safe ? `/register?next=${encodeURIComponent(safe)}` : "/register"} className="font-semibold text-brand hover:underline">
          {t("registerTitle")}
        </Link>
      </p>
    </>
  );
}
