import { describe, expect, it } from 'vitest';
import { siteConfig } from '@/config/site';
import { fullTitle, pageMetadata, SHARE_IMAGE } from './page-metadata';

describe('pageMetadata', () => {
  const seo = { title: 'Free digital menu board for one TV', description: 'Yes, it is free.', path: '/free-digital-menu-board' };

  it('adds the brand suffix to open graph titles, not to the layout title', () => {
    const meta = pageMetadata(seo);
    expect(meta.title).toBe(seo.title);
    expect(meta.openGraph?.title).toBe(`${seo.title} · ${siteConfig.name}`);
    expect(fullTitle(seo)).toBe(`${seo.title} · ${siteConfig.name}`);
  });

  it('keeps an absolute title as it is', () => {
    const meta = pageMetadata({ ...seo, absoluteTitle: true });
    expect(meta.title).toEqual({ absolute: seo.title });
    expect(meta.twitter?.title).toBe(seo.title);
  });

  it('sets the canonical, the Markdown alternate and the share image', () => {
    const meta = pageMetadata(seo);
    expect(meta.alternates?.canonical).toBe(seo.path);
    expect(meta.alternates?.types).toEqual({ 'text/markdown': '/index.md' });
    expect(meta.openGraph?.images).toEqual([SHARE_IMAGE]);
    expect(meta.twitter).toMatchObject({ card: 'summary_large_image', images: [SHARE_IMAGE.url] });
  });
});
