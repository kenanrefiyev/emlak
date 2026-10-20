/** Small round "M" marker coloured by Baku metro line. */
export function MetroDot({ line, className = "" }: { line: "RED" | "GREEN" | "PURPLE"; className?: string }) {
  const color = line === "RED" ? "bg-line-red" : line === "GREEN" ? "bg-line-green" : "bg-line-purple";
  return (
    <span className={`inline-grid size-4 shrink-0 place-items-center rounded-full ${color} ${className}`} aria-hidden>
      <span className="text-[0.55rem] leading-none font-bold text-white">M</span>
    </span>
  );
}

/** Light pill used for listing type / status labels outside photos. */
export function TypeTag({ children, tone = "brand", className = "" }: { children: React.ReactNode; tone?: "brand" | "ink" | "ok"; className?: string }) {
  const cls = tone === "ink" ? "bg-ink text-white" : tone === "ok" ? "bg-ok-soft text-ok" : "bg-brand-soft text-brand";
  return <span className={`tag ${cls} ${className}`}>{children}</span>;
}
