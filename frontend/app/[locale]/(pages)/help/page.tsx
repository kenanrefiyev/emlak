import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { alternatesFor } from "@/lib/seo";

type Props = { params: Promise<{ locale: AppLocale }> };
const QUESTIONS = ["1", "2", "3", "4", "5", "6", "7"] as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages" });
  return { title: t("helpTitle"), description: t("helpLead"), alternates: alternatesFor(locale, "/help") };
}

export default async function HelpPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, faq, footer] = await Promise.all([
    getTranslations({ locale, namespace: "pages" }),
    getTranslations({ locale, namespace: "faq" }),
    getTranslations({ locale, namespace: "footer" }),
  ]);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: QUESTIONS.map((q) => ({ "@type": "Question", name: faq(`q${q}`), acceptedAnswer: { "@type": "Answer", text: faq(`a${q}`) } })),
  };
  return (
    <div className="shell max-w-3xl pt-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <h1 className="t-h2">{t("helpTitle")}</h1>
      <p className="mt-2 text-ink-2">{t("helpLead")}</p>
      <div className="mt-8 divide-y divide-line border-y border-line">
        {QUESTIONS.map((q) => (
          <details key={q} className="group py-1" open={q === "1"}>
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 font-semibold [&::-webkit-details-marker]:hidden">
              {faq(`q${q}`)}
              <span aria-hidden className="text-xl text-ink-3 transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="pb-4 text-ink-2">{faq(`a${q}`)}</p>
          </details>
        ))}
      </div>

      <section id="matching" className="mt-12 scroll-mt-24 rounded-2xl bg-mist p-6" aria-labelledby="matching-h">
        <h2 id="matching-h" className="t-h3">
          {t("matchingTitle")}
        </h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-ink-2">
          {(t.raw("matchingRules") as string[]).map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </section>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/safety" className="btn btn-outline">
          {footer("safety")}
        </Link>
        <Link href="/contact" className="btn btn-outline">
          {footer("contact")}
        </Link>
      </div>
    </div>
  );
}
