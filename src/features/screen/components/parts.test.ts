import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { MenuCategory, MenuItem, Promo } from '../types';
import { MenuColumns, PromoCard } from './parts';

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

describe('Hindi on promo slides (MT-28)', () => {
  const special: Promo = { id: 's', kind: 'special', label: 'Today’s special', headline: 'Mango lassi', headlineHi: 'आम लस्सी', line: 'Coolers', price: 90, emoji: '🥭' };
  const render = (bilingual: boolean) => renderToStaticMarkup(createElement(PromoCard, { promo: special, variant: 'side', bilingual }));

  it('shows the Hindi name under the headline when both names are on', () => {
    const html = render(true);
    expect(html).toContain('<p class="scr-promo-hi" lang="hi">आम लस्सी</p>');
    expect(html).toContain('has-hi');
  });

  it('keeps an English-only screen in English', () => {
    expect(render(false)).not.toContain('आम लस्सी');
  });
});

describe('promo slides on the TV (MT-26)', () => {
  const promo = (extra: Partial<Promo>): Promo => ({ id: 'p', kind: 'combo', label: 'Combo', headline: 'Chai + samosa', line: 'The 4 pm classic', price: 59, wasPrice: 70, emoji: '🥟', ...extra });
  const card = (item: Promo, qrSvg?: string) => renderToStaticMarkup(createElement(PromoCard, { promo: item, qrSvg, variant: 'side' }));

  it('says a featured dish’s category once, not as a label and again as its line', () => {
    const html = card(promo({ kind: 'special', label: 'Chai & Coffee', line: 'Chai & Coffee', wasPrice: undefined }));
    expect(html.match(/Chai &amp; Coffee/g)).toHaveLength(1);
    expect(html).not.toContain('scr-promo-label');
  });

  it('keeps a real label, and the struck-through menu price on a deal', () => {
    const html = card(promo({}));
    expect(html).toContain('scr-promo-label');
    expect(html).toContain('was ₹70');
  });

  it('tells guests how to use the QR', () => {
    expect(card(promo({ kind: 'scan', label: 'Scan me', qrUrl: 'https://example.com' }), '<svg></svg>')).toContain('Scan with your phone camera');
  });

  it('keeps the Hindi name under the headline on every look, with its label rule and QR hint', () => {
    const kinds: Promo['kind'][] = ['combo', 'happy-hour', 'new', 'special', 'festival', 'scan'];
    for (const kind of kinds) {
      const html = renderToStaticMarkup(createElement(PromoCard, { promo: promo({ kind, headlineHi: 'चाय समोसा' }), qrSvg: kind === 'scan' ? '<svg></svg>' : undefined, variant: 'side', bilingual: true }));
      expect(html).toContain(`scr-kind-${kind}`);
      expect(html).toContain('<p class="scr-promo-hi" lang="hi">चाय समोसा</p>');
      if (kind === 'scan') expect(html).toContain('Scan with your phone camera');
    }
    const repeated = renderToStaticMarkup(createElement(PromoCard, { promo: promo({ kind: 'special', label: 'Snacks', line: 'Snacks', headlineHi: 'समोसा' }), variant: 'hero', bilingual: true }));
    expect(repeated).toContain('scr-promo-hi');
    expect(repeated).not.toContain('scr-promo-label');
  });
});
