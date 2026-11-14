import { describe, expect, it } from 'vitest';
import { applyEdit, emptyMenu, type EditContext } from '@/features/menu/edit';
import type { ItemInput, Menu, MenuEdit } from '@/features/menu/schema';
import { clockAt } from './schedule';
import type { Promo } from './schema';
import { promoDishes, promoStatus, saveProblem } from './status';

const NOW = new Date('2026-11-16T04:30:00.000Z');
const TODAY = '2026-11-16';
const dish = (name: string, prices: ItemInput['prices']): ItemInput => ({ name, nameHi: '', description: '', prices, diet: 'veg', badges: [], kcal: null, serving: '', allergens: [] });

function context(today = TODAY): EditContext {
  let next = 0;
  return { today, now: NOW, newId: () => `id-${(next += 1)}` };
}

const edit = (menu: Menu, ...edits: MenuEdit[]): Menu => {
  const ctx = context();
  return edits.reduce((current, change) => applyEdit(current, change, ctx), menu);
};

/** Snacks (id-1): Samosa ₹20 (id-2), Masala chai ₹30 (id-3), Biryani Half ₹180 / Full ₹320 (id-4). */
const MENU = edit(
  emptyMenu(NOW),
  { type: 'add-category', name: 'Snacks', nameHi: '' },
  { type: 'add-item', categoryId: 'id-1', item: dish('Samosa', [{ label: '', paise: 2000 }]) },
  { type: 'add-item', categoryId: 'id-1', item: dish('Masala chai', [{ label: '', paise: 3000 }]) },
  { type: 'add-item', categoryId: 'id-1', item: dish('Biryani', [{ label: 'Half', paise: 18000 }, { label: 'Full', paise: 32000 }]) },
);

const promo = (fields: Partial<Promo> = {}): Promo => ({
  id: 'p1',
  template: 'combo',
  dishes: [{ itemId: 'id-2', size: '' }, { itemId: 'id-3', size: '' }],
  dealPaise: 4500,
  headline: 'Chai and samosa',
  line: '',
  festival: null,
  link: null,
  startsAt: null,
  endsAt: null,
  daypart: null,
  countdown: false,
  paused: false,
  createdAt: NOW.toISOString(),
  updatedAt: NOW.toISOString(),
  ...fields,
});

const clock = clockAt(`${TODAY}T10:00`);

describe('promoDishes', () => {
  it('reads names and prices from the menu and adds up the menu total', () => {
    const found = promoDishes(promo(), MENU);
    expect(found).toMatchObject({ ok: true, menuPaise: 5000 });
    expect(found.ok && found.dishes.map((entry) => entry.item.name)).toEqual(['Samosa', 'Masala chai']);
  });

  it('follows a menu price change at once', () => {
    const dearer = edit(MENU, { type: 'set-prices', itemId: 'id-3', prices: [{ label: '', paise: 3500 }] });
    expect(promoDishes(promo(), dearer)).toMatchObject({ ok: true, menuPaise: 5500 });
  });

  it('prices the size the owner picked, whatever its case', () => {
    expect(promoDishes(promo({ template: 'happy-hour', dishes: [{ itemId: 'id-4', size: 'full' }], dealPaise: 25000 }), MENU)).toMatchObject({ ok: true, menuPaise: 32000, dishes: [{ size: 'Full', paise: 32000 }] });
  });

  it('names what stops it: a dish removed or hidden, a size gone, or a deal no longer lower', () => {
    expect(promoDishes(promo(), edit(MENU, { type: 'remove-item', itemId: 'id-2' }))).toEqual({ ok: false, problem: { kind: 'dish-gone' } });
    expect(promoDishes(promo(), edit(MENU, { type: 'set-hidden', itemId: 'id-3', hidden: true }))).toEqual({ ok: false, problem: { kind: 'dish-hidden', dish: 'Masala chai' } });
    expect(promoDishes(promo({ dishes: [{ itemId: 'id-4', size: 'Large' }], dealPaise: null }), MENU)).toEqual({ ok: false, problem: { kind: 'size-gone', dish: 'Biryani', size: 'Large' } });
    expect(promoDishes(promo({ dealPaise: 5000 }), MENU)).toEqual({ ok: false, problem: { kind: 'deal-not-lower', menuPaise: 5000 } });
    const cheaper = edit(MENU, { type: 'set-prices', itemId: 'id-3', prices: [{ label: '', paise: 2000 }] });
    expect(promoDishes(promo(), cheaper)).toEqual({ ok: false, problem: { kind: 'deal-not-lower', menuPaise: 4000 } });
  });

  it('has no total to beat when the template has no deal', () => {
    expect(promoDishes(promo({ template: 'festival', festival: 'diwali', dishes: [], dealPaise: null }), MENU)).toEqual({ ok: true, dishes: [], menuPaise: 0 });
  });
});

