# MenuOnTV: menu screens and screen ads for restaurants

## Problem
Small restaurants (cafés, quick-service counters, bakeries, sweet shops, juice bars) own a TV and a printed menu. The TV plays music videos or nothing; the printed menu is out of date the day prices change, and reprinting costs money and time. Signage software exists, but it hands the owner a blank canvas, prices in dollars, and leaves the hard part (making a menu that reads from across the room) to a designer they don't have. Ad-funded TV is free but takes the screen away from the menu, and none of the ad money reaches the restaurant. Left unsolved, owners keep reprinting, guests decide slowly, and specials go unseen.

## Evidence
- Menu boards are the most common use of QSR screens: 82% of fast-food and QSR screens show one (Kitcast survey; vendor source).
- Signage tools charge $5 to $45 per screen per month and sell templates, not menus (observed with REA on Yodeck, OptiSigns, ScreenCloud, Fugo, Kitcast, Juuno, Pickcel; Evidence IDs in `docs/teardown.md`).
- India's largest restaurant POS sells "turn every TV into a live menu" on any Android TV, with one-tap sold-out from the phone (observed on Petpooja). Owners expect phone updates.
- Ad-funded venue TV is free to restaurants but keeps the ad revenue (Atmosphere and Loop, observed; Sixteen-Nine). Only networks of 100+ screens can sell their own ads (OptiSigns Ads Portal).
- FSSAI requires calories on menu boards for chains with a central licence or 10+ outlets (FSSAI notice and guidance note).
- Every signage vendor warns that TV browsers are unreliable (ScreenCloud, Fugo, Juuno). A link-based player has to be engineered for weak browsers.
- Assumption, needs validation through 15 owner interviews: owners will pay ₹499 per screen per month once one free screen proves the value.
- Assumption, needs validation through an ad pilot with 10 local advertisers: a dense neighbourhood of screens earns owners more than the plan costs.

Full sources: `docs/research.md`.

## Users
- **Primary:** the owner of an independent counter-ordering outlet in an Indian city: café, QSR, bakery, sweet shop, juice or ice-cream counter, food-court stall. Runs the business from a phone and WhatsApp. Triggered by a price change, a new outlet, festive season, or a reprint bill.
- **Secondary:** operations or brand managers at chains of 5 to 50 outlets; staff who mark items sold out; field reps; installers and POS partners (v1); local advertisers (v2).
- **Guests:** people standing 3 to 5 metres from the TV, deciding what to order in a few glances.
- **Not for:** fine-dining menus at the table, cinemas and malls' own ad networks, or anyone who wants cameras that watch guests.

## Hypothesis
We believe that **a menu screen built from a photo of the paper menu, laid out to be read in three seconds, opened as a link on the TV the restaurant already owns, and changed from the owner's phone** will **replace reprinting and sell more specials** for **independent counter-ordering restaurants**.
We'll know we're right when **30 pilot outlets keep a screen live for 30 days, median setup is under 10 minutes, and 20% of free outlets pay within 90 days**.

## Success Metrics
| Metric | Target | How measured |
|---|---|---|
| Time from sign-up to first screen live | Under 10 min median | Product events: sign-up to first play |
| Screens still live after 30 days | 80% | Player heartbeats |
| Free to paid within 90 days | 20% | Billing |
| Owners using a quick action weekly | 60% | Product events |
| AI menu import: prices read correctly | 95% on the golden set | Eval set of 30 real menu photos |
| Monthly paid churn | Under 3% | Billing |
| Player uptime during opening hours | 99% | Heartbeats |

## Scope
**MVP (v0, First screen live):** "Your menu on the telly in ten minutes." The full list, in build order, is in `docs/platform-plan.md` and is the tracker's Planned column.
- Sign in with phone OTP or email link; restaurant and outlet setup; owner and staff roles.
- Menu as data: categories, items, sizes, prices with tax, veg marks, badges, calories, allergens.
- Menu from a photo (AI, with approval), from pasted text, or from a spreadsheet; a phone editor.
- Six layouts (Full board, Split, Spotlight, L-bar, Ticker, Portrait) and three themes (Chalk, Neon, Fresh), enforcing the screen design playbook.
- A web player on a link: wall-clock loop, offline cache, live updates under ten seconds, daily reload, burn-in shift.
- Pairing by secret link, 6-character code or QR.
- Quick actions: sold out, today's special, price change.
- Promo studio with six templates and an AI promo writer; dayparts.
- Hindi alongside English; FSSAI display mode.
- Screen health alerts and proof of play.
- One free screen with a small badge; Plus per screen through Razorpay with GST invoices.
- Field demo mode for reps.

