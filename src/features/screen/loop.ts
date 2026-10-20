import type { LayoutId, LocalAd, MenuCategory, MenuItem, Promo, Restaurant } from './types';

/**
 * The screen loop. Pure functions only: the player passes in the wall-clock time, so every TV
 * in a shop shows the same slide at the same moment without talking to each other.
 * Timings follow docs/screen-design.md.
 */

export const MENU_SLIDE_MS = 18_000;
export const EXTRA_MENU_PAGE_MS = 12_000;
export const PROMO_SLIDE_MS = 7_000;
export const SPOTLIGHT_SLIDE_MS = 9_000;
/**
 * How long slides stay up on one screen (tracker MT-24): the owner picks two numbers and the rest follow,
 * so extra menu pages run two thirds as long as the first and a spotlight dish half as long.
 */
export interface LoopTiming {
  readonly menuSeconds: number;
  readonly promoSeconds: number;
}

export const DEFAULT_TIMING: LoopTiming = { menuSeconds: MENU_SLIDE_MS / 1000, promoSeconds: PROMO_SLIDE_MS / 1000 };
/** The choices an owner gets: shorter and guests can't read a page, longer and they stop looking. */
export const TIMING_CHOICES = { menuSeconds: [12, 15, 18, 24, 30, 45, 60], promoSeconds: [5, 7, 10, 12, 15] } as const;

const durations = ({ menuSeconds, promoSeconds }: LoopTiming) => ({
  firstPage: menuSeconds * 1000,
  extraPage: Math.round((menuSeconds * 2) / 3) * 1000,
  spotlight: Math.round(menuSeconds / 2) * 1000,
  promo: promoSeconds * 1000,
});

/** Local ads take at most one slot in this many. */
export const AD_SLOT_EVERY = 3;

export type Slide =
  | { readonly kind: 'menu'; readonly page: number; readonly pages: number; readonly durationMs: number }
  | { readonly kind: 'promo'; readonly promo: Promo; readonly durationMs: number }
  | { readonly kind: 'ad'; readonly ad: LocalAd; readonly durationMs: number }
  | { readonly kind: 'spotlight'; readonly item: MenuItem; readonly pairs: readonly MenuItem[]; readonly durationMs: number };

export interface SlideAt {
  readonly index: number;
  readonly slide: Slide;
  readonly elapsedMs: number;
  /** When this slide ends, in wall-clock milliseconds. */
  readonly endsAt: number;
}

/** How many standard rows a two-line (English and Hindi) item takes. */
export const BILINGUAL_ROW_WEIGHT = 1.7;
/** A category heading is taller than an item row: the title plus its gap. */
export const HEADING_ROWS = 1.7;
/** The most a row may grow when a page has room to spare. */
export const MAX_ROW_SPACING = 1.6;

/**
 * A layout's menu zone: how many columns, and how many standard rows (5.2% of the screen's short side)
 * fit in one column, measured from the real zone height with about a row to spare.
 */
export interface MenuFrame {
  readonly columns: number;
  readonly rows: number;
}

export const MENU_FRAMES: Readonly<Record<LayoutId, MenuFrame>> = {
  board: { columns: 3, rows: 14 },
  split: { columns: 2, rows: 14 },
  spotlight: { columns: 1, rows: 14 },
  lbar: { columns: 2, rows: 12 },
  ticker: { columns: 3, rows: 12 },
  portrait: { columns: 1, rows: 13.5 },
};

/** Each extra size (half and full) adds most of a row: sizes stack in the price slot so the name keeps its width. */
export const SIZE_ROW_WEIGHT = 0.8;

/** Standard rows one item takes: a two-line bilingual name, or stacked sizes, whichever is taller. */
export function itemRows(item: MenuItem, rowWeight = 1): number {
  const sizes = item.sizes?.length ?? 1;
  return Math.max(rowWeight, 1 + SIZE_ROW_WEIGHT * (sizes - 1));
}

const categorySize = (category: MenuCategory, rowWeight: number): number => category.items.reduce((rows, item) => rows + itemRows(item, rowWeight), 0) + HEADING_ROWS;

