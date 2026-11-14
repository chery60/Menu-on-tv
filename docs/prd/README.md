# PRDs

Each page or feature gets one short PRD, one page at most (D1). Product writes it, Design adds the design section for anything owners or guests see, HQ approves it, Platform and Design build from it, and QA tests from it.

- The whole product's PRD, from before D1: [.claude/prds/menutelly.prd.md](../../.claude/prds/menutelly.prd.md).
- The tracker (`/tracker`) is the roadmap. Every PRD names its MT-n item, and the item links back to the PRD.
- Older design docs (`docs/accounts-and-menu.md`, `docs/screen-design.md`, `docs/site-*.md`) still hold. A new PRD that changes one of them says so.

PRDs so far, in build order. List each new one here with one line on what it does.

- [MT-25 Quick actions on Today](mt-25-quick-actions.md) (approved): sold out, today's special and price changes, one tap each from Today, for owners and staff.
- [MT-26 Promo studio](mt-26-promo-studio.md) (approved): six promo templates priced from the menu, with schedules and honest countdowns.
- [MT-28 Hindi on screen](mt-28-hindi-on-screen.md) (approved): English and Hindi on each line or by turns, with Devanagari never smaller than English.
- [MT-29 FSSAI display mode](mt-29-fssai-display.md) (approved): one switch for calories, serving sizes, allergens and the 2,000 kcal line on every TV.
- [MT-31 Proof of play](mt-31-proof-of-play.md) (approved): every TV counts what it played, hour by hour, through internet cuts; a 7-day report and a CSV.
- [MT-34 Ten-minute onboarding](mt-34-ten-minute-onboarding.md) (approved): menu, look and TV as one guided path on Today, then a nudge to add today's special.
- [MT-35 Field demo mode](mt-35-field-demo-mode.md) (approved): a rep builds the owner's menu on a demo TV in a minute and hands it to the owner's number.
- [MT-36 Owner funnel](mt-36-owner-funnel.md) (approved): sign-up to screen on air to paid, time to first screen and weekly active restaurants, for the team; never guests.
- [MT-89 QR menu at the table and counter](mt-89-qr-menu.md) (draft: the PR #12 review and D3 are folded in, ready for HQ approval): tables and printed QR cards that open the live menu on the guest's phone; the first step of the [ordering plan](../ordering-plan.md).
- [MT-90 Order from the phone](mt-90-order-from-the-phone.md) (draft): the guest's cart and order from a QR card, priced by the server, with a number, the ordering switches, the status page, retention and an orders table (ADR).
- [MT-91 Kitchen order board](mt-91-kitchen-board.md) (draft): new orders ring until accepted, one tap per move, Pay first and the paid mark, and ordering pauses by itself when no board is open.
- [MT-92 Live status and the ready alert](mt-92-live-status-and-ready-alert.md) (draft): the guest's order page updates itself and plays a sound when the food is ready; with it, ordering can go live.
- [MT-98 "Try it" on phones](mt-98-try-it-on-phones.md) (approved): the home page's live TV stays in view while an owner types on a phone.

## Format

```markdown
# <Page or feature name>

Status: draft | approved
Tracker: MT-<n>
Surface: site | owner app | TV (one or more)

## What it is
One or two sentences, in an owner's words.

## Who uses it
Which people (owner, staff, guest, installer) and why.

## What it does
- What's shown, including the empty, loading and error states
- Fields: name, type, required or not, default, limits
- Actions: add, edit, reorder, remove, and so on

## Design
Design writes this part. Which existing components and `mtv-*` or owner classes it uses, the layout at phone width (375px) and on a computer, and on a TV what a guest reads from 3 to 5 metres. Anything new to the look says why, and is added to DESIGN.md when it ships.

## Data it touches
What it creates or changes, and what elsewhere reads it (the menu, screens, accounts).
"TBD" is fine for a first draft; come back to it.

## Rules and edge cases
Validation, roles (owner or staff), what happens to existing data on a change, offline TVs, Hindi text.

## Not in this version
What we're leaving out on purpose.

## Slices
One line per pull request, in build order: what it delivers, who builds it (Design or Platform) and the files it owns, and any older checks it changes.

## How we'll know it works
Checks a tester can run without reading the code, including a walk through it as an owner on a phone. QA turns these into tests.
```
