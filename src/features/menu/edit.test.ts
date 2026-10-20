import { describe, expect, it } from 'vitest';
import { applyEdit, applyImport, emptyMenu, findItem, isSoldOut, menuPhotos, MenuEditError, setPhoto, type EditContext } from './edit';
import { MENU_LIMITS, menuEditSchema, menuImportSchema, type ItemInput, type Menu, type MenuEdit } from './schema';

const NOW = new Date('2026-10-19T10:00:00.000Z');
const PHOTO = '0f8fad5b-d9cb-469f-a165-70867728950e';

function context(): EditContext {
  let next = 0;
  return { today: '2026-10-19', now: NOW, newId: () => `id-${(next += 1)}` };
}

const chai: ItemInput = { name: 'Masala chai', nameHi: '', description: '', prices: [{ label: '', paise: 3000 }], diet: 'veg', badges: [], kcal: null, serving: '', allergens: ['milk'] };

function run(menu: Menu, ...edits: MenuEdit[]): Menu {
  const ctx = context();
  return edits.reduce((current, edit) => applyEdit(current, menuEditSchema.parse(edit), ctx), menu);
}

function cafe(): Menu {
  return run(
    emptyMenu(NOW),
    { type: 'add-category', name: 'Chai', nameHi: '' },
    { type: 'add-category', name: 'Snacks', nameHi: 'नाश्ता' },
    { type: 'add-item', categoryId: 'id-1', item: chai },
    { type: 'add-item', categoryId: 'id-1', item: { ...chai, name: 'Filter coffee' } },
    { type: 'add-item', categoryId: 'id-2', item: { ...chai, name: 'Samosa', allergens: ['gluten'] } },
  );
}

const names = (menu: Menu) => menu.categories.map((category) => `${category.name}: ${category.items.map((item) => item.name).join(', ')}`);

describe('menu edits', () => {
  it('add categories and items in order, without changing the menu they were given', () => {
    const before = emptyMenu(NOW);
    const after = run(before, { type: 'add-category', name: 'Chai', nameHi: '' });
    expect(before.categories).toHaveLength(0);
    expect(names(cafe())).toEqual(['Chai: Masala chai, Filter coffee', 'Snacks: Samosa']);
    expect(after.categories[0]).toMatchObject({ id: 'id-1', name: 'Chai', items: [] });
  });

  it('start new items available, shown and without a photo', () => {
    const item = cafe().categories[0].items[0];
    expect(item).toMatchObject({ photo: null, soldOutOn: null, hidden: false, emoji: '' });
  });

  it('reorder items, move them between categories, and reorder categories', () => {
    const menu = cafe();
    const coffee = menu.categories[0].items[1].id;
    expect(names(run(menu, { type: 'move-item', itemId: coffee, categoryId: 'id-1', toIndex: 0 }))[0]).toBe('Chai: Filter coffee, Masala chai');
    expect(names(run(menu, { type: 'move-item', itemId: coffee, categoryId: 'id-2', toIndex: 9 }))).toEqual(['Chai: Masala chai', 'Snacks: Samosa, Filter coffee']);
    expect(names(run(menu, { type: 'move-category', categoryId: 'id-2', toIndex: 0 }))[0]).toBe('Snacks: Samosa');
  });

  it('update an item in place, or move it when its category changes', () => {
    const menu = cafe();
    const chaiId = menu.categories[0].items[0].id;
    const renamed = run(menu, { type: 'update-item', itemId: chaiId, categoryId: 'id-1', item: { ...chai, name: 'Kadak chai' } });
    expect(names(renamed)[0]).toBe('Chai: Kadak chai, Filter coffee');
    const moved = run(menu, { type: 'update-item', itemId: chaiId, categoryId: 'id-2', item: chai });
    expect(names(moved)).toEqual(['Chai: Filter coffee', 'Snacks: Samosa, Masala chai']);
  });

  it('keep sold out for today only, and hide until shown again', () => {
    const menu = cafe();
    const itemId = menu.categories[0].items[0].id;
    const sold = run(menu, { type: 'set-sold-out', itemId, soldOut: true });
    const item = findItem(sold, itemId)?.item;
    if (!item) throw new Error('missing');
    expect(isSoldOut(item, '2026-10-19')).toBe(true);
    expect(isSoldOut(item, '2026-10-20')).toBe(false);
    expect(findItem(run(sold, { type: 'set-sold-out', itemId, soldOut: false }), itemId)?.item.soldOutOn).toBeNull();
    expect(findItem(run(menu, { type: 'set-hidden', itemId, hidden: true }), itemId)?.item.hidden).toBe(true);
  });

  it('change prices inline, and remove items and categories', () => {
    const menu = cafe();
    const itemId = menu.categories[0].items[0].id;
    const sized = run(menu, { type: 'set-prices', itemId, prices: [{ label: 'Small', paise: 3000 }, { label: 'Large', paise: 4500 }] });
    expect(findItem(sized, itemId)?.item.prices).toHaveLength(2);
    expect(findItem(run(menu, { type: 'remove-item', itemId }), itemId)).toBeNull();
    expect(names(run(menu, { type: 'remove-category', categoryId: 'id-1' }))).toEqual(['Snacks: Samosa']);
    expect(run(menu, { type: 'update-category', categoryId: 'id-2', name: 'Bites', nameHi: '' }).categories[1].name).toBe('Bites');
  });

  it('set a category’s daypart, keep it when an edit leaves it out, and clear it', () => {
    const breakfast = { from: 7 * 60, to: 11 * 60, days: [6, 0, 0] };
    const set = run(cafe(), { type: 'update-category', categoryId: 'id-1', name: 'Breakfast', nameHi: '', daypart: breakfast });
    expect(set.categories[0].daypart).toEqual({ from: 420, to: 660, days: [0, 6] });
    expect(run(set, { type: 'update-category', categoryId: 'id-1', name: 'Morning', nameHi: '' }).categories[0].daypart).toEqual({ from: 420, to: 660, days: [0, 6] });
    expect(run(set, { type: 'update-category', categoryId: 'id-1', name: 'Morning', nameHi: '', daypart: null }).categories[0].daypart).toBeNull();
  });

  it('refuse a daypart that starts and ends at the same time, or has no days', () => {
    expect(menuEditSchema.safeParse({ type: 'add-category', name: 'Lunch', nameHi: '', daypart: { from: 600, to: 600, days: [1] } }).success).toBe(false);
    expect(menuEditSchema.safeParse({ type: 'add-category', name: 'Lunch', nameHi: '', daypart: { from: 600, to: 900, days: [] } }).success).toBe(false);
  });

  it('refuse edits to things another phone removed, with a plain message', () => {
    const menu = cafe();
    expect(() => run(menu, { type: 'remove-item', itemId: 'gone' })).toThrow(MenuEditError);
    expect(() => run(menu, { type: 'add-item', categoryId: 'gone', item: chai })).toThrow(/another phone/);
    expect(() => run(menu, { type: 'move-category', categoryId: 'gone', toIndex: 0 })).toThrow(MenuEditError);
  });

  it('stop at the menu limits', () => {
    const full = { ...emptyMenu(NOW), categories: Array.from({ length: MENU_LIMITS.categories }, (_, index) => ({ id: `c${index}`, name: `C${index}`, nameHi: '', items: [] })) };
    expect(() => run(full, { type: 'add-category', name: 'One more', nameHi: '' })).toThrow(/up to 30/);
    const crowded = run(emptyMenu(NOW), { type: 'add-category', name: 'Chai', nameHi: '' });
    const many = { ...crowded, categories: [{ ...crowded.categories[0], items: Array.from({ length: MENU_LIMITS.itemsPerCategory }, (_, index) => ({ ...cafe().categories[0].items[0], id: `i${index}` })) }] };
    expect(() => run(many, { type: 'add-item', categoryId: 'id-1', item: chai })).toThrow(/up to 80/);
  });

  it('set and replace photos, reporting the one replaced', () => {
    const menu = cafe();
    const itemId = menu.categories[0].items[0].id;
    const first = setPhoto(menu, itemId, PHOTO, NOW);
    expect(first.replaced).toBeNull();
    expect(menuPhotos(first.menu)).toEqual([PHOTO]);
    expect(setPhoto(first.menu, itemId, null, NOW).replaced).toBe(PHOTO);
  });
});

