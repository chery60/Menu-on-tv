import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getAccountsRepository } from '@/features/accounts/repository';
import { getMenusRepository } from '@/features/menu/repository';
import { getScreensRepository } from '@/features/screens/repository';

/**
 * The owner app's Server Actions, called the way a browser would: with or without a session cookie.
 * Every action must check who is signed in and their role itself.
 */

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ refresh: vi.fn() }));
// The photo reader calls Claude; these tests stand in for it so they never spend money or need a key.
const reader = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock('@/features/menu/photo-reader', async (original) => ({ ...(await original<typeof import('@/features/menu/photo-reader')>()), readMenuPhoto: reader.read }));
vi.mock('next/server', async (original) => ({ ...(await original<typeof import('next/server')>()), connection: async () => undefined }));

const jar = new Map<string, string>();
let address = '198.51.100.1';
vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-forwarded-for': address, host: 'localhost:3000' }),
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name) } : undefined),
    set: (name: string, value: string) => void jar.set(name, value),
    delete: (name: string) => void jar.delete(name),
  }),
}));

const { createScreenAction, connectTvAction, updateScreenAction } = await import('./actions');
const { editMenuAction, importMenuAction, readMenuPhotoAction, setSoldOutAction, uploadPhotoAction } = await import('./menu/actions');
const { MenuPhotoError } = await import('@/features/menu/photo-reader');
const { addPersonAction, removePersonAction } = await import('./restaurant/actions');
const { createRestaurantAction } = await import('./setup/actions');
const { startSignInAction, verifySignInAction, signOutAction } = await import('../sign-in/actions');
const { GET: PHOTO } = await import('../api/photos/[id]/route');

let directory: string;
const IDLE = { status: 'idle' } as const;
const form = (fields: Record<string, string | Blob>) => {
  const data = new FormData();
  Object.entries(fields).forEach(([key, value]) => data.set(key, value));
  return data;
};

async function person(value: string): Promise<{ token: string; userId: string }> {
  const accounts = getAccountsRepository();
  const started = await accounts.startSignIn({ channel: 'phone', value }, new Date());
  if (started.status !== 'sent') throw new Error('expected a code');
  const verified = await accounts.verifySignIn(started.challengeId, started.code, new Date());
  if (verified.status !== 'signed-in') throw new Error('expected to sign in');
  return verified;
}

const signInAs = (token: string | null) => (token ? jar.set('mt_session', token) : jar.delete('mt_session'));

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

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'menutelly-actions-'));
  vi.stubEnv('SCREENS_DATA_FILE', join(directory, 'screens.json'));
  vi.stubEnv('ACCOUNTS_DATA_FILE', join(directory, 'accounts.json'));
  vi.stubEnv('MENUS_DATA_FILE', join(directory, 'menus.json'));
  vi.stubEnv('PHOTOS_DIR', join(directory, 'photos'));
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  jar.clear();
  address = `198.51.100.${Math.floor(Math.random() * 250)}`;
});

afterEach(async () => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  await rm(directory, { recursive: true, force: true });
});

async function ownerWithStaff() {
  const owner = await person('+919876500001');
  const restaurant = await getAccountsRepository().createRestaurant(owner.userId, { name: 'Chai Point', city: 'Indiranagar', tagline: '' }, new Date());
  await getAccountsRepository().addPerson(restaurant.id, { channel: 'phone', value: '+919876500002' }, 'staff', new Date());
  const staff = await person('+919876500002');
  return { owner, staff, restaurant };
}

describe('signed out', () => {
  it('can’t change screens or the menu', async () => {
    signInAs(null);
    expect(await createScreenAction(IDLE, form({ name: 'TV', layout: 'split', theme: 'night' }))).toMatchObject({ status: 'error', message: expect.stringMatching(/signed out/) });
    expect(await editMenuAction({ type: 'add-category', name: 'Chai', nameHi: '' })).toMatchObject({ ok: false, menu: null });
    signInAs('x'.repeat(43));
    expect(await setSoldOutAction(IDLE, form({ itemId: 'a', soldOut: 'true' }))).toMatchObject({ status: 'error' });
  });
});

describe('staff', () => {
  it('edit the menu and sold out, but not screens, TVs or people', async () => {
    const { staff } = await ownerWithStaff();
    signInAs(staff.token);
    const added = await editMenuAction({ type: 'add-category', name: 'Chai', nameHi: '' });
    expect(added.ok).toBe(true);
    expect(await createScreenAction(IDLE, form({ name: 'TV', layout: 'split', theme: 'night' }))).toMatchObject({ status: 'error', message: expect.stringMatching(/Only an owner/) });
    expect(await connectTvAction(IDLE, form({ code: 'ABC234', screenId: 'new' }))).toMatchObject({ message: expect.stringMatching(/Only an owner/) });
    expect(await addPersonAction(IDLE, form({ identifier: '9000000000', role: 'owner' }))).toMatchObject({ message: expect.stringMatching(/Only an owner/) });
  });
});

