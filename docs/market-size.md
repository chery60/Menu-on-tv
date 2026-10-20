# Market size, money and go-to-market

Researched 18 October 2026. This doc sizes the market, explains how competitors make money, sets out how MenuOnTV makes money, and answers the question every restaurant owner will ask: why should I take this? It builds on the [market research](research.md) and the [competitor teardown](teardown.md), and feeds the [platform plan](platform-plan.md).

Every figure is labelled. **Observed** means we saw it on a competitor's live site with REA. **Sourced** means a public report. **Estimate** means our own arithmetic, with the inputs shown. Counts in this market are thin, so ranges matter more than point values.

## The short answer

- **The category is large and growing.** Digital signage in quick-service restaurants is about $3.4 billion in 2026, growing about 13% a year (sourced). Signage as a whole is about $31 billion (sourced).
- **Our first market is small restaurants that nobody serves well.** Independent cafés, quick-service counters, bakeries, sweet shops and juice bars already own a TV and a printed menu. Generic signage asks them to design; POS add-ons only serve one POS; ad-funded TV takes the screen away from the menu.
- **Software alone is a modest business in India.** At ₹499 per screen per month, India's beachhead is worth roughly ₹20 to 60 crore a year in subscriptions at realistic penetration (estimate). It grows four ways: a local ad network that pays restaurants, brand-sponsored screens, chains, and English-speaking markets abroad at $8 per screen.
- **The way in is a 60-second demo of the owner's own menu on the owner's own TV.** Then free for one screen, with a small "Powered by MenuOnTV" badge that other owners see when they eat out.
- **The answer to "why should I take this?"** It makes your menu for you, it sells while you work, it works on the TV you already have, it costs nothing to start, and later it can pay for itself.

## How competitors make money

| Model | Who uses it | How it works | What we take |
| --- | --- | --- | --- |
| Per-screen subscription | Yodeck, OptiSigns, ScreenCloud, Fugo, Kitcast, Juuno, Pickcel | $5 to $45 per screen per month (observed). Annual prepay discounts of 10 to 29% (observed) | Yes. Simple, priced per screen, in rupees |
| Free tier as a funnel | Yodeck (1 screen), OptiSigns (3 screens with logo), Fugo (1 watermarked screen) | A free screen that carries the vendor's brand (observed) | Yes: one free screen with a small badge |
| Hardware as the hook | Yodeck (free players on annual plans), ScreenCloud (free device), Fugo (NUC, Chromebox), Loop and Atmosphere (ship a device) | Remove the "what box do I buy?" question (observed) | Yes, later: a preloaded stick at cost, free with annual plans |
| Add-ons | OptiSigns (video wall $25, music $15), Yodeck (warranty $1 per player, feeds from $6) | Small monthly extras per screen (observed) | Some: POS sync, extra outlets, design service |
| Services | Yodeck Enterprise+, Fugo projects, Displai onboarding | Design, rollout, training (observed) | A one-time "we build your menu" for owners who won't |
| Channel and white label | Yodeck partners, Juuno white label ($100 a month for 20 screens) | Installers and agencies resell (observed) | Yes, in v1: installers and POS resellers |
| Advertising | Atmosphere, Loop, Indian restaurant DOOH networks | The venue gets free TV; the network sells ad time (observed and sourced) | Yes, but the restaurant controls and shares in it (v2) |
| Ad tools for big networks | OptiSigns Ads Portal | Networks of 100+ screens sell ad time per play or per screen per day, and invoice advertisers directly (sourced) | The pricing units, yes; the 100-screen floor, no |
| POS bundling | Petpooja, Square via Displai | Signage keeps the POS subscription sticky (observed) | Partner, don't fight: be the best menu layer on top |
| Enterprise contracts | Displai, Coates, Wand | Hardware, software and analytics for brands with many locations (observed) | Later, for chains of 10 to 200 outlets |

**The pattern:** the cheap end earns per screen and wins on self-serve; the expensive end earns on contracts and services; the free end earns on ads and gives the venue nothing. Nobody combines a cheap, self-serve product with ad income that flows back to the venue.

## How MenuOnTV makes money

