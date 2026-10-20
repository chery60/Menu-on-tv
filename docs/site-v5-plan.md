# Site v5: the counter, drawn

On 2026-10-19 the owner said the site "is not at all looking good", the flow was broken and the navigation was dull. They asked us to study heronaiapp.com and giga.ai (how each breaks its problem down and tells it with motion), redesign the public site from that, get their approval, and only then carry the brand into the owner app. This replaces the Victorian time-machine site (v3 and v4).

## What the two sites do

### Heron AI (heronaiapp.com)

Built in Webflow with GSAP 3.12 ScrollTrigger, GSAP 3.13 SplitText and TextPlugin, Lenis 1.1.5 smooth scrolling, Swiper 11 and Barba page transitions, hosted on Netlify (REA `ev_b1013bac…`, 15 scripts, all parsed). Type is BT Grotesk (bold, set in capitals) with Geist Mono labels. Ink #282828 on paper #f2f2f1, and one red-orange, #fa3600, for everything that needs attention. A full-screen fixed canvas sits above the page for grain.

The story, in order:

1. **Opening:** an architect's elevation is traced in thin lines while a scan line counts to 100%, then the drawing fills in as a shaded illustration. A small boot log runs in the corner.
2. **Hero:** the illustration in a framed grid, the headline under it, one line of pitch and one button. The drawing is interactive: drag to see code violations.
3. **Statement:** one sentence revealed word by word as you scroll, grey to black, then three benefits on a ribbon and a strip of client logos.
4. **Problems:** "Your design tools do what you tell them, nothing more." Four framed cells, numbered, each with a line-art icon and two lines: manual, disjointed, blind, slow.
5. **The pinned plan (5,376 px tall):** "Right there with you" and "For the whole design" hold the screen, then a floor plan (it is a café) builds as you scroll: walls, then doors and windows, then furniture, then dimensions, then problems flagged with orange markers. A small caption card in the corner tells the problem in three beats (the cost, the cause, the fix) with "scroll to continue".
6. **Product:** "Your model. Your tools. Connected." Two product cells with drawn interface mockups.
7. **How it behaves:** Observe, advise, act, learn, each with a drawing.
8. **Who it's for:** an accordion of roles beside a Swiss-poster illustration.
9. **Call to action** in a framed cell with coordinates in its corners, then a footer whose wordmark is drawn in construction lines.

What makes it work: one drawing language for everything, the problem shown on the customer's own artefact (their plan), and motion that builds the picture instead of decorating it.

### Giga (giga.ai)

Next.js on Turbopack with React; the home page loads its own `page.js` (237 KB) and a `deck.js` (535 KB) for the scroll scenes, and draws on one fixed 2560 by 1600 canvas (REA `ev_df3cca1e…`, 88 scripts, all parsed). It fetches `/tailored/scene` to build a page for the visitor's company from their work email. Type is Geist Pixel Line for headlines, Geist and Geist Mono for text, Source Serif for accents. Black ground, orange #ff6a2b for the one action.

The story, in order:

1. **Hero:** "No time to wait." over a heat-coloured bar field, and a product "device": a dark panel that says hello and asks for your work email beside a hardware dial labelled talk, with voice and chat buttons.
2. **Logos,** then "Giga agents are flexible": pick your industry, or leave your email and they build a page for your company.
3. **The pinned conversation (4,032 px):** "Agents that keep getting better." Five numbered steps on the left (the customer asks, Giga checks the card, raises the limit, upgrades the card, gets better); on the right the device plays the real conversation as you scroll, with a status line at the top (waiting, customer typing, working, thinking) and tool logs in mono ("Card checked", "Mood detected: polite panic").
4. **How it works (5,200 px):** Build, observe, improve. Thin lines from knowledge, tools and guidance converge on "Your agent"; then a cloud of conversations clustered by topic; then a rising curve; then "the next cycle begins" and the lines run again. A segmented control at the foot shows where you are.
5. **Customer story, a call to action with the email field again, and a plain footer.**

