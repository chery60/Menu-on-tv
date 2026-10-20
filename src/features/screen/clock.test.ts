import { describe, expect, it } from 'vitest';
import { CLOCK_TOLERANCE_MS, estimateClockOffset, MAX_TRUSTED_ROUND_TRIP_MS, nextClockOffset } from './clock';

describe('clock correction', () => {
  it('finds how far a TV clock is behind the server', () => {
    // TV is 90 s slow: it sends at 1,000, the server answers at 91,100, the reply lands at 1,200.
    expect(estimateClockOffset({ sentAt: 1_000, serverNow: 91_100, receivedAt: 1_200 })).toBe(90_000);
  });

  it('corrects a TV that runs fast, too', () => {
    expect(nextClockOffset(0, { sentAt: 50_000, serverNow: 20_000, receivedAt: 50_100 })).toBe(-30_050);
  });

  it('ignores slow round trips, where the server time is too uncertain', () => {
    expect(nextClockOffset(42, { sentAt: 0, serverNow: 99_999, receivedAt: MAX_TRUSTED_ROUND_TRIP_MS + 1 })).toBe(42);
    expect(nextClockOffset(42, { sentAt: 10, serverNow: 99_999, receivedAt: 5 })).toBe(42);
  });

  it('keeps the current offset for differences too small to matter', () => {
    expect(nextClockOffset(1_000, { sentAt: 0, serverNow: 1_000 + CLOCK_TOLERANCE_MS - 1 + 50, receivedAt: 100 })).toBe(1_000);
  });
});
