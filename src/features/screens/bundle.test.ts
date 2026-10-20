import { describe, expect, it } from 'vitest';
import { DEMO_RESTAURANT } from '@/content/demo-restaurant';
import { buildBundle, bundleEtag, isFresh } from './bundle';
import type { Screen } from './schema';

const screen: Screen = {
  id: 's1',
  restaurantId: 'r1',
  name: 'Counter TV',
  layout: 'split',
  theme: 'night',
  bilingual: false,
  links: [],
  createdAt: '2026-10-18T00:00:00.000Z',
  updatedAt: '2026-10-18T00:00:00.000Z',
};

describe('bundle versions', () => {
  it('stay the same for the same content, so TVs don’t refetch', () => {
    expect(buildBundle(screen, DEMO_RESTAURANT, {}).version).toBe(buildBundle(screen, DEMO_RESTAURANT, {}).version);
  });

  it('change when the menu, the layout or a QR code changes', () => {
    const base = buildBundle(screen, DEMO_RESTAURANT, {}).version;
    const [first, ...rest] = DEMO_RESTAURANT.categories;
    const soldOut = { ...DEMO_RESTAURANT, categories: [{ ...first, items: first.items.map((item, index) => (index === 0 ? { ...item, soldOut: true } : item)) }, ...rest] };
    expect(buildBundle(screen, soldOut, {}).version).not.toBe(base);
    expect(buildBundle({ ...screen, layout: 'board' }, DEMO_RESTAURANT, {}).version).not.toBe(base);
    expect(buildBundle(screen, DEMO_RESTAURANT, { scan: '<svg/>' }).version).not.toBe(base);
  });

  it('ignore when the screen was last saved', () => {
    expect(buildBundle({ ...screen, updatedAt: 'later' }, DEMO_RESTAURANT, {}).version).toBe(buildBundle(screen, DEMO_RESTAURANT, {}).version);
  });
});

describe('slide timing in the bundle', () => {
  it('tells the TV the playbook’s timing when the screen has none, and its own when it does', () => {
    expect(buildBundle(screen, DEMO_RESTAURANT, {}).timing).toEqual({ menuSeconds: 18, promoSeconds: 7 });
    const slower = buildBundle({ ...screen, timing: { menuSeconds: 30, promoSeconds: 10 } }, DEMO_RESTAURANT, {});
    expect(slower.timing).toEqual({ menuSeconds: 30, promoSeconds: 10 });
    expect(slower.version).not.toBe(buildBundle(screen, DEMO_RESTAURANT, {}).version);
  });
});

describe('ETags', () => {
  it('match the TV’s If-None-Match, weak or strong, in a list', () => {
    expect(bundleEtag('abc')).toBe('"abc"');
    expect(isFresh('"abc"', 'abc')).toBe(true);
    expect(isFresh('W/"abc"', 'abc')).toBe(true);
    expect(isFresh('"xyz", "abc"', 'abc')).toBe(true);
    expect(isFresh('"xyz"', 'abc')).toBe(false);
    expect(isFresh(null, 'abc')).toBe(false);
  });
});
