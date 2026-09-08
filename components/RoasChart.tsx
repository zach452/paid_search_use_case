"use client";

import { useMemo, useState } from "react";
import { DailyRow, WeeklyRow } from "@/lib/types";
import { ageOf, pctObserved } from "@/lib/engine";
import { addDays, daysBetween } from "@/lib/dateUtils";

interface Props {
  dailyData: DailyRow[];
  weeklyData?: WeeklyRow[];
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

type Hover = { kind: "daily"; idx: number } | { kind: "weekly"; idx: number } | null;

export default function RoasChart({ dailyData, weeklyData = [], today, targetRoas, breakevenRoas, bandLower, bandUpper }: Props) {
  const [hover, setHover] = useState<Hover>(null);

  const dailyRows = useMemo(() => {
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

  const weeklyRows = useMemo(() => {
    return [...weeklyData]
      .sort((a, b) => (a.weekStarting < b.weekStarting ? -1 : 1))
      .map((w) => ({ ...w, date: addDays(w.weekStarting, 3), roas: w.spend > 0 ? w.revenue / w.spend : 0 }));
  }, [weeklyData]);

  if (dailyRows.length < 2) {
    return (
      <div className="flex h-[260px] items-center justify-center rounded-lg border border-dashed border-[var(--border)] text-sm text-[var(--text-muted)]">
        Add at least 2 days of Daily Data to see the chart.
      </div>
    );
  }

  const startDate = weeklyRows.length > 0 ? weeklyRows[0].date : dailyRows[0].date;
  const endDate = dailyRows[dailyRows.length - 1].date;
  const totalDays = Math.max(1, daysBetween(startDate, endDate));

  const allValues = dailyRows
    .flatMap((r) => [r.rawRoas, r.adjRoas])
    .concat(weeklyRows.map((w) => w.roas))
    .concat([bandUpper, breakevenRoas]);
  const yMax = Math.max(...allValues) * 1.1;
  const yMin = Math.max(0, Math.min(...allValues) * 0.85);

  const innerW = WIDTH - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;

  const x = (date: string) => PAD.left + (innerW * daysBetween(startDate, date)) / totalDays;
  const y = (v: number) => PAD.top + innerH - (innerH * (v - yMin)) / (yMax - yMin);
  const clampedY = (v: number) => Math.max(PAD.top, Math.min(PAD.top + innerH, y(v)));

  const rawPoints = dailyRows.map((r) => ({ x: x(r.date), y: y(r.rawRoas) }));
  const adjPoints = dailyRows.map((r) => ({ x: x(r.date), y: y(r.adjRoas) }));
  // Connect the weekly (matured) line into the first daily point so there's no visual gap
  // at the daily/weekly seam.
  const weeklyPoints = weeklyRows.map((w) => ({ x: x(w.date), y: y(w.roas) }));
  const weeklyPathPoints = weeklyPoints.length > 0 ? [...weeklyPoints, adjPoints[0]] : [];

  const yTicks = 5;
  const tickValues = Array.from({ length: yTicks + 1 }, (_, i) => yMin + ((yMax - yMin) * i) / yTicks);

  const totalPoints = weeklyRows.length + dailyRows.length;
  // Evenly spaced by actual elapsed time, not by array index — the weekly and daily
  // segments have very different point densities, so index-based striding produced
  // visually uneven label spacing.
  const numLabels = 6;
  const labelPoints = Array.from({ length: numLabels + 1 }, (_, i) => {
    const date = addDays(startDate, Math.round((totalDays * i) / numLabels));
    return { date, key: `t${i}` };
  });

  const hoveredDaily = hover?.kind === "daily" ? dailyRows[hover.idx] : null;
  const hoveredWeekly = hover?.kind === "weekly" ? weeklyRows[hover.idx] : null;

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

        {weeklyRows.length > 0 && (
          <line
            x1={x(dailyRows[0].date)}
            x2={x(dailyRows[0].date)}
            y1={PAD.top}
            y2={PAD.top + innerH}
            stroke="var(--border)"
            strokeWidth={1}
            strokeDasharray="2 2"
          />
        )}

        <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y(breakevenRoas)} y2={y(breakevenRoas)} stroke="var(--status-critical)" strokeWidth={1.25} strokeDasharray="4 3" opacity={0.8} />
        <text x={WIDTH - PAD.right} y={y(breakevenRoas) - 4} textAnchor="end" fontSize={10} fill="var(--status-critical)">
          Breakeven {Math.round(breakevenRoas * 100)}%
        </text>

        <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y(targetRoas)} y2={y(targetRoas)} stroke="var(--text-secondary)" strokeWidth={1.25} strokeDasharray="4 3" opacity={0.8} />
        <text x={WIDTH - PAD.right} y={y(targetRoas) - 4} textAnchor="end" fontSize={10} fill="var(--text-secondary)">
          Target {Math.round(targetRoas * 100)}%
        </text>

        {weeklyPathPoints.length > 0 && (
          <path
            d={smoothPath(weeklyPathPoints)}
            fill="none"
            stroke="var(--series-1)"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeDasharray="6 4"
            opacity={0.4}
          />
        )}
        <path d={smoothPath(rawPoints)} fill="none" stroke="var(--series-2)" strokeWidth={2} strokeLinecap="round" opacity={0.85} />
        <path d={smoothPath(adjPoints)} fill="none" stroke="var(--series-1)" strokeWidth={2.75} strokeLinecap="round" />

        {labelPoints.map((p) => (
          <text key={p.key} x={x(p.date)} y={HEIGHT - 8} textAnchor="middle" fontSize={9} fill="var(--text-muted)">
            {p.date.slice(5)}
          </text>
        ))}

        {weeklyRows.map((w, i) => (
          <rect
            key={`hw${i}`}
            x={x(w.date) - innerW / totalPoints / 2}
            y={PAD.top}
            width={innerW / totalPoints}
            height={innerH}
            fill="transparent"
            onMouseEnter={() => setHover({ kind: "weekly", idx: i })}
            onMouseLeave={() => setHover(null)}
          />
        ))}
        {dailyRows.map((r, i) => (
          <rect
            key={`hd${i}`}
            x={x(r.date) - innerW / totalPoints / 2}
            y={PAD.top}
            width={innerW / totalPoints}
            height={innerH}
            fill="transparent"
            onMouseEnter={() => setHover({ kind: "daily", idx: i })}
            onMouseLeave={() => setHover(null)}
          />
        ))}

        {hoveredDaily && (
          <>
            <line x1={x(hoveredDaily.date)} x2={x(hoveredDaily.date)} y1={PAD.top} y2={PAD.top + innerH} stroke="var(--text-muted)" strokeWidth={1} />
            <circle cx={x(hoveredDaily.date)} cy={y(hoveredDaily.adjRoas)} r={3.5} fill="var(--series-1)" stroke="var(--surface-1)" strokeWidth={1.5} />
            <circle cx={x(hoveredDaily.date)} cy={y(hoveredDaily.rawRoas)} r={3.5} fill="var(--series-2)" stroke="var(--surface-1)" strokeWidth={1.5} />
          </>
        )}
        {hoveredWeekly && (
          <>
            <line x1={x(hoveredWeekly.date)} x2={x(hoveredWeekly.date)} y1={PAD.top} y2={PAD.top + innerH} stroke="var(--text-muted)" strokeWidth={1} />
            <circle cx={x(hoveredWeekly.date)} cy={y(hoveredWeekly.roas)} r={3.5} fill="var(--text-muted)" stroke="var(--surface-1)" strokeWidth={1.5} />
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
        {weeklyRows.length > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 rounded-full border-t-2 border-dashed" style={{ borderColor: "var(--series-1)", opacity: 0.5 }} />
            Historical (weekly, matured)
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: "var(--status-good)", opacity: 0.5 }} />
          Normal band
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: "var(--status-critical)", opacity: 0.5 }} />
          Below breakeven
        </span>
      </div>

