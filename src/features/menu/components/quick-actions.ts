import type { LocalClock } from '@/lib/local-date';
import { describeDaypart, showsAt } from '../dayparts';
import { isSoldOut, todaysSpecial } from '../edit';
import { formatPaise } from '../money';
import type { Menu, MenuCategoryData, MenuItemData } from '../schema';

/** Today's quick actions (MT-25): which dishes they offer, the search, the special's state and the messages. Pure, so it is tested. */

/** A list of this many dishes or more gets a "Find a dish" search. */
export const SEARCH_FROM = 12;

export interface DishGroup {
  readonly category: MenuCategoryData;
  readonly items: readonly MenuItemData[];
}

/** The dishes shown on the TVs, by category; given a day, only those in stock that day. */
export function dishGroups(menu: Menu, inStockOn?: string): readonly DishGroup[] {
  return menu.categories
    .map((category) => ({ category, items: category.items.filter((item) => !item.hidden && !(inStockOn && isSoldOut(item, inStockOn))) }))
    .filter((group) => group.items.length > 0);
}

export function countDishes(groups: readonly DishGroup[]): number {
  return groups.reduce((total, group) => total + group.items.length, 0);
}

/** Dishes whose English or Hindi name holds the query, ignoring case and spaces around it. */
export function searchGroups(groups: readonly DishGroup[], query: string): readonly DishGroup[] {
  const wanted = query.trim().toLocaleLowerCase();
  if (!wanted) return groups;
  const matches = (item: MenuItemData): boolean => item.name.toLocaleLowerCase().includes(wanted) || item.nameHi.toLocaleLowerCase().includes(wanted);
  return groups.map((group) => ({ ...group, items: group.items.filter(matches) })).filter((group) => group.items.length > 0);
}

export type SpecialStatus =
  | { readonly kind: 'none' }
  | {
      readonly kind: 'set';
      readonly category: MenuCategoryData;
      readonly item: MenuItemData;
      readonly soldOut: boolean;
      /** When the special's category is off the TVs now, the hours it is on; otherwise null. */
      readonly offNow: string | null;
    };

export function specialStatus(menu: Menu, clock: LocalClock): SpecialStatus {
  const found = todaysSpecial(menu, clock.today);
  if (!found) return { kind: 'none' };
  const daypart = found.category.daypart ?? null;
  return {
    kind: 'set',
    category: found.category,
    item: found.item,
    soldOut: isSoldOut(found.item, clock.today),
    offNow: daypart && !showsAt(daypart, clock) ? describeDaypart(daypart) : null,
  };
}

type Prices = MenuItemData['prices'];

/** The dish's prices with one size changed; `set-prices` replaces them all, so the others go back as they are. */
export function withPrice(prices: Prices, index: number, paise: number): Prices {
  return prices.map((price, at) => (at === index ? { ...price, paise } : price));
}

export function priceSavedMessage(name: string, label: string, paise: number): string {
  return `${label ? `${name}, ${label},` : name} is now ₹${formatPaise(paise)}.`;
}

export function notAPriceMessage(typed: string): string {
  return `“${typed}” isn’t a price. Type rupees, like 80 or 49.50.`;
}
