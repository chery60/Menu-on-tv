---
title: QA browser verification of the owner app and TV player
author: Chery60
date: 2026-11-14
branch: qa/mt25-special-checks
cost: { minutes: 37, tokens: 379543 }
touches:
  - src/features/menu/todays-special.test.ts
  - src/features/menu/edit.test.ts
  - src/features/menu/edit.ts
  - src/features/menu/schema.ts
  - src/features/menu/to-screen.test.ts
  - src/features/menu/to-screen.ts
  - src/features/screen/loop.test.ts
  - src/features/screen/loop.ts
  - src/features/screen/types.ts
  - docs/prd/README.md
---

## Decided
- QA walks the owner app on a production build (`next start`, port 4334) with a copy of main's data files, so test sign-ups never write into the shared files. `SIGN_IN_CODES_ON_SCREEN=true` shows the code in a production build.
- Use http://127.0.0.1:4334 for QA's owner session: cookies ignore ports, so signing in or out on localhost would touch other teams' sessions in the same browser.
- Gate the top of a stack once; validate data/tracker.json separately (parse it with trackerFileSchema at the PR head), because no gate step reads it.

## Tried and ruled out
- `next dev` on 127.0.0.1: Next 16 blocks the dev resources (HMR) from a non-localhost origin, so client pages never hydrate. Changing allowedDevOrigins is product config; use a production build instead.
- Clicking with `element.click()` from the browser tool's JavaScript: it runs in an isolated world (no React props visible), and a tab that loaded in the background hasn't hydrated. Front the tab and use a real click.

## Watch out
- `window.confirm` (New link, Disconnect, Remove) is dismissed by the automation. Inject a page script that sets `window.confirm = () => true` to accept it.
- A browser never retries an EventSource whose reconnect gets an HTTP error (404, 429 or 5xx). The TV player then only updates through its 60 s heartbeat (bug B1, 2026-11-15).
- The service worker keeps the /s/<token> page from first load. An offline reload plays that page's embedded bundle, not the newer cached bundle (bug B2).
- In zsh, `$P:src/...` applies the `:s` history modifier, and `set -- $p` doesn't split words. Write `"${P}:path"` and pass arguments explicitly.
