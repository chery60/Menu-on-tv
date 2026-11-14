// @vitest-environment jsdom
/**
 * QA checks for MT-26 slice 4, the countdown on the TV, written from docs/prd/mt-26-promo-studio.md ("Countdown",
 * "Rules and edge cases": "A countdown appears only on a promo with an end, and reaches zero as the promo leaves",
 * How we'll know 6, 7 and 11), its Design section ("a mono "Ends in 40 min" under the price, counting each minute,
 * never seconds"; on origin/hq/mt26-s3, ddf970c) and screen-design.md ("No fake timers").
 *
 * The countdown runs on the TV's clock, so these render the card and the stage in a browser-like DOM with a fake clock.
 */
import { act, cleanup, render } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { applyEdit } from '@/features/menu/edit';
import { sampleMenu } from '@/features/menu/sample';
import { menuEditSchema, type Menu } from '@/features/menu/schema';
import { screenRestaurant } from '@/features/menu/to-screen';
import { promoInputSchema, promoSchema, type Promo as StudioPromo } from '@/features/promos/schema';
import type { Promo, Restaurant } from '../types';
import { PromoCard } from './parts';
import { ScreenStage } from './screen-stage';

const NOW = new Date('2026-11-15T10:30:00.000Z');
const TODAY = '2026-11-15';
const TIME_ZONE = 'Asia/Kolkata';
const FOUR_PM = { today: TODAY, weekday: 0, minute: 16 * 60 };
const profile = { name: 'Chai Point', tagline: 'Fresh chai all day' };
const MINUTE = 60_000;
/** The instant of a time in the outlet (India is UTC+5:30, no daylight saving). */
const indiaMs = (local: string): number => Date.parse(`${local}:00+05:30`);

function ids() {
  let next = 0;
  return () => `id-${(next += 1)}`;
}

const base = sampleMenu(NOW, ids());
const dishId = (menu: Menu, name: string): string => menu.categories.flatMap((category) => category.items).find((item) => item.name.startsWith(name))!.id;
const menu = applyEdit(base, menuEditSchema.parse({ type: 'set-prices', itemId: dishId(base, 'Samosa'), prices: [{ label: '', paise: 2000 }] }), { today: TODAY, now: NOW, newId: ids() });
const dish = (name: string) => ({ itemId: dishId(menu, name), size: '' });

let made = 0;
function studio(input: object): StudioPromo {
  made += 1;
  return promoSchema.parse({ id: `cd-${made}`, ...promoInputSchema.parse(input), paused: false, createdAt: NOW.toISOString(), updatedAt: NOW.toISOString() });
}

const combo = (extra: object = {}) => ({ template: 'combo', dishes: [dish('Samosa'), dish('Masala chai')], dealPaise: 4500, headline: 'Chai and samosa', ...extra });
const bundle = (input: object): Restaurant => screenRestaurant(profile, menu, FOUR_PM, { promos: [studio(input)], timeZone: TIME_ZONE });
function onTv(input: object): Promo {
  const promo = bundle(input).promos.find((candidate) => candidate.headline === 'Chai and samosa');
  if (!promo) throw new Error('The combo is not on the TV at 4 pm.');
  return promo;
}

/** Moves the TV's clock on, running its timers and React's updates. */
const wait = async (ms: number): Promise<void> => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
};
const countdown = (container: HTMLElement): string | null => container.querySelector('.scr-countdown')?.textContent ?? null;

