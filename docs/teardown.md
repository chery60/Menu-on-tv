# Competitor teardown

Researched 18 October 2026. This doc builds on the [market research](research.md): that doc maps the market, and this one takes the products apart. Most sources are vendors writing about themselves, so treat their claims as claims. "Not found" means public material didn't show it, not that it doesn't exist.

The plan built from this teardown is the [platform plan](platform-plan.md).

## How we reverse-engineered the market

1. **Captured each product with REA.** We loaded 13 competitor pages in an isolated headless Chrome (DevTools on port 9333). We listed every third-party service each page loaded, then captured each page with REA's `inspect_web_page` (DOM, accessibility text, scripts and network) with those origins allowed. Every capture is a retained Evidence record (IDs below).
2. **Took a shipped player apart.** We ran REA's `analyze_web_bundle` on ScreenCloud's public web player, the closest thing on the market to "a screen is a link", and captured its pairing screen with `capture_web_screenshot`.
3. **Read the vendor stack as a sales motion.** Demo booking, CRM and account intelligence (ZoomInfo, Clearbit, Leadfeeder) point to sales-led. A/B testing and product analytics point to self-serve. Reseller and white-label pages point to channel sales.
4. **Reduced each product to its loop and its money.** For each one: the job a restaurant hires it for, the loop from setup to daily use, how it earns, and what the owner still does by hand.
5. **Worked backwards from the outcome.** "A café owner puts a menu that sells on the TV in ten minutes, changes it from their phone, and the screen pays for itself." Then we listed the shortest chain of capabilities that gets there.

### REA evidence

| Page | REA Evidence | What it showed |
| --- | --- | --- |
| Yodeck pricing | `ev_b684f355bab7` | Free for 1 screen. Basic $8, Premium $12, Enterprise $16 per screen a month, billed annually. Free players with annual plans. "Trusted by over 65,000 companies". Reseller and white-label program. Hardware warranty at $1 per player a month. Embeddable feeds from $6 a month. "Yodeck AI Agent & API" |
| OptiSigns pricing | `ev_f044d013aa45` | Free on up to 3 screens with the OptiSigns logo, 1 GB. Standard $10, Pro Plus $15, Engage $30, Enterprise $45 (minimum 25 screens) per screen a month; 10% off annually. Add-ons: video wall $25, background music $15, wireless presentation $20. "Ads Portal: Free". "Live TV Ads Overlay". Proof of play, approval workflow |
| ScreenCloud pricing | `ev_46112f145089` | Core from $20 per screen a month, billed annually. "ScreenCloud Arc": "you name the outcome you want, and it builds toward it". Free device on annual plans. QR code metrics |
| ScreenCloud web player (bundle) | `ev_c3a4eb80de02` | React single-page app: 857 KB main bundle plus 108 KB of polyfills. Registers through a `/_internal/players` POST. Firebase sign-in (`identitytoolkit.googleapis.com`) and a realtime socket (the `previous_websocket_failure` key) for live updates. Stores its URL under `__sc_player_url` |
| ScreenCloud web player (screen) | `ev_0815edfad125` | Pairing screen: a 6-character code in huge type ("9T7F7E"), two numbered steps, and a QR code "to log in and pair this screen" |
| Displai (raydiant.com/pricing redirects here) | `ev_406f365164e8` | Raydiant now presents as Displai. "Digital Signage That Drives Revenue". Book a demo, no prices. Plug-and-play hardware, app marketplace, rules engine, "Displai InSight (A.I.)" visitor analytics, 10 to 10,000 locations |
| Pickcel pricing | `ev_7ff178bb9c9e` | Page rendered without readable text in headless Chrome; prices read with a plain fetch instead: Professional $13.50, Business $22.50 per device a month, billed annually; 14-day trial |
| Juuno pricing | `ev_b9b845334a8b` | 7-day free trial. Business $5 and Growth $9 per screen a month. White label at $100 a month including 20 screens, then $5 per extra screen. Built on Framer |
| Loop TV for business | `ev_e556877a5080` | Sign up and Loop ships a player in 3 to 5 days. "30+ content channels", "Exclusive AI-generated content", "Create your own ads or use templates", "Increase customer dwell time and spending" |
| Atmosphere | `ev_90960c56edab` | Free streaming TV for businesses, paid by ads. "Atmosphere TV dedicates the first ad break after our eye-catching content solely to your business". Preprogrammed device, 5-minute setup, 35+ channels, digital signage tools, trivia |
| Petpooja Digital Display System | `ev_9da2d926b933` | Add-on inside Petpooja POSS. "Turn every TV into a live menu". Install the app on Android TV 7.1.1+, scan a QR from the Merchant app. Each TV gets its own playlist. Offline: keeps playing the last synced content. Copy in Hinglish: "kuch aur le lein?", "Aaj ka khaas" |
| Fugo pricing | `ev_ec03aeadd4f3` | Essential $20, Core $30, Enterprise $40 per screen a month. One free watermarked screen. Own Windows NUC and Chromebox players. WhatsApp chat on the pricing page |
| Kitcast pricing | `ev_b0e395e05be2` | Starter $7, Pro $10 per screen a month. Native Apple TV. "AI content generation". Publishes a price table against nine named rivals |