describe('menu import', () => {
  const samosa = { name: 'Samosa', nameHi: '', description: '', prices: [{ label: '', paise: 2000 }], diet: 'veg', badges: [], kcal: null, serving: '', allergens: [] };

  it('needs a signed-in member, checks the dishes, and saves them to the member’s own restaurant', async () => {
    const { staff, restaurant } = await ownerWithStaff();
    signInAs(null);
    expect(await importMenuAction([{ category: 'Snacks', items: [samosa] }])).toMatchObject({ ok: false, menu: null, message: expect.stringMatching(/signed out/) });
    signInAs(staff.token);
    expect(await importMenuAction([])).toMatchObject({ ok: false, message: 'Add at least one dish.' });
    expect(await importMenuAction([{ category: 'Snacks', items: [{ ...samosa, prices: [] }] }])).toMatchObject({ ok: false, message: 'Enter a price in rupees.' });
    const imported = await importMenuAction([{ category: 'Snacks', items: [samosa, { ...samosa, name: 'Vada pav' }] }]);
    expect(imported.ok).toBe(true);
    const saved = await getMenusRepository().get(restaurant.id, new Date());
    expect(saved.categories.map((category) => `${category.name}: ${category.items.map((item) => item.name).join(', ')}`)).toEqual(['Snacks: Samosa, Vada pav']);
  });
});

describe('screen timing', () => {
  it('saves the owner’s choice within the limits, and refuses one outside them', async () => {
    const { owner, restaurant } = await ownerWithStaff();
    signInAs(owner.token);
    const { screen } = await getScreensRepository().createScreen(restaurant.id, { name: 'Counter TV', layout: 'split', theme: 'paper', bilingual: false }, new Date());
    const fields = { screenId: screen.id, name: 'Counter TV', layout: 'split', theme: 'paper' };
    expect(await updateScreenAction(IDLE, form({ ...fields, menuSeconds: '30', promoSeconds: '10' }))).toMatchObject({ status: 'ok' });
    expect((await getScreensRepository().listScreens(restaurant.id))[0].timing).toEqual({ menuSeconds: 30, promoSeconds: 10 });
    expect(await updateScreenAction(IDLE, form({ ...fields, menuSeconds: '3', promoSeconds: '10' }))).toMatchObject({ status: 'error' });
  });
});

