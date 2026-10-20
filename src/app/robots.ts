import type { MetadataRoute } from 'next';
import { absoluteUrl, siteConfig } from '@/config/site';

const PRIVATE_PATHS = ['/tracker', '/studio', '/sign-in', '/api/', '/s/', '/pair'];

/** AI crawlers are welcome on public pages; a matching group replaces '*', so private paths repeat. */
const AI_AGENTS = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-User', 'Claude-SearchBot', 'PerplexityBot', 'Google-Extended', 'Applebot-Extended'];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: PRIVATE_PATHS },
      { userAgent: AI_AGENTS, allow: ['/', '/llms.txt', '/index.md'], disallow: PRIVATE_PATHS },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
    host: siteConfig.url,
  };
}
