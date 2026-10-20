import { describe, expect, it } from 'vitest';
import { DEMO_RESTAURANT } from '@/content/demo-restaurant';
import {
  DEFAULT_TIMING,
  BILINGUAL_ROW_WEIGHT,
  busiestColumn,
  formatRupees,
  HEADING_ROWS,
  itemRows,
  loopLength,
  mainSlides,
  MAX_ROW_SPACING,
  MENU_FRAMES,
  MENU_SLIDE_MS,
  menuRowSpacing,
  type MenuFrame,
  paginateMenu,
  PROMO_SLIDE_MS,
  sideLoop,
  sideSlides,
  slideAt,
  slideLabel,
  spotlightSlides,
  type Slide,
} from './loop';
import { LAYOUT_IDS, type MenuCategory } from './types';

const category = (id: string, count: number): MenuCategory => ({
  id,
  name: id,
  items: Array.from({ length: count }, (_, index) => ({ id: `${id}-${index}`, name: `${id} ${index}`, price: 10, diet: 'veg' as const, emoji: '☕' })),
});

const frame = (columns: number, rows: number): MenuFrame => ({ columns, rows });
const rowsOf = (page: readonly MenuCategory[], weight = 1): number => page.reduce((sum, c) => sum + c.items.length * weight + HEADING_ROWS, 0);

describe('busiestColumn', () => {
  it('finds the even split CSS columns make, keeping categories whole', () => {
    // Sizes 4.7, 5.7 and 4.7 rows: the best two-column split is 4.7 | 10.4.
    expect(busiestColumn([category('a', 3), category('b', 4), category('c', 3)], 2)).toBeCloseTo(10.4);
    // Three columns hold one category each.
    expect(busiestColumn([category('a', 3), category('b', 4), category('c', 3)], 3)).toBeCloseTo(5.7);
  });

  it('is zero for an empty page', () => {
    expect(busiestColumn([], 2)).toBe(0);
  });
});

describe('paginateMenu', () => {
  it('keeps whole categories together and starts a new page when a column would overflow', () => {
    const pages = paginateMenu([category('a', 5), category('b', 5), category('c', 1)], frame(1, 10));
    expect(pages.map((page) => page.map((c) => c.id))).toEqual([['a'], ['b', 'c']]);
  });

  it('fits the whole demo menu on one page of the full board', () => {
    expect(paginateMenu(DEMO_RESTAURANT.categories, MENU_FRAMES.board)).toHaveLength(1);
  });

  it('never lets a column on any page hold more rows than its layout allows', () => {
    for (const layout of LAYOUT_IDS) {
      for (const weight of [1, BILINGUAL_ROW_WEIGHT]) {
        for (const page of paginateMenu(DEMO_RESTAURANT.categories, MENU_FRAMES[layout], weight)) {
          expect(busiestColumn(page, MENU_FRAMES[layout].columns, weight) <= MENU_FRAMES[layout].rows || page.length === 1, `${layout} ×${weight}`).toBe(true);
        }
      }
    }
  });

  it('evens out pages so the last one isn’t nearly empty', () => {
    const pages = paginateMenu([category('a', 4), category('b', 4), category('c', 4), category('d', 2)], frame(1, 12));
    // Two even pages rather than one packed page and a lone small category.
    expect(pages.map((page) => page.map((c) => c.id))).toEqual([['a', 'b'], ['c', 'd']]);
    expect(Math.min(...pages.map((page) => rowsOf(page)))).toBeGreaterThan(8);
  });

  it('gives two-line bilingual items more room', () => {
    const mono = paginateMenu(DEMO_RESTAURANT.categories, MENU_FRAMES.split);
    const bilingual = paginateMenu(DEMO_RESTAURANT.categories, MENU_FRAMES.split, BILINGUAL_ROW_WEIGHT);
    expect(bilingual.length).toBeGreaterThan(mono.length);
  });

  it('never returns zero pages, even for an empty menu', () => {
    expect(paginateMenu([], frame(2, 12))).toEqual([[]]);
  });

  it('lets a single oversized category have a page of its own', () => {
    expect(paginateMenu([category('big', 30)], frame(1, 10))).toHaveLength(1);
  });
});

