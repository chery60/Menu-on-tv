import { describe, expect, it } from 'vitest';
import { menuReadingSchema, photoFlag, scorePriceReading, toImportedItems, type MenuReading, type ReadDish } from './photo-import';

const dish = (over: Partial<ReadDish> = {}): ReadDish => ({ category: 'Chai', name: 'Masala chai', nameHi: '', diet: 'veg', prices: [{ label: '', rupees: 30 }], unsure: [], ...over });
const reading = (...dishes: ReadDish[]): MenuReading => ({ dishes, problem: '' });

describe('a photo reading becomes dishes to check', () => {
  it('keeps categories, names and prices in paise, in the order they were read', () => {
    const items = toImportedItems(reading(dish(), dish({ category: 'Snacks', name: 'Chicken roll', diet: 'nonveg', prices: [{ label: 'Half', rupees: 90 }, { label: 'Full', rupees: 160.5 }] })));
    expect(items).toEqual([
      { line: 1, category: 'Chai', name: 'Masala chai', nameHi: '', prices: [{ label: '', paise: 3000 }], diet: 'veg', flag: null, unsure: [] },
      { line: 2, category: 'Snacks', name: 'Chicken roll', nameHi: '', prices: [{ label: 'Half', paise: 9000 }, { label: 'Full', paise: 16050 }], diet: 'nonveg', flag: null, unsure: [] },
    ]);
  });

  it('never fills in a price it could not read, and asks the owner to type it', () => {
    const [item] = toImportedItems(reading(dish({ prices: [{ label: '', rupees: null }] })));
    expect(item.prices).toEqual([]);
    expect(item.unsure).toEqual(['price']);
    expect(item.flag).toBe('We couldn’t read the price. Type it in from your menu.');
  });

  it('marks every field the reader was unsure of', () => {
    const [item] = toImportedItems(reading(dish({ unsure: ['name', 'price'] })));
    expect(item.unsure).toEqual(['name', 'price']);
    expect(item.flag).toBe('Check the name and price against your menu.');
  });

  it('asks about the veg mark when the menu doesn’t show it, instead of guessing', () => {
    const [item] = toImportedItems(reading(dish({ diet: 'unknown' })));
    expect(item.diet).toBe('veg');
    expect(item.unsure).toEqual(['diet']);
    expect(item.flag).toBe('Check the veg or non-veg mark against your menu.');
  });

  it('drops prices that can’t be real and flags the dish', () => {
    const [item] = toImportedItems(reading(dish({ prices: [{ label: 'Half', rupees: 0 }, { label: 'Full', rupees: 120 }, { label: 'Party', rupees: 999_999 }] })));
    expect(item.prices).toEqual([{ label: 'Full', paise: 12000 }]);
    expect(item.unsure).toEqual(['price']);
  });

  it('keeps three sizes at most, as the menu does', () => {
    const sizes = ['S', 'M', 'L', 'XL'].map((label, index) => ({ label, rupees: 50 + index * 10 }));
    const [item] = toImportedItems(reading(dish({ prices: sizes })));
    expect(item.prices.map((price) => price.label)).toEqual(['S', 'M', 'L']);
    expect(item.unsure).toEqual(['price']);
  });

  it('tidies spacing and skips lines with neither a name nor a price', () => {
    const items = toImportedItems(reading(dish({ name: '  Vada   pav ', category: ' Snacks ', nameHi: ' वड़ा पाव ' }), dish({ name: ' ', prices: [] })));
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ name: 'Vada pav', category: 'Snacks', nameHi: 'वड़ा पाव' });
  });

  it('accepts what the model is asked to return and nothing looser', () => {
    expect(menuReadingSchema.safeParse(reading(dish())).success).toBe(true);
    expect(menuReadingSchema.safeParse({ dishes: [{ ...dish(), diet: 'vegan' }], problem: '' }).success).toBe(false);
  });
});

describe('the note on a flagged dish', () => {
  it('lists the fields in plain words', () => {
    expect(photoFlag([], true)).toBe('We couldn’t read the price. Type it in from your menu.');
    expect(photoFlag(['category'], false)).toBe('Check the category against your menu.');
    expect(photoFlag(['name', 'category', 'diet'], false)).toBe('Check the name, category and veg or non-veg mark against your menu.');
    expect(photoFlag([], false)).toBeNull();
  });
});

describe('scoring a reading against a golden menu', () => {
  it('counts prices read exactly, matching dishes by name whatever the case or punctuation', () => {
    const items = toImportedItems(reading(dish({ name: 'Masala Chai.' }), dish({ name: 'Chicken roll', prices: [{ label: 'Half', rupees: 90 }, { label: 'Full', rupees: 150 }] })));
    const score = scorePriceReading({ dishes: [{ name: 'masala chai', prices: [30] }, { name: 'Chicken Roll', prices: [90, 160] }, { name: 'Bun maska', prices: [40] }] }, items);
    expect(score).toEqual({ prices: 4, correct: 2, accuracy: 0.5, misses: ['Chicken Roll: 160', 'Bun maska: 40'] });
  });

  it('scores an empty golden menu as perfect rather than dividing by zero', () => {
    expect(scorePriceReading({ dishes: [] }, []).accuracy).toBe(1);
  });
});
