# Screen design playbook

What a guest sees on the TV is the product. This doc sets the rules every MenuOnTV layout follows, so any owner, with any menu, gets a screen that is clear from across the room and hard to ignore. It builds on the legibility findings in the [market research](research.md) and is implemented in `src/features/screen`. The live demo is at `/screen/demo`.

## The three-metre, three-second rule

A guest standing at the counter is 3 to 5 metres from the TV and glances at it for a few seconds at a time. Every slide must answer one question in that glance:

- **Menu slides:** "What can I get, and how much is it?"
- **Promo slides:** "What's the deal?" One offer, one price, one picture.
- **Ad slides:** "Who is this, and why should I care?" One line.

If a slide needs reading, it is two slides.

## Legibility, enforced

These are not suggestions. Layouts compute sizes from the screen's height, so an owner can't break them.

| Element | Rule | Why |
| --- | --- | --- |
| Item names and prices | At least 3.2% of screen height (about 35 px on a 1080p TV) | Roughly one inch of letter height per 10 feet of viewing distance |
| Category headings | About 1.6x item size, in the display face | Guests scan by category first |
| Promo price | 12 to 18% of screen height | The single biggest thing on a promo slide |
| Items per menu column | 10 at most; overflow becomes a second menu slide | Long lists turn into wallpaper |
| Spare room | Rows spread apart (up to 1.6x their height); text size never changes | Menu columns run out of width before height, so bigger text would collide with prices |
| Long names | A badge that doesn't fit drops under the name; a name trims only if it alone is wider than its column; prices never shrink or overlap | The price is the one thing a guest must read |
| Two languages | A bilingual item counts as 1.6 rows when the menu is split into pages | Two-line rows must never push a category off the screen |
| Contrast | Text at least 7:1 against its background | Mid-contrast collapses under shop lights and glare |
| Prices | Tabular figures, right-aligned, no "Rs." clutter: a single ₹ in the heading | Easy to compare down a column |
| Safe area | 5% inset on every edge | Many TVs crop the edges (overscan) |

## Layouts

Every layout has a menu zone and an ad slot. The owner chooses how the two share the screen. All six run in landscape; Portrait is for TVs mounted on their side.

| Layout | What it looks like | Best for |
| --- | --- | --- |
| **Full board** | The whole menu in up to three columns. Every few loops, a full-screen promo takes over for a few seconds | Counters where the menu is the main job |
| **Split** | Menu on the left two-thirds; promos and ads rotate in the right third | Most cafés: menu always visible, offers always moving |
| **Spotlight** | One dish huge, with its price and three "goes well with" items | Pushing a hero item, a new launch or a combo |
| **L-bar** | Menu, a side column of promos, and a ticker along the bottom | Busy QSR counters with many offers and order-ready numbers |
| **Ticker** | Full menu with one line of offers scrolling along the bottom | Owners who want the menu calm and offers present |
| **Portrait** | Hero dish on top, menu list below | Vertical TVs by the door or the queue |

## The loop

A screen plays a loop of slides. Default timing, tuned to the glance:

- Menu slide: 18 seconds, or 12 seconds per extra menu page.
- Promo or ad slide: 7 seconds.
- In Split and L-bar, the menu never leaves; only the side zone rotates.
- The owner's own promos always come first in the ad slot. Local ads (v2) take at most one slot in three.

Timing comes from the wall clock, not from when the TV was switched on. Two TVs in the same shop show the same slide at the same moment, with no syncing between them.

**Timing per screen (MT-24).** An owner can set how long each menu page stays up (12 to 60 seconds) and each promo (5 to 15 seconds), from a list, on the TVs page. Extra menu pages run two thirds as long as the first and a Spotlight dish half as long, so the defaults above still hold. Every TV on a screen shares its timing, so they stay in step.

**Dayparts (MT-24).** A category can show only at set times and days, like breakfast from 7 am to 11 am. The server leaves it out of the bundle outside those times, so TVs switch within seconds of the boundary (the live stream re-checks every few seconds; the heartbeat is the safety net) with no change on the TV. A time that ends before it starts runs past midnight, and the small hours count as the night it started. An offline TV keeps its last menu until it reconnects.

## Making it eye-catching without making it noisy

- **One moving thing at a time.** The slide that changes animates; everything else stays still. Motion is CSS only, so it stays smooth on cheap TVs.
- **The brand, not a template.** Every screen wears MenuOnTV's look (DESIGN.md, Screen): ink on paper by default, Archivo headings and prices, hairline rules and square corners. Night, the dark theme, is one tap away for dim rooms and glare.
- **Badges that mean something.** "Bestseller", "New", "Chef's pick", "Spicy", "Jain option". At most two per column, or they stop working.
- **Veg and non-veg marks** on every item, in the familiar green and brown square symbols, always the same size.
- **Price anchoring, honestly.** A combo shows what the items would cost separately, struck through, only when that's the real menu price.
- **Real scarcity only.** "Only 6 left today" appears only when the owner sets a count. No fake timers.
- **Hand-picked moments.** Happy-hour countdown, "today's special", festival themes (Diwali, Eid, Christmas, IPL nights), and "order 42 is ready" over the menu when the POS supports it.
- **A QR on promo slides**, sized at least 12% of screen height, for "scan to order" or "scan for the full menu".

## Themes

Themes change colours only; the faces and shapes stay the brand's. Chalk, Neon and Fresh were retired on 2026-10-20 for the brand: screens saved with them now play Night (Chalk, Neon) or Paper (Fresh).

| Theme | Feel | Colours |
| --- | --- | --- |
| **Paper** (default) | The website's sheet | Paper ground, ink text, chilli prices |
| **Night** | The TV at night, as on the site's demo device | Night ground, paper text, glow prices, chilli accent |

Owners can set one brand colour; it replaces the accent, and the layout checks contrast before accepting it.

## Burn-in and screen health

- Static elements shift by a few pixels every minute, so logos and headings never burn into older panels.
- The player reloads itself once a day in the small hours, to clear memory on weak TV browsers.
- If the screen loses the internet, it keeps playing the last menu, and a small dot in the corner shows staff (not guests) that it's offline.

## Languages

- English plus one more language per screen (Hindi first, then Tamil, Telugu, Kannada, Marathi, Bengali). Either both lines per item, or the menu flips language each loop.
- Fonts carry the scripts (Noto families), and sizes are set per script so Devanagari isn't smaller than Latin.

## What we never do

- Cover prices with an ad while guests are ordering.
- Autoplay sound.
- Flash, strobe or shake. Nothing flashes more than three times a second.
- Use cameras to watch guests.
