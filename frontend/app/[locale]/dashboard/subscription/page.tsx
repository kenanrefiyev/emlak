import { getTranslations, setRequestLocale } from "next-intl/server";
import { Info, Star } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { requireUser } from "@/server/auth/current";
import { db } from "@/server/db";
import { activeSubscription, featuredSlotsUsed } from "@/server/agents";
import { listingQuota } from "@/server/listings/service";
import { getSettings } from "@/server/settings";
import { dashboardKind } from "@/server/dashboard";
import { pickTranslation } from "@/server/listings/queries";
import { nameOf } from "@/lib/i18n-data";
import { formatDate, formatShortDate } from "@/lib/format";
import { OpButton } from "@/components/account/op-button";
import { cancelSubscriptionRequestAction, requestSubscriptionAction } from "@/app/[locale]/agent/actions";

/**
 * Plans, limits and promotions. Payments are not processed online: a realtor
 * requests a package, the team confirms payment offline and an admin
 * activates it. Nothing here pretends otherwise.
 */
export default async function SubscriptionPage({ params }: { params: Promise<{ locale: AppLocale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireUser(locale);
  const kind = dashboardKind(user.role);
  const now = new Date();
  const [t, a, e, quota, used, settings, expiring, featured, packages, sub, requested, slotsUsed, history] = await Promise.all([
    getTranslations({ locale, namespace: "dashboard" }),
    getTranslations({ locale, namespace: "agent" }),
    getTranslations({ locale, namespace: "enums" }),
    listingQuota(user),
    db.listing.count({ where: { ownerId: user.id, status: { in: ["PENDING_REVIEW", "PUBLISHED"] } } }),
    getSettings(),
    db.listing.findMany({
      where: { ownerId: user.id, status: "PUBLISHED", expiresAt: { gt: now } },
      orderBy: { expiresAt: "asc" },
      take: 6,
      select: { id: true, expiresAt: true, translations: { where: { OR: [{ locale }, { isOriginal: true }] }, select: { locale: true, title: true, isOriginal: true } } },
    }),
    db.featuredListing.findMany({
      where: { endsAt: { gt: now }, listing: { ownerId: user.id } },
      orderBy: { endsAt: "asc" },
      select: { id: true, endsAt: true, source: true, listing: { select: { id: true, translations: { where: { OR: [{ locale }, { isOriginal: true }] }, select: { locale: true, title: true, isOriginal: true } } } } },
    }),
    kind === "realtor" ? db.subscriptionPackage.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }) : Promise.resolve([]),
    kind === "realtor" ? activeSubscription(user.id) : Promise.resolve(null),
    kind === "realtor" ? db.subscription.findFirst({ where: { userId: user.id, status: "REQUESTED" }, include: { package: true } }) : Promise.resolve(null),
    kind === "realtor" ? featuredSlotsUsed(user.id) : Promise.resolve(0),
    kind === "realtor" ? db.subscription.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 12, include: { package: true } }) : Promise.resolve([]),
  ]);
  const limit = Number.isFinite(quota) ? quota : null;
  const share = limit ? Math.min(1, used / limit) : 0;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="t-h2">{kind === "realtor" ? t("nav.subscription") : t("nav.limits")}</h1>
        <p className="mt-1 max-w-3xl text-sm text-ink-2">{kind === "realtor" ? a("subscriptionLead") : t("plans.landlordLead")}</p>
      </div>

      <section aria-labelledby="limit-h" className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-line p-5">
          <h2 id="limit-h" className="text-sm text-ink-2">
            {t("plans.currentPlan")}
          </h2>
          <p className="t-h3 mt-1">{sub ? nameOf(sub.package, locale) : kind === "realtor" ? t("plans.free") : t("plans.standard")}</p>
          {sub?.endsAt && <p className="mt-1 text-sm text-ink-2">{t("plans.validUntil", { date: formatDate(sub.endsAt, locale) })}</p>}
        </div>
        <div className="rounded-2xl border border-line p-5">
          <p className="text-sm text-ink-2">{t("plans.activeLimit")}</p>
          <p className="t-h3 mt-1 tabular-nums">
            {used} / {limit ?? "∞"}
          </p>
          {limit && (
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-mist" role="meter" aria-valuemin={0} aria-valuemax={limit} aria-valuenow={used} aria-label={t("plans.activeLimit")}>
              <div className={`h-full rounded-full ${share >= 1 ? "bg-danger" : "bg-brand"}`} style={{ width: `${share * 100}%` }} />
            </div>
          )}
          <p className="mt-2 text-xs text-ink-3">{t("plans.limitHint", { days: settings.listingTtlDays })}</p>
        </div>
      </section>

      {requested && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-warn-soft px-4 py-3 text-sm text-warn">
          <span>
            {nameOf(requested.package, locale)} — {e("subscription.REQUESTED")}
          </span>
          <OpButton action={cancelSubscriptionRequestAction} id={requested.id} op="cancel" label={a("cancelRequest")} confirm={t("plans.confirmCancel")} />
        </div>
      )}

      {kind === "realtor" && packages.length > 0 && (
        <section aria-labelledby="pk-h">
          <h2 id="pk-h" className="t-h3">
            {t("plans.packages")}
          </h2>
          <ul className="mt-4 grid gap-4 md:grid-cols-3">
            {packages.map((p) => (
              <li key={p.id} className={`flex flex-col rounded-2xl border p-5 ${sub?.packageId === p.id ? "border-ink" : "border-line"}`}>
                <h3 className="font-semibold">{nameOf(p, locale)}</h3>
                <p className="t-price mt-2 text-2xl">{a("packagePrice", { price: p.priceAzn, days: p.durationDays })}</p>
                <ul className="mt-3 space-y-1 text-sm text-ink-2">
                  <li>{a("packageListings", { count: p.listingLimit })}</li>
                  <li>{a("packageFeatured", { count: p.featuredSlots })}</li>
                </ul>
                <div className="mt-auto pt-5">
                  {sub?.packageId === p.id ? (
                    <span className="tag bg-ink text-white">{t("plans.current")}</span>
                  ) : (
                    !requested && <OpButton action={requestSubscriptionAction} id={p.id} op="request" label={a("choose")} variant="primary" confirm={t("plans.confirmRequest")} />
                  )}
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-3 flex items-start gap-2 text-sm text-ink-3">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
            {t("plans.offlineNote")}
          </p>
        </section>
      )}

      <section aria-labelledby="promo-h">
        <h2 id="promo-h" className="t-h3">
          {t("plans.promotions")}
        </h2>
        <p className="mt-1 text-sm text-ink-2">
          {kind === "realtor"
            ? sub
              ? a("featuredLead", { days: settings.featuredDays, used: slotsUsed, slots: sub.package.featuredSlots })
              : t("plans.promoNeedPlan")
            : t("plans.promoLandlord")}
        </p>
        {featured.length > 0 ? (
          <ul className="mt-4 divide-y divide-line rounded-xl border border-line">
            {featured.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                <Star className="size-4 text-warn" aria-hidden />
                <span className="min-w-0 flex-1 truncate font-medium">{pickTranslation(f.listing.translations, locale)?.title}</span>
                <span className="text-ink-2">{t("plans.featuredUntil", { date: formatShortDate(f.endsAt, locale) })}</span>
              </li>
            ))}
          </ul>
        ) : (
          kind === "realtor" &&
          sub && (
            <p className="mt-3 text-sm text-ink-2">
              {t("plans.noFeatured")}{" "}
              <Link href="/dashboard/listings?status=ACTIVE" className="font-semibold text-brand hover:underline">
                {t("plans.pickListing")}
              </Link>
            </p>
          )
        )}
      </section>

      <section aria-labelledby="exp-h">
        <h2 id="exp-h" className="t-h3">
          {t("plans.expirations")}
        </h2>
        {expiring.length === 0 ? (
          <p className="mt-3 text-sm text-ink-2">{t("plans.noActive")}</p>
        ) : (
          <ul className="mt-3 divide-y divide-line rounded-xl border border-line">
            {expiring.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                <span className="min-w-0 flex-1 truncate font-medium">{pickTranslation(l.translations, locale)?.title}</span>
                <span className="text-ink-2">{t("expiresOn", { date: formatShortDate(l.expiresAt!, locale) })}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {kind === "realtor" && (
        <section aria-labelledby="hist-h">
          <h2 id="hist-h" className="t-h3">
            {t("plans.history")}
          </h2>
          <p className="mt-1 text-sm text-ink-2">{t("plans.historyNote")}</p>
          {history.length === 0 ? (
            <p className="mt-3 text-sm text-ink-3">{t("plans.noHistory")}</p>
          ) : (
            <div className="mt-3 overflow-x-auto rounded-xl border border-line">
              <table className="w-full min-w-[32rem] text-left text-sm">
                <thead className="bg-gray text-ink-2">
                  <tr>
                    <th className="px-3 py-2.5 font-medium">{t("plans.package")}</th>
                    <th className="px-3 py-2.5 font-medium">{t("plans.status")}</th>
                    <th className="px-3 py-2.5 font-medium">{t("plans.period")}</th>
                    <th className="px-3 py-2.5 text-right font-medium">{t("plans.price")}</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.id} className="border-t border-line">
                      <td className="px-3 py-2.5 font-medium">{nameOf(h.package, locale)}</td>
                      <td className="px-3 py-2.5">{e(`subscription.${h.status}`)}</td>
                      <td className="px-3 py-2.5 text-ink-2">{h.startsAt ? `${formatShortDate(h.startsAt, locale)} – ${h.endsAt ? formatShortDate(h.endsAt, locale) : "…"}` : formatShortDate(h.createdAt, locale)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{h.package.priceAzn} ₼</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
