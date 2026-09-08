import { test } from "node:test";
import assert from "node:assert/strict";
import { runEngine, PCT_OBSERVED } from "./engine";
import { buildSampleData } from "./defaults";
import { addDays } from "./dateUtils";
import { AppData, DailyRow } from "./types";

const TODAY = "2026-08-08";

function clone(data: AppData): AppData {
  return JSON.parse(JSON.stringify(data));
}

/** Build 14 days of daily rows (ages 0-13) whose age-adjusted ROAS recovers `trueRoas`
 * regardless of the age mix — mirrors how the sample data itself is constructed. */
function trueRoasRows(trueRoas: number, today: string, nDays = 14, spend = 5000): DailyRow[] {
  const rows: DailyRow[] = [];
  for (let age = 0; age < nDays; age++) {
    const pct = age < 8 ? PCT_OBSERVED[age] : 1.0;
    const date = addDays(today, -age);
    rows.push({ date, spend, revenue: Math.round(spend * trueRoas * pct * 100) / 100, orders: 100 });
  }
  return rows;
}

test("01 baseline sample data -> NORMAL", () => {
  const data = buildSampleData(TODAY);
  const r = runEngine(data);
  assert.equal(r.decisionCase, "NORMAL");
});

test("02 acute 3-day breach -> SAFETY_PAUSE", () => {
  const data = buildSampleData(TODAY);
  const byDate = new Map(data.dailyData.map((d) => [d.date, d]));
  byDate.get(TODAY)!.revenue = 4000;
  byDate.get(addDays(TODAY, -1))!.revenue = 4200;
  byDate.get(addDays(TODAY, -2))!.revenue = 4300;
  const r = runEngine(data);
  assert.equal(r.decisionCase, "SAFETY_PAUSE");
});

test("03 confirmed severe (primary window, not fast) -> SEVERE_PAUSE", () => {
  const data = buildSampleData(TODAY);
  data.dailyData = trueRoasRows(1.95, TODAY);
  const r = runEngine(data);
  assert.equal(r.decisionCase, "SEVERE_PAUSE");
  assert.ok(!r.safetyTrigger, "fast window should NOT have triggered safety pause");
});

test("04 moderate underperformance -> TIGHTEN to 230%", () => {
  const data = buildSampleData(TODAY);
  data.dailyData = trueRoasRows(2.05, TODAY);
  const r = runEngine(data);
  assert.equal(r.decisionCase, "TIGHTEN");
  assert.equal(r.value, "Target ROAS → 230%");
});

test("05 overperformance, budget not capped -> LOOSEN to 210%", () => {
  const data = buildSampleData(TODAY);
  data.dailyData = trueRoasRows(2.45, TODAY);
  data.state.currentBudget = 15000;
  const r = runEngine(data);
  assert.equal(r.decisionCase, "LOOSEN");
  assert.equal(r.value, "Target ROAS → 210%");
});

test("06 overperformance, budget capped -> BUDGET_INCREASE", () => {
  const data = buildSampleData(TODAY);
  data.dailyData = trueRoasRows(2.45, TODAY);
  data.state.currentBudget = 5000; // spend == budget on every recent day
  const r = runEngine(data);
  assert.equal(r.decisionCase, "BUDGET_INCREASE");
  assert.equal(r.value, "Budget → $6,250/day");
});

test("07 paused, min pause not elapsed -> PAUSED_HOLD", () => {
  const data = buildSampleData(TODAY);
  data.state.status = "Paused";
  data.state.lastChangeDate = addDays(TODAY, -1);
  data.state.lastChangeType = "Pause";
  const r = runEngine(data);
  assert.equal(r.decisionCase, "PAUSED_HOLD");
});

test("08 paused, min pause elapsed -> PAUSED_REENABLE", () => {
  const data = buildSampleData(TODAY);
  data.state.status = "Paused";
  data.state.lastChangeDate = addDays(TODAY, -5);
  data.state.lastChangeType = "Pause";
  const r = runEngine(data);
  assert.equal(r.decisionCase, "PAUSED_REENABLE");
});

test("09 recent Target ROAS change, wait not satisfied -> WAIT_HOLD", () => {
  const data = buildSampleData(TODAY);
  data.state.lastChangeDate = addDays(TODAY, -2);
  data.state.lastChangeType = "Target ROAS Change";
  const r = runEngine(data);
  assert.equal(r.decisionCase, "WAIT_HOLD");
});

test("10 too few matured orders -> DATA_INSUFFICIENT", () => {
  const data = buildSampleData(TODAY);
  data.dailyData = data.dailyData.map((d) => ({ ...d, orders: 1 }));
  const r = runEngine(data);
  assert.equal(r.decisionCase, "DATA_INSUFFICIENT");
});

