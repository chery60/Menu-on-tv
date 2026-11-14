/**
 * QA checks for MT-34 slice 1 (docs/prd/mt-34-ten-minute-onboarding.md), at the Server Actions the onboarding path
 * calls and the routes a TV calls. Line 2: the look the owner keeps is what the first TV plays once connected, in any
 * of the six layouts and both colours; with nothing kept it plays Split on Paper (Design, the preselect). Rules: a
 * later change on the TVs tab changes that screen, not the onboarding choice. Line 5: "Add today's special?", once
 * answered, stays answered. Line 8: owners only; staff, signed-out callers and other restaurants change nothing.
 */
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getAccountsRepository } from '@/features/accounts/repository';
import { getMenusRepository } from '@/features/menu/repository';
import { sampleMenu } from '@/features/menu/sample';
import { LAYOUT_IDS, THEME_IDS } from '@/features/screen/types';
import { getScreensRepository } from '@/features/screens/repository';

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ refresh: vi.fn() }));
vi.mock('next/server', async (original) => ({ ...(await original<typeof import('next/server')>()), connection: async () => undefined }));

const jar = new Map<string, string>();
vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-forwarded-for': '198.51.100.34', host: 'localhost:3000' }),
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name) } : undefined),
    set: (name: string, value: string) => void jar.set(name, value),
    delete: (name: string) => void jar.delete(name),
  }),
}));

const { answerSpecialNudgeAction, connectTvAction, keepLookAction, updateScreenAction } = await import('./actions');
const { OWNERS_ONLY, SIGN_IN_AGAIN } = await import('./guard');
const { POST: START } = await import('../api/pairing/start/route');
const { POST: COLLECT } = await import('../api/pairing/[code]/route');
const { GET: BUNDLE } = await import('../api/s/[token]/bundle/route');

let directory: string;
const IDLE = { status: 'idle' } as const;
const form = (fields: Record<string, string>) => {
  const data = new FormData();
  Object.entries(fields).forEach(([key, value]) => data.set(key, value));
  return data;
};
const signInAs = (token: string | null) => (token ? jar.set('mt_session', token) : jar.delete('mt_session'));

// Each TV gets its own address, so the routes' per-address limits never decide a check.
let tvAddress = 0;
const tvHeaders = () => ({ 'content-type': 'application/json', 'x-forwarded-for': `203.0.113.${(tvAddress += 1)}` });
const params = <T extends Record<string, string>>(value: T) => ({ params: Promise.resolve(value) });
const data = async <T,>(response: Response): Promise<T> => ((await response.json()) as { data: T }).data;

async function person(phone: string): Promise<{ token: string; userId: string }> {
  const accounts = getAccountsRepository();
  const started = await accounts.startSignIn({ channel: 'phone', value: phone }, new Date());
  if (started.status !== 'sent') throw new Error('expected a code');
  const verified = await accounts.verifySignIn(started.challengeId, started.code, new Date());
  if (verified.status !== 'signed-in') throw new Error('expected to sign in');
  return verified;
}

/** A brand-new owner who has set up their restaurant with the sample menu, as step 1 leaves it. */
async function newOwner(phone: string, name = 'Chai Point') {
  const owner = await person(phone);
  const restaurant = await getAccountsRepository().createRestaurant(owner.userId, { name, city: 'Indiranagar', tagline: '' }, new Date());
  let next = 0;
  await getMenusRepository().update(restaurant.id, () => sampleMenu(new Date(), () => `dish-${(next += 1)}`), new Date());
  return { owner, restaurant };
}

/** The TV asks for a code, the signed-in owner types it in as a new screen, and the TV collects its link. */
async function connectNewTv(): Promise<string> {
  const headers = tvHeaders();
  const started = await START(new Request('http://localhost/api/pairing/start', { method: 'POST', headers, body: '{}' }));
  expect(started.status).toBe(201);
  const { code, deviceSecret } = await data<{ code: string; deviceSecret: string }>(started);
  expect(await connectTvAction(IDLE, form({ code, screenId: 'new' }))).toMatchObject({ status: 'ok' });
  const collected = await COLLECT(new Request(`http://localhost/api/pairing/${code}`, { method: 'POST', headers, body: JSON.stringify({ deviceSecret }) }), params({ code }));
  const paired = await data<{ status: string; token: string }>(collected);
  expect(paired.status).toBe('paired');
  return paired.token;
}