| Stream | When | Price (to validate) | Notes |
| --- | --- | --- | --- |
| **Free** | v0 | ₹0 for 1 screen | All layouts, own promos, small "Powered by MenuOnTV" badge, 1 outlet |
| **Plus** | v0 | ₹499 per screen per month, or ₹4,999 a year ($8 abroad) | No badge, dayparts, scheduled promos, more outlets, QR codes, Hindi and regional scripts |
| **Pro** | v1 | ₹999 per screen per month ($15 abroad) | POS sync, sales-lift reports, brand kit, approvals, multi-outlet control |
| **Chains** | v1 | Custom, from 10 outlets | Central menus with local prices, roles, onboarding |
| **Done-for-you setup** | v0 | ₹1,999 once, free with a yearly plan | We build the menu and promos from photos, and send a stick if needed |
| **MenuOnTV Stick** | v1 | At cost (about ₹3,000), free with a 2-year plan | Preloaded Android TV box that boots straight into the screen |
| **Local ad network** | v2 | Owner keeps 50% of ad revenue on their screens | Local businesses book screens by area, per screen per day; owners approve each ad |
| **Brand-sponsored screens** | v2 | Brand pays the Plus plan and gets one slot per loop | Digital version of the branded menu boards drinks and ice-cream brands give out today (assumption: validate in field interviews) |
| **Installer and POS partners** | v1 | 20 to 30% recurring share, or white label | Channel to many restaurants at once |

**Anti-goals for money:** no cameras or face analytics on guests, no selling restaurant or guest data, no ads the owner hasn't approved, no ads that cover the menu while guests order.

## Who buys

| Buyer | Count | Basis | Confidence |
| --- | --- | --- | --- |
| India QSR outlets | 104,000+ (2023) | Mordor Intelligence via Statista | Sourced |
| India cafés, bakeries, sweet shops, juice and ice-cream counters | 50,000 to 150,000 | We assume 0.5x to 1.5x the QSR count; NRAI's outlet tables would firm this up | Estimate, low |
| India beachhead: counter-ordering outlets in the top 30 cities | 150,000 to 250,000 | The two rows above, mostly urban | Estimate, low |
| India chains with 10+ outlets (FSSAI calorie rule applies) | Hundreds of brands | FSSAI rule scope; no public count found | Unknown |
| US restaurant and foodservice outlets | More than 1 million | National Restaurant Association | Sourced |
| UK, UAE, Singapore, Australia independents | Not sized | Second-wave English markets | Not sized |

## Sizing

### India subscriptions (estimate)

Inputs: 200,000 beachhead outlets (midpoint), 1.5 screens per paying outlet, ₹499 per screen per month (₹6,000 a year after the annual discount).

| Paying share of the beachhead | Paying outlets | Yearly subscription revenue |
| --- | --- | --- |
| 5% (year 3) | 10,000 | ₹9 crore (about $1.1 million) |
| 15% (year 5) | 30,000 | ₹27 crore (about $3.2 million) |
| 30% (category leader) | 60,000 | ₹54 crore (about $6.5 million) |

### India ads (estimate, the bigger lever)

Inputs: a busy café screen is seen by 150 to 400 guests a day; a local advertiser books a screen for ₹15 to ₹40 a day; a screen carries 3 to 5 local advertisers once its neighbourhood is dense.

- Gross ad revenue per filled screen: ₹1,400 to ₹6,000 a month. The owner's 50% is ₹700 to ₹3,000, more than the Plus plan.
- 20,000 screens with ads at ₹3,000 gross a month is about ₹72 crore a year gross, of which MenuOnTV keeps half.
- These inputs are untested. Validate with 10 local advertisers (gyms, salons, coaching centres, clinics, real estate, events) before promising any owner an amount.

### Abroad (estimate)

At $8 per screen and 1.5 screens per outlet, every 10,000 paying outlets abroad is about $1.4 million a year. The US alone has more than 1 million outlets, so the ceiling abroad is far higher than India's; the cost to reach them is higher too.

### Top-down check

QSR digital signage is about $3.38 billion in 2026 (sourced). Most of it is hardware and enterprise rollouts. Our India subscription case at 30% penetration is about 0.2% of that. The plan doesn't depend on a big share of the category; it depends on owning the small-restaurant segment and the ad network on top of it.

## Why anyone should take MenuOnTV

The pitch, in the order an owner cares about it:

1. **It makes your menu for you.** Take a photo of your paper menu. In about ten minutes you have a menu board that reads from across the room, with your prices, veg marks and photos. No designer, no Canva.
2. **It sells while you work.** Specials, combos and add-ons rotate in front of every guest. "Sold out" and "today's special" are one tap on your phone, and every screen changes within seconds.
3. **It works on the TV you already have.** Open one link on the TV's browser. If the TV can't, a small stick does it. No installer, no wiring.
4. **It costs nothing to start.** One screen is free forever. Pay only when you want more screens or no badge.
5. **Later, it pays for itself.** When enough cafés near you are on MenuOnTV, local businesses can book your screen. You approve every ad and keep half.
6. **It keeps you on the right side of the rules.** Veg and non-veg marks, calories and allergens show the way FSSAI asks, on every screen, from one menu.

