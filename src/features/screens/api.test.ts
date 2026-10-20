import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST as COLLECT } from '@/app/api/pairing/[code]/route';
import { POST as START } from '@/app/api/pairing/start/route';
import { POST as BEAT } from '@/app/api/s/[token]/beat/route';
import { GET as BUNDLE } from '@/app/api/s/[token]/bundle/route';
import { GET as EVENTS } from '@/app/api/s/[token]/events/route';
import { GET as SCREEN_PAGE, HEAD as SCREEN_HEAD } from '@/app/s/[token]/route';
import { getAccountsRepository } from '@/features/accounts/repository';
import { applyEdit } from '@/features/menu/edit';
import { getMenusRepository } from '@/features/menu/repository';
import { sampleMenu } from '@/features/menu/sample';
import { localDate } from '@/lib/local-date';
import { getScreensRepository } from './repository';

vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ headers: async () => new Headers({ host: 'localhost:3000' }) }));

let directory: string;
const ip = (n: number) => ({ 'x-forwarded-for': `203.0.113.${n}` });
const params = <T extends Record<string, string>>(value: T) => ({ params: Promise.resolve(value) });
const post = (body: unknown, headers: Record<string, string> = {}) =>
  new Request('http://localhost/api', { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
const data = async <T,>(response: Response): Promise<T> => ((await response.json()) as { data: T }).data;

let restaurantId: string;

/** A signed-up owner's restaurant with the sample menu, as the setup page makes it. */
async function newRestaurant(): Promise<string> {
  const accounts = getAccountsRepository();
  const started = await accounts.startSignIn({ channel: 'phone', value: '+919876543210' }, new Date());
  if (started.status !== 'sent') throw new Error('expected a code');
  const verified = await accounts.verifySignIn(started.challengeId, started.code, new Date());
  if (verified.status !== 'signed-in') throw new Error('expected to sign in');
  const restaurant = await accounts.createRestaurant(verified.userId, { name: 'Chai Point', city: 'Indiranagar', tagline: 'Fresh chai all day' }, new Date());
  let next = 0;
  await getMenusRepository().update(restaurant.id, () => sampleMenu(new Date(), () => `id-${(next += 1)}`), new Date());
  return restaurant.id;
}

async function newScreen() {
  return getScreensRepository().createScreen(restaurantId, { name: 'Counter TV', layout: 'split', theme: 'night', bilingual: false }, new Date());
}

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'menutelly-api-'));
  vi.stubEnv('SCREENS_DATA_FILE', join(directory, 'screens.json'));
  vi.stubEnv('ACCOUNTS_DATA_FILE', join(directory, 'accounts.json'));
  vi.stubEnv('MENUS_DATA_FILE', join(directory, 'menus.json'));
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  restaurantId = await newRestaurant();
});

afterEach(async () => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  await rm(directory, { recursive: true, force: true });
});

describe('GET /s/[token], the page a TV opens', () => {
  it('loads the standalone player with this screen, and never the Next.js runtime', async () => {
    const { token } = await newScreen();
    const response = await SCREEN_PAGE(new Request('http://localhost/s/x', { headers: ip(40) }), params({ token }));
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/html');
    expect(response.headers.get('cache-control')).toBe('no-store');
    const html = await response.text();
    expect(html).toContain('<script defer src="/player/player.js"></script>');
    expect(html).not.toContain('/_next/');
    expect(html).toContain('"name":"Counter TV"');
  });

  it('tells a TV with a dead link how to connect again, and HEAD agrees without a body', async () => {
    const response = await SCREEN_PAGE(new Request('http://localhost/s/x', { headers: ip(41) }), params({ token: 'n'.repeat(43) }));
    expect(response.status).toBe(404);
    expect(await response.text()).toContain('http://localhost:3000/pair');
    const head = await SCREEN_HEAD(new Request('http://localhost/s/x', { method: 'HEAD', headers: ip(41) }), params({ token: 'n'.repeat(43) }));
    expect(head.status).toBe(404);
    expect(head.body).toBeNull();
  });
});

describe('GET /api/s/[token]/bundle', () => {
  it('serves the bundle with an ETag, then 304 until something changes', async () => {
    const { token } = await newScreen();
    const first = await BUNDLE(new Request('http://localhost', { headers: ip(1) }), params({ token }));
    expect(first.status).toBe(200);
    const etag = first.headers.get('etag') ?? '';
    const bundle = await data<{ version: string; layout: string; restaurant: { name: string; categories: { items: { id: string }[] }[] } }>(first);
    expect(etag).toBe(`"${bundle.version}"`);
    expect(bundle.layout).toBe('split');
    expect(bundle.restaurant.name).toBe('Chai Point');

    const again = await BUNDLE(new Request('http://localhost', { headers: { ...ip(1), 'if-none-match': etag } }), params({ token }));
    expect(again.status).toBe(304);

    const itemId = bundle.restaurant.categories[0].items[0].id;
    await getMenusRepository().update(restaurantId, (menu) => applyEdit(menu, { type: 'set-sold-out', itemId, soldOut: true }, { today: localDate(new Date(), 'Asia/Kolkata'), now: new Date(), newId: () => 'x' }), new Date());
    const changed = await BUNDLE(new Request('http://localhost', { headers: { ...ip(1), 'if-none-match': etag } }), params({ token }));
    expect(changed.status).toBe(200);
    expect(changed.headers.get('etag')).not.toBe(etag);
  });

  it('answers 404 with a way back for unknown or malformed links', async () => {
    const bad = await BUNDLE(new Request('http://localhost', { headers: ip(2) }), params({ token: 'x'.repeat(43) }));
    expect(bad.status).toBe(404);
    expect(((await bad.json()) as { error: string }).error).toMatch(/pair/);
    expect((await BUNDLE(new Request('http://localhost', { headers: ip(2) }), params({ token: '../../etc' }))).status).toBe(404);
  });
});

