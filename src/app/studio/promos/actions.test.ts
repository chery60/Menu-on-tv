import { randomUUID } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getAccountsRepository } from '@/features/accounts/repository';
import { getMenusRepository } from '@/features/menu/repository';
import { sampleMenu } from '@/features/menu/sample';
import { getPromosRepository } from '@/features/promos/repository';
import { PROMO_LIMITS } from '@/features/promos/schema';

/** The promo studio's Server Actions, called as a browser would: signed out, as staff, and as another restaurant's owner. */

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ refresh: vi.fn() }));
vi.mock('next/server', async (original) => ({ ...(await original<typeof import('next/server')>()), connection: async () => undefined }));

const jar = new Map<string, string>();
vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-forwarded-for': '198.51.100.7', host: 'localhost:3000' }),
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name) } : undefined),
    set: (name: string, value: string) => void jar.set(name, value),
    delete: (name: string) => void jar.delete(name),
  }),
}));

const { removePromoAction, savePromoAction, setPromoPausedAction } = await import('./actions');

let directory: string;

async function person(value: string): Promise<{ token: string; userId: string }> {
  const accounts = getAccountsRepository();
  const started = await accounts.startSignIn({ channel: 'phone', value }, new Date());
  if (started.status !== 'sent') throw new Error('expected a code');
  const verified = await accounts.verifySignIn(started.challengeId, started.code, new Date());
  if (verified.status !== 'signed-in') throw new Error('expected to sign in');
  return verified;
}

const signInAs = (token: string | null) => (token ? jar.set('mt_session', token) : jar.delete('mt_session'));

/** A café with the sample menu (Masala chai ₹30, Samosa ₹40), its owner and one staff member. */
async function cafe(phone = '+919876500001', staffPhone = '+919876500002') {
  const owner = await person(phone);
  const restaurant = await getAccountsRepository().createRestaurant(owner.userId, { name: 'Chai Point', city: 'Indiranagar', tagline: '' }, new Date());
  await getAccountsRepository().addPerson(restaurant.id, { channel: 'phone', value: staffPhone }, 'staff', new Date());
  const staff = await person(staffPhone);
  const menu = await getMenusRepository().update(restaurant.id, () => sampleMenu(new Date(), randomUUID), new Date());
  const items = menu.categories.flatMap((category) => category.items);
  const id = (name: string) => items.find((item) => item.name.startsWith(name))?.id ?? '';
  const combo = { template: 'combo', dishes: [{ itemId: id('Masala chai'), size: '' }, { itemId: id('Samosa'), size: '' }], dealPaise: 6000, headline: 'Chai and samosa' };
  return { owner, staff, restaurant, combo };
}

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'menutelly-promo-actions-'));
  vi.stubEnv('ACCOUNTS_DATA_FILE', join(directory, 'accounts.json'));
  vi.stubEnv('MENUS_DATA_FILE', join(directory, 'menus.json'));
  vi.stubEnv('PROMOS_DATA_FILE', join(directory, 'promos.json'));
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  jar.clear();
});

afterEach(async () => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  await rm(directory, { recursive: true, force: true });
});