**Out of scope**
- Cameras, face detection or guest tracking. This is an anti-goal.
- A general-purpose signage editor. This is an anti-goal.
- Our own POS. This is an anti-goal; we integrate instead.
- The local ad network. Deferred to v2: it needs density first. v0 builds the ad slots.
- POS sync and sales-lift reports. Deferred to v1.
- Native TV apps. Deferred to v1 (Android TV wrapper) and v3 (other TV stores), unless the TV lab forces them earlier.

## Delivery Milestones
| # | Milestone | Outcome | Status | Plan |
|---|---|---|---|---|
| P0 | Foundations | Research, teardown, name, PRD, platform plan, architecture, screen playbook, site with live demo, and tracker | in-progress | Tracker: P0 |
| v0 | First screen live | 30 outlets in one neighbourhood run MenuOnTV from their phones | pending | Tracker: v0 (the Planned column) |
| v1 | Sell more | POS sync, sales lift, WhatsApp updates, regional scripts, Android TV app and stick, Pro plan, partners | pending | Tracker: v1 |
| v2 | Screens that pay | Advertiser booking, owner ad controls, revenue share and payouts, brand-sponsored screens | pending | Tracker: v2 |
| v3 | Platform | API, MCP server, programmatic demand, chains, kiosks, abroad | pending | Tracker: v3 |

## Open Questions
How each one gets answered: the owner interview guide (`docs/owner-interviews.md`) marks its questions [Q1] to [Q7]; the TV lab is `docs/tv-lab.md`.

- [ ] **Q1 Price:** will owners pay ₹499 per screen per month? Is the free screen with a badge enough to start? *Owner interviews, question 9 (MT-11).*
- [ ] **Q2 TVs:** which share of pilot TVs can run the player in their own browser, and which need a stick? *`/tv-check` during each interview (question 3), and the 72-hour TV lab (MT-12). Samsung's own table already suggests 2023 and older Samsung sets will need a stick (docs/tv-lab.md).*
- [ ] **Q3 AI import:** how accurate is the photo-to-menu step on handwritten and flex-printed menus? *Menu photos collected in interviews (question 8) become the golden set in `evals/menu-photos/` (MT-19).*
- [ ] **Q4 Ads:** what will a gym, salon or coaching centre pay per screen per day, and how many screens make an area sellable? *Five advertiser conversations in the pilot neighbourhood, plus owners' terms (question 10).*
- [ ] **Q5 Brand sponsorship:** will a drinks or ice-cream brand pay for screens the way it pays for printed boards? *Owner interviews, question 5; then a call with one brand's area sales manager.*
- [ ] **Q6 POS:** which Indian POS vendors will partner first, and on what terms? *Owner interviews, question 4, give the vendors to approach first.*
- [ ] **Q7 Name:** is MenuOnTV clear to owners from the name alone? (The earlier worry about "telly" went away with the rename on 19 October 2026.) *Owner interviews, question 6.*

## Risks
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| TV browsers fail in the field | Medium | High | TV lab before v0; light player; Android TV wrapper and a recommended stick |
| Owners won't pay when free options exist | High | High | Free screen with badge; sell outcomes (no reprints, specials sold); ad income later |
| AI misreads prices | Medium | High | Highlight uncertain fields; nothing publishes without approval; golden-set evals |
| Ad network never reaches density | Medium | High | Sell street by street; no earning promises before a cluster exists |
| POS vendor builds the same thing | High | Medium | Partner with several POS vendors; win on layouts, AI and ads that POS add-ons don't do |
| Ads hurt the owner's brand | Low | High | Approval before play, category blocks, cap at one slot in three, never over prices |

---
*Status: DRAFT. Requirements only. Implementation planning lives in the tracker (/tracker) and `docs/architecture.md`.*
