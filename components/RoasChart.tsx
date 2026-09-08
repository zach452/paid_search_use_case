"use client";

import { useMemo, useState } from "react";
import { DailyRow } from "@/lib/types";
import { ageOf, pctObserved } from "@/lib/engine";

interface Props {
  dailyData: DailyRow[];
  today: string;
  targetRoas: number;
  breakevenRoas: number;
  bandLower: number;
  bandUpper: number;
}

const WIDTH = 720;
const HEIGHT = 280;
const PAD = { top: 16, right: 16, bottom: 28, left: 42 };

function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return "";
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

export default function RoasChart({ dailyData, today, targetRoas, breakevenRoas, bandLower, bandUpper }: Props) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const rows = useMemo(() => {
    return [...dailyData]
      .filter((d) => ageOf(d.date, today) >= 0)
      .sort((a, b) => (a.date < b.date ? -1 : 1))
      .map((d) => {
        const age = ageOf(d.date, today);
        const rawRoas = d.spend > 0 ? d.revenue / d.spend : 0;
        const adjRoas = d.spend > 0 ? d.revenue / pctObserved(age) / d.spend : 0;
        return { ...d, rawRoas, adjRoas };
      });
  }, [dailyData, today]);

  if (rows.length < 2) {
    return (
      <div className="flex h-[260px] items-center justify-center rounded-lg border border-dashed border-[var(--border)] text-sm text-[var(--text-muted)]">
        Add at least 2 days of Daily Data to see the chart.
      </div>
    );
  }

  const allValues = rows.flatMap((r) => [r.rawRoas, r.adjRoas]).concat([bandUpper, breakevenRoas]);
  const yMax = Math.max(...allValues) * 1.1;
  const yMin = Math.max(0, Math.min(...allValues) * 0.85);

  const innerW = WIDTH - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;

  const x = (i: number) => PAD.left + (innerW * i) / (rows.length - 1);
  const y = (v: number) => PAD.top + innerH - (innerH * (v - yMin)) / (yMax - yMin);
  const clampedY = (v: number) => Math.max(PAD.top, Math.min(PAD.top + innerH, y(v)));

  const rawPoints = rows.map((r, i) => ({ x: x(i), y: y(r.rawRoas) }));
  const adjPoints = rows.map((r, i) => ({ x: x(i), y: y(r.adjRoas) }));

  const yTicks = 5;
  const tickValues = Array.from({ length: yTicks + 1 }, (_, i) => yMin + ((yMax - yMin) * i) / yTicks);

  const dateLabelEvery = Math.ceil(rows.length / 6);
  const hovered = hoverIdx !== null ? rows[hoverIdx] : null;

  return (
    <div className="viz-root relative">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label="Reported versus age-adjusted ROAS over time, with target and breakeven reference lines"
      >
        {/* zone shading: critical below breakeven, normal band, opportunity above */}
        <rect
          x={PAD.left}
          y={clampedY(breakevenRoas)}
          width={innerW}
          height={PAD.top + innerH - clampedY(breakevenRoas)}
          fill="var(--status-critical)"
          opacity={0.06}
        />
        <rect
          x={PAD.left}
          y={clampedY(bandUpper)}
          width={innerW}
          height={clampedY(bandLower) - clampedY(bandUpper)}
          fill="var(--status-good)"
          opacity={0.07}
        />

        {tickValues.map((v, i) => (
          <g key={i}>
            <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y(v)} y2={y(v)} stroke="var(--border)" strokeWidth={1} />
            <text x={PAD.left - 8} y={y(v) + 3} textAnchor="end" fontSize={10} fill="var(--text-muted)">
              {Math.round(v * 100)}%
            </text>
          </g>
        ))}

        <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y(breakevenRoas)} y2={y(breakevenRoas)} stroke="var(--status-critical)" strokeWidth={1.25} strokeDasharray="4 3" opacity={0.8} />
        <text x={WIDTH - PAD.right} y={y(breakevenRoas) - 4} textAnchor="end" fontSize={10} fill="var(--status-critical)">
          Breakeven {Math.round(breakevenRoas * 100)}%
        </text>

        <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y(targetRoas)} y2={y(targetRoas)} stroke="var(--text-secondary)" strokeWidth={1.25} strokeDasharray="4 3" opacity={0.8} />
        <text x={WIDTH - PAD.right} y={y(targetRoas) - 4} textAnchor="end" fontSize={10} fill="var(--text-secondary)">
          Target {Math.round(targetRoas * 100)}%
        </text>

        <path d={smoothPath(rawPoints)} fill="none" stroke="var(--series-2)" strokeWidth={2} strokeLinecap="round" opacity={0.85} />
        <path d={smoothPath(adjPoints)} fill="none" stroke="var(--series-1)" strokeWidth={2.75} strokeLinecap="round" />

        {rows.map((r, i) =>
          i % dateLabelEvery === 0 ? (
            <text key={r.date} x={x(i)} y={HEIGHT - 8} textAnchor="middle" fontSize={9} fill="var(--text-muted)">
              {r.date.slice(5)}
            </text>
          ) : null
        )}

        {rows.map((r, i) => (
          <rect
            key={r.date}
            x={x(i) - innerW / rows.length / 2}
            y={PAD.top}
            width={innerW / rows.length}
            height={innerH}
            fill="transparent"
            onMouseEnter={() => setHoverIdx(i)}
            onMouseLeave={() => setHoverIdx(null)}
          />
        ))}
        {hovered && (
          <>
            <line x1={x(hoverIdx!)} x2={x(hoverIdx!)} y1={PAD.top} y2={PAD.top + innerH} stroke="var(--text-muted)" strokeWidth={1} />
            <circle cx={x(hoverIdx!)} cy={y(hovered.adjRoas)} r={3.5} fill="var(--series-1)" stroke="var(--surface-1)" strokeWidth={1.5} />
            <circle cx={x(hoverIdx!)} cy={y(hovered.rawRoas)} r={3.5} fill="var(--series-2)" stroke="var(--surface-1)" strokeWidth={1.5} />
          </>
        )}
      </svg>

      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--text-secondary)]">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 rounded-full" style={{ background: "var(--series-1)" }} />
          Age-adjusted ROAS
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 rounded-full" style={{ background: "var(--series-2)" }} />
          Reported ROAS (raw)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: "var(--status-good)", opacity: 0.5 }} />
          Normal band
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: "var(--status-critical)", opacity: 0.5 }} />
          Below breakeven
        </span>
      </div>

      {hovered && (
        <div className="pointer-events-none absolute right-2 top-2 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-xs shadow-md animate-fade-in">
          <div className="font-medium text-[var(--text-primary)]">{hovered.date}</div>
          <div style={{ color: "var(--series-1)" }}>Adjusted: {(hovered.adjRoas * 100).toFixed(0)}%</div>
          <div style={{ color: "var(--series-2)" }}>Raw: {(hovered.rawRoas * 100).toFixed(0)}%</div>
          <div className="text-[var(--text-muted)]">
            Spend ${hovered.spend.toLocaleString()} · Orders {hovered.orders}
          </div>
        </div>
      )}
    </div>
  );
}
