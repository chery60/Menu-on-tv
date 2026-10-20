import type { NextConfig } from 'next';

const SECURITY_HEADERS = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
];

const nextConfig: NextConfig = {
  // A second build folder lets an isolated dev server or build run beside the usual one (docs: building.md).
  distDir: process.env.NEXT_DIST_DIR || '.next',
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
  // The tracker's document pages read these Markdown files at request time, and a fresh tracker store
  // (a new database on Netlify) starts from the roadmap committed in data/tracker.json.
  outputFileTracingIncludes: {
    '/tracker': ['./data/tracker.json'],
    '/tracker/**': ['./data/tracker.json'],
    '/api/tracker/**': ['./data/tracker.json'],
    '/tracker/docs/*': ['./PRODUCT.md', './DESIGN.md', './docs/**/*.md', './.claude/prds/*.md'],
  },
  // Local owner data never ships inside a deploy, even one built from a laptop; on Netlify it lives in Postgres and Blobs.
  outputFileTracingExcludes: {
    '/**': ['./data/accounts.json', './data/menus.json', './data/screens.json', './data/waitlist.json', './data/workspace.json', './data/photos/**', './data/*.tmp'],
  },
  async headers() {
    return [
      { source: '/:path*', headers: SECURITY_HEADERS },
      {
        // The screen service worker must never be cached, or TVs would keep an old one.
        source: '/sw.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self'" },
        ],
      },
      {
        // llms.txt discovery for agents, plus content negotiation for the Markdown copy.
        source: '/',
        headers: [
          { key: 'Link', value: '</llms.txt>; rel="describedby"; type="text/markdown", </index.md>; rel="alternate"; type="text/markdown"' },
          { key: 'Vary', value: 'Accept' },
        ],
      },
    ];
  },
};

export default nextConfig;
