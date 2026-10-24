# Search pages (2026-10-25)

Goal: when an Indian restaurant owner searches for a way to put their menu on a TV, a MenuOnTV page answers that exact search. This round adds four pages, retunes two, and tightens the search plumbing. The look does not change: every page is an arrangement of components and `mtv-*` classes that already exist.

Inputs: `docs/research/search-india.md` (topics 1 to 6), `docs/seo-homepage.md`, `PRODUCT.md`, `src/content/site-content.ts`.

## Decisions

1. **The home page is the pillar.** It was just retuned to own "digital menu board" (India, restaurants). A `/digital-menu-board` page would compete with it for the same words, so there is none.
2. **`/pricing` owns "digital menu board price India" (topic 2).** A second price page would split the same search. `/pricing` gets a search title, a new H1 and a worked cost for one café.
3. **Topic 4 is one page, not `/for/[segment]`.** The research says "one page with sections, not three thin pages", and the bakery and QSR queries are marked as guesses.
4. **Topic 6 (which TV or stick) is not a page yet.** The results table in `docs/tv-lab.md` is empty. The how-to answers "will my TV work?" by sending the owner to `/tv-check`, which exists. No TV brand or stick is named anywhere. Build the page after the lab passes.
5. **Claims.** Only what `site-content.ts` or `PRODUCT.md` already say: ₹0 for one screen for good, Plus ₹499, Pro ₹999 per screen a month, before tax, a TV stick about ₹3,000, about ten minutes, keeps playing when the internet drops, sold out in one tap, veg marks, FSSAI calories, Hindi next to English (Plus), breakfast, lunch and dinner menus (Plus), six layouts. No vendor ranges (Petpooja reprint, TV or power costs), no GST rate, no TV sizes, no photos of dishes.
6. **Early access.** There is no self-serve sign-up. Every call to action is `hero.primary` ("Get early access", `#early-access`) or `tryBuilder`, and every new page ends with `<EarlyAccess />`. Steps say "we set up your first screen with you".
7. **No hard-coded domain.** The domain is not bought (MT-4). Any address shown is `typedAddress(siteConfig.url, path)` at render time.

## Routes

| Path | Research topic | Status |
|---|---|---|
| `/how-to-show-menu-on-tv` | 1 how-to (and the "will my TV work" part of 6) | new |
| `/pricing` | 2 price in India | retuned |
| `/free-digital-menu-board` | 3 free | new |
| `/digital-menu-board-for-cafes` | 4 cafés, bakeries, QSR counters | new |
| `/digital-menu-board-vs-printed-menu` | 5 vs printed vs QR | new |
| `/how-it-works`, `/demo` | none new | helper only |

Four new static routes, each `src/app/(marketing)/<path>/page.tsx`. No dynamic route.

## Titles and descriptions

Counted with `node -e`. The layout template adds ` · MenuOnTV` (11 characters), so the title part is 49 or fewer. Full title 60 or fewer, description 160 or fewer. Content uses ’ for apostrophes, as the file does.

| Path | Title part (full length) | Description (length) |
|---|---|---|
| `/how-it-works` | How MenuOnTV works: menu photo to TV (47) | Snap your paper menu, pick one of six layouts and open one link on the TV you already own. About ten minutes, with no designer and no installer. (144) |
| `/pricing` | Digital menu board price in India (44) | MenuOnTV is free for one screen. Plus is ₹499 and Pro is ₹999 per screen a month, before tax. See what one café pays in all, TV stick included. (143) |
| `/demo` | Live demo: a café menu on a TV (41) | Masala Mornings, our sample café, in 3D. Its TV plays the menu the way yours would: prices sized for the queue, sold-out dishes marked, combos between slides. (158) |
| `/how-to-show-menu-on-tv` | How to show your menu on a TV, no app (48) | Open one link in your TV’s browser and your menu plays full screen, with no app to install. What you need, how to check your TV, and what if the Wi-Fi drops. (157) |
| `/free-digital-menu-board` | Free digital menu board for one TV (45) | Yes, it’s free: one TV, for good, with all six layouts and your own promos. The catch is a small MenuOnTV badge. What’s free and what you pay for. (146) |
| `/digital-menu-board-for-cafes` | Digital menu board for cafés, bakeries, QSR (54) | A TV menu board for cafés, chai shops, bakeries and quick-service counters in India. Which layout suits your counter, and what to put on the screen. (148) |
| `/digital-menu-board-vs-printed-menu` | Digital menu board vs printed menu vs QR (51) | Printed board, QR menu or a menu on your TV? An honest look at changing prices, sold-out items and what guests see, and when a printed board is enough. (151) |

