import { describe, expect, it } from 'vitest';
import { applyEdit, emptyMenu, type EditContext } from '@/features/menu/edit';
import type { ItemInput, Menu, MenuEdit } from '@/features/menu/schema';
import type { Promo } from '../schema';
import { draftFrom, emptyDraft, menuTotal, priceText, promoSummary, statusLabel, suggestedHeadline, TEMPLATES, toInput, whenText } from './promo-form';

const NOW = new Date('2026-11-16T04:30:00.000Z');
const dish = (name: string, prices: ItemInput['prices'], description = ''): ItemInput => ({ name, nameHi: '', description, prices, diet: 'veg', badges: [], kcal: null, serving: '', allergens: [] });
function context(): EditContext {
  let next = 0;
  return { today: '2026-11-16', now: NOW, newId: () => `id-${(next += 1)}` };
}
const edit = (menu: Menu, ...edits: MenuEdit[]): Menu => {
  const ctx = context();
  return edits.reduce((current, change) => applyEdit(current, change, ctx), menu);
};
/** Snacks (id-1): Samosa ₹20 (id-2), Masala chai ₹30 (id-3), Biryani Half ₹180 / Full ₹320 (id-4). */
const MENU = edit(
  emptyMenu(NOW),
  { type: 'add-category', name: 'Snacks', nameHi: '' },
  { type: 'add-item', categoryId: 'id-1', item: dish('Samosa', [{ label: '', paise: 2000 }], 'Crisp, with green chutney') },
  { type: 'add-item', categoryId: 'id-1', item: dish('Masala chai', [{ label: '', paise: 3000 }]) },
  { type: 'add-item', categoryId: 'id-1', item: dish('Biryani', [{ label: 'Half', paise: 18000 }, { label: 'Full', paise: 32000 }]) },
);
const promo = (extra: Partial<Promo>): Promo => ({
  id: 'p1', template: 'combo', dishes: [], dealPaise: null, headline: 'Chai and samosa', line: '', festival: null, link: null, startsAt: null, endsAt: null, daypart: null, countdown: false, paused: false, createdAt: '', updatedAt: '', ...extra,
});

describe('the promo editor', () => {
  it('offers six templates, today’s special among them', () => {
    expect(TEMPLATES.map((template) => template.id)).toEqual(['combo', 'happy-hour', 'new', 'festival', 'special', 'scan']);
  });

  it('adds up the menu price of the chosen dishes and sizes', () => {
    const draft = { ...emptyDraft('combo'), dishes: [{ itemId: 'id-2', size: '' }, { itemId: 'id-4', size: 'Full' }] };
    expect(menuTotal(draft, MENU)).toBe(34000);
  });

  it('writes a headline from the dishes, and a shorter one when that would be too long', () => {
    expect(suggestedHeadline('combo', ['Samosa', 'Masala chai'], null)).toBe('Samosa + Masala chai');
    expect(suggestedHeadline('combo', ['Paneer tikka sandwich', 'Cold coffee', 'Choco lava cake'], null)).toBe('3-dish combo');
    expect(suggestedHeadline('happy-hour', ['Masala chai'], null)).toBe('Happy hour: Masala chai');
    expect(suggestedHeadline('new', ['Choco lava cake'], null)).toBe('New: Choco lava cake');
    expect(suggestedHeadline('festival', [], 'diwali')).toBe('Diwali specials');
    expect(suggestedHeadline('scan', [], null)).toBe('Scan for more');
  });

  it('turns the form into what the save action takes', () => {
    const draft = { ...emptyDraft('happy-hour'), dishes: [{ itemId: 'id-3', size: '' }], dealText: '20', headline: 'Happy hour: Masala chai', from: '15:00', to: '17:30', days: [1, 2, 3] };
    expect(toInput(draft)).toMatchObject({ template: 'happy-hour', dealPaise: 2000, startsAt: null, endsAt: null, daypart: { from: 900, to: 1050, days: [1, 2, 3] }, countdown: false });
    expect(toInput({ ...emptyDraft('new'), timed: false, dealText: '99', endsAt: '2026-11-20T21:00', countdown: true })).toMatchObject({ dealPaise: null, daypart: null, endsAt: '2026-11-20T21:00', countdown: true });
    expect(toInput({ ...emptyDraft('combo'), dealText: 'abc' }).dealPaise).toBeNaN();
  });

  it('reads a saved promo back into the form', () => {
    const saved = promo({ template: 'happy-hour', dishes: [{ itemId: 'id-3', size: '' }], dealPaise: 2050, daypart: { from: 900, to: 1020, days: [0, 6] }, endsAt: '2026-11-20T21:00' });
    expect(draftFrom(saved)).toMatchObject({ dealText: '20.50', timed: true, from: '15:00', to: '17:00', days: [0, 6], endsAt: '2026-11-20T21:00' });
  });
});

describe('the promo list', () => {
  it('says what each promo is and what it costs against the menu', () => {
    const combo = promo({ dishes: [{ itemId: 'id-2', size: '' }, { itemId: 'id-3', size: '' }], dealPaise: 4500 });
    expect(promoSummary(combo, MENU)).toBe('Combo: Samosa and Masala chai');
    expect(priceText(combo, MENU)).toBe('₹45, menu ₹50');
    expect(promoSummary(promo({ template: 'festival', festival: 'diwali' }), MENU)).toBe('Festival: Diwali');
    expect(priceText(promo({ template: 'new', dishes: [{ itemId: 'id-4', size: 'Half' }] }), MENU)).toBe('₹180');
    expect(priceText(promo({ template: 'scan', link: 'https://example.com/menu' }), MENU)).toBe('');
  });

  it('names each state the way the owner reads it', () => {
    expect(statusLabel({ state: 'on-air' })).toEqual({ text: 'On air now', tone: 'live' });
    expect(statusLabel({ state: 'starts', at: '2026-11-16T09:00' })).toEqual({ text: 'Starts Mon 16 Nov, 9 am', tone: 'quiet' });
    expect(statusLabel({ state: 'sold-out', dishes: ['Samosa'] })).toEqual({ text: 'Sold out: Samosa', tone: 'quiet' });
    expect(statusLabel({ state: 'needs-fix', problem: { kind: 'dish-hidden', dish: 'Samosa' } })).toEqual({ text: 'Needs a fix: Samosa is hidden from your TVs', tone: 'warn' });
    expect(statusLabel({ state: 'needs-fix', problem: { kind: 'deal-not-lower', menuPaise: 5000 } }).text).toBe('Needs a fix: the price isn’t lower than the menu’s ₹50');
    expect(whenText('2026-11-21T19:30')).toBe('Sat 21 Nov, 7:30 pm');
  });
});
