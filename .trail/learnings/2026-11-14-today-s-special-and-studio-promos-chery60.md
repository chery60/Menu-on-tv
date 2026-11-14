---
title: "Today's special and studio promos on the TV (MT-25, MT-26)"
author: Chery60
date: 2026-11-14
branch: mt-26/promos-on-tv
cost: { minutes: 44, tokens: 499671 }
touches:
  - src/features/menu/to-screen.test.ts
  - src/features/menu/to-screen.ts
  - src/features/promos/schedule.test.ts
  - src/features/promos/schedule.ts
  - src/features/screen/countdown.test.ts
  - src/features/screen/countdown.ts
  - src/features/screen/loop.test.ts
  - src/features/screen/loop.ts
  - src/features/screen/types.ts
  - src/features/screens/api.test.ts
---

## Decided
- Today's special lives on the menu as special: { itemId, on }; the set-special edit goes through editMenuAction. Hiding or removing the dish clears it (one check after every edit, applyEdit wraps applyChange); selling out only pauses it.
- Promo times are stored as outlet-local YYYY-MM-DDTHH:mm strings, so schedule and status are pure on LocalClock like dayparts. The bundle turns a promo's end into epoch ms with instantAt (src/lib/local-date.ts): the sooner of its end and today's run of its times (playingUntil).
- The TV drops an ended promo in slideAt (liveSlides) by its own clock at the next slide, with no component change. sideLoop keeps a fallback welcome card behind promos that can all end, so the side zone never goes blank offline.
- Studio promos replace the automatic featured dishes while any is on air; today's special stays first. A promo plays only while every dish is on screen now (in stock, category daypart on).

## Tried and ruled out
- Rebuilding loops in screen-stage.tsx when a promo ends: it is a component (Design's, and their open PR edits it). slideAt is called every tick, so filtering there is enough.
- Storing promo times as UTC instants: status would need the time zone everywhere, unlike dayparts and sold out.

## Watch out
- withCategories in src/features/menu/edit.ts used to rebuild the menu from updatedAt and categories alone, silently dropping any menu-level field. A new Menu field must survive set-prices, sold out, move and photo edits; test it.
- loadLiveScreen now reads promos. Any test that reaches it must stub PROMOS_DATA_FILE, or JsonFileStore.read() creates data/promos.json in the checkout.
- Ticker lines are plain strings built with the bundle: an ended promo's ticker line stays on an offline TV until it reconnects.
