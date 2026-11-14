---
title: "TV player: stream reconnects, offline reloads and the language pass"
author: Chery60
date: 2026-11-14
branch: fix/paste-import-flags
cost: { minutes: 36, tokens: 392759 }
touches:
  - src/features/menu/import.test.ts
  - src/features/menu/import.ts
  - data/tracker.json
  - src/app/studio/quick-actions-roles.test.ts
  - src/features/screen/tv-recovery.test.ts
  - src/features/screen/components/live-player.tsx
  - src/features/screen/components/screen-player.tsx
  - src/features/screen/daily-reload.test.ts
  - src/features/screen/daily-reload.ts
  - src/features/screen/newer-bundle.test.ts
---

## Decided
- A browser closes an EventSource for good when a reconnect gets an HTTP error (429, 5xx, 404) and never says which. src/features/screen/live-stream.ts reopens it: backoff from 2 s to 60 s, then one fetch of /events that hangs up at once to read the status and Retry-After, then a new EventSource (B1, PR #30).
- Bundle versions are content hashes with no order. Every served copy carries servedAt (server epoch ms, outside the hash); the player fetches /bundle once at start (offline, the service worker answers from cache) and keeps the newer copy (newer-bundle.ts, B2, PR #35).
- Daily reload lives in src/features/screen/daily-reload.ts (4 am TV clock, HEAD check, retry every 30 min).
- MT-28: screens have language 'en' | 'en-hi' | 'en-then-hi' (old bilingual upgrades in a z.preprocess). The Hindi pass is worked out from the current main slide's start time (main.endsAt - durationMs), so it flips only when the main loop comes round; ScreenStage swaps Hindi names in (language.ts inHindi) instead of changing the parts components.
- MT-29: calorie data rides in the bundle only while restaurant.fssai is on; menuFrame(layout, fssai) takes the footer rows out of the frame, and ScreenStage must page with the same frame as mainSlides.

## Tried and ruled out
- Reading Retry-After from the EventSource error event: it carries no status or headers.
- Ordering bundles by version: hashes don't sort.
- A second set of Hindi loops for the language pass: indexes into liveSlides would have to match; swapping data at render is simpler.

## Watch out
- bundle.ts imports node:crypto, so the TV player can import only types from it; client helpers (bundleLanguage, isNewerBundle) live in src/features/screen/.
- Any test that reaches loadLiveScreen must stub PROMOS_DATA_FILE, or data/promos.json appears in the checkout.
- The react-hooks lint rule rejects calling a state-setting function synchronously in useEffect; defer it with setTimeout(…, 0) and clear it on cleanup.
