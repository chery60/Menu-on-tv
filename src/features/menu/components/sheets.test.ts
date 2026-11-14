import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { MenuResult } from '@/app/studio/menu/menu-result';
import { CategorySheet } from './category-sheet';
import { ItemSheet } from './item-sheet';
import { sheetFooter } from './sheet';

const ok = async (): Promise<MenuResult> => ({ ok: true, menu: null });
const noop = () => {};

/** The markup after the sheet's sticky footer opens, or '' when there is none. */
function footer(html: string): string {
  const start = html.indexOf(`<div class="${sheetFooter}">`);
  return start === -1 ? '' : html.slice(start);
}

describe('menu sheets on a phone', () => {
  it('keep "Add dish" in a footer that sticks to the bottom of the sheet', () => {
    const html = renderToStaticMarkup(
      createElement(ItemSheet, { mode: { kind: 'add', categoryId: 'c1' }, categories: [{ id: 'c1', name: 'Chai' }], onSave: ok, onUploadPhoto: ok, onRemovePhoto: ok, onClose: noop }),
    );
    expect(footer(html)).toContain('Add dish');
  });

  it('keep "Add category" in the same sticky footer', () => {
    const html = renderToStaticMarkup(createElement(CategorySheet, { category: null, onSave: ok, onClose: noop }));
    expect(footer(html)).toContain('Add category');
  });
});
