---
title: zod array limits and which schemas to tighten
author: Chery60
date: 2026-11-14
branch: fix/zod-array-limits
cost: { minutes: 9, tokens: 159885 }
touches:
  - package-lock.json
  - package.json
  - src/features/menu/schema.test.ts
  - src/features/menu/schema.ts
---

## Decided
- zod is floored at ^4.6.7 (GHSA-mrhx-c7xc-m3w5): from 4.6.6 an array's .max() is checked before its entries, so an oversized owner request fails in one issue (it made 45,001 on 4.6.5).
- Owner input arrays get a .max(); itemInputSchema.allergens caps at ALLERGENS.length. src/features/menu/schema.test.ts holds the checks.

## Tried and ruled out
- Adding .max() to the stored-document schemas (menu, accounts, screens) or to photo-import.ts: a stricter schema on saved data can reject an existing menu and blank a TV, and photo import trims extra sizes on purpose.

## Watch out
- The zod size gate only helps arrays with a max; an unbounded z.array on untrusted input still checks every entry.
- On this machine rtk rewrites `npm run lint` output: it showed .trail/hook.cjs errors that the scoped script never sees. Check the exit code with `rtk bypass npm run lint`.
