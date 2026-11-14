import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getAccountsRepository } from '@/features/accounts/repository';
import { getFunnelRepository } from '@/features/funnel/repository';
import { getScreensRepository } from '@/features/screens/repository';

/**
 * MT-36 slice 1: each funnel step is recorded by the action that completes it, and owner activity by guard.ts,
 * called the way a browser or a TV would.
 */

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ refresh: vi.fn() }));
vi.mock('next/server', async (original) => ({ ...(await original<typeof import('next/server')>()), connection: async () => undefined }));

const jar = new Map<string, string>();
vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-forwarded-for': '198.51.100.61', host: 'localhost:3000' }),
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name) } : undefined),
    set: (name: string, value: string) => void jar.set(name, value),
    delete: (name: string) => void jar.delete(name),
  }),
}));

const { connectTvAction } = await import('./actions');
const { editMenuAction, setSoldOutAction } = await import('./menu/actions');
const { addPersonAction } = await import('./restaurant/actions');
const { createRestaurantAction } = await import('./setup/actions');
const { verifySignInAction } = await import('../sign-in/actions');
const { POST: BEAT } = await import('../api/s/[token]/beat/route');

let directory: string;
const IDLE = { status: 'idle' } as const;
const form = (fields: Record<string, string>) => {
  const data = new FormData();
  Object.entries(fields).forEach(([key, value]) => data.set(key, value));
  return data;
};
const funnel = () => getFunnelRepository().read();
const funnelFile = () => join(directory, 'funnel.json');

/** Signs in through the sign-in action, as the browser does, and returns where it went. */
async function signIn(phone: string): Promise<string> {
  const started = await getAccountsRepository().startSignIn({ channel: 'phone', value: phone }, new Date());
  if (started.status !== 'sent') throw new Error('expected a code');
  return redirectOf(() => verifySignInAction({ status: 'idle' }, form({ challengeId: started.challengeId, code: started.code })));
}

async function redirectOf(run: () => Promise<unknown>): Promise<string> {
  try {
    await run();
  } catch (error) {
    const digest = (error as { digest?: string }).digest ?? '';
    if (digest.startsWith('NEXT_REDIRECT')) return digest.split(';')[2];
    throw error;
  }
  throw new Error('expected a redirect');
}

const beat = (token: string) =>
  BEAT(new Request('http://localhost/api', { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.61' }, body: JSON.stringify({ version: null, slide: 'menu:0', sentAt: Date.now() }) }), {
    params: Promise.resolve({ token }),
  });

/** A new owner who signed up and set up Chai Point with the sample menu. */
async function owner(): Promise<string> {
  expect(await signIn('+919876500061')).toBe('/studio/setup');
  expect(await redirectOf(() => createRestaurantAction(IDLE, form({ name: 'Chai Point', city: 'Pune', start: 'sample' })))).toBe('/studio/menu');
  return Object.keys((await funnel()).restaurants)[0];
}

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'menutelly-funnel-actions-'));
  vi.stubEnv('ACCOUNTS_DATA_FILE', join(directory, 'accounts.json'));
  vi.stubEnv('MENUS_DATA_FILE', join(directory, 'menus.json'));
  vi.stubEnv('SCREENS_DATA_FILE', join(directory, 'screens.json'));
  vi.stubEnv('PROMOS_DATA_FILE', join(directory, 'promos.json'));
  vi.stubEnv('PHOTOS_DIR', join(directory, 'photos'));
  vi.stubEnv('FUNNEL_DATA_FILE', undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  jar.clear();
});

afterEach(async () => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  await rm(directory, { recursive: true, force: true });
});

