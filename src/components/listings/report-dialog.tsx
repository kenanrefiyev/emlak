"use client";

import { useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Flag } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { ActionForm, Field, FormError, SubmitButton } from "@/components/forms/action-form";
import { reportAction } from "@/app/[locale]/listings/actions";
import { REPORT_REASONS } from "@/lib/domain";

export function ReportDialog({ target, loggedIn, variant = "link" }: { target: { listingId?: string; roommateAdId?: string }; loggedIn: boolean; variant?: "link" | "icon" }) {
  const t = useTranslations("report");
  const l = useTranslations("listing");
  const e = useTranslations("enums");
  const c = useTranslations("common");
  const dialog = useRef<HTMLDialogElement>(null);
  const [done, setDone] = useState(false);
  const pathname = usePathname();
  const id = useId();

  if (!loggedIn) {
    return (
      <Link
        href={`/login?next=${encodeURIComponent(pathname)}`}
        className={variant === "icon" ? "icon-btn" : "inline-flex min-h-11 items-center gap-2 text-sm text-ink-2 hover:text-danger"}
        title={t("loginToReport")}
        aria-label={variant === "icon" ? l("report") : undefined}
      >
        <Flag className={variant === "icon" ? "size-5" : "size-4"} aria-hidden />
        {variant === "link" && l("report")}
      </Link>
    );
  }
  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        className={variant === "icon" ? "icon-btn" : "inline-flex min-h-11 items-center gap-2 text-sm text-ink-2 hover:text-danger"}
        aria-haspopup="dialog"
        aria-label={variant === "icon" ? l("report") : undefined}
        title={l("report")}
      >
        <Flag className={variant === "icon" ? "size-5" : "size-4"} aria-hidden />
        {variant === "link" && l("report")}
      </button>
      <dialog ref={dialog} aria-labelledby={`${id}-h`} className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-2xl bg-paper p-6 backdrop:bg-ink/40">
        <h2 id={`${id}-h`} className="t-h3 mb-4">
          {t("title")}
        </h2>
        {done ? (
          <>
            <p role="status" className="font-medium text-ok">
              {t("sent")}
            </p>
            <div className="mt-5 flex justify-end">
              <button type="button" className="btn btn-outline btn-sm" onClick={() => dialog.current?.close()}>
                {c("close")}
              </button>
            </div>
          </>
        ) : (
          <ActionForm action={reportAction} onSuccess={() => setDone(true)} className="space-y-4">
            {target.listingId && <input type="hidden" name="listingId" value={target.listingId} />}
            {target.roommateAdId && <input type="hidden" name="roommateAdId" value={target.roommateAdId} />}
            <FormError />
            <Field name="reason" label={t("reason")} required>
              {(p) => (
                <select {...p} className="field" defaultValue="">
                  <option value="" disabled>
                    —
                  </option>
                  {REPORT_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {e(`reportReason.${r}`)}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field name="details" label={t("details")}>
              {(p) => <textarea {...p} rows={4} maxLength={1000} className="field" />}
            </Field>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn btn-outline btn-sm" onClick={() => dialog.current?.close()}>
                {c("cancel")}
              </button>
              <SubmitButton className="btn btn-primary btn-sm">{t("submit")}</SubmitButton>
            </div>
          </ActionForm>
        )}
      </dialog>
    </>
  );
}
