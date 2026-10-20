/** How a TV is doing, from its last heartbeat. TVs beat every minute, so a few missed beats mean offline. */

export const ONLINE_WITHIN_MS = 150_000;
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export interface TvStatus {
  readonly online: boolean;
  readonly text: string;
}

function ago(ms: number): string {
  if (ms < HOUR) {
    const minutes = Math.max(1, Math.round(ms / MINUTE));
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  }
  if (ms < DAY) {
    const hours = Math.round(ms / HOUR);
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }
  const days = Math.round(ms / DAY);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export function tvStatus(lastSeenAt: string | null, now: number): TvStatus {
  if (!lastSeenAt) return { online: false, text: 'Never connected' };
  const since = now - Date.parse(lastSeenAt);
  if (since <= ONLINE_WITHIN_MS) return { online: true, text: 'Online' };
  return { online: false, text: `Offline, last seen ${ago(since)}` };
}

/** What a TV is showing, in words, from the heartbeat's slide label (see slideLabel in the screen loop). */
export function describeSlide(label: string | null): string | null {
  if (!label) return null;
  const [kind, value = ''] = label.split(':');
  if (kind === 'menu') return `menu page ${Number(value) + 1}`;
  if (kind === 'promo') return 'a promo';
  if (kind === 'ad') return 'a local ad';
  if (kind === 'spotlight') return 'a spotlight dish';
  return null;
}
