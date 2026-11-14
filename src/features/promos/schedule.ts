import { showsAt, type Daypart } from '@/features/menu/dayparts';
import type { LocalClock } from '@/lib/local-date';

/** When a promo plays, by the outlet's clock. Pure, so the Promos page, the TVs and the tests agree. */

export interface PromoSchedule {
  /** YYYY-MM-DDTHH:mm in the outlet's time; null starts at once. */
  readonly startsAt: string | null;
  /** Null never ends. */
  readonly endsAt: string | null;
  readonly daypart: Daypart | null;
}

export type ScheduleState = { readonly state: 'ended' } | { readonly state: 'starts'; readonly at: string } | { readonly state: 'playing' };

const DAY_MS = 24 * 60 * 60 * 1000;
const pad = (value: number): string => String(value).padStart(2, '0');
const timeOfDay = (minute: number): string => `${pad(Math.floor(minute / 60))}:${pad(minute % 60)}`;
const midnight = (date: string): number => Date.parse(`${date}T00:00:00Z`);
const addDays = (date: string, days: number): string => new Date(midnight(date) + days * DAY_MS).toISOString().slice(0, 10);

/** The clock as a local time, YYYY-MM-DDTHH:mm. */
export const clockStamp = (clock: LocalClock): string => `${clock.today}T${timeOfDay(clock.minute)}`;

/** The outlet's clock at a local time. */
export function clockAt(stamp: string): LocalClock {
  const [date, time] = stamp.split('T');
  const [hours, minutes] = time.split(':').map(Number);
  return { today: date, weekday: new Date(midnight(date)).getUTCDay(), minute: hours * 60 + minutes };
}

/** The first minute at or after `from` that the daypart is on; `from` itself with no daypart. */
export function firstShowing(daypart: Daypart | null, from: string): string {
  if (!daypart || showsAt(daypart, clockAt(from))) return from;
  const { today, weekday } = clockAt(from);
  // A week and a day covers every daypart: each has at least one day.
  for (let ahead = 0; ahead <= 7; ahead += 1) {
    const start = `${addDays(today, ahead)}T${timeOfDay(daypart.from)}`;
    if (daypart.days.includes((weekday + ahead) % 7) && start > from) return start;
  }
  throw new Error('A daypart needs at least one day.');
}

/** When a promo playing now stops: its end or, sooner, the end of today's run of its times. Null if neither. */
export function playingUntil(schedule: PromoSchedule, clock: LocalClock): string | null {
  const { daypart } = schedule;
  // A late daypart that is on before midnight ends tomorrow; in the small hours it ends today.
  const windowEnd = daypart ? `${daypart.from > daypart.to && clock.minute >= daypart.from ? addDays(clock.today, 1) : clock.today}T${timeOfDay(daypart.to)}` : null;
  const ends = [schedule.endsAt, windowEnd].filter((end): end is string => end !== null);
  return ends.length > 0 ? ends.reduce((soonest, end) => (end < soonest ? end : soonest)) : null;
}

/** Ended (including when it can never play again before its end), starting later, or playing now. */
export function scheduleState(schedule: PromoSchedule, clock: LocalClock): ScheduleState {
  const now = clockStamp(clock);
  const next = firstShowing(schedule.daypart, schedule.startsAt !== null && schedule.startsAt > now ? schedule.startsAt : now);
  if (schedule.endsAt !== null && next >= schedule.endsAt) return { state: 'ended' };
  return next === now ? { state: 'playing' } : { state: 'starts', at: next };
}