      {hoveredDaily && (
        <div className="pointer-events-none absolute right-2 top-2 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-xs shadow-md animate-fade-in">
          <div className="font-medium text-[var(--text-primary)]">{hoveredDaily.date}</div>
          <div style={{ color: "var(--series-1)" }}>Adjusted: {(hoveredDaily.adjRoas * 100).toFixed(0)}%</div>
          <div style={{ color: "var(--series-2)" }}>Raw: {(hoveredDaily.rawRoas * 100).toFixed(0)}%</div>
          <div className="text-[var(--text-muted)]">
            Spend ${hoveredDaily.spend.toLocaleString()} · Orders {hoveredDaily.orders}
          </div>
        </div>
      )}
      {hoveredWeekly && (
        <div className="pointer-events-none absolute right-2 top-2 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-xs shadow-md animate-fade-in">
          <div className="font-medium text-[var(--text-primary)]">Week of {hoveredWeekly.weekStarting}</div>
          <div style={{ color: "var(--text-muted)" }}>ROAS: {(hoveredWeekly.roas * 100).toFixed(0)}% (fully matured)</div>
          <div className="text-[var(--text-muted)]">
            Spend ${hoveredWeekly.spend.toLocaleString()} · Revenue ${hoveredWeekly.revenue.toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
}
