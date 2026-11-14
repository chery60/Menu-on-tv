import { describe, expect, it } from 'vitest';
import { DEMO_RESTAURANT } from '@/content/demo-restaurant';
import { bundleLanguage, inHindi, languageAt, promoInHindi, rowWeightFor } from './language';
import { BILINGUAL_ROW_WEIGHT, loopLength, mainSlides, MENU_FRAMES, paginateMenu } from './loop';
import type { Restaurant } from './types';

/** The demo café, with one dish that has no Hindi name yet. */
const cafe: Restaurant = {
  ...DEMO_RESTAURANT,
  categories: DEMO_RESTAURANT.categories.map((category, index) => (index === 0 ? { ...category, items: category.items.map((item, at) => (at === 1 ? { ...item, nameHi: undefined } : item)) } : category)),
};

describe('rowWeightFor', () => {
  it('stacks both names only on English and Hindi; the Hindi pass uses the English line', () => {
    expect(rowWeightFor('en')).toBe(1);
    expect(rowWeightFor('en-hi')).toBe(BILINGUAL_ROW_WEIGHT);
    expect(BILINGUAL_ROW_WEIGHT).toBe(1.9);
    expect(rowWeightFor('en-then-hi')).toBe(1);
  });
});

describe('languageAt', () => {
  const slides = mainSlides('split', cafe);
  const pass = loopLength(slides);

  it('takes turns by whole passes of the main loop, on the wall clock', () => {
    expect(languageAt('en-then-hi', slides, 0)).toBe('en');
    expect(languageAt('en-then-hi', slides, pass - 1)).toBe('en');
    expect(languageAt('en-then-hi', slides, pass)).toBe('hi');
    expect(languageAt('en-then-hi', slides, 2 * pass - 1)).toBe('hi');
    expect(languageAt('en-then-hi', slides, 2 * pass)).toBe('en');
    // Two TVs asking at the same moment always agree.
    const moment = Date.parse('2026-11-15T19:42:13.000Z');
    expect(languageAt('en-then-hi', slides, moment)).toBe(languageAt('en-then-hi', mainSlides('split', cafe), moment));
  });

  it('stays in English on English only and on English and Hindi', () => {
    expect(languageAt('en', slides, pass)).toBe('en');
    expect(languageAt('en-hi', slides, pass)).toBe('en');
  });
});

describe('inHindi', () => {
  const hindi = inHindi(cafe);
  const [chai] = cafe.categories;

  it('puts each Hindi name in the English name’s place, and keeps English where there is none', () => {
    expect(hindi.categories[0].name).toBe(chai.nameHi);
    expect(hindi.categories[0].items[0].name).toBe(chai.items[0].nameHi);
    expect(hindi.categories[0].items[1].name).toBe(chai.items[1].name);
  });

  it('leaves prices, veg marks, badges and sizes as they are', () => {
    const strip = (restaurant: Restaurant) => restaurant.categories.map((category) => category.items.map(({ id, price, diet, badges, sizes, soldOut }) => ({ id, price, diet, badges, sizes, soldOut })));
    expect(strip(hindi)).toEqual(strip(cafe));
  });

  it('lays the menu out on the same pages, so switching language never moves a dish', () => {
    const ids = (restaurant: Restaurant) => paginateMenu(restaurant.categories, MENU_FRAMES.board, 1).map((page) => page.flatMap((category) => category.items.map((item) => item.id)));
    expect(ids(hindi)).toEqual(ids(cafe));
  });

  it('gives promos made from a dish its Hindi name, and shows typed headlines as typed', () => {
    const dish = { id: 'special-x', kind: 'special' as const, label: 'Today’s special', headline: 'Mango lassi', headlineHi: 'मैंगो लस्सी', line: 'Drinks', emoji: '🥭' };
    const typed = { ...dish, id: 'promo-p1', kind: 'combo' as const, headline: 'Chai and samosa', headlineHi: undefined };
    expect(promoInHindi(dish).headline).toBe('मैंगो लस्सी');
    expect(promoInHindi(typed).headline).toBe('Chai and samosa');
  });
});

describe('bundleLanguage', () => {
  it('reads a bundle’s language, and one a TV saved before languages from its old switch', () => {
    expect(bundleLanguage({ language: 'en-then-hi' })).toBe('en-then-hi');
    expect(bundleLanguage({ bilingual: true })).toBe('en-hi');
    expect(bundleLanguage({ bilingual: false })).toBe('en');
    expect(bundleLanguage({})).toBe('en');
  });
});
