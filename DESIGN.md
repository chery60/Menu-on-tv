# Design system

Three surfaces, three jobs. The **site** sells to owners; the **screen** sells to guests; the **tracker** is our notebook. Tokens live in `src/app/globals.css`; screen themes live in `src/features/screen/themes.ts` so a test can check their contrast.

## The idea

MenuOnTV puts the menu on the TV. The public site (v5, docs/site-v5-plan.md) looks at a café the way a guest does: the counter, the plan and the drawings are in ink on paper, like an architect's sheet, and the only light in the room is the TV. It tells the problem first, on the guest's own path through the shop, then plays the fix on the real screen. Ideas came from heronaiapp.com (one drawing language, a plan that builds and gets flagged) and giga.ai (a device that plays the product step by step); nothing was copied.

## Site

### Brand

- **Mark:** a TV on its stand with three menu lines and their prices on the screen; in the wordmark, "On" is chilli, the TV's on-light (`src/components/brand/brand-mark.tsx`, `.brand-wordmark` in globals.css, favicon `src/app/icon.svg`).
- **Voice:** plain and warm. House rules hold everywhere: sentence case, headlines end with a period, no em dashes, no eyebrow labels, buttons start with a verb, no invented numbers, logos or quotes.
- **Colour** (`src/app/(marketing)/site.css`, `--mt-*`): paper #f2f0ea with a few percent of grain, paper 2 #e7e4db, ink #1d1c19, ink soft #5c5a55 (6:1), hairlines at 16% and 34%. Chilli #f24a14 marks problems, the one action on a screen and the TV's on-light; text on chilli is ink (4.7:1), never white; small chilli text uses #c8330a. Night #0f0e0d and glow #ffb35c are the TV and the demo device. Leaf #0f7a40 means live and fixed.
- **Type:** Archivo, wide and heavy, for headlines; Geist for text; Geist Mono for drawing labels, steps, logs and small notes. The TV keeps its own faces.
- **Shape:** one framed sheet, 1440px at most, with hairline rules; bands meet its edges at crosshair marks; content sits in cells whose borders are the rules. Corners are square (2px at most). Cells carry a mono number like [01]. Buttons are rectangles with an arrow that leans forward on hover.

### Navigation

One bar for the whole site (`site-header.tsx`, `nav-links.tsx`): a row of framed cells, sticky, the same on every page and at every scroll position. Logo on the left; How it works, Prices and Live demo screen as cells; Owner sign in; Get early access in the chilli cell. The page you are on carries a small chilli square. Under 980px the links fold into a sheet under the bar on the browser's popover.

### Layout

- **Home:** hero, statement, the problem in four cells, the plan (pinned), the demo (pinned), three steps, made for, the screen rules and the free plan, try it with your menu, early access, footer.
- **Hero** (`hero.tsx`, `counter-drawing.tsx`): a café counter in front view traces itself; the TV on its wall switches on like a CRT and plays the real `ScreenStage`. A title block and a short log sit in the drawing's corners. The H1 sits under the drawing.
- **The plan** (`floor-plan.tsx`, `plan-drawing.tsx`): a café in plan builds with the reader's scroll (walls, rooms, furniture, dimensions, queue), the printed board's three problems are flagged in chilli, then a TV over the counter and a second by the tables fix them one by one. A caption card tells the step; a legend lists the flags.
- **The demo** (`live-demo.tsx`): five steps of one afternoon on the left; on the right a night device with a status line, the real screen (fed by `features/screen/hero-demo.ts`), what the owner sent and a log.
- **Try it** (`try-it.tsx`): type a café and a few dishes and the TV plays them; the café name goes into the early-access form.
- **How it works, Prices** (`src/components/pages`): the same sheet and cells with no story on arrival: steps with what each looks like, the six layouts live, plans, a monthly-bill calculator (`src/lib/plan-cost.ts`, tested), the comparison table, the ad share and the FAQ as an accordion.
- **404** (`src/app/not-found.tsx`): a TV showing colour bars. Its styles sit in `globals.css`, because Next.js preloads the root 404's CSS on every page.
- 16px side gutters on phones; no horizontal scroll at 375px.

### Motion

