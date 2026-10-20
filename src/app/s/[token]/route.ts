import { linkGonePage, playerPage } from '@/features/screens/player-page';
import { loadLiveScreen, rateLimited } from '@/features/screens/live';
import { logger } from '@/lib/logger';
import { requestOrigin } from '@/lib/origin';
import { RateLimiter } from '@/lib/rate-limit';

/*
 * A restaurant TV's own link (ADR-005). It answers plain HTML that loads the standalone player, not a
 * Next.js page, so a TV downloads about 12 KB of JavaScript. The token is the screen's key; only its hash
 * is stored. The bundle depends on today's date (sold out resets each day), so this is built per request.
 */

// A high per-address ceiling that blunts anyone guessing links; TVs load this page a few times a day.
const perAddress = new RateLimiter(600, 60 * 1000);
const RETRY_SECONDS = 60;

const html = (body: string, status: number): Response =>
  new Response(body, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' } });

export async function GET(request: Request, context: RouteContext<'/s/[token]'>): Promise<Response> {
  const limited = rateLimited(perAddress, request, 'screen-page');
  if (limited) return limited;
  const { token } = await context.params;
  try {
    const [live, origin] = await Promise.all([loadLiveScreen(token), requestOrigin()]);
    const pairUrl = `${origin}/pair`;
    return live ? html(playerPage({ token, bundle: live.bundle, pairUrl }), 200) : html(linkGonePage(pairUrl), 404);
  } catch (error) {
    logger.error('screens.page_failed', error);
    // The TV's service worker plays its last copy on a 5xx; without one, this page tries again by itself.
    return html(`<!doctype html><meta http-equiv="refresh" content="${RETRY_SECONDS}"><title>Screen</title><body style="background:#000"></body>`, 503);
  }
}

/** The player's daily reload asks with HEAD whether the page is reachable before it reloads. */
export async function HEAD(request: Request, context: RouteContext<'/s/[token]'>): Promise<Response> {
  const response = await GET(request, context);
  return new Response(null, { status: response.status, headers: response.headers });
}
