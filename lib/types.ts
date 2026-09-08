export type CampaignStatus = "Active" | "Paused";

export type LastChangeType =
  | "None"
  | "Target ROAS Change"
  | "Budget Change"
  | "Pause"
  | "Re-enable"
  | "Seasonality Start"
  | "Seasonality End";

export type SeasonDirection = "Up" | "Down";

/** One row of daily performance data, keyed by the date the SPEND occurred
 * (not the date revenue posted) — this is what lets the age-adjustment work. */
export interface DailyRow {
  date: string; // ISO yyyy-mm-dd
  spend: number;
  revenue: number; // revenue-to-date attributed to this day's spend, as observed as of "today"
  orders: number; // orders-to-date attributed to this day's spend
}

export interface WeeklyRow {
  weekStarting: string; // ISO yyyy-mm-dd
  spend: number;
  revenue: number;
}

export interface Seasonality {
  active: "Y" | "N";
  direction: SeasonDirection;
  startDate: string; // ISO yyyy-mm-dd
  durationDays: number;
  adjustmentSize: number; // fraction, e.g. 0.15
  baselineTargetRoas: number; // fraction, e.g. 2.20
}

/** Everything a team member edits during a normal review, plus the seasonality override. */
export interface CampaignState {
  today: string; // ISO yyyy-mm-dd
  status: CampaignStatus;
  currentTargetRoas: number; // fraction, e.g. 2.20
  currentBudget: number; // dollars/day
  lastChangeDate: string; // ISO yyyy-mm-dd
  lastChangeType: LastChangeType;
  seasonality: Seasonality;
}

/** System constants — set once, rarely revisited. */
export interface SystemConstants {
  requiredTargetRoas: number;
  matureBreakeven: number;
  floorTargetRoas: number;
  ceilingTargetRoas: number;
  stepSize: number;
  budgetStepSize: number;
  minOrders: number;
  minOrdersFast: number;
  fastSevereMultiple: number;
  waitDays: number;
  waitOrders: number;
  pauseMinDays: number;
  budgetUtilThreshold: number;
  budgetUtilDaysNeeded: number;
  bandLowerOffset: number;
  bandUpperOffset: number;
  primaryWindowDays: number;
  fallbackWindowDays: number;
  fastWindowDays: number;
}

export interface AppData {
  state: CampaignState;
  constants: SystemConstants;
  dailyData: DailyRow[];
  weeklyData: WeeklyRow[];
}

export type DecisionCase =
  | "SAFETY_PAUSE"
  | "PAUSED_HOLD"
  | "PAUSED_REENABLE"
  | "SEASON_START"
  | "SEASON_END"
  | "SEASON_MID"
  | "WAIT_HOLD"
  | "DATA_INSUFFICIENT"
  | "SEVERE_PAUSE"
  | "TIGHTEN"
  | "NORMAL"
  | "BUDGET_INCREASE"
  | "LOOSEN";

export interface WindowStats {
  spend: number;
  projectedRevenue: number;
  orders: number;
  adjRoas: number;
}

export interface EngineResult {
  today: string;
  fast: WindowStats;
  primary: WindowStats;
  fallback: WindowStats;
  windowUsed: "Primary (14d)" | "Fallback (30d)" | "Insufficient";
  adjRoasUsed: number;
  ordersUsed: number;
  daysSinceChange: number;
  ordersSinceChange: number;
  waitOk: boolean;
  paused: boolean;
  daysPaused: number;
  pauseWaitOk: boolean;
  safetyTrigger: boolean;
  seasonEndDate: string;
  seasonActiveToday: boolean;
  seasonStartsToday: boolean;
  seasonEndsToday: boolean;
  daysAtBudgetCap: number;
  budgetCapped: boolean;
  normalBandLower: number;
  normalBandUpper: number;
  decisionCase: DecisionCase;
  action: string;
  value: string;
  reason: string;
  reviewCadence: string;
  waitPeriod: string;
  /** The exact state patch "Apply this recommendation" would write — null when the
   * decision case is a no-op (NORMAL, *_HOLD, DATA_INSUFFICIENT, SEASON_MID). Built from
   * the same numbers used in `value`, so applying it can never drift from what's displayed. */
  appliedState: Partial<CampaignState> | null;
}
