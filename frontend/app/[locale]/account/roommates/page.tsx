import { getTranslations, setRequestLocale } from "next-intl/server";
import { Plus } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { requireUser } from "@/server/auth/current";
import { db } from "@/server/db";
import { matchesForAd } from "@/server/roommates/queries";
import { formatShortDate } from "@/lib/format";
import { EmptyState } from "@/components/site/section";
import { OpButton } from "@/components/account/op-button";
import { FormSuccess } from "@/components/forms/action-form";
import { RoommateCard } from "@/components/roommates/roommate-card";
import { roommateOpAction } from "@/app/[locale]/account/actions";

const tone: Record<string, string> = {
  DRAFT: "bg-gray text-ink-2",
  PENDING_REVIEW: "bg-pending text-white",
  PUBLISHED: "bg-ok text-white",
  REJECTED: "bg-danger text-white",
  CLOSED: "bg-brand text-white",
  ARCHIVED: "bg-gray text-ink-2",
  EXPIRED: "bg-danger-soft text-danger",
};

export default async function AccountRoommatesPage({ params, searchParams }: { params: Promise<{ locale: AppLocale }>; searchParams: Promise<{ created?: string; matches?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireUser(locale);
  const { created, matches } = await searchParams;
  const [t, e, f] = await Promise.all([
    getTranslations({ locale, namespace: "account" }),
    getTranslations({ locale, namespace: "enums" }),
    getTranslations({ locale, namespace: "roommateForm" }),
  ]);
  const now = new Date();
  const ads = await db.roommateAd.findMany({ where: { ownerId: user.id }, orderBy: { updatedAt: "desc" } });
  const focus = ads.find((a) => a.id === matches) ?? ads.find((a) => a.status === "PUBLISHED" && a.expiresAt && a.expiresAt > now);
  const matched = focus && focus.status === "PUBLISHED" ? await matchesForAd(focus.id, user.id, locale) : [];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="t-h2">{t("nav.roommates")}</h1>
        <Link href="/roommates/new" className="btn btn-dark btn-sm">
          <Plus className="size-4" aria-hidden />
          {t("newRoommate")}
        </Link>
      </div>
      {created && (
        <div className="mb-6">
          <FormSuccess message={f("created")} />
        </div>
      )}
      {ads.length === 0 ? (
        <EmptyState title={t("emptyRoommatesTitle")} body={t("emptyRoommatesBody")}>
          <Link href="/roommates/new" className="btn btn-dark">
            {t("newRoommate")}
          </Link>
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {ads.map((ad) => {
            const expired = ad.status === "PUBLISHED" && ad.expiresAt != null && ad.expiresAt <= now;
            const status = expired ? "EXPIRED" : ad.status;
            const live = ad.status === "PUBLISHED" && !expired;
            return (
              <li key={ad.id} className="card p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`tag ${tone[status]}`}>{e(`roommateStatus.${status}`)}</span>
                  <span className="text-sm text-ink-3">{e(`roommateTypeShort.${ad.type}`)}</span>
                </div>
                <h3 className="mt-1.5 font-semibold">
                  <Link href={`/roommates/${ad.id}`} className="hover:underline">
                    {ad.title}
                  </Link>
                </h3>
                <p className="text-sm text-ink-2">
                  {t("updated", { date: formatShortDate(ad.updatedAt, locale) })}
                  {ad.status === "PUBLISHED" && ad.expiresAt && ` · ${expired ? t("expired") : t("expires", { date: formatShortDate(ad.expiresAt, locale) })}`}
                </p>
                {ad.status === "REJECTED" && ad.rejectionReason && <p className="mt-1 text-sm text-danger">{ad.rejectionReason}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  {ad.status !== "CLOSED" && ad.status !== "ARCHIVED" && (
                    <Link href={`/account/roommates/${ad.id}/edit`} className="btn btn-outline btn-sm">
                      {t("actions.edit")}
                    </Link>
                  )}
                  {live && (
                    <Link href={`/account/roommates?matches=${ad.id}#matches`} className="btn btn-outline btn-sm">
                      {t("actions.matches")}
                    </Link>
                  )}
                  {live && <OpButton action={roommateOpAction} id={ad.id} op="close" label={t("actions.close")} variant="primary" confirm={t("confirmClose")} />}
                  {(ad.status === "PUBLISHED" || ad.status === "CLOSED" || ad.status === "ARCHIVED") && (
                    <OpButton action={roommateOpAction} id={ad.id} op="renew" label={live ? t("actions.renew") : t("actions.relist")} />
                  )}
                  {ad.status !== "ARCHIVED" && ad.status !== "CLOSED" && <OpButton action={roommateOpAction} id={ad.id} op="archive" label={t("actions.archive")} confirm={t("confirmArchive")} />}
                  <OpButton action={roommateOpAction} id={ad.id} op="delete" label={t("actions.delete")} variant="danger" confirm={t("confirmDelete")} />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {focus && focus.status === "PUBLISHED" && (
        <section id="matches" className="mt-12 scroll-mt-24" aria-labelledby="matches-h">
          <h2 id="matches-h" className="t-h3">
            {t("matchesTitle")}
          </h2>
          <p className="mt-1 text-sm text-ink-2">{focus.title}</p>
          {matched.length === 0 ? (
            <p className="mt-4 text-ink-2">{t("matchesEmpty")}</p>
          ) : (
            <ul className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {matched.map((m) => (
                <li key={m.id}>
                  <RoommateCard ad={m} locale={locale} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
