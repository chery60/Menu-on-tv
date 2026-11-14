/**
 * QA checks for MT-29 slice 1 (docs/prd/mt-29-fssai-display.md): "Rules and edge cases" and "How we'll know it
 * works" 1 and 7, at the data level. With calories on, every dish still has a page in every layout, no page holds
 * more rows than its menu zone has, the same with Hindi on, and calories stay within 0 to 5,000.
 */
import { describe, expect, it } from 'vitest';
import { sampleMenu } from '@/features/menu/sample';
import { itemInputSchema, type Menu } from '@/features/menu/schema';
import { screenRestaurant } from '@/features/menu/to-screen';
import { BILINGUAL_ROW_WEIGHT, busiestColumn, menuFrame, paginateMenu } from './loop';
import { LAYOUT_IDS, type Restaurant } from './types';

const NOW = new Date('2026-11-15T04:30:00.000Z');
const clock = { today: '2026-11-15', weekday: 0, minute: 10 * 60 };
const profile = { name: 'Chai Point', tagline: '' };

function ids() {
  let next = 0;
  return () => `id-${(next += 1)}`;
}

/** The sample café twice over, every dish with calories, a serving and two allergens: the most a page has to hold. */
function labelledMenu(): Menu {
  const base = sampleMenu(NOW, ids());
  const copy = base.categories.map((category) => ({ ...category, id: `${category.id}-b`, items: category.items.map((item) => ({ ...item, id: `${item.id}-b` })) }));
  return {
    ...base,
    categories: [...base.categories, ...copy].map((category) => ({
      ...category,
      items: category.items.map((item) => ({ ...item, kcal: 320, serving: '250 ml', allergens: ['milk', 'gluten'] as Menu['categories'][number]['items'][number]['allergens'] })),
    })),
  };
}

const menu = labelledMenu();
const dishIds = (restaurant: Restaurant) => restaurant.categories.flatMap((category) => category.items.map((item) => item.id)).sort();

describe('MT-29: calories on the TV never push a dish off (How we’ll know 7)', () => {
  const off = screenRestaurant(profile, menu, clock);
  const on = screenRestaurant({ ...profile, fssai: true }, menu, clock);

  it('with the switch off, the TV gets no calories or allergens, and the menu zone is the usual size (How we’ll know 1)', () => {
    expect(off.categories.flatMap((category) => category.items).some((item) => item.kcal !== undefined || item.allergens !== undefined)).toBe(false);
    for (const layout of LAYOUT_IDS) expect(menuFrame(layout, false)).toEqual(menuFrame(layout));
  });

  for (const [language, rowWeight] of [['English', 1], ['English and Hindi', BILINGUAL_ROW_WEIGHT]] as const) {
    it.each(LAYOUT_IDS)(`%s, ${language}: every dish has a page and no column holds more rows than the zone has`, (layout) => {
      const frame = menuFrame(layout, true);
      expect(frame.rows).toBeLessThan(menuFrame(layout, false).rows);
      const pages = paginateMenu(on.categories, frame, rowWeight);
      expect(pages.flatMap((page) => page.flatMap((category) => category.items.map((item) => item.id))).sort()).toEqual(dishIds(on));
      for (const page of pages) {
        // A single category bigger than a page has a page of its own; every other page must fit.
        if (page.length === 1 && busiestColumn(page, frame.columns, rowWeight) > frame.rows) continue;
        expect(busiestColumn(page, frame.columns, rowWeight)).toBeLessThanOrEqual(frame.rows);
      }
      expect(pages.length).toBeGreaterThanOrEqual(paginateMenu(off.categories, menuFrame(layout, false), rowWeight).length);
    });
  }
});

describe('MT-29: calories as typed (Rules)', () => {
  const dish = { name: 'Masala chai', nameHi: '', description: '', prices: [{ label: '', paise: 3000 }], diet: 'veg' as const, badges: [], serving: '150 ml', allergens: [] };

  it('takes 0 to 5,000 kcal per serving, whole numbers only', () => {
    for (const kcal of [0, 120, 5000, null]) expect(itemInputSchema.safeParse({ ...dish, kcal }).success).toBe(true);
    for (const kcal of [-1, 5001, 120.5]) expect(itemInputSchema.safeParse({ ...dish, kcal }).success).toBe(false);
  });
});
