import { getTranslations } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";

type Section = { h: string; p: string[] };

/** Long-form text pages (safety, privacy, terms) rendered from structured messages. */
export async function DocPage({ locale, doc, title, legal = false }: { locale: AppLocale; doc: "safety" | "privacy" | "terms"; title: string; legal?: boolean }) {
  const [t, pages] = await Promise.all([getTranslations({ locale, namespace: "legal" }), getTranslations({ locale, namespace: "pages" })]);
  const sections = t.raw(doc) as Section[];
  return (
    <div className="shell grid gap-10 pt-10 lg:grid-cols-[16rem_minmax(0,46rem)]">
      <aside className="hidden lg:block">
        <nav aria-label={title} className="sticky top-24">
          <ol className="space-y-1 border-l border-line">
            {sections.map((s, i) => (
              <li key={s.h}>
                <a href={`#s${i + 1}`} className="-ml-px block border-l-2 border-transparent py-1.5 pl-4 text-sm text-ink-2 hover:border-ink hover:text-ink">
                  {s.h}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      </aside>
      <article className="prose-yuva min-w-0">
        <h1 className="t-h2">{title}</h1>
        {legal && <p className="mt-3 rounded-xl bg-mist px-4 py-3 text-sm text-ink-2">{pages("legalNote")}</p>}
        {sections.map((s, i) => (
          <section key={s.h} id={`s${i + 1}`} className="scroll-mt-24">
            <h2>{s.h}</h2>
            {s.p.length > 1 ? (
              <ul>
                {s.p.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            ) : (
              <p className="text-ink-2">{s.p[0]}</p>
            )}
          </section>
        ))}
      </article>
    </div>
  );
}
