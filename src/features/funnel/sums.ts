import type { AccountsFile } from '@/features/accounts/schema';
import type { Screen } from '@/features/screens/schema';
import { localDate } from '@/lib/local-date';
import { FUNNEL_STEPS, FUNNEL_TIME_ZONE, OWN_CHANNEL, type Activity, type FunnelFile, type FunnelStep } from './schema';

/**
 * The team's funnel page, worked out from the funnel store, accounts and screens (MT-36). Pure: the page reads the
 * three documents and passes them in. Restaurants set up before the funnel shipped get the steps their data
 * already shows (signed up, set up, TV connected), and the earliest time wins. Test restaurants and restaurants
 * no longer in accounts leave every count.
 */

/** The periods the funnel can show, in days. */
export const FUNNEL_PERIODS = [7, 30, 90] as const;
export const ACTIVE_WEEKS = 8;

/** Steps nothing records yet, shown without a count: look picked until MT-34 records it, paid until billing (MT-33). */
export const UNCOUNTED_STEPS: ReadonlySet<FunnelStep> = new Set<FunnelStep>(['look', 'paid']);

const DAY_MS = 24 * 60 * 60 * 1000;

export interface FunnelSources {
  readonly funnel: FunnelFile;
  readonly accounts: Pick<AccountsFile, 'users' | 'restaurants' | 'members'>;
  readonly screens: readonly Pick<Screen, 'restaurantId' | 'links'>[];
}

export interface FunnelOptions {
  readonly now: Date;
  /** Restaurants that signed up in the last this many days. */
  readonly days: number;
  /** One channel (OWN_CHANNEL, or a rep from MT-35), or every channel when left out. */
  readonly channel?: string;
}

export interface StepCount {
  readonly step: FunnelStep;
  /** Restaurants that reached this step or a later one; null for a step not counted yet. */
  readonly count: number | null;
  /** The count over the counted step before it; null for the first step, or when the step before is zero. */
  readonly share: number | null;
}

export interface FirstScreenRow {
  readonly restaurantId: string;
  readonly name: string;
  readonly channel: string;
  /** From sign-up to the first screen on air; null while not there yet. */
  readonly ms: number | null;
  /** The furthest counted step reached: where it stopped, if it isn't on air. */
  readonly reached: FunnelStep;
}

export interface ActiveWeek {
  /** The week's Monday, India time. */
  readonly weekStart: string;
  /** Restaurants set up by the week's end: what the shares are out of. */
  readonly restaurants: number;
  /** Restaurants where someone changed something that week. */
  readonly changed: number;
  /** Restaurants where someone used a quick action (MT-25) that week. */
  readonly quick: number;
}

export interface FunnelReport {
  readonly steps: readonly StepCount[];
  /** The counted step that loses the most restaurants from the one before it; null when none is lost. */
  readonly biggestDrop: FunnelStep | null;
  readonly medianToFirstScreenMs: number | null;
  /** The period's restaurants, slowest first: those not on air yet (longest waiting first), then the slowest times. */
  readonly restaurants: readonly FirstScreenRow[];
  /** The last ACTIVE_WEEKS weeks, oldest first; the last one is this week so far. */
  readonly weeks: readonly ActiveWeek[];
  /** Restaurants marked as test, so the page can put them back. */
  readonly tests: readonly { readonly restaurantId: string; readonly name: string }[];
}

interface History {
  readonly restaurantId: string;
  readonly name: string;
  readonly channel: string;
  readonly test: boolean;
  /** Epoch milliseconds. Every restaurant has signed-up and set-up. */
  readonly steps: Partial<Record<FunnelStep, number>>;
  readonly active: Readonly<Record<string, Activity>>;
}

