"use client";

import { useState } from "react";
import { CampaignState, CampaignStatus, LastChangeType, SeasonDirection, SystemConstants } from "@/lib/types";
import SliderField from "./SliderField";

interface Props {
  state: CampaignState;
  constants: SystemConstants;
  onStateChange: (state: CampaignState) => void;
  onConstantsChange: (constants: SystemConstants) => void;
}

function Field({
  label,
  children,
  note,
}: {
  label: string;
  children: React.ReactNode;
  note?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-[var(--text-secondary)]">{label}</span>
      <div className="mt-1">{children}</div>
      {note && <span className="mt-0.5 block text-[11px] text-[var(--text-muted)]">{note}</span>}
    </label>
  );
}

const inputClass =
  "w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-2.5 py-1.5 text-sm transition-colors focus:border-[var(--series-1)] focus:outline-none focus:ring-2 focus:ring-[var(--series-1)]/20";

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-1)] shadow-sm">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-[var(--surface-2)]/50"
      >
        <span className="text-sm font-semibold text-[var(--text-primary)]">{title}</span>
        <span
          className={`text-[var(--text-muted)] transition-transform duration-200 ${open ? "rotate-45" : ""}`}
        >
          +
        </span>
      </button>
      {open && <div className="grid animate-fade-in gap-4 border-t border-[var(--border)] p-4 sm:grid-cols-2">{children}</div>}
    </div>
  );
}

function pctToInput(x: number): string {
  return (x * 100).toFixed(1);
}
function inputToPct(s: string): number {
  return (Number(s) || 0) / 100;
}

