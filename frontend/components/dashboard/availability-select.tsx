"use client";

import { useActionState, useId, useTransition } from "react";
import { useTranslations } from "next-intl";
import { AVAILABILITY } from "@/lib/domain";
import type { ActionState } from "@/server/errors";
import { setAvailabilityAction } from "@/app/[locale]/account/actions";

/** Owner-reported availability; saved on change, without sending the listing back to moderation. */
export function AvailabilitySelect({ id, value }: { id: string; value: string }) {
  const t = useTranslations("dashboard");
  const e = useTranslations("enums");
  const errs = useTranslations("errors");
  const fieldId = useId();
  const [state, dispatch, pending] = useActionState(setAvailabilityAction, { status: "idle" } as ActionState);
  const [, start] = useTransition();

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <label htmlFor={fieldId} className="text-xs text-ink-2">
        {t("availabilityLabel")}
      </label>
      <select
        id={fieldId}
        defaultValue={value}
        disabled={pending}
        aria-busy={pending}
        onChange={(ev) => {
          const fd = new FormData();
          fd.set("id", id);
          fd.set("availability", ev.target.value);
          start(() => dispatch(fd));
        }}
        className="h-9 rounded-lg border border-line bg-paper px-2 text-sm focus-visible:border-brand focus-visible:outline-2 focus-visible:outline-brand"
      >
        {AVAILABILITY.map((k) => (
          <option key={k} value={k}>
            {e(`availability.${k}`)}
          </option>
        ))}
      </select>
      <span aria-live="polite" className="text-xs">
        {state.status === "ok" && !pending && <span className="text-ok">{t("availabilitySaved")}</span>}
        {state.status === "error" && <span className="text-danger">{errs.has(state.code as never) ? errs(state.code as "generic") : errs("generic")}</span>}
      </span>
    </span>
  );
}
