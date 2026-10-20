import { describeIssues, fail, ok, readJson } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import { clientKey, RateLimiter } from '@/lib/rate-limit';
import { getWaitlistRepository, isHoneypotFilled, waitlistInputSchema } from '@/features/waitlist/waitlist';

const SIGNUPS_PER_WINDOW = 5;
const WINDOW_MS = 10 * 60 * 1000;
const limiter = new RateLimiter(SIGNUPS_PER_WINDOW, WINDOW_MS);

export async function POST(request: Request): Promise<Response> {
  const rate = limiter.take(clientKey(request.headers), Date.now());
  if (!rate.allowed) {
    const response = fail('Too many tries. Wait a few minutes and try again.', 429);
    response.headers.set('Retry-After', String(rate.retryAfterSeconds));
    return response;
  }

  const body = await readJson(request);
  if (body === undefined) return fail('Send the form as JSON.', 400);

  // Pretend success for bots so they don't retry with a different payload.
  if (isHoneypotFilled(body)) return ok({ status: 'added' }, 201);

  const parsed = waitlistInputSchema.safeParse(body);
  if (!parsed.success) {
    const [first] = parsed.error.issues;
    return fail(first?.message ?? 'Check the form and try again.', 422, describeIssues(parsed.error));
  }

  try {
    const result = await getWaitlistRepository().add(parsed.data, new Date());
    logger.info('waitlist.added', { duplicate: result.duplicate, role: parsed.data.role });
    // Same response for new and existing emails, so the form can't be used to check who signed up.
    return ok({ status: 'added' }, 201);
  } catch (error) {
    logger.error('waitlist.add_failed', error);
    return fail('We couldn’t add you. Try again.', 500);
  }
}
