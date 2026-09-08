import { AppData, CampaignState, DailyRow, DecisionCase, EngineResult, WindowStats } from "./types";
import { addDays, daysBetween, parseISO } from "./dateUtils";

/** Conversion-lag curve from the case study: share of a spend-day's eventual
 * (mature) revenue that has posted by that day's age. Age 8+ = fully mature. */
export const PCT_OBSERVED: number[] = [0.492, 0.577, 0.614, 0.641, 0.663, 0.679, 0.693, 0.710];

export function pctObserved(age: number): number {
  if (age < 0) return 1; // future-dated row, shouldn't happen; treat as mature to avoid blowups
  if (age >= 8) return 1.0;
  return PCT_OBSERVED[age];
}

export function ageOf(date: string, today: string): number {
  return daysBetween(date, today);
}

function windowStats(dailyData: DailyRow[], today: string, maxAge: number): WindowStats {
  let spend = 0;
  let projectedRevenue = 0;
  let orders = 0;
  for (const row of dailyData) {
    const age = ageOf(row.date, today);
    if (age < 0 || age > maxAge) continue;
    spend += row.spend;
    projectedRevenue += row.revenue / pctObserved(age);
    orders += row.orders;
  }
  const adjRoas = spend > 0 ? projectedRevenue / spend : 0;
  return { spend, projectedRevenue, orders, adjRoas };
}

function fmtPct(x: number): string {
  return `${Math.round(x * 100)}%`;
}
function fmtUsd(x: number): string {
  return `$${Math.round(x).toLocaleString("en-US")}`;
}

