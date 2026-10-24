---
title: Home page search signals and the FAQ schema
author: Chery60
date: 2026-10-24
branch: site/seo-homepage
cost: { minutes: 7, tokens: 168010 }
touches:
  - ".serena/.gitignore"
  - ".serena/project.yml"
  - ".env.example"
  - docs/seo-homepage.md
  - src/app/(marketing)/page.tsx
  - src/app/layout.tsx
  - src/app/sitemap.ts
  - src/config/site.test.ts
  - src/config/site.ts
  - src/content/site-content.ts
---

## Decided
- Head term is "digital menu board". siteConfig.title leads with it and stays <= 60 chars; siteConfig.description <= 160. src/config/site.test.ts guards both.
- The description also feeds the Organization/SoftwareApplication JSON-LD, /llms.txt and /index.md, so keep it short there too.
- homeJsonLd() emits a FAQPage, so the home page must render <Faq /> (from components/pages/pricing-sections). Structured data has to match visible content.
- Search Console verification comes from the GOOGLE_SITE_VERIFICATION env var (layout metadata.verification). Unset means no tag.
- Plan doc: docs/seo-homepage.md. Ranking depends more on off-code work: own domain (MT-4), Search Console + sitemap, a Google Business Profile, backlinks.

## Tried and ruled out
- keywords meta, OG image and per-page titles were left for later; Google ignores keywords meta.

## Watch out
- `git add -A` picks up the untracked .serena/ folder. Don't commit it unless the user asks.
- `npm run build` can exit 1 on the npm security-advisory fetch even when the build itself is fine. Rerun before you debug.
