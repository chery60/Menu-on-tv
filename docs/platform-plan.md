# Platform plan

Written 18 October 2026, from the [market research](research.md), the [competitor teardown](teardown.md) and [market size and go-to-market](market-size.md). The rules for what guests see are in the [screen design playbook](screen-design.md); the system design is in [architecture](architecture.md). The tracker at `/tracker` holds every item below; the keys (MT-n) match.

## Who uses MenuOnTV

| Person | Where | What they need |
| --- | --- | --- |
| **Owner** | Phone, at the counter | A menu on the TV that sells, changed in seconds, at a price that makes sense |
| **Staff** | Owner's phone or their own | Sold out, today's special, order-ready numbers |
| **Guest** | In front of the TV, 3 to 5 metres away | What can I get, how much, what's the deal, in a glance |
| **Field rep** | Phone and a demo stick | A 60-second demo of the owner's own menu |
| **Partner** (v1) | Web | Installers and POS vendors who bring many restaurants |
| **Advertiser** (v2) | Phone or web | A local business that wants to reach guests nearby |

## Principles

1. **Phone first.** Everything an owner does daily works one-handed on a 360 px screen.
2. **Never a blank TV.** Offline, the screen plays the last menu. Updates swap between slides, never mid-slide.
3. **The layout enforces legibility.** Owners choose; they can't make prices unreadable.
4. **AI drafts, the owner approves.** Menus from photos, promo copy and translations are proposals. AI never invents a price.
5. **The menu is data, not a picture.** That's what makes sync, languages, calories and lift reports possible.
6. **The owner controls every ad.** Their own promos first, local ads only after approval, never over prices while guests order.
7. **Plain words.** Short sentences, rupees, familiar terms. Hinglish where the owner writes it.

## Product map

```
Owner app (phone web app)                     Screen player (any TV, a link)
  Today: quick actions, screens status          /s/<token>   wall-clock loop, layouts, themes
  Menu: editor, photo import, languages         offline cache, live updates, health heartbeat
  Promos: studio, AI writer, schedules
  Screens: layouts, themes, dayparts, pairing  Rep mode (v0)    demo from a photo, hand over
  Plan and billing                             Partner portal (v1)  referrals, white label
  Reports: proof of play (v0), lift (v1),      Advertiser portal (v2) book by area, pay, report
           earnings (v2)                       Admin: ad review, support, payouts
```

## Phases

| Phase | Outcome | Exit criteria |
| --- | --- | --- |
| **P0 Foundations** | Research, plan, name, site and tracker | Name and domain decided; 15 owner interviews; TV lab passed on 8 of 10 devices |
| **v0 First screen live** | An owner photographs the menu, picks a layout, opens a link on the TV and runs it from the phone | 30 pilot outlets live; median setup under 10 minutes; 20% free to paid in 90 days |
| **v1 Sell more** | Screens prove and raise sales; partners bring restaurants | Lift report used weekly by half the paid owners; two POS adapters; first partner payouts |
| **v2 Screens that pay** | A local ad network the owner controls and shares in | Ad pilot: 10 advertisers, owners paid, 50% renewal |
| **v3 Platform** | Chains, API, agents and programmatic demand | One chain over 50 outlets; one exchange live |

## v0 scope, in build order

This order is the Planned column on the board.

