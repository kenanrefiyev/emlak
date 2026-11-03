/**
 * Small inline flags (Windows does not render flag emoji). Simplified for 16–24px
 * use: shapes and colours follow the official flags. Unknown codes fall back to
 * the code in a neutral chip, so a new market works before it has artwork.
 */
const FLAGS: Record<string, { viewBox: string; body: React.ReactNode }> = {
  az: {
    viewBox: "0 0 1200 600",
    body: (
      <>
        <rect width="1200" height="200" fill="#00B5E2" />
        <rect y="200" width="1200" height="200" fill="#EF3340" />
        <rect y="400" width="1200" height="200" fill="#509E2F" />
        <circle cx="570" cy="300" r="90" fill="#fff" />
        <circle cx="592" cy="300" r="75" fill="#EF3340" />
        <polygon
          points="717.0,300.0 687.3,308.4 702.4,335.4 675.4,320.3 667.0,350.0 658.6,320.3 631.6,335.4 646.7,308.4 617.0,300.0 646.7,291.6 631.6,264.6 658.6,279.7 667.0,250.0 675.4,279.7 702.4,264.6 687.3,291.6"
          fill="#fff"
        />
      </>
    ),
  },
  tr: {
    viewBox: "0 0 1200 800",
    body: (
      <>
        <rect width="1200" height="800" fill="#E30A17" />
        <circle cx="425" cy="400" r="200" fill="#fff" />
        <circle cx="475" cy="400" r="160" fill="#E30A17" />
        <polygon points="483.3,400.0 552.4,377.5 552.4,304.9 595.1,363.7 664.2,341.2 621.5,400.0 664.2,458.8 595.1,436.3 552.4,495.1 552.4,422.5" fill="#fff" />
      </>
    ),
  },
  gb: {
    viewBox: "0 0 60 30",
    body: (
      <>
        <rect width="60" height="30" fill="#012169" />
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="2" />
        <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
        <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
      </>
    ),
  },
  ru: {
    viewBox: "0 0 9 6",
    body: (
      <>
        <rect width="9" height="2" fill="#fff" />
        <rect y="2" width="9" height="2" fill="#0039A6" />
        <rect y="4" width="9" height="2" fill="#D52B1E" />
      </>
    ),
  },
};

export function Flag({ code, className = "" }: { code: string; className?: string }) {
  const flag = FLAGS[code];
  const box = `inline-block h-[0.875rem] w-5 shrink-0 overflow-hidden rounded-[3px] ring-1 ring-ink/10 ${className}`;
  if (!flag) {
    return (
      <span aria-hidden="true" className={`${box} bg-gray text-center text-[0.5625rem] leading-[0.875rem] font-bold uppercase text-ink-2`}>
        {code}
      </span>
    );
  }
  return (
    <svg viewBox={flag.viewBox} preserveAspectRatio="xMidYMid slice" aria-hidden="true" className={box}>
      {flag.body}
    </svg>
  );
}
