import { describe, expect, it } from 'vitest';
import { DEMO_RESTAURANT } from '@/content/demo-restaurant';
import { HERO_BOARD, HERO_PRICE, HERO_SPECIALS, heroRestaurant, initialHeroState, nudgePrice } from './hero-demo';

const COPY = { boardTitle: 'Today’s menu', specialLabel: 'Today’s special', specialLines: { tikki: 'With sweet curd' } };

describe('hero demo menu', () => {
  it('starts with nothing sold out, the real chai price and the first special', () => {
    expect(initialHeroState(DEMO_RESTAURANT)).toEqual({ soldOut: [], price: 30, special: HERO_SPECIALS[0] });
  });

  it('puts the board dishes on one page, in order, with the phone’s price and sold-out marks', () => {
    const screen = heroRestaurant(DEMO_RESTAURANT, { soldOut: ['samosa'], price: 35, special: 'tikki' }, COPY);
    expect(screen.categories).toHaveLength(1);
    const items = screen.categories[0].items;
    expect(items.map((item) => item.id)).toEqual([...HERO_BOARD]);
    expect(items.find((item) => item.id === HERO_PRICE.id)?.price).toBe(35);
    expect(items.filter((item) => item.soldOut).map((item) => item.id)).toEqual(['samosa']);
  });

  it('makes the chosen dish the only promo, at its menu price', () => {
    const screen = heroRestaurant(DEMO_RESTAURANT, { soldOut: [], price: 30, special: 'tikki' }, COPY);
    expect(screen.promos).toEqual([
      { id: 'hero-special', kind: 'special', label: 'Today’s special', headline: 'Aloo tikki chaat', line: 'With sweet curd', price: 80, emoji: '🥔' },
    ]);
    expect(screen.ads).toEqual([]);
  });

  it('shows no special for a dish that is not on the menu', () => {
    expect(heroRestaurant(DEMO_RESTAURANT, { soldOut: [], price: 30, special: 'unknown' }, COPY).promos).toEqual([]);
  });
});

describe('nudgePrice', () => {
  it('moves in steps and stays within the range', () => {
    expect(nudgePrice(30, 1)).toBe(30 + HERO_PRICE.step);
    expect(nudgePrice(HERO_PRICE.max, 1)).toBe(HERO_PRICE.max);
    expect(nudgePrice(HERO_PRICE.min, -1)).toBe(HERO_PRICE.min);
  });
});
