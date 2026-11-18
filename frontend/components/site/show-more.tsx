"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";

/**
 * A list whose `more` items stay hidden until the visitor asks for them
 * (e.g. the home page's cities: popular first, every rayon behind the button).
 */
export function ShowMore({
  children,
  more,
  showLabel,
  hideLabel,
  className,
}: {
  children: React.ReactNode;
  more?: React.ReactNode;
  showLabel: string;
  hideLabel: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <>
      <ul className={className}>{children}</ul>
      {more && (
        <>
          <ul id={id} hidden={!open} className={`${className ?? ""} mt-4`}>
            {more}
          </ul>
          <div className="mt-10 text-center">
            <button
              type="button"
              className="btn btn-outline"
              aria-expanded={open}
              aria-controls={id}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? hideLabel : showLabel}
              <ChevronDown
                className={`size-4 transition-transform ${open ? "rotate-180" : ""}`}
                aria-hidden
              />
            </button>
          </div>
        </>
      )}
    </>
  );
}
