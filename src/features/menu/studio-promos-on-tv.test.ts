/**
 * QA checks for MT-26 slice 2, promos from the studio on the TV, written from docs/prd/mt-26-promo-studio.md
 * ("Data it touches: the TV bundle", "Rules and edge cases", and "How we'll know it works" 2, 3, 5, 6, 7, 8, 9,
 * 10, 11, 12, 14 and 16). The TV side is the bundle (`screenRestaurant`) and the loop's wall clock (`liveSlides`).
 */
import { describe, expect, it } from 'vitest';
import { promoInputSchema, promoSchema, type Promo as StudioPromo } from '@/features/promos/schema';
import { countdownText } from '@/features/screen/countdown';
import { liveSlides, sideLoop } from '@/features/screen/loop';
import type { Restaurant } from '@/features/screen/types';
import { applyEdit } from './edit';
import { sampleMenu } from './sample';
import { menuEditSchema, type Menu, type MenuEdit } from './schema';
import { screenRestaurant } from './to-screen';

const NOW = new Date('2026-11-15T04:30:00.000Z');
const TODAY = '2026-11-15';
const TIME_ZONE = 'Asia/Kolkata';
/** The outlet's clock: `minute` past midnight on `day`, a Sunday unless told. */
const clockOn = (day: string, minute: number, weekday = 0) => ({ today: day, weekday, minute });
const TEN_AM = clockOn(TODAY, 10 * 60);
const profile = { name: 'Chai Point', tagline: 'Fresh chai all day' };
/** The instant of a time in the outlet (India is UTC+5:30, no daylight saving). */
const indiaMs = (local: string): number => Date.parse(`${local}:00+05:30`);

function ids() {
  let next = 0;
  return () => `id-${(next += 1)}`;
}

function edit(menu: Menu, value: MenuEdit): Menu {
  return applyEdit(menu, menuEditSchema.parse(value), { today: TODAY, now: NOW, newId: ids() });
}

/** The sample café: Masala chai ₹30, "Samosa, 2 pieces" ₹40, Mango lassi ₹90 (a bestseller). */
const menu = sampleMenu(NOW, ids());
const dishId = (current: Menu, name: string): string => current.categories.flatMap((category) => category.items).find((item) => item.name.startsWith(name))!.id;
const dish = (name: string) => ({ itemId: dishId(menu, name), size: '' });
const combo = { template: 'combo', dishes: [dish('Masala chai'), dish('Samosa')], dealPaise: 6000, headline: 'Chai and samosa' };

let made = 0;
function studio(input: object, extra: Partial<StudioPromo> = {}): StudioPromo {
  made += 1;
  return promoSchema.parse({ id: `promo-${made}`, ...promoInputSchema.parse(input), paused: false, createdAt: NOW.toISOString(), updatedAt: NOW.toISOString(), ...extra });
}

const onTv = (current: Menu, promos: readonly StudioPromo[], clock = TEN_AM): Restaurant => screenRestaurant(profile, current, clock, { promos, timeZone: TIME_ZONE });
const headlines = (restaurant: Restaurant): readonly string[] => restaurant.promos.map((promo) => promo.headline);

describe('MT-26 on the TV: prices', () => {
  it('shows the combo at its deal with the menu total struck through (How we’ll know 2)', () => {
    const promo = onTv(menu, [studio(combo)]).promos.find((candidate) => candidate.headline === 'Chai and samosa');
    expect(promo).toMatchObject({ price: 60, wasPrice: 70 });
  });

  it('follows a menu price change without touching the promo (How we’ll know 3)', () => {
    const dearer = edit(menu, { type: 'set-prices', itemId: dishId(menu, 'Masala chai'), prices: [{ label: '', paise: 3500 }] });
    expect(onTv(dearer, [studio(combo)]).promos.find((candidate) => candidate.headline === 'Chai and samosa')).toMatchObject({ price: 60, wasPrice: 75 });
  });

  it('stops a deal that is no longer lower than the menu', () => {
    const cheaper = edit(menu, { type: 'set-prices', itemId: dishId(menu, 'Samosa'), prices: [{ label: '', paise: 2000 }] });
    expect(headlines(onTv(cheaper, [studio(combo)]))).not.toContain('Chai and samosa');
  });
});