| # | Item | Key | Why it's here |
| --- | --- | --- | --- |
| 1 | Sign in and set up the restaurant | MT-15 | Everything hangs off the restaurant |
| 2 | Menu model with veg marks, calories and allergens | MT-16 | Data first; compliance fields are cheap now and painful later |
| 3 | Menu editor on the phone | MT-17 | Owners edit at the counter |
| 4 | Paste or spreadsheet import | MT-18 | The fallback when a photo fails |
| 5 | AI menu import from a photo | MT-19 | The wedge and the demo |
| 6 | Six layouts in two brand themes | MT-20 | Prototype running at `/screen/demo` |
| 7 | Screen player on a link | MT-21 | Prototype running; offline cache and reload next |
| 8 | Pairing with a link, a code or a QR | MT-22 | Getting onto the TV without a remote ordeal |
| 9 | Live updates in under ten seconds | MT-23 | Sold out has to land now |
| 10 | Loops and dayparts | MT-24 | Breakfast isn't dinner |
| 11 | Quick actions | MT-25 | The daily reason to open the app |
| 12 | Promo studio with six templates | MT-26 | How screens sell |
| 13 | AI promo writer | MT-27 | Owners know what to push, not how to say it |
| 14 | Hindi on screen | MT-28 | A gap no generic tool fills |
| 15 | FSSAI display mode | MT-29 | Calories and allergens from the same menu |
| 16 | Screen health and offline alerts | MT-30 | Know before guests do |
| 17 | Proof of play | MT-31 | Base for lift (v1) and ads (v2) |
| 18 | Privacy and security baseline | MT-32 | Public links, private menus |
| 19 | Free badge and Plus billing | MT-33 | The business, and the badge as marketing |
| 20 | Ten-minute onboarding | MT-34 | Stitches the flow together |
| 21 | Field demo mode | MT-35 | The main sales channel |
| 22 | Product analytics and funnel | MT-36 | What the pilot measures |
| 23 | Pilot in one neighbourhood | MT-37 | v0 is done when owners keep screens on |

Before v0 starts, three P0 items must close: the name and domain (MT-4), owner interviews (MT-11) and the TV compatibility lab (MT-12).

## Key flows

### First screen in ten minutes (v0)
1. Sign in with a phone number.
2. Photograph the menu. The AI reads it; uncertain prices are highlighted. Approve.
3. Pick a layout and a theme on a live preview.
4. On the TV, open the short link or scan the QR from the pairing page. The menu appears.
5. Nudge: "Add today's special?" One tap.

### Sold out in one tap (v0)
Home shows today's items with toggles. Tap "Paneer roll" off. Within seconds every screen hides it or shows "sold out", between slides.

### Promo in thirty seconds (v0)
Pick a template ("Combo"), pick items from the menu, the price fills itself, the AI suggests three headlines, pick one, schedule it. Done.

### An ad, approved (v2)
A gym books 20 screens in the area for a week. Each owner gets "FitZone wants to show this ad on your screen for ₹20 a day. Approve?" Approved ads join the loop, at most one slot in three. Earnings show daily and pay out monthly.

## More ideas worth adding

Beyond the core plan, each of these is a tracker card:

| Idea | Why it's valuable | Key |
| --- | --- | --- |
| Update the menu over WhatsApp | Owners already run their business there | MT-51 |
| Sales lift per featured item | Turns "sells more" into a number per restaurant | MT-39 |
| Order-ready numbers on screen | Replaces a separate token display | MT-40 |
| Loyalty QR with WhatsApp opt-in | The screen grows the owner's own customer list | MT-43 |
| Happy-hour pricing rules | Fills quiet hours, shown the moment they start | MT-46 |
| Weather and time triggers | Cold coffee on hot afternoons, chai when it rains | MT-48 |
| Festival packs | When owners spend on promotion | MT-49 |
| Menu engineering suggestions | Feature the items that earn the most | MT-52 |
| Brand-sponsored screens | Digital version of the branded boards brands give out today | MT-67 |
| Guest trivia while waiting | Keeps eyes on the screen, lifts ad value | MT-71 |
| Live score band on match nights | Cricket nights, if the data licence allows | MT-72 |
| MCP server for AI assistants | Owners' assistants can run the menu, with approvals | MT-75 |

## What we deliberately don't build

- Cameras, face detection or any tracking of guests.
- A general-purpose signage canvas. We are a menu and promo product.
- Ads the owner hasn't approved, or ads over prices during ordering.
- Our own POS. We integrate with the owner's.
- Entertainment channels. The screen is the restaurant's.
