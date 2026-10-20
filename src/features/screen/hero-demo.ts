import type { MenuItem, Restaurant } from './types';

/**
 * The home page hero's live demo: a small menu taken from the demo café, changed from a phone.
 * One category and one promo, so the split layout always has every change on screen.
 */

/** The dishes on the hero's TV, in board order. */
export const HERO_BOARD = ['masala-chai', 'filter-coffee', 'samosa', 'vada-pav', 'paneer-roll', 'tikki', 'mango-lassi'] as const;
/** Dishes the phone can mark sold out. */
export const HERO_SOLD_OUT = ['samosa', 'vada-pav', 'paneer-roll'] as const;
/** The dish whose price the phone can change, in rupees. */
export const HERO_PRICE = { id: 'masala-chai', step: 5, min: 10, max: 60 } as const;
/** Dishes the phone can make today's special. */
export const HERO_SPECIALS = ['tikki', 'mango-lassi', 'lava-cake'] as const;

export interface HeroDemoState {
  readonly soldOut: readonly string[];
  /** The price of `HERO_PRICE.id`. */
  readonly price: number;
  readonly special: string;
}

export interface HeroDemoCopy {
  readonly boardTitle: string;
  readonly specialLabel: string;
  /** A line under today's special, by dish id. */
  readonly specialLines: Readonly<Record<string, string>>;
}

const FALLBACK_PRICE = 30;

const itemsById = (restaurant: Restaurant): ReadonlyMap<string, MenuItem> =>
  new Map(restaurant.categories.flatMap((category) => category.items).map((item) => [item.id, item]));

export function initialHeroState(base: Restaurant): HeroDemoState {
  return { soldOut: [], price: itemsById(base).get(HERO_PRICE.id)?.price ?? FALLBACK_PRICE, special: HERO_SPECIALS[0] };
}

/** One step up or down the price, kept within what a cup of chai could cost. */
export function nudgePrice(price: number, direction: 1 | -1): number {
  return Math.min(HERO_PRICE.max, Math.max(HERO_PRICE.min, price + direction * HERO_PRICE.step));
}

/** The menu the hero's TV plays for the phone's current settings. */
export function heroRestaurant(base: Restaurant, state: HeroDemoState, copy: HeroDemoCopy): Restaurant {
  const items = itemsById(base);
  const board = HERO_BOARD.flatMap((id) => {
    const item = items.get(id);
    if (!item) return [];
    return [{ ...item, price: id === HERO_PRICE.id ? state.price : item.price, soldOut: state.soldOut.includes(id) }];
  });
  const special = items.get(state.special);

  return {
    ...base,
    categories: [{ id: 'hero-board', name: copy.boardTitle, items: board }],
    promos: special
      ? [
          {
            id: 'hero-special',
            kind: 'special',
            label: copy.specialLabel,
            headline: special.name,
            line: copy.specialLines[special.id] ?? '',
            price: special.price,
            emoji: special.emoji,
          },
        ]
      : [],
    ads: [],
  };
}
