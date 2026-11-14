import { findItem, isSoldOut } from '@/features/menu/edit';
import type { Menu, MenuCategoryData, MenuItemData } from '@/features/menu/schema';
import { formatRupees } from '@/features/screen/loop';
import type { LocalClock } from '@/lib/local-date';
import { clockStamp, scheduleState } from './schedule';
import type { Promo, PromoInput } from './schema';

/** Where each promo stands against today's menu and the outlet's clock. Pure and tested. */

export interface PromoDish {
  readonly item: MenuItemData;
  readonly category: MenuCategoryData;
  readonly size: string;
  readonly paise: number;
}

export type PromoProblem =
  | { readonly kind: 'dish-gone' }
  | { readonly kind: 'dish-hidden'; readonly dish: string }
  | { readonly kind: 'size-gone'; readonly dish: string; readonly size: string }
  | { readonly kind: 'deal-not-lower'; readonly menuPaise: number };

export type PromoDishes = { readonly ok: true; readonly dishes: readonly PromoDish[]; readonly menuPaise: number } | { readonly ok: false; readonly problem: PromoProblem };

export type PromoStatus =
  | { readonly state: 'ended' }
  | { readonly state: 'paused' }
  | { readonly state: 'needs-fix'; readonly problem: PromoProblem }
  | { readonly state: 'starts'; readonly at: string }
  | { readonly state: 'sold-out'; readonly dishes: readonly string[] }
  | { readonly state: 'on-air' };

type Priced = Pick<Promo, 'dishes' | 'dealPaise'>;

/** Sizes are named case-blind on the menu ("Half" and "half" can't both exist), so they match the same way. */
const sameSize = (a: string, b: string): boolean => a.trim().toLowerCase() === b.trim().toLowerCase();

/** The promo's dishes as the menu has them now and their menu total, or what stops the promo playing. */
export function promoDishes(promo: Priced, menu: Menu): PromoDishes {
  const dishes: PromoDish[] = [];
  for (const { itemId, size } of promo.dishes) {
    const found = findItem(menu, itemId);
    if (!found) return { ok: false, problem: { kind: 'dish-gone' } };
    if (found.item.hidden) return { ok: false, problem: { kind: 'dish-hidden', dish: found.item.name } };
    const price = found.item.prices.find((entry) => sameSize(entry.label, size));
    if (!price) return { ok: false, problem: { kind: 'size-gone', dish: found.item.name, size } };
    dishes.push({ ...found, size: price.label, paise: price.paise });
  }
  const menuPaise = dishes.reduce((total, dish) => total + dish.paise, 0);
  if (promo.dealPaise !== null && promo.dealPaise >= menuPaise) return { ok: false, problem: { kind: 'deal-not-lower', menuPaise } };
  return { ok: true, dishes, menuPaise };
}

/** In the order the Promos page needs it: ended, paused, needs a fix, starts later, sold out, on air. */
export function promoStatus(promo: Promo, menu: Menu, clock: LocalClock): PromoStatus {
  const schedule = scheduleState(promo, clock);
  if (schedule.state === 'ended') return { state: 'ended' };
  if (promo.paused) return { state: 'paused' };
  const found = promoDishes(promo, menu);
  if (!found.ok) return { state: 'needs-fix', problem: found.problem };
  if (schedule.state === 'starts') return { state: 'starts', at: schedule.at };
  const soldOut = found.dishes.filter((dish) => isSoldOut(dish.item, clock.today)).map((dish) => dish.item.name);
  return soldOut.length > 0 ? { state: 'sold-out', dishes: soldOut } : { state: 'on-air' };
}

/** Why a promo can't be saved against today's menu and clock, in words for the owner; null when it can. */
export function saveProblem(input: PromoInput, menu: Menu, clock: LocalClock): string | null {
  if (input.endsAt !== null && input.endsAt <= clockStamp(clock)) return 'Pick an end time that hasn’t passed.';
  if (scheduleState(input, clock).state === 'ended') return 'It would end before it ever plays. Check its days and times.';
  const found = promoDishes(input, menu);
  if (found.ok) return null;
  const { problem } = found;
  switch (problem.kind) {
    case 'dish-gone':
      return 'One of those dishes is no longer on the menu. Pick again.';
    case 'dish-hidden':
      return `${problem.dish} is hidden from your TVs. Show it first, or pick another dish.`;
    case 'size-gone':
      return `${problem.dish} has no “${problem.size}” size. Pick one of its sizes.`;
    case 'deal-not-lower':
      return `The ${input.template === 'combo' ? 'combo' : 'happy-hour'} price has to be lower than ₹${formatRupees(problem.menuPaise / 100)}, the menu price.`;
  }
}
