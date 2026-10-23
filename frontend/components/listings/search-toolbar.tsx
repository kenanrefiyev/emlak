"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { ChevronDown, LayoutGrid, List, Map as MapIcon } from "lucide-react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";

/** Grid/list squares and the sort select from the Homelengo listing header. Both only rewrite the URL. */
export function SearchToolbar({ sorts, sort, view, showView = true }: { sorts: { value: string; label: string }[]; sort: string; view?: "grid" | "list" | "map"; showView?: boolean }) {
  const t = useTranslations("search");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function withParam(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    return Object.fromEntries(next.entries());
  }

  return (
    <div className="flex items-center gap-2.5">
      {showView && (
        <div role="group" aria-label={t("view")} className="hidden gap-2.5 sm:flex">
          <Link href={{ pathname, query: withParam("view", null) }} aria-label={t("viewGrid")} aria-current={view === "grid" ? "true" : undefined} className="icon-btn aria-[current=true]:border-brand aria-[current=true]:text-brand">
            <LayoutGrid className="size-5" aria-hidden />
          </Link>
          <Link href={{ pathname, query: withParam("view", "list") }} aria-label={t("viewList")} aria-current={view === "list" ? "true" : undefined} className="icon-btn aria-[current=true]:border-brand aria-[current=true]:text-brand">
            <List className="size-5" aria-hidden />
          </Link>
        </div>
      )}
      {showView && (
        <Link
          href={{ pathname, query: withParam("view", view === "map" ? null : "map") }}
          aria-current={view === "map" ? "true" : undefined}
          className="icon-btn aria-[current=true]:border-brand aria-[current=true]:text-brand sm:!w-auto sm:px-3"
        >
          <MapIcon className="size-5" aria-hidden />
          <span className="sr-only sm:not-sr-only sm:ml-1.5 sm:text-sm sm:font-semibold">{t("viewMap")}</span>
        </Link>
      )}
      <label className="relative flex h-12 min-w-44 items-center rounded-lg border border-line px-4 text-[0.9375rem] focus-within:border-brand">
        <span className="sr-only">{t("sort")}</span>
        <select
          className="h-full w-full cursor-pointer appearance-none bg-transparent pr-7 focus:outline-none"
          value={sort}
          onChange={(e) => router.push({ pathname, query: withParam("sort", e.target.value === "newest" ? null : e.target.value) })}
        >
          {sorts.map((s) => (
            <option key={s.value} value={s.value}>
              {t("sort")}: {s.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-4 size-4" aria-hidden />
      </label>
    </div>
  );
}