type Played = { layout: string; theme: string; restaurant: { name: string; categories: { items: unknown[] }[] } };

/** What the TV plays: the bundle it downloads with its link. */
async function playing(token: string): Promise<Played> {
  const response = await BUNDLE(new Request('http://localhost', { headers: tvHeaders() }), params({ token }));
  expect(response.status).toBe(200);
  return data<Played>(response);
}

const lookOf = async (restaurantId: string) => (await getAccountsRepository().restaurant(restaurantId))?.look;
const nudgeOf = async (restaurantId: string) => (await getAccountsRepository().restaurant(restaurantId))?.specialNudgeAnswered;

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'menuontv-qa-mt34-actions-'));
  vi.stubEnv('SCREENS_DATA_FILE', join(directory, 'screens.json'));
  vi.stubEnv('ACCOUNTS_DATA_FILE', join(directory, 'accounts.json'));
  vi.stubEnv('MENUS_DATA_FILE', join(directory, 'menus.json'));
  vi.stubEnv('PROMOS_DATA_FILE', join(directory, 'promos.json'));
  vi.stubEnv('PHOTOS_DIR', join(directory, 'photos'));
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  jar.clear();
});

afterEach(async () => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  await rm(directory, { recursive: true, force: true });
});

describe('the first TV plays the look the owner kept (line 2)', () => {
  it('Full board on Night, kept in step 2, is what the TV plays once connected, with the owner’s own menu', async () => {
    const { owner, restaurant } = await newOwner('+919876503401');
    signInAs(owner.token);
    expect(await keepLookAction(IDLE, form({ layout: 'board', theme: 'night' }))).toMatchObject({ status: 'ok' });

    const tv = await playing(await connectNewTv());
    expect(tv).toMatchObject({ layout: 'board', theme: 'night', restaurant: { name: 'Chai Point' } });
    expect(tv.restaurant.categories.flatMap((category) => category.items).length).toBeGreaterThan(0);
    expect(await lookOf(restaurant.id)).toEqual({ layout: 'board', theme: 'night' });
  });

  it('holds for each of the six layouts in both colours', async () => {
    let phone = 503410;
    for (const layout of LAYOUT_IDS) {
      for (const theme of THEME_IDS) {
        const { owner, restaurant } = await newOwner(`+919876${(phone += 1)}`);
        signInAs(owner.token);
        expect(await keepLookAction(IDLE, form({ layout, theme }))).toMatchObject({ status: 'ok' });
        const { code } = await getScreensRepository().startPairing(new Date());
        expect(await connectTvAction(IDLE, form({ code, screenId: 'new' }))).toMatchObject({ status: 'ok' });
        const screens = await getScreensRepository().listScreens(restaurant.id);
        expect(screens.map((screen) => ({ layout: screen.layout, theme: screen.theme }))).toEqual([{ layout, theme }]);
      }
    }
  });

  it('is Split on Paper, the preselected look, when the owner kept nothing', async () => {
    const { owner, restaurant } = await newOwner('+919876503402');
    signInAs(owner.token);
    expect(await playing(await connectNewTv())).toMatchObject({ layout: 'split', theme: 'paper' });
    expect(await lookOf(restaurant.id)).toBeNull();
  });
});

describe('changing the look later on the TVs tab (rules and edge cases)', () => {
  it('changes that screen and what its TV plays, not the onboarding choice', async () => {
    const { owner, restaurant } = await newOwner('+919876503403');
    signInAs(owner.token);
    await keepLookAction(IDLE, form({ layout: 'board', theme: 'night' }));
    const token = await connectNewTv();
    const [screen] = await getScreensRepository().listScreens(restaurant.id);

    expect(await updateScreenAction(IDLE, form({ screenId: screen.id, name: screen.name, layout: 'lbar', theme: 'paper' }))).toMatchObject({ status: 'ok' });
    expect(await playing(token)).toMatchObject({ layout: 'lbar', theme: 'paper' });
    expect(await lookOf(restaurant.id)).toEqual({ layout: 'board', theme: 'night' });
  });
});

