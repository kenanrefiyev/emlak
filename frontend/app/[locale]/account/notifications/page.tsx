import { getTranslations, setRequestLocale } from "next-intl/server";
import { Bell, CheckCircle2, Inbox, Search, XCircle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { requireUser } from "@/server/auth/current";
import { markNotificationsRead, notificationsFor } from "@/server/notifications";
import { formatDate } from "@/lib/format";
import { EmptyState } from "@/components/site/section";

type Data = { name?: string; search?: string; titles?: Record<string, string> };

/** Picks the reader's language, then the original (keys marked with *), then anything. */
function titleFor(titles: Record<string, string> | undefined, locale: AppLocale) {
  if (!titles) return "";
  const entries = Object.entries(titles);
  return titles[locale] ?? titles[`${locale}*`] ?? entries.find(([k]) => k.endsWith("*"))?.[1] ?? entries[0]?.[1] ?? "";
}

export default async function NotificationsPage({ params }: { params: Promise<{ locale: AppLocale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireUser(locale);
  const t = await getTranslations({ locale, namespace: "notifications" });
  const items = await notificationsFor(user.id);
  // Shown as unread this once, then marked read (same pattern as /account/requests).
  await markNotificationsRead(user.id);

  const icon = { INQUIRY_RECEIVED: Inbox, INQUIRY_ACCEPTED: CheckCircle2, INQUIRY_DECLINED: XCircle, SEARCH_MATCH: Search } as const;

  return (
    <div>
      <h1 className="t-h2">{t("title")}</h1>
      <p className="mt-1 mb-6 text-sm text-ink-2">{t("lead")}</p>
      {items.length === 0 ? (
        <EmptyState icon={<Bell className="size-8" aria-hidden />} title={t("emptyTitle")} body={t("emptyBody")}>
          <Link href="/account/searches" className="btn btn-outline">
            {t("manageSearches")}
          </Link>
        </EmptyState>
      ) : (
        <ul className="divide-y divide-line">
          {items.map((n) => {
            const d = (n.data ?? {}) as Data;
            const Icon = icon[n.type];
            const title = titleFor(d.titles, locale);
            const text =
              n.type === "SEARCH_MATCH"
                ? t("searchMatch", { search: d.search ?? "", title })
                : n.type === "INQUIRY_RECEIVED"
                  ? t("inquiryReceived", { name: d.name ?? "", title })
                  : n.type === "INQUIRY_ACCEPTED"
                    ? t("inquiryAccepted", { name: d.name ?? "", title })
                    : t("inquiryDeclined", { name: d.name ?? "", title });
            return (
              <li key={n.id}>
                <Link href={n.href} className="flex items-start gap-3 rounded-lg px-2 py-3.5 hover:bg-mist">
                  <Icon className={`mt-0.5 size-5 shrink-0 ${n.type === "INQUIRY_DECLINED" ? "text-ink-3" : "text-brand"}`} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className={`block text-[0.9375rem] ${n.readAt ? "" : "font-semibold"}`}>{text}</span>
                    <span className="text-xs text-ink-3">{formatDate(n.createdAt, locale)}</span>
                  </span>
                  {!n.readAt && (
                    <span className="tag shrink-0 bg-brand-soft text-brand">{t("new")}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-6 hint">{t("channelNote")}</p>
    </div>
  );
}
