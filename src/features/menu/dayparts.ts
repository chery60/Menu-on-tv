import { z } from 'zod';
import type { LocalClock } from '@/lib/local-date';
import { joinWords } from '@/lib/words';

/**
 * Dayparts (tracker MT-24): a category can show only at set times, like breakfast from 7:00 to 11:00.
 * Times are minutes of the outlet's day; days are 0 (Sunday) to 6. A daypart that ends before it starts
 * runs past midnight, and the small hours count as the night it started.
 */

const MINUTES_IN_DAY = 24 * 60;
const minute = z.number().int().min(0).max(MINUTES_IN_DAY - 1);

export const daypartSchema = z
  .object({
    from: minute,
    to: minute,
    days: z.array(z.number().int().min(0).max(6)).min(1, { error: 'Pick at least one day.' }).max(7),
  })
  .refine((daypart) => daypart.from !== daypart.to, { error: 'Pick an end time that isn’t the start time.' })
  .transform((daypart) => ({ ...daypart, days: [...new Set(daypart.days)].sort((a, b) => a - b) }));

export type Daypart = z.infer<typeof daypartSchema>;

export function showsAt(daypart: Daypart | null, clock: LocalClock): boolean {
  if (!daypart) return true;
  const { from, to, days } = daypart;
  if (from < to) return days.includes(clock.weekday) && clock.minute >= from && clock.minute < to;
  if (clock.minute >= from) return days.includes(clock.weekday);
  return clock.minute < to && days.includes((clock.weekday + 6) % 7);
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
/** The week as owners read it, Monday first. */
const WEEK = [1, 2, 3, 4, 5, 6, 0];

/** A minute of the day as owners say it: "7 am", "12:30 pm". */
export function clockTime(minutes: number): string {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const shown = `${hour % 12 || 12}${minute ? `:${String(minute).padStart(2, '0')}` : ''}`;
  return `${shown} ${hour < 12 ? 'am' : 'pm'}`;
}

function describeDays(days: readonly number[]): string {
  if (days.length === 7) return 'every day';
  const ordered = WEEK.filter((day) => days.includes(day));
  const positions = ordered.map((day) => WEEK.indexOf(day));
  const unbroken = positions.every((position, index) => index === 0 || position === positions[index - 1] + 1);
  if (unbroken && ordered.length > 2) return `${DAY_NAMES[ordered[0]]} to ${DAY_NAMES[ordered[ordered.length - 1]]}`;
  return joinWords(ordered.map((day) => DAY_NAMES[day]));
}

/** "7 am to 11 am, every day": how the editor shows a category's daypart. */
export function describeDaypart(daypart: Daypart): string {
  return `${clockTime(daypart.from)} to ${clockTime(daypart.to)}, ${describeDays(daypart.days)}`;
}
