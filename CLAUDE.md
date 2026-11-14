@AGENTS.md

# MenuOnTV: project notes for Claude

Digital menu boards and screen ads for restaurants, on any TV, from one link. Read `PRODUCT.md`, `docs/platform-plan.md` and `docs/architecture.md` before changing product behaviour, and `docs/accounts-and-menu.md` before touching sign-in or the menu editor.

In these notes the **founder** is the person who runs MenuOnTV and talks to Claude. The **owner** is always a restaurant owner, our user.

## Who decides

- The founder decides. Agents propose, recommend and ask; they don't decide.
- Every decision goes in [docs/decisions.md](docs/decisions.md): numbered, dated, with the founder's own words quoted. If it isn't there (or in `PRODUCT.md`, `DESIGN.md` or the tracker, for what came before D1), it hasn't been decided. Ask rather than assume.
- HQ approves PRDs and merges pull requests once QA passes them, without waiting for the founder, who can overrule anything at a check-in (D1).
- Agents never create accounts, spend money, touch secrets, deploy or publish anything without the founder.

## Teams

We stay lean, and add a team only when the founder asks for one (D1). Each team runs in its own session; its role file is in `.claude/agents/`.

- **HQ**, the founder's office: plans with the founder, records decisions, cuts work into slices, approves PRDs, reviews pull requests and merges them once QA passes. HQ never writes product code. See [hq.md](.claude/agents/hq.md).
- **Product**: writes a short PRD for each page or feature in `docs/prd/`, tied to its tracker item. See [product-manager.md](.claude/agents/product-manager.md).
- **Design**: the product designer. Owns how MenuOnTV looks, reads and feels on all three surfaces (site, owner app, TV), writes each PRD's design section, and builds the look: components, CSS, copy and screen themes. See [product-designer.md](.claude/agents/product-designer.md).
- **Platform**: builds the product from approved PRDs: data, Server Actions, sign-in, pairing, the player and the screen loop. See [platform-engineer.md](.claude/agents/platform-engineer.md).
- **QA**: owns testing in its own session. It writes each slice's checks from its PRD and runs the full suite at the merge gate. The **verifier** is a role QA fills: an independent check on each slice. See [qa.md](.claude/agents/qa.md) and [verifier.md](.claude/agents/verifier.md).
- **On call** for public-site search work (2026-10-25): the [architect](.claude/agents/architect.md) and the [search analyst](.claude/agents/search-analyst.md).

## How we work

Move fast, write clean code, fix bugs when we find them, and keep a steady pace. The process exists to help with that. If a step isn't helping, say so.

- **PRD first.** Each page or feature starts with a short PRD in `docs/prd/`, one page at most, tied to its MT-n tracker item. Format in [docs/prd/README.md](docs/prd/README.md). Anything owners or guests see gets a design section from Design before Platform builds.
- **Own worktree, own branch.** Teams share this folder, so each works in its own git worktree under `.claude/worktrees/<team>` and opens pull requests to `main`. The main checkout stays on `main` and belongs to HQ.
- **Small slices.** One thin piece per pull request, an hour or two of work. If a slice grows past that, split it. A PRD's slices say who builds which files; two teams never edit the same file in one slice.
- **Whoever builds never verifies.** QA writes each slice's checks from its PRD, not from the code. A slice merges only when they pass.
- **Walk it as an owner.** Before a slice that changes what owners or guests see merges, Design uses it in the browser as a restaurant owner would (phone width included) and fixes what gets in the way. Tests alone don't count.
- **Bugs.** Fix them when you find them; they need no PRD. Each fix comes with a test that fails before it and passes after.
- **Clean code.** Simple and readable. Build what the slice needs, not what we might need later. Delete what's unused.
- **Tests.** While building, run only the tests you touch. QA runs the full suite at the merge gate with `.claude/qa/run-suite.sh`: once at the top of a stack of PRs, or at a lone PR's head.
- **Pull requests.** Each one names its PRD, its slice and its MT key, says how to run it, and says what was left out. HQ reviews it against the PRD and merges once QA reports PASS at its head.

## Talking to the founder

Short and plain, leading with the answer. Then the reason, if it's needed. When you need a decision, ask one clear question and say what you'd recommend.

## Commands

- `npm run dev` / `npm run build`: Next.js 16 (Turbopack, Cache Components on). Both first run `npm run player`, which builds the standalone TV player into `public/player` (ADR-005); run it again after changing screen components or `screen.css` to see the change on a `/s/<token>` TV.
- `npm test` / `npm run coverage`: Vitest. Coverage gates are on `src/lib` and `src/features`.
- `npm run lint` and `npm run typecheck` (which runs `next typegen` first, so a fresh worktree has Next's route types)
- **From a team worktree:** restaurant data in `data/` is gitignored, so a worktree starts empty. Point the app at the main checkout's files with `ACCOUNTS_DATA_FILE`, `MENUS_DATA_FILE`, `SCREENS_DATA_FILE` and `PHOTOS_DIR`, and use a port from 4330 up; 4327 is the main checkout's. The `menutelly-design` preview in `.claude/launch.json` does this for `.claude/worktrees/design`.
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

The tracker (`/tracker`, data in `data/tracker.json`, seeded from `src/features/tracker/seed`) is the roadmap. Keys are MT-n. The Planned column holds only v0, in build order (`src/features/tracker/seed/v0.ts`); everything else waits in Backlog. Add new work as items with Why, What and "Done when". Decisions go in `docs/decisions.md`; each item's PRD goes in `docs/prd/` and names its MT key.
