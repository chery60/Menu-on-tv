import { describe, expect, it } from 'vitest';
import { buildVisitorRestaurant, emojiFor, FALLBACK_CAFE, SAMPLE_DISHES, VISITOR_LIMITS } from './visitor-menu';

const items = (restaurant: ReturnType<typeof buildVisitorRestaurant>) => restaurant.categories[0].items;

describe('buildVisitorRestaurant', () => {
  it('plays the visitor’s café and dishes', () => {
    const menu = buildVisitorRestaurant({
      cafe: '  Chai Corner ',
      dishes: [
        { name: 'Cutting chai', price: '15', diet: 'veg' },
        { name: 'Egg bhurji pav', price: 60, diet: 'nonveg' },
      ],
    });
    expect(menu.name).toBe('Chai Corner');
    expect(items(menu).map((item) => [item.name, item.price, item.diet])).toEqual([
      ['Cutting chai', 15, 'veg'],
      ['Egg bhurji pav', 60, 'nonveg'],
    ]);
    expect(menu.promos[0]).toMatchObject({ headline: 'Cutting chai', price: 15, line: 'Fresh at Chai Corner' });
    expect(menu.ticker[0]).toContain('Chai Corner');
  });

  it('skips dishes that are not complete or not sensible', () => {
    const menu = buildVisitorRestaurant({
      cafe: 'Test',
      dishes: [
        { name: '', price: 40, diet: 'veg' },
        { name: 'Free lunch', price: 0, diet: 'veg' },
        { name: 'Mystery', price: 'abc', diet: 'veg' },
        { name: 'Gold leaf thali', price: VISITOR_LIMITS.price + 1, diet: 'veg' },
        { name: 'Idli', price: '30', diet: 'veg' },
      ],
    });
    expect(items(menu).map((item) => item.name)).toEqual(['Idli']);
  });

  it('falls back to a placeholder name and the sample dishes', () => {
    const menu = buildVisitorRestaurant({ cafe: '   ', dishes: [{ name: ' ', price: '', diet: 'veg' }] });
    expect(menu.name).toBe(FALLBACK_CAFE);
    expect(items(menu)).toHaveLength(SAMPLE_DISHES.length);
  });

  it('keeps names and the menu within the screen’s limits', () => {
    const long = 'x'.repeat(VISITOR_LIMITS.cafe + 1);
    const dishes = Array.from({ length: VISITOR_LIMITS.dishes + 3 }, (_, index) => ({ name: `Dish ${index}`, price: 10 + index, diet: 'veg' as const }));
    const menu = buildVisitorRestaurant({ cafe: long, dishes });
    expect(menu.name).toBe(FALLBACK_CAFE);
    expect(items(menu)).toHaveLength(VISITOR_LIMITS.dishes);
    expect(new Set(items(menu).map((item) => item.id)).size).toBe(VISITOR_LIMITS.dishes);
  });
});

describe('emojiFor', () => {
  it.each([
    ['Masala chai', '☕'],
    ['Paneer tikka roll', '🌯'],
    ['Vada pav', '🍔'],
    ['Masala dosa', '🫓'],
    ['Chicken biryani', '🍛'],
    ['Mango lassi', '🥛'],
    ['Chocolate brownie', '🍰'],
    ['Something new', '🍽️'],
  ])('%s gets %s', (dish, emoji) => {
    expect(emojiFor(dish)).toBe(emoji);
  });

  it('never gives a veg dish a meat or egg plate', () => {
    expect(emojiFor('Paneer tikka', 'veg')).toBe('🧀');
    expect(emojiFor('Hara bhara kebab', 'veg')).toBe('🍽️');
    expect(emojiFor('Eggless cake', 'veg')).toBe('🍰');
    expect(emojiFor('Chicken tikka', 'nonveg')).toBe('🍗');
    expect(emojiFor('Egg bhurji', 'nonveg')).toBe('🍳');
  });
});
