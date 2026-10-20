@AGENTS.md

# MenuOnTV: project notes for Claude

Digital menu boards and screen ads for restaurants, on any TV, from one link. Read `PRODUCT.md`, `docs/platform-plan.md` and `docs/architecture.md` before changing product behaviour, and `docs/accounts-and-menu.md` before touching sign-in or the menu editor.

## Commands

- `npm run dev` / `npm run build`: Next.js 16 (Turbopack, Cache Components on). Both first run `npm run player`, which builds the standalone TV player into `public/player` (ADR-005); run it again after changing screen components or `screen.css` to see the change on a `/s/<token>` TV.
- `npm test` / `npm run coverage`: Vitest. Coverage gates are on `src/lib` and `src/features`.
- `npm run lint` and `npm run typecheck`
- **Stale CSS:** Turbopack keeps a persistent cache, and `next build` can ship an old `globals.css`. If a CSS change doesn't show, delete `.next` and build again. A running `next dev` also keeps old theme tokens from `globals.css`; for a clean dev server beside it, run `NEXT_DIST_DIR=.next-check next dev -p 4329` (delete that folder afterwards and drop the two lines it adds to `tsconfig.json`).

## Conventions

- **Next.js 16:** read `node_modules/next/dist/docs/` before using an API. Middleware is `src/proxy.ts`. Request-time data in pages goes inside `<Suspense>`.
- **One content source:** site copy lives in `src/content/site-content.ts`; the home page, JSON-LD, `/llms.txt` and `/index.md` all read it.
- **Copy:** plain language, sentence case, buttons start with a verb, headlines end with a period. No em dashes, no all-caps or eyebrow labels, no fake logos, testimonials or metrics.
- **Screens:** sizes in container units, rules from `docs/screen-design.md`. Theme colours live in `src/features/screen/themes.ts` and must pass `themes.test.ts`. The loop is pure and tested (`loop.ts`).
- **Data:** repositories behind interfaces, zod at every boundary, the API envelope from `src/lib/api-response.ts`, immutable updates. Every repository keeps one JSON document through `openDocumentStore` (`src/lib/document-store.ts`): a file in `data/` locally, a row in Netlify Database (Postgres) on Netlify; dish photos go to Netlify Blobs there (ADR-009).
- **Privacy:** no guest tracking, ever. Never log emails, phone numbers, names or screen tokens.
- **TV links:** tokens are stored only as hashes (`src/features/screens/tokens.ts`). Pairing creates a TV's token when the TV collects it; never store a token.
- **Owner app:** restaurant accounts (`src/features/accounts`), sign-in by a 6-digit code, sessions stored as hashes. Every owner Server Action goes through `src/app/studio/guard.ts`, which checks the session and role itself (actions can be called from any page) and scopes data to the member's restaurant. Owners do everything; staff edit the menu and sold out. Read the time only after the session check (`currentAccess` calls `connection()`), or Cache Components rejects the prerender.
- **Menu:** stored as data in paise (`src/features/menu`), edited by pure functions on the server's latest copy; `screenRestaurant()` turns it into what TVs play, so the editor preview and TVs agree.
- **Checking screens end to end:** a TV page must be in the foreground in headless Chrome, or it never hydrates. Wait for a form to hydrate before submitting it.

## Where the plan lives

The tracker (`/tracker`, data in `data/tracker.json`, seeded from `src/features/tracker/seed`) is the roadmap. Keys are MT-n. The Planned column holds only v0, in build order (`src/features/tracker/seed/v0.ts`); everything else waits in Backlog. Add new work as items with Why, What and "Done when".
