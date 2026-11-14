# PRDs

Each page or feature gets one short PRD, one page at most (D1). Product writes it, Design adds the design section for anything owners or guests see, HQ approves it, Platform and Design build from it, and QA tests from it.

- The whole product's PRD, from before D1: [.claude/prds/menutelly.prd.md](../../.claude/prds/menutelly.prd.md).
- The tracker (`/tracker`) is the roadmap. Every PRD names its MT-n item, and the item links back to the PRD.
- Older design docs (`docs/accounts-and-menu.md`, `docs/screen-design.md`, `docs/site-*.md`) still hold. A new PRD that changes one of them says so.

PRDs so far, in build order. List each new one here with one line on what it does.

- [MT-25 Quick actions on Today](mt-25-quick-actions.md) (approved): sold out, today's special and price changes, one tap each from Today, for owners and staff.
- [MT-26 Promo studio](mt-26-promo-studio.md) (approved): six promo templates priced from the menu, with schedules and honest countdowns.

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
