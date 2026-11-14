---
title: "Product as the only tracker writer, and the ordering plan's calls (D2)"
author: Chery60
date: 2026-11-14
branch: product/prd-v0-rest
cost: { minutes: 28, tokens: 247182 }
touches:
  - data/tracker.json
  - docs/prd/README.md
  - docs/prd/mt-31-proof-of-play.md
  - docs/prd/mt-34-ten-minute-onboarding.md
  - docs/prd/mt-35-field-demo-mode.md
  - docs/prd/mt-36-owner-funnel.md
  - docs/ordering-plan.md
  - docs/prd/mt-89-qr-menu.md
  - src/features/tracker/domain/types.ts
  - docs/prd/mt-28-hindi-on-screen.md
---

## Decided
- Product is the only writer of data/tracker.json (D2). Add items by script with randomUUID ids; keys are max+1 (nextKey in domain/board.ts), so hand-added MT-89+ never collide with UI-made ones.
- Ordering items (MT-89 to MT-97, MT-40) sit in Backlog, phase-2, ranked in build order, because CLAUDE.md keeps Planned for v0. HQ promotes them.
- A new tracker area needs AREAS and AREA_META in src/features/tracker/domain/types.ts, or tracker.json fails validation. That's code, so the PR says so.
- Orders and the play log are hot data: both need a table in Netlify Database (ADR), not openDocumentStore.
- Place (table QR) links are kept unhashed so cards can be reprinted; screen tokens stay hashed. MT-89 explains why.

## Tried and ruled out
- Leaving MT-42 "QR codes to order" next to the new ordering items: two cards for one thing. MT-42 now covers reviews and chat only.

## Watch out
- Stack tracker PRs (each branch on the last) so tracker.json never conflicts; HQ merges in order.
- trail check flags many docs lines on word overlap (menu board page, per page later, template store). Read each flag; so far all were false positives.
- Sign-in in production needs Resend or Twilio (MT-14), so any hand-over or invite flow waits on the founder there.
