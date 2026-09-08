"use client";

import { useEffect, useState } from "react";
import { AppData, CampaignState, DecisionCase } from "@/lib/types";
import { runEngine } from "@/lib/engine";
import RoasChart from "./RoasChart";
import ZoneGauge from "./ZoneGauge";
import ScenarioSwitcher from "./ScenarioSwitcher";
import {
  IconAlertTriangle,
  IconCalendarClock,
  IconCheckCircle,
  IconDollar,
  IconHourglass,
  IconPause,
  IconPlay,
  IconSnowflake,
  IconTrendingDown,
  IconTrendingUp,
} from "./icons";

type Tone = "good" | "warning" | "critical" | "neutral";

const CASE_TONE: Record<DecisionCase, Tone> = {
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

const CASE_ICON: Record<DecisionCase, (p: { className?: string }) => JSX.Element> = {
  SAFETY_PAUSE: IconAlertTriangle,
  SEVERE_PAUSE: IconAlertTriangle,
  PAUSED_HOLD: IconPause,
  PAUSED_REENABLE: IconPlay,
  SEASON_START: IconSnowflake,
  SEASON_MID: IconSnowflake,
  SEASON_END: IconCalendarClock,
  WAIT_HOLD: IconHourglass,
  DATA_INSUFFICIENT: IconHourglass,
  TIGHTEN: IconTrendingUp,
  NORMAL: IconCheckCircle,
  BUDGET_INCREASE: IconDollar,
  LOOSEN: IconTrendingDown,
};

const TONE_STYLES: Record<Tone, { border: string; bg: string; iconBg: string; iconFg: string; chip: string }> = {
  good: {
    border: "border-[var(--status-good)]/30",
    bg: "bg-gradient-to-br from-[var(--status-good)]/[0.07] to-transparent",
    iconBg: "bg-[var(--status-good)]/15",
    iconFg: "text-[var(--status-good)]",
    chip: "bg-[var(--status-good)]/15 text-[var(--status-good)]",
  },
  warning: {
    border: "border-[var(--status-warning)]/40",
    bg: "bg-gradient-to-br from-[var(--status-warning)]/[0.09] to-transparent",
    iconBg: "bg-[var(--status-warning)]/20",
    iconFg: "text-[#8a5a00] dark:text-[var(--status-warning)]",
    chip: "bg-[var(--status-warning)]/20 text-[#8a5a00] dark:text-[var(--status-warning)]",
  },
  critical: {
    border: "border-[var(--status-critical)]/40",
    bg: "bg-gradient-to-br from-[var(--status-critical)]/[0.08] to-transparent",
    iconBg: "bg-[var(--status-critical)]/15",
    iconFg: "text-[var(--status-critical)]",
    chip: "bg-[var(--status-critical)]/15 text-[var(--status-critical)]",
  },
  neutral: {
    border: "border-[var(--border)]",
    bg: "bg-[var(--surface-1)]",
    iconBg: "bg-[var(--surface-2)]",
    iconFg: "text-[var(--text-secondary)]",
    chip: "bg-[var(--surface-2)] text-[var(--text-secondary)]",
  },
};

function InfoChip({ icon: Icon, label, value }: { icon: (p: { className?: string }) => JSX.Element; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-muted)]" />
      <div className="min-w-0">
        <div className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">{label}</div>
        <div className="mt-0.5 text-sm font-medium leading-snug text-[var(--text-primary)]">{value}</div>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2.5">
      <div className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">{label}</div>
      <div className="mt-0.5 text-base font-semibold tabular-nums text-[var(--text-primary)]">{value}</div>
      {sub && <div className="text-[11px] text-[var(--text-muted)]">{sub}</div>}
    </div>
  );
}

interface Props {
  data: AppData;
  activeScenarioId: string | null;
  onSelectScenario: (id: string) => void;
  onApplyDecision: (patch: Partial<CampaignState>) => void;
}

