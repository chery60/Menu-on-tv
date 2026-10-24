# Home page for search (2026-10-25)

Goal: when a restaurant owner searches for a way to put their menu on a TV, MenuOnTV is the first result they trust. This round fixes what the code controls on the home page; the rest is in "Outside the code".

## Who searches, and for what

Owners and managers of cafés, quick-service counters and bakeries in India, on a phone, mostly in English.

| Intent | Queries we aim at |
|---|---|
| The product | digital menu board, digital menu board for restaurants, TV menu board, menu board app |
| India and price | digital menu board India, digital menu board price, free digital menu board |
| How to | how to show menu on TV, cafe menu on smart TV, menu on TV without an app |

The head term is "digital menu board". Every page signal leads with it, in plain words.

## What changes

1. **Title, 60 characters or fewer, head term first:** "Digital menu board for restaurants, on any TV · MenuOnTV". The live title is about 70 characters and Google cuts it.
2. **Description, 160 characters or fewer.** The live one is about 250 characters and gets cut. It also feeds the JSON-LD, `/llms.txt` and `/index.md`.
3. **H1 and lead say what it is:** "A digital menu board on the TV you already own." The brand line "Your menu, on your TV." stays on the leave-behind card.
4. **The FAQ shows on the home page.** The home page's JSON-LD already describes a FAQPage that only `/pricing` showed; markup must match what people see. Three questions people search for are added: what a digital menu board is, what it costs in India, and showing a menu on a smart TV without an app. One content source, so `/pricing`, `/llms.txt` and `/index.md` get them too.
5. **Search Console:** `GOOGLE_SITE_VERIFICATION` adds Google's verification tag, so the owner can verify the site and submit the sitemap.
6. **Sitemap date** moves to today.
7. **A test** keeps the title at 60 characters or fewer and the description at 160 or fewer.

## Paper test

Read the page top to bottom as an owner who searched "digital menu board price India":

- The result's title and description say what it is and that one screen is free, without being cut.
- The H1 repeats the words they searched for.
- The FAQ answers the price question in rupees without leaving the page.

## Done when

- The title and description fit, and the test guards them.
- The home page shows the FAQ, and its FAQPage JSON-LD matches it.
- Lint, typecheck, tests and build pass.

## Not in this round

The keywords meta tag (Google ignores it), a share image, titles for the other pages and more JSON-LD.

## Outside the code (these matter more for ranking)

- Our own domain (tracker MT-4). A `*.netlify.app` address is a weak base to rank from.
- Google Search Console: verify the site, submit `/sitemap.xml`.
- A Google Business Profile, and listings on directories restaurant owners use.
- Links from other sites: food-business blogs, POS partners, local press.