const COUNTED_STEPS = FUNNEL_STEPS.filter((step) => !UNCOUNTED_STEPS.has(step));
const stepIndex = (step: FunnelStep): number => FUNNEL_STEPS.indexOf(step);
const indiaDay = (at: number): string => localDate(new Date(at), FUNNEL_TIME_ZONE);
const addDays = (day: string, days: number): string => new Date(Date.parse(`${day}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
const earliest = (a: number | undefined, b: number | undefined): number | undefined => (a === undefined ? b : b === undefined ? a : Math.min(a, b));

/** Reaching a step counts every step before it, so a TV that went on air from a link still counts as connected. */
function furthest(steps: History['steps']): FunnelStep {
  return [...COUNTED_STEPS].reverse().find((step) => steps[step] !== undefined) ?? 'signed-up';
}

/** What the data already shows: sign-up is the first member's account, TV connected the first TV link. */
function derivedSteps(sources: FunnelSources, restaurant: FunnelSources['accounts']['restaurants'][number]): Partial<Record<FunnelStep, number>> {
  const founder = sources.accounts.members.filter((member) => member.restaurantId === restaurant.id).sort((a, b) => a.addedAt.localeCompare(b.addedAt))[0];
  const signedUp = sources.accounts.users.find((user) => user.id === founder?.userId)?.createdAt ?? restaurant.createdAt;
  const links = sources.screens.filter((screen) => screen.restaurantId === restaurant.id).flatMap((screen) => screen.links.map((link) => Date.parse(link.createdAt)));
  return { 'signed-up': Date.parse(signedUp), 'set-up': Date.parse(restaurant.createdAt), ...(links.length > 0 ? { tv: Math.min(...links) } : {}) };
}

function histories(sources: FunnelSources): readonly History[] {
  return sources.accounts.restaurants.map((restaurant) => {
    const recorded = sources.funnel.restaurants[restaurant.id];
    const derived = derivedSteps(sources, restaurant);
    const steps = Object.fromEntries(
      FUNNEL_STEPS.flatMap((step) => {
        const at = recorded?.steps[step];
        const first = earliest(derived[step], at === undefined ? undefined : Date.parse(at));
        return first === undefined ? [] : [[step, first]];
      }),
    );
    return { restaurantId: restaurant.id, name: restaurant.name, channel: recorded?.channel ?? OWN_CHANNEL, test: recorded?.test ?? false, steps, active: recorded?.active ?? {} };
  });
}

/** People counted as signed up with no restaurant: still in accounts, and not a member anywhere. */
function pendingSignUps(sources: FunnelSources, from: number, to: number): number {
  const users = new Set(sources.accounts.users.map((user) => user.id));
  const members = new Set(sources.accounts.members.map((member) => member.userId));
  return Object.entries(sources.funnel.signups).filter(([userId, at]) => users.has(userId) && !members.has(userId) && Date.parse(at) > from && Date.parse(at) <= to).length;
}

function stepCounts(cohort: readonly History[], pending: number): readonly StepCount[] {
  const reached = cohort.map((history) => stepIndex(furthest(history.steps)));
  const counts: StepCount[] = [];
  let previous: number | null = null;
  for (const step of FUNNEL_STEPS) {
    if (UNCOUNTED_STEPS.has(step)) {
      counts.push({ step, count: null, share: null });
      continue;
    }
    const count = reached.filter((index) => index >= stepIndex(step)).length + (step === 'signed-up' ? pending : 0);
    counts.push({ step, count, share: previous ? count / previous : null });
    previous = count;
  }
  return counts;
}

function biggestDrop(steps: readonly StepCount[]): FunnelStep | null {
  const counted = steps.filter((entry): entry is StepCount & { readonly count: number } => entry.count !== null);
  let drop: { readonly step: FunnelStep; readonly lost: number } | null = null;
  for (const [index, entry] of counted.entries()) {
    const lost = index === 0 ? 0 : counted[index - 1].count - entry.count;
    if (lost > (drop?.lost ?? 0)) drop = { step: entry.step, lost };
  }
  return drop?.step ?? null;
}

function firstScreens(cohort: readonly History[]): readonly FirstScreenRow[] {
  const waiting = cohort.filter((history) => history.steps['on-air'] === undefined).sort((a, b) => (a.steps['signed-up'] ?? 0) - (b.steps['signed-up'] ?? 0));
  const onAir = cohort.filter((history) => history.steps['on-air'] !== undefined);
  const timed = (history: History): number => (history.steps['on-air'] ?? 0) - (history.steps['signed-up'] ?? 0);
  return [...waiting, ...onAir.sort((a, b) => timed(b) - timed(a))].map((history) => ({
    restaurantId: history.restaurantId,
    name: history.name,
    channel: history.channel,
    ms: history.steps['on-air'] === undefined ? null : timed(history),
    reached: furthest(history.steps),
  }));
}

function median(values: readonly number[]): number | null {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length === 0) return null;
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/** Monday-to-Sunday weeks in India time, the last one holding today. */
function activeWeeks(restaurants: readonly History[], now: Date): readonly ActiveWeek[] {
  const today = localDate(now, FUNNEL_TIME_ZONE);
  const monday = addDays(today, -((new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7));
  return Array.from({ length: ACTIVE_WEEKS }, (_, index) => {
    const weekStart = addDays(monday, (index - ACTIVE_WEEKS + 1) * 7);
    const weekEnd = addDays(weekStart, 6);
    const marks = (history: History): readonly Activity[] => Object.entries(history.active).flatMap(([day, activity]) => (day >= weekStart && day <= weekEnd ? [activity] : []));
    const setUpBy = (history: History): boolean => history.steps['set-up'] !== undefined && indiaDay(history.steps['set-up']) <= weekEnd;
    return {
      weekStart,
      restaurants: restaurants.filter((history) => setUpBy(history) || marks(history).length > 0).length,
      changed: restaurants.filter((history) => marks(history).length > 0).length,
      quick: restaurants.filter((history) => marks(history).includes('quick')).length,
    };
  });
}

export function funnelReport(sources: FunnelSources, { now, days, channel }: FunnelOptions): FunnelReport {
  const all = histories(sources);
  const counted = all.filter((history) => !history.test && (channel === undefined || history.channel === channel));
  const to = now.getTime();
  const from = to - days * DAY_MS;
  const cohort = counted.filter((history) => (history.steps['signed-up'] ?? 0) > from && (history.steps['signed-up'] ?? 0) <= to);
  const pending = channel === undefined || channel === OWN_CHANNEL ? pendingSignUps(sources, from, to) : 0;
  const steps = stepCounts(cohort, pending);
  const restaurants = firstScreens(cohort);
  return {
    steps,
    biggestDrop: biggestDrop(steps),
    medianToFirstScreenMs: median(restaurants.flatMap((row) => (row.ms === null ? [] : [row.ms]))),
    restaurants,
    weeks: activeWeeks(counted, now),
    tests: all.filter((history) => history.test).map(({ restaurantId, name }) => ({ restaurantId, name })),
  };
}