One sentence for the shop floor: **"Your menu, on the telly, selling. Free for one screen."**

## How to approach a restaurant

### Who to visit first

- **Best fit:** counter-ordering outlets where guests stand and decide: cafés, QSR, bakeries, sweet shops, juice bars, ice-cream parlours, chaat and roll counters, food-court stalls, cloud-kitchen pickup points.
- **Signals in the shop:** a TV already on the wall (often off or playing music videos); a printed flex menu with stickers over old prices; lots of combos; a queue at peak hours; an active Instagram page.
- **Who decides:** the owner in an independent outlet; the brand or operations manager in a chain of 5 to 50.
- **Good timing:** a menu or price change, a new outlet, festive season (Diwali, Eid, Christmas, IPL), a GST or milk-price hike that forces a reprint.

### The 60-second demo

1. "Can I show you your own menu on your TV in one minute?"
2. Photograph their menu. The AI builds the board on the rep's phone while they watch.
3. Open the screen link on their TV (TV browser, or the rep's demo stick in the HDMI port).
4. Hand them the phone: they tap "sold out" on an item and watch the TV change.
5. Leave it running, free. Set a follow-up in 7 days: "Which promo did guests ask about?"

### Objections

| They say | We say |
| --- | --- |
| "I already have a printed board." | "Keep it. When prices change, this changes in seconds and you never reprint." |
| "My TV plays cricket." | "Schedule the menu for when there's no match, or put it on a second TV. Live sport stays yours." |
| "Our internet is patchy." | "The screen keeps playing the last menu offline and catches up when the internet is back." |
| "I don't have time." | "It's built from a photo in ten minutes, and you change it from your phone." |
| "It's expensive." | "One screen is free forever. More screens cost less than a day's milk bill." |
| "Will it work on my TV?" | "Any TV with a browser, or any TV with an HDMI port and a small stick." |
| "Are you watching my customers?" | "No cameras, no tracking of guests. We count plays, not people." |

### Channels, in order

1. **Field sales in one neighbourhood at a time.** Density matters twice: word of mouth between owners, and later an ad network that local businesses can buy.
2. **The free-screen badge.** Owners eat at each other's places. Every free screen is a small billboard to the next customer.
3. **POS and billing partners** (UrbanPiper, Restroworks, DotPe and smaller POS vendors). A menu layer their customers can switch on, with a recurring share.
4. **Signage installers and TV dealers** as resellers, with a white-label option.
5. **WhatsApp and Instagram content for owners.** Before and after videos of real boards.
6. **Search and AI answers.** Pages that answer "digital menu board for restaurant India", "TV menu display", "menu board app free", plus `llms.txt` so AI assistants can describe and recommend MenuOnTV accurately.
7. **Associations and malls.** NRAI chapters, food-court managers who want every stall's board to match.

### Funnel targets (to validate in the pilot)

| Step | Target |
| --- | --- |
| Walk-in to demo | 60% |
| Demo to free screen left running | 50% |
| Free to paid within 90 days | 20% |
| Monthly paid churn | Under 3% |
| Time from sign-up to first screen live | Under 10 minutes (median) |

### Launch sequence

- **Pilot (30 outlets, one neighbourhood).** Prove the demo, the 10-minute setup and the player on real TVs. Collect 10 interviews on price.
- **City (300 outlets).** Add a partner channel. Launch Plus.
- **Ad pilot (once 40 screens sit within 2 km).** Sign 5 to 10 local advertisers, run 4 weeks, pay owners their share, publish the numbers.

## Is v0 right?

Checked against the research and the teardown:

- **Right:** photo-to-menu, layouts that enforce legibility, phone quick actions, a link-based player with offline cache, a free screen. These answer steps 1 to 5 of the loop that competitors leave to the owner.
- **Moved earlier:** veg marks and calorie fields in the menu model from day one. They are cheap now and painful to retrofit.
- **Kept out of v0:** the ad network. It needs density first. v0 builds the ad slots and the restaurant's own promos, so v2 only adds buyers.
- **Added to v0:** a "Powered by MenuOnTV" badge on free screens and a demo mode for field reps. Both are distribution, not features.
