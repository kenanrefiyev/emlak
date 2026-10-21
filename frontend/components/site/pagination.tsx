import { getTranslations } from "next-intl/server";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

/** Server-rendered pagination; every page is a real, crawlable link. */
export async function Pagination({ locale, page, pageCount, path, query }: { locale: AppLocale; page: number; pageCount: number; path: string; query: string }) {
  if (pageCount <= 1) return null;
  const t = await getTranslations({ locale, namespace: "common" });
  const href = (p: number) => {
    const q = new URLSearchParams(query);
    if (p > 1) q.set("page", String(p));
    else q.delete("page");
    const s = q.toString();
    return s ? `${path}?${s}` : path;
  };
  const pages = new Set([1, pageCount, page - 1, page, page + 1].filter((p) => p >= 1 && p <= pageCount));
  const list = [...pages].sort((a, b) => a - b);

  return (
    <nav aria-label={t("pagination")} className="mt-10 flex flex-wrap items-center justify-center gap-1.5">
      {page > 1 ? (
        <Link href={href(page - 1)} className="btn btn-outline btn-sm" rel="prev">
          <ChevronLeft className="size-4" aria-hidden />
          {t("previous")}
        </Link>
      ) : (
        <span className="btn btn-outline btn-sm" aria-disabled="true">
          <ChevronLeft className="size-4" aria-hidden />
          {t("previous")}
        </span>
      )}
      {list.map((p, i) => (
        <span key={p} className="contents">
          {i > 0 && list[i - 1]! < p - 1 && <span className="px-1 text-ink-3">…</span>}
          <Link
            href={href(p)}
            aria-current={p === page ? "page" : undefined}
            aria-label={t("page", { page: p, count: pageCount })}
            className="grid size-11 place-items-center rounded-full text-sm font-semibold hover:bg-mist aria-[current=page]:bg-ink aria-[current=page]:text-white"
          >
            {p}
          </Link>
        </span>
      ))}
      {page < pageCount ? (
        <Link href={href(page + 1)} className="btn btn-outline btn-sm" rel="next">
          {t("next")}
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      ) : (
        <span className="btn btn-outline btn-sm" aria-disabled="true">
          {t("next")}
          <ChevronRight className="size-4" aria-hidden />
        </span>
      )}
    </nav>
  );
}
