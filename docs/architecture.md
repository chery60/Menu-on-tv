# Architecture

Written 18 October 2026. The product plan is in the [platform plan](platform-plan.md); what guests see is in the [screen design playbook](screen-design.md). The competitor player we took apart is in the [teardown](teardown.md#what-the-shipped-player-taught-us).

## What exists in this repository (P0)

| Surface | Where | Notes |
| --- | --- | --- |
| Home page | `src/app/(marketing)/page.tsx` | Live TV in the hero (the real screen engine), six live layouts, pricing preview, FAQ, early access |
| Live demo | `src/app/(marketing)/demo/page.tsx` | `/demo`: the sample café in 3D on a square, its TV playing the real loop (`src/components/demo`, `src/features/plaza`, docs/demo-plaza.md) |
| Demo screen | `src/app/screen/[id]/page.tsx` | `/screen/demo` runs the sample café full screen, with a way back to the site when the pointer moves. Query: `layout`, `theme`, `lang=hi` |
| Screen engine | `src/features/screen` | Menu model types, the wall-clock loop (`loop.ts`, tested), themes with a contrast test, layouts and the player |
| Early access | `POST /api/waitlist` | zod validation, honeypot, rate limit, de-duplication, JSON file store |
| Agent and search files | `/llms.txt`, `/index.md`, `/sitemap.xml`, `/robots.txt`, JSON-LD | Generated from `src/content/site-content.ts` |
| Tracker | `/tracker`, `/api/tracker/*` | Ported from the Fundraise tracker; Basic Auth in production; data in `data/tracker.json` |
| TV player (live) | `/s/<token>` | A TV's own link: plays its screen's bundle with live updates, offline cache, clock correction and a daily reload that waits for the server |
| Pairing | `/pair` | The TV shows a 6-character code and a QR; the owner enters it in the console |
| Owner sign-in | `/sign-in` | A mobile number or email, then a 6-digit code. Signing in the first time makes the account. See [accounts and the menu editor](accounts-and-menu.md) |
| Owner app | `/studio`, `/studio/menu`, `/studio/restaurant`, `/studio/setup` | Restaurant accounts with owner and staff roles. Today (sold out, TVs, first-screen checklist), the phone-first menu editor with photos and a live preview, and the restaurant's details and people |
| Dish photos | `GET /api/photos/<id>` | Shrunk on the phone, checked by their bytes, cached forever; TVs keep them offline |
| Screen APIs | `/api/s/<token>/bundle`, `/events`, `/beat`; `/api/pairing/start`, `/api/pairing/<code>` | Versioned bundle with ETag, server-sent events, heartbeat with server time, pairing |
| Hosting and storage | `netlify.toml`, `netlify/database/migrations`, `src/lib/document-store.ts` | Netlify, with data in Netlify Database (Postgres) and dish photos in Netlify Blobs; JSON files in `data/` locally (ADR-009) |

The rest of this document is the design for v0 onwards; the player section marks what is built.

## System overview

```
 Owner's phone                      MenuOnTV cloud                            Restaurant TV
 ─────────────                      ───────────────                            ─────────────
 Owner app (web app) ──Server Actions──▶ Next.js app (Node, Fluid compute)
   menu editor                          ├─ Postgres: restaurants, menus, screens,
   photo import ──────── AI gateway ────┤   promos, play log, plans, (v2) ads
   quick actions                        ├─ Blob storage: dish photos, promo media
   promos, screens                      ├─ Screen bundle API  /api/s/<token>/bundle ◀── Player (/s/<token>)
                                        │    (JSON + ETag, public menu data only)        wall-clock loop
 WhatsApp (v1) ──── webhook ───────────▶├─ Push channel  /api/s/<token>/events  ───────▶ live updates (SSE)
                                        ├─ Heartbeat + play log  /api/s/<token>/beat ◀── every 60 s, batched
 Advertiser (v2) ── booking, payment ──▶├─ Razorpay: subscriptions, ad payments, payouts
                                        └─ Jobs: offline alerts, daily summaries, payouts
```

## The player

The player is the part competitors get wrong (every vendor warns about TV browsers), so it gets the strictest rules.

- **A link is a screen.** `/s/<token>` where the token is 32 random bytes, stored only as a hash. Rotating the token from the phone kills the old link. A 6-character pairing code and a QR are the second path, for TVs where typing a long link is painful.
- **Wall-clock loop.** `slideAt(slides, Date.now())` decides what's on screen. Two TVs in one shop agree without talking, and a reload lands on the right slide.
- **Bundle, then play.** The player fetches one JSON bundle (menu, promos, approved ads, layout, theme, dayparts, version) and plays it. Updates swap the bundle between slides, never mid-slide.
- **Offline first.** A service worker caches the player shell, the last bundle and its media. With no network the TV keeps playing; a small dot in the corner tells staff.
- **Updates in seconds.** Server-sent events push "version changed". A 60-second heartbeat poll is the safety net for sockets that drop silently on cheap TVs.
- **Light.** Under 100 KB of JavaScript, motion in CSS only, no client router. Built (ADR-005): `/s/<token>` is a route handler that answers plain HTML loading `/player/player.js` (11.8 KB gzipped) and `/player/player.css`; the owner app and the site's demo keep the same components inside Next.js.
- **Self-care.** Daily reload at 4 am, a few pixels of drift each minute against burn-in, wake lock where the browser allows it.

### Built and measured (18 October 2026)

An end-to-end run in Chrome against a production build (`next start`), three TVs and the owner console:

| Check | Result |
| --- | --- |
| TV pairs from a 6-character code | Playing 2.0 seconds after the owner entered the code |
| "Sold out" reaches every TV | 2.3 and 9.3 seconds: the stream announces within about 3 seconds, then each TV waits for its next slide |
| A TV whose clock runs 90 seconds fast | In step with the others after its first heartbeat (6 of 6 samples agree) |
| Reload with no network | Keeps playing the last menu from the service worker; a staff-only dot shows it is offline |
| Disconnect a TV, or make it a new link | The old link shows "connect again" within 1.5 to 2.5 seconds |
| JavaScript a TV downloads | 139 KB gzipped (463 KB unpacked), 7 files, on 18 October. Since 20 October: one file, 12 KB over the wire (ADR-005) |

Two findings from the run changed the code: rate limits on screen routes count each TV link, not each address, because a restaurant's TVs share one router; and a TV restoring a saved pairing code checks it with the server before showing it.

## Data model (v0)

| Table | Key fields |
| --- | --- |
| `restaurants` | id, name, city, plan, created_at |
| `outlets` | id, restaurant_id, name, address, timezone |
| `members` | id, restaurant_id, phone, email, role (owner, staff) |
| `menus` | id, restaurant_id, version, updated_at |
| `categories` | id, menu_id, name, name_hi, daypart (from, to, days; null for always), sort |
| `items` | id, category_id, name, name_hi, description, price_paise, diet, badges[], kcal, allergens[], photo_key, available, sort |
| `item_overrides` (v1) | item_id, outlet_id, price_paise, available |
| `promos` | id, restaurant_id, kind, label, headline, line, price_paise, was_price_paise, media_key, qr_url, starts_at, ends_at |
| `screens` | id, outlet_id, token_hash, pairing_code, layout, theme, bilingual, dayparts, last_seen_at, last_version |
| `play_log` | screen_id, hour, slide_ref, plays (aggregated hourly) |
| `subscriptions` | restaurant_id, plan, screens, razorpay_subscription_id, status |
| v2: `advertisers`, `campaigns`, `bookings`, `approvals`, `ledger_entries`, `payouts` | |

Prices are integers in paise. Every query is scoped to a restaurant through one helper, and a test proves one restaurant can't read another's rows.

## AI

- **Menu from a photo (built, MT-19):** Claude (`claude-opus-5-5`) is called with the Anthropic SDK and returns structured JSON, validated by zod, that lists the fields it was unsure of. Those fields are highlighted for the owner. Nothing reaches a screen without approval. It calls Anthropic directly for now; moving it behind an AI gateway later changes only `photo-reader.ts`. See docs/accounts-and-menu.md.
- **Promo writer and translations:** drafts within each slide's character limits. The model never writes numbers: prices and discounts come from the menu and the owner (ADR-003).
- **Evals:** a golden set of 30 real menu photos (handwritten, flex-printed, laminated, glare) with expected items and prices. The model can't change without passing it.
- **No training on restaurant data**, and no guest data exists to train on.

## Decisions

### ADR-001: A screen is a link, with pairing as a fallback
- **Context:** typing with a TV remote is slow; vendors use a 6-character code plus QR (observed in ScreenCloud's player).
- **Decision:** every screen has an unguessable link that works on its own; the code and QR are a second path.
- **Consequences:** the link is a capability, so it must be long, hashed at rest, rotatable and rate-limited. It only ever exposes public menu data.
- **Pairing without stored secrets:** the TV keeps its own secret and we keep only its hash. Entering the code records which screen it belongs to; the TV's link is created at the moment the TV collects it with its secret, so no token is ever stored, even briefly. Each TV has its own link, so rotating one never breaks another.

### ADR-002: The loop runs on the wall clock
- **Decision:** slide position is a pure function of the time and the loop. Tested in `src/features/screen/loop.test.ts`.
- **Consequences:** multi-TV shops stay in sync for free; synced video walls (v3) need no extra protocol. TVs with a badly wrong clock drift; the heartbeat returns server time so the player can correct.

### ADR-003: The menu is data; AI proposes, people approve
- **Decision:** structured items with prices in paise, diet marks, calories and allergens; AI outputs pass through the same zod schema and an approval step.
- **Consequences:** FSSAI mode, languages, POS sync and lift reports are possible. AI can't invent a price.

### ADR-004: Push plus poll for updates
- **Decision:** SSE for "version changed", plus a 60-second heartbeat that returns the current version.
- **Consequences:** updates in seconds when the socket is healthy, within a minute when it isn't, and the heartbeat doubles as screen health.
- **Limits:** bundle, events and heartbeat are rate-limited per TV link, with a high per-address ceiling only to slow anyone guessing links. Per-address limits alone starved TVs behind one router in testing.

### ADR-005: The production player is a separate small bundle
- **Context:** ScreenCloud's web player ships about 1 MB of JavaScript (observed); weak TV browsers struggle.
- **Decision:** v0 builds the player as a standalone module (no framework router, CSS motion), served from `/s/<token>` with its own service worker. The React prototype in this repo is the reference for layouts and behaviour.
- **Consequences:** two render paths for layouts until the owner app's preview reuses the player module in an iframe.
- **Measured:** the Next.js-based player shipped 139 KB gzipped (463 KB unpacked): React DOM 72 KB and the Next.js runtime 45 KB of it, our code 9 KB, so no trimming inside Next.js could reach 100 KB.
- **Built (20 October 2026):** `scripts/build-player.mjs` (`npm run player`, run before `dev` and `build`) compiles `src/player/main.tsx` with Vite, Preact standing in for React, into `public/player/player.js` (11.8 KB gzipped) and `player.css` (3.6 KB: the brand fonts from `public/fonts`, a small reset and `src/features/screen/screen.css`). It renders the same `LivePlayer` and `ScreenStage` the owner app previews, so there is still one render path, and the build fails over 100 KB. `/s/<token>` is a route handler (`src/app/s/[token]/route.ts`, HTML from `src/features/screens/player-page.ts`). The service worker fetches the player network first and fonts cache first, and plays its last copy on a server error. Checked on a production build: pairing lands on the player, sold out reached the TV in 7.7 s, an offline reload kept playing, and a disconnected link showed "connect again" in about 5 s.

### ADR-006: Ads only with owner approval, capped
- **Decision:** the loop gives local ads at most one slot in three (`AD_SLOT_EVERY` in `loop.ts`), after the owner's promos, and never in the menu zone during ordering. Every ad needs the owner's approval.
- **Consequences:** less inventory than ad-funded TV, but owners trust it, which is the point.

### ADR-007: India-first billing
- **Decision:** Razorpay subscriptions per screen with GST invoices; Razorpay payouts for ad revenue share (v2); Stripe when we go abroad.

### ADR-008: JSON files in P0, Postgres from v0
- **Decision:** the tracker and early-access list use the JSON file store from the Fundraise project (atomic writes, per-file queue). v0 moves product data to Postgres from the hosting provider's marketplace.
- **Consequences:** on serverless hosts the JSON files live in `/tmp` and are temporary; fine for P0, not for customers.
- **Update, 20 October 2026:** superseded for hosting by ADR-009. The same documents now live in Postgres on Netlify; splitting hot data (screens, sessions) into real tables is still the v0 step.

### ADR-009: Netlify for hosting, Postgres and photos (stack confirmed 20 October 2026)
- **Context:** Charan chose Netlify for the first deploy, with the code on GitHub. Netlify runs Next.js 16 through its OpenNext adapter, and functions stop after 60 seconds and can only write to `/tmp`.
- **Decision:**
  - **Hosting:** Netlify, building `npm run build` with Node 22 (`netlify.toml`). The adapter is installed by Netlify on each build and stays unpinned.
  - **Data:** Netlify Database (Postgres). Every JSON document (accounts, menus, screens, tracker, waitlist) is one row in `documents` (`netlify/database/migrations`). Writers take the row with `SELECT … FOR UPDATE`, and one server instance queues its own writes, so no change is lost (`src/lib/document-store.ts`). Locally and in tests the same repositories use the JSON files; the switch is whether `NETLIFY_DB_URL` is set.
  - **Dish photos:** Netlify Blobs, store `photos`, one blob per photo under a random key, written once (`BlobPhotoStore` in `src/features/menu/photos.ts`); the photo folder locally.
  - **Live updates:** TV streams close after 50 seconds, under the 60-second limit, and the TV reconnects 5 seconds later; the 60-second heartbeat still backs them up (ADR-004).
  - **Still to open (MT-14):** Resend for email codes and Twilio for +91 text codes (until then a test site may set `SIGN_IN_CODES_ON_SCREEN=true`, which lets anyone sign in as anyone), Razorpay (v1), WhatsApp Business (v1), and an Anthropic key for menu photos (MT-19).
- **Consequences:** one place to deploy, data and photos survive deploys, and a deploy preview gets its own copy of the database. Netlify Database needs a credit-based Netlify plan. Each TV holds one function open about 50 seconds a minute and its stream reads the documents every 3 seconds; fine for a pilot of tens of TVs, and the pub/sub channel in ADR-004 replaces it before hundreds.

## Security and privacy

- No cameras, microphones or guest identifiers anywhere. Play counts only.
- Public endpoints (bundle, events, beat, pairing, photos, early access, sign-in) are rate-limited and validated with zod.
- Owner sign-in: 6-digit codes, hashed with their challenge id, 5 tries, 10 minutes, a new code replaces the old, 30 seconds between codes and 5 an hour per address, plus per-connection limits. Text messages go only to +91 numbers. Sessions are 32 random bytes in an `HttpOnly`, `SameSite=Lax` cookie (`Secure` in production), stored as a hash, 30 days.
- Every owner Server Action checks the session and the role itself and scopes data to the member's restaurant (`src/app/studio/guard.ts`); tests call the actions signed out, as staff and as another restaurant's owner.
- Screen tokens hashed at rest; bundles contain only public menu data.
- Security headers on every response (see `next.config.ts`); the tracker is behind Basic Auth in production and never indexed.
- Logs never contain phone numbers, emails, names or codes (`src/lib/logger.ts`). Owner data files are gitignored.