describe('MT-36 milestones', () => {
  it('counts a new person as signed up, then moves them onto their restaurant when they set it up', async () => {
    expect(await signIn('+919876500061')).toBe('/studio/setup');
    const [userId] = Object.keys((await funnel()).signups);
    expect(userId).toBeDefined();

    expect(await redirectOf(() => createRestaurantAction(IDLE, form({ name: 'Chai Point', city: 'Pune', start: 'sample' })))).toBe('/studio/menu');
    const after = await funnel();
    expect(after.signups).toEqual({});
    const [entry] = Object.values(after.restaurants);
    expect(Object.keys(entry.steps).sort()).toEqual(['menu', 'set-up', 'signed-up']);
    expect(entry).toMatchObject({ channel: 'own', test: false });
  });

  it('never counts invited staff as a sign-up', async () => {
    await owner();
    expect(await addPersonAction(IDLE, form({ identifier: '9876500062', role: 'staff' }))).toMatchObject({ status: 'ok' });
    jar.clear();
    expect(await signIn('+919876500062')).toBe('/studio');
    expect((await funnel()).signups).toEqual({});
  });

  it('records the menu once it has a dish, and the TV when its code is entered', async () => {
    await signIn('+919876500061');
    await redirectOf(() => createRestaurantAction(IDLE, form({ name: 'Chai Point', city: 'Pune' })));
    const [restaurantId] = Object.keys((await funnel()).restaurants);
    expect((await funnel()).restaurants[restaurantId].steps.menu).toBeUndefined();

    expect(await editMenuAction({ type: 'add-category', name: 'Chai', nameHi: '' })).toMatchObject({ ok: true });
    expect((await funnel()).restaurants[restaurantId].steps.menu).toBeUndefined();
    const added = await editMenuAction({ type: 'add-category', name: 'Snacks', nameHi: '' });
    const categoryId = added.menu!.categories[0].id;
    expect(await editMenuAction({ type: 'add-item', categoryId, item: { name: 'Masala chai', nameHi: '', description: '', prices: [{ label: '', paise: 2500 }], diet: 'veg', badges: [], kcal: null, serving: '', allergens: [] } })).toMatchObject({ ok: true });
    expect((await funnel()).restaurants[restaurantId].steps.menu).toBeDefined();

    expect(await connectTvAction(IDLE, form({ code: 'ZZZZZZ', screenId: 'new' }))).toMatchObject({ status: 'error' });
    expect((await funnel()).restaurants[restaurantId].steps.tv).toBeUndefined();
    const { code } = await getScreensRepository().startPairing(new Date());
    expect(await connectTvAction(IDLE, form({ code, screenId: 'new' }))).toMatchObject({ status: 'ok' });
    expect((await funnel()).restaurants[restaurantId].steps.tv).toBeDefined();
  });

  it('puts the screen on air at a TV’s first heartbeat, and later beats change nothing', async () => {
    const restaurantId = await owner();
    const { code, deviceSecret } = await getScreensRepository().startPairing(new Date());
    expect(await connectTvAction(IDLE, form({ code, screenId: 'new' }))).toMatchObject({ status: 'ok' });
    const collected = await getScreensRepository().collectPairing(code, deviceSecret, new Date());
    if (collected.status !== 'paired') throw new Error('expected the TV to pair');

    expect((await beat(collected.token)).status).toBe(200);
    const onAir = (await funnel()).restaurants[restaurantId].steps['on-air'];
    expect(onAir).toBeDefined();
    const written = await readFile(funnelFile(), 'utf8');
    expect((await beat(collected.token)).status).toBe(200);
    expect(await readFile(funnelFile(), 'utf8')).toBe(written);
  });
});

describe('MT-36 weekly activity', () => {
  it('marks today once for any change, and once more when a quick action is used, however often', async () => {
    const restaurantId = await owner();
    expect((await funnel()).restaurants[restaurantId].active).toEqual({});

    expect(await editMenuAction({ type: 'add-category', name: 'Specials', nameHi: '' })).toMatchObject({ ok: true });
    expect(Object.values((await funnel()).restaurants[restaurantId].active)).toEqual(['change']);

    const menu = (await editMenuAction({ type: 'add-category', name: 'More', nameHi: '' })).menu!;
    const itemId = menu.categories.flatMap((category) => category.items)[0].id;
    expect(await setSoldOutAction(IDLE, form({ itemId, soldOut: 'true' }))).toMatchObject({ status: 'ok' });
    expect(Object.values((await funnel()).restaurants[restaurantId].active)).toEqual(['quick']);

    const written = await readFile(funnelFile(), 'utf8');
    for (let index = 0; index < 10; index += 1) {
      expect(await editMenuAction({ type: 'set-sold-out', itemId, soldOut: index % 2 === 0 })).toMatchObject({ ok: true });
    }
    expect(await editMenuAction({ type: 'add-category', name: 'Later', nameHi: '' })).toMatchObject({ ok: true });
    expect(await readFile(funnelFile(), 'utf8')).toBe(written);
  });

  it('never fails an owner’s change when the funnel can’t be written', async () => {
    const restaurantId = await owner();
    const menu = (await editMenuAction({ type: 'add-category', name: 'More', nameHi: '' })).menu!;
    const itemId = menu.categories.flatMap((category) => category.items)[0].id;
    await writeFile(funnelFile(), 'not json');

    expect(await setSoldOutAction(IDLE, form({ itemId, soldOut: 'true' }))).toMatchObject({ status: 'ok' });
    expect(await editMenuAction({ type: 'set-sold-out', itemId, soldOut: false })).toMatchObject({ ok: true });
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('funnel.activity_failed'));
    expect(console.error).not.toHaveBeenCalledWith(expect.stringContaining(restaurantId));
  });
});
