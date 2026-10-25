---
title: Search pages built by the OpenEd-style agent team
author: Chery60
date: 2026-10-24
branch: site/seo-homepage
cost: { minutes: 20, tokens: 62278 }
touches:
  - ".serena/.gitignore"
  - ".serena/project.yml"
  - src/verify/check-built-site.mjs
  - src/verify/site-search-pages.test.ts
  - src/app/(marketing)/demo/page.tsx
  - src/app/(marketing)/digital-menu-board-for-cafes/page.tsx
  - src/app/(marketing)/digital-menu-board-vs-printed-menu/page.tsx
  - src/app/(marketing)/free-digital-menu-board/page.tsx
  - src/app/(marketing)/how-it-works/page.tsx
  - src/app/(marketing)/how-to-show-menu-on-tv/page.tsx
---

## Decided
- Round 2 of the search work (2026-10-25) adds the share image and per-page titles that the Oct 24 learning left for later. That deferral is now done, not ruled out.
- Four search pages: /how-to-show-menu-on-tv, /free-digital-menu-board, /digital-menu-board-for-cafes, /digital-menu-board-vs-printed-menu. Design: docs/site-search-pages.md; research: docs/research/search-india.md.
- Every public page uses pageMetadata (src/lib/page-metadata.ts) plus breadcrumbJsonLd / faqPageJsonLd. A new public page must be added to siteConfig.pages, the proxy matcher (test enforces it) and guidePages if it is a guide.
- The team roles live in .claude/agents (search-analyst, architect, product-designer, platform-engineer, verifier), each owning its own files. The verifier writes tests from the design only, in src/verify/.
- Free-plan copy claims only "one screen, for good". No "no card", no vendor price ranges, no TV or stick brands until the TV lab has results.

## Tried and ruled out
- A /digital-menu-board pillar page and a dynamic /for/[segment] route: the home page already owns the head term, and three thin segment pages would compete with each other.

## Watch out
- src/verify/check-built-site.mjs needs a running build: node src/verify/check-built-site.mjs http://localhost:4328.
- Next 16.4.0's build stops once with SecurityFatalError (an upgrade nudge) and passes on retry. It may block a deploy until Next is upgraded.
- trail check flags role cards and docs on word overlap ("read config file"); those are false positives.