describe('MT-26 on the TV: what plays and when', () => {
  it('leaves the TV while a dish is sold out, and comes back when it’s in stock (How we’ll know 5)', () => {
    const samosa = dishId(menu, 'Samosa');
    const soldOut = edit(menu, { type: 'set-sold-out', itemId: samosa, soldOut: true });
    expect(headlines(onTv(soldOut, [studio(combo)]))).not.toContain('Chai and samosa');
    expect(headlines(onTv(edit(soldOut, { type: 'set-sold-out', itemId: samosa, soldOut: false }), [studio(combo)]))).toContain('Chai and samosa');
  });

  it('plays a happy hour only from its start, counts down, and leaves at its end by the TV’s own clock (How we’ll know 6 and 7)', () => {
    // Slice 1 asks a happy hour for its times and days as well as a start and end (reported: PRD line 6 sets only a start and end).
    const happy = studio({
      template: 'happy-hour', dishes: [dish('Masala chai')], dealPaise: 2000, headline: 'Chai hour',
      startsAt: '2026-11-15T10:02', endsAt: '2026-11-15T10:10', daypart: { from: 10 * 60, to: 11 * 60, days: [0, 1, 2, 3, 4, 5, 6] }, countdown: true,
    });
    expect(headlines(onTv(menu, [happy], TEN_AM))).not.toContain('Chai hour');

    const atStart = onTv(menu, [happy], clockOn(TODAY, 10 * 60 + 2));
    const promo = atStart.promos.find((candidate) => candidate.headline === 'Chai hour');
    expect(promo).toMatchObject({ price: 20, wasPrice: 30, countdown: true, endsAt: indiaMs('2026-11-15T10:10') });
    expect(countdownText(promo!, indiaMs('2026-11-15T10:05'))).toBe('Ends in 5 min');

    // The TV has no network after its last bundle: the wall clock alone takes the promo off at its end.
    const slides = sideLoop(atStart);
    const showing = (nowMs: number) => liveSlides(slides, nowMs).some((slide) => slide.kind === 'promo' && slide.promo.headline === 'Chai hour');
    expect(showing(indiaMs('2026-11-15T10:09'))).toBe(true);
    expect(showing(indiaMs('2026-11-15T10:10'))).toBe(false);
    expect(countdownText(promo!, indiaMs('2026-11-15T10:10'))).toBeNull();
  });

  it('a promo for tomorrow at 9 am plays from 9 with no edit, and is off past its end (How we’ll know 10)', () => {
    const tomorrow = studio({ template: 'new', dishes: [dish('Mango lassi')], headline: 'Try the lassi', startsAt: '2026-11-16T09:00', endsAt: '2026-11-16T21:00' });
    expect(headlines(onTv(menu, [tomorrow], TEN_AM))).not.toContain('Try the lassi');
    expect(headlines(onTv(menu, [tomorrow], clockOn('2026-11-16', 9 * 60, 1)))).toContain('Try the lassi');
    expect(headlines(onTv(menu, [tomorrow], clockOn('2026-11-16', 21 * 60, 1)))).not.toContain('Try the lassi');
  });

  it('a promo with no end never shows a countdown (How we’ll know 11)', () => {
    // The input refuses a countdown without an end; a stored one must still never reach the TV.
    const open = onTv(menu, [studio(combo, { countdown: true })]).promos.find((candidate) => candidate.headline === 'Chai and samosa');
    expect(open?.endsAt).toBeUndefined();
    expect(countdownText(open!, NOW.getTime())).toBeNull();
  });

  it('a paused or removed promo is off the TV (How we’ll know 12)', () => {
    expect(headlines(onTv(menu, [studio(combo, { paused: true })]))).not.toContain('Chai and samosa');
    expect(headlines(onTv(menu, []))).not.toContain('Chai and samosa');
  });
});

describe('MT-26 on the TV: order and the automatic slides', () => {
  it('promos made here replace the automatic slides while any is on air, and pausing them all brings those back (How we’ll know 14)', () => {
    const automatic = headlines(screenRestaurant(profile, menu, TEN_AM));
    expect(automatic.length).toBeGreaterThan(0);
    expect(headlines(onTv(menu, [studio(combo)]))).toEqual(['Chai and samosa']);
    expect(headlines(onTv(menu, [studio(combo, { paused: true })]))).toEqual(automatic);
  });

  it('today’s special stays first, then the promos in the order they were made', () => {
    const withSpecial = edit(menu, { type: 'set-special', itemId: dishId(menu, 'Mango lassi') });
    const first = studio(combo);
    const second = studio({ template: 'new', dishes: [dish('Vada pav')], headline: 'New vada pav' });
    expect(headlines(onTv(withSpecial, [first, second]))).toEqual(['Mango lassi', 'Chai and samosa', 'New vada pav']);
  });

  it('a Scan promo opens exactly the owner’s link (How we’ll know 9)', () => {
    const scan = studio({ template: 'scan', link: 'https://www.zomato.com/bangalore/chai-point?ref=tv', headline: 'Order on Zomato' });
    expect(onTv(menu, [scan]).promos.find((candidate) => candidate.headline === 'Order on Zomato')?.qrUrl).toBe('https://www.zomato.com/bangalore/chai-point?ref=tv');
  });

  it('a Festival promo plays only between its dates (How we’ll know 8)', () => {
    const diwali = studio({ template: 'festival', festival: 'diwali', headline: 'Happy Diwali', startsAt: '2026-11-08T00:00', endsAt: '2026-11-10T00:00' });
    expect(headlines(onTv(menu, [diwali], clockOn('2026-11-09', 10 * 60, 1)))).toContain('Happy Diwali');
    expect(headlines(onTv(menu, [diwali], TEN_AM))).not.toContain('Happy Diwali');
  });

  it('a headline typed in Hindi reaches the TV as typed (How we’ll know 16)', () => {
    expect(headlines(onTv(menu, [studio({ ...combo, headline: 'चाय और समोसा' })]))).toContain('चाय और समोसा');
  });
});