describe('menu from a photo', () => {
  const jpeg = () => new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70])], { type: 'image/jpeg' });
  const chai = { category: 'Chai', name: 'Masala chai', nameHi: '', diet: 'veg', prices: [{ label: '', rupees: 30 }], unsure: [] };

  beforeEach(() => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-test');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('says plainly when reading photos is not switched on, instead of asking to try again', async () => {
    reader.read.mockReset();
    vi.stubEnv('ANTHROPIC_API_KEY', '');
    const { owner } = await ownerWithStaff();
    signInAs(owner.token);
    expect(await readMenuPhotoAction(form({ photo: jpeg() }))).toEqual({ ok: false, message: 'Reading menus from photos isn’t switched on yet. Paste your menu instead.' });
    expect(reader.read).not.toHaveBeenCalled();
  });

  it('needs a signed-in member and a real image, and never calls the reader otherwise', async () => {
    reader.read.mockReset();
    const { staff } = await ownerWithStaff();
    signInAs(null);
    expect(await readMenuPhotoAction(form({ photo: jpeg() }))).toMatchObject({ ok: false, message: expect.stringMatching(/signed out/) });
    signInAs(staff.token);
    expect(await readMenuPhotoAction(form({}))).toMatchObject({ ok: false, message: 'Choose a photo of your menu first.' });
    expect(await readMenuPhotoAction(form({ photo: new Blob(['<svg/>'], { type: 'image/jpeg' }) }))).toMatchObject({ ok: false, message: expect.stringMatching(/JPEG, PNG or WebP/) });
    expect(await readMenuPhotoAction(form({ photo: new Blob([new Uint8Array(960 * 1024)], { type: 'image/jpeg' }) }))).toMatchObject({ ok: false, message: expect.stringMatching(/too large/) });
    expect(reader.read).not.toHaveBeenCalled();
  });

  it('returns the dishes to check and saves nothing', async () => {
    reader.read.mockReset().mockResolvedValue({ dishes: [chai, { ...chai, name: 'Samosa', prices: [{ label: '', rupees: null }] }], problem: '' });
    const { staff, restaurant } = await ownerWithStaff();
    signInAs(staff.token);
    const result = await readMenuPhotoAction(form({ photo: jpeg() }));
    expect(result).toMatchObject({ ok: true, items: [{ line: 1, name: 'Masala chai', flag: null }, { line: 2, name: 'Samosa', prices: [], unsure: ['price'] }] });
    expect(reader.read.mock.calls[0][0]).toMatchObject({ type: 'image/jpeg' });
    expect((await getMenusRepository().get(restaurant.id, new Date())).categories).toEqual([]);
  });

  it('says why when there were no dishes, passes on what the owner can fix, and hides faults', async () => {
    const { owner } = await ownerWithStaff();
    signInAs(owner.token);
    reader.read.mockReset().mockResolvedValueOnce({ dishes: [], problem: 'The photo is too blurred to read. Take it again in good light.' });
    expect(await readMenuPhotoAction(form({ photo: jpeg() }))).toMatchObject({ ok: false, message: 'The photo is too blurred to read. Take it again in good light.' });
    reader.read.mockRejectedValueOnce(new MenuPhotoError('Photograph one part of the menu at a time.'));
    expect(await readMenuPhotoAction(form({ photo: jpeg() }))).toMatchObject({ ok: false, message: 'Photograph one part of the menu at a time.' });
    reader.read.mockRejectedValueOnce(new Error('401 invalid x-api-key'));
    expect(await readMenuPhotoAction(form({ photo: jpeg() }))).toMatchObject({ ok: false, message: expect.not.stringMatching(/401|api/i) });
  });

  it('limits how many photos one restaurant can read in a day', async () => {
    reader.read.mockReset().mockResolvedValue({ dishes: [chai], problem: '' });
    const { owner } = await ownerWithStaff();
    signInAs(owner.token);
    const results = [];
    for (let i = 0; i < 41; i += 1) results.push(await readMenuPhotoAction(form({ photo: jpeg() })));
    expect(results.filter((result) => result.ok)).toHaveLength(40);
    expect(results[40]).toMatchObject({ ok: false, message: expect.stringMatching(/paste/i) });
  });
});

describe('owners', () => {
  it('can’t reach another restaurant’s screens', async () => {
    const mine = await ownerWithStaff();
    const other = await person('+919876500003');
    const theirs = await getAccountsRepository().createRestaurant(other.userId, { name: 'Dosa Hut', city: 'HSR', tagline: '' }, new Date());
    const { screen } = await getScreensRepository().createScreen(theirs.id, { name: 'Their TV', layout: 'split', theme: 'night', bilingual: false }, new Date());
    signInAs(mine.owner.token);
    expect(await updateScreenAction(IDLE, form({ screenId: screen.id, name: 'Mine now', layout: 'board', theme: 'paper' }))).toMatchObject({ status: 'error' });
    const { code } = await getScreensRepository().startPairing(new Date());
    expect(await connectTvAction(IDLE, form({ code, screenId: screen.id }))).toMatchObject({ status: 'error', message: expect.stringMatching(/Choose which screen/) });
    expect((await getScreensRepository().listScreens(theirs.id))[0].name).toBe('Their TV');
  });

  it('pair a TV straight onto a new screen, and get nothing extra when the code is wrong', async () => {
    const { owner, restaurant } = await ownerWithStaff();
    signInAs(owner.token);
    expect(await connectTvAction(IDLE, form({ code: 'ZZZZZZ', screenId: 'new' }))).toMatchObject({ status: 'error' });
    expect(await getScreensRepository().listScreens(restaurant.id)).toHaveLength(0);
    const { code } = await getScreensRepository().startPairing(new Date());
    expect(await connectTvAction(IDLE, form({ code, screenId: 'new' }))).toMatchObject({ status: 'ok' });
    expect((await getScreensRepository().listScreens(restaurant.id))[0]).toMatchObject({ name: 'Counter TV', links: [] });
  });

  it('never remove the last owner', async () => {
    const { owner, staff } = await ownerWithStaff();
    signInAs(owner.token);
    expect(await removePersonAction(IDLE, form({ userId: owner.userId }))).toMatchObject({ status: 'error', message: expect.stringMatching(/at least one owner/) });
    expect(await removePersonAction(IDLE, form({ userId: staff.userId }))).toMatchObject({ status: 'ok' });
  });
});

