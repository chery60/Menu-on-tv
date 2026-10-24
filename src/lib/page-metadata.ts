import type { Metadata } from 'next';
import { markdownPathFor, siteConfig } from '@/config/site';

export interface PageSeo {
  readonly title: string;
  readonly description: string;
  readonly path: string;
  /** The title is already complete, so the layout's " · MenuOnTV" suffix must not be added. */
  readonly absoluteTitle?: boolean;
}

export const SHARE_IMAGE = {
  url: '/opengraph-image',
  width: 1200,
  height: 630,
  alt: `${siteConfig.name}: ${siteConfig.tagline}`,
} as const;

export function fullTitle(seo: PageSeo): string {
  return seo.absoluteTitle ? seo.title : `${seo.title} · ${siteConfig.name}`;
}

/** Title, description, canonical, Markdown alternate and share cards for one public page. */
export function pageMetadata(seo: PageSeo): Metadata {
  const title = fullTitle(seo);
  return {
    title: seo.absoluteTitle ? { absolute: seo.title } : seo.title,
    description: seo.description,
    alternates: { canonical: seo.path, types: { 'text/markdown': markdownPathFor(seo.path) ?? '/index.md' } },
    // openGraph merges shallowly with the layout, and the title template never reaches it, so everything is set here.
    openGraph: { type: 'website', url: seo.path, siteName: siteConfig.name, title, description: seo.description, locale: siteConfig.locale, images: [SHARE_IMAGE] },
    twitter: { card: 'summary_large_image', title, description: seo.description, images: [SHARE_IMAGE.url] },
  };
}
