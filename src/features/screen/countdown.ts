import type { Promo } from './types';

/** The time left a promo shows near its end (MT-26), like "Ends in 40 min". Pure, so every TV in a shop shows the same. */

/** The countdown shows only in a promo's last three hours (the PRD's starting value). */
export const COUNTDOWN_WINDOW_MS = 3 * 60 * 60 * 1000;
const MINUTE_MS = 60_000;

/** The text at `nowMs`, or null when the promo has no countdown, isn't near its end, or has ended. */
export function countdownText(promo: Pick<Promo, 'endsAt' | 'countdown'>, nowMs: number): string | null {
  if (!promo.countdown || promo.endsAt === undefined) return null;
  const left = promo.endsAt - nowMs;
  if (left <= 0 || left > COUNTDOWN_WINDOW_MS) return null;
  // Rounded up, so it never says 0 while the promo is still on.
  const minutes = Math.ceil(left / MINUTE_MS);
  if (minutes < 60) return `Ends in ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `Ends in ${hours} h` : `Ends in ${hours} h ${rest} min`;
}
