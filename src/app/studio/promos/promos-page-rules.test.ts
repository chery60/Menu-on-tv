/**
 * QA checks for MT-26 slice 3 (docs/prd/mt-26-promo-studio.md), against real stores in a temp folder and the
 * Server Actions the Promos page calls:
 * - "How we'll know it works" 15 and "Only owners add, edit, pause or remove": staff calling every action directly
 *   is refused, and the promos store doesn't change.
 * - 4: a combo price of ₹50 or more doesn't save, and the message says why (happy hour too, from the template table).
 * - 3: the list's price comes from the menu: change chai to ₹35 and "₹45, menu ₹50" becomes "₹45, menu ₹55".
 * - Rules: a deal no longer lower than the menu shows Needs a fix, with the reason.
 */
import { readFile, rm, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getAccountsRepository } from '@/features/accounts/repository';
import { applyEdit, emptyMenu, type EditContext } from '@/features/menu/edit';
import { getMenusRepository } from '@/features/menu/repository';
import type { ItemInput, Menu, MenuEdit } from '@/features/menu/schema';
import { PromosStudio } from '@/features/promos/components/promos-studio';
import { getPromosRepository } from '@/features/promos/repository';
import { localClock } from '@/lib/local-date';

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: () => {} }) }));
vi.mock('next/server', async (original) => ({ ...(await original<typeof import('next/server')>()), connection: async () => undefined }));

const jar = new Map<string, string>();
vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-forwarded-for': '198.51.100.62', host: 'localhost:3000' }),
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name) } : undefined),
    set: (name: string, value: string) => void jar.set(name, value),
    delete: (name: string) => void jar.delete(name),
  }),
}));

const { removePromoAction, savePromoAction, setPromoPausedAction } = await import('./actions');
const { editMenuAction } = await import('../menu/actions');

let directory: string;
const signInAs = (token: string) => jar.set('mt_session', token);

async function person(value: string): Promise<{ token: string; userId: string }> {
  const accounts = getAccountsRepository();
  const started = await accounts.startSignIn({ channel: 'phone', value }, new Date());
  if (started.status !== 'sent') throw new Error('expected a code');
  const verified = await accounts.verifySignIn(started.challengeId, started.code, new Date());
  if (verified.status !== 'signed-in') throw new Error('expected to sign in');
  return verified;
}

const dish = (name: string, paise: number): ItemInput => ({ name, nameHi: '', description: '', prices: [{ label: '', paise }], diet: 'veg', badges: [], kcal: null, serving: '', allergens: [] });

/** The PRD's café: Samosa ₹20 and Masala chai ₹30, an owner and one staff member. */
async function cafe() {
  const owner = await person('+919876500061');
  const restaurant = await getAccountsRepository().createRestaurant(owner.userId, { name: 'Chai Point', city: 'Indiranagar', tagline: '' }, new Date());
  await getAccountsRepository().addPerson(restaurant.id, { channel: 'phone', value: '+919876500062' }, 'staff', new Date());
  const staff = await person('+919876500062');
  let next = 0;
  const ctx: EditContext = { today: localClock(new Date(), restaurant.outlets[0].timeZone).today, now: new Date(), newId: () => `qa-${(next += 1)}` };
  const edits: MenuEdit[] = [
    { type: 'add-category', name: 'Snacks', nameHi: '' },
    { type: 'add-item', categoryId: 'qa-1', item: dish('Samosa', 2000) },
    { type: 'add-item', categoryId: 'qa-1', item: dish('Masala chai', 3000) },
  ];
  await getMenusRepository().update(restaurant.id, () => edits.reduce((menu: Menu, edit) => applyEdit(menu, edit, ctx), emptyMenu(new Date())), new Date());
  const samosa = { itemId: 'qa-2', size: '' };
  const chai = { itemId: 'qa-3', size: '' };
  const combo = (dealPaise: number) => ({ template: 'combo', dishes: [samosa, chai], dealPaise, headline: 'Chai and samosa' });
  const happyHour = (dealPaise: number) => ({ template: 'happy-hour', dishes: [chai], dealPaise, headline: 'Happy hour: Masala chai', daypart: { from: 0, to: 1439, days: [0, 1, 2, 3, 4, 5, 6] } });
  return { owner, staff, restaurant, combo, happyHour };
}

/** The Promos list as the page renders it: the menu and promos from the stores, the outlet's clock. */
async function listHtml(restaurantId: string, timeZone: string, isOwner = true): Promise<string> {
  const now = new Date();
  const [menu, promos] = await Promise.all([getMenusRepository().get(restaurantId, now), getPromosRepository().list(restaurantId)]);
  const ok = async () => ({ status: 'ok' as const });
  const html = renderToStaticMarkup(createElement(PromosStudio, { menu, clock: localClock(now, timeZone), promos, isOwner, onSave: ok, onPause: ok, onRemove: ok, onSaveMenu: async () => ({ ok: true as const, menu: null }) }));
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
}

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'menuontv-qa-promos-page-'));
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

