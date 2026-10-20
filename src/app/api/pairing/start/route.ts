import QRCode from 'qrcode';
import { fail, ok } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import { RateLimiter } from '@/lib/rate-limit';
import { rateLimited } from '@/features/screens/live';
import { getScreensRepository, ScreensLimitError } from '@/features/screens/repository';

const limiter = new RateLimiter(10, 10 * 60 * 1000);

/** A TV asks for a pairing code. It gets the code, a QR for the owner's phone, and a secret it keeps to itself. */
export async function POST(request: Request): Promise<Response> {
  const limited = rateLimited(limiter, request, 'pair-start');
  if (limited) return limited;
  try {
    const { code, deviceSecret, expiresAt } = await getScreensRepository().startPairing(new Date());
    const studioUrl = `${new URL(request.url).origin}/studio/tvs`;
    const qrSvg = await QRCode.toString(`${studioUrl}?code=${code}`, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#111111', light: '#ffffff' } });
    return ok({ code, deviceSecret, expiresAt, qrSvg, studioUrl }, 201);
  } catch (error) {
    if (error instanceof ScreensLimitError) return fail(error.message, 503);
    logger.error('pairing.start_failed', error);
    return fail('We couldn’t make a pairing code. Try again.', 500);
  }
}
