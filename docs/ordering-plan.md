# Ordering plan: from the table to pickup

Written 15 November 2026 by Product, from the founder's goal in [D2](decisions.md) and HQ's calls in [D3](decisions.md). Status: approved with changes by HQ, and the changes are folded in: HQ's review of PR #12 and D3 are now in this doc and in the tracker's Done-when lines, where QA tests them. The tracker holds each step as an item in the Orders area (MT-89 onwards, with MT-40 and MT-41); this doc is the map.

## The goal
A guest sees the menu, orders, follows the order and is told when it's ready, at the table or for pickup. All of it runs from the owner's phone and the TV they already have, with no new accounts or keys.

## Where ordering stops (D2)
We take orders, run the kitchen's order board and tell guests when food is ready. We don't do billing, GST invoices, inventory, staff accounts for guests, delivery, tips, coupons or table bill-splitting. Those stay with the owner's POS. Until orders reach the POS (MT-105, on top of MT-38's adapters, which only read menus and stock), staff key each board order into the POS for the bill. Menu prices already include tax, so an order total is the sum of menu prices. It's an order summary, not a bill.

## The journey
1. **Scan.** Every table has a printed QR card, and the counter has one (also shown on the TV as a "Scan to order" promo). It opens the restaurant's menu on the guest's phone: no app and no sign-up.
2. **Choose.** The menu matches the TV: same dishes, prices, veg marks and photos. Sold-out dishes and dishes outside their daypart can't be added. The guest picks sizes and quantities and can add a short note per dish ("less spicy").
3. **Order.** At a table, the order carries the table's name. At the counter, the guest may add a first name for pickup. The server prices the order from the live menu and gives it a number, like "Order 42". If a price changed while the guest was choosing, the guest confirms the new total first (MT-99).
4. **Pay.** At the counter, or by a UPI link to the owner's own UPI ID with the amount filled in, shown once the kitchen accepts the order. Staff mark an order paid when they see the money; we never handle or check payments. With "Pay first", on by default for the Counter, an unpaid order shows on the board as "Waiting for payment" and the guest's page says "Not confirmed yet" until staff mark it paid.
5. **Follow.** The guest's phone shows a status page with the order number very large: Placed, then Being made, then Ready. If no one accepts the order within 5 minutes, the page asks the guest to tell the staff ("Pay at the counter to start your order" for an unpaid pay-first order). That is only a fallback: the board's repeating alert and auto-pause are what catch missed orders. A guest who loses the page sees "Lost this page? Show order 42 at the counter.", and the place's menu page lists "your orders today" from the phone's own storage.
6. **Ready.** The status page changes at once. With the page open, after one tap turns sound on, it plays a sound on Android and iPhone and vibrates on Android. A guest whose phone is locked is told only by the TV (MT-40) until web push (MT-96). Pickup numbers show on the TV under "Ready for pickup". At a table, the page says the food is on its way.
7. **Done.** Staff mark it collected or served. It leaves the TV, and the guest's page says "Enjoy your meal".

The kitchen sees the same order on a board in the owner app (a phone or tablet in the kitchen). While any order waits to be accepted, the board repeats its alert every 30 seconds. If no board has been live for 2 minutes, ordering pauses by itself: the guest's menu says to order at the counter, and the owner app says no kitchen board is open.

## Order states
"Open" means Placed, Accepted or Ready. Caps count only Placed orders.

| State | Set by | Next |
| --- | --- | --- |
| Placed (waiting to be accepted) | Guest | Accepted, Rejected, Cancelled |
| Accepted (being made) | Staff | Ready, Cancelled |
| Ready | Staff | Completed, Cancelled |
| Completed (collected or served) | Staff | |
| Rejected, with a reason (sold out, closing, other) | Staff | |
| Rejected, "Not accepted in time" | The server, 15 minutes after Placed | |
| Cancelled | The guest while Placed; staff from Accepted or Ready, with a reason (ran out, guest left, mistake) | |
| Closed | The server, for an Accepted or Ready order 6 hours old | |

