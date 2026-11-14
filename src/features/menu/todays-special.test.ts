/**
 * QA checks for MT-25 slice 1, today's special in the menu and on the TV, written from
 * docs/prd/mt-25-quick-actions.md ("What it does", "Rules and edge cases", "How we'll know" 3 to 8).
 */
import { describe, expect, it } from 'vitest';
import { mainSlides, sideLoop } from '@/features/screen/loop';
import type { Promo, Restaurant } from '@/features/screen/types';
import { applyEdit, MenuEditError } from './edit';
import { sampleMenu } from './sample';
import { menuEditSchema, menusFileSchema, type Menu, type MenuEdit } from './schema';
import { screenRestaurant } from './to-screen';

const NOW = new Date('2026-11-15T04:30:00.000Z');
const TODAY = '2026-11-15';
const TOMORROW = '2026-11-16';
/** The outlet's clock at ten in the morning, a Sunday. */
const clockOn = (today: string, minute = 10 * 60, weekday = 0) => ({ today, weekday, minute });
const profile = { name: 'Chai Point', tagline: 'Fresh chai all day' };
const SPECIAL_LABEL = 'Today’s special';

function ids() {
  let next = 0;
  return () => `id-${(next += 1)}`;
}

const sample = (): Menu => sampleMenu(NOW, ids());

function edit(menu: Menu, value: MenuEdit, today = TODAY): Menu {
  return applyEdit(menu, menuEditSchema.parse(value), { today, now: NOW, newId: ids() });
}

function dish(menu: Menu, name: string) {
  for (const category of menu.categories) {
    const item = category.items.find((candidate) => candidate.name === name);
    if (item) return { category, item };
  }
  throw new Error(`no ${name} on the sample menu`);
}

const special = (menu: Menu, name: string, today = TODAY): Menu => edit(menu, { type: 'set-special', itemId: dish(menu, name).item.id }, today);
const onTv = (menu: Menu, clock = clockOn(TODAY)): Restaurant => screenRestaurant(profile, menu, clock);
const specials = (restaurant: Restaurant): readonly Promo[] => restaurant.promos.filter((promo) => promo.label === SPECIAL_LABEL);

describe('MT-25 today’s special: what it does', () => {
  it('plays first as "Today’s special" with the dish, its description or category, its menu price and its picture', () => {
    const menu = special(sample(), 'Mango lassi');
    const { item, category } = dish(menu, 'Mango lassi');
    const first = onTv(menu).promos[0];
    expect(first.label).toBe(SPECIAL_LABEL);
    expect(first.headline).toBe('Mango lassi');
    expect(first.line).toBe(item.description || category.name);
    expect(first.price).toBe(item.prices[0].paise / 100);
    expect(first.photo ?? first.emoji).toBeTruthy();
  });

  it('uses the first size’s price for a dish with sizes, as promos do', () => {
    let menu = sample();
    const { item } = dish(menu, 'Masala chai');
    menu = edit(menu, { type: 'set-prices', itemId: item.id, prices: [{ label: 'Cutting', paise: 1500 }, { label: 'Full', paise: 3000 }] });
    expect(onTv(special(menu, 'Masala chai')).promos[0]).toMatchObject({ label: SPECIAL_LABEL, price: 15 });
  });

  it('keeps the bestseller slides playing after it, without playing the special twice', () => {
    const before = onTv(sample()).promos.map((promo) => promo.headline);
    const promos = onTv(special(sample(), 'Mango lassi')).promos.map((promo) => promo.headline);
    expect(promos[0]).toBe('Mango lassi');
    expect(promos.filter((headline) => headline === 'Mango lassi')).toHaveLength(1);
    for (const featured of before.filter((headline) => headline !== 'Mango lassi')) expect(promos).toContain(featured);
  });

  it('holds one special at a time: picking another replaces it', () => {
    const menu = special(special(sample(), 'Mango lassi'), 'Cold coffee');
    expect(specials(onTv(menu)).map((promo) => promo.headline)).toEqual(['Cold coffee']);
  });

  it('leaves the TV when removed', () => {
    const menu = edit(special(sample(), 'Mango lassi'), { type: 'set-special', itemId: null });
    expect(specials(onTv(menu))).toEqual([]);
    expect(onTv(menu).specialId).toBeUndefined();
  });
});

