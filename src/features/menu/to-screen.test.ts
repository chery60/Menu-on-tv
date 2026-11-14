import { describe, expect, it } from 'vitest';
import { mainSlides, sideLoop } from '@/features/screen/loop';
import { applyEdit, emptyMenu } from './edit';
import { sampleMenu } from './sample';
import { menuEditSchema, menusFileSchema, type Menu, type MenuEdit } from './schema';
import { featuredPromos, screenRestaurant } from './to-screen';

const NOW = new Date('2026-10-19T10:00:00.000Z');
const TODAY = '2026-10-19';
/** The outlet's clock at ten in the morning, a Monday, on `today`. */
const clockOn = (today: string, minute = 10 * 60, weekday = 1) => ({ today, weekday, minute });
const profile = { name: 'Chai Point', tagline: 'Fresh chai all day' };
const PHOTO = '0f8fad5b-d9cb-469f-a165-70867728950e';

function ids() {
  let next = 0;
  return () => `id-${(next += 1)}`;
}

function edit(menu: Menu, value: MenuEdit): Menu {
  return applyEdit(menu, menuEditSchema.parse(value), { today: TODAY, now: NOW, newId: ids() });
}

describe('screenRestaurant', () => {
  it('leaves out a category outside its daypart, so breakfast is gone by the afternoon', () => {
    const ctx = { today: TODAY, now: NOW, newId: ids() };
    const dish = { nameHi: '', description: '', prices: [{ label: '', paise: 5000 }], diet: 'veg' as const, badges: [], kcal: null, serving: '', allergens: [] };
    const edits: MenuEdit[] = [
      { type: 'add-category', name: 'Breakfast', nameHi: '', daypart: { from: 7 * 60, to: 11 * 60, days: [0, 1, 2, 3, 4, 5, 6] } },
      { type: 'add-category', name: 'Chai', nameHi: '' },
      { type: 'add-item', categoryId: 'id-1', item: { ...dish, name: 'Poha' } },
      { type: 'add-item', categoryId: 'id-2', item: { ...dish, name: 'Masala chai' } },
    ];
    const menu = edits.reduce((current, change) => applyEdit(current, menuEditSchema.parse(change), ctx), emptyMenu(NOW));
    expect(screenRestaurant(profile, menu, clockOn(TODAY, 8 * 60)).categories.map((category) => category.name)).toEqual(['Breakfast', 'Chai']);
    expect(screenRestaurant(profile, menu, clockOn(TODAY, 15 * 60)).categories.map((category) => category.name)).toEqual(['Chai']);
  });

  it('turns paise into rupees, keeps sizes, and guesses a plate when there is no photo', () => {
    let menu = edit(emptyMenu(NOW), { type: 'add-category', name: 'Mains', nameHi: '' });
    menu = edit(menu, {
      type: 'add-item',
      categoryId: 'id-1',
      item: { name: 'Chicken biryani', nameHi: 'चिकन बिरयानी', description: '', prices: [{ label: 'Half', paise: 18000 }, { label: 'Full', paise: 32050 }], diet: 'nonveg', badges: [], kcal: 650, serving: '', allergens: [] },
    });
    const [item] = screenRestaurant(profile, menu, clockOn(TODAY)).categories[0].items;
    expect(item).toMatchObject({ name: 'Chicken biryani', nameHi: 'चिकन बिरयानी', price: 180, sizes: [{ label: 'Half', price: 180 }, { label: 'Full', price: 320.5 }], diet: 'nonveg', kcal: 650, emoji: '🍛', soldOut: false });
    expect(item).not.toHaveProperty('description');
    expect(item).not.toHaveProperty('photo');
  });

  it('marks today’s sold-out items, leaves hidden items and empty categories off the screen', () => {
    const menu = sampleMenu(NOW, ids());
    const [chai, ginger] = menu.categories[0].items;
    let changed = edit(menu, { type: 'set-sold-out', itemId: chai.id, soldOut: true });
    changed = edit(changed, { type: 'set-hidden', itemId: ginger.id, hidden: true });
    changed = { ...changed, categories: [...changed.categories, { id: 'empty', name: 'Empty', nameHi: '', items: [] }] };
    const screen = screenRestaurant(profile, changed, clockOn(TODAY));
    const items = screen.categories[0].items;
    expect(items.find((item) => item.id === chai.id)?.soldOut).toBe(true);
    expect(items.some((item) => item.id === ginger.id)).toBe(false);
    expect(screen.categories.some((category) => category.name === 'Empty')).toBe(false);
    expect(screenRestaurant(profile, changed, clockOn('2026-10-20')).categories[0].items.find((item) => item.id === chai.id)?.soldOut).toBe(false);
  });

  it('links photos through the photo route', () => {
    const menu = sampleMenu(NOW, ids());
    const withPhoto = { ...menu, categories: [{ ...menu.categories[0], items: [{ ...menu.categories[0].items[0], photo: PHOTO }] }] };
    expect(screenRestaurant(profile, withPhoto, clockOn(TODAY)).categories[0].items[0].photo).toBe(`/api/photos/${PHOTO}`);
  });

  it('features marked dishes as promos and the ticker, never sold-out ones', () => {
    const screen = screenRestaurant(profile, sampleMenu(NOW, ids()), clockOn(TODAY));
    expect(screen.promos.length).toBeGreaterThan(0);
    expect(screen.promos.length).toBeLessThanOrEqual(4);
    expect(screen.promos[0]).toMatchObject({ label: 'Bestseller', headline: 'Masala chai', price: 30 });
    expect(screen.ticker[0]).toBe('Bestseller: Masala chai, ₹30');
    expect(screen.ads).toEqual([]);
    const soldOut = featuredPromos([{ id: 'c', name: 'Chai', items: [{ id: 'a', name: 'Chai', price: 30, diet: 'veg', emoji: '☕', soldOut: true, badges: ['bestseller'] }] }]);
    expect(soldOut).toEqual([]);
  });

  it('falls back to plain dishes, then to the name and tagline', () => {
    let menu = edit(emptyMenu(NOW), { type: 'add-category', name: 'Chai', nameHi: '' });
    menu = edit(menu, { type: 'add-item', categoryId: 'id-1', item: { name: 'Cutting chai', nameHi: '', description: '', prices: [{ label: '', paise: 1500 }], diet: 'veg', badges: [], kcal: null, serving: '', allergens: [] } });
    expect(screenRestaurant(profile, menu, clockOn(TODAY)).promos[0]).toMatchObject({ label: 'Chai', headline: 'Cutting chai', line: 'Chai' });
    const empty = screenRestaurant(profile, emptyMenu(NOW), clockOn(TODAY));
    expect(empty).toMatchObject({ categories: [], promos: [], ticker: ['Chai Point', 'Fresh chai all day'] });
  });
});

