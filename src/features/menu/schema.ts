import { z } from 'zod';
import { BADGE_IDS } from '@/features/screen/types';
import { daypartSchema } from './dayparts';
import { MAX_PAISE } from './money';

/** The menu as data (ADR-003): categories and items with prices in paise, diet marks, calories and allergens. */

/** The allergens FSSAI's labelling and display rules ask food businesses to declare. */
export const ALLERGENS = ['gluten', 'crustacean', 'milk', 'egg', 'fish', 'peanut', 'tree-nut', 'soy', 'sulphite'] as const;
export type Allergen = (typeof ALLERGENS)[number];

export const ALLERGEN_LABELS: Readonly<Record<Allergen, string>> = {
  gluten: 'Gluten',
  crustacean: 'Crustaceans',
  milk: 'Milk',
  egg: 'Egg',
  fish: 'Fish',
  peanut: 'Peanuts',
  'tree-nut': 'Tree nuts',
  soy: 'Soy',
  sulphite: 'Sulphite',
};

export const MENU_LIMITS = {
  categories: 30,
  itemsPerCategory: 80,
  sizes: 3,
  badges: 3,
  name: 80,
  categoryName: 40,
  description: 160,
  sizeLabel: 16,
  serving: 24,
  kcal: 5000,
} as const;

/** Photos are named by a random UUID; nothing else may reach the file system. */
export const PHOTO_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const id = z.string().min(1).max(64);
const diet = z.enum(['veg', 'nonveg']);
const priceSchema = z.object({ label: z.string().max(MENU_LIMITS.sizeLabel), paise: z.number().int().min(0).max(MAX_PAISE) });

export const itemSchema = z.object({
  id,
  name: z.string().min(1).max(MENU_LIMITS.name),
  nameHi: z.string().max(MENU_LIMITS.name),
  description: z.string().max(MENU_LIMITS.description),
  prices: z.array(priceSchema).min(1).max(MENU_LIMITS.sizes),
  diet,
  badges: z.array(z.enum(BADGE_IDS)).max(MENU_LIMITS.badges),
  kcal: z.number().int().min(0).max(MENU_LIMITS.kcal).nullable(),
  serving: z.string().max(MENU_LIMITS.serving),
  allergens: z.array(z.enum(ALLERGENS)),
  photo: z.string().regex(PHOTO_ID).nullable(),
  /** Set on sample menus; owner dishes get a plate guessed from the name. */
  emoji: z.string().max(16),
  /** The day (in the outlet's time zone) the item sold out. It is back on the menu the next day. */
  soldOutOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  /** Off every screen until the owner shows it again. */
  hidden: z.boolean(),
});

export const categorySchema = z.object({
  id,
  name: z.string().min(1).max(MENU_LIMITS.categoryName),
  nameHi: z.string().max(MENU_LIMITS.categoryName),
  /** When the category is on the screens; missing or null means always. */
  daypart: daypartSchema.nullable().optional(),
  items: z.array(itemSchema).max(MENU_LIMITS.itemsPerCategory),
});

export const menuSchema = z.object({
  updatedAt: z.string(),
  categories: z.array(categorySchema).max(MENU_LIMITS.categories),
});

export const menusFileSchema = z.object({
  version: z.literal(1),
  menus: z.record(z.string(), menuSchema),
});

export type MenuItemData = z.infer<typeof itemSchema>;
export type MenuCategoryData = z.infer<typeof categorySchema>;
export type Menu = z.infer<typeof menuSchema>;
export type MenusFile = z.infer<typeof menusFileSchema>;

const optionalText = (max: number, message: string) => z.string().trim().max(max, { error: message });

