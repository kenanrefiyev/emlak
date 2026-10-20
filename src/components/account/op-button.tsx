"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";
import type { ActionState } from "@/server/errors";

type Action = (prev: ActionState, fd: FormData) => Promise<ActionState>;

/**
 * Modal confirmation built on <dialog>: focus is trapped by the browser,
 * Escape cancels, and the confirm button takes focus last so Enter never
 * confirms a destructive action by accident.
 */
export function ConfirmDialog({
  open,
  message,
  confirmLabel,
  danger,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const c = useTranslations("common");
  const ref = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      cancelRef.current?.focus();
    }
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      onClick={(e) => e.target === ref.current && onCancel()}
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-2xl bg-paper p-0 text-ink shadow-xl backdrop:bg-ink/40"
    >
      <div className="p-6">
        <div className="flex items-start gap-3">
          {danger && (
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-danger-soft text-danger" aria-hidden>
              <AlertTriangle className="size-5" />
            </span>
          )}
          <p className="pt-1.5 text-[0.9375rem] leading-relaxed">{message}</p>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button ref={cancelRef} type="button" className="btn btn-outline btn-sm" onClick={onCancel}>
            {c("cancel")}
          </button>
          <button type="button" className={`btn btn-sm ${danger ? "btn-danger" : "btn-primary"}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}

/** One-button form for a status change (submit, renew, archive, delete…), with optional confirm. */
export function OpButton({
  action,
  id,
  op,
  label,
  confirm,
  variant = "outline",
  extra,
  prompt,
  onDone,
}: {
  action: Action;
  id: string;
  op: string;
  label: string;
  confirm?: string;
  variant?: "outline" | "primary" | "danger" | "dark";
  extra?: Record<string, string>;
  /** Asks for a free-text reason (sent as "reason"); cancelling aborts. */
  prompt?: string;
  onDone?: (state: ActionState) => void;
}) {
  const e = useTranslations("errors");
  const a = useTranslations("account");
  const [state, dispatch, pending] = useActionState(async (prev: ActionState, fd: FormData) => {
    const next = await action(prev, fd);
    onDone?.(next);
    return next;
  }, { status: "idle" } as ActionState);
  const [, start] = useTransition();
  const [asking, setAsking] = useState(false);
  const cls = variant === "primary" ? "btn-primary" : variant === "danger" ? "btn-danger" : variant === "dark" ? "btn-dark" : "btn-outline";

  const send = () => {
    let reason: string | null = null;
    if (prompt) {
      reason = window.prompt(prompt);
      if (reason === null) return;
    }
    const fd = new FormData();
    if (reason !== null) fd.set("reason", reason);
    fd.set("id", id);
    fd.set("op", op);
    for (const [k, v] of Object.entries(extra ?? {})) fd.set(k, v);
    start(() => dispatch(fd));
  };

  return (
    <form
      onSubmit={(ev) => {
        ev.preventDefault();
        if (confirm) setAsking(true);
        else send();
      }}
      className="contents"
    >
      <button type="submit" className={`btn btn-sm ${cls}`} disabled={pending} aria-busy={pending}>
        {label}
      </button>
      {confirm && (
        <ConfirmDialog
          open={asking}
          message={confirm}
          confirmLabel={label}
          danger={variant === "danger"}
          onCancel={() => setAsking(false)}
          onConfirm={() => {
            setAsking(false);
            send();
          }}
        />
      )}
      {state.status === "error" && (
        <span role="alert" className="basis-full text-sm font-medium text-danger">
          {e.has(state.code as never) ? e(state.code as "generic") : e("generic")}
        </span>
      )}
      {state.status === "ok" && state.data?.requeued === true && (
        <span role="status" className="basis-full text-sm font-medium text-ok">
          {a("relisted")}
        </span>
      )}
    </form>
  );
}
