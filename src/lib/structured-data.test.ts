import { describe, expect, it } from 'vitest';
import { absoluteUrl, siteConfig } from '@/config/site';
import { breadcrumbJsonLd, faqPageJsonLd, homeJsonLd, pageJsonLd, serializeJsonLd } from './structured-data';

describe('structured data', () => {
  it('lists Home then the page in a breadcrumb', () => {
    const node = breadcrumbJsonLd({ name: 'Pricing', path: '/pricing' }) as { itemListElement: { position: number; name: string; item: string }[] };
    expect(node.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteConfig.url },
      { '@type': 'ListItem', position: 2, name: 'Pricing', item: absoluteUrl('/pricing') },
    ]);
  });

  it('keeps the FAQ questions in order', () => {
    const items = [{ question: 'One?', answer: 'Yes.' }, { question: 'Two?', answer: 'No.' }];
    const node = faqPageJsonLd(items) as { mainEntity: { name: string }[] };
    expect(node.mainEntity.map((q) => q.name)).toEqual(['One?', 'Two?']);
  });

  it('wraps nodes in one graph', () => {
    const doc = pageJsonLd({ '@type': 'A' }, { '@type': 'B' });
    expect(doc).toEqual({ '@context': 'https://schema.org', '@graph': [{ '@type': 'A' }, { '@type': 'B' }] });
  });

  it('gives the home page a FAQPage and escapes "<"', () => {
    const graph = (homeJsonLd() as { '@graph': { '@type': string }[] })['@graph'];
    expect(graph.some((n) => n['@type'] === 'FAQPage')).toBe(true);
    expect(serializeJsonLd({ a: '</script>' })).not.toContain('<');
  });
});