/** Columns needed if no column may hold more than `limit` rows, keeping categories whole and in order. */
function columnsNeeded(sizes: readonly number[], limit: number): number {
  let columns = 1;
  let used = 0;
  for (const size of sizes) {
    if (used > 0 && used + size > limit) {
      columns += 1;
      used = 0;
    }
    used += size;
  }
  return columns;
}

/**
 * Rows in the busiest column when whole categories flow, in order, into `columns` columns as evenly
 * as possible. This is the split CSS column balancing finds.
 */
export function busiestColumn(page: readonly MenuCategory[], columns: number, rowWeight = 1): number {
  const sizes = page.map((category) => categorySize(category, rowWeight));
  if (sizes.length === 0) return 0;
  const candidates = new Set<number>();
  for (let from = 0; from < sizes.length; from += 1) {
    let sum = 0;
    for (let to = from; to < sizes.length; to += 1) {
      sum += sizes[to];
      candidates.add(Math.round(sum * 100) / 100);
    }
  }
  const sorted = [...candidates].sort((a, b) => a - b);
  return sorted.find((limit) => limit >= Math.max(...sizes) && columnsNeeded(sizes, limit) <= Math.max(1, columns)) ?? sorted[sorted.length - 1];
}

function fillPages(categories: readonly MenuCategory[], frame: MenuFrame, rowWeight: number, rowLimit: number): MenuCategory[][] {
  const pages: MenuCategory[][] = [];
  let current: MenuCategory[] = [];
  for (const category of categories) {
    const next = [...current, category];
    if (current.length > 0 && busiestColumn(next, frame.columns, rowWeight) > rowLimit) {
      pages.push(current);
      current = [category];
    } else {
      current = next;
    }
  }
  if (current.length > 0) pages.push(current);
  return pages;
}

const LIMIT_STEP = 0.5;

/**
 * Splits categories into pages of whole categories so that no column on any page holds more rows
 * than the frame allows. Uses as few pages as possible, then evens them out so no page is nearly empty.
 */
export function paginateMenu(categories: readonly MenuCategory[], frame: MenuFrame, rowWeight = 1): readonly (readonly MenuCategory[])[] {
  let best = fillPages(categories, frame, rowWeight, frame.rows);
  if (best.length <= 1) return best.length > 0 ? best : [[]];
  for (let limit = frame.rows - LIMIT_STEP; limit >= LIMIT_STEP; limit -= LIMIT_STEP) {
    const tighter = fillPages(categories, frame, rowWeight, limit);
    if (tighter.length > best.length) break;
    best = tighter;
  }
  return best;
}

/**
 * How much taller each menu row should be on a page with room to spare. Text size never changes
 * (columns run out of width before height); rows spread out to fill the busiest column instead.
 */
export function menuRowSpacing(page: readonly MenuCategory[], frame: MenuFrame, rowWeight = 1): number {
  const busiest = busiestColumn(page, frame.columns, rowWeight);
  if (busiest <= 0) return 1;
  return Math.round(Math.min(MAX_ROW_SPACING, Math.max(1, frame.rows / busiest)) * 100) / 100;
}

/** Interleaves the owner's promos with approved local ads: promos first, ads at most one slot in three. */
export function sideSlides(promos: readonly Promo[], ads: readonly LocalAd[], timing: LoopTiming = DEFAULT_TIMING): readonly Slide[] {
  const slides: Slide[] = [];
  const { promo: durationMs } = durations(timing);
  let adIndex = 0;
  promos.forEach((promo, index) => {
    slides.push({ kind: 'promo', promo, durationMs });
    const isAdSlot = (index + 1) % (AD_SLOT_EVERY - 1) === 0;
    if (isAdSlot && adIndex < ads.length) {
      slides.push({ kind: 'ad', ad: ads[adIndex], durationMs });
      adIndex += 1;
    }
  });
  return slides;
}

function menuSlides(pages: number, timing: LoopTiming): readonly Slide[] {
  const { firstPage, extraPage } = durations(timing);
  return Array.from({ length: pages }, (_, page) => ({
    kind: 'menu' as const,
    page,
    pages,
    durationMs: page === 0 ? firstPage : extraPage,
  }));
}

