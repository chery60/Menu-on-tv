import { fail } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import { RateLimiter } from '@/lib/rate-limit';
import { LINK_GONE, loadLiveScreen, rateLimited } from '@/features/screens/live';

// Per TV link (streams reconnect about once a minute), plus a per-address ceiling.
const perLink = new RateLimiter(10, 60 * 1000);
const perAddress = new RateLimiter(600, 60 * 1000);
/** How often the stream checks for a new version. */
const CHECK_MS = 3_000;
/** A comment line now and then keeps proxies from closing a quiet stream. */
const PING_MS = 20_000;
/** Streams end before Netlify's 60-second function limit; the TV reconnects on its own 5 seconds later. */
const MAX_STREAM_MS = 50 * 1000;

/**
 * Server-sent events: "version" whenever the screen's bundle changes, "revoked" if its link stops working.
 * shortcut: each open stream re-reads the data file every few seconds; move to a pub/sub channel with Postgres (ADR-004).
 */
export async function GET(request: Request, context: RouteContext<'/api/s/[token]/events'>): Promise<Response> {
  const { token } = await context.params;
  const limited = rateLimited(perAddress, request, 'events') ?? rateLimited(perLink, request, 'events', token);
  if (limited) return limited;
  const first = await loadLiveScreen(token).catch((error: unknown) => {
    logger.error('screens.events_failed', error);
    return null;
  });
  if (!first) return fail(LINK_GONE, 404);

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let last = '';
      let closed = false;
      const send = (text: string): void => {
        if (!closed) controller.enqueue(encoder.encode(text));
      };
      const close = (): void => {
        if (closed) return;
        closed = true;
        clearInterval(checker);
        clearInterval(pinger);
        clearTimeout(ender);
        controller.close();
      };
      const announce = (version: string): void => {
        if (version === last) return;
        last = version;
        send(`event: version\ndata: ${version}\n\n`);
      };
      const check = async (): Promise<void> => {
        try {
          const live = await loadLiveScreen(token);
          if (!live) {
            send('event: revoked\ndata: gone\n\n');
            close();
            return;
          }
          announce(live.bundle.version);
        } catch (error) {
          logger.error('screens.events_check_failed', error);
        }
      };
      const checker = setInterval(() => void check(), CHECK_MS);
      const pinger = setInterval(() => send(': ping\n\n'), PING_MS);
      const ender = setTimeout(close, MAX_STREAM_MS);
      request.signal.addEventListener('abort', close);
      send('retry: 5000\n\n');
      announce(first.bundle.version);
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' },
  });
}
