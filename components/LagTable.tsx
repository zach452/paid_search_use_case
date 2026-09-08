import { PCT_OBSERVED } from "@/lib/engine";

export default function LagTable({ matureBreakeven }: { matureBreakeven: number }) {
  const rows = [
    ...PCT_OBSERVED.map((pct, age) => ({ label: `D${age}`, pct })),
    { label: "8+ (Mature)", pct: 1.0 },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--text-secondary)]">
        Revenue keeps posting for up to 7 days after the click. This is the conversion-lag curve
        given in the case: the share of a spend day&apos;s eventual (mature) revenue that has
        typically posted by that day&apos;s age. The engine uses it to gross up every day&apos;s
        revenue before comparing anything to target — see <code>lib/engine.ts</code>.
      </p>
      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[var(--surface-2)] text-left text-xs uppercase tracking-wide text-[var(--text-muted)]">
              <th className="px-3 py-2">Age of spend</th>
              <th className="px-3 py-2">% revenue observed</th>
              <th className="px-3 py-2">Reported ROAS at breakeven</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-t border-[var(--border)]">
                <td className="px-3 py-1.5">{r.label}</td>
                <td className="px-3 py-1.5">{(r.pct * 100).toFixed(1)}%</td>
                <td className="px-3 py-1.5">{(r.pct * matureBreakeven * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-[var(--text-muted)]">
        Breakeven ROAS at a given age = % revenue observed × mature breakeven ROAS ({(matureBreakeven * 100).toFixed(1)}%).
        Source: case study lag table.
      </p>
    </div>
  );
}
