import { getTranslations, setRequestLocale } from "next-intl/server";
import { Inbox, Search } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { requireUser } from "@/server/auth/current";
import { db } from "@/server/db";
import { LEAD_STATUSES, dashboardKind, ownerInquiries, parseLeadFilter } from "@/server/dashboard";
import { EmptyState } from "@/components/site/section";
import { Pagination } from "@/components/site/pagination";
import { LeadItem } from "@/components/dashboard/lead-item";
import { formatDate } from "@/lib/format";

type Props = { params: Promise<{ locale: AppLocale }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

/** Baku wall-clock time (UTC+4, no DST) for a datetime-local input. */
const bakuLocal = (d: Date) => new Date(d.getTime() + 4 * 3_600_000).toISOString().slice(0, 16);

export default async function InquiriesPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireUser(locale);
  const kind = dashboardKind(user.role);
  const f = parseLeadFilter(await searchParams);
  const [t, data] = await Promise.all([getTranslations({ locale, namespace: "dashboard" }), ownerInquiries(user.id, locale, f)]);
  // What is shown is now read; the highlight stays for this render so new ones are still visible.
  const unreadIds = data.items.filter((i) => i.unread).map((i) => i.id);
  if (unreadIds.length) await db.contactRequest.updateMany({ where: { id: { in: unreadIds }, recipientId: user.id }, data: { readAt: new Date() } });

  const query = (over: Record<string, string | number | undefined>) => {
    const q = new URLSearchParams();
    const merged = { q: f.q, lead: f.lead, listing: f.listing, ...over };
    for (const [k, v] of Object.entries(merged)) if (v !== undefined && v !== "" && !(k === "lead" && v === "ALL") && !(k === "page" && String(v) === "1")) q.set(k, String(v));
    return q.toString();
  };
  const href = (over: Record<string, string | number | undefined>) => {
    const q = query({ page: undefined, ...over });
    return q ? `/dashboard/inquiries?${q}` : "/dashboard/inquiries";
  };
  const all = Object.values(data.leadCounts).reduce((a, b) => a + b, 0);
  const filtered = Boolean(f.q || f.listing || f.lead !== "ALL");

  return (
    <div>
      <h1 className="t-h2">{kind === "realtor" ? t("nav.leads") : t("nav.inquiries")}</h1>
      <p className="mt-1 text-sm text-ink-2">{kind === "realtor" ? t("inquiries.leadRealtor") : t("inquiries.leadLandlord")}</p>

      <nav aria-label={t("inquiries.stage")} className="-mx-1 mt-6 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {(["ALL", ...LEAD_STATUSES] as const).map((s) => (
          <Link
            key={s}
            href={href({ lead: s })}
            aria-current={f.lead === s ? "page" : undefined}
            className="chip shrink-0 whitespace-nowrap hover:bg-brand-soft aria-[current=page]:border-brand aria-[current=page]:bg-brand aria-[current=page]:text-white"
          >
            {s === "ALL" ? t("filters.all") : t(`leadStatus.${s}`)}
            <span className="tabular-nums opacity-70">{s === "ALL" ? all : data.leadCounts[s]}</span>
          </Link>
        ))}
      </nav>

      <form method="get" role="search" className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,16rem)_auto]">
        {f.lead !== "ALL" && <input type="hidden" name="lead" value={f.lead} />}
        <label className="relative block">
          <span className="sr-only">{t("filters.search")}</span>
          <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-ink-3" aria-hidden />
          <input name="q" defaultValue={f.q ?? ""} placeholder={t("inquiries.searchPlaceholder")} maxLength={80} className="field !pl-11" />
        </label>
        <label>
          <span className="sr-only">{t("inquiries.listing")}</span>
          <select name="listing" defaultValue={f.listing ?? ""} className="field">
            <option value="">{t("inquiries.anyListing")}</option>
            {data.listingOptions.map((l) => (
              <option key={l.id} value={l.id}>
                {l.title}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn btn-dark">
          {t("filters.apply")}
        </button>
      </form>

      <p className="mt-5 text-sm text-ink-2" role="status">
        {t("inquiries.count", { count: data.total })}
        {filtered && (
          <>
            {" · "}
            <Link href="/dashboard/inquiries" className="font-semibold text-brand hover:underline">
              {t("filters.clear")}
            </Link>
          </>
        )}
      </p>

      {data.items.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={<Inbox className="size-7" aria-hidden />}
            title={filtered ? t("emptyFilteredTitle") : t("inquiries.emptyTitle")}
            body={filtered ? t("emptyFilteredBody") : t("inquiries.emptyBody")}
          />
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {data.items.map((r) => (
            <LeadItem
              key={r.id}
              lead={{
                ...r,
                createdLabel: formatDate(r.createdAt, locale, { year: undefined, hour: "2-digit", minute: "2-digit" }),
                viewingLocal: r.viewingAt ? bakuLocal(r.viewingAt) : null,
                viewingLabel: r.viewingAt ? formatDate(r.viewingAt, locale, { weekday: "long", year: undefined, hour: "2-digit", minute: "2-digit" }) : null,
              }}
            />
          ))}
        </ul>
      )}
      <Pagination locale={locale} page={data.page} pageCount={data.pageCount} path="/dashboard/inquiries" query={query({})} />
      <p className="mt-8 text-sm text-ink-3">
        {t("inquiries.outgoingNote")}{" "}
        <Link href="/account/requests" className="font-semibold text-brand hover:underline">
          {t("inquiries.outgoingLink")}
        </Link>
      </p>
    </div>
  );
}
