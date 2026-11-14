/**
 * QA checks for MT-28 slice 1 (docs/prd/mt-28-hindi-on-screen.md): "Data it touches", "Rules and edge cases",
 * and "How we'll know it works" 1, 4, 5, 6 and 7, at the data and loop level.
 */
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { applyEdit } from '@/features/menu/edit';
import { sampleMenu } from '@/features/menu/sample';
import { menuEditSchema, type Menu } from '@/features/menu/schema';
import { screenRestaurant } from '@/features/menu/to-screen';
import { FileScreensRepository } from '@/features/screens/repository';
import { bundleLanguage, inHindi, languageAt } from './language';
import { loopLength, mainSlides, MENU_FRAMES, paginateMenu } from './loop';
import type { Restaurant } from './types';

const NOW = new Date('2026-11-15T04:30:00.000Z');
const TODAY = '2026-11-15';
const clock = { today: TODAY, weekday: 0, minute: 10 * 60 };
const profile = { name: 'Chai Point', tagline: '' };

function ids() {
  let next = 0;
  return () => `id-${(next += 1)}`;
}

/** The sample café: most dishes have Hindi names (Masala chai is मसाला चाय, Mango lassi is आम लस्सी). */
const menu: Menu = sampleMenu(NOW, ids());
const restaurant: Restaurant = screenRestaurant(profile, menu, clock);
const allItems = (r: Restaurant) => r.categories.flatMap((category) => category.items);

describe('MT-28: screens saved before the language setting (How we’ll know 1)', () => {
  it('a screen saved with "Show Hindi" on reads as English and Hindi; one saved with it off reads as English only', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'menutelly-hindi-'));
    try {
      const file = join(directory, 'screens.json');
      const repo = new FileScreensRepository(file);
      await repo.createScreen('restaurant-1', { name: 'Counter TV', layout: 'split', theme: 'night', language: 'en' }, NOW);
      await repo.createScreen('restaurant-1', { name: 'Door TV', layout: 'board', theme: 'paper', language: 'en' }, NOW);
      // Rewrite them as a pre-MT-28 file would have them: `bilingual` instead of `language`.
      const saved = JSON.parse(await readFile(file, 'utf8'));
      saved.screens = saved.screens.map((screen: Record<string, unknown>, index: number) =>
        Object.fromEntries([...Object.entries(screen).filter(([key]) => key !== 'language'), ['bilingual', index === 0]]),
      );
      await writeFile(file, JSON.stringify(saved));

      const screens = await new FileScreensRepository(file).listScreens('restaurant-1');
      expect(Object.fromEntries(screens.map((screen) => [screen.name, screen.language]))).toEqual({ 'Counter TV': 'en-hi', 'Door TV': 'en' });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('a bundle a TV saved before MT-28 plays the same way', () => {
    expect(bundleLanguage({ bilingual: true })).toBe('en-hi');
    expect(bundleLanguage({ bilingual: false })).toBe('en');
    expect(bundleLanguage({})).toBe('en');
    expect(bundleLanguage({ language: 'en-then-hi', bilingual: true })).toBe('en-then-hi');
  });
});

describe('MT-28: English, then Hindi (How we’ll know 4 and 5)', () => {
  const slides = mainSlides('board', restaurant);
  const pass = loopLength(slides);
  const start = Math.floor(NOW.getTime() / (2 * pass)) * 2 * pass;

  it('takes turns by whole passes of the loop: one pass in English, the next in Hindi', () => {
    expect(languageAt('en-then-hi', slides, start)).toBe('en');
    expect(languageAt('en-then-hi', slides, start + pass - 1)).toBe('en');
    expect(languageAt('en-then-hi', slides, start + pass)).toBe('hi');
    expect(languageAt('en-then-hi', slides, start + 2 * pass - 1)).toBe('hi');
    expect(languageAt('en-then-hi', slides, start + 2 * pass)).toBe('en');
  });

  it('every TV on the screen shows the same language at the same moment, from the clock alone', () => {
    for (const at of [start + 1234, start + pass + 5678]) expect(languageAt('en-then-hi', slides, at)).toBe(languageAt('en-then-hi', mainSlides('board', restaurant), at));
  });

  it('English only and English and Hindi never switch to a Hindi pass', () => {
    for (const language of ['en', 'en-hi'] as const) expect(languageAt(language, slides, start + pass)).toBe('en');
  });

  it('the Hindi pass shows Hindi names where there are some, English where there aren’t, and changes nothing else', () => {
    const hindi = inHindi(restaurant);
    const before = allItems(restaurant);
    const after = allItems(hindi);
    expect(after.map((item) => item.id)).toEqual(before.map((item) => item.id));
    after.forEach((item, index) => {
      const english = before[index];
      expect(item.name).toBe(english.nameHi || english.name);
      expect({ ...item, name: '' }).toEqual({ ...english, name: '' });
    });
    expect(after.find((item) => item.id === before.find((dish) => dish.name === 'Masala chai')!.id)?.name).toBe('मसाला चाय');
    hindi.categories.forEach((category, index) => expect(category.name).toBe(restaurant.categories[index].nameHi || restaurant.categories[index].name));
  });

  it('keeps a mixed-script Hindi name as typed', () => {
    const category = menu.categories[0];
    const chai = category.items[0];
    const input = { name: chai.name, nameHi: 'पनीर Tikka', description: chai.description, prices: chai.prices, diet: chai.diet, badges: chai.badges, kcal: chai.kcal, serving: chai.serving, allergens: chai.allergens };
    const mixed = applyEdit(menu, menuEditSchema.parse({ type: 'update-item', itemId: chai.id, categoryId: category.id, item: input }), { today: TODAY, now: NOW, newId: ids() });
    expect(allItems(inHindi(screenRestaurant(profile, mixed, clock))).find((item) => item.id === chai.id)?.name).toBe('पनीर Tikka');
  });
});

describe('MT-28: pages don’t move between languages (How we’ll know 6)', () => {
  it('a menu that fills two pages keeps every dish on the same page in the English and the Hindi pass', () => {
    // A long menu: the sample twice over, so the Split frame needs more than one page.
    const copy = restaurant.categories.map((category) => ({ ...category, id: `${category.id}-b`, items: category.items.map((item) => ({ ...item, id: `${item.id}-b` })) }));
    const doubled: Restaurant = { ...restaurant, categories: [...restaurant.categories, ...copy] };
    const pagesOf = (r: Restaurant) => paginateMenu(r.categories, MENU_FRAMES.split).map((page) => page.flatMap((category) => category.items.map((item) => item.id)));
    const english = pagesOf(doubled);
    expect(english.length).toBeGreaterThan(1);
    expect(pagesOf(inHindi(doubled))).toEqual(english);
  });
});

describe('MT-28: promos in Hindi (How we’ll know 7)', () => {
  it('with Hindi on, today’s special shows its Hindi name at the same price', () => {
    const lassi = menu.categories.flatMap((category) => category.items).find((item) => item.name === 'Mango lassi')!;
    const withSpecial = applyEdit(menu, menuEditSchema.parse({ type: 'set-special', itemId: lassi.id }), { today: TODAY, now: NOW, newId: ids() });
    const english = screenRestaurant(profile, withSpecial, clock).promos;
    const hindi = inHindi(screenRestaurant(profile, withSpecial, clock)).promos;
    expect(english[0]).toMatchObject({ label: 'Today’s special', headline: 'Mango lassi' });
    expect(hindi[0]).toMatchObject({ label: 'Today’s special', headline: lassi.nameHi, price: english[0].price });
  });
});
