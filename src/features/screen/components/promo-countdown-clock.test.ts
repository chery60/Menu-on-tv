// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ClockOffsetContext, PromoCountdown } from './promo-countdown';

const MINUTE = 60_000;
const END = Date.parse('2026-11-15T16:40:00+05:30');

/** The countdown's text 25 minutes before the end by the device's clock, with the heartbeat's offset when given. */
async function shown(clockOffsetMs?: number): Promise<string | null> {
  const countdown = createElement(PromoCountdown, { endsAt: END });
  const view = render(clockOffsetMs === undefined ? countdown : createElement(ClockOffsetContext.Provider, { value: clockOffsetMs }, countdown));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1);
  });
  return view.container.textContent || null;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(END - 25 * MINUTE);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('the countdown reads the clock the loop drops the promo by (MT-26)', () => {
  it('reads the device’s clock when there is no offset', async () => {
    expect(await shown()).toBe('Ends in 25 min');
    expect(await shown(0)).toBe('Ends in 25 min');
  });

  it('adds the heartbeat’s offset, so a TV running 10 minutes fast counts to the real end', async () => {
    expect(await shown(-10 * MINUTE)).toBe('Ends in 35 min');
  });

  it('is gone once the corrected clock passes the end, though the device’s clock hasn’t', async () => {
    expect(await shown(30 * MINUTE)).toBeNull();
  });
});