describe('edit validation', () => {
  it('names the problem in plain words', () => {
    const bad = menuEditSchema.safeParse({ type: 'add-item', categoryId: 'c', item: { ...chai, name: ' ' } });
    expect(bad.success ? '' : bad.error.issues[0].message).toBe('Give the dish a name.');
    const sizes = menuEditSchema.safeParse({ type: 'set-prices', itemId: 'i', prices: [{ label: 'Half', paise: 100 }, { label: '', paise: 200 }] });
    expect(sizes.success ? '' : sizes.error.issues[0].message).toMatch(/Name each size/);
    const twice = menuEditSchema.safeParse({ type: 'set-prices', itemId: 'i', prices: [{ label: 'Half', paise: 100 }, { label: 'half', paise: 200 }] });
    expect(twice.success ? '' : twice.error.issues[0].message).toMatch(/different name/);
    expect(menuEditSchema.safeParse({ type: 'drop-table' }).success).toBe(false);
  });
});

describe('applyImport', () => {
  const fresh = (): EditContext => {
    let next = 0;
    return { today: '2026-10-19', now: NOW, newId: () => `new-${(next += 1)}` };
  };

  it('adds dishes to categories matched by name, makes missing ones, and updates the prices of dishes already there', () => {
    const before = cafe();
    const samosa = before.categories[1].items[0];
    const groups = menuImportSchema.parse([
      { category: 'snacks', items: [{ ...chai, name: 'Vada pav' }, { ...chai, name: 'SAMOSA', prices: [{ label: '', paise: 2500 }] }] },
      { category: 'Rolls', items: [{ ...chai, name: 'Paneer roll', diet: 'veg' }] },
      { category: 'Coolers', items: [{ ...chai, name: 'masala chai ', prices: [{ label: 'Small', paise: 2000 }, { label: 'Large', paise: 3500 }] }] },
    ]);
    const after = applyImport(before, groups, fresh());
    expect(names(after)).toEqual(['Chai: Masala chai, Filter coffee', 'Snacks: Samosa, Vada pav', 'Rolls: Paneer roll']);
    expect(findItem(after, samosa.id)?.item).toEqual({ ...samosa, prices: [{ label: '', paise: 2500 }] });
    expect(after.categories[0].items[0].prices).toEqual([{ label: 'Small', paise: 2000 }, { label: 'Large', paise: 3500 }]);
    expect(names(before)).toEqual(['Chai: Masala chai, Filter coffee', 'Snacks: Samosa']);
  });

  it('keeps the menu’s limits', () => {
    const full = run(
      emptyMenu(NOW),
      { type: 'add-category', name: 'Chai', nameHi: '' },
      ...Array.from({ length: MENU_LIMITS.itemsPerCategory }, (_, index): MenuEdit => ({ type: 'add-item', categoryId: 'id-1', item: { ...chai, name: `Chai ${index}` } })),
    );
    expect(() => applyImport(full, [{ category: 'Chai', items: [{ ...chai, name: 'One more' }] }], fresh())).toThrow(MenuEditError);
    expect(() => menuImportSchema.parse([])).toThrow(/at least one dish/);
  });
});