## Content contract (`src/content/site-content.ts`, product designer)

New types:

```ts
export interface LinkItem extends TextItem { readonly href: string }
export interface PageMeta { readonly title: string; readonly description: string } // title without the suffix
export interface CellSection { readonly id: string; readonly title: string; readonly lead?: string; readonly items: readonly TextItem[]; readonly numbered?: boolean }
export interface ComparisonTable { readonly title: string; readonly columns: readonly string[]; readonly rows: readonly (readonly string[])[]; readonly note: string }
export interface FaqSection { readonly title: string; readonly items: readonly FaqEntry[] }
export interface GuidePage { readonly path: string; readonly meta: PageMeta; readonly title: string; readonly lead: string; readonly sections: readonly CellSection[]; readonly table?: ComparisonTable; readonly faq?: FaqSection; readonly next: readonly LinkItem[] }
```

Changes to existing keys:

- `FaqEntry` gains `readonly link?: { readonly label: string; readonly href: string }`. Home `faq.items`: "How much does a digital menu board cost in India?" gets `{ label: 'See what one café pays', href: '/pricing' }`; "Can I show my menu on a smart TV without an app?" gets `{ label: 'Read the setup guide', href: '/how-to-show-menu-on-tv' }`.
- `comparison` gets `satisfies ComparisonTable`.
- `howPage.meta`, `pricingPage.meta`, `demoPage.meta`: the rows above.
- `pricingPage.title` becomes `'What a digital menu board costs in India.'` (lead unchanged).
- `pricingPage.cost: ComparisonTable`, title `'What one café pays in all.'`, columns `['One TV', 'Two TVs']`, rows:
  - `['MenuOnTV', '₹0 on Free', twoScreens + ' a month on Plus']` where `twoScreens` is computed from `pricing.plans[1].perScreen * 2` as `₹998` (en-IN format), never typed.
  - `['The TV', 'The one you already have', 'The ones you already have']`
  - `['A TV stick', 'About ₹3,000 once, only if your TV can’t open a link', 'The same, for each TV that needs one']`
  - `['Installer, designer, reprints', 'None', 'None']`
  - note: `'Early-access prices, before tax.'`
- `pricingPage.next: LinkItem[]` and `howPage.next: LinkItem[]` (see Internal links).
- `madeFor.more = { label: 'See menu boards for cafés and counters', href: '/digital-menu-board-for-cafes' }`.
- `readNextTitle = 'Read next.'` (one shared heading for every `next` block).

New keys, each `satisfies GuidePage`: `menuOnTvGuide`, `freePage`, `cafesPage`, `versusPage`. Export `guidePages = [menuOnTvGuide, freePage, cafesPage, versusPage] as const` for the Markdown and tests.

### `menuOnTvGuide` (`/how-to-show-menu-on-tv`)

- H1: Your menu on a TV, with no app to install.
- Lead: Open one link in your TV’s browser and the menu plays full screen. You run it from your phone. Here is what you need, the four steps, and how to check your TV first.
- Section `need`, "What you need.":
  - A TV that can open a web page. If it has a web browser, that is all. If it doesn’t, a small stick in the HDMI port adds one, for about ₹3,000.
  - Wi-Fi in the shop. The TV uses it to get your changes. If it drops, the menu keeps playing.
  - Your phone. You make the menu and change it from your phone. No laptop, no designer.
- Section `steps`, numbered, "Four steps. About ten minutes.", lead "During early access we set up your first screen with you.":
  - Photograph your menu. Snap the paper menu or the board on your wall, or paste it from WhatsApp. Check the prices it read, then approve.
  - Pick a layout. Six layouts, and every one keeps prices big enough to read from the counter.
  - Open the pairing page on the TV. In the TV’s browser, type the short address from your phone. A code appears on the screen.
  - Enter the code on your phone. The TV keeps the link and plays your menu full screen.
