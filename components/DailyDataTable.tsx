"use client";

import { useState } from "react";
import { DailyRow } from "@/lib/types";
import { ageOf, pctObserved } from "@/lib/engine";

interface Props {
  dailyData: DailyRow[];
  today: string;
  onChange: (rows: DailyRow[]) => void;
}

function parsePaste(text: string): DailyRow[] {
  const lines = text.trim().split(/\r?\n/);
  const rows: DailyRow[] = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    const parts = line.split(/\t|,/).map((s) => s.trim());
    if (parts.length < 3) continue;
    // Skip an obvious header row
    if (/date/i.test(parts[0])) continue;
    const [date, spend, revenue, orders] = parts;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    rows.push({
      date,
      spend: Number(spend) || 0,
      revenue: Number(revenue) || 0,
      orders: Number(orders) || 0,
    });
  }
  return rows;
}

export default function DailyDataTable({ dailyData, today, onChange }: Props) {
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");

  const sorted = [...dailyData].sort((a, b) => (a.date < b.date ? -1 : 1));

  function updateRow(index: number, field: keyof DailyRow, value: string) {
    const next = sorted.map((r, i) =>
      i === index ? { ...r, [field]: field === "date" ? value : Number(value) } : r
    );
    onChange(next);
  }

  function deleteRow(index: number) {
    onChange(sorted.filter((_, i) => i !== index));
  }

  function addRow() {
    onChange([...sorted, { date: today, spend: 0, revenue: 0, orders: 0 }]);
  }

  function applyPaste() {
    const parsed = parsePaste(pasteText);
    if (parsed.length === 0) return;
    const byDate = new Map(sorted.map((r) => [r.date, r]));
    for (const row of parsed) byDate.set(row.date, row);
    onChange(Array.from(byDate.values()));
    setPasteText("");
    setPasteOpen(false);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-[var(--text-secondary)]">
          One row per spend date, oldest → newest. Revenue and Orders are cumulative-to-date for that
          day&apos;s spend (they grow as conversions keep posting).
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
            Paste tab- or comma-separated rows: <code>date, spend, revenue, orders</code> (yyyy-mm-dd
            dates). Existing dates are overwritten; new dates are added.
          </p>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={5}
            className="w-full rounded border border-[var(--border)] bg-[var(--surface-1)] p-2 font-mono text-xs"
            placeholder={"2026-08-08\t5000\t9500\t110"}
          />
          <div className="mt-2 flex gap-2">
            <button
              onClick={applyPaste}
              className="rounded-md bg-[var(--series-1)] px-3 py-1.5 text-sm font-medium text-white"
            >
              Apply
            </button>
            <button
              onClick={() => setPasteOpen(false)}
              className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="bg-[var(--surface-2)] text-left text-xs uppercase tracking-wide text-[var(--text-muted)]">
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Spend ($)</th>
              <th className="px-3 py-2">Revenue to date ($)</th>
              <th className="px-3 py-2">Orders</th>
              <th className="px-3 py-2">Age (days)</th>
              <th className="px-3 py-2">% Observed</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => {
              const age = ageOf(row.date, today);
              return (
                <tr key={i} className="border-t border-[var(--border)]">
                  <td className="px-2 py-1">
                    <input
                      type="date"
                      value={row.date}
                      onChange={(e) => updateRow(i, "date", e.target.value)}
                      className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 hover:border-[var(--border)]"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      type="number"
                      value={row.spend}
                      onChange={(e) => updateRow(i, "spend", e.target.value)}
                      className="w-24 rounded border border-transparent bg-transparent px-1 py-0.5 hover:border-[var(--border)]"
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
                  <td className="px-2 py-1">
                    <input
                      type="number"
                      value={row.orders}
                      onChange={(e) => updateRow(i, "orders", e.target.value)}
                      className="w-20 rounded border border-transparent bg-transparent px-1 py-0.5 hover:border-[var(--border)]"
                    />
                  </td>
                  <td className="px-3 py-1 text-[var(--text-muted)]">{age >= 0 ? age : "—"}</td>
                  <td className="px-3 py-1 text-[var(--text-muted)]">
                    {age >= 0 ? `${Math.round(pctObserved(age) * 100)}%` : "—"}
                  </td>
                  <td className="px-2 py-1 text-right">
                    <button
                      onClick={() => deleteRow(i)}
                      className="text-[var(--status-critical)] hover:underline"
                      aria-label={`Delete row for ${row.date}`}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
