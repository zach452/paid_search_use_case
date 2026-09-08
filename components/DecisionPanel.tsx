"use client";

import { AppData, DecisionCase } from "@/lib/types";
import { runEngine } from "@/lib/engine";
import RoasChart from "./RoasChart";

const CASE_TONE: Record<DecisionCase, "good" | "warning" | "critical" | "neutral"> = {
  SAFETY_PAUSE: "critical",
  SEVERE_PAUSE: "critical",
  PAUSED_HOLD: "neutral",
  PAUSED_REENABLE: "warning",
  SEASON_START: "warning",
  SEASON_MID: "neutral",
  SEASON_END: "warning",
  WAIT_HOLD: "neutral",
  DATA_INSUFFICIENT: "neutral",
  TIGHTEN: "warning",
  NORMAL: "good",
  BUDGET_INCREASE: "good",
  LOOSEN: "good",
};

const TONE_CLASSES: Record<string, string> = {
  good: "border-[var(--status-good)]/40 bg-[var(--status-good)]/10",
  warning: "border-[var(--status-warning)]/50 bg-[var(--status-warning)]/10",
  critical: "border-[var(--status-critical)]/50 bg-[var(--status-critical)]/10",
  neutral: "border-[var(--border)] bg-[var(--surface-1)]",
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">{label}</div>
      <div className="mt-0.5 text-sm font-medium text-[var(--text-primary)]">{value}</div>
    </div>
  );
}

export default function DecisionPanel({ data }: { data: AppData }) {
  const r = runEngine(data);
  const tone = CASE_TONE[r.decisionCase];

  return (
    <div className="space-y-6">
      <div className={`rounded-xl border-2 p-5 ${TONE_CLASSES[tone]}`}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Action</div>
            <div className="mt-1 text-xl font-bold text-[var(--text-primary)]">{r.action}</div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Value</div>
            <div className="mt-1 text-xl font-bold text-[var(--text-primary)]">{r.value}</div>
          </div>
        </div>
        <div className="mt-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Reason</div>
          <div className="mt-1 text-sm text-[var(--text-primary)]">{r.reason}</div>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Review cadence</div>
            <div className="mt-1 text-sm font-medium text-[var(--text-primary)]">{r.reviewCadence}</div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Wait period</div>
            <div className="mt-1 text-sm font-medium text-[var(--text-primary)]">{r.waitPeriod}</div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">Reported vs. age-adjusted ROAS</h3>
        <RoasChart
          dailyData={data.dailyData}
          today={data.state.today}
          targetRoas={data.constants.requiredTargetRoas}
          breakevenRoas={data.constants.matureBreakeven}
        />
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">Diagnostics</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Window used" value={r.windowUsed} />
          <Stat label="Adjusted ROAS (used)" value={`${Math.round(r.adjRoasUsed * 100)}%`} />
          <Stat label="Fast window (3d)" value={`${Math.round(r.fast.adjRoas * 100)}%`} />
          <Stat label="Orders in window" value={r.ordersUsed.toLocaleString()} />
          <Stat label="Normal band" value={`${Math.round(r.normalBandLower * 100)}% – ${Math.round(r.normalBandUpper * 100)}%`} />
          <Stat label="Safety triggered?" value={r.safetyTrigger ? "Yes" : "No"} />
          <Stat label="Wait period satisfied?" value={r.waitOk ? "Yes" : "No"} />
          <Stat label="Budget near cap (7d)?" value={r.budgetCapped ? "Yes" : "No"} />
        </div>
      </div>
    </div>
  );
}