- Section `check`, "Check your TV first.":
  - Check it in a few seconds. Open the TV check in the TV’s browser. It says in plain words whether the menu will play, and changes nothing on the TV.
  - If the browser is too old. A small Android TV stick in the HDMI port runs the menu. It costs about ₹3,000, once.
  - The page renders `typedAddress(siteConfig.url, '/tv-check')` in an `mtv-mono` line under this section, and `menuOnTvGuide.tvCheck = { label: 'Open the TV check', href: '/tv-check' }` as an `mtv-link`.
- Section `after`, "Once it’s on the wall.":
  - Change a price. One tap on your phone, and every TV in the shop updates within seconds.
  - Mark something sold out. One tap. Guests stop ordering it, and nobody has to say sorry.
  - If the internet drops. The screen keeps playing your last menu and catches up when it’s back.
- No FAQ (the home FAQ covers these; its smart-TV answer links here).
- `next`: `/how-it-works` "See the six layouts" / `/free-digital-menu-board` "What the free plan covers" / `/pricing` "What one café pays".

### `freePage` (`/free-digital-menu-board`)

- H1: A free digital menu board, for one TV.
- Lead: Yes, it’s free. One screen, for good, with all six layouts, your own promos and sold out in one tap. The catch is a small “Powered by MenuOnTV” badge on the screen.
- Section `free`, "What’s free, and what isn’t.":
  - Free, for good. One TV, all six layouts, light or dark, your menu from a photo, sold out, today’s special and your own promos.
  - The badge. A small “Powered by MenuOnTV” badge shows on the free screen. Plus takes it off.
  - What you pay for. More screens, breakfast, lunch and dinner menus, Hindi next to English and scheduled promos are on Plus, at ₹499 per screen a month.
  - The one cost outside us. If your TV can’t open a link, a TV stick costs about ₹3,000, once.
- `<Plans />` (unchanged component) goes after `free`.
- Section `elsewhere`, "Free here, and free elsewhere.":
  - A free QR menu. It opens on the guest’s own phone. It doesn’t put anything on your TV.
  - Free ad-funded TV. It costs nothing, but it fills your TV with someone else’s channel and they keep the ad money. MenuOnTV plays your menu and your promos.
- FAQ "Questions about the free plan.":
  - Is the free plan free forever? Yes. One screen is free for good, with no time limit. Plus and Pro are early-access prices that we’ll confirm with our first restaurants before launch.
  - What happens when I want a second TV? Move to Plus, at ₹499 per screen a month before tax. Every screen then plays without the badge.
  - Do I need to buy any hardware? Not if your TV can open a web page. If it can’t, a small TV stick in the HDMI port costs about ₹3,000, once.
- `next`: `/pricing` "What one café pays" / `/how-to-show-menu-on-tv` "How to put it on your TV" / `/digital-menu-board-vs-printed-menu` "Compare it with printed and QR menus".

### `cafesPage` (`/digital-menu-board-for-cafes`)

- H1: A digital menu board for your café or counter.
- Lead: Cafés, chai shops, bakeries and quick-service counters sell from a queue. Here is what to put on the TV for each, and which of the six layouts fits.
- Section `outlets`, "What goes on the screen, by counter.":
  - Cafés and chai shops. A short menu and a big rush. The Split layout keeps the menu still while today’s special and your combos take turns beside it.
  - Bakeries and sweet shops. Mark what’s finished the moment the tray is empty, and put festival boxes on screen in season. Spotlight puts one cake or box on the whole screen.
  - Quick-service counters. Combos and add-ons on the screen guests face while they queue. The L-bar layout fits many offers beside the menu.
  - Food courts and pickup windows. A board that reads from across the hall, in English and Hindi. A TV mounted on its side uses the Portrait layout.
- Section `every`, "What every counter gets.":
  - Prices sized for the queue. Text is sized from the height of the screen, so prices read from the counter on any TV.
  - Sold out in one tap. From your phone, and every TV in the shop follows within seconds.
  - Veg marks and FSSAI calories. Veg and non-veg marks on every item, with calories and allergens the way FSSAI asks.
  - Breakfast, lunch and dinner. On Plus, each menu takes over at its time, with Hindi next to English.
- FAQ "Questions from café and counter owners.":
  - Which layout suits a small café? Split, for most cafés: the menu always shows and your offers keep moving. You can switch layouts any time.
  - Can the TV be mounted on its side? Yes. The Portrait layout is made for TVs on their side, by the door or the queue.
  - Can I show a different menu in the morning? Yes, on Plus. Breakfast, lunch and dinner menus each take over at their time.
