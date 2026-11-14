import { playingUntil } from '@/features/promos/schedule';
import { FESTIVALS, type Promo as StudioPromo, type PromoTemplate } from '@/features/promos/schema';
import { promoDishes, promoStatus } from '@/features/promos/status';
import { formatRupees } from '@/features/screen/loop';
import type { Badge, MenuCategory, MenuItem, Promo, Restaurant } from '@/features/screen/types';
import { emojiFor } from '@/features/screen/visitor-menu';
import { instantAt, type LocalClock } from '@/lib/local-date';
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
      ...(item.nameHi ? { headlineHi: item.nameHi } : {}),
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
    ...(item.nameHi ? { headlineHi: item.nameHi } : {}),
    line: item.description ?? category.name,
    price: item.price,
    emoji: item.emoji,
    ...(item.photo ? { photo: item.photo } : {}),
  };
  return { promo, itemId: item.id };
}

/** What the TVs play at `clock`: today's sold out marked, and only the categories whose daypart is on now. */
export function screenRestaurant(profile: ScreenProfile, menu: Menu, clock: LocalClock, studio?: StudioPromos): Restaurant {
  const categories = menu.categories
    .filter((category) => showsAt(category.daypart ?? null, clock))
    .map((category) => toScreenCategory(category, clock.today))
    .filter((category) => category.items.length > 0);
  const special = specialPromo(menu, categories, clock.today);
  const made = studio ? studio.promos.flatMap((promo) => studioPromo(promo, menu, categories, clock, studio.timeZone) ?? []) : [];
  // Promos made in the studio replace the automatic featured dishes while any is on air; today's special stays first.
  const rest = made.length > 0 ? made : featuredPromos(categories, special?.itemId);
  const promos = special ? [special.promo, ...rest] : rest;
  const ticker = promos.length > 0 ? promos.map(tickerLine) : [profile.name, profile.tagline].filter(Boolean);
  return { name: profile.name, tagline: profile.tagline, categories, promos, ads: [], ticker, ...(special ? { specialId: special.itemId } : {}) };
}

const tickerLine = (promo: Promo): string => `${promo.label}: ${promo.headline}${promo.price !== undefined ? `, ₹${formatRupees(promo.price)}` : ''}`;

/** The owner's promos from the promo studio (MT-26), with the outlet's time zone their times are in. */
export interface StudioPromos {
  readonly promos: readonly StudioPromo[];
  readonly timeZone: string;
}

const TEMPLATE_LABELS: Readonly<Record<PromoTemplate, string>> = { combo: 'Combo', 'happy-hour': 'Happy hour', new: 'New', festival: 'Festival', scan: 'Scan me' };
const NO_DISH_EMOJI: Readonly<Record<PromoTemplate, string>> = { combo: '🍽️', 'happy-hour': '🍽️', new: '🍽️', festival: '🎉', scan: '📱' };

/**
 * A studio promo as a slide while it is on air and every dish is on the screen now (in stock, its category's
 * daypart on); null otherwise. Names, prices and photos come from the menu; the deal price is the owner's.
 */
function studioPromo(promo: StudioPromo, menu: Menu, categories: readonly MenuCategory[], clock: LocalClock, timeZone: string): Promo | null {
  if (promoStatus(promo, menu, clock).state !== 'on-air') return null;
  const found = promoDishes(promo, menu);
  if (!found.ok) return null;
  const shown = categories.flatMap((category) => category.items);
  const dishes = found.dishes.map((dish) => shown.find((item) => item.id === dish.item.id));
  if (dishes.some((item) => !item)) return null;
  const first = dishes[0];
  const deal = promo.dealPaise;
  const price = deal !== null ? rupees(deal) : found.dishes.length === 1 ? rupees(found.dishes[0].paise) : undefined;
  const until = playingUntil(promo, clock);
  return {
    id: `promo-${promo.id}`,
    kind: promo.template,
    label: promo.festival ? FESTIVALS[promo.festival] : TEMPLATE_LABELS[promo.template],
    headline: promo.headline,
    line: promo.line,
    ...(price !== undefined ? { price } : {}),
    ...(deal !== null ? { wasPrice: rupees(found.menuPaise) } : {}),
    emoji: first?.emoji ?? NO_DISH_EMOJI[promo.template],
    ...(first?.photo ? { photo: first.photo } : {}),
    ...(promo.link ? { qrUrl: promo.link } : {}),
    ...(until ? { endsAt: instantAt(until, timeZone), ...(promo.countdown ? { countdown: true } : {}) } : {}),
  };
}
