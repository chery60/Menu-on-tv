import type { ScreenBundle } from '@/features/screens/bundle';

/**
 * Whether a TV should switch to a bundle it was handed (MT-21). After an offline reload the page's own copy and the
 * service worker's cached bundle can disagree, and versions are content hashes with no order, so the server's
 * `servedAt` decides. A copy without one (saved before it existed) is taken, as it always was.
 */
export function isNewerBundle(candidate: Pick<ScreenBundle, 'version' | 'servedAt'>, current: Pick<ScreenBundle, 'version' | 'servedAt'>): boolean {
  if (candidate.version === current.version) return false;
  if (candidate.servedAt === undefined || current.servedAt === undefined) return true;
  return candidate.servedAt > current.servedAt;
}
