"use client";

import { useEffect, useRef, useState } from "react";
import { AppData, DecisionCase } from "@/lib/types";
import { buildScenario } from "@/lib/scenarios";
import { runEngine } from "@/lib/engine";
import { loadStoredData, saveStoredData, exportDataAsFile, parseImportedFile } from "@/lib/storage";
import { todayISO } from "@/lib/dateUtils";
import DecisionPanel from "./DecisionPanel";
import DailyDataTable from "./DailyDataTable";
import InputsPanel from "./InputsPanel";
import LagTable from "./LagTable";
import { IconAlertTriangle, IconCheckCircle, IconDollar, IconHourglass, IconMoon, IconPause, IconPlay, IconSnowflake, IconSun, IconTrendingDown, IconTrendingUp } from "./icons";

type Tab = "decision" | "data" | "inputs" | "lag";

const TABS: { id: Tab; label: string }[] = [
  { id: "decision", label: "Decision" },
  { id: "data", label: "Daily Data" },
  { id: "inputs", label: "Inputs" },
  { id: "lag", label: "Lag Table" },
];

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
  SEASON_END: IconHourglass,
  WAIT_HOLD: IconHourglass,
  DATA_INSUFFICIENT: IconHourglass,
  TIGHTEN: IconTrendingUp,
  NORMAL: IconCheckCircle,
  BUDGET_INCREASE: IconDollar,
  LOOSEN: IconTrendingDown,
};
const DOT_COLOR: Record<Tone, string> = {
  good: "bg-[var(--status-good)]",
  warning: "bg-[var(--status-warning)]",
  critical: "bg-[var(--status-critical)]",
  neutral: "bg-[var(--text-muted)]",
};

export default function Dashboard() {
  const [data, setData] = useState<AppData | null>(null);
  const [scenarioId, setScenarioId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("decision");
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);

  useEffect(() => {
    const stored = loadStoredData();
    if (stored) {
      setData(stored);
    } else {
      setScenarioId("tighten");
      setData(buildScenario("tighten", todayISO()));
    }
    const storedTheme = typeof window !== "undefined" ? (window.localStorage.getItem("ccs-theme") as "light" | "dark" | null) : null;
    if (storedTheme) setTheme(storedTheme);
  }, []);

  useEffect(() => {
    if (data) saveStoredData(data);
  }, [data]);

  useEffect(() => {
    if (theme) {
      document.documentElement.dataset.theme = theme;
      window.localStorage.setItem("ccs-theme", theme);
    }
  }, [theme]);

  if (!data) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-[var(--text-muted)]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--series-1)] border-t-transparent" />
      </div>
    );
  }

  const result = runEngine(data);
  const tone = CASE_TONE[result.decisionCase];
  const StatusIcon = CASE_ICON[result.decisionCase];

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then((text) => {
      try {
        setData(parseImportedFile(text));
        setScenarioId(null);
        setImportError(null);
      } catch (err) {
        setImportError(err instanceof Error ? err.message : "Could not read that file.");
      }
    });
    e.target.value = "";
  }

  function handleSelectScenario(id: string) {
    setScenarioId(id);
    setData((prev) => {
      const built = buildScenario(id, prev?.state.today ?? todayISO());
      return { ...built, constants: prev?.constants ?? built.constants };
    });
  }

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--surface-1)]/85 backdrop-blur-md">
        <div className="mx-auto max-w-5xl px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--series-1)] text-white">
                <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none">
                  <path d="M4 18 9 11l4 3.5L20 6" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-bold leading-none text-[var(--text-primary)]">Campaign Control System</div>
                <div className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                  Target {Math.round(data.constants.requiredTargetRoas * 100)}% · Breakeven {Math.round(data.constants.matureBreakeven * 100)}%
                </div>
              </div>
            </div>

            <button
              onClick={() => setTab("decision")}
              className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-2)]/60 py-1 pl-1 pr-3 text-xs font-medium transition-colors hover:border-[var(--series-1)]/40"
              title="Jump to Decision"
            >
              <span className={`flex h-6 w-6 items-center justify-center rounded-full ${DOT_COLOR[tone]}/15`}>
                <StatusIcon className={`h-3.5 w-3.5 ${tone === "good" ? "text-[var(--status-good)]" : tone === "critical" ? "text-[var(--status-critical)]" : tone === "warning" ? "text-[#8a5a00] dark:text-[var(--status-warning)]" : "text-[var(--text-muted)]"}`} />
              </span>
              <span className="max-w-[160px] truncate text-[var(--text-primary)] sm:max-w-none">{result.action}</span>
              <span className={`h-1.5 w-1.5 rounded-full ${DOT_COLOR[tone]}`} />
            </button>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="rounded-md border border-[var(--border)] bg-[var(--surface-1)] p-1.5 hover:bg-[var(--surface-2)]"
                aria-label="Toggle dark mode"
              >
                {theme === "dark" ? <IconSun className="h-4 w-4" /> : <IconMoon className="h-4 w-4" />}
              </button>
              <button
                onClick={() => exportDataAsFile(data)}
                className="rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-2.5 py-1.5 text-xs font-medium hover:bg-[var(--surface-2)]"
              >
                Export
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-2.5 py-1.5 text-xs font-medium hover:bg-[var(--surface-2)]"
              >
                Import
              </button>
              <input ref={fileInputRef} type="file" accept="application/json" hidden onChange={handleImport} />
            </div>
          </div>

          <nav className="mt-3 flex gap-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  tab === t.id
                    ? "bg-[var(--series-1)]/12 text-[var(--series-1)]"
                    : "text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        {importError && (
          <div className="mb-4 rounded-md border border-[var(--status-critical)]/50 bg-[var(--status-critical)]/10 px-3 py-2 text-sm text-[var(--status-critical)]">
            {importError}
          </div>
        )}

        <div key={tab} className="animate-fade-in">
          {tab === "decision" && (
            <DecisionPanel data={data} activeScenarioId={scenarioId} onSelectScenario={handleSelectScenario} />
          )}
          {tab === "data" && (
            <DailyDataTable
              dailyData={data.dailyData}
              today={data.state.today}
              onChange={(dailyData) => {
                setScenarioId(null);
                setData({ ...data, dailyData });
              }}
            />
          )}
          {tab === "inputs" && (
            <InputsPanel
              state={data.state}
              constants={data.constants}
              onStateChange={(state) => {
                setScenarioId(null);
                setData({ ...data, state });
              }}
              onConstantsChange={(constants) => setData({ ...data, constants })}
            />
          )}
          {tab === "lag" && <LagTable matureBreakeven={data.constants.matureBreakeven} />}
        </div>

        <div className="mt-8 flex items-center justify-between border-t border-[var(--border)] pt-4">
          <p className="text-xs text-[var(--text-muted)]">
            Data is stored only in this browser (localStorage) — nothing is sent to a server.
          </p>
          <button
            onClick={() => {
              if (window.confirm("Reset all data and start over? This clears everything currently entered.")) {
                setScenarioId("tighten");
                setData(buildScenario("tighten", todayISO()));
              }
            }}
            className="text-xs font-medium text-[var(--status-critical)] hover:underline"
          >
            Reset everything
          </button>
        </div>
      </div>
    </div>
  );
}
