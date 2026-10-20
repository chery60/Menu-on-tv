import { describeIssues, fail, ok, readJson } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import { RateLimiter } from '@/lib/rate-limit';
import { LINK_GONE, loadLiveScreen, rateLimited } from '@/features/screens/live';
import { getScreensRepository } from '@/features/screens/repository';
import { beatInputSchema } from '@/features/screens/schema';

// Per TV link (one beat a minute, with room for reconnects), plus a per-address ceiling.
const perLink = new RateLimiter(10, 60 * 1000);
const perAddress = new RateLimiter(600, 60 * 1000);

/** A TV's heartbeat: marks it online, and returns the current version and server time for clock correction. */
export async function POST(request: Request, context: RouteContext<'/api/s/[token]/beat'>): Promise<Response> {
  const { token } = await context.params;
  const limited = rateLimited(perAddress, request, 'beat') ?? rateLimited(perLink, request, 'beat', token);
  if (limited) return limited;
  const parsed = beatInputSchema.safeParse(await readJson(request));
  if (!parsed.success) return fail('Send the heartbeat as JSON with version, slide and sentAt.', 422, describeIssues(parsed.error));
  try {
    const live = await loadLiveScreen(token);
    if (!live) return fail(LINK_GONE, 404);
    await getScreensRepository().recordBeat(token, { version: parsed.data.version, slide: parsed.data.slide }, new Date());
    return ok({ version: live.bundle.version, serverNow: Date.now() });
  } catch (error) {
    logger.error('screens.beat_failed', error);
    return fail('We couldn’t record the heartbeat. It will try again.', 500);
  }
}
