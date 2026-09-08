import { AppData, SystemConstants } from "./types";
import { addDays } from "./dateUtils";
import { PCT_OBSERVED } from "./engine";

export const DEFAULT_CONSTANTS: SystemConstants = {
  requiredTargetRoas: 2.2,
  matureBreakeven: 2.001,
  floorTargetRoas: 2.05,
  ceilingTargetRoas: 2.6,
  stepSize: 0.1,
  budgetStepSize: 0.25,
  minOrders: 30,
  minOrdersFast: 5,
  fastSevereMultiple: 0.9,
  waitDays: 7,
  waitOrders: 30,
  pauseMinDays: 3,
  budgetUtilThreshold: 0.95,
  budgetUtilDaysNeeded: 3,
  bandLowerOffset: 0.1,
  bandUpperOffset: 0.15,
  primaryWindowDays: 14,
  fallbackWindowDays: 30,
  fastWindowDays: 3,
};

// Simple seeded PRNG so the sample data is reproducible (mirrors the workbook's random.seed(42)).
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

export function buildSampleData(todayISO: string): AppData {
  const rand = mulberry32(42);
  const uniform = (lo: number, hi: number) => lo + rand() * (hi - lo);

  const dailyData = [];
  for (let i = 0; i < 21; i++) {
    const daysFromEnd = 20 - i; // 0 = most recent (today)
    const date = addDays(todayISO, -daysFromEnd);
    const trueRoas = daysFromEnd <= 4 ? uniform(1.9, 2.05) : uniform(2.15, 2.35);
    const spend = Math.round(uniform(4700, 5300));
    const age = daysFromEnd;
    const pctObs = age >= 8 ? 1.0 : PCT_OBSERVED[age];
    const noise = uniform(0.97, 1.03);
    const revenue = Math.round(spend * trueRoas * pctObs * noise * 100) / 100;
    const orders = Math.max(1, Math.round(revenue / AOV));
    dailyData.push({ date, spend, revenue, orders });
  }

  const weeklyData = [];
  const weekStartBase = addDays(todayISO, -20 - 7 * 6);
  for (let i = 0; i < 6; i++) {
    const weekStarting = addDays(weekStartBase, 7 * i);
    const spend = Math.round(uniform(33000, 37000));
    const roas = uniform(2.18, 2.3);
    const revenue = Math.round(spend * roas);
    weeklyData.push({ weekStarting, spend, revenue });
  }

  return {
    state: {
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
    },
    constants: DEFAULT_CONSTANTS,
    dailyData,
    weeklyData,
  };
}
