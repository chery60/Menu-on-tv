'use client';

import { useEffect, useState } from 'react';
import { slideAt, type Slide, type SlideAt } from '../loop';

/** Re-render only when a slide ends, so cheap TVs do no work between slides. */
const BOUNDARY_SLACK_MS = 30;
const MIN_WAIT_MS = 50;

const FROM_ZERO: readonly number[] = [];

export interface LoopPositions {
  readonly positions: readonly (SlideAt | null)[];
  /** True until the first slide change after mounting: the jump to the live slide shouldn't animate. */
  readonly syncing: boolean;
}

/**
 * Where each loop is right now, by the wall clock (corrected by `clockOffsetMs` from the heartbeat), each counted
 * from its entry in `startsMs` (zero when missing; pass a stable array).
 * Returns null positions until mounted, so the server and the first client render agree (slide 0),
 * then jumps to the live slide.
 */
export function useLoopPositions(loops: readonly (readonly Slide[])[], clockOffsetMs = 0, startsMs: readonly number[] = FROM_ZERO): LoopPositions {
  const [now, setNow] = useState<number | null>(null);
  const [ticks, setTicks] = useState(0);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = (): void => {
      const current = Date.now() + clockOffsetMs;
      setNow(current);
      setTicks((count) => count + 1);
      const ends = loops.flatMap((loop, index) => (loop.length > 0 ? [slideAt(loop, current, startsMs[index]).endsAt] : []));
      const next = ends.length > 0 ? Math.min(...ends) : current + 60_000;
      timer = setTimeout(tick, Math.max(MIN_WAIT_MS, next - current + BOUNDARY_SLACK_MS));
    };
    timer = setTimeout(tick, 0);
    return () => clearTimeout(timer);
  }, [loops, clockOffsetMs, startsMs]);

  return {
    positions: loops.map((loop, index) => (loop.length > 0 && now !== null ? slideAt(loop, now, startsMs[index]) : null)),
    syncing: ticks <= 1,
  };
}
