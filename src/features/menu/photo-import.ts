import { z } from 'zod';
import { joinWords } from '@/lib/words';
import type { ImportedField, ImportedItem, ImportedPrice } from './import';
import { MAX_PAISE } from './money';
import { MENU_LIMITS } from './schema';

/**
 * A menu read from a photo (tracker MT-19). A vision model returns what it read, in this shape; this file
 * turns that into the same dishes the paste import shows for checking. It never invents a price: one the
 * model couldn't read stays empty for the owner to type, and every field it was unsure of is marked.
 */

/** Photos per read, and the most one shrunk photo may weigh (a Server Action body is capped at 1 MB). */
export const MENU_PHOTO_LIMITS = { photos: 4, bytes: 950 * 1024 } as const;

const FIELDS = ['name', 'price', 'category', 'diet'] as const satisfies readonly ImportedField[];

const readDishSchema = z.object({
  category: z.string().describe('The heading the dish is listed under, as printed. Empty if none.'),
  name: z.string().describe('The dish name in English or Latin script, as printed.'),
  nameHi: z.string().describe('The name in Devanagari if the menu prints one. Empty if not.'),
  diet: z.enum(['veg', 'nonveg', 'unknown']),
  prices: z.array(z.object({ label: z.string().describe('Size such as Half, Full, Regular or Large. Empty for a single price.'), rupees: z.number().nullable() })),
  unsure: z.array(z.enum(FIELDS)).describe('Fields that were hard to read or are a guess.'),
});

/** What the model returns for one photo. */
export const menuReadingSchema = z.object({
  dishes: z.array(readDishSchema),
  problem: z.string().describe('Empty when the photo is a readable menu; otherwise one short sentence for the owner.'),
});

export type ReadDish = z.infer<typeof readDishSchema>;
export type MenuReading = z.infer<typeof menuReadingSchema>;

const FIELD_WORDS: Readonly<Record<ImportedField, string>> = { name: 'name', price: 'price', category: 'category', diet: 'veg or non-veg mark' };

/** The note shown on a dish the owner should check, or null when it read cleanly. */
export function photoFlag(unsure: readonly ImportedField[], priceMissing: boolean): string | null {
  if (priceMissing) return 'We couldn’t read the price. Type it in from your menu.';
  if (unsure.length === 0) return null;
  return `Check the ${joinWords(unsure.map((field) => FIELD_WORDS[field]))} against your menu.`;
}

const tidy = (text: string): string => text.replace(/\s+/g, ' ').trim();

function toPrices(read: ReadDish['prices']): { readonly prices: ImportedPrice[]; readonly doubtful: boolean } {
  const prices = read.flatMap((price) => {
    const paise = price.rupees === null || !Number.isFinite(price.rupees) ? 0 : Math.round(price.rupees * 100);
    return paise > 0 && paise <= MAX_PAISE ? [{ label: tidy(price.label), paise }] : [];
  });
  const kept = prices.slice(0, MENU_LIMITS.sizes);
  return { prices: kept, doubtful: kept.length !== read.length };
}

/** The dishes of one photo, ready for the import preview, numbered from 1 in the order read. */
export function toImportedItems(reading: MenuReading): ImportedItem[] {
  const read = reading.dishes.map((dish) => ({ dish, name: tidy(dish.name), ...toPrices(dish.prices) })).filter(({ name, prices }) => name !== '' || prices.length > 0);
  return read.map(({ dish, name, prices, doubtful }, index) => {
    const unsure = FIELDS.filter((field) => dish.unsure.includes(field) || (field === 'price' && doubtful) || (field === 'diet' && dish.diet === 'unknown'));
    return {
      line: index + 1,
      category: tidy(dish.category),
      name,
      nameHi: tidy(dish.nameHi),
      prices,
      diet: dish.diet === 'nonveg' ? 'nonveg' : 'veg',
      flag: photoFlag(unsure, prices.length === 0),
      unsure,
    };
  });
}

/** A menu in the golden set: each dish's prices in rupees, in the order printed. */
export interface GoldenMenu {
  readonly dishes: readonly { readonly name: string; readonly prices: readonly number[] }[];
}

export interface PriceScore {
  readonly prices: number;
  readonly correct: number;
  readonly accuracy: number;
  readonly misses: readonly string[];
}

const nameKey = (name: string): string => tidy(name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' '));

/** How many of the golden menu's prices a reading got exactly right (the bar is 95%, docs/architecture.md). */
export function scorePriceReading(golden: GoldenMenu, items: readonly ImportedItem[]): PriceScore {
  const byName = new Map(items.map((item) => [nameKey(item.name), item]));
  const misses: string[] = [];
  let prices = 0;
  for (const dish of golden.dishes) {
    const read = byName.get(nameKey(dish.name));
    dish.prices.forEach((rupees, index) => {
      prices += 1;
      if (read?.prices[index]?.paise !== Math.round(rupees * 100)) misses.push(`${dish.name}: ${rupees}`);
    });
  }
  const correct = prices - misses.length;
  return { prices, correct, accuracy: prices === 0 ? 1 : correct / prices, misses };
}