- `next`: `/how-to-show-menu-on-tv` "How to put it on your TV" / `/demo` "See a café with its menu on a TV" / `/pricing` "What one café pays".

### `versusPage` (`/digital-menu-board-vs-printed-menu`)

- H1: Digital menu board, printed menu or QR menu.
- Lead: Each one does a different job. Here is an honest comparison for one counter, and when a printed board or a QR code is all you need.
- `table`, "How they compare.", columns `['MenuOnTV on your TV', 'Printed board', 'QR menu']` (column 0 gets `is-us`):
  - `['Changing a price', 'One tap on your phone; the TV changes in seconds', 'A reprint, a sticker or a pen mark', 'Edit it online']`
  - `['Sold out', 'Marked on the screen in one tap', 'Said out loud at the counter', 'Depends on the menu app']`
  - `['Where guests read it', 'On the TV, from the queue', 'On the wall or the counter', 'On their own phone, after a scan']`
  - `['Specials and combos', 'Play between menu slides', 'A flyer by the till', 'Inside the menu, if they scroll to it']`
  - `['Cost to start', '₹0 for one screen, plus a stick (about ₹3,000) if the TV needs one', 'A print run, and another for each change', 'Depends on the app']`
  - note: `'MenuOnTV prices are early-access prices, before tax.'`
- Section `enough`, "When printed or QR is enough.":
  - Your prices hardly change. If the menu stays the same for months and nothing sells out, a good printed board does the job.
  - Guests order at the table. If people sit down first and order there, a QR code on the table works. A TV helps most where people queue at a counter.
  - Use both. A QR code on the table for people sitting down, the TV over the counter for the queue. They do different jobs.
- FAQ "Questions about switching.":
  - Is a digital menu board cheaper than reprinting? Changing a price on MenuOnTV costs nothing, and one screen is free. A printed board costs a reprint or a sticker every time a price changes.
  - Is a QR menu the same as a digital menu board? No. A QR menu opens on the guest’s own phone. A digital menu board plays on a screen everyone in the queue can read, without scanning anything.
  - Can I keep my printed menu too? Yes. Keep it for takeaway if you like; the TV shows the prices that are right today.
- `next`: `/free-digital-menu-board` "What the free plan covers" / `/how-to-show-menu-on-tv` "How to put it on your TV" / `/pricing` "What one café pays".

## Components (product designer)

- `src/components/pages/text-cells.tsx`, new: `TextCells({ section }: { section: CellSection })`. Markup is the demo page's notes block: `section > .mtv-sheet.mtv-band > .mtv-section-head (h2.mtv-h2#<id>-title, optional p.mtv-lead) + ol|ul.mtv-cells.mtv-cells-{2|3|4}`, each `li.mtv-problem` with `span.mtv-num` (only when `numbered`), `h3.mtv-h3`, `p.mtv-body`. Columns: 4 items gives `mtv-cells-4`, 3 gives `-3`, 2 gives `-2`. `/demo` switches its notes to it.
- `src/components/pages/read-next.tsx`, new: `ReadNext({ links }: { links: readonly LinkItem[] })`. Same section and cells, heading `readNextTitle`, each cell a `Link` with class `mtv-link` and an `ArrowRight` icon, as in `steps.tsx`.
- `pricing-sections.tsx`: `Faq({ section = faq }: { section?: FaqSection })` renders `entry.link` as an `mtv-link` after the answer; `Comparison({ table = comparison }: { table?: ComparisonTable })` with the heading id derived from the title (`compare-title` stays the default for the existing table, use `cost-title` for `pricingPage.cost`).
- `made-for.tsx`: render `madeFor.more` as an `mtv-link` under the accordion.
- `site-footer.tsx`: a "Guides" column after "Product", listing `siteConfig.guides`.
- No new CSS. If a cell needs spacing that no class gives, stop and ask; don't add a style.

Page order:

- Guide pages: `PageHead` (title, lead, actions `hero.primary` + `tryBuilder`) / `TextCells` for each section in order (free page: `<Plans />` after `free`; cafés page: `<Rules />` after `every`; versus page: `Comparison table={versusPage.table}` before `enough`) / `Faq section={page.faq}` when present / `ReadNext` / `EarlyAccess`.
- `/pricing`: `PageHead` / `Plans` / `Comparison table={pricingPage.cost}` / `Comparison` / `Earn` / `Faq` / `ReadNext links={pricingPage.next}` / `EarlyAccess`.
- `/how-it-works`: as today, plus `ReadNext links={howPage.next}` before `EarlyAccess`.