export default function InputsPanel({ state, constants, onStateChange, onConstantsChange }: Props) {
  const setState = (patch: Partial<CampaignState>) => onStateChange({ ...state, ...patch });
  const setSeasonality = (patch: Partial<CampaignState["seasonality"]>) =>
    onStateChange({ ...state, seasonality: { ...state.seasonality, ...patch } });
  const setConstants = (patch: Partial<SystemConstants>) => onConstantsChange({ ...constants, ...patch });

  return (
    <div className="space-y-4">
      <Section title="Campaign State (update every review)">
        <Field label="Today's date">
          <input
            type="date"
            className={inputClass}
            value={state.today}
            onChange={(e) => setState({ today: e.target.value })}
          />
        </Field>
        <Field label="Campaign status">
          <select
            className={inputClass}
            value={state.status}
            onChange={(e) => setState({ status: e.target.value as CampaignStatus })}
          >
            <option value="Active">Active</option>
            <option value="Paused">Paused</option>
          </select>
        </Field>
        <div className="sm:col-span-2">
          <SliderField
            label="Current platform Target ROAS"
            value={state.currentTargetRoas}
            min={Math.min(constants.floorTargetRoas, state.currentTargetRoas) - 0.1}
            max={Math.max(constants.ceilingTargetRoas, state.currentTargetRoas) + 0.1}
            onChange={(v) => setState({ currentTargetRoas: v })}
            note="What's literally set in Google Ads right now."
          />
        </div>
        <div className="sm:col-span-2">
          <SliderField
            label="Current daily budget"
            value={state.currentBudget}
            min={0}
            max={Math.max(20000, state.currentBudget * 1.5)}
            step={50}
            format={(v) => `$${Math.round(v).toLocaleString()}`}
            onChange={(v) => setState({ currentBudget: v })}
          />
        </div>
        <Field label="Last change date">
          <input
            type="date"
            className={inputClass}
            value={state.lastChangeDate}
            onChange={(e) => setState({ lastChangeDate: e.target.value })}
          />
        </Field>
        <Field label="Last change type">
          <select
            className={inputClass}
            value={state.lastChangeType}
            onChange={(e) => setState({ lastChangeType: e.target.value as LastChangeType })}
          >
            {[
              "None",
              "Target ROAS Change",
              "Budget Change",
              "Pause",
              "Re-enable",
              "Seasonality Start",
              "Seasonality End",
            ].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
      </Section>

      <Section title="Seasonality override (optional)" defaultOpen={false}>
        <Field label="Known seasonality event flagged?">
          <select
            className={inputClass}
            value={state.seasonality.active}
            onChange={(e) => setSeasonality({ active: e.target.value as "Y" | "N" })}
          >
            <option value="N">N</option>
            <option value="Y">Y</option>
          </select>
        </Field>
        <Field label="Direction" note="Up = expect higher demand (loosen). Down = expect lower demand (tighten).">
          <select
            className={inputClass}
            value={state.seasonality.direction}
            onChange={(e) => setSeasonality({ direction: e.target.value as SeasonDirection })}
          >
            <option value="Up">Up</option>
            <option value="Down">Down</option>
          </select>
        </Field>
        <Field label="Season start date">
          <input
            type="date"
            className={inputClass}
            value={state.seasonality.startDate}
            onChange={(e) => setSeasonality({ startDate: e.target.value })}
          />
        </Field>
        <Field label="Season duration (days)">
          <input
            type="number"
            className={inputClass}
            value={state.seasonality.durationDays}
            onChange={(e) => setSeasonality({ durationDays: Number(e.target.value) || 0 })}
          />
        </Field>
        <Field label="Adjustment size (points)">
          <input
            type="number"
            className={inputClass}
            value={pctToInput(state.seasonality.adjustmentSize)}
            onChange={(e) => setSeasonality({ adjustmentSize: inputToPct(e.target.value) })}
          />
        </Field>
        <Field label="Pre-season baseline Target ROAS (%)">
          <input
            type="number"
            className={inputClass}
            value={pctToInput(state.seasonality.baselineTargetRoas)}
            onChange={(e) => setSeasonality({ baselineTargetRoas: inputToPct(e.target.value) })}
          />
        </Field>
      </Section>

      <Section title="System constants (set once)" defaultOpen={false}>
        <Field label="Required (business) Target ROAS (%)">
          <input
            type="number"
            className={inputClass}
            value={pctToInput(constants.requiredTargetRoas)}
            onChange={(e) => setConstants({ requiredTargetRoas: inputToPct(e.target.value) })}
          />
        </Field>
        <Field label="Mature breakeven ROAS (%)">
          <input
            type="number"
            step="0.1"
            className={inputClass}
            value={pctToInput(constants.matureBreakeven)}
            onChange={(e) => setConstants({ matureBreakeven: inputToPct(e.target.value) })}
          />
        </Field>
        <Field label="Floor Target ROAS (%)">
          <input
            type="number"
            className={inputClass}
            value={pctToInput(constants.floorTargetRoas)}
            onChange={(e) => setConstants({ floorTargetRoas: inputToPct(e.target.value) })}
          />
        </Field>
        <Field label="Ceiling Target ROAS (%)">
          <input
            type="number"
            className={inputClass}
            value={pctToInput(constants.ceilingTargetRoas)}
            onChange={(e) => setConstants({ ceilingTargetRoas: inputToPct(e.target.value) })}
          />
        </Field>
        <Field label="Target ROAS step size (points)">
          <input
            type="number"
            className={inputClass}
            value={pctToInput(constants.stepSize)}
            onChange={(e) => setConstants({ stepSize: inputToPct(e.target.value) })}
          />
        </Field>
        <Field label="Budget step size (%)">
          <input
            type="number"
            className={inputClass}
            value={pctToInput(constants.budgetStepSize)}
            onChange={(e) => setConstants({ budgetStepSize: inputToPct(e.target.value) })}
          />
        </Field>
        <Field label="Minimum matured orders for confidence">
          <input
            type="number"
            className={inputClass}
            value={constants.minOrders}
            onChange={(e) => setConstants({ minOrders: Number(e.target.value) || 0 })}
          />
        </Field>
        <Field label="Minimum orders for fast-window safety check">
          <input
            type="number"
            className={inputClass}
            value={constants.minOrdersFast}
            onChange={(e) => setConstants({ minOrdersFast: Number(e.target.value) || 0 })}
          />
        </Field>
        <Field label="Fast-window severe multiple (x breakeven)">
          <input
            type="number"
            step="0.01"
            className={inputClass}
            value={constants.fastSevereMultiple}
            onChange={(e) => setConstants({ fastSevereMultiple: Number(e.target.value) || 0 })}
          />
        </Field>
        <Field label="Wait period — days">
          <input
            type="number"
            className={inputClass}
            value={constants.waitDays}
            onChange={(e) => setConstants({ waitDays: Number(e.target.value) || 0 })}
          />
        </Field>
        <Field label="Wait period — orders">
          <input
            type="number"
            className={inputClass}
            value={constants.waitOrders}
            onChange={(e) => setConstants({ waitOrders: Number(e.target.value) || 0 })}
          />
        </Field>
        <Field label="Pause minimum days before re-enable">
          <input
            type="number"
            className={inputClass}
            value={constants.pauseMinDays}
            onChange={(e) => setConstants({ pauseMinDays: Number(e.target.value) || 0 })}
          />
        </Field>
        <Field label="Budget utilization threshold (cap signal, %)">
          <input
            type="number"
            className={inputClass}
            value={pctToInput(constants.budgetUtilThreshold)}
            onChange={(e) => setConstants({ budgetUtilThreshold: inputToPct(e.target.value) })}
          />
        </Field>
        <Field label="Days at cap needed (of last 7)">
          <input
            type="number"
            className={inputClass}
            value={constants.budgetUtilDaysNeeded}
            onChange={(e) => setConstants({ budgetUtilDaysNeeded: Number(e.target.value) || 0 })}
          />
        </Field>
        <Field label="Normal band — points below required target">
          <input
            type="number"
            className={inputClass}
            value={pctToInput(constants.bandLowerOffset)}
            onChange={(e) => setConstants({ bandLowerOffset: inputToPct(e.target.value) })}
          />
        </Field>
        <Field label="Normal band — points above required target">
          <input
            type="number"
            className={inputClass}
            value={pctToInput(constants.bandUpperOffset)}
            onChange={(e) => setConstants({ bandUpperOffset: inputToPct(e.target.value) })}
          />
        </Field>
        <Field label="Primary window length (days)">
          <input
            type="number"
            className={inputClass}
            value={constants.primaryWindowDays}
            onChange={(e) => setConstants({ primaryWindowDays: Number(e.target.value) || 0 })}
          />
        </Field>
        <Field label="Fallback window length (days)">
          <input
            type="number"
            className={inputClass}
            value={constants.fallbackWindowDays}
            onChange={(e) => setConstants({ fallbackWindowDays: Number(e.target.value) || 0 })}
          />
        </Field>
        <Field label="Fast window length (days)">
          <input
            type="number"
            className={inputClass}
            value={constants.fastWindowDays}
            onChange={(e) => setConstants({ fastWindowDays: Number(e.target.value) || 0 })}
          />
        </Field>
      </Section>
    </div>
  );
}