describe('staff on the Promos page (check 15)', () => {
  it('are refused every promo action called directly, and the promos stay exactly as they were', async () => {
    const { owner, staff, restaurant, combo } = await cafe();
    signInAs(owner.token);
    expect(await savePromoAction(combo(4500))).toMatchObject({ status: 'ok' });
    expect(await savePromoAction({ ...combo(4000), headline: 'Paused combo' })).toMatchObject({ status: 'ok' });
    const [live, paused] = await getPromosRepository().list(restaurant.id);
    expect(await setPromoPausedAction({ id: paused.id, paused: true })).toMatchObject({ status: 'ok' });
    const before = await readFile(join(directory, 'promos.json'), 'utf8');

    signInAs(staff.token);
    const refused = { status: 'error' };
    expect(await savePromoAction(combo(4000))).toMatchObject(refused);
    expect(await savePromoAction({ ...combo(4000), id: live.id, headline: 'Staff edit' })).toMatchObject(refused);
    expect(await setPromoPausedAction({ id: live.id, paused: true })).toMatchObject(refused);
    expect(await setPromoPausedAction({ id: paused.id, paused: false })).toMatchObject(refused);
    expect(await removePromoAction({ id: live.id })).toMatchObject(refused);

    expect(await readFile(join(directory, 'promos.json'), 'utf8')).toBe(before);
  });

  it('still see the list as the page renders it for them, with no way to change it', async () => {
    const { owner, restaurant, combo } = await cafe();
    signInAs(owner.token);
    await savePromoAction(combo(4500));
    const text = await listHtml(restaurant.id, restaurant.outlets[0].timeZone, false);
    expect(text).toContain('Chai and samosa');
    expect(text).toContain('₹45, menu ₹50');
    expect(text).toContain('Only an owner can change promos.');
  });
});

describe('the deal has to be lower than the menu (check 4)', () => {
  it('refuses a combo at the menu total of ₹50 or above, saying why, and saves nothing', async () => {
    const { owner, restaurant, combo } = await cafe();
    signInAs(owner.token);
    for (const paise of [5000, 6000]) {
      const result = await savePromoAction(combo(paise));
      expect(result.status).toBe('error');
      expect(result.message).toMatch(/lower/i);
      expect(result.message).toContain('₹50');
    }
    expect(await getPromosRepository().list(restaurant.id)).toEqual([]);
  });

  it('refuses a happy hour at or above the dish’s menu price, saying why', async () => {
    const { owner, restaurant, happyHour } = await cafe();
    signInAs(owner.token);
    const result = await savePromoAction(happyHour(3000));
    expect(result.status).toBe('error');
    expect(result.message).toMatch(/lower/i);
    expect(result.message).toContain('₹30');
    expect(await getPromosRepository().list(restaurant.id)).toEqual([]);
  });

  it('saves a combo at ₹45, one rupee under is enough', async () => {
    const { owner, restaurant, combo } = await cafe();
    signInAs(owner.token);
    expect(await savePromoAction(combo(4900))).toMatchObject({ status: 'ok' });
    expect(await savePromoAction({ ...combo(4500), headline: 'At 45' })).toMatchObject({ status: 'ok' });
    expect((await getPromosRepository().list(restaurant.id)).map((promo) => promo.dealPaise)).toEqual([4900, 4500]);
  });
});

describe('prices on the list come from the menu (check 3)', () => {
  it('shows ₹45 against the menu’s ₹50, then ₹55 once chai is ₹35 in the menu, without touching the promo', async () => {
    const { owner, restaurant, combo } = await cafe();
    const zone = restaurant.outlets[0].timeZone;
    signInAs(owner.token);
    await savePromoAction(combo(4500));
    const promoBefore = await readFile(join(directory, 'promos.json'), 'utf8');
    expect(await listHtml(restaurant.id, zone)).toContain('₹45, menu ₹50');

    expect(await editMenuAction({ type: 'set-prices', itemId: 'qa-3', prices: [{ label: '', paise: 3500 }] })).toMatchObject({ ok: true });
    const text = await listHtml(restaurant.id, zone);
    expect(text).toContain('₹45, menu ₹55');
    expect(text).toContain('On air now');
    expect(await readFile(join(directory, 'promos.json'), 'utf8')).toBe(promoBefore);
  });

  it('shows a new item at its menu price, and follows the menu', async () => {
    const { owner, restaurant } = await cafe();
    const zone = restaurant.outlets[0].timeZone;
    signInAs(owner.token);
    expect(await savePromoAction({ template: 'new', dishes: [{ itemId: 'qa-2', size: '' }], headline: 'New: Samosa' })).toMatchObject({ status: 'ok' });
    expect(await listHtml(restaurant.id, zone)).toContain('₹20');
    await editMenuAction({ type: 'set-prices', itemId: 'qa-2', prices: [{ label: '', paise: 2500 }] });
    expect(await listHtml(restaurant.id, zone)).toContain('₹25');
  });

  it('puts a combo whose price is no longer lower than the menu in Needs a fix, with the reason', async () => {
    const { owner, restaurant, combo } = await cafe();
    const zone = restaurant.outlets[0].timeZone;
    signInAs(owner.token);
    await savePromoAction(combo(4500));
    await editMenuAction({ type: 'set-prices', itemId: 'qa-3', prices: [{ label: '', paise: 2500 }] });
    const text = await listHtml(restaurant.id, zone);
    expect(text).not.toContain('On air now');
    expect(text).toMatch(/Needs a fix: \S.*lower.*₹45/);
  });
});
