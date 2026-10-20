# Site v3: the time machine

Plan for the third version of the public site, written 2026-10-19 before building it.

## What the evidence says about v2

Captured with REA against the production build (`next start`, Chromium 155):

| Evidence | Observation |
| --- | --- |
| `ev_a921b10…` (`analyze_web_bundle`, `/`) | 47 scripts parsed, no failures. About 1.0 MB of JavaScript on first load. Only first-party origins; one API call (`/api/waitlist`). |
| `ev_e2fb829…` (`capture_browser_scenario`, full scroll) | No page errors. Two console lines: a three.js deprecation warning (`PCFSoftShadowMap`) and an expected "Context Lost" when an exhibit scrolls away. |

From the page itself: the home page is about 10,000 px tall. The product (the live screen) first appears about three quarters of the way down, after seven full-height sections, each mounting its own WebGL piece.

## What stays

The owner's favourites: the 1800s overture on every load, the Victorian playbill, the story from the street cry to the telly with an exhibit per era, the era-changing masthead, React Bits, three.js, the new brand.

## What changes

1. **One time machine instead of seven sections.** A pinned, full-screen stage. As you scroll, the year rolls forward and the stage itself changes era: newsprint, slate, print, brick, neon, phosphor, porcelain. One exhibit plays at a time. A tuning dial at the foot of the stage shows where you are in time; click a year or drag the needle to travel. The whole story takes seven screens of scrolling and one WebGL context at a time.
2. **Your menu, on the telly, now.** Straight after the story, owners type their café's name and a few dishes, pick a layout and a theme, and the 3D telly plays their menu at once: the real player, running in their browser. Nothing is sent anywhere until they ask for early access, and the form arrives pre-filled with their café's name.
3. **Why restaurants switch** and **early access** follow, as now. How it works and Pricing keep their structure and link to the builder.

## Rules

- One WebGL context on the stage at a time; exhibit code loads when its era arrives.
- Reduced motion: the stage still follows the scroll, with instant changes. Without JavaScript every era's words are readable in order.
- The visitor's menu stays in the browser. It is validated (zod) like any other input, and never logged.
- Copy rules as before: sentence case, headlines end with a period, no em dashes, no invented numbers.

## Done when

- The story runs as one pinned stage with the dial, on desktop and phones.
- A visitor can build a menu and see it on the 3D telly, then carry the café's name into the early-access form.
- Typecheck, lint, tests (including the menu builder's logic) and the production build pass.
- REA, re-run on the new build: no page errors, first-load JavaScript no larger than v2's, and a scripted run of the builder shows the visitor's café on the screen.
