import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";
import { requireUser } from "@/server/auth/current";
import { getLocationOptions } from "@/server/locations";
import { db } from "@/server/db";
import { RoommateForm } from "@/components/roommates/roommate-form";
import { isoDay } from "@/lib/format";

type Props = { params: Promise<{ locale: AppLocale; id: string }> };

export default async function EditRoommatePage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const user = await requireUser(locale);
  const ad = await db.roommateAd.findUnique({ where: { id }, include: { preferredDistricts: true } });
  if (!ad || (ad.ownerId !== user.id && user.role !== "ADMIN")) notFound();
  const [t, e, options] = await Promise.all([
    getTranslations({ locale, namespace: "roommateForm" }),
    getTranslations({ locale, namespace: "enums" }),
    getLocationOptions(locale, "id"),
  ]);
  return (
    <div>
      <h1 className="t-h2">{t("titleEdit")}</h1>
      <p className="mt-2 mb-8 text-ink-2">
        {e(`roommateStatus.${ad.status}`)}
        {ad.rejectionReason && ` — ${ad.rejectionReason}`}
      </p>
      {ad.status === "CLOSED" || ad.status === "ARCHIVED" ? null : (
        <RoommateForm
          options={options}
          values={{
            ...ad,
            preferredDistrictIds: ad.preferredDistricts.map((p) => p.districtId),
            moveInDate: isoDay(ad.moveInDate),
          }}
        />
      )}
    </div>
  );
}