describe('rate limits on screen routes', () => {
  it('count each TV separately, so TVs behind one router don’t starve each other', async () => {
    const tvs = await Promise.all(Array.from({ length: 4 }, () => newScreen()));
    const sameRouter = ip(42);
    for (let round = 0; round < 10; round += 1) {
      for (const { token } of tvs) {
        const response = await BUNDLE(new Request('http://localhost', { headers: sameRouter }), params({ token }));
        expect(response.status).toBe(200);
      }
    }
  });

  it('still stop one link that asks too often', async () => {
    const { token } = await newScreen();
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 32; attempt += 1) statuses.push((await BUNDLE(new Request('http://localhost', { headers: ip(43) }), params({ token }))).status);
    expect(statuses.at(-1)).toBe(429);
  });
});

describe('POST /api/s/[token]/beat', () => {
  it('returns the current version and server time, and marks the TV seen', async () => {
    const { token, screen } = await newScreen();
    const response = await BEAT(post({ version: null, slide: 'menu:0', sentAt: Date.now() }, ip(3)), params({ token }));
    const body = await data<{ version: string; serverNow: number }>(response);
    expect(body.version).toMatch(/^[a-f0-9]{16}$/);
    expect(Math.abs(body.serverNow - Date.now())).toBeLessThan(5_000);
    const { screens } = await getScreensRepository().read();
    expect(screens.find((entry) => entry.id === screen.id)?.links[0].lastSlide).toBe('menu:0');
  });

  it('rejects a malformed heartbeat and a revoked link', async () => {
    const { token, screen, link } = await newScreen();
    expect((await BEAT(post({ nope: true }, ip(4)), params({ token }))).status).toBe(422);
    await getScreensRepository().removeLink(restaurantId, screen.id, link.id, new Date());
    expect((await BEAT(post({ version: null, slide: null, sentAt: 1 }, ip(4)), params({ token }))).status).toBe(404);
  });
});

describe('pairing over HTTP', () => {
  it('gives the TV a code and QR, then its link once the owner claims it', async () => {
    const { screen } = await newScreen();
    const started = await START(post({}, ip(5)));
    expect(started.status).toBe(201);
    const { code, deviceSecret, qrSvg } = await data<{ code: string; deviceSecret: string; qrSvg: string }>(started);
    expect(qrSvg).toContain('<svg');

    expect(await data(await COLLECT(post({ deviceSecret }, ip(5)), params({ code })))).toEqual({ status: 'waiting' });
    await getScreensRepository().claimPairing(code, restaurantId, screen.id, new Date());
    const paired = await data<{ status: string; token: string }>(await COLLECT(post({ deviceSecret }, ip(5)), params({ code })));
    expect(paired.status).toBe('paired');
    expect((await BUNDLE(new Request('http://localhost', { headers: ip(5) }), params({ token: paired.token }))).status).toBe(200);
  });

  it('rejects malformed codes and missing secrets', async () => {
    expect((await COLLECT(post({ deviceSecret: 'x'.repeat(43) }, ip(6)), params({ code: 'ab' }))).status).toBe(422);
    expect((await COLLECT(post({}, ip(6)), params({ code: 'ABCD23' }))).status).toBe(422);
  });

  it('limits how often one address can ask for codes', async () => {
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 12; attempt += 1) statuses.push((await START(post({}, ip(7)))).status);
    expect(statuses.slice(0, 10).every((status) => status === 201)).toBe(true);
    expect(statuses.at(-1)).toBe(429);
  });
});

describe('GET /api/s/[token]/events', () => {
  it('streams the current version, then says when the link is revoked', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'setTimeout', 'clearInterval', 'clearTimeout'] });
    try {
      const { token, screen, link } = await newScreen();
      const controller = new AbortController();
      const response = await EVENTS(new Request('http://localhost', { headers: ip(8), signal: controller.signal }), params({ token }));
      expect(response.headers.get('content-type')).toContain('text/event-stream');
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let text = '';
      while (!text.includes('event: version')) text += decoder.decode((await reader.read()).value);
      expect(text).toMatch(/retry: 5000/);

      await getScreensRepository().removeLink(restaurantId, screen.id, link.id, new Date());
      await vi.advanceTimersByTimeAsync(3_100);
      let rest = '';
      for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) rest += decoder.decode(chunk.value);
      expect(rest).toContain('event: revoked');
    } finally {
      vi.useRealTimers();
    }
  });

  it('refuses unknown links before opening a stream', async () => {
    expect((await EVENTS(new Request('http://localhost', { headers: ip(9) }), params({ token: 'y'.repeat(43) }))).status).toBe(404);
  });
});
