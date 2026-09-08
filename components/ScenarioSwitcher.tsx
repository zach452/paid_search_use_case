"use client";

import { SCENARIOS } from "@/lib/scenarios";
import { IconSparkle } from "./icons";

interface Props {
  activeId: string | null;
  onSelect: (id: string) => void;
}

export default function ScenarioSwitcher({ activeId, onSelect }: Props) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)]">
        <IconSparkle className="h-3.5 w-3.5" />
        Try a scenario — swaps in illustrative data so you can see the engine's full range
      </div>
      <div className="flex flex-wrap gap-1.5">
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            title={s.blurb}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              activeId === s.id
                ? "border-[var(--series-1)] bg-[var(--series-1)]/10 text-[var(--series-1)]"
                : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--series-1)]/50 hover:text-[var(--text-primary)]"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
