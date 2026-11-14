import { formatRupees } from '@/features/screen/loop';
import type { Badge, MenuCategory, MenuItem, Promo, Restaurant } from '@/features/screen/types';
import { emojiFor } from '@/features/screen/visitor-menu';
import type { LocalClock } from '@/lib/local-date';
import { showsAt } from './dayparts';
import { isSoldOut, todaysSpecial } from './edit';
import type { Menu, MenuCategoryData, MenuItemData } from './schema';

/** Turns the owner's menu into what a TV plays. Pure, so the editor's preview and the TV agree. */

export interface ScreenProfile {
  readonly name: string;
  readonly tagline: string;
}

/** Most featured dishes a screen rotates when the owner hasn't made promos yet. */
const MAX_FEATURED = 4;
const FEATURE_LABELS: Partial<Record<Badge, string>> = { bestseller: 'Bestseller', new: 'New', chef: 'Chef’s pick' };
const SPECIAL_LABEL = 'Today’s special';

export const photoUrl = (photoId: string): string => `/api/photos/${photoId}`;
const rupees = (paise: number): number => paise / 100;

function toScreenItem(item: MenuItemData, today: string): MenuItem {
  const [first] = item.prices;
  return {
    id: item.id,
    name: item.name,
    ...(item.nameHi ? { nameHi: item.nameHi } : {}),
    ...(item.description ? { description: item.description } : {}),
    price: rupees(first.paise),
    ...(item.prices.length > 1 ? { sizes: item.prices.map((price) => ({ label: price.label, price: rupees(price.paise) })) } : {}),
    diet: item.diet,
    ...(item.badges.length ? { badges: item.badges } : {}),
    ...(item.kcal !== null ? { kcal: item.kcal } : {}),
    soldOut: isSoldOut(item, today),
    emoji: item.emoji || emojiFor(item.name, item.diet),
    ...(item.photo ? { photo: photoUrl(item.photo) } : {}),
  };
}

function toScreenCategory(category: MenuCategoryData, today: string): MenuCategory {
  return {
    id: category.id,
    name: category.name,
    ...(category.nameHi ? { nameHi: category.nameHi } : {}),
    items: category.items.filter((item) => !item.hidden).map((item) => toScreenItem(item, today)),
  };
}

/**
 * Bestsellers, new dishes and chef's picks become promo slides; with none marked, the first few dishes do.
 * `skipId` leaves out today's special, which has its own slide.
 */
export function featuredPromos(categories: readonly MenuCategory[], skipId?: string): readonly Promo[] {
  const available = categories.flatMap((category) => category.items.filter((item) => !item.soldOut && item.id !== skipId).map((item) => ({ item, category })));
  const marked = available.filter(({ item }) => item.badges?.some((badge) => FEATURE_LABELS[badge]));
  const picks = (marked.length > 0 ? marked : available).slice(0, MAX_FEATURED);
  return picks.map(({ item, category }) => {
    const badge = item.badges?.find((entry) => FEATURE_LABELS[entry]);
    return {
      id: `item-${item.id}`,
      kind: badge === 'new' ? 'new' : 'special',
      label: (badge && FEATURE_LABELS[badge]) ?? category.name,
      headline: item.name,
      line: item.description ?? category.name,
      price: item.price,
      emoji: item.emoji,
      ...(item.photo ? { photo: item.photo } : {}),
    };
  });
}

/** Today's special as a promo slide, while its dish is on screen now (its daypart on) and in stock. */
function specialPromo(menu: Menu, categories: readonly MenuCategory[], today: string): { readonly promo: Promo; readonly itemId: string } | null {
  const itemId = todaysSpecial(menu, today)?.item.id;
  const category = categories.find((entry) => entry.items.some((item) => item.id === itemId));
  const item = category?.items.find((entry) => entry.id === itemId);
  if (!category || !item || item.soldOut) return null;
  const promo: Promo = {
    id: `special-${item.id}`,
    kind: 'special',
    label: SPECIAL_LABEL,
    headline: item.name,
    line: item.description ?? category.name,
    price: item.price,
    emoji: item.emoji,
    ...(item.photo ? { photo: item.photo } : {}),
  };
  return { promo, itemId: item.id };
}

/** What the TVs play at `clock`: today's sold out marked, and only the categories whose daypart is on now. */
export function screenRestaurant(profile: ScreenProfile, menu: Menu, clock: LocalClock): Restaurant {
  const categories = menu.categories
    .filter((category) => showsAt(category.daypart ?? null, clock))
    .map((category) => toScreenCategory(category, clock.today))
    .filter((category) => category.items.length > 0);
  const special = specialPromo(menu, categories, clock.today);
  const promos = special ? [special.promo, ...featuredPromos(categories, special.itemId)] : featuredPromos(categories);
  const ticker = promos.length > 0 ? promos.map((promo) => `${promo.label}: ${promo.headline}, ₹${formatRupees(promo.price ?? 0)}`) : [profile.name, profile.tagline].filter(Boolean);
  return { name: profile.name, tagline: profile.tagline, categories, promos, ads: [], ticker, ...(special ? { specialId: special.itemId } : {}) };
}
