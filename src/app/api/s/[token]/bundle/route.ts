import { fail, ok } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import { RateLimiter } from '@/lib/rate-limit';
import { bundleEtag, isFresh } from '@/features/screens/bundle';
import { LINK_GONE, loadLiveScreen, rateLimited } from '@/features/screens/live';

// Per TV link, plus a high per-address ceiling that blunts anyone guessing links.
const perLink = new RateLimiter(30, 60 * 1000);
const perAddress = new RateLimiter(600, 60 * 1000);

/** The bundle a TV plays. Answers 304 when the TV already has this version. */
export async function GET(request: Request, context: RouteContext<'/api/s/[token]/bundle'>): Promise<Response> {
  const { token } = await context.params;
  const limited = rateLimited(perAddress, request, 'bundle') ?? rateLimited(perLink, request, 'bundle', token);
  if (limited) return limited;
  try {
    const live = await loadLiveScreen(token);
    if (!live) return fail(LINK_GONE, 404);
    const headers = { ETag: bundleEtag(live.bundle.version), 'Cache-Control': 'no-cache' };
    if (isFresh(request.headers.get('if-none-match'), live.bundle.version)) return new Response(null, { status: 304, headers });
    const response = ok(live.bundle);
    Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
    return response;
  } catch (error) {
    logger.error('screens.bundle_failed', error);
    return fail('We couldn’t load this screen. It will try again.', 500);
  }
}
