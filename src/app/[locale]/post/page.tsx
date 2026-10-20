import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Building2, UsersRound } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { alternatesFor } from "@/lib/seo";

type Props = { params: Promise<{ locale: AppLocale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "post" });
  return { title: t("heading"), alternates: alternatesFor(locale, "/post") };
}

export default async function PostPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "post" });
  return (
    <div className="shell max-w-5xl pt-10">
      <h1 className="t-h2">{t("heading")}</h1>
      <p className="mt-2 text-ink-2">{t("lead")}</p>
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <section className="flex flex-col rounded-3xl border border-line p-7">
          <Building2 className="size-8 text-brand" aria-hidden />
          <h2 className="t-h3 mt-4">{t("rentalTitle")}</h2>
          <p className="mt-2 flex-1 text-ink-2">{t("rentalBody")}</p>
          <Link href="/dashboard/listings/new" className="btn btn-primary mt-6 self-start">
            {t("rentalButton")}
          </Link>
        </section>
        <section className="flex flex-col rounded-3xl border border-line bg-mist p-7">
          <UsersRound className="size-8 text-brand" aria-hidden />
          <h2 className="t-h3 mt-4">{t("roommateTitle")}</h2>
          <p className="mt-2 flex-1 text-ink-2">{t("roommateBody")}</p>
          <Link href="/roommates/new" className="btn btn-dark mt-6 self-start">
            {t("roommateButton")}
          </Link>
        </section>
      </div>
      <p className="mt-6 text-sm text-ink-3">{t("rules")}</p>
    </div>
  );
}