export default function DecisionPanel({ data, activeScenarioId, onSelectScenario, onApplyDecision }: Props) {
  const r = runEngine(data);
  const tone = CASE_TONE[r.decisionCase];
  const styles = TONE_STYLES[tone];
  const Icon = CASE_ICON[r.decisionCase];
  const [justApplied, setJustApplied] = useState(false);

  useEffect(() => {
    setJustApplied(false);
  }, [r.decisionCase, r.value]);

  function handleApply() {
    if (!r.appliedState) return;
    onApplyDecision(r.appliedState);
    setJustApplied(true);
  }

  return (
    <div className="space-y-6">
      <ScenarioSwitcher activeId={activeScenarioId} onSelect={onSelectScenario} />

      <div
        key={`${r.decisionCase}-${r.value}-${data.state.today}-${data.state.status}`}
        className={`animate-pop-in rounded-2xl border p-5 sm:p-6 ${styles.border} ${styles.bg}`}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${styles.iconBg}`}>
              <Icon className={`h-5.5 w-5.5 ${styles.iconFg}`} />
            </div>
            <div>
              <span className={`inline-block rounded-full px-2 py-0.5 font-mono text-[10px] font-medium tracking-wide ${styles.chip}`}>
                {r.decisionCase}
              </span>
              <h2 className="mt-1.5 text-2xl font-bold leading-tight text-[var(--text-primary)]">{r.action}</h2>
            </div>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)]/70 px-4 py-2.5 text-right backdrop-blur-sm">
            <div className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">Value</div>
            <div className="text-lg font-bold tabular-nums text-[var(--text-primary)]">{r.value}</div>
          </div>
        </div>

        <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-[var(--text-secondary)]">{r.reason}</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <InfoChip icon={IconCalendarClock} label="Review cadence" value={r.reviewCadence} />
          <InfoChip icon={IconHourglass} label="Wait period" value={r.waitPeriod} />
        </div>

        {r.appliedState && (
          <div className="mt-4 flex items-center gap-3 border-t border-[var(--border)]/60 pt-4">
            <button
              onClick={handleApply}
              disabled={justApplied}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition-all ${
                justApplied
                  ? "cursor-default bg-[var(--status-good)]/15 text-[var(--status-good)]"
                  : "bg-[var(--text-primary)] text-[var(--surface-1)] hover:opacity-90 active:scale-[0.98]"
              }`}
            >
              {justApplied ? (
                <>
                  <IconCheckCircle className="h-4 w-4" /> Applied
                </>
              ) : (
                "Apply this recommendation"
              )}
            </button>
            <span className="text-xs text-[var(--text-muted)]">
              {justApplied
                ? "Campaign State on the Inputs tab has been updated — wait-period gating starts now."
                : "Writes this exact change to Campaign State (status, target, budget, last-change date/type) so the wait-period gate engages automatically."}
            </span>
          </div>
        )}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Where this sits</h3>
          <span className="text-xs text-[var(--text-muted)]">{r.windowUsed} · {r.ordersUsed.toLocaleString()} orders</span>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
          <ZoneGauge
            value={r.adjRoasUsed}
            breakeven={data.constants.matureBreakeven}
            bandLower={r.normalBandLower}
            bandUpper={r.normalBandUpper}
          />
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">Reported vs. age-adjusted ROAS</h3>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
          <RoasChart
            dailyData={data.dailyData}
            weeklyData={data.weeklyData}
            today={data.state.today}
            targetRoas={data.constants.requiredTargetRoas}
            breakevenRoas={data.constants.matureBreakeven}
            bandLower={r.normalBandLower}
            bandUpper={r.normalBandUpper}
          />
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">Diagnostics</h3>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <Stat label="Fast window (3d)" value={`${Math.round(r.fast.adjRoas * 100)}%`} sub={`${r.fast.orders} orders`} />
          <Stat label="Primary window (14d)" value={`${Math.round(r.primary.adjRoas * 100)}%`} sub={`${r.primary.orders} orders`} />
          <Stat label="Safety triggered?" value={r.safetyTrigger ? "Yes" : "No"} />
          <Stat label="Budget near cap (7d)?" value={r.budgetCapped ? "Yes" : "No"} sub={`${r.daysAtBudgetCap}/7 days`} />
          <Stat label="Wait period satisfied?" value={r.waitOk ? "Yes" : "No"} />
          <Stat label="Days since last change" value={String(r.daysSinceChange)} />
          <Stat label="Orders since last change" value={r.ordersSinceChange.toLocaleString()} />
          <Stat label="Seasonality active?" value={r.seasonActiveToday ? "Yes" : "No"} />
        </div>
      </div>
    </div>
  );
}