test("11 seasonality starts today -> SEASON_START", () => {
  const data = buildSampleData(TODAY);
  data.state.seasonality = {
    active: "Y",
    direction: "Up",
    startDate: TODAY,
    durationDays: 10,
    adjustmentSize: 0.15,
    baselineTargetRoas: 2.2,
  };
  const r = runEngine(data);
  assert.equal(r.decisionCase, "SEASON_START");
  assert.equal(r.value, "Target ROAS → 205% for 10 days");
});

test("12 seasonality mid-window -> SEASON_MID", () => {
  const data = buildSampleData(TODAY);
  data.state.seasonality = {
    active: "Y",
    direction: "Up",
    startDate: addDays(TODAY, -5),
    durationDays: 10,
    adjustmentSize: 0.15,
    baselineTargetRoas: 2.2,
  };
  const r = runEngine(data);
  assert.equal(r.decisionCase, "SEASON_MID");
});

test("13 seasonality ends today -> SEASON_END", () => {
  const data = buildSampleData(TODAY);
  data.state.seasonality = {
    active: "Y",
    direction: "Up",
    startDate: addDays(TODAY, -9),
    durationDays: 10,
    adjustmentSize: 0.15,
    baselineTargetRoas: 2.2,
  };
  const r = runEngine(data);
  assert.equal(r.decisionCase, "SEASON_END");
});

test("safety gate overrides an active wait period", () => {
  const data = buildSampleData(TODAY);
  data.state.lastChangeDate = addDays(TODAY, -1);
  data.state.lastChangeType = "Target ROAS Change";
  const byDate = new Map(data.dailyData.map((d) => [d.date, d]));
  byDate.get(TODAY)!.revenue = 3000;
  byDate.get(addDays(TODAY, -1))!.revenue = 3000;
  byDate.get(addDays(TODAY, -2))!.revenue = 3000;
  const r = runEngine(data);
  assert.equal(r.decisionCase, "SAFETY_PAUSE");
});

test("appliedState is null for no-op cases", () => {
  const data = buildSampleData(TODAY);
  const r = runEngine(data);
  assert.equal(r.decisionCase, "NORMAL");
  assert.equal(r.appliedState, null);
});

test("appliedState for TIGHTEN matches the displayed VALUE, and applying it self-throttles", () => {
  const data = buildSampleData(TODAY);
  data.dailyData = trueRoasRows(2.05, TODAY);
  const r = runEngine(data);
  assert.equal(r.decisionCase, "TIGHTEN");
  assert.ok(r.appliedState);
  assert.equal(r.appliedState!.currentTargetRoas, 2.3);
  assert.equal(r.appliedState!.lastChangeType, "Target ROAS Change");
  assert.equal(r.appliedState!.lastChangeDate, TODAY);

  // Applying it and re-running same day should immediately gate further changes.
  const applied: AppData = { ...data, state: { ...data.state, ...r.appliedState } };
  const r2 = runEngine(applied);
  assert.equal(r2.decisionCase, "WAIT_HOLD");
});

test("appliedState for PAUSED_REENABLE sets Active status, new target, and half budget", () => {
  const data = buildSampleData(TODAY);
  data.state.status = "Paused";
  data.state.lastChangeDate = addDays(TODAY, -5);
  data.state.lastChangeType = "Pause";
  data.state.currentTargetRoas = 2.2;
  data.state.currentBudget = 8000;
  const r = runEngine(data);
  assert.equal(r.decisionCase, "PAUSED_REENABLE");
  assert.deepEqual(r.appliedState, {
    status: "Active",
    currentTargetRoas: 2.3,
    currentBudget: 4000,
    lastChangeDate: TODAY,
    lastChangeType: "Re-enable",
  });
});

test("appliedState for SEASON_START captures the pre-season target as the reversion baseline", () => {
  const data = buildSampleData(TODAY);
  data.state.currentTargetRoas = 2.2;
  data.state.seasonality = {
    active: "Y",
    direction: "Up",
    startDate: TODAY,
    durationDays: 10,
    adjustmentSize: 0.15,
    baselineTargetRoas: 0, // deliberately wrong/stale — apply must recompute it, not trust this
  };
  const r = runEngine(data);
  assert.equal(r.decisionCase, "SEASON_START");
  assert.equal(r.appliedState!.currentTargetRoas, 2.05);
  assert.equal(r.appliedState!.seasonality!.baselineTargetRoas, 2.2);

  const applied: AppData = {
    ...data,
    state: {
      ...data.state,
      ...r.appliedState,
      seasonality: { ...data.state.seasonality, ...r.appliedState!.seasonality },
    },
  };
  const seasonEnd = { ...applied, state: { ...applied.state, today: addDays(TODAY, 9) } };
  const rEnd = runEngine(seasonEnd);
  assert.equal(rEnd.decisionCase, "SEASON_END");
  assert.equal(rEnd.appliedState!.currentTargetRoas, 2.2); // reverts to the captured baseline, not the mid-season value
});