Paid or not paid is tracked separately: staff mark it, any time. A paid order that is rejected or cancelled shows "Refund ₹X owed" on the board until staff mark it refunded, and the guest's page says "If you paid, staff will refund you."

**The ordering day** ends at a business-day cutoff, 04:00 outlet time by default (D3), because dayparts already count the small hours as the night before. Order numbers restart at the cutoff. Accepted and Ready orders that cross it stay open until staff finish them or they are 6 hours old.

## What we store
- **Ordering settings** per restaurant: taking orders on, paused or off; table orders on or off; pickup on or off; a pause for each place; "Pay first" (on for the Counter, off for tables); the start number for phone orders; the owner's UPI ID and payee name (optional).
- **Places:** each table and the counter, with its name and a QR link that can be replaced. The link is stored as it is, not hashed, so an owner can reprint a lost card (D3). It grants only the public menu and an order the kitchen must accept, never owner data, and it is at least 128 bits of randomness and never logged. Recovery is "New QR code" plus pausing that place. MT-89 has the details.
- **Orders:** outlet, place, number, business day, lines (dish, name and price at the time, size, quantity, note), total, an optional pickup name, state with the time of each change, reject or cancel reason, payment method, paid and refunded marks, and a hash of the guest's status-page secret.
- **Nothing about the guest.** There are no guest accounts, phone numbers, emails or cookies, and no tracking. The guest's phone keeps "your orders today" in its own storage, and the server never sees that list.

Orders are written by many phones at once and change far more often than menus, so they get a table in Netlify Database, not one JSON document (D3). MT-90 starts with an ADR from Platform for that table. The ADR also names:
- **Safe retries:** the phone makes the status secret (32 random bytes) and saves it before sending. The server stores its hash (`hashSecret`) under a unique constraint, so a double tap or a retry after a dropped reply makes one order.
- **Numbers and caps in one transaction,** so 20 orders sent at once get 20 different numbers and the caps hold.
- **The retention sweep:** a sweep on any order write across all outlets, or a Netlify Scheduled Function.

## Rules that hold everywhere
- **The server sets every price.** It prices each order from the live menu at that moment (sizes, sold out, hidden, dayparts), ignores prices the phone sends, and stores the price on each line. Hidden dishes stay in the stored menu, so a crafted order for one is refused. A dish that sold out while the guest was choosing is refused with a clear message.
- **Abuse:** a photo of a table's QR could be used to order from anywhere. Defences (starting values, D3):
  - Caps count only Placed orders: 10 per table link, 40 on the Counter link, 60 per outlet, enforced inside the insert. A Placed order closes after 15 minutes, so it stops counting.
  - Per-link rate limits apply to order submits only. Menu reads are limited per address only, at the house ceiling of 600 a minute, so 40 phones on one café Wi-Fi never hit it. ETag 304 replies count against nothing.
  - Up to 30 lines per order and 20 of one dish. A pickup name is up to 30 characters, each note and an "other" reason up to 80, trimmed, and the board shows them as plain text.
  - The kitchen accepts or rejects every order.
  - The owner can pause ordering, or one place, in one tap; reject all new Counter orders in one tap; and replace any QR link.
- **Order numbers** restart at each business-day cutoff from the owner's start number for phone orders (for example 501, so a number called out never matches a till token). A number still open from before the cutoff is skipped.
- **Retention (D3):** pickup names and dish notes are cleared after 24 hours. The rest of an order (no personal data) is kept 30 days, for the owner's recent orders, then deleted. Both ship with the first ordering item (MT-90), not last. A status link stops working at the cutoff after its order ends.
- **Logs:** place links, status links, pickup names, notes and UPI IDs are never logged. Logs carry order and place ids only.
- **TV:** ready numbers never cover prices (screen playbook) and never show names.
- **Roles:** staff run the board (accept, reject, cancel, ready, completed, paid, refunded, pause). Owners also set up tables, payment and the ordering switches.

