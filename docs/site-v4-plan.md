# Site v4: a hero first, and our own effects

Asked on 2026-10-19: open the home page with the best hero we can make before the story starts, take ideas from the hero blocks on React Bits Pro, and remove React Bits from the site.

## What we take from React Bits Pro

Only ideas, from the public previews; no Pro code and no copies of its blocks. The newest Pro heroes share one pattern: a dark full-bleed stage, a left-aligned headline with two buttons, and one visual from the product's own world that the visitor steers with a control (a surf break reshapes an ocean, a shutter dial stretches traffic into light trails, a scrubber moves the sun).

## The hero: night service

MenuTelly's own version of that pattern is the product itself. A café at night: a TV on the wall plays a real MenuTelly screen, and the owner's phone sits in front of it. Mark a dish sold out, nudge a price or pick today's special on the phone, and a pulse of light runs from the phone to the TV as the screen changes. The TV's glow is the only light in the room.

- **Colour:** night #14121f (the brand's nocturne, a violet black), porcelain #f2f3f7 for words, apricot #ffb26b for the screen's glow, signal indigo #5b3cff for actions and the pulse. No new colours.
- **Type:** Bricolage Grotesque 800 for the headline, Geist for the rest; left aligned.
- **Layout:** words on the left, TV on the right with the phone overlapping its lower left corner; on phones the TV comes after the words and the phone becomes a control card under it.
- **Honest demo:** the TV is the real `ScreenStage`, fed by a small menu built from the demo café (one category, today's special as the only promo), so every change is on screen the moment it is made.
- **Copy:** the existing `hero` copy, which /index.md already uses. The page's H1 moves from the playbill to the hero.
- **Order:** overture, hero, playbill, time machine, builder, why switch, early access.

Checked against the usual generated-page look: no eyebrow labels, no middle-dot meta lines, no arrow glyphs on buttons, no invented numbers. The dark ground is the restaurant at night, lit by its own screen.

## Replacing React Bits

React Bits is MIT plus Commons Clause and free for a website like this one, but the owner wants it gone. Every effect becomes our own small component in `src/components/effects/`, written from the behaviour the page needs (not ported), with no WebGL except the 3D telly:

| Where | Was | Becomes |
| --- | --- | --- |
| Overture | SplitText, DecryptedText, CircularText, Noise | CSS type drop, typeset scramble, SVG ring text, canvas grain |
| Playbill | CurvedLoop, CircularText | SVG curved marquee, ring text |
| Act I | EchoText, TextType, ClickSpark | CSS echoes, typewriter, canvas sparks |
| Act II | TextType, ClickSpark | typewriter, sparks |
| Act III | Stack, PaperCrumple | pointer card deck, SVG-filter crumple |
| Act IV | FlyingPosters, StickerPeel, ScrollVelocity | scroll poster reel in CSS 3D, drag-to-peel notice, velocity ribbon |
| Act V | ElectricBorder, SplitFlapText, LightRays | SVG live wire, CSS split-flap, CSS light rays |
| Act VI | CRTWarp, GlitchText | canvas static with CSS scanlines, CSS glitch |
| Year counter | CountUp | rolling number |
| Closing | BlurText, SpotlightCard, Grainient | focus-in words, pointer spotlight, CSS grain gradient |
| How it works | ScrollStack | sticky stacking cards |
| Pricing | TearTicket | drag-to-tear ticket |
| Builder | Magnet | magnetic button |

`gsap`, `@gsap/react` and `motion` were there only for React Bits and go too. Timing and easing maths live in `src/lib/motion.ts` with tests.

## More from Pro's catalogue

The owner then asked to go through every Pro category and lift the rest of the site the same way. Pro's sections share the hero's idea: each block carries one live visual of its own claim. Ours, all our own code:

| Section | Pro category idea | Ours |
| --- | --- | --- |
| Why restaurants switch | Bento: animated feature tiles | Each reason shows itself working: a scan line reads the paper bill, promos take turns, one link lights a TV, ₹0 for one screen, the ad money splits in half, veg and non-veg marks with calories. Real data from the demo café. |
| Early access | Waitlist with vertical marquees | Two columns of the café's dishes and prices drift past behind the form. |
| Footer | Giant wordmark, revealed by the cursor | The outlined wordmark lights up in apricot and indigo where the pointer passes. |
| Pricing | Plans with a usage slider | Pick how many screens; each plan's monthly bill is added up from the real per-screen prices. |
| FAQ | FAQ as chat bubbles | The owner's questions as sent messages; MenuTelly answers after a typing indicator. Native details and summary underneath. |
| 404 | TV static with a glitch | A TV with no signal: "Nothing on this channel." |

Skipped on purpose: stats and social proof (no invented numbers or testimonials), navigation (the owner turned down a card nav), auth and profile (nothing to sign in to yet).

## Done when

- The hero shows first after the overture, the phone changes the TV, and it works with a keyboard, on a phone and with reduced motion.
- `src/components/react-bits` and the three motion packages are gone; nothing imports them.
- Typecheck, lint, tests and the production build pass; home first-load JS is no larger than v3's 323 KB gzip.
- An REA browser scenario runs the overture, the hero demo and the time machine with no page errors.
