import { describe, expect, it } from 'vitest';
import { DEMO_RESTAURANT } from '@/content/demo-restaurant';
import { mainSlides, MENU_FRAMES, paginateMenu, sideLoop, slideAt } from '@/features/screen/loop';
import { flowColumns, tvFrame } from './tv-frame';

describe('flowColumns', () => {
  it('keeps every category, whole and in order, in at most the columns asked for', () => {
    // Arrange
    const page = paginateMenu(DEMO_RESTAURANT.categories, MENU_FRAMES.split)[0];

    // Act
    const columns = flowColumns(page, 2);

    // Assert
    expect(columns.length).toBeLessThanOrEqual(2);
    expect(columns.flat().map((category) => category.id)).toEqual(page.map((category) => category.id));
  });

  it('gives an empty page one empty column', () => {
    expect(flowColumns([], 2)).toEqual([[]]);
  });
});

describe('tvFrame', () => {
  it('shows the menu page and the side slide a real Split screen shows at that moment', () => {
    const now = 1_700_000_000_000;
    const frame = tvFrame(DEMO_RESTAURANT, now);
    const main = slideAt(mainSlides('split', DEMO_RESTAURANT), now);
    const pages = paginateMenu(DEMO_RESTAURANT.categories, MENU_FRAMES.split);

    expect(frame.side).toEqual(slideAt(sideLoop(DEMO_RESTAURANT), now).slide);
    expect(frame.columns.flat()).toEqual(main.slide.kind === 'menu' ? pages[main.slide.page] : pages[0]);
  });

  it('changes its key when the side slide moves on, and keeps it while nothing changes', () => {
    const now = 1_700_000_000_000;
    const side = slideAt(sideLoop(DEMO_RESTAURANT), now);

    expect(tvFrame(DEMO_RESTAURANT, now + 1).key).toBe(tvFrame(DEMO_RESTAURANT, now).key);
    expect(tvFrame(DEMO_RESTAURANT, side.endsAt + 1).key).not.toBe(tvFrame(DEMO_RESTAURANT, now).key);
  });
});