## Build order
Every item below sits in Backlog, phase v1 ("Sell more"), ranked in this order (D3). Moving them to Planned is a separate HQ call, made when building starts, with CLAUDE.md's "Planned holds only v0" line changed at the same time.

| # | Item | Key | Why here |
| --- | --- | --- | --- |
| 1 | QR menu at the table and counter | MT-89 | Tables, QR cards and the guest's phone menu. Useful alone, and everything after needs it. PRD: [mt-89-qr-menu.md](prd/mt-89-qr-menu.md) |
| 2 | Order from the phone | MT-90 | Cart, order, number, the switches, the status page as it loads, retention and the orders table (ADR) |
| 3 | Confirm a changed price | MT-99 | A price changed mid-cart never passes silently |
| 4 | Kitchen order board | MT-91 | Without it orders go nowhere. Liveness, auto-pause, cancel after accept, Pay first and the paid mark |
| 5 | Send a test order | MT-100 | The owner hears the chime and sees the board work before switching ordering on |
| 6 | Mark one dish unavailable at accept | MT-101 | One sold-out dish shouldn't reject a whole order |
| 7 | Pair the kitchen board like a TV | MT-102 | Only if MT-91's ADR keeps the board on a renewing session instead |
| 8 | Live status and the ready alert | MT-92 | Tells the guest without any provider |
| 9 | Ready for pickup on the TV | MT-40 | The TV calls out numbers, from the board or a staff keypad, on its own live event |
| 10 | Pay by the owner's UPI | MT-93 | The amount filled in, from Accepted on |
| 11 | Orders by table on the board | MT-103 | Table guests order in rounds and pay once |
| 12 | Today's orders for the owner | MT-94 | The list and the day's total of Completed orders, for 30 days |
| 13 | Wait time on the guest's page and the TV | MT-41 | "About 8 minutes" from recent ready times |

**Ordering stays switched off until MT-90, MT-91 and MT-92 are all in.** Without MT-92, nothing tells the guest the food is ready.

Later, no founder needed: ordering combos and happy-hour deals at the deal price (after MT-26), and sending board orders to the POS (MT-105, after MT-38's adapters).

## Waiting on the founder
Each needs an account or a key (D2). They're in the tracker, tagged `waiting-on-founder`, and not built or stubbed.

| Item | Key | Needs |
| --- | --- | --- |
| "Your order is ready" by SMS or WhatsApp | MT-95 | An SMS provider with a DLT-registered template, or a WhatsApp Business account. The guest would type a number, used for that message only |
| Web push when an order is ready | MT-96 | Web push keys |
| Online payment that marks orders paid by itself | MT-97 | A payment gateway account (Razorpay) |

**One decision for the founder (MT-104):** "Is ordering free for every restaurant until billing (MT-33), and priced per outlet rather than per screen after that?" HQ and Product recommend yes. HQ doesn't set prices (D3), plans are priced per screen today, and the site promises "One screen is free forever", so ordering stays off the pricing page until the founder answers. It doesn't block MT-89 to MT-92.

## Calls in this plan that HQ or the founder can change
- The ordering items sit in Backlog, phase v1, in build order, and promotion to Planned is its own HQ call (D3).
- MT-40 is "Ready for pickup on the TV", fed by the board or a staff keypad. MT-41 moves to Orders and covers the status page too. MT-42 keeps QR codes for reviews and chat, since ordering by QR is now MT-89 and MT-90.
- Starting values in D3: orders kept 30 days, names and notes cleared after 24 hours, the 04:00 cutoff, caps of 10, 40 and 60 Placed orders, and 15 minutes to accept. Starting values from HQ's review: the 5-minute guest message, 2 minutes without a live board before auto-pause, the alert every 30 seconds, and 6 hours for orders that cross the cutoff.
