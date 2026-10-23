import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";
import { requireUser } from "@/server/auth/current";
import { getLocationOptions } from "@/server/locations";
import { RoommateForm } from "@/components/roommates/roommate-form";
import { isoDay } from "@/lib/format";
import { daysFromNow } from "@/lib/time";

type Props = { params: Promise<{ locale: AppLocale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "roommateForm" });
  return { title: t("titleNew"), robots: { index: false } };
}

export default async function NewRoommatePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireUser(locale, `/${locale}/roommates/new`);
  const [t, options] = await Promise.all([getTranslations({ locale, namespace: "roommateForm" }), getLocationOptions(locale, "id")]);
  return (
    <div className="shell max-w-3xl pt-8">
      <span className="hidden" aria-hidden />
      <h1 className="t-h2">{t("titleNew")}</h1>
      <p className="mt-2 mb-8 text-ink-2">{t("lead")}</p>
      <RoommateForm
        options={options}
        values={{
          type: "HAS_PLACE",
          title: "",
          description: "",
          originalLocale: locale,
          preferredDistrictIds: [],
          moveInDate: isoDay(daysFromNow(7)),
          durationMonths: 9,
          genderPreference: "ANY",
          smoking: null,
          cleaning: null,
          sleepSchedule: null,
          guests: null,
          noise: null,
          showProfile: true,
          petsOk: false,
          contactPreference: "IN_APP",
        }}
      />
    </div>
  );
}
