import { afterEach, describe, expect, it, vi } from 'vitest';
import { msUntilNextReload, pageReachable, RELOAD_RETRY_MS, scheduleDailyReload } from './daily-reload';

const HOUR = 60 * 60 * 1000;
/** A moment on the TV's own clock (local time, as the reload uses). */
const at = (hours: number, minutes = 0) => new Date(2026, 10, 15, hours, minutes);

describe('msUntilNextReload', () => {
  it('waits for 4 am today while it is still ahead, otherwise tomorrow’s', () => {
    expect(msUntilNextReload(at(3))).toBe(HOUR);
    expect(msUntilNextReload(at(4))).toBe(24 * HOUR);
    expect(msUntilNextReload(at(4, 30))).toBe(23.5 * HOUR);
    expect(msUntilNextReload(at(23))).toBe(5 * HOUR);
  });
});

describe('scheduleDailyReload', () => {
  function harness(answers: boolean[]) {
    const waits: number[] = [];
    let pending: (() => void) | null = null;
    const reload = vi.fn();
    const cancel = scheduleDailyReload({
      isReachable: async () => answers.shift() ?? true,
      reload,
      now: () => at(3),
      schedule: (run, ms) => {
        waits.push(ms);
        pending = run;
        return () => {
          pending = null;
        };
      },
    });
    const elapse = async (): Promise<void> => {
      const run = pending;
      pending = null;
      run?.();
      await Promise.resolve();
      await Promise.resolve();
    };
    return { waits, reload, cancel, elapse };
  }

  it('reloads at 4 am when the page answers', async () => {
    const tv = harness([true]);
    expect(tv.waits).toEqual([HOUR]);
    await tv.elapse();
    expect(tv.reload).toHaveBeenCalledOnce();
  });

  it('waits 30 minutes and asks again while the page can’t be reached, so the TV never shows a browser error', async () => {
    const tv = harness([false, false, true]);
    await tv.elapse();
    await tv.elapse();
    expect(tv.reload).not.toHaveBeenCalled();
    expect(tv.waits).toEqual([HOUR, RELOAD_RETRY_MS, RELOAD_RETRY_MS]);
    await tv.elapse();
    expect(tv.reload).toHaveBeenCalledOnce();
  });

  it('does nothing once cancelled', async () => {
    const tv = harness([true]);
    tv.cancel();
    await tv.elapse();
    expect(tv.reload).not.toHaveBeenCalled();
  });
});

describe('pageReachable', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('asks with HEAD and reads only whether the page answered', async () => {
    const fetcher = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetcher);
    expect(await pageReachable('https://menuontv.in/s/abc')).toBe(true);
    expect(fetcher).toHaveBeenCalledWith('https://menuontv.in/s/abc', { method: 'HEAD', cache: 'no-store' });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 503 })));
    expect(await pageReachable('https://menuontv.in/s/abc')).toBe(false);
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('offline'))));
    expect(await pageReachable('https://menuontv.in/s/abc')).toBe(false);
  });
});