describe('menuRowSpacing', () => {
  it('spreads rows out on roomy pages, up to a limit', () => {
    expect(menuRowSpacing([category('a', 3)], frame(1, 14))).toBe(MAX_ROW_SPACING);
    expect(menuRowSpacing([category('a', 6), category('b', 6)], frame(2, 12))).toBeGreaterThan(1);
  });

  it('sizes spacing for the busiest column, since whole categories can’t split', () => {
    // Busiest column 10.4 rows in a 12-row frame.
    expect(menuRowSpacing([category('a', 3), category('b', 4), category('c', 3)], frame(2, 12))).toBe(1.15);
  });

  it('never packs rows tighter than the standard height', () => {
    expect(menuRowSpacing([category('a', 30)], frame(1, 12))).toBe(1);
    expect(menuRowSpacing([], frame(2, 12))).toBe(1);
  });
});

describe('sideSlides', () => {
  it('shows the owner’s promos first and gives local ads at most one slot in three', () => {
    const slides = sideSlides(DEMO_RESTAURANT.promos, DEMO_RESTAURANT.ads);
    const kinds = slides.map((slide) => slide.kind);
    expect(kinds[0]).toBe('promo');
    expect(kinds.filter((kind) => kind === 'ad').length).toBeLessThanOrEqual(Math.floor(kinds.length / 3));
    expect(kinds).toEqual(['promo', 'promo', 'ad', 'promo', 'promo', 'ad', 'promo', 'promo']);
  });

  it('plays promos alone when no ads are approved', () => {
    expect(sideSlides(DEMO_RESTAURANT.promos, []).every((slide) => slide.kind === 'promo')).toBe(true);
  });
});

describe('mainSlides', () => {
  it('builds a playable loop for every layout', () => {
    for (const layout of LAYOUT_IDS) {
      expect(mainSlides(layout, DEMO_RESTAURANT).length, layout).toBeGreaterThan(0);
    }
  });

  it('follows each full board pass with one promo or ad takeover', () => {
    const slides = mainSlides('board', DEMO_RESTAURANT);
    expect(slides[0]).toMatchObject({ kind: 'menu', durationMs: MENU_SLIDE_MS });
    expect(slides[1].kind).toBe('promo');
    expect(slides.filter((slide) => slide.kind === 'menu')).toHaveLength(slides.length / 2);
  });

  it('plays the playbook’s timing unless the screen sets its own', () => {
    expect(DEFAULT_TIMING).toEqual({ menuSeconds: 18, promoSeconds: 7 });
    const calm = { menuSeconds: 30, promoSeconds: 10 };
    const pages = mainSlides('ticker', DEMO_RESTAURANT, BILINGUAL_ROW_WEIGHT, calm);
    expect(pages.map((slide) => slide.durationMs)).toEqual([30_000, ...Array(pages.length - 1).fill(20_000)]);
    expect(sideLoop(DEMO_RESTAURANT, calm).every((slide) => slide.durationMs === 10_000)).toBe(true);
    expect(mainSlides('spotlight', DEMO_RESTAURANT, 1, calm)[0].durationMs).toBe(15_000);
    expect(mainSlides('ticker', DEMO_RESTAURANT, BILINGUAL_ROW_WEIGHT)[1].durationMs).toBe(12_000);
  });

  it('keeps the ticker layout calm: menu pages only', () => {
    expect(mainSlides('ticker', DEMO_RESTAURANT).every((slide) => slide.kind === 'menu')).toBe(true);
  });

  it('spotlights featured items that are in stock, never the sold-out ones', () => {
    const slides = spotlightSlides(DEMO_RESTAURANT.categories);
    const items = slides.map((slide) => (slide.kind === 'spotlight' ? slide.item : null));
    expect(items.every((item) => item && !item.soldOut && item.badges?.length)).toBe(true);
    expect(slides.every((slide) => slide.kind === 'spotlight' && slide.pairs.length === 3)).toBe(true);
  });

  it('falls back to the first items when nothing is featured', () => {
    expect(spotlightSlides([category('plain', 5)])).toHaveLength(3);
  });
});

