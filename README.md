# MenuOnTV

Digital menu boards and screen ads for restaurants, on the TV they already own.

An owner photographs the paper menu, picks a layout, opens one link on the TV, and changes prices, sold-out items and today's special from a phone. The screen mixes the menu with the restaurant's own promos, and later with local ads the owner approves and earns from.

## What's in this repo

| Surface | URL | What it is |
| --- | --- | --- |
| Home | `/` | A café counter drawn in ink whose TV switches on; the problem; a pinned café plan that builds and gets fixed; a pinned demo of one afternoon on the real screen; steps; the screen rules; try it with your own menu; early access |
| How it works, Pricing | `/how-it-works`, `/pricing` | Steps and six live layouts; plans, a monthly-bill calculator and the FAQ |
| Live demo | `/demo` | The sample café in 3D on a square, its TV playing the real menu loop |
| Demo screen | `/screen/demo` | The sample café full screen. `?layout=board\|split\|spotlight\|lbar\|ticker\|portrait&theme=paper\|night&lang=hi` |
| Sign in | `/sign-in` | A mobile number or email and a 6-digit code; the first sign-in makes the account |
| Owner app | `/studio` | Today (what the TVs play, sold out, first-screen checklist), Menu (the phone-first editor with photos, paste or spreadsheet import), TVs (connect, layouts, links) and Restaurant (details and staff) |
| TV player | `/s/<token>` | A TV's own link: a 14 KB player with live updates, offline cache and clock correction. Add `?lab` for the 72-hour lab panel |
| Pairing | `/pair` | Open on a TV: shows a code and QR to connect it |
| TV check | `/tv-check` | Open on a TV: says in plain words whether it can show the menu |
| Field kit | `/kit` | Leave-behind cards to print, ten to an A4 sheet |
| Agent and search files | `/llms.txt`, `/index.md`, `/sitemap.xml`, `/robots.txt` | Markdown copies for AI agents and JSON-LD for search, from the same content as the pages |
| Tracker | `/tracker` | The roadmap (MT-n items, v0 in build order in Planned) and every plan document, behind a team password |

The plan:

- [PRODUCT.md](PRODUCT.md): product brief, and [.claude/prds/menutelly.prd.md](.claude/prds/menutelly.prd.md): the PRD
- [docs/research.md](docs/research.md), [docs/teardown.md](docs/teardown.md), [docs/market-size.md](docs/market-size.md): market, competitors, money and go-to-market
- [docs/screen-design.md](docs/screen-design.md): what guests see; [DESIGN.md](DESIGN.md): the design system
- [docs/platform-plan.md](docs/platform-plan.md): v0 to v3; [docs/architecture.md](docs/architecture.md): system design and decisions
- [docs/accounts-and-menu.md](docs/accounts-and-menu.md): sign-in and the menu editor
- [docs/tv-lab.md](docs/tv-lab.md), [docs/field-kit.md](docs/field-kit.md), [docs/owner-interviews.md](docs/owner-interviews.md): the TV lab, the pilot's field kit and the owner interviews

## Run it

```bash
npm install
```

```bash
npm run dev
```

Open http://localhost:3000. Locally, sign-in shows the code on screen and data lives in JSON files under `data/`. To try a TV: sign in at `/sign-in`, set up a restaurant, open `/pair` in another window and enter its code on the TVs tab. Mark a dish sold out on the Today tab and watch the TV change.

## Check it

```bash
npm test
```

```bash
npm run lint
```

```bash
npm run build
```

## Deploy to Netlify

Netlify builds from `netlify.toml` (Node 22, `npm run build`) and runs Next.js through its own adapter. Because `@netlify/database` is a dependency, Netlify provisions a Postgres database and runs `netlify/database/migrations` before each deploy goes live; dish photos go to Netlify Blobs. Nothing to set for storage (docs/architecture.md, ADR-009). Netlify Database needs a credit-based Netlify plan.

Environment variables (Site configuration, Environment variables; redeploy after changing them):

| Variable | Needed for |
| --- | --- |
| `TRACKER_PASSWORD` | Opening `/tracker` (it stays locked without it) |
| `RESEND_API_KEY`, `AUTH_EMAIL_FROM` | Sign-in codes by email |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` | Sign-in codes by text message (+91 only) |
| `SIGN_IN_CODES_ON_SCREEN=true` | Test sites only, until a provider is set: shows codes on screen, so anyone can sign in as anyone |
| `ANTHROPIC_API_KEY` | Reading a menu from a photo |
| `NEXT_PUBLIC_SITE_URL` | The site's address once it has a domain (until then the Netlify URL is used) |

See `.env.example` for the rest.

## Structure

```
src/
  app/                  routes: (marketing) site, sign-in, studio (owner app), s/[token] TV link, pair, tv-check, kit, tracker, api
  components/           brand, site header and footer, home and inner-page sections, the 3D demo, the owner app frame
  content/              site copy and the demo café (one source of truth)
  features/accounts/    sign-in codes, sessions, restaurants and teams
  features/menu/        the menu model in paise, editing, import from paste, spreadsheet or photo, dish photos
  features/screen/      wall-clock loop, clock correction, themes, layouts, the player, the lab panel
  features/screens/     screen links, pairing, bundles, TV status, the TV check
  features/tracker/     tracker domain, schema, repository, seed plan, client and UI
  lib/                  document store (JSON file or Postgres), API envelope, rate limit, Basic Auth, JSON-LD
  player/               the standalone TV player bundle (npm run player)
  proxy.ts              owner-app redirect, tracker auth and Markdown content negotiation
netlify/database/       Postgres migrations for Netlify Database
```
