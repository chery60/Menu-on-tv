/**
 * Proving tests for docs/site-search-pages.md, written from the design only.
 * Names imported are the ones the design names. A failure here means the build departs from the design.
 */
import { describe, expect, it } from 'vitest';
import { siteConfig, absoluteUrl } from '@/config/site';
import {
  comparison,
  demoPage,
  faq,
  guidePages as guidePagesTuple,
  howPage,
  madeFor,
  menuOnTvGuide,
  pricing,
  pricingPage,
  readNextTitle,
} from '@/content/site-content';
import type { FaqEntry, GuidePage } from '@/content/site-content';
import { breadcrumbJsonLd, faqPageJsonLd, pageJsonLd } from '@/lib/structured-data';
import { pageMetadata, fullTitle } from '@/lib/page-metadata';
import sitemap from '@/app/sitemap';
import { config as proxyConfig } from '@/proxy';

// guidePages is `as const` with narrow member types; widen to the design's GuidePage.
const guidePages: readonly GuidePage[] = guidePagesTuple;
const SUFFIX = ` · ${siteConfig.name}`;
const NEW_PATHS = [
  '/how-to-show-menu-on-tv',
  '/free-digital-menu-board',
  '/digital-menu-board-for-cafes',
  '/digital-menu-board-vs-printed-menu',
] as const;
const PUBLIC_PATHS = new Set<string>([...siteConfig.pages.map((p) => p.path), '/tv-check']);
const EM_DASH = '—';
// Design: one `{ label, href }` per link; `next` is LinkItem[] (title/body/href).
const endsWithPeriod = (s: string) => s.trimEnd().endsWith('.');

const faqOf = (page: { faq?: { items: readonly FaqEntry[] } }) => page.faq?.items ?? [];
const guideFaqPages = guidePages.filter((p) => p.faq);

