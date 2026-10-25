import { describe, expect, it } from 'vitest';
import { siteConfig } from '@/config/site';
import { HERO_SPECIALS } from '@/features/screen/hero-demo';
import * as content from './site-content';

/** Every string in the content module, wherever it is nested. */
function strings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === 'object') return Object.values(value).flatMap(strings);
  return [];
}

describe('site content', () => {
  it('ends every headline with a period', () => {
    const headlines = [
      content.hero.title,
      content.problems.title,
      ...content.problems.items.map((item) => item.title),
      content.planStory.title,
      ...content.planStory.beats.map((beat) => beat.title),
      content.demoStory.title,
      content.howItWorks.title,
      content.madeFor.title,
      content.screenRules.title,
      content.freeBand.title,
      content.builder.title,
      content.earlyAccess.title,
      content.howPage.title,
      content.pricingPage.title,
      content.pricing.title,
      content.faq.title,
    ];
    for (const headline of headlines) expect(headline, headline).toMatch(/\.$/);
  });

  it('never uses an em dash', () => {
    const offenders = strings(content).filter((text) => text.includes('—'));
    expect(offenders).toEqual([]);
  });

  it('has a line for every special the demo can show', () => {
    for (const id of HERO_SPECIALS) expect(content.demoStory.specialLines[id], id).toBeTruthy();
  });

  it('tells the plan in as many beats as it has steps, and flags each problem once', () => {
    expect(content.planStory.beats).toHaveLength(4);
    const ids = content.planStory.flags.map((flag) => flag.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  const searchHeadlines = content.guidePages.flatMap((page) => [
    page.title,
    ...page.sections.map((section) => section.title),
    ...(page.table ? [page.table.title] : []),
    ...(page.faq ? [page.faq.title] : []),
  ]);

  it('ends every search page headline with a period', () => {
    for (const headline of [...searchHeadlines, content.readNextTitle, content.pricingPage.cost.title]) expect(headline, headline).toMatch(/\.$/);
  });

  it('keeps search titles and descriptions inside what results show', () => {
    const metas = [...content.guidePages.map((page) => page.meta), content.howPage.meta, content.pricingPage.meta, content.demoPage.meta];
    for (const meta of metas) {
      expect(`${meta.title} · ${siteConfig.name}`.length, meta.title).toBeLessThanOrEqual(60);
      expect(meta.description.length, meta.title).toBeLessThanOrEqual(160);
    }
    expect(siteConfig.title.length).toBeLessThanOrEqual(60);
    expect(siteConfig.description.length).toBeLessThanOrEqual(160);
  });

  it('links only to public pages', () => {
    const paths = new Set<string>([...siteConfig.pages.map((page) => page.path), '/tv-check']);
    const homeLinks = content.faq.items.flatMap((entry) => (entry.link ? [entry.link.href] : []));
    const hrefs = [
      ...content.guidePages.flatMap((page) => [...page.next.map((link) => link.href), ...(page.faq?.items ?? []).flatMap((entry) => (entry.link ? [entry.link.href] : []))]),
      ...content.howPage.next.map((link) => link.href),
      ...content.pricingPage.next.map((link) => link.href),
      ...homeLinks,
      content.madeFor.more.href,
      content.menuOnTvGuide.tvCheck.href,
    ];
    for (const href of hrefs) expect(paths.has(href), href).toBe(true);
  });

  it('prices two screens at twice the Plus price', () => {
    const plus = content.pricing.plans[1].perScreen;
    expect(content.pricingPage.cost.rows[0][2]).toContain(`₹${(plus * 2).toLocaleString('en-IN')}`);
    expect(content.pricingPage.cost.rows[0][2]).toContain('₹998');
  });

  it('names no TV or stick brand and makes no claim the owner has not approved', () => {
    const pages = strings([content.guidePages, content.pricingPage, content.madeFor]).join(' ');
    expect(pages).not.toMatch(/android|samsung|lg\b|sony|firestick|fire tv|roku|chromecast|mi box|no card|no time limit/i);
  });
});