describe('"Add today’s special?" (line 5)', () => {
  it('once answered stays answered: asked again, after a new look, after another TV', async () => {
    const { owner, restaurant } = await newOwner('+919876503404');
    signInAs(owner.token);
    await keepLookAction(IDLE, form({ layout: 'spotlight', theme: 'night' }));
    await connectNewTv();
    expect(await nudgeOf(restaurant.id)).toBe(false);

    expect(await answerSpecialNudgeAction()).toMatchObject({ status: 'ok' });
    expect(await nudgeOf(restaurant.id)).toBe(true);
    expect(await lookOf(restaurant.id)).toEqual({ layout: 'spotlight', theme: 'night' });

    expect(await answerSpecialNudgeAction()).toMatchObject({ status: 'ok' });
    expect(await keepLookAction(IDLE, form({ layout: 'ticker', theme: 'paper' }))).toMatchObject({ status: 'ok' });
    await connectNewTv();
    expect(await nudgeOf(restaurant.id)).toBe(true);
  });
});

describe('owners only (line 8)', () => {
  async function ownerAndStaff() {
    const { owner, restaurant } = await newOwner('+919876503405');
    await getAccountsRepository().addPerson(restaurant.id, { channel: 'phone', value: '+919876503406' }, 'staff', new Date());
    const staff = await person('+919876503406');
    return { owner, staff, restaurant };
  }

  it('staff can’t keep a look or answer the nudge, before or after the owner has', async () => {
    const { owner, staff, restaurant } = await ownerAndStaff();
    signInAs(staff.token);
    expect(await keepLookAction(IDLE, form({ layout: 'board', theme: 'night' }))).toEqual({ status: 'error', message: OWNERS_ONLY });
    expect(await answerSpecialNudgeAction()).toEqual({ status: 'error', message: OWNERS_ONLY });
    expect(await getAccountsRepository().restaurant(restaurant.id)).toMatchObject({ look: null, specialNudgeAnswered: false });

    signInAs(owner.token);
    await keepLookAction(IDLE, form({ layout: 'board', theme: 'night' }));
    signInAs(staff.token);
    expect(await keepLookAction(IDLE, form({ layout: 'lbar', theme: 'paper' }))).toEqual({ status: 'error', message: OWNERS_ONLY });
    expect(await lookOf(restaurant.id)).toEqual({ layout: 'board', theme: 'night' });
  });

  it('signed out, a forged session, or someone with no restaurant: refused, nothing changes', async () => {
    const { restaurant } = await newOwner('+919876503407');
    const stranger = await person('+919876503408');
    for (const token of [null, 'x'.repeat(43), stranger.token]) {
      signInAs(token);
      expect(await keepLookAction(IDLE, form({ layout: 'board', theme: 'night' }))).toEqual({ status: 'error', message: SIGN_IN_AGAIN });
      expect(await answerSpecialNudgeAction()).toEqual({ status: 'error', message: SIGN_IN_AGAIN });
    }
    expect(await getAccountsRepository().restaurant(restaurant.id)).toMatchObject({ look: null, specialNudgeAnswered: false });
  });

  it('an owner changes only their own restaurant; the other’s first TV still starts on Split, Paper', async () => {
    const chai = await newOwner('+919876503409', 'Chai Point');
    const dosa = await newOwner('+919876503499', 'Dosa Corner');
    signInAs(chai.owner.token);
    await keepLookAction(IDLE, form({ layout: 'portrait', theme: 'night' }));
    await answerSpecialNudgeAction();
    expect(await getAccountsRepository().restaurant(dosa.restaurant.id)).toMatchObject({ look: null, specialNudgeAnswered: false });

    signInAs(dosa.owner.token);
    expect(await playing(await connectNewTv())).toMatchObject({ layout: 'split', theme: 'paper', restaurant: { name: 'Dosa Corner' } });
  });
});

describe('a look that isn’t one of the choices', () => {
  it('is refused and nothing is kept', async () => {
    const { owner, restaurant } = await newOwner('+919876503498');
    signInAs(owner.token);
    const notChoices: Record<string, string>[] = [{}, { layout: 'board' }, { theme: 'night' }, { layout: '', theme: '' }, { layout: 'board', theme: 'night; layout=split' }];
    for (const fields of notChoices) {
      expect(await keepLookAction(IDLE, form(fields))).toMatchObject({ status: 'error' });
    }
    expect(await lookOf(restaurant.id)).toBeNull();
  });
});
