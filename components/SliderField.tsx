"use client";

interface Props {
  label: string;
  value: number; // fraction, e.g. 2.2 for 220%
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  note?: string;
}

export default function SliderField({ label, value, min, max, step = 0.005, onChange, format, note }: Props) {
  const fmt = format ?? ((v: number) => `${Math.round(v * 100)}%`);
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <label className="block">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium text-[var(--text-secondary)]">{label}</span>
        <span className="font-mono text-sm font-semibold tabular-nums text-[var(--series-1)]">{fmt(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full outline-none"
        style={{
          background: `linear-gradient(to right, var(--series-1) ${pct}%, var(--border) ${pct}%)`,
        }}
      />
      {note && <span className="mt-1 block text-[11px] text-[var(--text-muted)]">{note}</span>}
      <style jsx>{`
        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 9999px;
          background: var(--surface-1);
          border: 2.5px solid var(--series-1);
          cursor: pointer;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
        }
        input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 9999px;
          background: var(--surface-1);
          border: 2.5px solid var(--series-1);
          cursor: pointer;
        }
      `}</style>
    </label>
  );
}