- **Drawings trace themselves.** The hero traces once as the page opens; other drawings trace with the reader's scroll where the browser supports scroll-driven animation, and simply show where it doesn't.
- **Pinned scenes** are a tall section with a sticky stage; `useScene` (`src/components/site/use-scene.ts`, maths in `src/lib/scene.ts`, tested) writes the scroll progress to `--scene-p` and returns the step, so React renders only when the step changes. The statement's words light from that progress in CSS.
- **The problems are hairline figures** (github.com/lucasmarkes/hairline, engine vendored in `src/components/home/hairline`): isometric line drawings that answer the pointer and walk their own tour while on screen. Ink strokes, chilli as the one bright stroke, the plate in paper. New figures follow the `hairline-create` skill's ten rules.
- **The live demo is a 3D café** (`/demo`, three.js, `src/components/demo`): paper ground, ink and chilli café, a night TV that plays the real menu loop unlit. It loads after the page, runs only on screen, and stands still under reduced motion. See `docs/demo-plaza.md`.
- **No animation library and no smooth-scroll engine.** With reduced motion every drawing is finished, every word lit, the ribbon still, and steps change without fades.

## Owner app

The owner app (`/studio`), sign-in, setup and the TV's pairing screen wear the site's brand. The Tailwind tokens they use (`night`, `mist`, `hairline`, `masala`, `chutney`, `telly-soft`, `chilli`) are mapped to ink, paper, hairline, deep chilli, leaf and paper 2 in `globals.css`; corners are 2 to 4px; `font-display` is Archivo; text is Geist with Mukta for Devanagari. Shared class strings live in `src/components/owner/ui.tsx` (one chilli action per form, ink text on it).

- **Four tabs, most frequent first** (`owner-frame.tsx`): Today (`/studio`: what the TVs play right now in a live preview, the first-screen checklist, sold out today), Menu (`/studio/menu`: the editor with the TV preview beside the list on a computer), TVs (`/studio/tvs`: connect a TV by code, screens, add a screen by link; read-only for staff) and Restaurant (details and people). A computer gets the site's framed top bar; a phone gets a bottom tab bar with icons. A TV's QR code opens `/studio/tvs?code=`; old `/studio?code=` links redirect there.
- **Pairing screen** (`pair-screen.tsx`, `.scr-message` in globals.css): night ground, Archivo title, the code in Geist Mono in glow.

## Screen

Rules and reasons are in [docs/screen-design.md](docs/screen-design.md). The implementation:

- **One stylesheet for every screen:** `src/features/screen/screen.css`, imported by `globals.css` for the site and the owner app, and built into the standalone TV player (`src/player/player.css`, with the fonts self-hosted in `public/fonts`).
- **Container units.** `.scr` is a size container; every size is in `cqmin` (the screen's short side) or `cqh`/`cqw`. The same CSS fits a 4K TV, a phone preview and the small TVs on the home page.
- **The brand on every theme:** the TV wears the site's language whatever colours the owner picks. Archivo for the restaurant name, promo headlines and the Spotlight dish; Archivo set narrow (`--scr-narrow`, 68%) for category headings, prices and names over 24 characters; Geist for dish names and lines (Mukta for Devanagari); Geist Mono for labels, badges, "Sold out", the tax note and "Goes well with". Hairline rules (`--scr-hair`, about 2px on a 1080p TV) under the header and each heading, between columns and as dotted leaders; crosshair marks where the header's rule ends and on a big dish's frame; square corners everywhere.
- **Two themes, both the brand, colours only** (`themes.ts`): Paper, the default (the site's ink on paper, chilli prices), and Night (the demo device's night: paper text on #0f0e0d, glow prices, the same chilli accent). Chalk, Neon and Fresh were retired on 2026-10-20: screens saved with them, and old `?theme=` links, read as Night (Chalk, Neon) or Paper (Fresh) through `upgradeThemeId`. The site shows Paper everywhere. `themes.test.ts` checks item text at 7:1 or more, prices and secondary text at 4.5:1 or more, and that a theme sets nothing but colours.
- **Badges:** square Geist Mono labels. Bestseller is filled with the accent (ink text on chilli), New is filled with ink, Chef's pick, Spicy and Jain option are outlined in ink, price colour and dim.
- **Promos:** side and hero promos are framed cells with a 1cqmin accent rule along the top; the label is a filled accent box, an ad's label an outlined one. The ticker is a square accent band.
- **Marks:** FSSAI veg (green circle in a green square) and non-veg (brown triangle in a brown square), always on white.
- **Dishes:** a framed square cell (hairline, panel fill) holds the owner's photo, or the dish emoji in the demo. No glows or circles.
- **The 3D demo's TV** (`src/components/demo/plaza/textures.ts`) draws the same Split screen on a canvas from the same sizes in cqmin, so it matches `/screen/demo?layout=split`. Change both together.
- **Motion:** each new slide enters once (fade and rise); the hero dish bobs gently; the ticker scrolls. Reduced-motion settings stop all of it.

## Tracker

Ported from the Fundraise tracker: Notion-like notebook paper with light and dark modes (`--tk-*` tokens). It uses Mukta for headings instead of the site's display face.
