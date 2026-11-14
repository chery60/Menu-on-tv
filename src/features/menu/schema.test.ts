import { describe, expect, it } from 'vitest';
import { ALLERGENS, itemInputSchema, MENU_LIMITS, menuImportSchema, type ItemInput } from './schema';

const chai: ItemInput = { name: 'Masala chai', nameHi: '', description: '', prices: [{ label: '', paise: 3000 }], diet: 'veg', badges: [], kcal: null, serving: '', allergens: ['milk'] };

// Far over any limit: an owner's request (or a forged one) must be turned away in one step, not checked dish by dish.
const OVERSIZED = 5000;

describe('owner input schemas turn away oversized lists', () => {
  it('rejects a category with too many dishes as one problem, without checking each dish', () => {
    const items = Array.from({ length: OVERSIZED }, () => ({}));
    const result = menuImportSchema.safeParse([{ category: 'Chai', items }]);
    expect(result.success).toBe(false);
    expect(result.error?.issues).toHaveLength(1);
    expect(result.error?.issues[0]).toMatchObject({ code: 'too_big', path: [0, 'items'], maximum: MENU_LIMITS.itemsPerCategory });
  });

  it('accepts every allergen once', () => {
    expect(itemInputSchema.safeParse({ ...chai, allergens: [...ALLERGENS] }).success).toBe(true);
  });

  it('rejects an allergen list longer than the allergens there are', () => {
    const result = itemInputSchema.safeParse({ ...chai, allergens: Array.from({ length: OVERSIZED }, () => 'milk') });
    expect(result.success).toBe(false);
    expect(result.error?.issues).toHaveLength(1);
    expect(result.error?.issues[0]).toMatchObject({ code: 'too_big', path: ['allergens'], maximum: ALLERGENS.length });
  });
});