Every page.tsx: `export const metadata = pageMetadata({ ...page.meta, path })`, and one `<script type="application/ld+json">` with `serializeJsonLd(pageJsonLd(breadcrumbJsonLd({ name: page.meta.title, path }), ...(faq ? [faqPageJsonLd(faq.items)] : [])))`. Home keeps `homeJsonLd()` and switches its metadata to `pageMetadata({ title: siteConfig.title, description: siteConfig.description, path: '/', absoluteTitle: true })`.

## Search plumbing contract (platform engineer)

`src/lib/page-metadata.ts`, new:

```ts
export interface PageSeo { readonly title: string; readonly description: string; readonly path: string; readonly absoluteTitle?: boolean }
export const SHARE_IMAGE: { readonly url: '/opengraph-image'; readonly width: 1200; readonly height: 630; readonly alt: string };
export function fullTitle(seo: PageSeo): string; // absoluteTitle ? title : `${title} · ${siteConfig.name}`
export function pageMetadata(seo: PageSeo): Metadata;
```

`pageMetadata` returns `title` (`{ absolute }` when `absoluteTitle`, else the bare part for the template), `description`, `alternates: { canonical: path, types: { 'text/markdown': markdownPathFor(path) ?? '/index.md' } }`, `openGraph: { type: 'website', url: path, siteName, title: fullTitle, description, locale, images: [SHARE_IMAGE] }`, `twitter: { card: 'summary_large_image', title: fullTitle, description, images: [SHARE_IMAGE.url] }`. The template never reaches `openGraph.title`, hence `fullTitle`. Images are set explicitly because `openGraph` merges shallowly.

`src/lib/structured-data.ts`, additions (`homeJsonLd` uses `faqPageJsonLd(faq.items)` for its FAQ node):

```ts
export function breadcrumbJsonLd(page: { readonly name: string; readonly path: string }): JsonLd; // BreadcrumbList: Home (siteConfig.url), then the page (absoluteUrl(path))
export function faqPageJsonLd(items: readonly FaqEntry[]): JsonLd; // { '@type': 'FAQPage', mainEntity: Question[] }
export function pageJsonLd(...nodes: readonly JsonLd[]): JsonLd; // { '@context': 'https://schema.org', '@graph': nodes }
```

`src/app/opengraph-image.tsx`, new: `ImageResponse` from `next/og`, 1200 by 630, paper background `#f2f0ea`, ink text, `hero.title` and `siteConfig.name`, one chilli square as in the footer wordmark. Exports `alt`, `size`, `contentType`. Static (no request data).

`src/config/site.ts`:

- `pages` gains the four paths, each `markdownPath: '/index.md'`.
- New `guides`: `[{ label: 'Menu on a TV, no app', href: '/how-to-show-menu-on-tv' }, { label: 'Free menu board', href: '/free-digital-menu-board' }, { label: 'For cafés and counters', href: '/digital-menu-board-for-cafes' }, { label: 'Against printed and QR', href: '/digital-menu-board-vs-printed-menu' }]`.
- `nav` unchanged (the bar keeps its three cells).

`src/proxy.ts`: add the four paths to `config.matcher`. `src/app/sitemap.ts`: unchanged logic, `PAGES_LAST_UPDATED` to the build day. `robots.ts`: unchanged.

`src/lib/site-markdown.ts`:

- `buildLlmsTxt`: the Pages list adds `/how-it-works`, `/pricing` and each of `guidePages` as `[meta.title](absoluteUrl(path)): meta.description`.
- `buildHomeMarkdown`: after the FAQ, one `##` section per guide page: H1, lead, each `CellSection` as `###` with bullets (numbered list when `numbered`), the table when present, the FAQ as `###` questions, and the page URL. Also `pricingPage.cost` as a table under pricing.

## File ownership (no overlap)

