"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export interface PickerOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  lang?: string;
}

/**
 * Compact header dropdown: a pill showing the current choice, opening a short
 * list where each option can carry an icon (a flag) — which a native <select>
 * cannot show. Closes on outside click, Escape and after choosing.
 */
export function Picker({
  label,
  value,
  options,
  trigger,
  onChange,
  footer,
  disabled = false,
  align = "end",
}: {
  /** Accessible name, e.g. "Country". */
  label: string;
  value: string;
  options: PickerOption[];
  /** Pill content; defaults to the current option's icon and label. */
  trigger?: React.ReactNode;
  onChange: (value: string) => void;
  /** Small print under the options (e.g. exchange-rate details). */
  footer?: React.ReactNode;
  disabled?: boolean;
  align?: "start" | "end";
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        root.current?.querySelector<HTMLButtonElement>("button")?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-label={`${label}: ${current?.label ?? value}`}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex min-h-[3.25rem] items-center gap-1.5 rounded-full border border-line px-3.5 text-[0.9375rem] font-semibold text-ink hover:border-ink focus-visible:border-brand disabled:opacity-60 aria-expanded:border-ink"
      >
        {trigger ?? (
          <>
            {current?.icon}
            <span>{current?.label}</span>
          </>
        )}
        <ChevronDown className="size-3.5 text-ink-2" aria-hidden />
      </button>
      {open && (
        <div
          id={`${id}-list`}
          className={`absolute top-full z-50 mt-2 min-w-48 rounded-2xl border border-line bg-paper p-1.5 shadow-header ${align === "end" ? "right-0" : "left-0"}`}
        >
          <ul aria-label={label}>
            {options.map((o) => {
              const selected = o.value === value;
              return (
                <li key={o.value}>
                  <button
                    type="button"
                    lang={o.lang}
                    aria-current={selected ? "true" : undefined}
                    onClick={() => {
                      setOpen(false);
                      if (!selected) onChange(o.value);
                    }}
                    className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-[0.9375rem] text-ink hover:bg-mist aria-[current=true]:font-semibold aria-[current=true]:text-brand"
                  >
                    {o.icon}
                    <span className="flex-1 whitespace-nowrap">{o.label}</span>
                    {selected && <Check className="size-4" aria-hidden />}
                  </button>
                </li>
              );
            })}
          </ul>
          {footer && <div className="mt-1 border-t border-line px-3 pt-2.5 pb-1.5 text-xs leading-relaxed text-ink-2">{footer}</div>}
        </div>
      )}
    </div>
  );
}
