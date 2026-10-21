"use client";

import { createContext, useActionState, useContext, useId, useRef, useTransition, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import type { ActionState } from "@/server/errors";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

const FormStateContext = createContext<{ state: ActionState; pending: boolean }>({ state: { status: "idle" }, pending: false });

export function useFormState() {
  return useContext(FormStateContext);
}

/**
 * Wraps a server action with useActionState. Submits via onSubmit inside a
 * transition so React 19 does not reset the form on validation errors.
 */
export function ActionForm({
  action,
  children,
  className,
  successMessage,
  onSuccess,
  confirm,
  resetOnSuccess = false,
  id,
}: {
  action: Action;
  children: ReactNode;
  className?: string;
  successMessage?: string;
  onSuccess?: (state: ActionState) => void;
  confirm?: string;
  resetOnSuccess?: boolean;
  id?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, dispatch, actionPending] = useActionState(async (prev: ActionState, fd: FormData) => {
    const next = await action(prev, fd);
    if (next.status === "ok") {
      onSuccess?.(next);
      if (resetOnSuccess) formRef.current?.reset();
    }
    return next;
  }, { status: "idle" } as ActionState);
  const [transitionPending, startTransition] = useTransition();
  const pending = actionPending || transitionPending;

  return (
    <FormStateContext.Provider value={{ state, pending }}>
      <form
        id={id}
        ref={formRef}
        className={className}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (confirm && !window.confirm(confirm)) return;
          const fd = new FormData(e.currentTarget);
          const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
          if (submitter?.name) fd.set(submitter.name, submitter.value);
          startTransition(async () => {
            dispatch(fd);
          });
        }}
      >
        {children}
        {successMessage && state.status === "ok" && <FormSuccess message={state.message ?? successMessage} />}
      </form>
    </FormStateContext.Provider>
  );
}

export function FormSuccess({ message }: { message: string }) {
  return (
    <p role="status" className="mt-4 flex items-start gap-2 rounded-xl bg-ok-soft px-4 py-3 text-sm font-medium text-ok">
      <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
      {message}
    </p>
  );
}

/** Top-of-form error summary (service error code). */
export function FormError({ className = "" }: { className?: string }) {
  const { state } = useFormState();
  const t = useTranslations("errors");
  if (state.status !== "error") return null;
  const key = (t.has(state.code as never) ? state.code : "generic") as Parameters<typeof t>[0];
  return (
    <p role="alert" className={`flex items-start gap-2 rounded-xl bg-danger-soft px-4 py-3 text-sm font-medium text-danger ${className}`}>
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
      {t(key)}
    </p>
  );
}

export function useFieldError(name: string): string | undefined {
  const { state } = useFormState();
  const t = useTranslations("validation");
  if (state.status !== "error" || !state.fieldErrors?.[name]) return undefined;
  const key = state.fieldErrors[name]!;
  return t.has(key as never) ? t(key as Parameters<typeof t>[0]) : t("required");
}

export function Field({
  name,
  label,
  hint,
  required,
  children,
  className = "",
}: {
  name: string;
  label: ReactNode;
  hint?: ReactNode;
  required?: boolean;
  className?: string;
  children: (props: { id: string; name: string; "aria-invalid": boolean; "aria-describedby"?: string; required?: boolean }) => ReactNode;
}) {
  const id = useId();
  const error = useFieldError(name);
  const t = useTranslations("common");
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-err` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
        {required && (
          <span className="ml-0.5 text-danger" aria-hidden>
            *
          </span>
        )}
        {required && <span className="sr-only"> ({t("requiredMark")})</span>}
      </label>
      {children({ id, name, "aria-invalid": Boolean(error), "aria-describedby": describedBy, required })}
      {hint && !error && (
        <p id={`${id}-hint`} className="hint mt-1.5">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} className="mt-1.5 text-[0.8125rem] font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function SubmitButton({ children, className = "btn btn-primary", name, value }: { children: ReactNode; className?: string; name?: string; value?: string }) {
  const { pending } = useFormState();
  const t = useTranslations("common");
  return (
    <button type="submit" className={className} disabled={pending} aria-busy={pending} name={name} value={value}>
      {pending ? t("saving") : children}
    </button>
  );
}

export function CheckboxField({ name, label, defaultChecked, hint }: { name: string; label: ReactNode; defaultChecked?: boolean; hint?: ReactNode }) {
  const id = useId();
  const error = useFieldError(name);
  return (
    <div>
      <label htmlFor={id} className="flex min-h-11 cursor-pointer items-start gap-3 py-1.5">
        <input id={id} type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-0.5 size-5 shrink-0 accent-brand" aria-invalid={Boolean(error)} />
        <span className="text-[0.9375rem] leading-snug">
          {label}
          {hint && <span className="hint mt-0.5 block">{hint}</span>}
        </span>
      </label>
      {error && <p className="text-[0.8125rem] font-medium text-danger">{error}</p>}
    </div>
  );
}