describe('sampleMenu', () => {
  it('is a valid menu the owner can edit', () => {
    const menu = sampleMenu(NOW, ids());
    expect(() => menusFileSchema.parse({ version: 1, menus: { r: menu } })).not.toThrow();
    expect(menu.categories.flatMap((category) => category.items).every((item) => !item.soldOutOn && !item.hidden)).toBe(true);
  });
});

describe('today’s special on the TV', () => {
  // The sample café: Masala chai is a bestseller; Adrak elaichi chai is a plain dish with no description.
  const menu = sampleMenu(NOW, ids());
  const [masala, adrak] = menu.categories[0].items;
  const special = (itemId: string, base: Menu = menu) => edit(base, { type: 'set-special', itemId });
  const plain = screenRestaurant(profile, menu, clockOn(TODAY));

  it('plays first, at its menu price, with the featured dishes still playing after it', () => {
    const screen = screenRestaurant(profile, special(adrak.id), clockOn(TODAY));
    expect(screen.promos[0]).toEqual({ id: `special-${adrak.id}`, kind: 'special', label: 'Today’s special', headline: 'Adrak elaichi chai', line: 'Chai and coffee', price: 35, emoji: adrak.emoji });
    expect(screen.promos.slice(1)).toEqual(plain.promos);
    expect(screen.ticker[0]).toBe('Today’s special: Adrak elaichi chai, ₹35');
    expect(screen.specialId).toBe(adrak.id);
    expect(plain).not.toHaveProperty('specialId');
  });

  it('leads every layout: the side zone, the first full-board takeover, the ticker and the first Spotlight dish', () => {
    const screen = screenRestaurant(profile, special(adrak.id), clockOn(TODAY));
    const first = sideLoop(screen)[0];
    expect(first.kind === 'promo' && first.promo.id).toBe(`special-${adrak.id}`);
    const takeover = mainSlides('board', screen).find((slide) => slide.kind === 'promo');
    expect(takeover?.kind === 'promo' && takeover.promo.id).toBe(`special-${adrak.id}`);
    const hero = mainSlides('spotlight', screen)[0];
    expect(hero.kind === 'spotlight' && hero.item.id).toBe(adrak.id);
  });

  it('never plays a featured dish twice when it is also the special', () => {
    const screen = screenRestaurant(profile, special(masala.id), clockOn(TODAY));
    expect(screen.promos[0]).toMatchObject({ label: 'Today’s special', headline: 'Masala chai', price: 30 });
    expect(screen.promos.filter((promo) => promo.headline === 'Masala chai')).toHaveLength(1);
  });

  it('shows its description, photo and first size’s price when it has them', () => {
    let sized = edit(emptyMenu(NOW), { type: 'add-category', name: 'Mains', nameHi: '' });
    sized = edit(sized, {
      type: 'add-item',
      categoryId: 'id-1',
      item: { name: 'Chicken biryani', nameHi: '', description: 'Dum cooked, with raita', prices: [{ label: 'Half', paise: 18000 }, { label: 'Full', paise: 32000 }], diet: 'nonveg', badges: [], kcal: null, serving: '', allergens: [] },
    });
    const [biryani] = sized.categories[0].items;
    const withPhoto = { ...sized, categories: [{ ...sized.categories[0], items: [{ ...biryani, photo: PHOTO }] }] };
    const promo = screenRestaurant(profile, special(biryani.id, withPhoto), clockOn(TODAY)).promos[0];
    expect(promo).toMatchObject({ headline: 'Chicken biryani', line: 'Dum cooked, with raita', price: 180, photo: `/api/photos/${PHOTO}` });
  });

  it('stops while sold out and plays again back in stock the same day', () => {
    const soldOut = edit(special(adrak.id), { type: 'set-sold-out', itemId: adrak.id, soldOut: true });
    const screen = screenRestaurant(profile, soldOut, clockOn(TODAY));
    expect(screen.promos).toEqual(plain.promos);
    expect(screen).not.toHaveProperty('specialId');
    const back = edit(soldOut, { type: 'set-sold-out', itemId: adrak.id, soldOut: false });
    expect(screenRestaurant(profile, back, clockOn(TODAY)).promos[0].id).toBe(`special-${adrak.id}`);
  });

  it('doesn’t play outside its category’s daypart, or after its day ends', () => {
    const morning = { from: 7 * 60, to: 11 * 60, days: [0, 1, 2, 3, 4, 5, 6] };
    const timed = edit(special(adrak.id), { type: 'update-category', categoryId: menu.categories[0].id, name: 'Chai and coffee', nameHi: '', daypart: morning });
    expect(screenRestaurant(profile, timed, clockOn(TODAY, 8 * 60)).specialId).toBe(adrak.id);
    expect(screenRestaurant(profile, timed, clockOn(TODAY, 15 * 60))).not.toHaveProperty('specialId');
    expect(screenRestaurant(profile, special(adrak.id), clockOn('2026-10-20'))).not.toHaveProperty('specialId');
  });
});