async function showCard(promo: Promo, at: string) {
  vi.setSystemTime(indiaMs(at));
  const view = render(createElement(PromoCard, { promo, variant: 'side' }));
  await wait(1);
  return view.container;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('MT-26 slice 4: the countdown, on a promo with an end', () => {
  const ending = onTv(combo({ endsAt: '2026-11-15T16:40', countdown: true }));

  it('shows "Ends in 40 min" in a box under the price, 40 minutes before the end (Design)', async () => {
    const container = await showCard(ending, '2026-11-15T16:00');
    expect(countdown(container)).toBe('Ends in 40 min');
    const price = container.querySelector('.scr-promo-price')!;
    const box = container.querySelector('.scr-countdown')!;
    expect(price.compareDocumentPosition(box) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('counts down each minute, never in seconds, and never says 0 while the promo is on', async () => {
    const container = await showCard(ending, '2026-11-15T16:00');
    const seen: string[] = [];
    for (let step = 0; step < 160; step += 1) {
      const shown = countdown(container);
      expect(shown).toMatch(/^Ends in [1-9]\d* min$/);
      if (seen.at(-1) !== shown) seen.push(shown!);
      await wait(15_000);
    }
    expect(seen).toEqual(Array.from({ length: 40 }, (_, index) => `Ends in ${40 - index} min`));
  });

  it('is gone at the end (How we’ll know 6)', async () => {
    const container = await showCard(ending, '2026-11-15T16:39');
    expect(countdown(container)).toBe('Ends in 1 min');
    await wait(MINUTE);
    expect(countdown(container)).toBeNull();
  });

  it('shows only in the last three hours (PRD starting value)', async () => {
    const later = onTv(combo({ endsAt: '2026-11-15T19:01', countdown: true }));
    const container = await showCard(later, '2026-11-15T16:00');
    expect(countdown(container)).toBeNull();
    await wait(2 * MINUTE);
    expect(countdown(container)).toMatch(/^Ends in /);
    expect(countdown(container)).not.toMatch(/sec|\d+ ?s\b/);
  });

  it('shows none when the owner left the countdown off', async () => {
    const quiet = onTv(combo({ endsAt: '2026-11-15T16:40', countdown: false }));
    const container = await showCard(quiet, '2026-11-15T16:30');
    expect(countdown(container)).toBeNull();
  });
});

describe('MT-26 slice 4: no countdown without an end (How we’ll know 11)', () => {
  it('never shows one on a promo that never ends, however long it plays', async () => {
    const forever = onTv(combo());
    expect(forever.endsAt).toBeUndefined();
    const container = await showCard(forever, '2026-11-15T16:00');
    for (let hour = 0; hour < 6; hour += 1) {
      expect(countdown(container)).toBeNull();
      await wait(60 * MINUTE);
    }
  });

  it('shows none on a slide marked for a countdown that carries no end', async () => {
    const container = await showCard({ ...onTv(combo()), countdown: true }, '2026-11-15T16:00');
    expect(countdown(container)).toBeNull();
    await wait(3 * 60 * MINUTE);
    expect(countdown(container)).toBeNull();
  });
});

describe('MT-26 slice 4: the countdown reaches zero as the promo leaves the TV', () => {
  const restaurant = bundle(combo({ endsAt: '2026-11-15T16:40', countdown: true }));

  async function showStage(at: string, clockOffsetMs = 0) {
    vi.setSystemTime(indiaMs(at));
    const view = render(createElement(ScreenStage, { restaurant, layout: 'split', theme: 'paper', clockOffsetMs }));
    await wait(1);
    return view.container;
  }

  it('on Split, says "Ends in 1 min" in the last minute, then the promo and its countdown leave together', async () => {
    const container = await showStage('2026-11-15T16:39');
    expect(container.querySelector('.scr-zone-side')?.textContent).toContain('Chai and samosa');
    expect(countdown(container)).toBe('Ends in 1 min');
    await wait(MINUTE + 100);
    expect(container.querySelector('.scr-zone-side')?.textContent).not.toContain('Chai and samosa');
    expect(countdown(container)).toBeNull();
  });

  // The loop drops a promo by the TV's clock corrected from the heartbeat (clockOffsetMs); the countdown reads the
  // TV's own clock. A TV running 10 minutes fast keeps the promo up 15 more minutes but says "Ends in 5 min".
  it.fails('counts down to the moment the loop drops the promo on a TV whose clock is off', async () => {
    const container = await showStage('2026-11-15T16:35', -10 * MINUTE);
    expect(container.querySelector('.scr-zone-side')?.textContent).toContain('Chai and samosa');
    expect(countdown(container)).toBe('Ends in 15 min');
  });
});
