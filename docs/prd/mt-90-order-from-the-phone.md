# Order from the phone

Status: draft
Tracker: MT-90
Surface: guest's phone, owner app

## What it is
Guests add dishes to an order from the QR menu (MT-89), place it and get a number, like "Order 42". We price every order from your live menu, and the guest gets a page showing their order. Step 2 of the [ordering plan](../ordering-plan.md).

## Who uses it
- **Guests** order from their phone at a table or at the counter, with no app, sign-up or phone number.
- **Owners** switch ordering on, pause it or switch it off, and pick the first order number of the day. Staff can't change these.

## What it does
**Ordering settings** (owner app, `/studio/orders/settings`, owners only):
- Taking orders: On, Paused or Off, Off until the owner changes it. Off shows the menu only, as in MT-89. Paused shows "Ordering is paused. Please order at the counter."
- Table orders on or off, and pickup orders (the Counter) on or off. Both on by default.
- Start number for phone orders: 1 to 9,000, default 1, with a hint to pick one the till never reaches, like 501, so a number called out never matches a till token.

**The cart** (on the guest's menu, `/t/<link>`, while ordering is on for that place):
- Each dish that can be ordered has "Add": a size if it has sizes, a quantity from 1 to 20, and an optional note up to 80 characters ("less spicy"). Sold-out dishes can't be added; one that sells out while in the cart is marked "Sold out" and must be removed before ordering.
- A bar at the foot shows the count and total. Review lists each line and price, the total and "Prices include tax", and at the Counter only an optional "Name for pickup", up to 30 characters. Then "Place order".
- The cart is kept on the phone, so a reload doesn't lose it, and cleared once the order is placed.
- Refusals say what to do, for example "Masala dosa just sold out. Remove it to place your order." or "Lots of orders are waiting right now. Please order at the counter."

**Placing an order:**
- Before sending, the phone makes a secret (32 random bytes) for the order's status link and saves it in its own storage. A double tap or a retry sends the same secret, so it makes one order with one number.
- The server prices the order and gives it the next number: from the start number at each business-day cutoff, 04:00 outlet time (D3), up by one, skipping a number still open from before the cutoff. The phone saves the number beside the secret and opens the status page.

**The status page** (`/o/<status link>`):
- The order number, very large. The place ("Table 4" or "Counter") and the pickup name, each line with size, quantity and note, and the total.
- The state as it stands when the page loads: Placed "Waiting for the kitchen to accept", Accepted "Being made", Ready "Ready. Collect it at the counter." (pickup) or "Ready. It's on its way to your table." (table), Completed "Enjoy your meal", Rejected or Cancelled with the reason, Closed "This order is closed". MT-92 makes the page live.
- While Placed: "Cancel order", which asks first.
- A made-up link, or one for an order that ended before the last cutoff: "This order link no longer works. Ask the staff if you need help."

## Design
Design to write.

## Data it touches
- **Orders,** in a new table (ADR below): outlet, place, business day, number, lines (dish id, name and price at the time, size, quantity, note), total in paise, pickup name, state with the time of each change, reason, payment method, paid and refunded marks, and the status secret's hash (`hashSecret`). Never the status link itself.
- **Ordering settings,** in MT-89's places document, since they change rarely. The new fields have defaults, so a places document saved before them still loads.
- **Reads** the stored menu (`src/features/menu`) for prices, sizes, `hidden`, `soldOutOn` and dayparts, and the restaurant's time zone. Nothing writes to the menu.
- **The phone's own storage** holds the cart, each status secret and its number. The server never reads it.

## ADR: an orders table
Platform writes this as the next free ADR number in `docs/architecture.md` in slice 2.
- **Context:** many phones write orders at once, and orders change far more often than menus. One JSON document per restaurant (`openDocumentStore`) would be rewritten and locked on every order.
- **Decision:** an `orders` table in Netlify Database, made by a migration in `netlify/database/migrations`. The status hash is unique, and so is (outlet, business day, number). Placing an order is one transaction: return the existing order for a known status hash; count Placed orders for the place and the outlet; take the next number under a lock; insert.
- **Local fallback,** as the repo does elsewhere: with no `NETLIFY_DB_URL`, the same `OrdersRepository` interface writes a gitignored `data/orders.json` (`ORDERS_DATA_FILE`), with writes queued by `inTurn`. One local process gets the same guarantees: a unique status hash, and numbers and caps in one turn. For development and tests only.
- **Retention sweep:** Product recommends a Netlify Scheduled Function every hour, across all outlets, plus the same sweep after each order write so local runs see it. Platform picks and names it in the ADR.
- **Consequences:** the board and the status page read orders with queries, not whole documents. Polling stays until ADR-004's pub/sub channel.

## Rules and edge cases
- **The server sets every price,** from the latest menu at that moment. It ignores prices the phone sends and stores the price on each line. A dish that is hidden, sold out today, outside its category's daypart, or a size the dish doesn't have is refused with a clear message, even in a crafted order.
- **Caps count only Placed orders (D3):** 10 per table link, 40 on the Counter link, 60 per outlet, checked inside the insert.
- **Rate limits:** order submits are limited per place link, 20 a minute (Product's starting value), under the house ceiling of 600 requests a minute per address. Menu reads are limited per address only (MT-89). So 40 Counter orders from one café Wi-Fi in 5 minutes all go through.
- **Limits:** up to 30 lines, and no more than 20 of one dish across the order. Names and notes are trimmed and shown as plain text.
- **Retention (D3):** pickup names and notes are cleared after 24 hours, and orders deleted after 30 days. A status link stops working at the cutoff after its order ends.
- **Logs** carry order and place ids only, never place or status links, pickup names or notes.
- **Privacy:** the cart and status page set no cookies, load no third-party scripts, are `noindex`, and send no referrer, so a status link never leaks.
- **Go-live gate:** ordering stays off until MT-90, MT-91 and MT-92 are all in. Nothing in the owner app links to ordering settings until MT-91's last slice adds the Orders tab, which merges after MT-92.
- One outlet per restaurant; every time uses the restaurant's time zone.

## Not in this version
- The kitchen board, paid marks, Pay first, per-place pause and the 15-minute close (MT-91). Until then only the guest can move an order, by cancelling it.
- The live page, the ready alert, "Lost this page?" and "your orders today" (MT-92).
- Confirming a changed price (MT-99), UPI (MT-93), a test order (MT-100).
- Combo and happy-hour prices, and changing the 04:00 cutoff.

## Slices
No slice edits `src/features/screen/` or `src/features/menu/to-screen.ts`. The TV piece is MT-40.
1. **Platform: the order rules.** New `src/features/orders/` (schema, state moves, pricing from the stored menu, business day and numbering), pure and tested. No storage, no UI.
2. **Platform: the orders table.** After slice 1. The ADR, the migration, and the repository in `src/features/orders/` with its Postgres and JSON-file versions (safe retries, numbers and caps in one transaction) and the sweep, with tests. Adds `data/orders.json` to `.gitignore`, and `ORDERS_DATA_FILE` to CLAUDE.md's worktree line and the design preview in `.claude/launch.json`. Owns the scheduled function if the ADR picks one.
3. **Platform: settings and the guest's endpoints.** After slice 2 and MT-89 slice 1. Owns `src/features/places/` (the settings), new `src/app/studio/orders/actions.ts` (owners only), `src/app/studio/guard.ts` (ordering errors in `userMessage`), `src/app/api/t/[link]/menu/route.ts` (whether ordering is on for the place), new `src/app/api/t/[link]/orders/route.ts` (place an order) and new `src/app/api/o/[secret]/route.ts` (read and cancel).
4. **Design: the settings page.** After slice 3. Owns new `src/app/studio/orders/settings/page.tsx` and new `src/features/orders/components/settings/`. Not linked from the owner app (go-live gate).
5. **Design: the cart.** After slice 3 and MT-89 slice 3. Owns `src/app/t/[link]/page.tsx` and new `src/features/orders/components/cart/`.
6. **Design: the status page.** After slice 3. Owns new `src/app/o/[secret]/page.tsx` and new `src/features/orders/components/status/`.

## How we'll know it works
As the owner on a 375 px phone, with a second phone for the guest:
1. A new restaurant's ordering is Off: the QR menu has no "Add", and no owner app page links to ordering settings.
2. Set On, then table orders off: Table 4 has no "Add" and the Counter does; pickup off, the reverse. Paused: both say "Ordering is paused. Please order at the counter." A newly opened menu follows at once, an open one within 30 seconds, and an order sent in between is refused with that message.
3. As staff, the settings can't be changed, and calling the actions directly is refused.
4. At Table 4, order a dish in a size and 2 of another with "less spicy": the status page shows the number very large, Table 4, every line and note, and a total equal to the sum of menu prices.
5. Crafted orders: a price sent by the phone is ignored and the menu's is stored. A hidden dish, a sold-out dish, a breakfast dish outside its hours and a size the dish doesn't have are each refused with a clear message, and no order is made.
6. Mark a dish in the cart sold out: within 30 seconds the cart marks it, and placing the order says to remove it.
7. 31 lines, 21 of one dish, a 31-character name and an 81-character note are each refused with a clear message. A note typed as `<b>hi</b>` shows as typed.
8. Start number 501: the day's orders are 501, 502 and on. With the clock moved past 04:00 outlet time, numbers restart at 501, skipping a 501 still open.
9. The 11th Placed order at Table 4 is refused while Table 5 still orders; so are the 41st on the Counter and the 61st at the outlet.
10. 40 Counter orders from one address in 5 minutes all go through. Many submits a second on one link get "Too many tries" (429), while that link's menu still loads.
11. A double tap on "Place order", and a retry after the reply is dropped, make one order with one number.
12. 20 orders sent at once get 20 different numbers, and 15 at once to one table make exactly 10, on the JSON-file fallback and on Netlify Database (a deploy preview, or the Postgres repository with a real pool).
13. "Cancel order" while Placed asks first; then the page says Cancelled, and the order stops counting toward the caps.
14. Seeded orders in each state show the words above, with the reason for Rejected and Cancelled. An order that ended before the last cutoff, and a made-up link, show "This order link no longer works".
15. Seed an order 25 hours old with a pickup name and notes, in an outlet with no other orders, run the sweep the ADR names, and query the table: no name or note is left. An order 31 days old is gone.
16. Query the orders table for a status link: only its hash is there. The logs from placing, cancelling and refused orders show order and place ids only.
17. The cart and status page set no cookies, make no third-party requests, carry `noindex`, and send no referrer.
18. Design walks it on a 375 px phone as an owner switching ordering on, and as a guest ordering at a table and at the counter, and fixes what gets in the way.
