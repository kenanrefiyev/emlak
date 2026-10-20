import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CheckCircle2, XCircle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { verifyEmail } from "@/server/auth/service";

type Props = { params: Promise<{ locale: AppLocale; token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return { title: t("verifyTitle"), robots: { index: false }, referrer: "no-referrer" };
}

export default async function VerifyPage({ params }: Props) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "auth" });
  const nav = await getTranslations({ locale, namespace: "nav" });
  let ok = false;
  try {
    await verifyEmail(token);
    ok = true;
  } catch {
    ok = false;
  }
  return (
    <div className="flex flex-col items-start gap-4">
      <h1 className="t-h2">{t("verifyTitle")}</h1>
      <p className={`flex items-center gap-2 font-medium ${ok ? "text-ok" : "text-danger"}`} role="status">
        {ok ? <CheckCircle2 className="size-5" aria-hidden /> : <XCircle className="size-5" aria-hidden />}
        {ok ? t("verifyDone") : t("verifyFailed")}
      </p>
      <Link href="/account" className="btn btn-primary">
        {nav("account")}
      </Link>
    </div>
  );
}
