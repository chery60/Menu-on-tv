---
title: Owner walkthrough fixes and the menu-photo credential check
author: Chery60
date: 2026-10-20
branch: main
cost: { minutes: 31, tokens: 296978 }
touches:
  - ".env.example"
  - AGENTS.md
  - CLAUDE.md
  - DESIGN.md
  - PRODUCT.md
  - README.md
  - data/tracker.json
  - docs/accounts-and-menu.md
  - docs/architecture.md
  - docs/archive/site-v1/README.md
---

## Decided
- The menu editor now asks the server whether it can read photos (canReadMenuPhotos in src/features/menu/photo-reader.ts). It counts every credential source the Anthropic SDK reads: ANTHROPIC_API_KEY, ANTHROPIC_AUTH_TOKEN, ANTHROPIC_IDENTITY_TOKEN_FILE, ANTHROPIC_PROFILE, ANTHROPIC_CONFIG_DIR. Without any, the empty menu, setup and Today lead with paste, and the action says photo reading isn't switched on. This replaces the 19 October "don't pre-check the key": owners got "try again in a minute" forever on a site with no key.
- Owner-facing addresses use typedAddress(origin, path) from src/config/site.ts (no scheme), from requestOrigin(), never a bare "/pair".
- "New link" on a TV asks first; the first TV connects without a look choice; layout and colour choices show a plain description.
- Pasted headings ignore a note in brackets ("MITHAI (per kg)") when deciding heading or dish (withoutNote in import.ts).

## Tried and ruled out
- Reading the default ~/.config/anthropic profile file to decide: a sync file read on every page for a dev-only case. Set ANTHROPIC_PROFILE to use a profile.

## Watch out
- src/lib/origin.ts imports server-only, which Vitest can't load; put pure helpers in src/config/site.ts.
- actions.test.ts gives each test a random 198.51.100.0-249 address; tests that need their own rate bucket use .250 or .251.
- next build type-checks test files too: a changed test signature fails the Netlify build.
