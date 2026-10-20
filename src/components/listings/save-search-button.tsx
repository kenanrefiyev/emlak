"use client";

import { useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { BookmarkPlus } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { ActionForm, Field, FormError, SubmitButton } from "@/components/forms/action-form";
import { saveSearchAction } from "@/app/[locale]/account/actions";

export function SaveSearchButton({ kind, query, loggedIn }: { kind: "LISTINGS" | "ROOMMATES"; query: string; loggedIn: boolean }) {
  const t = useTranslations("search");
  const c = useTranslations("common");
  const locale = useLocale();
  const dialog = useRef<HTMLDialogElement>(null);
  const [done, setDone] = useState(false);
  const id = useId();
  const pathname = usePathname();

  if (!loggedIn) {
    return (
      <Link href={`/login?next=${encodeURIComponent(`/${locale}${pathname}${query ? `?${query}` : ""}`)}`} className="btn btn-ghost btn-sm" title={t("loginToSave")}>
        <BookmarkPlus className="size-4" aria-hidden />
        <span className="hidden md:inline">{t("saveSearch")}</span>
      </Link>
    );
  }

  return (
    <>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setDone(false); dialog.current?.showModal(); }} aria-haspopup="dialog">
        <BookmarkPlus className="size-4" aria-hidden />
        <span className="hidden md:inline">{t("saveSearch")}</span>
      </button>
      <dialog ref={dialog} aria-labelledby={`${id}-h`} className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-2xl bg-paper p-6 backdrop:bg-ink/40">
        <h2 id={`${id}-h`} className="t-h3 mb-4">
          {t("saveSearch")}
        </h2>
        {done ? (
          <>
            <p role="status" className="text-ok font-medium">
              {t("saveSearchDone")}
            </p>
            <div className="mt-5 flex justify-end">
              <button type="button" className="btn btn-outline btn-sm" onClick={() => dialog.current?.close()}>
                {c("close")}
              </button>
            </div>
          </>
        ) : (
          <ActionForm action={saveSearchAction} onSuccess={() => setDone(true)} className="space-y-4">
            <input type="hidden" name="kind" value={kind} />
            <input type="hidden" name="query" value={query} />
            <FormError />
            <Field name="name" label={t("saveSearchName")} required>
              {(p) => <input {...p} className="field" maxLength={60} autoFocus />}
            </Field>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn btn-outline btn-sm" onClick={() => dialog.current?.close()}>
                {c("cancel")}
              </button>
              <SubmitButton className="btn btn-primary btn-sm">{c("save")}</SubmitButton>
            </div>
          </ActionForm>
        )}
      </dialog>
    </>
  );
}
