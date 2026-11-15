'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { countdownText } from '../countdown';

/** Minutes are all a guest reads from the queue, so the time left is checked twice a minute, never shown in seconds. */
const TICK_MS = 30_000;

/**
 * Milliseconds to add to this device's clock, from the heartbeat. The screen stage provides the offset its loop drops
 * ended promos by, so the countdown reaches zero as the promo leaves, even on a TV whose clock is off.
 */
export const ClockOffsetContext = createContext(0);

/** "Ends in 40 min" on a promo with an end, in its last three hours (countdown.ts). Nothing on the server, so it can't disagree with the TV's clock. */
export function PromoCountdown({ endsAt }: { readonly endsAt: number }) {
  const clockOffsetMs = useContext(ClockOffsetContext);
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = (): void => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, TICK_MS);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, []);
  const text = now === null ? null : countdownText({ endsAt, countdown: true }, now + clockOffsetMs);
  return text ? <p className="scr-countdown">{text}</p> : null;
}