export function runEngine(data: AppData): EngineResult {
  const { state, constants: c, dailyData } = data;
  const today = state.today;

  const fast = windowStats(dailyData, today, c.fastWindowDays - 1);
  const primary = windowStats(dailyData, today, c.primaryWindowDays - 1);
  const fallback = windowStats(dailyData, today, c.fallbackWindowDays - 1);

  let windowUsed: EngineResult["windowUsed"];
  let adjRoasUsed: number;
  let ordersUsed: number;
  if (primary.orders >= c.minOrders) {
    windowUsed = "Primary (14d)";
    adjRoasUsed = primary.adjRoas;
    ordersUsed = primary.orders;
  } else if (fallback.orders >= c.minOrders) {
    windowUsed = "Fallback (30d)";
    adjRoasUsed = fallback.adjRoas;
    ordersUsed = fallback.orders;
  } else {
    windowUsed = "Insufficient";
    adjRoasUsed = 0;
    ordersUsed = primary.orders;
  }

  const daysSinceChange = daysBetween(state.lastChangeDate, today);
  const ordersSinceChange = dailyData.reduce((sum, row) => {
    return row.date > state.lastChangeDate ? sum + row.orders : sum;
  }, 0);

  const changeTypeIsGated =
    state.lastChangeType === "Target ROAS Change" || state.lastChangeType === "Budget Change";
  const waitOk =
    !changeTypeIsGated || (daysSinceChange >= c.waitDays && ordersSinceChange >= c.waitOrders);

  const paused = state.status === "Paused";
  const daysPaused = paused ? daysBetween(state.lastChangeDate, today) : 0;
  const pauseWaitOk = daysPaused >= c.pauseMinDays;

  const safetyRaw = fast.adjRoas < c.matureBreakeven * c.fastSevereMultiple && fast.orders >= c.minOrdersFast;
  const safetyTrigger = !paused && safetyRaw;

  const seasonEndDate = addDays(state.seasonality.startDate, state.seasonality.durationDays - 1);
  const seasonActiveToday =
    state.seasonality.active === "Y" &&
    parseISO(today) >= parseISO(state.seasonality.startDate) &&
    parseISO(today) <= parseISO(seasonEndDate);
  const seasonStartsToday = today === state.seasonality.startDate;
  const seasonEndsToday = today === seasonEndDate;

  let daysAtBudgetCap = 0;
  for (const row of dailyData) {
    const age = ageOf(row.date, today);
    if (age >= 0 && age <= 6 && row.spend >= state.currentBudget * c.budgetUtilThreshold) {
      daysAtBudgetCap++;
    }
  }
  const budgetCapped = daysAtBudgetCap >= c.budgetUtilDaysNeeded;

  const normalBandLower = c.requiredTargetRoas - c.bandLowerOffset;
  const normalBandUpper = c.requiredTargetRoas + c.bandUpperOffset;

  // ---- Master decision case: evaluated top to bottom, first match wins ----
  let decisionCase: DecisionCase;
  if (safetyTrigger) {
    decisionCase = "SAFETY_PAUSE";
  } else if (paused) {
    decisionCase = pauseWaitOk ? "PAUSED_REENABLE" : "PAUSED_HOLD";
  } else if (seasonActiveToday && seasonStartsToday) {
    decisionCase = "SEASON_START";
  } else if (seasonActiveToday && seasonEndsToday) {
    decisionCase = "SEASON_END";
  } else if (seasonActiveToday) {
    decisionCase = "SEASON_MID";
  } else if (!waitOk) {
    decisionCase = "WAIT_HOLD";
  } else if (windowUsed === "Insufficient") {
    decisionCase = "DATA_INSUFFICIENT";
  } else if (adjRoasUsed < c.matureBreakeven) {
    decisionCase = "SEVERE_PAUSE";
  } else if (adjRoasUsed < normalBandLower) {
    decisionCase = "TIGHTEN";
  } else if (adjRoasUsed <= normalBandUpper) {
    decisionCase = "NORMAL";
  } else if (adjRoasUsed > normalBandUpper && budgetCapped) {
    decisionCase = "BUDGET_INCREASE";
  } else {
    decisionCase = "LOOSEN";
  }

  // Rounded to basis points (4 decimal places on the fraction) so repeated apply
  // cycles can't accumulate binary floating-point drift (e.g. 2.2 + 0.1 !== 2.3000000000000003).
  const roundRoas = (v: number) => Math.round(v * 10000) / 10000;
  const roundUsd = (v: number) => Math.round(v);

  const newTighten = roundRoas(Math.min(state.currentTargetRoas + c.stepSize, c.ceilingTargetRoas));
  const newLoosen = roundRoas(Math.max(state.currentTargetRoas - c.stepSize, c.floorTargetRoas));
  const newBudget = roundUsd(state.currentBudget * (1 + c.budgetStepSize));
  const reenableTarget = roundRoas(state.currentTargetRoas + c.stepSize);
  const reenableBudget = roundUsd(state.currentBudget * 0.5);
  const seasonStartTarget = roundRoas(
    state.seasonality.direction === "Up"
      ? state.currentTargetRoas - state.seasonality.adjustmentSize
      : state.currentTargetRoas + state.seasonality.adjustmentSize
  );

  const waitDaysLeft = Math.max(0, c.waitDays - daysSinceChange);
  const waitOrdersLeft = Math.max(0, c.waitOrders - ordersSinceChange);
  const insuffNeeded = Math.max(0, c.minOrders - ordersUsed);

  // The exact state mutation "Apply this recommendation" performs, keyed off the same
  // numbers as VALUE above — no-op cases (NORMAL, *_HOLD, DATA_INSUFFICIENT, SEASON_MID)
  // are intentionally absent so the UI knows not to offer an Apply button for them.
  const APPLIED_STATE: Partial<Record<DecisionCase, Partial<CampaignState>>> = {
    SAFETY_PAUSE: { status: "Paused", lastChangeDate: today, lastChangeType: "Pause" },
    SEVERE_PAUSE: { status: "Paused", lastChangeDate: today, lastChangeType: "Pause" },
    PAUSED_REENABLE: {
      status: "Active",
      currentTargetRoas: reenableTarget,
      currentBudget: reenableBudget,
      lastChangeDate: today,
      lastChangeType: "Re-enable",
    },
    SEASON_START: {
      currentTargetRoas: seasonStartTarget,
      lastChangeDate: today,
      lastChangeType: "Seasonality Start",
      seasonality: { ...state.seasonality, baselineTargetRoas: state.currentTargetRoas },
    },
    SEASON_END: {
      currentTargetRoas: state.seasonality.baselineTargetRoas,
      lastChangeDate: today,
      lastChangeType: "Seasonality End",
      seasonality: { ...state.seasonality, active: "N" },
    },
    TIGHTEN: { currentTargetRoas: newTighten, lastChangeDate: today, lastChangeType: "Target ROAS Change" },
    LOOSEN: { currentTargetRoas: newLoosen, lastChangeDate: today, lastChangeType: "Target ROAS Change" },
    BUDGET_INCREASE: { currentBudget: newBudget, lastChangeDate: today, lastChangeType: "Budget Change" },
  };

  const ACTION: Record<DecisionCase, string> = {
    SAFETY_PAUSE: "Pause the campaign",
    PAUSED_HOLD: "No action — remain paused",
    PAUSED_REENABLE: "Re-enable the campaign",
    SEASON_START: "Apply seasonality adjustment",
    SEASON_MID: "No action — seasonality adjustment in effect",
    SEASON_END: "Revert seasonality adjustment",
    WAIT_HOLD: "No action — wait",
    DATA_INSUFFICIENT: "No action — insufficient data",
    SEVERE_PAUSE: "Pause the campaign",
    TIGHTEN: "Increase Target ROAS",
    NORMAL: "No action",
    BUDGET_INCREASE: "Increase Budget",
    LOOSEN: "Decrease Target ROAS",
  };

  const VALUE: Record<DecisionCase, string> = {
    SAFETY_PAUSE: "Campaign status → Paused",
    PAUSED_HOLD: "No change (remain paused)",
    PAUSED_REENABLE: `Target ROAS → ${fmtPct(reenableTarget)}, Budget → ${fmtUsd(reenableBudget)}/day (ramp-up)`,
    SEASON_START: `Target ROAS → ${fmtPct(seasonStartTarget)} for ${state.seasonality.durationDays} days`,
    SEASON_MID: "No change",
    SEASON_END: `Target ROAS → ${fmtPct(state.seasonality.baselineTargetRoas)} (reverting to baseline)`,
    WAIT_HOLD: "No change",
    DATA_INSUFFICIENT: "No change",
    SEVERE_PAUSE: "Campaign status → Paused",
    TIGHTEN: `Target ROAS → ${fmtPct(newTighten)}`,
    NORMAL: "No change",
    BUDGET_INCREASE: `Budget → ${fmtUsd(newBudget)}/day`,
    LOOSEN: `Target ROAS → ${fmtPct(newLoosen)}`,
  };

  const REASON: Record<DecisionCase, string> = {
    SAFETY_PAUSE:
      "Last 3 days are tracking well below breakeven even after adjusting for conversion lag. Pausing now to stop losses while the issue is investigated.",
    PAUSED_HOLD: "Campaign is paused and the minimum pause period has not yet elapsed.",
    PAUSED_REENABLE: "Minimum pause period has elapsed. Restarting conservatively to confirm the issue is resolved.",
    SEASON_START:
      "A known seasonality event is starting. Adjusting the target ahead of time rather than reacting to the expected swing.",
    SEASON_MID: "Seasonality adjustment is active. Current swings are expected and are not a signal to act on.",
    SEASON_END: "Seasonality event has ended. Reverting to the standard target.",
    WAIT_HOLD: "A change was made recently. The algorithm needs more time and order volume to relearn before it can be judged.",
    DATA_INSUFFICIENT: "Not enough matured orders yet to reliably tell signal from normal noise.",
    SEVERE_PAUSE: "Even the more reliable matured window is below breakeven. This is a confirmed, sustained problem, not noise.",
    TIGHTEN: "Matured, lag-adjusted ROAS is running below the normal range around target. Tightening to protect margin.",
    NORMAL: "Matured, lag-adjusted ROAS is within the normal range around target. This is ordinary volatility.",
    BUDGET_INCREASE:
      "Efficiency is comfortably above target and spend is capped by budget. Raising the ceiling to capture more profitable volume.",
    LOOSEN:
      "Efficiency is comfortably above target with budget headroom. Loosening the target to responsibly spend more toward the goal of maximizing volume.",
  };

  const CADENCE: Record<DecisionCase, string> = {
    SAFETY_PAUSE: "Tomorrow (daily while paused)",
    PAUSED_HOLD: "Tomorrow",
    PAUSED_REENABLE: "Tomorrow (daily during ramp-up)",
    SEASON_START: "Tomorrow (safety check only during season)",
    SEASON_MID: "Tomorrow (safety check only)",
    SEASON_END: "In 7 days or after 30 new orders, whichever is later",
    WAIT_HOLD: `In ${waitDaysLeft} more day(s), or after ${waitOrdersLeft} more order(s) — whichever is later`,
    DATA_INSUFFICIENT: `After ${insuffNeeded} more matured order(s) accumulate`,
    SEVERE_PAUSE: "Tomorrow (daily while paused)",
    TIGHTEN: "In 7 days or after 30 new orders, whichever is later",
    NORMAL: "Tomorrow",
    BUDGET_INCREASE: "In 7 days or after 30 new orders, whichever is later",
    LOOSEN: "In 7 days or after 30 new orders, whichever is later",
  };

  const WAIT: Record<DecisionCase, string> = {
    SAFETY_PAUSE: "Minimum 3 days paused before re-enable is eligible",
    PAUSED_HOLD: "N/A — no new change made",
    PAUSED_REENABLE: "7 days matured AND 30 new orders before the next Target ROAS/Budget change",
    SEASON_START: "No manual wait — reverts automatically at the scheduled end date",
    SEASON_MID: "N/A — no new change made",
    SEASON_END: "7 days matured AND 30 new orders before the next Target ROAS/Budget change",
    WAIT_HOLD: "N/A — already inside the wait period from the prior change",
    DATA_INSUFFICIENT: "N/A — no new change made",
    SEVERE_PAUSE: "Minimum 3 days paused before re-enable is eligible",
    TIGHTEN: "7 days matured AND 30 new orders before the next change",
    NORMAL: "N/A — no new change made",
    BUDGET_INCREASE: "7 days matured AND 30 new orders before the next change",
    LOOSEN: "7 days matured AND 30 new orders before the next change",
  };

  return {
    today,
    fast,
    primary,
    fallback,
    windowUsed,
    adjRoasUsed,
    ordersUsed,
    daysSinceChange,
    ordersSinceChange,
    waitOk,
    paused,
    daysPaused,
    pauseWaitOk,
    safetyTrigger,
    seasonEndDate,
    seasonActiveToday,
    seasonStartsToday,
    seasonEndsToday,
    daysAtBudgetCap,
    budgetCapped,
    normalBandLower,
    normalBandUpper,
    decisionCase,
    action: ACTION[decisionCase],
    value: VALUE[decisionCase],
    reason: REASON[decisionCase],
    reviewCadence: CADENCE[decisionCase],
    waitPeriod: WAIT[decisionCase],
    appliedState: APPLIED_STATE[decisionCase] ?? null,
  };
}
