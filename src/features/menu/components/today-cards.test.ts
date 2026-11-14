import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { MenuResult } from '@/app/studio/menu/menu-result';
import type { LocalClock } from '@/lib/local-date';
import type { Menu, MenuItemData } from '../schema';
import { PricesCard } from './price-sheet';
import { TodaysSpecial } from './special-card';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: () => {} }) }));

const TODAY = '2026-11-15';
const dish = (id: string, name: string, extra: Partial<MenuItemData> = {}): MenuItemData => ({
  id, name, nameHi: '', description: '', prices: [{ label: '', paise: 9000 }], diet: 'veg', badges: [], kcal: null, serving: '', allergens: [], photo: null, emoji: '🥭', soldOutOn: null, hidden: false, ...extra,
});
const base: Menu = {
  updatedAt: '2026-11-15T03:00:00.000Z',
  categories: [
    { id: 'coolers', name: 'Coolers', nameHi: '', items: [dish('lassi', 'Mango lassi'), dish('soda', 'Lime soda', { soldOutOn: TODAY })] },
    { id: 'breakfast', name: 'Breakfast', nameHi: '', daypart: { from: 420, to: 660, days: [0, 1, 2, 3, 4, 5, 6] }, items: [dish('poha', 'Poha')] },
  ],
};
const noon: LocalClock = { today: TODAY, weekday: 0, minute: 720 };
const onSave = async (): Promise<MenuResult> => ({ ok: true, menu: null });
const special = (menu: Menu) => renderToStaticMarkup(createElement(TodaysSpecial, { menu, clock: noon, onSave }));

describe('Today’s quick action cards', () => {
  it('offers to pick a special when there is none', () => {
    const html = special(base);
    expect(html).toContain('Today’s special.');
    expect(html).toContain('It plays first on every TV until midnight.');
    expect(html).toContain('Pick today’s special');
  });

  it('shows the special with its category and menu price, to change or remove', () => {
    const html = special({ ...base, special: { itemId: 'lassi', on: TODAY } });
    expect(html).toContain('Mango lassi');
    expect(html).toContain('Coolers, <span class="tabular-nums">₹90</span>');
    expect(html).toContain('Change');
    expect(html).toContain('Remove');
  });

  it('says when the special is sold out, and offers another', () => {
    const html = special({ ...base, special: { itemId: 'soda', on: TODAY } });
    expect(html).toContain('Sold out');
    expect(html).toContain('It’s off your TVs until it’s back in stock.');
    expect(html).toContain('Pick another');
  });

  it('says when the special is outside its hours', () => {
    expect(special({ ...base, special: { itemId: 'poha', on: TODAY } })).toContain('Not on your TVs now: 7 am to 11 am, every day.');
  });

  it('offers to change a price', () => {
    const html = renderToStaticMarkup(createElement(PricesCard, { menu: base, onSave }));
    expect(html).toContain('Prices.');
    expect(html).toContain('Change a price');
  });
});
