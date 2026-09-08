import { AppData, DailyRow, WeeklyRow } from "./types";
import { addDays } from "./dateUtils";
import { PCT_OBSERVED } from "./engine";
import { DEFAULT_CONSTANTS } from "./defaults";

// Seeded PRNG so every scenario is perfectly reproducible across server/client renders.
function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const AOV = 85;

/** Builds 21 days of daily rows (oldest -> newest, ending "today") whose true mature ROAS
 * follows `trueRoasAt(daysFromEnd)` — 0 = today, 20 = oldest — then age-adjusts revenue
 * exactly the way real conversion lag would, so the engine's own math produces the
 * intended reported-vs-adjusted story on the chart. */
function buildDailyRows(
  todayISO: string,
  trueRoasAt: (daysFromEnd: number) => number,
  seed: number,
  spendBase = 5000
): DailyRow[] {
  const rand = mulberry32(seed);
  const uniform = (lo: number, hi: number) => lo + rand() * (hi - lo);
  const rows: DailyRow[] = [];
  for (let i = 0; i < 21; i++) {
    const daysFromEnd = 20 - i;
    const date = addDays(todayISO, -daysFromEnd);
    const trueRoas = trueRoasAt(daysFromEnd);
    const spend = Math.round(uniform(spendBase * 0.94, spendBase * 1.06));
    const age = daysFromEnd;
    const pctObs = age >= 8 ? 1.0 : PCT_OBSERVED[age];
    const noise = uniform(0.97, 1.03);
    const revenue = Math.round(spend * trueRoas * pctObs * noise * 100) / 100;
    const orders = Math.max(1, Math.round((revenue / AOV) * uniform(0.95, 1.05)));
    rows.push({ date, spend, revenue, orders });
  }
  return rows;
}

function buildWeeklyRows(todayISO: string, avgRoas: number, seed: number): WeeklyRow[] {
  const rand = mulberry32(seed);
  const uniform = (lo: number, hi: number) => lo + rand() * (hi - lo);
  const rows: WeeklyRow[] = [];
  const weekStartBase = addDays(todayISO, -20 - 7 * 6);
  for (let i = 0; i < 6; i++) {
    const weekStarting = addDays(weekStartBase, 7 * i);
    const spend = Math.round(uniform(33000, 37000));
    const roas = uniform(avgRoas - 0.06, avgRoas + 0.06);
    rows.push({ weekStarting, spend, revenue: Math.round(spend * roas) });
  }
  return rows;
}

function baseState(todayISO: string, overrides: Partial<AppData["state"]> = {}): AppData["state"] {
  return {
    today: todayISO,
    status: "Active",
    currentTargetRoas: 2.2,
    currentBudget: 8000,
    lastChangeDate: addDays(todayISO, -19),
    lastChangeType: "None",
    seasonality: {
      active: "N",
      direction: "Up",
      startDate: addDays(todayISO, 30),
      durationDays: 10,
      adjustmentSize: 0.15,
      baselineTargetRoas: 2.2,
    },
    ...overrides,
  };
}

export interface Scenario {
  id: string;
  label: string;
  blurb: string;
  build: (todayISO: string) => AppData;
}

export const SCENARIOS: Scenario[] = [
  {
    id: "tighten",
    label: "Softening performance",
    blurb: "A real, sustained dip — the system catches it and tightens.",
    build: (today) => ({
      state: baseState(today),
      constants: DEFAULT_CONSTANTS,
      dailyData: buildDailyRows(
        today,
        (d) => (d <= 12 ? 2.03 : 2.05 + (d - 12) * 0.02),
        7
      ),
      weeklyData: buildWeeklyRows(today, 2.24, 71),
    }),
  },
  {
    id: "normal",
    label: "Healthy & on-target",
    blurb: "Everything inside the normal band — a quiet, no-news review.",
    build: (today) => ({
      state: baseState(today),
      constants: DEFAULT_CONSTANTS,
      dailyData: buildDailyRows(today, () => 2.22, 42),
      weeklyData: buildWeeklyRows(today, 2.22, 43),
    }),
  },
  {
    id: "opportunity",
    label: "Strong overperformance",
    blurb: "Comfortably above target with budget headroom — room to grow spend.",
    build: (today) => ({
      state: baseState(today, { currentBudget: 15000 }),
      constants: DEFAULT_CONSTANTS,
      dailyData: buildDailyRows(today, () => 2.5, 99),
      weeklyData: buildWeeklyRows(today, 2.4, 98),
    }),
  },
  {
    id: "budget_capped",
    label: "Overperforming, budget-capped",
    blurb: "Efficiency is great but spend is hitting the budget ceiling.",
    build: (today) => ({
      state: baseState(today, { currentBudget: 5200 }),
      constants: DEFAULT_CONSTANTS,
      dailyData: buildDailyRows(today, () => 2.5, 101, 5200),
      weeklyData: buildWeeklyRows(today, 2.4, 102),
    }),
  },
  {
    id: "severe",
    label: "Confirmed breakeven breach",
    blurb: "Sustained, matured underperformance below breakeven — pause.",
    build: (today) => ({
      state: baseState(today),
      constants: DEFAULT_CONSTANTS,
      dailyData: buildDailyRows(today, () => 1.92, 7),
      weeklyData: buildWeeklyRows(today, 2.15, 8),
    }),
  },
  {
    id: "safety",
    label: "Acute 3-day crash",
    blurb: "The last few days fell off a cliff — safety net pauses immediately.",
    build: (today) => ({
      state: baseState(today),
      constants: DEFAULT_CONSTANTS,
      dailyData: buildDailyRows(
        today,
        (d) => (d <= 2 ? 1.35 : 2.22),
        13
      ),
      weeklyData: buildWeeklyRows(today, 2.22, 14),
    }),
  },
  {
    id: "paused",
    label: "Paused, ready to re-enable",
    blurb: "A prior pause has cleared its minimum hold — restart conservatively.",
    build: (today) => ({
      state: baseState(today, {
        status: "Paused",
        lastChangeDate: addDays(today, -5),
        lastChangeType: "Pause",
      }),
      constants: DEFAULT_CONSTANTS,
      dailyData: buildDailyRows(today, () => 1.85, 21),
      weeklyData: buildWeeklyRows(today, 2.1, 22),
    }),
  },
  {
    id: "seasonal",
    label: "Seasonal event starting today",
    blurb: "A known demand event kicks in — the target shifts on schedule.",
    build: (today) => ({
      state: baseState(today, {
        seasonality: {
          active: "Y",
          direction: "Up",
          startDate: today,
          durationDays: 10,
          adjustmentSize: 0.15,
          baselineTargetRoas: 2.2,
        },
      }),
      constants: DEFAULT_CONSTANTS,
      dailyData: buildDailyRows(today, () => 2.22, 55),
      weeklyData: buildWeeklyRows(today, 2.22, 56),
    }),
  },
];

export function buildScenario(id: string, todayISO: string): AppData {
  const scenario = SCENARIOS.find((s) => s.id === id) ?? SCENARIOS[0];
  return scenario.build(todayISO);
}
