/**
 * QA checks for MT-26 slice 1 (promo data), written from docs/prd/mt-26-promo-studio.md: the template table in
 * "What it does", "Rules and edge cases", and "How we'll know it works" 3, 4, 5, 9, 10 and 11.
 */
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { applyEdit } from '@/features/menu/edit';
import { sampleMenu } from '@/features/menu/sample';
import { menuEditSchema, type Menu, type MenuEdit } from '@/features/menu/schema';
import { FilePromosRepository, PromoError } from './repository';
import { localTimeSchema, PROMO_LIMITS, promoInputSchema, promoSchema, type Promo } from './schema';
import { promoDishes, promoStatus, saveProblem } from './status';

const NOW = new Date('2026-11-15T04:30:00.000Z');
const TODAY = '2026-11-15';
/** The outlet's clock: `minute` past midnight on `today`, a Sunday unless told. */
const clockOn = (today: string, minute: number, weekday = 0) => ({ today, weekday, minute });
const TEN_AM = clockOn(TODAY, 10 * 60);
const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];

function ids() {
  let next = 0;
  return () => `id-${(next += 1)}`;
}

function edit(menu: Menu, value: MenuEdit): Menu {
  return applyEdit(menu, menuEditSchema.parse(value), { today: TODAY, now: NOW, newId: ids() });
}

/** The sample café: Masala chai ₹30, "Samosa, 2 pieces" ₹40, Mango lassi ₹90. */
const menu = sampleMenu(NOW, ids());
const dishId = (current: Menu, name: string): string => current.categories.flatMap((category) => category.items).find((item) => item.name.startsWith(name))!.id;
const dish = (name: string, current = menu) => ({ itemId: dishId(current, name), size: '' });
const comboInput = (dealPaise = 6000) => ({ template: 'combo', dishes: [dish('Masala chai'), dish('Samosa')], dealPaise, headline: 'Chai and samosa' });

const parse = (input: object) => promoInputSchema.safeParse(input);
function promo(input: object, extra: Partial<Promo> = {}): Promo {
  return promoSchema.parse({ id: 'promo-1', ...promoInputSchema.parse(input), paused: false, createdAt: NOW.toISOString(), updatedAt: NOW.toISOString(), ...extra });
}

