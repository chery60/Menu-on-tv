/**
 * MT-25's "How we'll know" line 3, end to end on the loop's clock: a special picked at a moment plays first in the
 * side zone of every Split, L-bar and Portrait TV within 10 seconds, not when the loop comes round.
 */
import { describe, expect, it } from 'vitest';
import { PROMO_SLIDE_MS, sideLoop, sideLoopStart, slideAt, slideLabel } from '@/features/screen/loop';
import { applyEdit } from './edit';
import { sampleMenu } from './sample';
import type { Menu, MenuEdit } from './schema';
import { screenRestaurant } from './to-screen';

const NOW = new Date('2026-11-15T04:30:00.000Z');
const TODAY = '2026-11-15';
const clock = { today: TODAY, weekday: 0, minute: 10 * 60 };
const profile = { name: 'Chai Point', tagline: 'Fresh chai all day' };

function ids() {
  let next = 0;
  return () => `id-${(next += 1)}`;
}

const edit = (menu: Menu, value: MenuEdit, at: Date): Menu => applyEdit(menu, value, { today: TODAY, now: at, newId: ids() });

describe('today’s special on the TV’s clock', () => {
  const menu = sampleMenu(NOW, ids());
  const dish = menu.categories[0].items[1];

  it('plays first in the side zone within 10 seconds of being picked, wherever in a slide the tap lands', () => {
    for (let offset = 0; offset < PROMO_SLIDE_MS; offset += 500) {
      const pickedAt = new Date(NOW.getTime() + offset);
      const restaurant = screenRestaurant(profile, edit(menu, { type: 'set-special', itemId: dish.id }, pickedAt), clock);
      expect(restaurant.specialSetAt).toBe(pickedAt.getTime());
      const start = sideLoopStart(restaurant);
      const on = slideAt(sideLoop(restaurant), start, start);
      expect(slideLabel(on.slide)).toBe(`promo:special-${dish.id}`);
      expect(start - pickedAt.getTime()).toBeLessThan(10_000);
    }
  });

  it('keeps the moment out of the bundle while the special doesn’t play', () => {
    const picked = edit(menu, { type: 'set-special', itemId: dish.id }, NOW);
    const soldOut = edit(picked, { type: 'set-sold-out', itemId: dish.id, soldOut: true }, NOW);
    expect(screenRestaurant(profile, soldOut, clock)).not.toHaveProperty('specialSetAt');
    expect(screenRestaurant(profile, menu, clock)).not.toHaveProperty('specialSetAt');
  });
});
