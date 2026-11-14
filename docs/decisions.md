# Decisions

The founder decides; agents propose. Each decision is numbered and dated, and it quotes the founder's own words. If it isn't here, it hasn't been decided.

Decisions from before D1 (the name, the India-first wedge, prices, the Paper and Night themes, the Netlify stack) live in [PRODUCT.md](../PRODUCT.md), [DESIGN.md](../DESIGN.md), the ADRs in [architecture.md](architecture.md) and the tracker. They stand until a decision here changes them.

## D1: Teams, the way we work, and a product designer

2026-11-14

> "just like that we have the process in the  weenroll project for doing the development, similarly here in the project we need to have the same setup and also hire a top notch product designer agent using the ecc skill anbd basing on that lets setup this project."

What this means:
- MenuOnTV works the way WeEnroll does: the founder decides, HQ plans and merges, and each team works in its own session, worktree and branch. [CLAUDE.md](../CLAUDE.md) has the details.
- The teams are HQ, Product, Design, Platform and QA. The verifier is a role QA fills. The architect and the search analyst (hired for the site revamp on 2026-10-25) stay on call for public-site search work.
- Work goes PRD first (`docs/prd/`), in small slices, one pull request each, with checks written by QA from the PRD and not from the code. QA's full suite (`.claude/qa/run-suite.sh`) is the merge gate; there is no CI on GitHub.
- The tracker stays the roadmap. Every PRD names its MT-n item.
- Design is a senior product designer, equipped with ECC's design skills (`ecc:frontend-design-direction`, `ecc:make-interfaces-feel-better`, `ecc:accessibility`, and `ecc:design-system` and `ecc:product-lens` on demand). It covers the site, the owner app and the TV, and walks every change as a restaurant owner before it merges.

Calls HQ made, which the founder can overrule:
- As at WeEnroll, HQ approves PRDs and merges pull requests once QA passes, without waiting for the founder. The founder reviews at check-ins.
- "Founder" in these files means the person who runs MenuOnTV. "Owner" always means a restaurant owner, because the product already uses it that way (Owner sign in, the owner app).
- The existing `product-designer` role, which built public pages from the architect's design, grows into the Design team rather than adding a second designer.

## D2: Ordering from the table to pickup, and a night of building

2026-11-15, 03:00 IST

> "here we have the tracker, which has the list of all the development we need to do. so here i want to make this best platform for show menu, taking order, showing the updates and notifying the user about the food got ready. so starting from order till the receiving the food at the retaurent table or the ready for Pick up. we need to implement a best possible solution for this. so lets first complete all thedevelopment present in the tracker, then laydown the entire plan in the tracker and then implement them. but here you have till mrng 8 am so, till then only build as much as possible. but what ever you build build it completely and at 8am, after completing give me the summary. take you know decision till 8am for this task. then i will review and let you know further on what to do. build that with quality and ui should be perfact."

What this means:
- MenuOnTV grows from menu screens into the whole journey: guests see the menu, order, follow their order, and are told when the food is ready, at the table or for pickup.
- The order of work is the founder's: finish the development in the tracker first, then lay out the full ordering plan in the tracker, then build it.
- Until 08:00 on 2026-11-15, HQ makes the calls. The founder reviews everything at 08:00.
- Whatever is built is built completely: PRD, design, build, QA's checks, the gate and an owner walkthrough. Half-built work stays on its branch and is named in the summary. UI quality is a hard requirement.

Calls HQ made, which the founder can overrule:
- **Tracker work first, in build order.** The in-review items (MT-15 to MT-24) are checked by QA against their "Done when" lines; gaps become bug fixes. Then MT-25 and MT-26 (PRDs ready), then MT-28, MT-29, MT-31, MT-34, MT-35 and MT-36.
- **Marked as waiting on the founder, not stubbed:** MT-19 and MT-27 (an AI key), MT-33 (a payment provider account) and MT-37 (field work).
- **MT-26 pricing:** every restaurant gets scheduled promos and countdowns until billing (MT-33) exists; the Free and Plus split is decided then (Product's recommendation).
- **The ordering plan is drawn up tonight, alongside the tracker work,** because it is planning, not building. Building it starts when the tracker work is done.
- **Where ordering stops (PRODUCT.md says "No POS of our own"):** we take orders, run the kitchen's order board and tell guests their order is ready. We don't do billing, GST invoices, inventory or accounts; those stay with the owner's POS, and a POS link comes later.
- **Ordering needs no new accounts or secrets to work:** guests scan a QR code at the table or counter, order from their phone with no sign-up, and follow a live status page; the kitchen moves orders on a board in the owner app; the TV can show "Ready for pickup" numbers. Payment is at the counter, or by a UPI link to the owner's own UPI ID that staff confirm. Anything that needs a provider account or a key (SMS, WhatsApp, a payment gateway, web push keys) is in the plan as waiting on the founder, unbuilt.
- **Privacy holds:** no guest accounts, no guest tracking, no phone number required. An order keeps only what the kitchen needs, and a pickup name is cleared after a day.
- **One writer for the tracker:** only Product edits `data/tracker.json`, in small docs pull requests, so merges don't collide.

## D3: Ordering's starting rules

2026-11-15, 04:00 IST. HQ's calls under D2 ("take you know decision till 8am for this task"), after an independent review of the ordering plan (PR #12). The founder can overrule any of them.

- **Place links (the QR on a table or the counter) are stored as they are, not hashed,** so an owner can reprint a lost card; D2's "no new secrets" rules out encrypting them. This is the one exception to "TV links are stored only as hashes" in CLAUDE.md, on four conditions:
  - a place link grants only the public menu and an order the kitchen must accept, never owner data;
  - it is at least 128 bits of randomness and is never logged;
  - order status links stay hashed;
  - recovery is "New QR code" plus pausing that place, and a test checks that no Tables page or action returns another restaurant's links.
- **Retention:** orders are kept 30 days. Pickup names and notes are cleared after 24 hours, and that ships with the first ordering slice (MT-90), not last.
- **The ordering day** ends at a business-day cutoff, 04:00 outlet time by default (as dayparts already treat the small hours as the night before), not at midnight. Order numbers restart at the cutoff.
- **Caps count only Placed orders** (waiting to be accepted): 10 per table link, 40 on the Counter link, 60 per outlet, enforced inside the insert. Per-link rate limits apply to order submits only; menu reads are limited per address only. Up to 30 lines per order and 20 of one dish.
- **A Placed order not accepted in 15 minutes closes** as rejected ("Not accepted in time"). The guest's 5-minute "not accepted yet" message stays as a fallback; board liveness and auto-pause are what catch missed orders.
- **Orders get a table in the database** (an ADR in MT-90), not one JSON document, because orders are written concurrently.
- **The orders items stay in Backlog, phase v1,** in build order. Moving them to Planned is a separate HQ call when building starts, with CLAUDE.md's "Planned holds only v0" line changed at the same time.
- **Price of ordering (Free or Plus) is the founder's.** HQ doesn't set prices. Until the founder answers, ordering stays off the pricing page.