describe('MT-26 templates: what the owner picks', () => {
  it('Combo takes 2 to 4 dishes', () => {
    const four = [dish('Masala chai'), dish('Samosa'), dish('Mango lassi'), dish('Vada pav')];
    expect(parse({ ...comboInput(), dishes: [dish('Masala chai')] }).success).toBe(false);
    expect(parse(comboInput()).success).toBe(true);
    expect(parse({ ...comboInput(), dishes: four, dealPaise: 100 }).success).toBe(true);
    expect(parse({ ...comboInput(), dishes: [...four, dish('Bun maska')] }).success).toBe(false);
  });

  it('Happy hour takes one dish, a deal and times', () => {
    const base = { template: 'happy-hour', dishes: [dish('Masala chai')], dealPaise: 2000, headline: 'Chai hour' };
    expect(parse({ ...base, daypart: { from: 16 * 60, to: 18 * 60, days: EVERY_DAY } }).success).toBe(true);
    expect(parse(base).success).toBe(false);
    expect(parse({ ...base, dishes: [dish('Masala chai'), dish('Samosa')], daypart: { from: 16 * 60, to: 18 * 60, days: EVERY_DAY } }).success).toBe(false);
  });

  it('New item takes one dish', () => {
    expect(parse({ template: 'new', dishes: [dish('Mango lassi')], headline: 'New: mango lassi' }).success).toBe(true);
    expect(parse({ template: 'new', dishes: [], headline: 'New' }).success).toBe(false);
    expect(parse({ template: 'new', dishes: [dish('Mango lassi'), dish('Samosa')], headline: 'New' }).success).toBe(false);
  });

  it('Festival takes a festival from the list and up to 2 dishes, or none', () => {
    const base = { template: 'festival', festival: 'diwali', headline: 'Happy Diwali' };
    expect(parse(base).success).toBe(true);
    expect(parse({ ...base, dishes: [dish('Samosa'), dish('Mango lassi')] }).success).toBe(true);
    expect(parse({ ...base, dishes: [dish('Samosa'), dish('Mango lassi'), dish('Masala chai')] }).success).toBe(false);
    expect(parse({ ...base, festival: 'not-a-festival' }).success).toBe(false);
    expect(parse({ ...base, festival: null }).success).toBe(false);
  });

  it('Scan takes only an https link of at most 300 characters (How we’ll know 9)', () => {
    const scan = (link: string) => parse({ template: 'scan', link, headline: 'Order on Zomato' }).success;
    expect(scan('https://zomato.com/x')).toBe(true);
    expect(scan('zomato.com/x')).toBe(false);
    expect(scan('hello')).toBe(false);
    expect(scan('http://zomato.com/x')).toBe(false);
    expect(scan(`https://zomato.com/${'x'.repeat(PROMO_LIMITS.link - 'https://zomato.com/'.length)}`)).toBe(true);
    expect(scan(`https://zomato.com/${'x'.repeat(PROMO_LIMITS.link - 'https://zomato.com/'.length + 1)}`)).toBe(false);
  });

  it('needs a headline of up to 30 characters, takes a line of up to 60, and keeps Hindi as typed', () => {
    expect(parse({ ...comboInput(), headline: '' }).success).toBe(false);
    expect(parse({ ...comboInput(), headline: 'x'.repeat(30) }).success).toBe(true);
    expect(parse({ ...comboInput(), headline: 'x'.repeat(31) }).success).toBe(false);
    expect(parse({ ...comboInput(), line: 'x'.repeat(60) }).success).toBe(true);
    expect(parse({ ...comboInput(), line: 'x'.repeat(61) }).success).toBe(false);
    const hindi = parse({ ...comboInput(), headline: 'चाय और समोसा', line: 'सिर्फ़ आज' });
    expect(hindi.success && [hindi.data.headline, hindi.data.line]).toEqual(['चाय और समोसा', 'सिर्फ़ आज']);
  });

  it('offers a countdown only on a promo with an end (How we’ll know 11)', () => {
    const noEnd = parse({ ...comboInput(), countdown: true });
    expect(!noEnd.success || noEnd.data.countdown === false).toBe(true);
    const withEnd = parse({ ...comboInput(), countdown: true, endsAt: '2026-11-15T20:00' });
    expect(withEnd.success && withEnd.data.countdown).toBe(true);
  });

  it('takes times as the outlet’s local date and minute, and refuses times that don’t exist', () => {
    expect(localTimeSchema.safeParse('2026-11-15T09:00').success).toBe(true);
    for (const bad of ['2026-11-15 09:00', '2026-11-15T25:00', '2026-02-30T09:00', '2026-11-15T09:00:00Z']) expect(localTimeSchema.safeParse(bad).success).toBe(false);
  });
});

describe('MT-26 prices come from the menu', () => {
  it('reads the menu total every time, so a menu price change reaches the struck-through price (How we’ll know 3)', () => {
    const combo = promo(comboInput(6000));
    expect(promoDishes(combo, menu)).toMatchObject({ ok: true, menuPaise: 7000 });
    const dearer = edit(menu, { type: 'set-prices', itemId: dishId(menu, 'Masala chai'), prices: [{ label: '', paise: 3500 }] });
    expect(promoDishes(combo, dearer)).toMatchObject({ ok: true, menuPaise: 7500 });
  });

  it('won’t save a combo or happy-hour price that isn’t lower than the menu, and says why (How we’ll know 4)', () => {
    expect(saveProblem(promoInputSchema.parse(comboInput(6900)), menu, TEN_AM)).toBeNull();
    expect(saveProblem(promoInputSchema.parse(comboInput(7000)), menu, TEN_AM)).toMatch(/\S/);
    expect(saveProblem(promoInputSchema.parse(comboInput(9000)), menu, TEN_AM)).toMatch(/\S/);
    const happy = { template: 'happy-hour', dishes: [dish('Masala chai')], dealPaise: 3000, headline: 'Chai hour', daypart: { from: 16 * 60, to: 18 * 60, days: EVERY_DAY } };
    expect(saveProblem(promoInputSchema.parse(happy), menu, TEN_AM)).toMatch(/\S/);
  });

  it('stops a saved deal and asks for a fix when the menu price drops to it or below', () => {
    const cheaper = edit(menu, { type: 'set-prices', itemId: dishId(menu, 'Samosa'), prices: [{ label: '', paise: 2000 }] });
    expect(promoStatus(promo(comboInput(6000)), cheaper, TEN_AM)).toMatchObject({ state: 'needs-fix', problem: { kind: 'deal-not-lower' } });
  });
});

