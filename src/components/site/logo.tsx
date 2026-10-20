/** Logo lockup in the Homelengo arrangement: mark, wordmark, letter-spaced tagline. */
export function Logo({ tagline, inverse = false, className = "" }: { tagline?: string; inverse?: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true" className="shrink-0">
        <path d="M20 2.5c-9 0-16 7-16 15.6 0 10.6 12.3 18.9 15 20.5.6.4 1.4.4 2 0 2.7-1.6 15-9.9 15-20.5C36 9.5 29 2.5 20 2.5Z" fill="#1563DF" />
        <path d="M14 25.5v-6.8a6 6 0 0 1 12 0v6.8" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M11.5 25.5h17" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
      </svg>
      <span className="flex flex-col leading-none">
        <span className={`text-[1.375rem] font-bold tracking-tight ${inverse ? "text-white" : "text-ink"}`} translate="no">
          Yuva
        </span>
        {tagline && <span className={`mt-1 text-[0.6875rem] tracking-[0.18em] ${inverse ? "text-ink-3" : "text-ink-2"}`}>{tagline}</span>}
      </span>
    </span>
  );
}
