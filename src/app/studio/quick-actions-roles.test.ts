/**
 * QA checks for MT-25 "How we'll know it works" 11 and 12 (docs/prd/mt-25-quick-actions.md), at the Server Action
 * the Today page calls: owners and staff set today's special and change prices; signed out, or as a member of
 * another restaurant, both are refused; a price that isn't a number saves nothing.
 */
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getAccountsRepository } from '@/features/accounts/repository';
import { getMenusRepository } from '@/features/menu/repository';
import { sampleMenu } from '@/features/menu/sample';

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ refresh: vi.fn() }));
vi.mock('next/server', async (original) => ({ ...(await original<typeof import('next/server')>()), connection: async () => undefined }));

const jar = new Map<string, string>();
vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-forwarded-for': '198.51.100.31', host: 'localhost:3000' }),
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name) } : undefined),
    set: (name: string, value: string) => void jar.set(name, value),
    delete: (name: string) => void jar.delete(name),
  }),
}));

const { editMenuAction } = await import('./menu/actions');

let directory: string;
const signInAs = (token: string | null) => (token ? jar.set('mt_session', token) : jar.delete('mt_session'));

async function person(value: string): Promise<{ token: string; userId: string }> {
  const accounts = getAccountsRepository();
  const started = await accounts.startSignIn({ channel: 'phone', value }, new Date());
  if (started.status !== 'sent') throw new Error('expected a code');
  const verified = await accounts.verifySignIn(started.challengeId, started.code, new Date());
  if (verified.status !== 'signed-in') throw new Error('expected to sign in');
  return verified;
}

/** A café with the sample menu, its owner and one staff member. */
async function cafe(ownerPhone: string, staffPhone: string) {
  const owner = await person(ownerPhone);
  const restaurant = await getAccountsRepository().createRestaurant(owner.userId, { name: `Café ${ownerPhone.slice(-2)}`, city: 'Indiranagar', tagline: '' }, new Date());
  await getAccountsRepository().addPerson(restaurant.id, { channel: 'phone', value: staffPhone }, 'staff', new Date());
  const staff = await person(staffPhone);
  const menu = await getMenusRepository().update(restaurant.id, () => sampleMenu(new Date(), randomUUID), new Date());
  const items = menu.categories.flatMap((category) => category.items);
  const id = (name: string) => items.find((item) => item.name.startsWith(name))!.id;
  return { owner, staff, restaurantId: restaurant.id, id };
}

const menuOf = (restaurantId: string) => getMenusRepository().get(restaurantId, new Date());

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'menutelly-quick-roles-'));
  vi.stubEnv('ACCOUNTS_DATA_FILE', join(directory, 'accounts.json'));
  vi.stubEnv('MENUS_DATA_FILE', join(directory, 'menus.json'));
  vi.stubEnv('SCREENS_DATA_FILE', join(directory, 'screens.json'));
  vi.stubEnv('PROMOS_DATA_FILE', join(directory, 'promos.json'));
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  jar.clear();
});

afterEach(async () => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  await rm(directory, { recursive: true, force: true });
});

describe('MT-25 quick actions: who can use them (How we’ll know 12)', () => {
  it('staff and owners set today’s special and change a price', async () => {
    const { owner, staff, restaurantId, id } = await cafe('+919876500011', '+919876500012');

    signInAs(staff.token);
    expect(await editMenuAction({ type: 'set-special', itemId: id('Mango lassi') })).toMatchObject({ ok: true });
    expect(await editMenuAction({ type: 'set-prices', itemId: id('Masala chai'), prices: [{ label: '', paise: 3500 }] })).toMatchObject({ ok: true });
    expect((await menuOf(restaurantId)).special?.itemId).toBe(id('Mango lassi'));

    signInAs(owner.token);
    expect(await editMenuAction({ type: 'set-special', itemId: id('Cold coffee') })).toMatchObject({ ok: true });
    expect(await editMenuAction({ type: 'set-special', itemId: null })).toMatchObject({ ok: true });
    expect((await menuOf(restaurantId)).special ?? null).toBeNull();
  });

  it('signed out, setting the special or a price is refused and nothing changes', async () => {
    const { restaurantId, id } = await cafe('+919876500021', '+919876500022');
    const before = await menuOf(restaurantId);
    for (const token of [null, 'x'.repeat(43)]) {
      signInAs(token);
      expect(await editMenuAction({ type: 'set-special', itemId: id('Mango lassi') })).toMatchObject({ ok: false });
      expect(await editMenuAction({ type: 'set-prices', itemId: id('Masala chai'), prices: [{ label: '', paise: 100 }] })).toMatchObject({ ok: false });
    }
    expect(await menuOf(restaurantId)).toEqual(before);
  });

  it('a member of another restaurant can’t set this café’s special or prices', async () => {
    const mine = await cafe('+919876500031', '+919876500032');
    const theirs = await cafe('+919876500041', '+919876500042');
    const before = await menuOf(mine.restaurantId);

    for (const member of [theirs.owner, theirs.staff]) {
      signInAs(member.token);
      expect(await editMenuAction({ type: 'set-special', itemId: mine.id('Mango lassi') })).toMatchObject({ ok: false });
      expect(await editMenuAction({ type: 'set-prices', itemId: mine.id('Masala chai'), prices: [{ label: '', paise: 100 }] })).toMatchObject({ ok: false });
    }
    expect(await menuOf(mine.restaurantId)).toEqual(before);
    expect((await menuOf(theirs.restaurantId)).special ?? null).toBeNull();
  });
});

describe('MT-25 quick actions: a price that isn’t a number (How we’ll know 11)', () => {
  it('saves nothing and keeps the old price', async () => {
    const { owner, restaurantId, id } = await cafe('+919876500051', '+919876500052');
    signInAs(owner.token);
    const before = await menuOf(restaurantId);
    const refused = await editMenuAction({ type: 'set-prices', itemId: id('Masala chai'), prices: [{ label: '', paise: 'abc' }] });
    expect(refused).toMatchObject({ ok: false, message: expect.stringMatching(/\S/) });
    expect(await menuOf(restaurantId)).toEqual(before);
  });
});
