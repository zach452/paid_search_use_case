"use client";

import { useMemo, useState } from "react";
import { DailyRow } from "@/lib/types";
import { ageOf, pctObserved } from "@/lib/engine";

interface Props {
  dailyData: DailyRow[];
  today: string;
  targetRoas: number;
  breakevenRoas: number;
}

const WIDTH = 720;
const HEIGHT = 260;
const PAD = { top: 16, right: 16, bottom: 28, left: 42 };

export default function RoasChart({ dailyData, today, targetRoas, breakevenRoas }: Props) {
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
      <div className="flex h-[260px] items-center justify-center rounded-lg border border-[var(--border)] text-sm text-[var(--text-muted)]">
        Add at least 2 days of Daily Data to see the chart.
      </div>
    );
  }

  const allValues = rows.flatMap((r) => [r.rawRoas, r.adjRoas]).concat([targetRoas, breakevenRoas]);
  const yMax = Math.max(...allValues) * 1.08;
  const yMin = Math.min(0, Math.min(...allValues) * 0.92);

  const innerW = WIDTH - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;

  const x = (i: number) => PAD.left + (innerW * i) / (rows.length - 1);
  const y = (v: number) => PAD.top + innerH - (innerH * (v - yMin)) / (yMax - yMin);

  const linePath = (key: "rawRoas" | "adjRoas") =>
    rows.map((r, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(r[key]).toFixed(1)}`).join(" ");

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
        {/* gridlines + y labels */}
        {tickValues.map((v, i) => (
          <g key={i}>
            <line
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={y(v)}
              y2={y(v)}
              stroke="var(--border)"
              strokeWidth={1}
            />
            <text x={PAD.left - 8} y={y(v) + 3} textAnchor="end" fontSize={10} fill="var(--text-muted)">
              {Math.round(v * 100)}%
            </text>
          </g>
        ))}

        {/* breakeven reference line (status: critical) */}
        <line
          x1={PAD.left}
          x2={WIDTH - PAD.right}
          y1={y(breakevenRoas)}
          y2={y(breakevenRoas)}
          stroke="var(--status-critical)"
          strokeWidth={1.5}
          strokeDasharray="4 3"
        />
        <text x={WIDTH - PAD.right} y={y(breakevenRoas) - 4} textAnchor="end" fontSize={10} fill="var(--status-critical)">
          Breakeven {Math.round(breakevenRoas * 100)}%
        </text>

        {/* target reference line (neutral) */}
        <line
          x1={PAD.left}
          x2={WIDTH - PAD.right}
          y1={y(targetRoas)}
          y2={y(targetRoas)}
          stroke="var(--text-secondary)"
          strokeWidth={1.5}
          strokeDasharray="4 3"
        />
        <text x={WIDTH - PAD.right} y={y(targetRoas) - 4} textAnchor="end" fontSize={10} fill="var(--text-secondary)">
          Target {Math.round(targetRoas * 100)}%
        </text>

        {/* raw ROAS line (series 2) */}
        <path d={linePath("rawRoas")} fill="none" stroke="var(--series-2)" strokeWidth={2} strokeLinecap="round" />
        {/* adjusted ROAS line (series 1) — drawn last so it's on top */}
        <path d={linePath("adjRoas")} fill="none" stroke="var(--series-1)" strokeWidth={2.5} strokeLinecap="round" />

        {/* x-axis date labels */}
        {rows.map((r, i) =>
          i % dateLabelEvery === 0 ? (
            <text key={r.date} x={x(i)} y={HEIGHT - 8} textAnchor="middle" fontSize={9} fill="var(--text-muted)">
              {r.date.slice(5)}
            </text>
          ) : null
        )}

        {/* hover targets */}
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
          <line
            x1={x(hoverIdx!)}
            x2={x(hoverIdx!)}
            y1={PAD.top}
            y2={PAD.top + innerH}
            stroke="var(--text-muted)"
            strokeWidth={1}
          />
        )}
      </svg>

      <div className="mt-1 flex items-center gap-4 text-xs text-[var(--text-secondary)]">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 rounded-full" style={{ background: "var(--series-1)" }} />
          Age-adjusted ROAS
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 rounded-full" style={{ background: "var(--series-2)" }} />
          Reported ROAS (raw)
        </span>
      </div>

      {hovered && (
        <div className="pointer-events-none absolute right-2 top-2 rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-xs shadow-sm">
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
