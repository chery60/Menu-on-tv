import { describe, expect, it } from 'vitest';
import type { ScreenBundle } from './bundle';
import { linkGonePage, PLAYER_ASSETS, playerPage, tvCheckPage } from './player-page';

const bundle = {
  version: 'abc123',
  name: 'Counter TV',
  layout: 'split',
  theme: 'paper',
  bilingual: false,
  timing: { menuSeconds: 18, promoSeconds: 7 },
  restaurant: { name: 'Chai </script><script>alert(1)</script>', tagline: '', categories: [], promos: [], ads: [], ticker: [] },
  qrCodes: {},
} satisfies ScreenBundle;

const embedded = (html: string): unknown => JSON.parse(/<script id="screen-data" type="application\/json">([\s\S]*?)<\/script>/.exec(html)?.[1] ?? 'null');

describe('the page a TV link opens', () => {
  it('loads only the standalone player: one stylesheet and one script, no framework runtime', () => {
    const html = playerPage({ token: 't'.repeat(43), bundle, pairUrl: 'https://menuontv.in/pair' });
    expect(html).toContain(`<link rel="stylesheet" href="${PLAYER_ASSETS.css}">`);
    expect(html).toContain(`<script defer src="${PLAYER_ASSETS.js}"></script>`);
    expect(html).not.toContain('/_next/');
    expect(html.match(/<script/g)).toHaveLength(2);
  });

  it('hands the player its screen as data that can’t close the script tag', () => {
    const html = playerPage({ token: 't'.repeat(43), bundle, pairUrl: 'https://menuontv.in/pair' });
    expect(html).not.toContain('</script><script>alert');
    expect(embedded(html)).toEqual({ token: 't'.repeat(43), bundle, pairUrl: 'https://menuontv.in/pair' });
  });

  it('tells the TV how to connect again when the link is gone, without any script', () => {
    const html = linkGonePage('https://menuontv.in/pair?x=<b>');
    expect(html).toContain('This screen link no longer works.');
    expect(html).toContain('https://menuontv.in/pair?x=&lt;b&gt;');
    expect(html).not.toContain('<script');
  });

  it('checks a TV with the player bundle, and says it is too old if that bundle never runs', () => {
    const html = tvCheckPage('https://menuontv.in/pair');
    expect(html).toContain(`<script defer src="${PLAYER_ASSETS.js}"></script>`);
    expect(html).toContain('<script id="tv-check-data" type="application/json">{"pairUrl":"https://menuontv.in/pair"}</script>');
    expect(html).toContain('<div id="tv-check"');
    expect(html).toContain('If this message stays, this TV’s browser is too old for MenuOnTV.');
  });
});
