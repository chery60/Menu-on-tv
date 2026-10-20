import { HEADING_ROWS, itemRows, mainSlides, MENU_FRAMES, busiestColumn, paginateMenu, sideLoop, slideAt, type Slide } from '@/features/screen/loop';
import type { MenuCategory, Restaurant } from '@/features/screen/types';

/** What the plaza's TV shows at one moment: the Split layout's menu page in columns, and its side slide. */
export interface TvFrame {
  /** Changes only when what is on screen changes, so the TV is redrawn only then. */
  readonly key: string;
  readonly columns: readonly (readonly MenuCategory[])[];
  readonly side: Slide;
  readonly page: number;
  readonly pages: number;
}

const rowsOf = (category: MenuCategory): number => category.items.reduce((rows, item) => rows + itemRows(item), 0) + HEADING_ROWS;

/** Flows whole categories, in order, into columns no taller than the busiest one a real screen balances to. */
export function flowColumns(page: readonly MenuCategory[], columns: number): readonly (readonly MenuCategory[])[] {
  const limit = busiestColumn(page, columns);
  const out: MenuCategory[][] = [[]];
  let used = 0;
  for (const category of page) {
    const size = rowsOf(category);
    if (used > 0 && used + size > limit && out.length < columns) {
      out.push([]);
      used = 0;
    }
    out[out.length - 1].push(category);
    used += size;
  }
  return out;
}

/** The same loop a real Split screen runs, read at wall-clock time `nowMs`, so the plaza TV and /screen/demo agree. */
export function tvFrame(restaurant: Restaurant, nowMs: number): TvFrame {
  const frame = MENU_FRAMES.split;
  const pages = paginateMenu(restaurant.categories, frame);
  const main = slideAt(mainSlides('split', restaurant), nowMs);
  const side = slideAt(sideLoop(restaurant), nowMs);
  const page = main.slide.kind === 'menu' ? Math.min(main.slide.page, pages.length - 1) : 0;
  return { key: `${page}:${side.index}`, columns: flowColumns(pages[page], frame.columns), side: side.slide, page, pages: pages.length };
}
