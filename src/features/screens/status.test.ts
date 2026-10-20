import { describe, expect, it } from 'vitest';
import { describeSlide, ONLINE_WITHIN_MS, tvStatus } from './status';

const NOW = Date.parse('2026-10-18T12:00:00.000Z');
const before = (ms: number) => new Date(NOW - ms).toISOString();

describe('tvStatus', () => {
  it('reads a recent heartbeat as online', () => {
    expect(tvStatus(before(30_000), NOW)).toEqual({ online: true, text: 'Online' });
    expect(tvStatus(before(ONLINE_WITHIN_MS), NOW).online).toBe(true);
  });

  it('says how long an offline TV has been quiet', () => {
    expect(tvStatus(before(ONLINE_WITHIN_MS + 1), NOW).text).toBe('Offline, last seen 3 minutes ago');
    expect(tvStatus(before(60 * 60_000), NOW).text).toBe('Offline, last seen 1 hour ago');
    expect(tvStatus(before(3 * 24 * 60 * 60_000), NOW).text).toBe('Offline, last seen 3 days ago');
  });

  it('knows a TV that never connected', () => {
    expect(tvStatus(null, NOW)).toEqual({ online: false, text: 'Never connected' });
  });
});

describe('describeSlide', () => {
  it('turns heartbeat labels into words', () => {
    expect(describeSlide('menu:0')).toBe('menu page 1');
    expect(describeSlide('promo:combo')).toBe('a promo');
    expect(describeSlide('ad:gym')).toBe('a local ad');
    expect(describeSlide('spotlight:samosa')).toBe('a spotlight dish');
    expect(describeSlide('weird')).toBeNull();
    expect(describeSlide(null)).toBeNull();
  });
});
