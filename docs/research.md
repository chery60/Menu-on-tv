# Market research: menu screens and screen ads for restaurants

Researched 18 October 2026. Every number below has a source. Most sources are vendors writing about themselves, so treat their figures as claims, not facts. Stale or conflicting data is flagged where it appears.

For how each product works, step by step, see the [competitor teardown](teardown.md). Market size, how to sell to restaurants and the pitch are in [market size and go-to-market](market-size.md). The plan built from all three is the [platform plan](platform-plan.md).

## Executive summary

Restaurants already own the screen. Most cafés, quick-service counters and bakeries have a TV on the wall that plays cricket, music videos or nothing. A paper menu or a printed flex board hangs next to it, and changing a price means reprinting.

Three kinds of products compete for that TV, and none of them serves a small restaurant well:

1. **Generic signage software** (Yodeck, OptiSigns, ScreenCloud, Fugo, Kitcast, Juuno, Pickcel) charges $5 to $45 per screen per month. It is a blank canvas. The restaurant still needs a designer to make a menu that reads well from across the room.
2. **POS add-ons** (Petpooja's Digital Display System, Square Digital Menus through Displai) keep prices in sync but only for that POS's customers, with basic photo carousels.
3. **Ad-funded venue TV** (Atmosphere, Loop TV) is free because advertisers pay. It fills the TV with entertainment and ads. The restaurant's menu becomes a slide in someone else's channel, and the restaurant doesn't share the ad money.

**The gap:** a product that *makes the menu itself* (from a photo of the paper menu), lays it out to be read in three seconds from three metres, runs the restaurant's own promos between menu slides, and later lets small restaurants earn from local ads. Today only networks with 100 or more screens can sell their own ads (OptiSigns Ads Portal, observed).

**Recommendation:** start in India with independent cafés, quick-service outlets and bakeries. Free for one screen, a low per-screen price after that, and the TV only needs a link. Make "photo to menu board in ten minutes" the wedge, make "sells more" the retention, and make "your screen earns" the moat once screens cluster by neighbourhood.

## Landscape

| Product | How it earns | What it does best | Gap we can fill |
| --- | --- | --- | --- |
| Yodeck | Per screen: free for 1 screen, then $8, $12 or $16 a month (observed). Free players on annual plans, hardware warranty add-on | Cheap, huge template library (800+), Raspberry Pi players | Generic. A menu is one of hundreds of templates, built by hand |
| OptiSigns | Per screen: free for 3 screens with its logo, then $10 to $45 a month (observed). Hardware, add-ons, "Ads Portal" beta for networks of 100+ screens | Feature depth, many apps, proof of play | Small venues can't sell ads. Menu building is manual |
| ScreenCloud | Per screen from $20 a month (observed), free device on annual plans | Polished, enterprise, new "Arc" AI that works towards a goal | Price and enterprise focus |
| Fugo | $20, $30 or $40 per screen a month (observed), own NUC and Chromebox players | Design studio, dashboards | Office and dashboard focus |
| Kitcast | $7 or $10 per screen a month (observed), Apple TV native | Price, Apple TV, AI content generation | Apple TV is rare in Indian restaurants |
| Juuno | $5 or $9 per screen a month, white label at $100 a month with 20 screens (observed) | Lowest price, runs in a TV's browser, Canva | Calls TV browsers buggy itself; no menu engine |
| Pickcel (India) | $13.50 or $22.50 per device a month, billed annually ([pricing page](https://www.pickcel.com/pricing)); about ₹810 to ₹900 a month in INR ([Pickcel blog](https://pickcel.com/blog/digital-signage-india), [Techjockey](https://www.techjockey.com/detail/pickcel)) | Indian company, 80,000-screen footprint claimed ([Sixteen-Nine](https://www.sixteen-nine.net/?p=33063)) | Generic signage, sales-led |
| Petpooja Digital Display System (India) | Add-on to Petpooja's POS subscription (observed) | Sold-out and price changes from the POS app on the phone, offline playback | Only for Petpooja POS users; photo carousels, few layouts |
| Displai (formerly Raydiant) | Enterprise contracts, hardware, demo only (observed: raydiant.com/pricing now redirects to displai.ai) | Restaurants, kiosks, app marketplace, AI visitor analytics | Built for brands with 10 to 10,000 locations |
| Atmosphere | Free to businesses, paid by advertisers (observed) | 30+ entertainment channels, gives the venue the first ad break | The screen is Atmosphere's channel, not the restaurant's menu |
| Loop TV | Free player shipped to venues, ad-supported (observed) | Music videos, AI-generated content, own ads on screen | Same: entertainment-first. Venues get rewards, not a promised revenue share ([Sixteen-Nine](https://www.sixteen-nine.net/?p=36587)) |
| Indian restaurant DOOH (Fodxpert, Enkon, OOH Media) | Sell ad time on screens they install in restaurants | Fodxpert says 500+ restaurants ([Outlook Business](https://www.outlookbusiness.com/spotlight/news-wire/sajid-qureshi-completes-a-five-year-journey-in-revolutionizing-india-s-restaurant-dooh-advertising-with-fodxpert)); Enkon about 600 screens in 300 venues ([Media4Growth](https://www.media4growth.com/digital-ooh/lite/enkon-ooh-launches-pdooh-network-in-metro-cities-4541)) | Their screen, their ads. The restaurant's own menu isn't the point |

"Observed" means we saw it on the live site with REA, the reverse-engineering toolkit, on 18 October 2026. Evidence IDs are in the [teardown](teardown.md).

## Key findings

### 1. The screen is already there. The menu on it is not.
- Menu boards are the most common use of QSR screens: one survey says 82% of fast-food and QSR screens show a menu ([Kitcast statistics report](https://kitcast.tv/reports/digital-signage-statistics), vendor).
- Petpooja's own pitch is "turn every TV into a live menu", running on any Android TV the restaurant already owns, with "Works on any Android TV" and "Plug and play" (observed). India's largest restaurant POS treats the existing TV as the hardware.
- Juuno and Atmosphere both sell "use the TV you have". The cost of entry is now a link or a stick, not a $3,000 to $5,000 install per display ([display.stream](https://display.stream/choosing-the-best-digital-menu-board-displays-for-restaurants/), vendor).

### 2. Making the menu is the hard part, and nobody automates it
- Menu content usually has to be redesigned for a screen, which means paying a designer or learning a design tool ([Mvix](https://mvix.com/?p=7725), vendor).
- The tools sell templates and design studios: Yodeck (800+ templates), Fugo (content design studio), Kitcast and Juuno (Canva integration). All of them assume someone sits down and builds the board.
- We found no product that turns a photo of a paper menu into a screen layout. AI tools generate food pictures or board graphics to export by hand (Lovart, CapCut), not a live, editable menu ([Lovart](https://www.lovart.ai/blog/02-industry-digital-menu-board), [CapCut](https://www.capcut.com/ideas/ai-image/ai-image-for-menu-boards)).

### 3. Updating is the daily pain
- The most common complaint about older boards is that a price change means a ladder, a USB stick and a blank screen ([SmarterSign](https://smartersign.com/articles/dont-make-this-mistake-with-digital-menu-boards), vendor). Hard updates lead owners to skip promotions entirely.
- Petpooja leads with "Prices changed? Item sold out? New combo? Update from your phone" (observed). Sold-out in one tap is table stakes in India.

### 4. Screens sell, but the numbers are soft
- In a Dairy Queen-era test, items on the promotional playlist sold more year on year over 80% of the time (operator quoted in [Nation's Restaurant News](https://www.nrn.com/restaurant-finance/how-digital-menu-boards-help-drive-restaurant-sales), anecdotal, 2012).
- "3 to 5% higher average check" and "35% shorter perceived wait" circulate widely without a named study ([Menu Board Manager](https://menuboardmanager.com/the-impact-of-digital-menu-boards-in-quick-service-restaurants/), vendor). Treat as directional.
- Petpooja says "A guest takes 15 to 20 minutes to decide what to order" (observed, vendor claim). Whatever the true number, guests spend real time looking at the wall.
- **Implication:** we should measure lift ourselves. With POS data we can compare an item's sales while it is featured against when it isn't. That turns "sells more" from a claim into a number per restaurant.

### 5. Ads on restaurant screens are a real business, but not for the restaurant
- Atmosphere is free to venues and paid by advertisers, and gives the venue "the first ad break" (observed). Its dining and drinking venues were 45% of locations in 2023 ([Verdict](https://www.verdict.co.uk/atmosphere-media-streaming-tv/)).
- Loop's venues don't get a meaningful share of ad revenue, only rewards ([Sixteen-Nine](https://www.sixteen-nine.net/?p=36587)). A critic argues ad-funded TV puts advertisers ahead of the venue's guests ([ITSRelevant](https://articles.itsrelevant.com/2024/06/17/atmosphere-tv-may-not-businesss-best-interests-heart/)).
- OptiSigns' Ads Portal lets a network owner set prices (per play or per screen per day), approve campaigns and invoice advertisers directly, but only for networks of 100+ screens, in beta ([OptiSigns Ads Portal](https://www.optisigns.com/ads-portal)).
- India has about 185,000 DOOH screens, and digital is expected to be 17% of out-of-home revenue by 2027 (EY via [exchange4media](https://www.exchange4media.com/out-of-home-news/dooh-on-the-rise-not-a-future-bet-but-the-new-norm-143208.html)).
- **Implication:** a single café can't sell ads. A neighbourhood of 40 cafés on one platform can. That is the network effect we build towards in v2: the restaurant controls which ads run, and takes a share.

### 6. TV browsers are the weak link, and every vendor says so
- ScreenCloud's web player (`web.screencloud.com`) works, but ScreenCloud says it doesn't recommend it as the main solution and that smart-TV browsers are generally unreliable ([ScreenCloud help](https://help.screencloud.com/en/articles/10119973-screencloud-web-player)). Juuno calls the TV browser buggy and not ideal for long-term use ([Juuno players](https://juuno.co/players)).
- Amazon's new Vega OS sticks drop Android and lean on web apps ([Digit](https://www.digit.in/news/tvs/amazon-vega-os-launched.html)). The Fire TV Stick 4K Select costs ₹5,499 in India ([Digit](https://www.digit.in/news/audio-video/amazon-launches-fire-tv-stick-4k-select-with-vega-os-in-india-price-features-and-availability.html)).
- **Implication:** the "screen is a link" idea is right, but the player has to be engineered for weak browsers: tiny, CSS-only motion, offline cache, daily self-reload, and a thin Android TV wrapper for when the browser fails. That is an engineering moat, not a reason to avoid links.

### 7. Rules favour a menu engine over a picture
- In India, food businesses with a central licence or outlets in 10 or more locations must show calories per serving on menu cards and boards, plus the 2,000 kcal reference line, with veg and non-veg marks. The rule applies from 2022 ([FSSAI notice](https://mail.fssai.gov.in/upload/media/FSSAI_News_Outlets_FNB_08_09_2020.pdf), [FSSAI guidance note](https://mail.fssai.gov.in/upload/uploadfiles/files/Guidance_Note_Labelling_23_02_2022.pdf), [S.S. Rana](https://ssrana.in/articles/display-calorie-values-menus-fssai/)).
- A menu stored as data (items, prices, calories, allergens, veg marks) can meet these rules automatically on every screen. A menu stored as a JPEG can't.

### 8. Legibility rules are known, and widely ignored
- About one inch of letter height for every 10 feet of viewing distance, with headlines larger ([OptiSigns](https://www.optisigns.com/post/stop-the-squinting-how-to-make-your-digital-menu-boards-easier-to-read), [Look Digital Signage](https://www.lookdigitalsignage.com/blog/digital-menu-board-size)). Counter ordering is typically 12 to 15 feet away.
- Mid-range contrast (grey on beige) collapses under overhead light and glare ([Seen Labs](https://seenlabs.com/blog/digital-menu-legibility-typography-contrast-standards-for-qsr-signage)).
- **Implication:** our layouts enforce these rules. The owner picks a layout and a theme; they can't pick a 14 px price.

## Market sizing (summary)

Full working is in [market size and go-to-market](market-size.md).

| Figure | Value | Source |
| --- | --- | --- |
| Digital signage, worldwide | $31.09 billion in 2025, 8.2% CAGR to 2033 | Grand View Research, relayed by [Kitcast](https://kitcast.tv/reports/digital-signage-statistics) |
| Digital signage in QSRs | $2.99 billion (2025) to $3.38 billion (2026), 13.1% CAGR | The Business Research Company ([Research and Markets listing](https://www.researchandmarkets.com/reports/6226165/digital-signage-in-quick-service-restaurants)) |
| India food services | ₹5.69 lakh crore (FY24) to ₹7.76 lakh crore (FY28); organised share 43.8% rising to 52.9% | NRAI India Food Services Report 2024 ([India Retailing](https://www.indiaretailing.com/2024/07/10/food-services-sector-set-to-reach-rs-7-76-lakh-crore)) |
| India QSR outlets | 104,000+ (2023) | Mordor Intelligence via [Statista](https://www.statista.com/study/168073/quick-service-restaurants-market-in-india) |
| US restaurant and foodservice outlets | More than 1 million | [National Restaurant Association](https://restaurant.org/research-and-media/research/research-reports/state-of-the-industry/) boilerplate, 2026 |
| India DOOH screens | About 185,000 | [exchange4media](https://www.exchange4media.com/out-of-home-news/dooh-on-the-rise-not-a-future-bet-but-the-new-norm-143208.html) |

## Risks found in research

| Risk | Evidence | What we do about it |
| --- | --- | --- |
| TV browser reliability | ScreenCloud, Fugo and Juuno all warn against TV browsers | Engineer a light player, offline cache and self-reload; ship a thin Android TV wrapper and a recommended stick |
| "Free" is the norm at the bottom | Yodeck, OptiSigns, Pickcel trial, Atmosphere and Loop are free to start | Free for one screen, with a small corner badge; charge for more screens and selling features |
| POS lock-in | Petpooja bundles a display for its own POS users | Integrate with POS systems instead of competing; be the best layer on top |
| Ad revenue needs density | Ads only pay with many screens in one area | Sell city by city and street by street; don't promise earnings until a cluster exists |
| Unverified sales-lift claims | Most published lift numbers are vendor marketing | Measure lift per restaurant from POS data before claiming it |