describe('promoStatus', () => {
  it('is on air when nothing stops it', () => {
    expect(promoStatus(promo(), MENU, clock)).toEqual({ state: 'on-air' });
  });

  it('goes off the TV while a dish is sold out today, and comes back the next day', () => {
    const soldOut = edit(MENU, { type: 'set-sold-out', itemId: 'id-2', soldOut: true });
    expect(promoStatus(promo(), soldOut, clock)).toEqual({ state: 'sold-out', dishes: ['Samosa'] });
    expect(promoStatus(promo(), soldOut, clockAt('2026-11-17T10:00'))).toEqual({ state: 'on-air' });
  });

  it('says when it starts', () => {
    expect(promoStatus(promo({ startsAt: '2026-11-17T09:00' }), MENU, clock)).toEqual({ state: 'starts', at: '2026-11-17T09:00' });
  });

  it('puts ended before paused, paused before a fix, and a fix before a start', () => {
    const hidden = edit(MENU, { type: 'set-hidden', itemId: 'id-2', hidden: true });
    expect(promoStatus(promo({ endsAt: `${TODAY}T09:00`, paused: true }), hidden, clock)).toEqual({ state: 'ended' });
    expect(promoStatus(promo({ paused: true }), hidden, clock)).toEqual({ state: 'paused' });
    expect(promoStatus(promo({ startsAt: '2026-11-17T09:00' }), hidden, clock)).toEqual({ state: 'needs-fix', problem: { kind: 'dish-hidden', dish: 'Samosa' } });
  });
});

describe('saveProblem', () => {
  const input = { template: 'combo' as const, dishes: promo().dishes, dealPaise: 4500, headline: 'Chai and samosa', line: '', festival: null, link: null, startsAt: null, endsAt: null, daypart: null, countdown: false };

  it('lets a good promo save', () => {
    expect(saveProblem(input, MENU, clock)).toBeNull();
  });

  it('refuses an end that has passed, or times it would never play inside', () => {
    expect(saveProblem({ ...input, endsAt: `${TODAY}T10:00` }, MENU, clock)).toBe('Pick an end time that hasn’t passed.');
    const mondayMorning = { from: 8 * 60, to: 9 * 60, days: [1] };
    expect(saveProblem({ ...input, endsAt: '2026-11-22T23:00', daypart: mondayMorning }, MENU, clock)).toBe('It would end before it ever plays. Check its days and times.');
  });

  it('explains a deal that isn’t lower than the menu, and dishes the menu no longer has', () => {
    expect(saveProblem({ ...input, dealPaise: 5000 }, MENU, clock)).toBe('The combo price has to be lower than ₹50, the menu price.');
    expect(saveProblem({ ...input, template: 'happy-hour', dishes: [{ itemId: 'id-3', size: '' }], dealPaise: 3000, daypart: { from: 0, to: 60, days: [1] } }, MENU, clockAt(`${TODAY}T00:30`))).toBe(
      'The happy-hour price has to be lower than ₹30, the menu price.',
    );
    expect(saveProblem(input, edit(MENU, { type: 'remove-item', itemId: 'id-2' }), clock)).toBe('One of those dishes is no longer on the menu. Pick again.');
    expect(saveProblem(input, edit(MENU, { type: 'set-hidden', itemId: 'id-3', hidden: true }), clock)).toBe('Masala chai is hidden from your TVs. Show it first, or pick another dish.');
    expect(saveProblem({ ...input, dishes: [{ itemId: 'id-4', size: 'Large' }, { itemId: 'id-2', size: '' }] }, MENU, clock)).toBe('Biryani has no “Large” size. Pick one of its sizes.');
  });
});
