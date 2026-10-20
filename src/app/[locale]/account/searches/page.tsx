import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { requireUser } from "@/server/auth/current";
import { db } from "@/server/db";
import { formatShortDate } from "@/lib/format";
import { EmptyState } from "@/components/site/section";
import { OpButton } from "@/components/account/op-button";
import { deleteSearchAction } from "@/app/[locale]/account/actions";

export default async function SearchesPage({ params }: { params: Promise<{ locale: AppLocale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireUser(locale);
  const [t, c, nav] = await Promise.all([
    getTranslations({ locale, namespace: "account" }),
    getTranslations({ locale, namespace: "common" }),
    getTranslations({ locale, namespace: "nav" }),
  ]);
  const searches = await db.savedSearch.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
  return (
    <div>
      <h1 className="t-h2 mb-6">{t("nav.searches")}</h1>
      {searches.length === 0 ? (
        <EmptyState title={t("emptySearchesTitle")} body={t("emptySearchesBody")}>
          <Link href="/students" className="btn btn-primary">
            {nav("students")}
          </Link>
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {searches.map((s) => {
            const path = s.kind === "ROOMMATES" ? "/roommates" : "/students";
            return (
              <li key={s.id} className="card flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{s.name}</p>
                  <p className="truncate text-sm text-ink-3">
                    {s.kind === "ROOMMATES" ? nav("roommates") : nav("students")} · {formatShortDate(s.createdAt, locale)}
                  </p>
                </div>
                <Link href={s.query ? `${path}?${s.query}` : path} className="btn btn-primary btn-sm">
                  {t("searchesRun")}
                </Link>
                <OpButton action={deleteSearchAction} id={s.id} op="delete" label={c("delete")} variant="danger" />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