Not captured: Mandoe's pricing URL returned 404. Fugo's web-player help article returned 404.

## The loop every product shares

Every menu screen, from a ₹5,000 TV in a chai shop to a drive-through wall at a burger chain, runs the same loop. Products differ in which steps they do for the owner.

| Step | What happens | What the owner still does by hand on most products |
| --- | --- | --- |
| 1. Make | Turn the menu into screen content | Retype every item, find photos, hire a designer or learn Canva |
| 2. Lay out | Decide what shows where and for how long | Pick from generic templates that weren't made for menus |
| 3. Connect | Get content onto the TV | Buy a player, install an app, type a pairing code with a remote |
| 4. Run | Keep it right every day | Change prices, mark sold-out items, swap breakfast for lunch |
| 5. Sell | Push combos, specials and offers | Design each promo by hand, remember to schedule it |
| 6. Prove | Show the screen worked | Nothing. Proof-of-play logs exist; sales impact doesn't |
| 7. Earn | Turn screen time into money | Not possible below 100 screens |

Generic signage tools cover steps 3 and 4. POS add-ons cover 4. Ad-funded TV covers 3 and 7, for itself. Nobody covers 1, 5 and 6 well, and nobody covers 7 for the restaurant.

## Teardowns

### Group 1: generic signage software

#### Yodeck
- **Hired for:** cheap, reliable screens across many sites.
- **Loop:** sign up, get a free Raspberry Pi player with an annual plan, build playlists from 800+ templates and 90+ apps, schedule.
- **Money:** per-screen subscription; hardware is the hook (free players with annual plans) and the warranty is an add-on. A partner program resells it under other brands.
- **Sales motion:** self-serve with experiments (Kameleoon), HubSpot, Intercom chat, server-side tracking.
- **Worth copying:** free for one screen, a forever plan with no card. "Players included" removes the hardware question.
- **Avoid:** a template library so big the owner can't choose.

#### OptiSigns
- **Hired for:** a feature-rich signage system with many integrations.
- **Loop:** free on three screens with a logo, then paid. Designer studio, 100+ apps, kiosks, proof of play.
- **Money:** per-screen tiers ($10 to $45), hardware, add-ons per screen (video wall, music), and an Ads Portal beta where networks of 100+ screens sell ad time directly to advertisers (per play or per screen per day).
- **Sales motion:** heavy demand generation and account intelligence: ZoomInfo, Clearbit, G2, OptinMonster pop-ups, Customer.io.
- **Worth copying:** a free plan that brands the screen (free marketing); per-play and per-screen-day ad pricing; the owner approves every campaign.
- **Avoid:** ads only for big networks; too many tiers.

#### ScreenCloud
- **Hired for:** polished signage for offices and multi-site businesses.
- **Loop:** pair a screen with a 6-character code or QR, then manage content in Studio. Arc is a goal-driven AI layer.
- **Money:** per screen from $20, free device on annual plans, premium apps.
- **The player:** a public web page that shows a pairing code, registers itself, then listens on a realtime socket for changes. Caches for offline. ScreenCloud itself advises against relying on TV browsers.
- **Worth copying:** the pairing screen (giant code plus QR); live push updates instead of polling; outcome-first AI ("name the outcome").
- **Avoid:** a heavy player bundle (nearly 1 MB of JavaScript) on weak TV hardware.

#### Fugo, Kitcast and Juuno
- **Fugo:** $20 to $40, a design studio, its own NUC and Chromebox players, one free watermarked screen, WhatsApp chat on pricing.
- **Kitcast:** $7 to $10, native on Apple TV, AI content generation, and a public price table against nine rivals.
- **Juuno:** $5 or $9 per screen, runs in the TV's browser, Canva integration, white label for $100 a month with 20 screens. Calls TV browsers buggy and has stopped recommending Fire TV sticks in 2026 ([Juuno players](https://juuno.co/players)).
- **Worth copying:** honest comparison tables; WhatsApp as a sales and support channel; a white-label tier for agencies and installers.

#### Pickcel (India)
- **Hired for:** signage for Indian brands and chains.
- **Money:** per device, $13.50 or $22.50 a month billed annually; around ₹810 to ₹900 a month in INR (secondary sources).
- **Sales motion:** B2B: Leadfeeder visitor identification, Zoho PageSense, Mixpanel.
- **Worth copying:** local presence and INR invoicing.
- **Avoid:** prices in dollars and a 14-day trial for a café owner who decides by trying.

### Group 2: POS add-ons

#### Petpooja Digital Display System (India)
- **Hired for:** a menu on the TV for restaurants that already run Petpooja POS.
- **Loop:** install the app on an Android TV, scan a QR in the Merchant app, upload food photos and videos. Each TV gets a playlist. Sold-out items and price changes sync from the POS.
- **Money:** keeps the POS subscription sticky; sold as an add-on.
- **Worth copying:** Hinglish copy ("kuch aur le lein?"), "if your team can use WhatsApp, they can run this", different playlists per TV (entrance, dining, billing counter), keep playing offline.
- **Avoid:** photo carousels that don't help the guest read prices; only works for one POS.

