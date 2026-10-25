import { describe, expect, it } from 'vitest';
import { absoluteUrl } from '@/config/site';
import { faq, guidePages, type GuidePage } from '@/content/site-content';
import { buildHomeMarkdown, buildLlmsTxt } from './site-markdown';

describe('llms.txt', () => {
  it('links the how-it-works, pricing and every guide page', () => {
    const text = buildLlmsTxt();
    for (const path of ['/how-it-works', '/pricing', ...guidePages.map((page) => page.path)]) expect(text).toContain(absoluteUrl(path));
  });
});

describe('index.md', () => {
  const text = buildHomeMarkdown();

  it('carries each guide page heading and FAQ question', () => {
    for (const page of guidePages as readonly GuidePage[]) {
      expect(text).toContain(`# ${page.title}`);
      for (const entry of page.faq?.items ?? []) expect(text).toContain(entry.question);
    }
    for (const entry of faq.items) expect(text).toContain(entry.question);
  });
});
