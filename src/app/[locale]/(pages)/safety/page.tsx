import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";
import { alternatesFor } from "@/lib/seo";
import { DocPage } from "@/components/site/doc-page";

type Props = { params: Promise<{ locale: AppLocale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages" });
  return { title: t("safetyTitle"), alternates: alternatesFor(locale, "/safety") };
}

export default async function Page({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "pages" });
  return <DocPage locale={locale} doc="safety" title={t("safetyTitle")} legal={false} />;
}
