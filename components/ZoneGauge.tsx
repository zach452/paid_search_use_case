"use client";

interface Props {
  value: number;
  breakeven: number;
  bandLower: number;
  bandUpper: number;
  min?: number;
  max?: number;
  height?: number;
}

/** A horizontal zone gauge: critical (below breakeven) -> moderate (breakeven..bandLower)
 * -> normal (bandLower..bandUpper) -> opportunity (above bandUpper), with a marker for
 * the current value. Pure SVG, no dependency. */
export default function ZoneGauge({ value, breakeven, bandLower, bandUpper, min, max, height = 14 }: Props) {
  const lo = min ?? Math.min(breakeven * 0.85, value * 0.95);
  const hi = max ?? Math.max(bandUpper * 1.25, value * 1.05);
  const pct = (v: number) => Math.max(0, Math.min(100, ((v - lo) / (hi - lo)) * 100));

  const segments = [
    { from: lo, to: breakeven, color: "var(--status-critical)" },
    { from: breakeven, to: bandLower, color: "var(--status-warning)" },
    { from: bandLower, to: bandUpper, color: "var(--status-good)" },
    { from: bandUpper, to: hi, color: "var(--series-1)" },
  ];

  return (
    <div className="w-full">
      <div className="relative w-full overflow-visible rounded-full" style={{ height }}>
        <div className="flex h-full w-full overflow-hidden rounded-full">
          {segments.map((s, i) => (
            <div
              key={i}
              style={{ width: `${pct(s.to) - pct(s.from)}%`, background: s.color, opacity: 0.75 }}
            />
          ))}
        </div>
        <div
          className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[3px] border-2 border-[var(--surface-1)] shadow-sm transition-all duration-500 ease-out"
          style={{ left: `${pct(value)}%`, background: "var(--text-primary)" }}
          title={`${(value * 100).toFixed(0)}%`}
        />
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-[var(--text-muted)]">
        <span>{Math.round(breakeven * 100)}% breakeven</span>
        <span>
          {Math.round(bandLower * 100)}–{Math.round(bandUpper * 100)}% normal
        </span>
        <span>{Math.round(hi * 100)}%+</span>
      </div>
    </div>
  );
}