describe('MT-26 rules and edge cases', () => {
  it('a sold-out dish takes its promos off the TV until it’s back (How we’ll know 5)', () => {
    const combo = promo(comboInput());
    const soldOut = edit(menu, { type: 'set-sold-out', itemId: dishId(menu, 'Samosa'), soldOut: true });
    expect(promoStatus(combo, menu, TEN_AM)).toEqual({ state: 'on-air' });
    expect(promoStatus(combo, soldOut, TEN_AM).state).toBe('sold-out');
    expect(promoStatus(combo, edit(soldOut, { type: 'set-sold-out', itemId: dishId(menu, 'Samosa'), soldOut: false }), TEN_AM)).toEqual({ state: 'on-air' });
  });

  it('a dish hidden or removed from the menu, or a size gone, puts its promos in Needs a fix', () => {
    const combo = promo(comboInput());
    const samosa = dishId(menu, 'Samosa');
    expect(promoStatus(combo, edit(menu, { type: 'set-hidden', itemId: samosa, hidden: true }), TEN_AM)).toMatchObject({ state: 'needs-fix', problem: { kind: 'dish-hidden' } });
    expect(promoStatus(combo, edit(menu, { type: 'remove-item', itemId: samosa }), TEN_AM)).toMatchObject({ state: 'needs-fix', problem: { kind: 'dish-gone' } });
    const sized = edit(menu, { type: 'set-prices', itemId: samosa, prices: [{ label: 'Half', paise: 2000 }, { label: 'Full', paise: 3500 }] });
    const half = promo({ ...comboInput(4000), dishes: [dish('Masala chai'), { itemId: samosa, size: 'Half' }] });
    expect(promoStatus(half, sized, TEN_AM)).toEqual({ state: 'on-air' });
    const fullOnly = edit(sized, { type: 'set-prices', itemId: samosa, prices: [{ label: 'Full', paise: 3500 }] });
    expect(promoStatus(half, fullOnly, TEN_AM)).toMatchObject({ state: 'needs-fix', problem: { kind: 'size-gone' } });
  });

  it('a promo for tomorrow at 9 am shows Starts, plays at 9 with no edit, and shows Ended past its end (How we’ll know 10)', () => {
    const later = promo({ template: 'new', dishes: [dish('Mango lassi')], headline: 'New', startsAt: '2026-11-16T09:00', endsAt: '2026-11-16T21:00' });
    expect(promoStatus(later, menu, TEN_AM)).toMatchObject({ state: 'starts', at: '2026-11-16T09:00' });
    expect(promoStatus(later, menu, clockOn('2026-11-16', 9 * 60, 1))).toEqual({ state: 'on-air' });
    expect(promoStatus(later, menu, clockOn('2026-11-16', 21 * 60, 1))).toEqual({ state: 'ended' });
  });

  it('times that end before they start run past midnight, as dayparts do', () => {
    const late = promo({ template: 'new', dishes: [dish('Mango lassi')], headline: 'Late', daypart: { from: 22 * 60, to: 2 * 60, days: EVERY_DAY } });
    expect(promoStatus(late, menu, clockOn(TODAY, 23 * 60)).state).toBe('on-air');
    expect(promoStatus(late, menu, clockOn('2026-11-16', 60, 1)).state).toBe('on-air');
    expect(promoStatus(late, menu, clockOn(TODAY, 12 * 60)).state).not.toBe('on-air');
  });

  it('a paused promo stays off until resumed', () => {
    expect(promoStatus(promo(comboInput(), { paused: true }), menu, TEN_AM)).toEqual({ state: 'paused' });
  });
});

describe('MT-26 limits per restaurant', () => {
  let directory: string;
  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'menutelly-promo-rules-'));
  });
  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  it('keeps up to 20 promos a restaurant, and each restaurant’s promos to itself', async () => {
    const repo = new FilePromosRepository(join(directory, 'promos.json'));
    const input = promoInputSchema.parse(comboInput());
    for (let i = 0; i < PROMO_LIMITS.perRestaurant; i += 1) await repo.create('restaurant-1', input, NOW);
    await expect(repo.create('restaurant-1', input, NOW)).rejects.toBeInstanceOf(PromoError);
    await expect(repo.create('restaurant-2', input, NOW)).resolves.toBeTruthy();
  });
});