describe('routes and metas', () => {
  it('siteConfig.pages has every route, each with markdownPath /index.md for new ones', () => {
    const paths = siteConfig.pages.map((p) => p.path);
    for (const p of ['/', '/how-it-works', '/pricing', '/demo', ...NEW_PATHS]) expect(paths).toContain(p);
    for (const p of NEW_PATHS) expect(siteConfig.pages.find((x) => x.path === p)?.markdownPath).toBe('/index.md');
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('guidePages are the four new paths, in design order', () => {
    expect(guidePages.map((p) => p.path)).toEqual([...NEW_PATHS]);
  });

  const metas = [
    ['howPage', howPage.meta],
    ['pricingPage', pricingPage.meta],
    ['demoPage', demoPage.meta],
    ...guidePages.map((p) => [p.path, p.meta] as const),
  ] as const;

  it.each(metas)('%s: title <= 49 bare, <= 60 with suffix, description <= 160', (_n, meta) => {
    expect(meta.title.length).toBeLessThanOrEqual(60 - SUFFIX.length);
    expect(`${meta.title}${SUFFIX}`.length).toBeLessThanOrEqual(60);
    expect(meta.description.length).toBeLessThanOrEqual(160);
    expect(meta.title).not.toContain(EM_DASH);
    expect(meta.description).not.toContain(EM_DASH);
  });

  it('home siteConfig title <= 60 and description <= 160', () => {
    expect(siteConfig.title.length).toBeLessThanOrEqual(60);
    expect(siteConfig.description.length).toBeLessThanOrEqual(160);
  });

  it('titles and descriptions are unique across pages', () => {
    const all = metas.map(([, m]) => m.title);
    expect(new Set(all).size).toBe(all.length);
    const desc = metas.map(([, m]) => m.description);
    expect(new Set(desc).size).toBe(desc.length);
  });

  it('pricing title and H1 follow the design', () => {
    expect(pricingPage.meta.title).toBe('Digital menu board price in India');
    expect(pricingPage.title).toBe('What a digital menu board costs in India.');
  });

  it('pageMetadata gives canonical, og, twitter, markdown alternate, explicit image', () => {
    const m = pageMetadata({ ...freePageMeta(), path: '/free-digital-menu-board' });
    expect(m.alternates?.canonical).toBe('/free-digital-menu-board');
    expect(m.alternates?.types).toMatchObject({ 'text/markdown': '/index.md' });
    expect(m.openGraph?.title).toBe(fullTitle({ ...freePageMeta(), path: '/free-digital-menu-board' }));
    expect(m.openGraph?.title).toMatch(/ · MenuOnTV$/);
    expect(JSON.stringify(m.openGraph?.images)).toContain('/opengraph-image');
    expect((m.twitter as { card?: string }).card).toBe('summary_large_image');
    expect(JSON.stringify(m.twitter)).toContain('/opengraph-image');
    expect(m.description).toBe(freePageMeta().description);
  });

  it('absoluteTitle skips the suffix', () => {
    const seo = { title: siteConfig.title, description: siteConfig.description, path: '/', absoluteTitle: true };
    expect(fullTitle(seo)).toBe(siteConfig.title);
    expect(JSON.stringify(pageMetadata(seo).title)).toContain('absolute');
  });
});

function freePageMeta() {
  return guidePages[1].meta;
}

describe('copy rules', () => {
  const allText = JSON.stringify({ guidePages, pricingPage, howPage, demoPage, madeFor, readNextTitle });

  it('no em dash anywhere in the new or retuned content', () => {
    expect(allText).not.toContain(EM_DASH);
  });

  it('H1, section titles, FAQ titles, cost and table titles, readNextTitle end with a period', () => {
    expect(endsWithPeriod(readNextTitle)).toBe(true);
    expect(readNextTitle).toBe('Read next.');
    expect(endsWithPeriod(pricingPage.title)).toBe(true);
    expect(endsWithPeriod(pricingPage.cost.title)).toBe(true);
    for (const p of guidePages) {
      expect(endsWithPeriod(p.title), `${p.path} H1`).toBe(true);
      for (const s of p.sections) expect(endsWithPeriod(s.title), `${p.path} ${s.id}`).toBe(true);
      if (p.faq) expect(endsWithPeriod(p.faq.title), `${p.path} faq title`).toBe(true);
      if (p.table) expect(endsWithPeriod(p.table.title), `${p.path} table`).toBe(true);
    }
  });

  it('no TV or stick brand, no vendor range, no "no card" or "no time limit" on guide pages', () => {
    const text = JSON.stringify(guidePages) + JSON.stringify(pricingPage);
    expect(text).not.toMatch(/\b(samsung|lg|sony|mi tv|xiaomi|fire ?tv|firestick|chromecast|roku|google tv|tcl|hisense|petpooja|menuontv\.in)\b/i);
    expect(text).not.toMatch(/no card|no credit card|no time limit|without a card/i);
    expect(text).not.toMatch(/GST/);
  });

  it('every guide page has an H1, lead, a unique section id set and a next block', () => {
    for (const p of guidePages) {
      expect(p.title.length).toBeGreaterThan(0);
      expect(p.lead.length).toBeGreaterThan(0);
      const ids = p.sections.map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(p.next).toHaveLength(3);
    }
  });

  it('only the guide steps section is numbered, and it has four items; guide has no FAQ', () => {
    const steps = menuOnTvGuide.sections.find((s) => s.id === 'steps');
    expect(steps?.numbered).toBe(true);
    expect(steps?.items).toHaveLength(4);
    expect((menuOnTvGuide as GuidePage).faq).toBeUndefined();
  });

  it('FAQ page counts match the design (3 each on free, cafes, versus)', () => {
    expect(guideFaqPages.map((p) => p.path)).toEqual([NEW_PATHS[1], NEW_PATHS[2], NEW_PATHS[3]]);
    for (const p of guideFaqPages) expect(faqOf(p)).toHaveLength(3);
  });

  it('versus table: 3 columns, 5 rows of 4 cells', () => {
    const t = guidePages[3].table!;
    expect(t.columns).toHaveLength(3);
    expect(t.rows).toHaveLength(5);
    for (const r of t.rows) expect(r).toHaveLength(4);
  });
});

describe('price cell rule', () => {
  it('two-TV MenuOnTV cell is 2 x Plus per-screen, en-IN formatted, never typed', () => {
    const plus = pricing.plans[1];
    expect(plus.name).toBe('Plus');
    const two = `₹${(plus.perScreen * 2).toLocaleString('en-IN')}`;
    expect(two).toBe('₹998');
    const row = pricingPage.cost.rows[0];
    expect(row[0]).toBe('MenuOnTV');
    expect(row[1]).toBe('₹0 on Free');
    expect(row[2]).toBe(`${two} a month on Plus`);
  });

  it('cost table shape: columns One TV, Two TVs; 4 rows of 3 cells; note', () => {
    const c = pricingPage.cost;
    expect(c.title).toBe('What one café pays in all.');
    expect(c.columns).toEqual(['One TV', 'Two TVs']);
    expect(c.rows).toHaveLength(4);
    for (const r of c.rows) expect(r).toHaveLength(3);
    expect(c.note).toBe('Early-access prices, before tax.');
  });
});

describe('internal links', () => {
  const hrefs = (links: readonly { href: string }[]) => links.map((l) => l.href);

  it('every next href is a public path (or /tv-check)', () => {
    const all = [...guidePages.flatMap((p) => hrefs(p.next)), ...hrefs(pricingPage.next), ...hrefs(howPage.next)];
    for (const h of all) expect(PUBLIC_PATHS.has(h), h).toBe(true);
  });

  it('FAQ links, madeFor.more and tvCheck resolve', () => {
    const links = [
      ...faq.items.flatMap((i) => ('link' in i && i.link ? [(i as FaqEntry).link!] : [])),
      ...pricingFaqLinks(),
      madeFor.more,
      menuOnTvGuide.tvCheck,
    ];
    for (const l of links) expect(PUBLIC_PATHS.has(l.href), l.href).toBe(true);
    expect(madeFor.more.href).toBe('/digital-menu-board-for-cafes');
    expect(menuOnTvGuide.tvCheck).toEqual({ label: 'Open the TV check', href: '/tv-check' });
  });

  it('home FAQ cost and smart-TV answers link to /pricing and the guide', () => {
    const byQ = (q: string) => faq.items.find((i) => i.question === q) as FaqEntry | undefined;
    expect(byQ('How much does a digital menu board cost in India?')?.link).toEqual({ label: 'See what one café pays', href: '/pricing' });
    expect(byQ('Can I show my menu on a smart TV without an app?')?.link).toEqual({ label: 'Read the setup guide', href: '/how-to-show-menu-on-tv' });
  });

  it('each new page links to >= 2 others and is linked from >= 2 others', () => {
    const outgoing: Record<string, string[]> = {
      '/': [madeFor.more.href, ...faq.items.flatMap((i) => ((i as FaqEntry).link ? [(i as FaqEntry).link!.href] : []))],
      '/pricing': hrefs(pricingPage.next),
      '/how-it-works': hrefs(howPage.next),
      ...Object.fromEntries(guidePages.map((p) => [p.path, hrefs(p.next)])),
    };
    for (const p of NEW_PATHS) {
      expect(outgoing[p].filter((h) => h !== p).length, `${p} out`).toBeGreaterThanOrEqual(2);
      // Footer Guides column links every new page from every page, so count content links only as a floor of 2 too.
      const inbound = Object.entries(outgoing).filter(([from, to]) => from !== p && to.includes(p)).length;
      expect(inbound, `${p} in`).toBeGreaterThanOrEqual(2);
    }
  });

  it('footer guides: four links, the new pages, in design order', () => {
    expect(siteConfig.guides).toHaveLength(4);
    expect(siteConfig.guides.map((g) => g.href)).toEqual([...NEW_PATHS]);
    expect(siteConfig.nav).toHaveLength(3);
  });

  it('guides labels match the design', () => {
    expect(siteConfig.guides.map((g) => g.label)).toEqual([
      'Menu on a TV, no app',
      'Free menu board',
      'For cafés and counters',
      'Against printed and QR',
    ]);
  });
});

// pricingPage.faq is not named by the design; the pricing page renders the home `faq`. Kept as a hook.
function pricingFaqLinks(): { label: string; href: string }[] {
  return [];
}

describe('structured data', () => {
  it('breadcrumbJsonLd: BreadcrumbList, 2 items, Home then the page', () => {
    const page = guidePages[0];
    const node = breadcrumbJsonLd({ name: page.meta.title, path: page.path }) as Record<string, unknown>;
    expect(node['@type']).toBe('BreadcrumbList');
    const items = node.itemListElement as Array<Record<string, unknown>>;
    expect(items).toHaveLength(2);
    expect(items.map((i) => i.position)).toEqual([1, 2]);
    expect(JSON.stringify(items[0])).toContain(siteConfig.url);
    expect(JSON.stringify(items[1])).toContain(absoluteUrl(page.path));
    expect(JSON.stringify(items[1])).toContain(page.meta.title);
  });

  it.each(guideFaqPages.map((p) => [p.path, p] as const))('faqPageJsonLd(%s) questions equal FAQ content in order', (_p, page) => {
    const node = faqPageJsonLd(page.faq!.items) as Record<string, unknown>;
    expect(node['@type']).toBe('FAQPage');
    const main = node.mainEntity as Array<{ '@type': string; name: string; acceptedAnswer: { text: string } }>;
    expect(main.map((q) => q.name)).toEqual(page.faq!.items.map((i) => i.question));
    expect(main.map((q) => q.acceptedAnswer.text)).toEqual(page.faq!.items.map((i) => i.answer));
    expect(main.every((q) => q['@type'] === 'Question')).toBe(true);
  });

  it('faqPageJsonLd works for the home FAQ and pageJsonLd wraps nodes in a @graph', () => {
    const faqNode = faqPageJsonLd(faq.items);
    const wrapped = pageJsonLd(breadcrumbJsonLd({ name: 'x', path: '/x' }), faqNode) as Record<string, unknown>;
    expect(wrapped['@context']).toBe('https://schema.org');
    expect(wrapped['@graph']).toHaveLength(2);
    expect((faqNode.mainEntity as unknown[]).length).toBe(faq.items.length);
  });
});

describe('sitemap and proxy', () => {
  it('sitemap lists every siteConfig.pages path as an absolute URL', () => {
    const urls = sitemap().map((e) => e.url);
    for (const p of siteConfig.pages) expect(urls).toContain(absoluteUrl(p.path));
    expect(urls).toHaveLength(siteConfig.pages.length);
  });

  it('proxy config.matcher contains every page', () => {
    for (const p of siteConfig.pages) expect(proxyConfig.matcher, p.path).toContain(p.path);
  });
});

describe('sanity on existing content the design relies on', () => {
  it('comparison keeps the old table (satisfies ComparisonTable): columns and note present', () => {
    expect(comparison.columns.length).toBe(3);
    expect(comparison.note.length).toBeGreaterThan(0);
  });
});
