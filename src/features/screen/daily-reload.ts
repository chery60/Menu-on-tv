/**
 * A TV reloads itself once a day in the small hours, to clear memory on weak TV browsers (MT-21). It reloads only
 * when the page can come back: an offline reload would leave a browser error on the TV, so it tries again later.
 */

/** The hour on the TV's own clock. */
export const RELOAD_HOUR = 4;
/** If the page can't be reached at reload time, try again this much later. */
export const RELOAD_RETRY_MS = 30 * 60 * 1000;

/** Milliseconds from `now` to the next 4 am on the TV's clock: today's while it is still ahead, otherwise tomorrow's. */
export function msUntilNextReload(now: Date): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), RELOAD_HOUR);
  const target = next.getTime() > now.getTime() ? next : new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, RELOAD_HOUR);
  return target.getTime() - now.getTime();
}

/** Whether the TV's page answers now. HEAD, so nothing is downloaded; the service worker leaves HEAD to the network. */
export async function pageReachable(url: string): Promise<boolean> {
  try {
    return (await fetch(url, { method: 'HEAD', cache: 'no-store' })).ok;
  } catch {
    return false;
  }
}

export interface DailyReloadOptions {
  readonly isReachable: () => Promise<boolean>;
  readonly reload: () => void;
  readonly now?: () => Date;
  /** Runs `run` after `ms`, returning a way to cancel it. */
  readonly schedule?: (run: () => void, ms: number) => () => void;
}

function later(run: () => void, ms: number): () => void {
  const timer = setTimeout(run, ms);
  return () => clearTimeout(timer);
}

/** Schedules the next reload; returns a way to cancel it. */
export function scheduleDailyReload({ isReachable, reload, now = () => new Date(), schedule = later }: DailyReloadOptions): () => void {
  let cancel = (): void => undefined;
  let stopped = false;
  const attempt = async (): Promise<void> => {
    const reachable = await isReachable();
    if (stopped) return;
    if (reachable) reload();
    else cancel = schedule(() => void attempt(), RELOAD_RETRY_MS);
  };
  cancel = schedule(() => void attempt(), msUntilNextReload(now()));
  return () => {
    stopped = true;
    cancel();
  };
}