What makes it work: the product is the hero (a device you can almost touch), the demo is a real use case told in steps, and each idea gets one screen.

## What we take, and what we don't

| Take | Leave |
| --- | --- |
| Problem first, shown on the customer's own place: Heron's café plan becomes our café plan | Capitals everywhere and eyebrow labels (our house rules: sentence case, no eyebrows) |
| One drawing language: thin ink lines, dimension marks, crosshair corners, a framed grid | Client logos, testimonials and metrics we don't have |
| One hot colour for problems and the one action | Lenis smooth scrolling and a second animation library (native scroll, our own scene hook) |
| A device that plays the product step by step, with a status line and a log | Gated content behind an email |
| A short opening where the drawing traces itself and the TV switches on | A preloader that hides the page |
| A statement revealed word by word, then a quiet ribbon of facts | Cursor coordinates and other numbers that mean nothing |

## Our story

**Thesis:** look at your shop the way a guest does. A café drawn like an architect's plan, in ink on paper; the only light in it is the TV.

1. **Hero.** "Your menu, on your TV." (renamed from MenuTelly to MenuOnTV the same evening) A line drawing of a café counter (awning, counter, chai urn, pastry case) traces itself; the TV on the wall switches on and plays the real `ScreenStage`. A dimension line from the queue to the TV reads "Read from 3 m". Two buttons: Get early access, Watch it work.
2. **Statement,** revealed word by word: the board over your counter is your best salesperson, and most boards say the same thing all day, even after the samosas run out. A ribbon of facts under it.
3. **The problem, in four cells:** prices change but the print doesn't; sold out is said out loud; too small from the queue; nothing pushes the next order.
4. **The plan (pinned).** The café plan builds: walls and door, counter and kitchen, tables, the queue. Sight lines run from the queue to the printed board and three problems flag in chilli. Then a TV is mounted over the counter, the sight lines shorten and turn green, and each flag turns into a fix. The caption card tells it in three beats.
5. **The demo (pinned).** "Change it from your phone. The TV keeps up." Five steps on the left: snap the menu, MenuOnTV builds the board, samosas run out, chai goes up by ₹5, today's special changes. The night device on the right plays it: status line, the owner's message, a log in mono, and the real TV changing.
6. **Three steps, about ten minutes:** snap, pick a layout, open the link. Lines from the menu photo, promos and today's special converge on one TV link.
7. **Made for counters that move fast:** an accordion of shop types beside a drawing.
8. **Built to be read in three seconds from three metres:** the four screen rules, then the free plan.
9. **Try it, then early access:** type your café's name and a few dishes, the TV plays them, and the same name goes into the early-access form.
10. **Footer** with the wordmark in construction lines.

How it works and Prices get the same frame, type and drawings, with no story on arrival.

## Brand

- **Paper** #f2f0ea, **paper 2** #e7e4db, **ink** #1d1c19, **ink soft** at 68%, **hairline** at 16%.
- **Chilli** #f0410f: problems, the one action, the TV's on-light. Ink text on chilli, never white (white on chilli fails 4.5:1).
- **Night** #0f0e0d and **glow** #ffb35c for the TV and the device. **Leaf** #128a4a for live and fixed.
- **Type:** Archivo (expanded, heavy) for headlines in sentence case; Geist for text; Geist Mono for drawings, steps, logs and small labels. The TV keeps its own faces.
- **Shape:** square corners, hairline frames with crosshair marks at the corners, numbered cells. Buttons are rectangles with a mono arrow.
- **Motion:** strokes that draw, layers that arrive in steps, the TV light. Pinned scenes run on a sticky stage and one progress hook (`useScene`), with CSS transitions between steps. Reduced motion shows every finished state.

## Build notes

- The old story (overture, playbill, time machine, exhibits, 3D telly) and its CSS, fonts and effects are removed, with the three.js packages if nothing else uses them.
- Copy stays in `src/content/site-content.ts`; `/llms.txt`, `/index.md` and the JSON-LD keep reading it.
- Check at 1440 by 900, 1024 by 768 and 375 by 812, with reduced motion, and in production with REA.
