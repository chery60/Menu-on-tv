import type { Menu, MenuItemData } from './schema';

/**
 * Dishes on the TVs with no calories yet (MT-29), in menu order: what the Restaurant tab lists before calories go on,
 * and what the Menu tab counts while they are on. Hidden dishes are off every TV, so they aren't counted.
 */
export function dishesWithoutCalories(menu: Menu): readonly MenuItemData[] {
  return menu.categories.flatMap((category) => category.items.filter((item) => !item.hidden && item.kcal === null));
}