| Product designer | Platform engineer |
|---|---|
| `src/content/site-content.ts`, `src/content/site-content.test.ts` | `src/config/site.ts` |
| `src/components/pages/*` (incl. new `text-cells.tsx`, `read-next.tsx`) | `src/lib/page-metadata.ts` (+ test), `src/lib/structured-data.ts` (+ test), `src/lib/site-markdown.ts` |
| `src/components/marketing/*`, `src/components/home/made-for.tsx` | `src/app/sitemap.ts`, `src/app/robots.ts`, `src/proxy.ts` (+ matcher test) |
| every `page.tsx` and CSS under `src/app/(marketing)/` | `src/app/llms.txt/`, `src/app/index.md/`, `src/app/opengraph-image.tsx` |

Order: platform first lands the signatures (stubs are fine) and `siteConfig.guides`; the designer builds against them. Types shared by both (`FaqEntry`, `GuidePage`, `ComparisonTable`, `LinkItem`) live in `site-content.ts`; platform only imports them.

## Internal links

- Footer "Guides" column: all four new pages, on every page.
- Home: FAQ cost answer to `/pricing`, smart-TV answer to the guide; Made-for to the cafés page.
- `pricingPage.next`: free page, guide, versus page. `howPage.next`: guide, cafés page, free page.
- Each guide page's `next`, as listed above. Every page links to at least two others and is linked from at least two.

## Paper test

- **"how to display menu on smart TV"**: the title says no app. The H1 repeats it, and "What you need" lists a TV, Wi-Fi and a phone. The four steps take ten minutes. The address of the TV check is right there. Next: they open the TV check on their TV, or press "Get early access".
- **"digital menu board price India"**: `/pricing` H1 matches. Plans in rupees, then a table with what one TV and two TVs cost, stick included, before tax. Next: the calculator, or the free page.
- **"free digital menu board"**: the lead says yes and names the catch (the badge) in the first two lines. The plans show where free stops. The free-elsewhere cells explain why a QR menu or ad-funded TV is different. Next: the guide, or early access.
- **"digital menu board for cafe"**: they find their counter type in the first section, with a named layout, then the readability rules. Next: the demo, to see a café TV.
- **"digital menu vs printed menu"**: a table they can scan, then honest cases where they don't need us. Next: the free page.

Weak spots: no screenshots of real TVs on the guide (the gallery is on `/how-it-works`, linked), and no page answers "which TV size".

## Done when

1. `/how-to-show-menu-on-tv`, `/free-digital-menu-board`, `/digital-menu-board-for-cafes` and `/digital-menu-board-vs-printed-menu` build as static pages and return 200.
2. For every path in `siteConfig.pages`: built HTML has exactly one `<h1>`, a canonical equal to `absoluteUrl(path)`, `og:title`, `og:description`, `og:image` and `twitter:card` `summary_large_image`. Full title at most 60 characters, description at most 160 (unit test over `guidePages` plus the `howPage`, `pricingPage`, `demoPage` metas, and `siteConfig`).
3. Each inner page has a BreadcrumbList with two items. Each page that shows a FAQ has a FAQPage whose questions equal the visible `<summary>` texts in order (home, `/pricing`, free, cafés, versus). The guide has none.
4. `/opengraph-image` returns a 1200 by 630 PNG.
5. `sitemap.xml` lists every `siteConfig.pages` path; `proxy` `config.matcher` contains every one (test); `Accept: text/markdown` on a new page returns `/index.md`.
6. `/llms.txt` links every new page; `/index.md` contains each guide page's H1 and every FAQ question.
7. `site-content.test.ts`: every new H1, section title, FAQ title and `readNextTitle` ends with a period; no em dash; every `next` and `link` href is a path in `siteConfig.pages` (or `/tv-check`); the `₹998` cell equals 2 × the Plus per-screen price.
8. No new CSS selector in `src/app/(marketing)/*.css` (diff check). No `menuontv.in` literal in `src/`.
9. Footer shows a Guides column with four links. The header still has three cells.
10. `npm run lint`, `npm run typecheck`, `npm test` and `npm run build` pass.

## Open questions

- **Product:** are the free-plan terms final ("one screen, for good", no card, no time limit)? The free page leans on them. The FAQ does not say "no card" until this is confirmed.
- **Product:** may we cite vendor ranges (reprint, TV, power) with a named source on `/pricing` or the versus page? This design leaves them out.
- **Engineering:** the TV lab (`docs/tv-lab.md`). Topic 6, "which TV or stick", waits for its results. Until then no page names a brand.
- **Owner:** the domain (MT-4) and Search Console still matter more than any page here.
