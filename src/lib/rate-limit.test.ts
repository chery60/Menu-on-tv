import { describe, expect, it } from 'vitest';
import { clientKey, RateLimiter } from './rate-limit';

describe('RateLimiter', () => {
  it('allows requests up to the limit, then blocks until the window resets', () => {
    const limiter = new RateLimiter(2, 60_000);
    expect(limiter.take('a', 0).allowed).toBe(true);
    expect(limiter.take('a', 1).allowed).toBe(true);

    const blocked = limiter.take('a', 2);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(60);

    expect(limiter.take('a', 60_001).allowed).toBe(true);
  });

  it('tracks keys independently', () => {
    const limiter = new RateLimiter(1, 1_000);
    expect(limiter.take('a', 0).allowed).toBe(true);
    expect(limiter.take('b', 0).allowed).toBe(true);
    expect(limiter.take('a', 0).allowed).toBe(false);
  });
});

describe('clientKey', () => {
  it('uses the first forwarded address', () => {
    expect(clientKey(new Headers({ 'x-forwarded-for': '203.0.113.5, 10.0.0.1' }))).toBe('203.0.113.5');
  });

  it('falls back to x-real-ip, then a shared bucket', () => {
    expect(clientKey(new Headers({ 'x-real-ip': '198.51.100.7' }))).toBe('198.51.100.7');
    expect(clientKey(new Headers())).toBe('unknown');
  });
});
