/**
 * Fixed-window, in-memory rate limiter. Good enough to blunt form spam on a
 * single instance; replace with a shared store (Redis, Upstash) for multi-region.
 */

export interface RateLimitResult {
  readonly allowed: boolean;
  readonly remaining: number;
  readonly retryAfterSeconds: number;
}

interface Window {
  readonly count: number;
  readonly resetAt: number;
}

const MAX_TRACKED_KEYS = 10_000;

export class RateLimiter {
  private windows = new Map<string, Window>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  take(key: string, now: number): RateLimitResult {
    const existing = this.windows.get(key);
    const window: Window =
      existing && existing.resetAt > now ? { count: existing.count + 1, resetAt: existing.resetAt } : { count: 1, resetAt: now + this.windowMs };

    if (!existing && this.windows.size >= MAX_TRACKED_KEYS) this.prune(now);
    this.windows.set(key, window);

    const allowed = window.count <= this.limit;
    return {
      allowed,
      remaining: Math.max(0, this.limit - window.count),
      retryAfterSeconds: allowed ? 0 : Math.ceil((window.resetAt - now) / 1000),
    };
  }

  private prune(now: number): void {
    this.windows = new Map([...this.windows].filter(([, window]) => window.resetAt > now));
  }
}

/** Best-effort client address from proxy headers; falls back to a shared bucket. */
export function clientKey(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || headers.get('x-real-ip') || 'unknown';
}
