---
title: Where specials and promos come from today (for MT-25 and MT-26 PRDs)
author: Chery60
date: 2026-11-14
branch: claude/product-ff7884
cost: { minutes: 11, tokens: 241123 }
touches:
  - docs/prd/mt-25-quick-actions.md
  - docs/prd/mt-26-promo-studio.md
  - data/tracker.json
  - docs/prd/README.md
  - src/features/menu/to-screen.ts
  - src/features/screen/types.ts
  - src/content/site-content.ts
---

## Decided
- MT-25 and MT-26 are the next v0 PRDs (docs/prd/). MT-19 waits on an API key and 30 real photos; MT-20 waits on 10 real TVs, and owners can't set a brand colour yet.
- Today's special lives on the menu, cleared by outlet date like soldOutOn, so staff reach it through editMenuAction. It plays first and never replaces the automatic featured dishes; only promos made in the studio do.
- The only typed price in a promo is the combo or happy-hour deal, prefilled with the menu total. Everything else reads live from the menu.

## Tried and ruled out
- A separate today's-special template store in MT-26: it would give two sources for one special. The template opens MT-25's picker.

## Watch out
- Promos on TVs today come only from featuredPromos() in src/features/menu/to-screen.ts (badges bestseller, new, chef). There is no owner promo data yet.
- The Promo type in src/features/screen/types.ts has no Hindi field.
- The pricing page (src/content/site-content.ts) lists "Scheduled promos and countdowns" under Plus, but billing (MT-33) isn't built. Founder decides the split.
- data/tracker.json is tracked in git and is also the live file the main checkout's server writes. A PR that edits it conflicts if HQ changes the tracker before merging.