describe('the owner', () => {
  it('makes, changes, pauses, resumes and removes a promo', async () => {
    const { owner, restaurant, combo } = await cafe();
    signInAs(owner.token);
    expect(await savePromoAction(combo)).toEqual({ status: 'ok', message: 'Promo saved.' });
    const [made] = await getPromosRepository().list(restaurant.id);
    expect(made).toMatchObject({ template: 'combo', dealPaise: 6000, headline: 'Chai and samosa', paused: false });

    expect(await savePromoAction({ ...combo, id: made.id, headline: 'Tea time' })).toMatchObject({ status: 'ok' });
    expect(await setPromoPausedAction({ id: made.id, paused: true })).toMatchObject({ status: 'ok', message: expect.stringMatching(/^Paused/) });
    expect((await getPromosRepository().list(restaurant.id))[0]).toMatchObject({ headline: 'Tea time', paused: true });
    expect(await setPromoPausedAction({ id: made.id, paused: false })).toMatchObject({ status: 'ok' });
    expect(await removePromoAction({ id: made.id })).toEqual({ status: 'ok', message: 'Promo removed.' });
    expect(await getPromosRepository().list(restaurant.id)).toEqual([]);
  });

  it('can’t save a deal that isn’t lower than the menu, a bad link, or an end that has passed', async () => {
    const { owner, restaurant, combo } = await cafe();
    signInAs(owner.token);
    expect(await savePromoAction({ ...combo, dealPaise: 7000 })).toEqual({ status: 'error', message: 'The combo price has to be lower than ₹70, the menu price.' });
    expect(await savePromoAction({ template: 'scan', headline: 'Order online', link: 'zomato.com/x' })).toEqual({ status: 'error', message: 'Use the full link, starting with https://' });
    expect(await savePromoAction({ ...combo, endsAt: '2020-01-01T10:00' })).toEqual({ status: 'error', message: 'Pick an end time that hasn’t passed.' });
    expect(await savePromoAction('not a promo')).toMatchObject({ status: 'error' });
    expect(await getPromosRepository().list(restaurant.id)).toEqual([]);
  });

  it(`is told when the restaurant has ${PROMO_LIMITS.perRestaurant} promos`, async () => {
    const { owner, restaurant, combo } = await cafe();
    const stamp = new Date().toISOString();
    const saved = { ...combo, dealPaise: 6000, line: '', festival: null, link: null, startsAt: null, endsAt: null, daypart: null, countdown: false, paused: false, createdAt: stamp, updatedAt: stamp };
    const full = Array.from({ length: PROMO_LIMITS.perRestaurant }, (_, index) => ({ ...saved, id: `p${index}` }));
    await writeFile(join(directory, 'promos.json'), JSON.stringify({ version: 1, promos: { [restaurant.id]: full } }));
    signInAs(owner.token);
    expect(await savePromoAction(combo)).toEqual({ status: 'error', message: 'You can have up to 20 promos. Remove one you no longer need.' });
  });
});

describe('who else', () => {
  it('staff can’t make, change, pause or remove promos', async () => {
    const { owner, staff, restaurant, combo } = await cafe();
    signInAs(owner.token);
    await savePromoAction(combo);
    const [made] = await getPromosRepository().list(restaurant.id);
    signInAs(staff.token);
    const refused = { status: 'error', message: expect.stringMatching(/Only an owner/) };
    expect(await savePromoAction(combo)).toMatchObject(refused);
    expect(await savePromoAction({ ...combo, id: made.id, headline: 'Staff edit' })).toMatchObject(refused);
    expect(await setPromoPausedAction({ id: made.id, paused: true })).toMatchObject(refused);
    expect(await removePromoAction({ id: made.id })).toMatchObject(refused);
    expect(await getPromosRepository().list(restaurant.id)).toMatchObject([{ headline: 'Chai and samosa', paused: false }]);
  });

  it('signed out, nothing changes', async () => {
    const { combo } = await cafe();
    signInAs(null);
    expect(await savePromoAction(combo)).toMatchObject({ status: 'error', message: expect.stringMatching(/signed out/) });
    expect(await removePromoAction({ id: 'any' })).toMatchObject({ status: 'error' });
  });

  it('another restaurant’s owner can’t reach this restaurant’s promos', async () => {
    const first = await cafe();
    signInAs(first.owner.token);
    await savePromoAction(first.combo);
    const [made] = await getPromosRepository().list(first.restaurant.id);
    const second = await cafe('+919876500003', '+919876500004');
    signInAs(second.owner.token);
    const gone = { status: 'error', message: 'That promo was removed on another phone.' };
    expect(await savePromoAction({ ...second.combo, id: made.id, headline: 'Taken' })).toEqual(gone);
    expect(await setPromoPausedAction({ id: made.id, paused: true })).toEqual(gone);
    expect(await removePromoAction({ id: made.id })).toEqual(gone);
    expect(await getPromosRepository().list(first.restaurant.id)).toMatchObject([{ headline: 'Chai and samosa', paused: false }]);
  });
});
