"use client";

import { useId, useMemo, useState } from "react";

export interface BarPoint {
  /** ISO day, yyyy-mm-dd */
  day: string;
  value: number;
}

/**
 * Single-series daily bar chart: one hue (brand), thin bars with rounded data
 * ends on a zero baseline, three recessive gridlines, sparse date labels, a
 * per-day hover/focus tooltip and a data table for screen readers.
 */
export function BarChart({
  title,
  points,
  locale,
  valueLabel,
  tableLabel,
  height = 180,
}: {
  title: string;
  points: BarPoint[];
  locale: string;
  valueLabel: string;
  tableLabel: string;
  height?: number;
}) {
  const id = useId();
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...points.map((p) => p.value));
  // A "nice" top so gridlines land on round numbers.
  const top = useMemo(() => {
    const step = Math.pow(10, Math.floor(Math.log10(max)));
    const nice = [1, 2, 2.5, 5, 10].map((m) => m * step).find((v) => v >= max) ?? max;
    return Math.max(nice, 3);
  }, [max]);
  const W = 640;
  const H = height;
  const padL = 32;
  const padB = 22;
  const plotW = W - padL;
  const plotH = H - padB - 8;
  const slot = plotW / Math.max(points.length, 1);
  const barW = Math.max(2, Math.min(18, slot - 2));
  // Numeric dd.mm: identical on server and in every browser (some lack short month names for az).
  const fmtDay = (d: string, opts: { year?: boolean } = {}) => `${d.slice(8, 10)}.${d.slice(5, 7)}${opts.year ? `.${d.slice(0, 4)}` : ""}`;
  const labelIdx = points.length <= 8 ? points.map((_, i) => i) : [0, Math.floor((points.length - 1) / 2), points.length - 1];
  const grid = [0, top / 2, top];
  const total = points.reduce((n, p) => n + p.value, 0);
  const a = active !== null ? points[active] : null;

  return (
    <figure className="min-w-0">
      <figcaption className="flex items-baseline justify-between gap-3">
        <span className="font-semibold">{title}</span>
        <span className="text-sm text-ink-2 tabular-nums">{total.toLocaleString(locale)}</span>
      </figcaption>
      <div className="relative mt-3">
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-labelledby={`${id}-desc`} onMouseLeave={() => setActive(null)}>
          <desc id={`${id}-desc`}>{`${title}: ${total}`}</desc>
          {grid.map((g) => {
            const y = 8 + plotH - (g / top) * plotH;
            return (
              <g key={g}>
                <line x1={padL} x2={W} y1={y} y2={y} stroke="var(--color-line)" strokeWidth={1} />
                <text x={padL - 6} y={y + 4} textAnchor="end" fontSize="11" fill="var(--color-ink-3, #8a9099)">
                  {Math.round(g).toLocaleString(locale)}
                </text>
              </g>
            );
          })}
          {points.map((p, i) => {
            const h = p.value > 0 ? Math.max(3, (p.value / top) * plotH) : 0;
            const x = padL + i * slot + (slot - barW) / 2;
            const y = 8 + plotH - h;
            const r = Math.min(4, barW / 2, h);
            return (
              <g key={p.day}>
                {h > 0 && (
                  <path
                    d={`M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + barW - r} Q${x + barW},${y} ${x + barW},${y + r} V${y + h} Z`}
                    fill="var(--color-brand)"
                    opacity={active === null || active === i ? 1 : 0.45}
                  />
                )}
                {/* Hit target: the whole day column, larger than the mark. */}
                <rect
                  x={padL + i * slot}
                  y={0}
                  width={slot}
                  height={H - padB}
                  fill="transparent"
                  tabIndex={0}
                  aria-label={`${fmtDay(p.day)}: ${p.value} ${valueLabel}`}
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                  className="outline-none focus-visible:fill-brand-soft"
                />
              </g>
            );
          })}
          {labelIdx.map((i) => (
            <text key={i} x={padL + i * slot + slot / 2} y={H - 6} textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"} fontSize="11" fill="var(--color-ink-3, #8a9099)">
              {fmtDay(points[i]!.day)}
            </text>
          ))}
        </svg>
        {a && active !== null && (
          <div
            role="status"
            className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-lg bg-ink px-2.5 py-1.5 text-xs whitespace-nowrap text-white shadow-lg"
            style={{ left: `${((padL + active * slot + slot / 2) / W) * 100}%` }}
          >
            <span className="block text-white/70">{fmtDay(a.day, { year: true })}</span>
            <span className="font-semibold tabular-nums">
              {a.value.toLocaleString(locale)} {valueLabel}
            </span>
          </div>
        )}
      </div>
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer text-ink-2 hover:text-ink">{tableLabel}</summary>
        <div className="mt-2 max-h-56 overflow-y-auto">
          <table className="w-full text-left">
            <tbody>
              {points.map((p) => (
                <tr key={p.day} className="border-b border-line">
                  <td className="py-1 pr-3">{fmtDay(p.day, { year: true })}</td>
                  <td className="py-1 text-right tabular-nums">{p.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
