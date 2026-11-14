import { describe, expect, it } from 'vitest';
import { COUNTDOWN_WINDOW_MS, countdownText } from './countdown';

const END = Date.parse('2026-11-16T15:30:00.000Z');
const MINUTE = 60_000;
const before = (ms: number) => END - ms;

describe('countdownText', () => {
  it('counts down in the last three hours, rounding up so it never says 0 while the promo is on', () => {
    const promo = { endsAt: END, countdown: true };
    expect(countdownText(promo, before(40 * MINUTE))).toBe('Ends in 40 min');
    expect(countdownText(promo, before(39 * MINUTE + 1))).toBe('Ends in 40 min');
    expect(countdownText(promo, before(1000))).toBe('Ends in 1 min');
    expect(countdownText(promo, before(60 * MINUTE))).toBe('Ends in 1 h');
    expect(countdownText(promo, before(135 * MINUTE))).toBe('Ends in 2 h 15 min');
    expect(countdownText(promo, before(COUNTDOWN_WINDOW_MS))).toBe('Ends in 3 h');
  });

  it('shows nothing before its last three hours, at its end, or after', () => {
    const promo = { endsAt: END, countdown: true };
    expect(countdownText(promo, before(COUNTDOWN_WINDOW_MS + 1))).toBeNull();
    expect(countdownText(promo, END)).toBeNull();
    expect(countdownText(promo, END + MINUTE)).toBeNull();
  });

  it('shows nothing for a promo without a countdown or without an end', () => {
    expect(countdownText({ endsAt: END, countdown: false }, before(MINUTE))).toBeNull();
    expect(countdownText({ endsAt: END }, before(MINUTE))).toBeNull();
    expect(countdownText({ countdown: true }, before(MINUTE))).toBeNull();
  });
});
