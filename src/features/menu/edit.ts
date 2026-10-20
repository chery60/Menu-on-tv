import { MENU_LIMITS, type ItemInput, type Menu, type MenuCategoryData, type MenuEdit, type MenuImport, type MenuItemData } from './schema';

/** Menu changes as pure functions: each returns a new menu and never touches the one it was given. */

export class MenuEditError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MenuEditError';
  }
}

export interface EditContext {
  /** Today in the outlet's time zone, as YYYY-MM-DD. */
  readonly today: string;
  readonly now: Date;
  readonly newId: () => string;
}

const GONE = 'That was changed on another phone. Here is the latest menu.';

export function emptyMenu(now: Date): Menu {
  return { updatedAt: now.toISOString(), categories: [] };
}

export function isSoldOut(item: MenuItemData, today: string): boolean {
  return item.soldOutOn === today;
}

const clamp = (index: number, length: number): number => Math.max(0, Math.min(index, length));

function insertAt<T>(list: readonly T[], index: number, value: T): T[] {
  const at = clamp(index, list.length);
  return [...list.slice(0, at), value, ...list.slice(at)];
}

function findCategory(menu: Menu, categoryId: string): MenuCategoryData {
  const category = menu.categories.find((entry) => entry.id === categoryId);
  if (!category) throw new MenuEditError(GONE);
  return category;
}

export function findItem(menu: Menu, itemId: string): { readonly category: MenuCategoryData; readonly item: MenuItemData } | null {
  for (const category of menu.categories) {
    const item = category.items.find((entry) => entry.id === itemId);
    if (item) return { category, item };
  }
  return null;
}

function requireItem(menu: Menu, itemId: string) {
  const found = findItem(menu, itemId);
  if (!found) throw new MenuEditError(GONE);
  return found;
}

function withCategories(menu: Menu, categories: readonly MenuCategoryData[], now: Date): Menu {
  return { updatedAt: now.toISOString(), categories: [...categories] };
}

function mapItem(menu: Menu, itemId: string, change: (item: MenuItemData) => MenuItemData, now: Date): Menu {
  requireItem(menu, itemId);
  return withCategories(
    menu,
    menu.categories.map((category) => ({ ...category, items: category.items.map((item) => (item.id === itemId ? change(item) : item)) })),
    now,
  );
}

/** Takes an item out of wherever it is and puts it at a position in a category. */
function placeItem(menu: Menu, item: MenuItemData, categoryId: string, toIndex: number, now: Date): Menu {
  const target = findCategory(menu, categoryId);
  const stays = target.items.some((entry) => entry.id === item.id);
  if (!stays && target.items.length >= MENU_LIMITS.itemsPerCategory) throw new MenuEditError(`A category can have up to ${MENU_LIMITS.itemsPerCategory} items.`);
  return withCategories(
    menu,
    menu.categories.map((category) => {
      const without = category.items.filter((entry) => entry.id !== item.id);
      return category.id === categoryId ? { ...category, items: insertAt(without, toIndex, item) } : { ...category, items: without };
    }),
    now,
  );
}

function newItem(input: ItemInput, id: string): MenuItemData {
  return { id, ...input, photo: null, emoji: '', soldOutOn: null, hidden: false };
}

export function applyEdit(menu: Menu, edit: MenuEdit, { today, now, newId }: EditContext): Menu {
  switch (edit.type) {
    case 'add-category': {
      if (menu.categories.length >= MENU_LIMITS.categories) throw new MenuEditError(`A menu can have up to ${MENU_LIMITS.categories} categories.`);
      return withCategories(menu, [...menu.categories, { id: newId(), name: edit.name, nameHi: edit.nameHi, daypart: edit.daypart ?? null, items: [] }], now);
    }
    case 'update-category': {
      findCategory(menu, edit.categoryId);
      return withCategories(
        menu,
        menu.categories.map((category) =>
          category.id === edit.categoryId ? { ...category, name: edit.name, nameHi: edit.nameHi, daypart: edit.daypart === undefined ? category.daypart : edit.daypart } : category,
        ),
        now,
      );
    }
    case 'remove-category': {
      findCategory(menu, edit.categoryId);
      return withCategories(menu, menu.categories.filter((category) => category.id !== edit.categoryId), now);
    }
    case 'move-category': {
      const category = findCategory(menu, edit.categoryId);
      return withCategories(menu, insertAt(menu.categories.filter((entry) => entry.id !== edit.categoryId), edit.toIndex, category), now);
    }
    case 'add-item': {
      const category = findCategory(menu, edit.categoryId);
      return placeItem(menu, newItem(edit.item, newId()), edit.categoryId, category.items.length, now);
    }
    case 'update-item': {
      const { category, item } = requireItem(menu, edit.itemId);
      const updated = { ...item, ...edit.item };
      if (category.id === edit.categoryId) return mapItem(menu, edit.itemId, () => updated, now);
      return placeItem(menu, updated, edit.categoryId, findCategory(menu, edit.categoryId).items.length, now);
    }
    case 'set-prices':
      return mapItem(menu, edit.itemId, (item) => ({ ...item, prices: edit.prices }), now);
    case 'remove-item': {
      requireItem(menu, edit.itemId);
      return withCategories(menu, menu.categories.map((category) => ({ ...category, items: category.items.filter((item) => item.id !== edit.itemId) })), now);
    }
    case 'move-item':
      return placeItem(menu, requireItem(menu, edit.itemId).item, edit.categoryId, edit.toIndex, now);
    case 'set-sold-out':
      return mapItem(menu, edit.itemId, (item) => ({ ...item, soldOutOn: edit.soldOut ? today : null }), now);
    case 'set-hidden':
      return mapItem(menu, edit.itemId, (item) => ({ ...item, hidden: edit.hidden }), now);
  }
}

const sameName = (a: string, b: string): boolean => a.trim().toLowerCase() === b.trim().toLowerCase();
const dishNamed = (menu: Menu, name: string): MenuItemData | undefined => menu.categories.flatMap((category) => category.items).find((item) => sameName(item.name, name));

/**
 * Adds imported dishes as ordinary edits. A dish already on the menu keeps its photo and marks and gets the new prices,
 * so importing the same list twice never doubles it. A category is matched by name, or made when a new dish needs it.
 */
export function applyImport(menu: Menu, groups: MenuImport, context: EditContext): Menu {
  return groups.reduce((current, group) => {
    const known = current.categories.find((category) => sameName(category.name, group.category));
    const categoryId = known?.id ?? context.newId();
    const needsCategory = !known && group.items.some((dish) => !dishNamed(current, dish.name));
    const ready = needsCategory ? applyEdit(current, { type: 'add-category', name: group.category, nameHi: '' }, { ...context, newId: () => categoryId }) : current;
    return group.items.reduce((next, dish) => {
      const match = dishNamed(next, dish.name);
      return applyEdit(next, match ? { type: 'set-prices', itemId: match.id, prices: dish.prices } : { type: 'add-item', categoryId, item: dish }, context);
    }, ready);
  }, menu);
}

/** Sets or clears an item's photo. Returns the photo it replaced, so its file can be deleted. */
export function setPhoto(menu: Menu, itemId: string, photo: string | null, now: Date): { readonly menu: Menu; readonly replaced: string | null } {
  const replaced = requireItem(menu, itemId).item.photo;
  return { menu: mapItem(menu, itemId, (item) => ({ ...item, photo }), now), replaced };
}

/** Every photo a menu uses. */
export function menuPhotos(menu: Menu): readonly string[] {
  return menu.categories.flatMap((category) => category.items.flatMap((item) => (item.photo ? [item.photo] : [])));
}
