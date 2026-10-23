import { getTranslations } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";
import { formatAzn } from "@/lib/format";
import { rentalCosts, type CostInput, type CostItem, type Total } from "@/lib/costs";

/**
 * "What will I actually pay?" — rent plus running costs, per person and
 * upfront. Unknown amounts are shown as unknown and make the total a lower
 * bound ("at least"), never silently 0.
 */
export async function CostBreakdown({ listing, otherNote, locale }: { listing: CostInput; otherNote: string | null; locale: AppLocale }) {
  const t = await getTranslations({ locale, namespace: "costs" });
  const b = rentalCosts(listing);
  const item = (c: CostItem) =>
    c.kind === "amount" ? formatAzn(c.value, locale) : c.kind === "included" ? t("included") : c.kind === "none" ? t("none") : <span className="text-warn">{t("unknown")}</span>;
  const total = (x: Total) => (x.complete ? formatAzn(x.value, locale) : t("atLeast", { value: formatAzn(x.value, locale) }));

  const monthlyRows = [
    { label: b.rentPerPlace ? t("rentPerPlace") : t("rent"), value: formatAzn(b.rent, locale) },
    { label: t("utilities"), value: item(b.utilities) },
    { label: t("internet"), value: item(b.internet) },
    { label: otherNote ? t("otherWithNote", { note: otherNote }) : t("other"), value: item(b.other) },
  ];
  const upfrontRows = [
    { label: t("firstMonth"), value: formatAzn(b.rent, locale) },
    { label: t("deposit"), value: item(b.deposit) },
    { label: t("commission"), value: item(b.commission) },
  ];

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div className="rounded-2xl border border-line p-5">
        <h3 className="font-semibold">{t("monthlyTitle")}</h3>
        <dl className="mt-3 space-y-2 text-[0.9375rem]">
          {monthlyRows.map((r) => (
            <div key={r.label} className="flex justify-between gap-4">
              <dt className="text-ink-2">{r.label}</dt>
              <dd className="text-right font-medium tabular-nums">{r.value}</dd>
            </div>
          ))}
          <div className="flex justify-between gap-4 border-t border-line pt-2">
            <dt className="font-semibold">{b.basis === "place" ? t("monthlyTotalPlace") : t("monthlyTotal")}</dt>
            <dd className="text-right font-bold tabular-nums">{total(b.monthly)}</dd>
          </div>
          {b.perPerson && (
            <div className="flex justify-between gap-4">
              <dt className="text-ink-2">{t("perPerson", { count: b.perPerson.sharers })}</dt>
              <dd className="text-right font-semibold tabular-nums">{total(b.perPerson)}</dd>
            </div>
          )}
        </dl>
        {b.basis === "place" && listing.costSharers == null && <p className="hint mt-3">{t("sharersUnknown")}</p>}
      </div>
      <div className="rounded-2xl border border-line p-5">
        <h3 className="font-semibold">{t("upfrontTitle")}</h3>
        <dl className="mt-3 space-y-2 text-[0.9375rem]">
          {upfrontRows.map((r) => (
            <div key={r.label} className="flex justify-between gap-4">
              <dt className="text-ink-2">{r.label}</dt>
              <dd className="text-right font-medium tabular-nums">{r.value}</dd>
            </div>
          ))}
          <div className="flex justify-between gap-4 border-t border-line pt-2">
            <dt className="font-semibold">{t("upfrontTotal")}</dt>
            <dd className="text-right font-bold tabular-nums">{total(b.upfront)}</dd>
          </div>
        </dl>
      </div>
      <p className="hint sm:col-span-2">{t("note")}</p>
    </div>
  );
}
