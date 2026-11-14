# QR menu at the table and counter

Status: draft
Tracker: MT-89
Surface: owner app, guest's phone

## What it is
A QR card on every table and at the counter. A guest scans it and your live menu opens on their phone: the same dishes, prices and sold-out marks as the TV, with no app and no sign-up. It's the first step of ordering ([ordering plan](../ordering-plan.md)); this slice only shows the menu.

## Who uses it
- **Owners** add tables and print the cards. Staff can see and print the cards but not change them.
- **Guests** read the menu on their phone at the table or in the queue.

## What it does
**Tables and QR codes** (owner app, its own page at `/studio/tables`):
- The Counter card is always there. "Add tables" takes one name ("Table 4") or a range ("Tables 1 to 12").
- Each place shows its name, its QR and the link typed out. Actions: rename, remove, and "New QR code", which replaces the link so the old card stops working. Remove and New QR code ask first.
- "Print cards": a page of cards for A4, each with the restaurant's name, the place's name, the QR and "Scan to see the menu". It prints from a phone or a computer.
- Limits: names up to 40 characters and unique within the outlet; up to 100 tables (starting value). A duplicate name or a 101st table gets its own clear message.
- Empty state: only the Counter card, and one line on what tables are for.

**The guest's menu** (`/t/<link>`, on the guest's phone):
- At the top: the restaurant's name, the place ("Table 4" or "Counter"), and today's special once MT-25 is in.
- Categories in menu order. Each dish shows its veg mark, name, Hindi name if it has one, description, price or sizes, badges and photo.
- Sold-out dishes show "Sold out" and stay in place. Hidden dishes and categories outside their daypart don't show, as on the TV.
- An open page picks up changes (sold out, prices) within 30 seconds, without a reload.
- Photos load as the guest scrolls. The page works on a cheap Android phone over 4G.
- No order button or cart yet, and nothing that suggests one.
- A replaced, removed or made-up link shows "This QR code no longer works. Ask the staff for the menu."

## Design
Design to write.

## Data it touches
- **A new places store** per restaurant through `openDocumentStore`: outlet, kind (table or counter), name, the link and when it was made. Locally a gitignored `data/places.json` set by `PLACES_DATA_FILE`; on Netlify, a row in the database.
- **The link is kept, not hashed (D3).** This is the one exception to CLAUDE.md's "TV links are stored only as hashes": an owner must be able to reprint a lost card, and D2's "no new secrets" rules out encrypting the link. It holds on D3's four conditions:
  - a place link grants only the public menu and, later, an order the kitchen must accept, never owner data;
  - it is at least 128 bits of randomness and is never logged;
  - order status links stay hashed (MT-90);
  - recovery is "New QR code" plus pausing that place (MT-91), and a test checks that no Tables page or action returns another restaurant's links.
- The guest's menu comes from the same `screenRestaurant()` conversion as the TV, so the two always agree.

## Rules and edge cases
- Links are long and random (at least 128 bits) and never logged; logs carry place ids only.
- Menu reads are rate limited per address only, at the house ceiling of 600 a minute (as for TV links), so a Counter card shared by 40 phones on one café Wi-Fi never hits it. ETag 304 replies count against nothing. Per-link limits are for order submits only (MT-90).
- The guest page sets no cookies, loads no third-party scripts, sends no analytics and is `noindex`. It asks the server only for the menu and photos.
- When MT-29's switch is on, the guest's menu also shows calories, serving size, allergens and the 2,000 kcal line, because FSSAI's rule covers menu cards too.
- One outlet per restaurant for now; places belong to it.
- Owners only add, rename, remove or replace, checked in `guard.ts`, which shows the Tables errors (duplicate name, too many tables) as clear messages, not "Something went wrong".

## Not in this version
- Ordering, the cart and payment (MT-90 to MT-93).
- A "Scan to order" promo on the TV (MT-26's scan template can point at the Counter link once ordering exists).
- Guest choice of language, and search on the guest menu.
- Custom card designs or logos on the cards.

## Slices
1. **Platform: places and the guest's menu data.** New `src/features/places/` (schema, repository, link creation and lookup, pure and tested), new `src/app/studio/tables/actions.ts`, and new `src/app/api/t/[link]/menu/route.ts` (the menu as JSON with an ETag, rate limited). Adds `data/places.json` to `.gitignore`, and `PLACES_DATA_FILE` to CLAUDE.md's worktree line and the design preview in `.claude/launch.json`. Also owns `src/app/studio/guard.ts` (its `userMessage` knows only Screens, Accounts, MenuEdit and Photo errors today) and the CLAUDE.md line beside the TV-links rule, in D3's wording. Carries MT-29's fields if MT-29 slice 1 has merged.
2. **Design: the Tables page and the print sheet.** After slice 1. Owns `src/app/studio/tables/page.tsx`, `src/app/studio/tables/print/page.tsx` and new `src/features/places/components/`. Reuses `src/features/screen/qr.ts` for the codes. Starts after MT-29 slice 2 merges, since that slice owns the Restaurant page, and then also owns `src/app/studio/restaurant/page.tsx` to add the link to Tables, so the owner walkthrough can reach the page.
3. **Design: the guest's menu.** After slice 1. Owns new `src/app/t/[link]/page.tsx` and its components. If MT-29 merges after this, a follow-up slice adds its fields to the guest page.

## How we'll know it works
As the owner on a 375 px phone, with a second phone for the guest:
1. Tables shows the Counter card. "Tables 1 to 12" adds 12 tables.
2. A 13th "Table 4" is refused with a clear message, not "Something went wrong". So is a 101st table.
3. Print cards, save as PDF: the A4 sheet shows each card with the restaurant and table name. Each printed QR opens the right place on a phone.
4. Scan Table 4: the menu opens with "Table 4" at the top and no sign-in. It loads within 3 seconds on a phone with network speed set to Fast 4G (starting value).
5. The guest's menu matches the TV: same dishes, prices, sizes and veg marks. Hidden dishes are missing. A breakfast category is missing outside its hours.
6. Mark a dish sold out on Today: the open guest page shows "Sold out" on it within 30 seconds, with no reload.
7. "New QR code" on Table 4 asks first. Afterwards the old card shows "This QR code no longer works" and the new card opens the menu.
8. Remove Table 5: it asks first, then its card stops working.
9. Signed in as staff: the cards can be seen and printed, but there's no way to add, rename, remove or replace, and calling the actions directly is refused.
10. On the guest page, the browser's tools show no cookies, no third-party requests and a `noindex` tag.
11. Many requests a second from one address get "Too many tries" (429). 40 phones on the Counter link, refreshing every 30 seconds from one Wi-Fi address, never do, and replies of 304 Not Modified don't count toward the limit.
12. Signed in to a second restaurant: no Tables page, print sheet or action shows, changes or returns the first restaurant's links.
13. After scanning, printing and replacing cards, the server logs show place ids only, never a place link.
14. Each place link has at least 128 bits of randomness: 1,000 links made in a test are all different, and each is at least 22 base64url characters from a secure random source.
15. The menu reply for a place link carries no owner data: no email, phone number, member, session, screen token or other place's link.
16. Once MT-29 has shipped and its switch is on: the guest's menu shows calories, allergens and the 2,000 kcal line.
17. Design walks it as an owner setting up tables and as a guest at a table, both on a 375 px phone, and fixes what gets in the way.
