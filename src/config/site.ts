/**
 * Single source of truth for brand and URL settings.
 * Rename the product here; pages, metadata, JSON-LD and agent files all read from this file.
 */

const FALLBACK_SITE_URL = 'http://localhost:3000';

function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/+$/, '');

  const vercelProduction = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelProduction) return `https://${vercelProduction.replace(/\/+$/, '')}`;

  return FALLBACK_SITE_URL;
}

export const siteConfig = {
  name: 'MenuOnTV',
  title: 'MenuOnTV: digital menu boards and screen ads for restaurants, on any TV',
  tagline: 'Your menu, on your TV',
  description:
    'Turn the TV you already own into a digital menu board that sells. Build it from a photo of your menu, open one link on the TV, change prices and sold-out items from your phone, and run your own promos between menu slides. Free for one screen.',
  url: resolveSiteUrl(),
  locale: 'en_IN',
  keywords: [
    'digital menu board',
    'TV menu board for restaurants',
    'digital menu display India',
    'restaurant menu screen',
    'menu board app',
    'menu on TV',
    'cafe menu on TV',
    'QSR digital signage',
    'restaurant screen advertising',
  ],
  nav: [
    { label: 'How it works', href: '/how-it-works' },
    { label: 'Prices', href: '/pricing' },
    { label: 'Live demo', href: '/demo' },
  ],
  /** Restaurants already on MenuOnTV sign in here; shown beside the main button on every page. */
  ownerSignIn: { label: 'Owner sign in', short: 'Sign in', href: '/sign-in' },
  /** Public pages. Each has a Markdown copy for agents, served when they ask for text/markdown. */
  pages: [
    { path: '/', markdownPath: '/index.md' },
    // The Markdown copy covers the whole site, so the other pages share it.
    { path: '/how-it-works', markdownPath: '/index.md' },
    { path: '/pricing', markdownPath: '/index.md' },
    { path: '/demo', markdownPath: '/index.md' },
  ],
  agentFiles: [
    { label: 'llms.txt', href: '/llms.txt' },
    { label: 'Markdown version', href: '/index.md' },
  ],
} as const;

export function absoluteUrl(path: string): string {
  return `${siteConfig.url}${path.startsWith('/') ? path : `/${path}`}`;
}

/** The Markdown copy for a public page, or null when the path isn't one. */
export function markdownPathFor(pathname: string): string | null {
  return siteConfig.pages.find((page) => page.path === pathname)?.markdownPath ?? null;
}

/** An address as an owner types it with a TV remote or reads it out: no "https://", like menuontv.in/pair. */
export function typedAddress(origin: string, path: string): string {
  return `${origin.replace(/^https?:\/\//, '').replace(/\/+$/, '')}${path}`;
}
