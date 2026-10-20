/** What a plan costs a month for a number of screens, from its per-screen price. */

export const SCREEN_RANGE = { min: 1, max: 20 } as const;

export interface PricedPlan {
  /** Rupees per screen a month. */
  readonly perScreen: number;
  /** The most screens the plan covers, when it is limited. */
  readonly maxScreens?: number;
}

export type MonthlyBill = { readonly available: true; readonly total: number } | { readonly available: false; readonly limit: number };

export function monthlyBill(plan: PricedPlan, screens: number): MonthlyBill {
  if (plan.maxScreens !== undefined && screens > plan.maxScreens) return { available: false, limit: plan.maxScreens };
  return { available: true, total: plan.perScreen * screens };
}

/** A slider or box's value as a whole number of screens within the range; anything unreadable is one screen. */
export function screensFrom(value: string): number {
  const screens = Math.round(Number(value));
  if (!Number.isFinite(screens)) return SCREEN_RANGE.min;
  return Math.min(SCREEN_RANGE.max, Math.max(SCREEN_RANGE.min, screens));
}
