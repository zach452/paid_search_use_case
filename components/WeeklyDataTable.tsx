"use client";

import { useState } from "react";
import { WeeklyRow } from "@/lib/types";

interface Props {
  weeklyData: WeeklyRow[];
  onChange: (rows: WeeklyRow[]) => void;
}

function parsePaste(text: string): WeeklyRow[] {
  const lines = text.trim().split(/\r?\n/);
  const rows: WeeklyRow[] = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    const parts = line.split(/\t|,/).map((s) => s.trim());
    if (parts.length < 3) continue;
    if (/week/i.test(parts[0])) continue;
    const [weekStarting, spend, revenue] = parts;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStarting)) continue;
    rows.push({ weekStarting, spend: Number(spend) || 0, revenue: Number(revenue) || 0 });
  }
  return rows;
}

export default function WeeklyDataTable({ weeklyData, onChange }: Props) {
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const sorted = [...weeklyData].sort((a, b) => (a.weekStarting < b.weekStarting ? -1 : 1));

  function updateRow(index: number, field: keyof WeeklyRow, value: string) {
    const next = sorted.map((r, i) =>
      i === index ? { ...r, [field]: field === "weekStarting" ? value : Number(value) } : r
    );
    onChange(next);
  }
  function deleteRow(index: number) {
    onChange(sorted.filter((_, i) => i !== index));
  }
  function addRow() {
    const last = sorted[sorted.length - 1];
    const next = last ? new Date(new Date(last.weekStarting).getTime() + 7 * 86400000).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
    onChange([...sorted, { weekStarting: next, spend: 0, revenue: 0 }]);
  }
  function applyPaste() {
    const parsed = parsePaste(pasteText);
    if (parsed.length === 0) return;
    const byWeek = new Map(sorted.map((r) => [r.weekStarting, r]));
    for (const row of parsed) byWeek.set(row.weekStarting, row);
    onChange(Array.from(byWeek.values()));
    setPasteText("");
    setPasteOpen(false);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-[var(--text-secondary)]">
          Older history, one row per week (oldest → newest). Fully matured — no age adjustment
          needed — used only for the long-range chart context, not the decision windows.
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setPasteOpen((o) => !o)}
            className="rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1.5 text-sm font-medium hover:bg-[var(--surface-2)]"
          >
            Paste rows
          </button>
          <button
            onClick={addRow}
            className="rounded-md bg-[var(--series-1)] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
          >
            + Add row
          </button>
        </div>
      </div>

      {pasteOpen && (
        <div className="rounded-md border border-[var(--border)] bg-[var(--surface-1)] p-3">
          <p className="mb-2 text-xs text-[var(--text-muted)]">
            Paste tab- or comma-separated rows: <code>week_starting, spend, revenue</code> (yyyy-mm-dd dates).
          </p>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={4}
            className="w-full rounded border border-[var(--border)] bg-[var(--surface-1)] p-2 font-mono text-xs"
            placeholder={"2026-06-01\t35000\t78000"}
          />
          <div className="mt-2 flex gap-2">
            <button onClick={applyPaste} className="rounded-md bg-[var(--series-1)] px-3 py-1.5 text-sm font-medium text-white">
              Apply
            </button>
            <button onClick={() => setPasteOpen(false)} className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="bg-[var(--surface-2)] text-left text-xs uppercase tracking-wide text-[var(--text-muted)]">
              <th className="px-3 py-2">Week starting</th>
              <th className="px-3 py-2">Spend ($)</th>
              <th className="px-3 py-2">Revenue ($)</th>
              <th className="px-3 py-2">ROAS</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr key={i} className="border-t border-[var(--border)]">
                <td className="px-2 py-1">
                  <input
                    type="date"
                    value={row.weekStarting}
                    onChange={(e) => updateRow(i, "weekStarting", e.target.value)}
                    className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 hover:border-[var(--border)]"
                  />
                </td>
                <td className="px-2 py-1">
                  <input
                    type="number"
                    value={row.spend}
                    onChange={(e) => updateRow(i, "spend", e.target.value)}
                    className="w-28 rounded border border-transparent bg-transparent px-1 py-0.5 hover:border-[var(--border)]"
                  />
                </td>
                <td className="px-2 py-1">
                  <input
                    type="number"
                    value={row.revenue}
                    onChange={(e) => updateRow(i, "revenue", e.target.value)}
                    className="w-28 rounded border border-transparent bg-transparent px-1 py-0.5 hover:border-[var(--border)]"
                  />
                </td>
                <td className="px-3 py-1 text-[var(--text-muted)]">
                  {row.spend > 0 ? `${Math.round((row.revenue / row.spend) * 100)}%` : "—"}
                </td>
                <td className="px-2 py-1 text-right">
                  <button onClick={() => deleteRow(i)} className="text-[var(--status-critical)] hover:underline">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