export const pricesInputSchema = z
  .array(
    z.object({
      label: z.string().trim().max(MENU_LIMITS.sizeLabel, { error: 'Keep size names short, like “Half” or “Large”.' }),
      paise: z.number({ error: 'Enter a price in rupees.' }).int().min(0, { error: 'A price can’t be below zero.' }).max(MAX_PAISE, { error: 'That price is too high.' }),
    }),
  )
  .min(1, { error: 'Enter a price in rupees.' })
  .max(MENU_LIMITS.sizes, { error: `An item can have up to ${MENU_LIMITS.sizes} sizes.` })
  .superRefine((prices, context) => {
    if (prices.length < 2) return;
    const labels = prices.map((price) => price.label.toLowerCase());
    if (labels.some((label) => label.length === 0)) context.addIssue({ code: 'custom', message: 'Name each size, like “Half” and “Full”.' });
    else if (new Set(labels).size !== labels.length) context.addIssue({ code: 'custom', message: 'Give each size a different name.' });
  });

export const itemInputSchema = z.object({
  name: z.string().trim().min(1, { error: 'Give the dish a name.' }).max(MENU_LIMITS.name, { error: `Keep the name to ${MENU_LIMITS.name} characters.` }),
  nameHi: optionalText(MENU_LIMITS.name, `Keep the Hindi name to ${MENU_LIMITS.name} characters.`),
  description: optionalText(MENU_LIMITS.description, `Keep the description to ${MENU_LIMITS.description} characters.`),
  prices: pricesInputSchema,
  diet: z.enum(['veg', 'nonveg'], { error: 'Choose veg or non-veg.' }),
  badges: z.array(z.enum(BADGE_IDS)).max(MENU_LIMITS.badges, { error: `Pick up to ${MENU_LIMITS.badges} labels.` }),
  kcal: z.number().int().min(0).max(MENU_LIMITS.kcal, { error: 'Calories look too high. Check the number.' }).nullable(),
  serving: optionalText(MENU_LIMITS.serving, 'Keep the serving size short, like “250 ml”.'),
  allergens: z.array(z.enum(ALLERGENS)),
});

export type ItemInput = z.infer<typeof itemInputSchema>;

const categoryName = z.string().trim().min(1, { error: 'Give the category a name.' }).max(MENU_LIMITS.categoryName, { error: `Keep the name to ${MENU_LIMITS.categoryName} characters.` });
const categoryHi = optionalText(MENU_LIMITS.categoryName, `Keep the Hindi name to ${MENU_LIMITS.categoryName} characters.`);
const position = z.number().int().min(0).max(1000);

/** Every change the menu editor can ask for. The server applies it to the latest menu, so two phones never overwrite each other. */
export const menuEditSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('add-category'), name: categoryName, nameHi: categoryHi, daypart: daypartSchema.nullable().optional() }),
  // A daypart left out keeps the one the category has; null clears it.
  z.object({ type: z.literal('update-category'), categoryId: id, name: categoryName, nameHi: categoryHi, daypart: daypartSchema.nullable().optional() }),
  z.object({ type: z.literal('remove-category'), categoryId: id }),
  z.object({ type: z.literal('move-category'), categoryId: id, toIndex: position }),
  z.object({ type: z.literal('add-item'), categoryId: id, item: itemInputSchema }),
  z.object({ type: z.literal('update-item'), itemId: id, categoryId: id, item: itemInputSchema }),
  z.object({ type: z.literal('set-prices'), itemId: id, prices: pricesInputSchema }),
  z.object({ type: z.literal('remove-item'), itemId: id }),
  z.object({ type: z.literal('move-item'), itemId: id, categoryId: id, toIndex: position }),
  z.object({ type: z.literal('set-sold-out'), itemId: id, soldOut: z.boolean() }),
  z.object({ type: z.literal('set-hidden'), itemId: id, hidden: z.boolean() }),
]);

export type MenuEdit = z.infer<typeof menuEditSchema>;

/** Dishes the owner pasted or uploaded and checked, by category. They are saved in one change. */
export const menuImportSchema = z
  .array(z.object({ category: categoryName, items: z.array(itemInputSchema).min(1).max(MENU_LIMITS.itemsPerCategory, { error: `A category can have up to ${MENU_LIMITS.itemsPerCategory} items.` }) }))
  .min(1, { error: 'Add at least one dish.' })
  .max(MENU_LIMITS.categories, { error: `A menu can have up to ${MENU_LIMITS.categories} categories.` });

export type MenuImport = z.infer<typeof menuImportSchema>;