#### Square Digital Menus via Displai, and Toast
- Square restaurants can sync menus to boards through Displai's marketplace app ([Raydiant marketplace](https://raydiant.com/marketplace/square-digital-menus)). Toast publishes a cookbook for partners building menu signage on its API ([Toast developer docs](https://doc.toasttab.com/doc/cookbook/apiBuildingDigitalSignage.html)).
- **Lesson:** POS companies want signage partners. Integrations are a channel, not a threat.

### Group 3: enterprise restaurant signage

#### Displai (formerly Raydiant)
- **Hired for:** in-location experience for brands with many locations: menu boards, kiosks, employee screens, analytics.
- **Money:** enterprise contracts with hardware and onboarding, demo-led, no public price.
- **Proof points:** Nation's Giant Hamburgers rolled dynamic pricing boards to all 28 locations ([Verdict Foodservice](https://www.verdictfoodservice.com/news/nations-giant-hamburgers-raydiant-digital-pricing/)).
- **Worth copying:** a rules engine (if this, show that), proof of playback, "drive revenue" positioning.
- **Avoid:** the price and the sales cycle. That market is served; ours isn't.

### Group 4: ad-funded venue TV

#### Atmosphere
- **Hired for:** free, guest-friendly TV that replaces cable, plus some signage.
- **Loop:** order a preprogrammed device, set up in minutes, pick from 35+ channels, add your own messages in the first ad break.
- **Money:** advertisers. The venue pays nothing and gets the first ad break; the rest of the breaks are sold.
- **Worth copying:** "free because brands pay"; giving the venue the first slot; trivia that keeps guests watching.
- **Avoid:** the venue's menu as an afterthought; no ad revenue share.

#### Loop TV
- **Hired for:** music videos and free TV in bars and restaurants.
- **Loop:** request a player, plug in, stream; add your own promos from a dashboard.
- **Money:** advertising, sponsorships, branded content. Venues get rewards, not a share.
- **Worth copying:** shipping a free player removes the hardware question.

#### Indian restaurant DOOH networks
- Fodxpert (kiosk screens at table eye level in 500+ restaurants), Enkon (programmatic screens in cafés, fine dining and lounges in five metros), OOH Media (100+ screens across Blue Foods' restaurants).
- **Lesson:** Indian advertisers already buy restaurant screens. They buy them from networks, because single venues are too small to sell. We become the network the restaurant controls.

## What the shipped player taught us

From `ev_c3a4eb80de02` and `ev_0815edfad125`:

- **Pairing:** a 6-character code is the norm, shown huge, with a QR for phones. We keep this and add a second path: the link itself can carry a secret screen token, so a restaurant can open `menutelly.com/s/<token>` on the TV and skip pairing entirely.
- **Updates:** ScreenCloud keeps a realtime socket open. On cheap TVs a socket can drop silently. We plan a socket for speed plus a slow heartbeat poll as a safety net, and a daily reload to clear memory.
- **Weight:** about 1 MB of JavaScript before content. Our target is under 100 KB for the player, with motion done in CSS, because weak TV browsers are the failure point every vendor names.
- **Identity:** the player keeps its own URL and registration in storage. If a TV clears storage, the screen must recover without a site visit: the token in the link does that.

## Gap map

| Need | Generic signage | POS add-on | Ad-funded TV | Enterprise | MenuOnTV |
| --- | --- | --- | --- | --- | --- |
| Make the menu for me | Templates | Photo upload | No | Agency service | **Photo of the paper menu to a live board, by AI** |
| Readable from 3 m in 3 s | Up to the owner | Up to the owner | n/a | Designers | **Enforced by every layout** |
| Change from my phone | Web app | Yes | Promos only | Yes | **Yes, plus WhatsApp later** |
| Sold out and today's special in one tap | Manual | Yes | No | Rules engine | **Yes** |
| Menu plus my own promos, split or rotating | Zones, by hand | Carousel | First ad break | Yes | **Six ready layouts with ad slots** |
| India: ₹ pricing, veg marks, calories, Hindi | Partly (Pickcel) | Yes (Petpooja) | No | No | **Yes** |
| Proof it sells | Proof of play | No | No | Analytics | **Sales lift per featured item (with POS)** |
| My screen earns money | Only 100+ screens | No | Not for me | No | **Local ad network with revenue share (v2)** |
| Works without buying hardware | Mostly | Android TV | Ships a device | Ships hardware | **A link, with a cheap stick as backup** |

## What we take, what we avoid

**Take:** free for one screen; pairing code plus QR; offline playback; per-TV playlists; one-tap sold-out; first ad slot belongs to the restaurant; per-play and per-screen-day ad pricing with owner approval; WhatsApp as a channel; POS integrations as distribution.

**Avoid:** blank-canvas editors; template overload; dollars-only pricing in India; heavy players; ad-funded entertainment that takes the screen away from the menu; promising ad income before a neighbourhood has enough screens.
