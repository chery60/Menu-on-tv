/**
 * Proving tests for the dev-log slice (platform/dev-log-ignore), written from its goal, not its code:
 * CLAUDE.md says never log screen tokens, so `next dev` must not print a TV link or a pairing code in its
 * request log, while ordinary pages still log. Each URL goes through Next's own request-log filter with our
 * next.config, as Next sees it: the path plus its query string.
 */
import { describe, expect, it } from 'vitest';
import type { NodeNextRequest } from 'next/dist/server/base-http/node';
import { ignoreLoggingIncomingRequests } from 'next/dist/server/dev/log-requests';
import nextConfig from '../../next.config';

const TOKEN = 'nQ3vX8kLp2Rt7YwZb5Hc9Jd4Fg6Ms1Na0Ke8Uo3Wi_-x';
const CODE = 'K7M2QX';

function logged(url: string): boolean {
  if (nextConfig.logging === false) return false;
  return !ignoreLoggingIncomingRequests({ url } as unknown as NodeNextRequest, nextConfig.logging);
}

describe('the dev request log keeps TV links and pairing codes out', () => {
  it.each([
    `/s/${TOKEN}`,
    `/s/${TOKEN}?_rsc=1a2b3`,
    `/api/s/${TOKEN}/bundle`,
    `/api/s/${TOKEN}/events`,
    `/api/s/${TOKEN}/beat`,
    `/api/pairing/${CODE}`,
    '/api/pairing/start',
  ])('does not print %s', (url) => {
    expect(logged(url)).toBe(false);
  });
});

describe('the dev request log still prints ordinary requests', () => {
  it.each([
    '/',
    '/?_rsc=1a2b3',
    '/sign-in',
    '/studio',
    '/studio/tvs',
    '/pair',
    '/tv-check',
    '/screen/2e1f0980-31b7-4371-a362-2dc9e6c4232d',
    '/api/photos/abc123',
    '/sitemap.xml',
    '/robots.txt',
    '/tracker/docs/screen-design?ref=/s/',
  ])('prints %s', (url) => {
    expect(logged(url)).toBe(true);
  });
});
