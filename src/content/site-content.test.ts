import { describe, expect, it } from 'vitest';
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
});
