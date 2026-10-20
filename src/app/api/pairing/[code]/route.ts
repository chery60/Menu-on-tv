import { z } from 'zod';
import { fail, ok, readJson } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import { RateLimiter } from '@/lib/rate-limit';
import { rateLimited } from '@/features/screens/live';
import { getScreensRepository } from '@/features/screens/repository';
import { isPairingCode } from '@/features/screens/tokens';

const limiter = new RateLimiter(120, 60 * 1000);
// The secret travels in the body, never the URL, so it doesn't land in access logs.
const bodySchema = z.object({ deviceSecret: z.string().min(20).max(100) });

/** The waiting TV checks in. Once the owner has entered its code, it receives its screen link once. */
export async function POST(request: Request, context: RouteContext<'/api/pairing/[code]'>): Promise<Response> {
  const limited = rateLimited(limiter, request, 'pair-poll');
  if (limited) return limited;
  const { code } = await context.params;
  const parsed = bodySchema.safeParse(await readJson(request));
  if (!isPairingCode(code) || !parsed.success) return fail('Send the pairing code and this TV’s secret.', 422);
  try {
    return ok(await getScreensRepository().collectPairing(code, parsed.data.deviceSecret, new Date()));
  } catch (error) {
    logger.error('pairing.collect_failed', error);
    return fail('We couldn’t check the pairing. It will try again.', 500);
  }
}
