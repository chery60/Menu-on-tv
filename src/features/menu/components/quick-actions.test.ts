import { describe, expect, it } from 'vitest';
import type { LocalClock } from '@/lib/local-date';
import type { Menu, MenuItemData } from '../schema';
import { countDishes, dishGroups, notAPriceMessage, priceSavedMessage, searchGroups, SEARCH_FROM, specialStatus, withPrice } from './quick-actions';

const TODAY = '2026-11-15';
const dish = (id: string, name: string, extra: Partial<MenuItemData> = {}): MenuItemData => ({
  id,
  name,
  nameHi: '',
  description: '',
  prices: [{ label: '', paise: 3000 }],
  diet: 'veg',
  badges: [],
  kcal: null,
  serving: '',
  allergens: [],
  photo: null,
  emoji: '',
  soldOutOn: null,
  hidden: false,
  ...extra,
});

const menu: Menu = {
  updatedAt: '2026-11-15T03:00:00.000Z',
  categories: [
    { id: 'chai', name: 'Chai', nameHi: '', items: [dish('masala', 'Masala chai', { nameHi: 'मसाला चाय' }), dish('adrak', 'Adrak chai', { soldOutOn: TODAY }), dish('kesar', 'Kesar chai', { hidden: true })] },
    { id: 'breakfast', name: 'Breakfast', nameHi: '', daypart: { from: 420, to: 660, days: [0, 1, 2, 3, 4, 5, 6] }, items: [dish('poha', 'Poha')] },
    { id: 'hidden-only', name: 'Old', nameHi: '', items: [dish('gone', 'Gone', { hidden: true })] },
  ],
};

const clockAt = (minute: number): LocalClock => ({ today: TODAY, weekday: 0, minute });

describe('quick actions on Today', () => {
  it('offers only shown dishes, and for the special only those in stock today', () => {
    expect(dishGroups(menu).map((group) => group.items.map((item) => item.id))).toEqual([['masala', 'adrak'], ['poha']]);
    expect(dishGroups(menu, TODAY).map((group) => group.items.map((item) => item.id))).toEqual([['masala'], ['poha']]);
    expect(countDishes(dishGroups(menu))).toBe(3);
  });

  it('finds dishes by English or Hindi name, ignoring case and spaces', () => {
    const groups = dishGroups(menu);
    expect(searchGroups(groups, '  MASALA ').flatMap((group) => group.items.map((item) => item.id))).toEqual(['masala']);
    expect(searchGroups(groups, 'चाय').flatMap((group) => group.items.map((item) => item.id))).toEqual(['masala']);
    expect(searchGroups(groups, '')).toEqual(groups);
    expect(searchGroups(groups, 'biryani')).toEqual([]);
    expect(SEARCH_FROM).toBe(12);
  });

  it('describes the special: none, set, sold out, or outside its hours', () => {
    expect(specialStatus(menu, clockAt(600))).toEqual({ kind: 'none' });
    const masala = specialStatus({ ...menu, special: { itemId: 'masala', on: TODAY } }, clockAt(600));
    expect(masala).toMatchObject({ kind: 'set', item: { id: 'masala' }, soldOut: false, offNow: null });
    expect(specialStatus({ ...menu, special: { itemId: 'adrak', on: TODAY } }, clockAt(600))).toMatchObject({ soldOut: true });
    expect(specialStatus({ ...menu, special: { itemId: 'masala', on: '2026-11-14' } }, clockAt(600))).toEqual({ kind: 'none' });
    expect(specialStatus({ ...menu, special: { itemId: 'poha', on: TODAY } }, clockAt(600))).toMatchObject({ offNow: null });
    const late = specialStatus({ ...menu, special: { itemId: 'poha', on: TODAY } }, clockAt(900));
    expect(late).toMatchObject({ kind: 'set', offNow: '7 am to 11 am, every day' });
  });

  it('changes one size and keeps the others', () => {
    const sizes = [{ label: 'Half', paise: 6000 }, { label: 'Full', paise: 11000 }];
    expect(withPrice(sizes, 1, 12000)).toEqual([{ label: 'Half', paise: 6000 }, { label: 'Full', paise: 12000 }]);
    expect(sizes[1].paise).toBe(11000);
  });

  it('names the dish and its new price, and says why a price was refused', () => {
    expect(priceSavedMessage('Masala chai', '', 3500)).toBe('Masala chai is now ₹35.');
    expect(priceSavedMessage('Paneer tikka sandwich', 'Full', 12050)).toBe('Paneer tikka sandwich, Full, is now ₹120.50.');
    expect(notAPriceMessage('abc')).toBe('“abc” isn’t a price. Type rupees, like 80 or 49.50.');
  });
});