describe('slideAt', () => {
  const slides: readonly Slide[] = [
    { kind: 'menu', page: 0, pages: 1, durationMs: 1000 },
    { kind: 'promo', promo: DEMO_RESTAURANT.promos[0], durationMs: 500 },
  ];

  it('finds the slide for a wall-clock time and when it ends', () => {
    expect(slideAt(slides, 0)).toMatchObject({ index: 0, elapsedMs: 0, endsAt: 1000 });
    expect(slideAt(slides, 1200)).toMatchObject({ index: 1, elapsedMs: 200, endsAt: 1500 });
    expect(slideAt(slides, 1500)).toMatchObject({ index: 0, elapsedMs: 0, endsAt: 2500 });
  });

  it('gives two screens the same slide at the same moment', () => {
    const now = 1_760_000_000_123;
    expect(slideAt(slides, now)).toEqual(slideAt(slides, now));
  });

  it('handles times before 1970 without a negative position', () => {
    expect(slideAt(slides, -100).index).toBe(1);
  });

  it('refuses an empty loop', () => {
    expect(() => slideAt([], 0)).toThrow(/at least one slide/);
  });

  it('adds up the loop length', () => {
    expect(loopLength(slides)).toBe(1500);
    expect(loopLength(sideSlides(DEMO_RESTAURANT.promos, DEMO_RESTAURANT.ads))).toBe(8 * PROMO_SLIDE_MS);
  });
});

describe('slideLabel', () => {
  it('names each kind of slide for the heartbeat', () => {
    const [menu, promo] = mainSlides('board', DEMO_RESTAURANT);
    expect(slideLabel(menu)).toBe('menu:0');
    expect(slideLabel(promo)).toBe('promo:combo');
    expect(slideLabel(spotlightSlides(DEMO_RESTAURANT.categories)[0])).toBe('spotlight:masala-chai');
    expect(slideLabel(sideSlides(DEMO_RESTAURANT.promos, DEMO_RESTAURANT.ads)[2])).toBe('ad:gym');
  });
});

describe('formatRupees', () => {
  it('uses Indian grouping and drops decimals for whole rupees', () => {
    expect(formatRupees(120)).toBe('120');
    expect(formatRupees(125000)).toBe('1,25,000');
    expect(formatRupees(49.5)).toBe('49.5');
  });
});

describe('a restaurant with nothing to promote yet', () => {
  const bare = { name: 'Chai Point', tagline: 'Fresh chai all day', categories: [category('chai', 3)], promos: [], ads: [], ticker: [] };

  it('plays the menu alone on the full board', () => {
    expect(mainSlides('board', bare).every((slide) => slide.kind === 'menu')).toBe(true);
  });

  it('shows a welcome card in the side zone instead of nothing', () => {
    const [welcome] = sideLoop(bare);
    expect(welcome).toMatchObject({ kind: 'promo', promo: { headline: 'Chai Point', line: 'Fresh chai all day' } });
    expect(sideLoop(DEMO_RESTAURANT)).toEqual(sideSlides(DEMO_RESTAURANT.promos, DEMO_RESTAURANT.ads));
  });

  it('falls back to the menu on Spotlight when every dish is sold out', () => {
    const soldOut = { ...bare, categories: [{ ...bare.categories[0], items: bare.categories[0].items.map((item) => ({ ...item, soldOut: true })) }] };
    expect(mainSlides('spotlight', soldOut)[0].kind).toBe('menu');
  });

  it('still finds spotlight pairs when every dish shares a plate', () => {
    const [first] = spotlightSlides(bare.categories);
    expect(first.kind === 'spotlight' ? first.pairs.length : 0).toBe(2);
  });
});

describe('items with sizes', () => {
  it('take more room on a page, so stacked half and full prices never overflow', () => {
    const plain = { id: 'a', name: 'Chai', price: 20, diet: 'veg' as const, emoji: '☕' };
    const sized = { ...plain, id: 'b', sizes: [{ label: 'Half', price: 70 }, { label: 'Full', price: 120 }] };
    expect(itemRows(plain)).toBe(1);
    expect(itemRows(sized)).toBeCloseTo(1.8);
    expect(itemRows(sized, BILINGUAL_ROW_WEIGHT)).toBeCloseTo(1.8);
    expect(itemRows(plain, BILINGUAL_ROW_WEIGHT)).toBe(BILINGUAL_ROW_WEIGHT);
    const page = [{ id: 'c', name: 'Rolls', items: [sized, sized] }];
    expect(busiestColumn(page, 1)).toBeCloseTo(2 * 1.8 + HEADING_ROWS);
  });
});
