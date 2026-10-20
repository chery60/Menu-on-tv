import 'server-only';
import { getAccountsRepository } from '@/features/accounts/repository';
import { getMenusRepository } from '@/features/menu/repository';
import { screenRestaurant } from '@/features/menu/to-screen';
import { buildQrCodes } from '@/features/screen/qr';
import { fail } from '@/lib/api-response';
import { localClock } from '@/lib/local-date';
import { clientKey, type RateLimiter } from '@/lib/rate-limit';
import { buildBundle, type ScreenBundle } from './bundle';
import { getScreensRepository, type ResolvedScreen } from './repository';

/** Server helpers shared by the screen routes. */

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export const LINK_GONE = 'This screen link no longer works. Open /pair on the TV to connect it again.';

export function isTokenShaped(token: string): boolean {
  return TOKEN_PATTERN.test(token);
}

export interface LiveScreen extends ResolvedScreen {
  readonly bundle: ScreenBundle;
}

/**
 * The screen and its current bundle for a TV's token, or null if the link is unknown or revoked, or its
 * restaurant is gone. The bundle is the restaurant's own menu as guests should see it today.
 */
export async function loadLiveScreen(token: string, now = new Date()): Promise<LiveScreen | null> {
  if (!isTokenShaped(token)) return null;
  const resolved = await getScreensRepository().resolveToken(token);
  if (!resolved) return null;
  const restaurant = await getAccountsRepository().restaurant(resolved.screen.restaurantId);
  if (!restaurant) return null;
  const menu = await getMenusRepository().get(restaurant.id, now);
  const playing = screenRestaurant(restaurant, menu, localClock(now, restaurant.outlets[0].timeZone));
  return { ...resolved, bundle: buildBundle(resolved.screen, playing, await buildQrCodes(playing)) };
}

/**
 * A 429 with Retry-After when the caller is over its limit, otherwise null. Keyed by the caller's address,
 * or by `key` when given: screen routes limit each TV by its own link, because a restaurant's TVs share one address.
 */
export function rateLimited(limiter: RateLimiter, request: Request, scope = '', key?: string): Response | null {
  const result = limiter.take(`${scope}:${key ?? clientKey(request.headers)}`, Date.now());
  if (result.allowed) return null;
  const response = fail('Too many requests. Wait a moment and try again.', 429);
  response.headers.set('Retry-After', String(result.retryAfterSeconds));
  return response;
}