describe('MT-25 today’s special: where it plays on each layout', () => {
  const restaurant = () => onTv(special(sample(), 'Mango lassi'));

  it('Split, L-bar and Portrait: first in the side zone', () => {
    const first = sideLoop(restaurant())[0];
    expect(first.kind === 'promo' && first.promo.label).toBe(SPECIAL_LABEL);
  });

  it('Full board: the first takeover', () => {
    const takeover = mainSlides('board', restaurant()).find((slide) => slide.kind !== 'menu');
    expect(takeover?.kind === 'promo' && takeover.promo.headline).toBe('Mango lassi');
  });

  it('Spotlight: the first hero', () => {
    const hero = mainSlides('spotlight', restaurant()).find((slide) => slide.kind === 'spotlight');
    expect(hero?.kind === 'spotlight' && hero.item.name).toBe('Mango lassi');
  });

  it('Ticker: the first line', () => {
    expect(restaurant().ticker[0]).toContain('Mango lassi');
  });
});

describe('MT-25 today’s special: rules and edge cases', () => {
  it('stops playing while sold out, stays the special, and plays again back in stock the same day', () => {
    const lassi = (menu: Menu) => dish(menu, 'Mango lassi').item.id;
    let menu = special(sample(), 'Mango lassi');
    menu = edit(menu, { type: 'set-sold-out', itemId: lassi(menu), soldOut: true });
    expect(specials(onTv(menu))).toEqual([]);
    expect(mainSlides('spotlight', onTv(menu)).some((slide) => slide.kind === 'spotlight' && slide.item.name === 'Mango lassi')).toBe(false);
    expect(menu.special?.itemId).toBe(lassi(menu));

    menu = edit(menu, { type: 'set-sold-out', itemId: lassi(menu), soldOut: false });
    expect(onTv(menu).promos[0]).toMatchObject({ label: SPECIAL_LABEL, headline: 'Mango lassi' });
  });

  it('ends when its dish is hidden or removed', () => {
    const start = special(sample(), 'Mango lassi');
    const id = dish(start, 'Mango lassi').item.id;
    const hidden = edit(start, { type: 'set-hidden', itemId: id, hidden: true });
    expect(hidden.special ?? null).toBeNull();
    expect(edit(hidden, { type: 'set-hidden', itemId: id, hidden: false }).special ?? null).toBeNull();
    expect(edit(start, { type: 'remove-item', itemId: id }).special ?? null).toBeNull();
  });

  it('can only be a dish on the menu, in stock and shown', () => {
    const menu = sample();
    const id = dish(menu, 'Mango lassi').item.id;
    expect(() => edit(menu, { type: 'set-special', itemId: 'not-a-dish' })).toThrow(MenuEditError);
    expect(() => edit(edit(menu, { type: 'set-hidden', itemId: id, hidden: true }), { type: 'set-special', itemId: id })).toThrow(MenuEditError);
    expect(() => edit(edit(menu, { type: 'set-sold-out', itemId: id, soldOut: true }), { type: 'set-special', itemId: id })).toThrow(MenuEditError);
  });

  it('ends by itself the next day in the outlet’s time zone', () => {
    const menu = special(sample(), 'Mango lassi');
    expect(specials(onTv(menu, clockOn(TOMORROW, 10 * 60, 1)))).toEqual([]);
    expect(onTv(menu, clockOn(TOMORROW, 10 * 60, 1)).specialId).toBeUndefined();
  });

  it('doesn’t play while its category is outside its daypart', () => {
    let menu = special(sample(), 'Mango lassi');
    const { category } = dish(menu, 'Mango lassi');
    menu = edit(menu, { type: 'update-category', categoryId: category.id, name: category.name, nameHi: category.nameHi, daypart: { from: 16 * 60, to: 22 * 60, days: [0, 1, 2, 3, 4, 5, 6] } });
    expect(specials(onTv(menu, clockOn(TODAY, 10 * 60)))).toEqual([]);
    expect(specials(onTv(menu, clockOn(TODAY, 17 * 60))).map((promo) => promo.headline)).toEqual(['Mango lassi']);
  });

  it('reads menus saved before today’s special existed', () => {
    const { updatedAt, categories } = sample();
    expect(menusFileSchema.safeParse({ version: 1, menus: { 'restaurant-1': { updatedAt, categories } } }).success).toBe(true);
  });
});
