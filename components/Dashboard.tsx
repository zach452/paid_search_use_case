"use client";

import { useEffect, useRef, useState } from "react";
import { AppData } from "@/lib/types";
import { buildSampleData } from "@/lib/defaults";
import { loadStoredData, saveStoredData, exportDataAsFile, parseImportedFile } from "@/lib/storage";
import { todayISO } from "@/lib/dateUtils";
import DecisionPanel from "./DecisionPanel";
import DailyDataTable from "./DailyDataTable";
import InputsPanel from "./InputsPanel";
import LagTable from "./LagTable";

type Tab = "decision" | "data" | "inputs" | "lag";

const TABS: { id: Tab; label: string }[] = [
  { id: "decision", label: "Decision" },
  { id: "data", label: "Daily Data" },
  { id: "inputs", label: "Inputs" },
  { id: "lag", label: "Lag Table" },
];

export default function Dashboard() {
  const [data, setData] = useState<AppData | null>(null);
  const [tab, setTab] = useState<Tab>("decision");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);

  useEffect(() => {
    const stored = loadStoredData();
    setData(stored ?? buildSampleData(todayISO()));
  }, []);

  useEffect(() => {
    if (data) saveStoredData(data);
  }, [data]);

  if (!data) {
    return <div className="p-8 text-sm text-[var(--text-muted)]">Loading…</div>;
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then((text) => {
      try {
        setData(parseImportedFile(text));
        setImportError(null);
      } catch (err) {
        setImportError(err instanceof Error ? err.message : "Could not read that file.");
      }
    });
    e.target.value = "";
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Campaign Control System</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Paid search, Target ROAS bidding · Required target {Math.round(data.constants.requiredTargetRoas * 100)}%
            · Breakeven {Math.round(data.constants.matureBreakeven * 100)}%
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => exportDataAsFile(data)}
            className="rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1.5 text-sm font-medium hover:bg-[var(--surface-2)]"
          >
            Export JSON
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1.5 text-sm font-medium hover:bg-[var(--surface-2)]"
          >
            Import JSON
          </button>
          <input ref={fileInputRef} type="file" accept="application/json" hidden onChange={handleImport} />
          <button
            onClick={() => {
              if (window.confirm("Reset to fresh sample data? This replaces everything currently entered.")) {
                setData(buildSampleData(todayISO()));
              }
            }}
            className="rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1.5 text-sm font-medium text-[var(--status-critical)] hover:bg-[var(--surface-2)]"
          >
            Reset sample
          </button>
        </div>
      </header>

      {importError && (
        <div className="mb-4 rounded-md border border-[var(--status-critical)]/50 bg-[var(--status-critical)]/10 px-3 py-2 text-sm text-[var(--status-critical)]">
          {importError}
        </div>
      )}

      <nav className="mb-6 flex gap-1 border-b border-[var(--border)]">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium ${
              tab === t.id
                ? "border-b-2 border-[var(--series-1)] text-[var(--text-primary)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "decision" && <DecisionPanel data={data} />}
      {tab === "data" && (
        <DailyDataTable
          dailyData={data.dailyData}
          today={data.state.today}
          onChange={(dailyData) => setData({ ...data, dailyData })}
        />
      )}
      {tab === "inputs" && (
        <InputsPanel
          state={data.state}
          constants={data.constants}
          onStateChange={(state) => setData({ ...data, state })}
          onConstantsChange={(constants) => setData({ ...data, constants })}
        />
      )}
      {tab === "lag" && <LagTable matureBreakeven={data.constants.matureBreakeven} />}

      <footer className="mt-10 border-t border-[var(--border)] pt-4 text-xs text-[var(--text-muted)]">
        Data is stored only in this browser (localStorage) — nothing is sent to a server. Use Export/Import
        to back up or share a snapshot with a teammate.
      </footer>
    </div>
  );
}
