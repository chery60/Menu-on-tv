/**
 * QA checks for MT-21's "Daily self-reload" and "Offline cache" lines (B3 and B2 in QA's MT-15 to MT-24 report):
 * a TV reloads at 4 am on its own clock only when the page can come back, and after a reload it plays the newest
 * bundle it has, whichever copy that is.
 */
import { describe, expect, it } from 'vitest';
import { msUntilNextReload, RELOAD_RETRY_MS, scheduleDailyReload } from './daily-reload';
import { isNewerBundle } from './newer-bundle';

const HOUR = 60 * 60 * 1000;
const at = (hour: number, minute = 0, second = 0) => new Date(2026, 10, 15, hour, minute, second);

/** A fake timer queue: runs the next scheduled callback and reports how long it waited. */
function timers() {
  const queue: { run: () => void; ms: number; cancelled: boolean }[] = [];
  return {
    schedule: (run: () => void, ms: number) => {
      const entry = { run, ms, cancelled: false };
      queue.push(entry);
      return () => {
        entry.cancelled = true;
      };
    },
    async next(): Promise<number | null> {
      const entry = queue.shift();
      if (!entry || entry.cancelled) return null;
      entry.run();
      await Promise.resolve();
      await Promise.resolve();
      return entry.ms;
    },
    pending: () => queue.filter((entry) => !entry.cancelled).length,
  };
}

describe('B3: the daily reload', () => {
  it('waits until 4 am on the TV’s clock, and a TV at exactly 4 am waits a whole day', () => {
    expect(msUntilNextReload(at(3, 59, 59))).toBe(1000);
    expect(msUntilNextReload(at(4))).toBe(24 * HOUR);
    expect(msUntilNextReload(at(4, 0, 1))).toBe(24 * HOUR - 1000);
    expect(msUntilNextReload(at(23, 30))).toBe(4.5 * HOUR);
  });

  it('keeps asking every 30 minutes while the server is down, and reloads once when it answers', async () => {
    const clock = timers();
    const answers = [false, false, true];
    let reloads = 0;
    scheduleDailyReload({ isReachable: async () => answers.shift() ?? true, reload: () => (reloads += 1), now: () => at(1), schedule: clock.schedule });

    expect(await clock.next()).toBe(3 * HOUR);
    expect(reloads).toBe(0);
    expect(await clock.next()).toBe(RELOAD_RETRY_MS);
    expect(reloads).toBe(0);
    expect(await clock.next()).toBe(RELOAD_RETRY_MS);
    expect(reloads).toBe(1);
    expect(RELOAD_RETRY_MS).toBe(30 * 60 * 1000);
    expect(clock.pending()).toBe(0);
  });

  it('never reloads into a page that can’t be reached', async () => {
    const clock = timers();
    let reloads = 0;
    scheduleDailyReload({ isReachable: async () => false, reload: () => (reloads += 1), now: () => at(3), schedule: clock.schedule });
    for (let attempt = 0; attempt < 6; attempt += 1) await clock.next();
    expect(reloads).toBe(0);
    expect(clock.pending()).toBe(1);
  });
});

describe('B2: which bundle a TV plays after a reload', () => {
  const page = { version: 'b17b99b7', servedAt: Date.parse('2026-11-15T03:22:00+05:30') };
  const cached = { version: 'e97d3692', servedAt: Date.parse('2026-11-15T03:24:00+05:30') };

  it('takes the cached bundle when it was served after the page’s own copy (the sold-out case)', () => {
    expect(isNewerBundle(cached, page)).toBe(true);
  });

  it('keeps the page’s copy when the cached one is older, and ignores a copy of the same version', () => {
    expect(isNewerBundle(page, cached)).toBe(false);
    expect(isNewerBundle({ ...page, servedAt: cached.servedAt + 1 }, page)).toBe(false);
  });
});
