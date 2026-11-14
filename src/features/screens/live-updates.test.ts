/**
 * QA checks for MT-23 "Changes reach every TV within 10 seconds", written from the tracker's Done-when and
 * its design (a stream that announces a new version within about 3 seconds, a TV that reconnects on its own).
 * Worst case for a TV: one check interval plus one reconnect, which must stay under 10 seconds.
 */
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET as EVENTS } from '@/app/api/s/[token]/events/route';
import { getAccountsRepository } from '@/features/accounts/repository';
import { applyEdit } from '@/features/menu/edit';
import { getMenusRepository } from '@/features/menu/repository';
import { sampleMenu } from '@/features/menu/sample';
import { localDate } from '@/lib/local-date';
import { getScreensRepository } from './repository';

vi.mock('server-only', () => ({}));

const TEN_SECONDS = 10_000;
/** Netlify ends a function after 60 seconds; a stream must end on its own before that. */
const FUNCTION_LIMIT_MS = 60_000;

let directory: string;

async function restaurantWithScreen() {
  const accounts = getAccountsRepository();
  const started = await accounts.startSignIn({ channel: 'phone', value: '+919876500001' }, new Date());
  if (started.status !== 'sent') throw new Error('expected a code');
  const verified = await accounts.verifySignIn(started.challengeId, started.code, new Date());
  if (verified.status !== 'signed-in') throw new Error('expected to sign in');
  const restaurant = await accounts.createRestaurant(verified.userId, { name: 'Chai Point', city: 'Indiranagar', tagline: '' }, new Date());
  let next = 0;
  const menu = await getMenusRepository().update(restaurant.id, () => sampleMenu(new Date(), () => `id-${(next += 1)}`), new Date());
  const { token } = await getScreensRepository().createScreen(restaurant.id, { name: 'Counter TV', layout: 'split', theme: 'night', bilingual: false }, new Date());
  return { restaurantId: restaurant.id, token, itemId: menu.categories[0].items[0].id };
}

async function markSoldOut(restaurantId: string, itemId: string): Promise<void> {
  const context = { today: localDate(new Date(), 'Asia/Kolkata'), now: new Date(), newId: () => 'x' };
  await getMenusRepository().update(restaurantId, (menu) => applyEdit(menu, { type: 'set-sold-out', itemId, soldOut: true }, context), new Date());
}

/** Reads a TV's event stream as text in the background. */
function openStream(token: string, address: string) {
  const controller = new AbortController();
  const request = new Request('http://localhost', { headers: { 'x-forwarded-for': address }, signal: controller.signal });
  const response = EVENTS(request, { params: Promise.resolve({ token }) });
  let text = '';
  let ended = false;
  const reading = (async () => {
    const reader = (await response).body!.getReader();
    const decoder = new TextDecoder();
    for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) text += decoder.decode(chunk.value);
    ended = true;
  })();
  return {
    versions: () => [...text.matchAll(/event: version\ndata: (\S+)/g)].map((match) => match[1]),
    retryMs: () => Number(text.match(/retry: (\d+)/)?.[1] ?? Number.NaN),
    ended: () => ended,
    close: async () => {
      controller.abort();
      await reading.catch(() => undefined);
    },
  };
}

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'menutelly-live-'));
  vi.stubEnv('SCREENS_DATA_FILE', join(directory, 'screens.json'));
  vi.stubEnv('ACCOUNTS_DATA_FILE', join(directory, 'accounts.json'));
  vi.stubEnv('MENUS_DATA_FILE', join(directory, 'menus.json'));
  // Screens read studio promos (MT-26); without this a test run writes data/promos.json into the checkout.
  vi.stubEnv('PROMOS_DATA_FILE', join(directory, 'promos.json'));
  vi.useFakeTimers({ toFake: ['setInterval', 'setTimeout', 'clearInterval', 'clearTimeout'] });
});

afterEach(async () => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  await rm(directory, { recursive: true, force: true });
});

describe('MT-23: changes reach every TV within 10 seconds', () => {
  it('a TV with an open stream hears about a sold-out dish within about 3 seconds', async () => {
    const { restaurantId, token, itemId } = await restaurantWithScreen();
    const stream = openStream(token, '203.0.113.71');
    await vi.waitFor(() => expect(stream.versions()).toHaveLength(1));

    await markSoldOut(restaurantId, itemId);
    await vi.advanceTimersByTimeAsync(3_100);

    await vi.waitFor(() => expect(stream.versions()).toHaveLength(2));
    const [before, after] = stream.versions();
    expect(after).not.toBe(before);
    await stream.close();
  });

  it('a stream ends before the hosting limit and tells the TV to come back soon enough to stay under 10 seconds', async () => {
    const { token } = await restaurantWithScreen();
    const stream = openStream(token, '203.0.113.72');
    await vi.waitFor(() => expect(stream.versions()).toHaveLength(1));

    // Worst case: a change lands just after a check (3 s to the next one) or just as the stream ends (one reconnect).
    expect(3_000 + stream.retryMs()).toBeLessThan(TEN_SECONDS);
    await vi.advanceTimersByTimeAsync(FUNCTION_LIMIT_MS - 1_000);
    await vi.waitFor(() => expect(stream.ended()).toBe(true));
    await stream.close();
  });

  it('a TV that reconnects after a change gets the new version as the first thing it hears', async () => {
    const { restaurantId, token, itemId } = await restaurantWithScreen();
    const first = openStream(token, '203.0.113.73');
    await vi.waitFor(() => expect(first.versions()).toHaveLength(1));
    await first.close();

    await markSoldOut(restaurantId, itemId);
    const second = openStream(token, '203.0.113.73');
    await vi.waitFor(() => expect(second.versions()).toHaveLength(1));
    expect(second.versions()[0]).not.toBe(first.versions()[0]);
    await second.close();
  });
});
