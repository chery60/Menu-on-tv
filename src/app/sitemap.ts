import type { MetadataRoute } from 'next';
import { absoluteUrl, siteConfig } from '@/config/site';

/** Update when the public page content changes meaningfully. */
const PAGES_LAST_UPDATED = '2026-10-18';

export default function sitemap(): MetadataRoute.Sitemap {
  return siteConfig.pages.map((page) => ({
    url: absoluteUrl(page.path),
    lastModified: PAGES_LAST_UPDATED,
    changeFrequency: 'weekly',
    priority: 1,
  }));
}
