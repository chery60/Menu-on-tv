import { BILINGUAL_ROW_WEIGHT, liveSlides, loopLength, type Slide } from './loop';
import type { MenuCategory, MenuItem, Promo, Restaurant, ScreenLanguage } from './types';

/** Hindi on screen (MT-28): how tall a row is, which language is on now, and the menu with Hindi names in place. */

/** The languages a bundle plays, including one a TV saved before MT-28 (which had only `bilingual`). */
export function bundleLanguage(bundle: { readonly language?: ScreenLanguage; readonly bilingual?: boolean }): ScreenLanguage {
  return bundle.language ?? (bundle.bilingual ? 'en-hi' : 'en');
}

/** Standard rows one dish takes: both names stack on "English and Hindi"; the Hindi pass puts Hindi in the English line. */
export function rowWeightFor(language: ScreenLanguage): number {
  return language === 'en-hi' ? BILINGUAL_ROW_WEIGHT : 1;
}

/**
 * The language a slide that starts at `startMs` shows. "English, then Hindi" takes turns by whole passes of the main
 * loop on the wall clock, so every TV on a screen switches at the same moment with no syncing; the others are English.
 */
export function languageAt(language: ScreenLanguage, slides: readonly Slide[], startMs: number): 'en' | 'hi' {
  if (language !== 'en-then-hi' || slides.length === 0) return 'en';
  const at = Math.floor(startMs);
  return Math.floor(at / loopLength(liveSlides(slides, at))) % 2 === 1 ? 'hi' : 'en';
}

/** A dish on the Hindi pass: its Hindi name in the English name's place; a dish without one stays in English. */
export const itemInHindi = (item: MenuItem): MenuItem => (item.nameHi ? { ...item, name: item.nameHi } : item);

const categoryInHindi = (category: MenuCategory): MenuCategory => ({ ...category, ...(category.nameHi ? { name: category.nameHi } : {}), items: category.items.map(itemInHindi) });

/** A promo on the Hindi pass: a dish's Hindi name in place of its headline; a typed headline shows as typed. */
export const promoInHindi = (promo: Promo): Promo => (promo.headlineHi ? { ...promo, headline: promo.headlineHi } : promo);

/** The restaurant as the Hindi pass shows it. Prices, marks, badges and positions don't change, so pages stay the same. */
export function inHindi(restaurant: Restaurant): Restaurant {
  return { ...restaurant, categories: restaurant.categories.map(categoryInHindi), promos: restaurant.promos.map(promoInHindi) };
}
