import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { MenuCategory, MenuItem } from '../types';
import { MenuColumns } from './parts';

const dish = (name: string, extra: Partial<MenuItem> = {}): MenuItem => ({ id: name, name, price: 60, diet: 'veg', emoji: '🍽️', ...extra });
const halfFull = { sizes: [{ label: 'Half', price: 60 }, { label: 'Full', price: 110 }] } as const;

function labelOf(item: MenuItem, bilingual = false): string {
  const categories: MenuCategory[] = [{ id: 'c', name: 'Snacks', items: [item] }];
  const html = renderToStaticMarkup(createElement(MenuColumns, { categories, frame: { columns: 2, rows: 12 }, bilingual }));
  return /<span class="(scr-row-label[^"]*)"/.exec(html)?.[1] ?? '';
}

describe('dish names on the TV', () => {
  it('sets names over 24 characters in the narrow face, as DESIGN.md says', () => {
    expect(labelOf(dish('Cold coffee with vanilla ice cream'))).toContain('is-long');
    expect(labelOf(dish('Masala chai'))).not.toContain('is-long');
  });

  it('lets a dish with half and full prices use two lines, since its stacked prices already take two', () => {
    expect(labelOf(dish('Paneer tikka sandwich', halfFull))).toContain('is-wrap');
    expect(labelOf(dish('Paneer tikka sandwich'))).not.toContain('is-wrap');
  });

  it('keeps the name to one line when a badge or a Hindi line already uses the second', () => {
    expect(labelOf(dish('Paneer tikka sandwich', { ...halfFull, badges: ['bestseller'] }))).not.toContain('is-wrap');
    expect(labelOf(dish('Paneer tikka sandwich', { ...halfFull, nameHi: 'पनीर टिक्का सैंडविच' }), true)).not.toContain('is-wrap');
  });
});
