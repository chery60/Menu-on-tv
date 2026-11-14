import { describe, expect, it } from 'vitest';
import { dishesWithoutCalories } from './calories';
import { sampleMenu } from './sample';

const NOW = new Date('2026-11-15T10:00:00.000Z');

describe('dishesWithoutCalories', () => {
  it('lists the dishes on the TVs with no calories, in menu order, leaving out hidden ones', () => {
    let next = 0;
    const menu = sampleMenu(NOW, () => `id-${(next += 1)}`);
    const [first, second] = menu.categories[0].items;
    const edited = {
      ...menu,
      categories: menu.categories.map((category) => ({
        ...category,
        items: category.items.map((item) => (item.id === first.id ? { ...item, kcal: null } : item.id === second.id ? { ...item, kcal: null, hidden: true } : { ...item, kcal: item.kcal ?? 100 })),
      })),
    };
    expect(dishesWithoutCalories(edited).map((item) => item.id)).toEqual([first.id]);
  });
});