/** Featured items for Spotlight: bestsellers and new items first, then everything else that isn't sold out. */
export function spotlightSlides(categories: readonly MenuCategory[], timing: LoopTiming = DEFAULT_TIMING): readonly Slide[] {
  const all = categories.flatMap((category) => category.items).filter((item) => !item.soldOut);
  const featured = all.filter((item) => item.badges?.some((badge) => badge === 'bestseller' || badge === 'new' || badge === 'chef'));
  const heroes = featured.length > 0 ? featured : all.slice(0, 3);
  return heroes.map((item) => {
    // Pairs that look different come first; dishes sharing a plate fill in when there aren't enough.
    const others = all.filter((other) => other.id !== item.id);
    const looksDifferent = (other: MenuItem) => Boolean(other.photo) || other.emoji !== item.emoji;
    const pairs = [...others.filter(looksDifferent), ...others.filter((other) => !looksDifferent(other))].slice(0, 3);
    return { kind: 'spotlight' as const, item, pairs, durationMs: durations(timing).spotlight };
  });
}

/**
 * The main zone's slides. Board and Ticker alternate menu pages with takeovers;
 * Spotlight cycles heroes; Split, L-bar and Portrait keep the menu still and rotate the side zone instead.
 */
export function mainSlides(layout: LayoutId, restaurant: Restaurant, rowWeight = 1, timing: LoopTiming = DEFAULT_TIMING): readonly Slide[] {
  if (layout === 'spotlight') {
    const heroes = spotlightSlides(restaurant.categories, timing);
    if (heroes.length > 0) return heroes;
  }
  const pages = paginateMenu(restaurant.categories, MENU_FRAMES[layout], rowWeight).length;
  const menu = menuSlides(pages, timing);
  if (layout === 'board') {
    const takeovers = sideSlides(restaurant.promos, restaurant.ads, timing);
    // One takeover after each full pass of the menu; with none, the menu alone.
    if (takeovers.length > 0) return takeovers.flatMap((takeover) => [...menu, takeover]);
  }
  return menu;
}

/**
 * The side zone's slides (Split, L-bar, Portrait). A restaurant with no promos and no featured dishes
 * still gets a welcome card with its name, so the zone is never empty.
 */
export function sideLoop(restaurant: Restaurant, timing: LoopTiming = DEFAULT_TIMING): readonly Slide[] {
  const slides = sideSlides(restaurant.promos, restaurant.ads, timing);
  if (slides.length > 0) return slides;
  const welcome: Promo = { id: 'welcome', kind: 'special', label: 'Welcome', headline: restaurant.name, line: restaurant.tagline, emoji: '🍽️' };
  return [{ kind: 'promo', promo: welcome, durationMs: durations(timing).promo }];
}

export function loopLength(slides: readonly Slide[]): number {
  return slides.reduce((total, slide) => total + slide.durationMs, 0);
}

/** Which slide is on screen at wall-clock time `nowMs`. Deterministic, so screens stay in sync. */
export function slideAt(slides: readonly Slide[], nowMs: number): SlideAt {
  if (slides.length === 0) throw new Error('A screen loop needs at least one slide.');
  const total = loopLength(slides);
  const position = ((Math.floor(nowMs) % total) + total) % total;
  let start = 0;
  for (let index = 0; index < slides.length; index += 1) {
    const slide = slides[index];
    if (position < start + slide.durationMs) {
      const elapsedMs = position - start;
      return { index, slide, elapsedMs, endsAt: Math.floor(nowMs) - elapsedMs + slide.durationMs };
    }
    start += slide.durationMs;
  }
  // Unreachable: position is always inside the loop.
  const last = slides.length - 1;
  return { index: last, slide: slides[last], elapsedMs: 0, endsAt: Math.floor(nowMs) + slides[last].durationMs };
}

/** A short name for what a slide shows, for heartbeats and the owner's screen status. */
export function slideLabel(slide: Slide): string {
  switch (slide.kind) {
    case 'menu':
      return `menu:${slide.page}`;
    case 'promo':
      return `promo:${slide.promo.id}`;
    case 'ad':
      return `ad:${slide.ad.id}`;
    case 'spotlight':
      return `spotlight:${slide.item.id}`;
  }
}

/** Formats rupees for a TV: no decimals for whole amounts, Indian digit grouping. */
export function formatRupees(amount: number): string {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: Number.isInteger(amount) ? 0 : 2 }).format(amount);
}
