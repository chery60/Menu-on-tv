import { fail } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import { RateLimiter } from '@/lib/rate-limit';
import { getPhotoStore } from '@/features/menu/photos';
import { rateLimited } from '@/features/screens/live';

// Photos are public menu content that TVs cache for good; this ceiling only slows anyone crawling ids.
const perAddress = new RateLimiter(600, 60 * 1000);

/** A dish photo. Ids are random and never reused, so the answer can be cached forever. */
export async function GET(request: Request, context: RouteContext<'/api/photos/[id]'>): Promise<Response> {
  const limited = rateLimited(perAddress, request, 'photos');
  if (limited) return limited;
  const { id } = await context.params;
  try {
    const photo = await getPhotoStore().read(id);
    if (!photo) return fail('No such photo.', 404);
    return new Response(photo.bytes as Uint8Array<ArrayBuffer>, {
      headers: {
        'Content-Type': photo.type,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Security-Policy': "default-src 'none'",
      },
    });
  } catch (error) {
    logger.error('photos.read_failed', error);
    return fail('We couldn’t load this photo.', 500);
  }
}