describe('photos', () => {
  it('accept real images only, and serve them back with their type', async () => {
    const { owner, restaurant } = await ownerWithStaff();
    signInAs(owner.token);
    await editMenuAction({ type: 'add-category', name: 'Chai', nameHi: '' });
    const [category] = (await getMenusRepository().get(restaurant.id, new Date())).categories;
    const added = await editMenuAction({ type: 'add-item', categoryId: category.id, item: { name: 'Masala chai', nameHi: '', description: '', prices: [{ label: '', paise: 3000 }], diet: 'veg', badges: [], kcal: null, serving: '', allergens: [] } });
    const itemId = added.createdId ?? '';
    expect(itemId).not.toBe('');

    const html = await uploadPhotoAction(form({ itemId, photo: new Blob(['<script>alert(1)</script>'], { type: 'image/jpeg' }) }));
    expect(html).toMatchObject({ ok: false, message: expect.stringMatching(/JPEG, PNG or WebP/) });

    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70]);
    const uploaded = await uploadPhotoAction(form({ itemId, photo: new Blob([jpeg], { type: 'image/jpeg' }) }));
    const photo = uploaded.menu?.categories[0].items[0].photo ?? '';
    expect(photo).toMatch(/^[0-9a-f-]{36}$/);
    const served = await PHOTO(new Request('http://localhost', { headers: { 'x-forwarded-for': address } }), { params: Promise.resolve({ id: photo }) });
    expect(served.headers.get('content-type')).toBe('image/jpeg');
    expect(served.headers.get('cache-control')).toContain('immutable');

    await editMenuAction({ type: 'remove-item', itemId });
    expect((await PHOTO(new Request('http://localhost'), { params: Promise.resolve({ id: photo }) })).status).toBe(404);
  });
});

describe('sign-in', () => {
  it('sends a code, signs in, sets the cookie and goes to setup the first time', async () => {
    const started = await startSignInAction({ status: 'idle' }, form({ identifier: '98765 00009' }));
    if (started.status !== 'code-sent' || !started.devCode) throw new Error('expected a code on screen in development');
    expect(started.destination).toBe('+91 98765 00009');

    const wrong = started.devCode === '000000' ? '111111' : '000000';
    expect(await verifySignInAction({ status: 'idle' }, form({ challengeId: started.challengeId, code: wrong, next: '/studio' }))).toMatchObject({ message: expect.stringMatching(/4 tries left/) });
    expect(await redirectOf(() => verifySignInAction({ status: 'idle' }, form({ challengeId: started.challengeId, code: started.devCode ?? '', next: 'https://evil.example' })))).toBe('/studio/setup');
    expect(jar.get('mt_session')).toMatch(/^[A-Za-z0-9_-]{43}$/);

    expect(await redirectOf(() => createRestaurantAction(IDLE, form({ name: 'Chai Point', city: 'Indiranagar', tagline: '', start: 'sample' })))).toBe('/studio/menu');
    expect(await redirectOf(() => signOutAction())).toBe('/sign-in');
    expect(jar.has('mt_session')).toBe(false);
  });

  it('won’t text numbers outside India, or take a malformed address', async () => {
    expect(await startSignInAction({ status: 'idle' }, form({ identifier: '+44 7700 900123' }))).toMatchObject({ status: 'error', message: expect.stringMatching(/\+91/) });
    expect(await startSignInAction({ status: 'idle' }, form({ identifier: 'chai' }))).toMatchObject({ status: 'error' });
  });

  it('slows down one connection that asks for many codes', async () => {
    const results = [];
    for (let attempt = 0; attempt < 11; attempt += 1) results.push(await startSignInAction({ status: 'idle' }, form({ identifier: `98765${String(attempt).padStart(5, '0')}` })));
    expect(results.at(-1)).toMatchObject({ status: 'error', message: expect.stringMatching(/Too many tries/) });
  });
});

describe('sign-in in production with no provider', () => {
  it('says so plainly instead of sending the owner between phone and email', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    for (const key of ['RESEND_API_KEY', 'AUTH_EMAIL_FROM', 'TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_FROM']) vi.stubEnv(key, '');
    // Its own address, so earlier tests' sign-ins never put it over the per-address limit.
    address = '198.51.100.250';
    const phone = await startSignInAction({ status: 'idle' }, form({ identifier: '9876500111' }));
    expect(phone).toMatchObject({ status: 'error', message: 'Sign-in isn’t switched on here yet. Try again later.' });
    vi.stubEnv('RESEND_API_KEY', 're_test');
    vi.stubEnv('AUTH_EMAIL_FROM', 'codes@menutelly.example');
    address = '198.51.100.251';
    const suggestion = await startSignInAction({ status: 'idle' }, form({ identifier: '9876500112' }));
    expect(suggestion).toMatchObject({ status: 'error', message: expect.stringMatching(/Use your email address instead/) });
  });
});
