/** The screen domain: a menu stored as data, promos, ads, and how a screen lays them out. */

/** FSSAI marks: green for veg, brown for non-veg (eggs included). */
export type Diet = 'veg' | 'nonveg';
export const BADGE_IDS = ['bestseller', 'new', 'chef', 'spicy', 'jain'] as const;
export type Badge = (typeof BADGE_IDS)[number];

export interface MenuItem {
  readonly id: string;
  readonly name: string;
  /** Second-language name (Hindi first). Shown when the screen is bilingual. */
  readonly nameHi?: string;
  readonly description?: string;
  /** Price in rupees, tax included. For an item with sizes, the first size's price. */
  readonly price: number;
  /** Half and full, regular and large: shown side by side instead of one price. */
  readonly sizes?: readonly { readonly label: string; readonly price: number }[];
  readonly diet: Diet;
  readonly badges?: readonly Badge[];
  readonly kcal?: number;
  readonly soldOut?: boolean;
  /** Stands in for a dish photo when there is none. */
  readonly emoji: string;
  /** The owner's photo of the dish, as a URL on this site. */
  readonly photo?: string;
}

export interface MenuCategory {
  readonly id: string;
  readonly name: string;
  readonly nameHi?: string;
  readonly items: readonly MenuItem[];
}

export type PromoKind = 'combo' | 'happy-hour' | 'new' | 'special' | 'festival' | 'scan';

export interface Promo {
  readonly id: string;
  readonly kind: PromoKind;
  readonly label: string;
  readonly headline: string;
  readonly line: string;
  readonly price?: number;
  /** The real separate-items price, struck through. Only set when it is the true menu total. */
  readonly wasPrice?: number;
  readonly emoji: string;
  readonly photo?: string;
  /** Opens on a phone when scanned. */
  readonly qrUrl?: string;
}

/** A local business ad the owner has approved (v2). Never covers prices during ordering. */
export interface LocalAd {
  readonly id: string;
  readonly advertiser: string;
  readonly headline: string;
  readonly line: string;
  readonly emoji: string;
}

export interface Restaurant {
  readonly name: string;
  readonly tagline: string;
  readonly categories: readonly MenuCategory[];
  readonly promos: readonly Promo[];
  readonly ads: readonly LocalAd[];
  readonly ticker: readonly string[];
}

export const LAYOUT_IDS = ['board', 'split', 'spotlight', 'lbar', 'ticker', 'portrait'] as const;
export type LayoutId = (typeof LAYOUT_IDS)[number];

/** The brand's two grounds: paper by day, night for dim rooms. */
export const THEME_IDS = ['paper', 'night'] as const;
export type ThemeId = (typeof THEME_IDS)[number];

/** Themes from before the brand pass (2026-10-20): the dark ones became Night, Fresh became Paper. */
const RETIRED_THEMES: Readonly<Record<string, ThemeId>> = { chalk: 'night', neon: 'night', fresh: 'paper' };

export interface LayoutMeta {
  readonly id: LayoutId;
  readonly name: string;
  readonly summary: string;
  readonly portrait: boolean;
}

export const LAYOUTS: readonly LayoutMeta[] = [
  { id: 'board', name: 'Full board', summary: 'The whole menu on the screen, with an offer filling it now and then.', portrait: false },
  { id: 'split', name: 'Split', summary: 'Your menu on the left, with offers and a featured dish taking turns on the right.', portrait: false },
  { id: 'spotlight', name: 'Spotlight', summary: 'One dish, huge, with what goes well with it.', portrait: false },
  { id: 'lbar', name: 'L-bar', summary: 'Your menu, a column of offers, and a line of text moving along the bottom.', portrait: false },
  { id: 'ticker', name: 'Ticker', summary: 'The whole menu, with offers moving along a line at the bottom.', portrait: false },
  { id: 'portrait', name: 'Portrait', summary: 'For a TV standing on its side: one big dish on top, the menu below.', portrait: true },
];

export const THEMES: readonly { readonly id: ThemeId; readonly name: string; readonly summary: string }[] = [
  { id: 'paper', name: 'Paper', summary: 'Dark print on a light screen. Easy to read in a bright shop.' },
  { id: 'night', name: 'Night', summary: 'Light print on a dark screen. Easier on the eyes in a dim shop or at night.' },
];

export function isLayoutId(value: unknown): value is LayoutId {
  return typeof value === 'string' && (LAYOUT_IDS as readonly string[]).includes(value);
}

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && (THEME_IDS as readonly string[]).includes(value);
}

/** A saved or linked theme id as today's: a retired id becomes its brand theme; anything else is left for the caller to check. */
export function upgradeThemeId(value: unknown): unknown {
  return typeof value === 'string' && value in RETIRED_THEMES ? RETIRED_THEMES[value] : value;
}
