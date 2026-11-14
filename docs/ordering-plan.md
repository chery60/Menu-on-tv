# Ordering plan: from the table to pickup

Written 15 November 2026 by Product, from the founder's goal and HQ's calls in [D2](decisions.md). Status: draft, for HQ's independent review. The tracker holds each step as an item in the Orders area (MT-89 onwards, with MT-40); this doc is the map.

## The goal
A guest sees the menu, orders, follows the order and is told when it's ready, at the table or for pickup. All of it runs from the owner's phone and the TV they already have, with no new accounts or keys.

## Where ordering stops (D2)
We take orders, run the kitchen's order board and tell guests when food is ready. We don't do billing, GST invoices, inventory, staff accounts for guests, delivery, tips, coupons or table bill-splitting. Those stay with the owner's POS, and a POS link comes later (MT-38). Menu prices already include tax, so an order total is the sum of menu prices. It's an order summary, not a bill.

## The journey
1. **Scan.** Every table has a printed QR card, and the counter has one (also shown on the TV as a "Scan to order" promo). It opens the restaurant's menu on the guest's phone: no app and no sign-up.
2. **Choose.** The menu matches the TV: same dishes, prices, veg marks and photos. Sold-out dishes and dishes outside their daypart can't be added. The guest picks sizes and quantities and can add a short note per dish ("less spicy").
3. **Order.** At a table, the order carries the table's name. At the counter, the guest may add a first name for pickup. The server prices the order from the live menu and gives it a number, like "Order 42".
4. **Pay.** At the counter, or by a UPI link to the owner's own UPI ID with the amount filled in. Staff mark an order paid when they see the money. We never handle or check payments.
5. **Follow.** The guest's phone shows a live status page: Placed, then Being made, then Ready. If no one accepts the order within 5 minutes, the page says so and asks the guest to tell the staff.
6. **Ready.** The status page changes at once, with sound and vibration where the phone allows. Pickup numbers show on the TV under "Ready for pickup". At a table, the page says the food is on its way.
7. **Done.** Staff mark it collected or served. It leaves the TV, and the guest's page says "Enjoy your meal".

The kitchen sees the same order on a board in the owner app (a phone or tablet in the kitchen), with a chime for each new order.

## Order states
| State | Set by | Next |
| --- | --- | --- |
| Placed | Guest | Accepted, Rejected, Cancelled |
| Accepted (being made) | Staff | Ready |
| Ready | Staff | Completed |
| Completed (collected or served) | Staff | |
| Rejected, with a reason (sold out, closing, other) | Staff | |
| Cancelled | Guest, only while Placed | |
| Closed | At midnight in the outlet's time zone, for anything still open | |

Paid or not paid is tracked separately: staff mark it, any time.

## What we store
- **Ordering settings** per restaurant: taking orders on, paused or off; table orders on or off; pickup on or off; the owner's UPI ID and payee name (optional).
- **Places:** each table and the counter, with its name and a QR link that can be replaced. The link is printed for anyone to see, so unlike a TV link it isn't a secret: it opens the menu and lets a guest send an order the kitchen must accept (MT-89 explains why it's kept, so cards can be reprinted).
- **Orders:** outlet, place, number, the outlet's date, lines (dish, name and price at the time, size, quantity, note), total, an optional pickup name, state with the time of each change, reject reason, payment method and paid mark, and a hash of the guest's status-page link.
- **Nothing about the guest.** There are no guest accounts, phone numbers, emails or cookies, and no tracking. The guest's phone keeps "your orders today" in its own storage, and the server never sees that list.

Orders change far more often than menus. One JSON document for every restaurant's orders won't hold (`document-store.ts` says hot data moves to tables), so MT-90 starts with an ADR from Platform for an orders table in Netlify Database.

## Rules that hold everywhere
- **The server sets every price.** It prices each order from the live menu at that moment (sizes, sold out, dayparts), ignores prices the phone sends, and stores the price on each line. A dish that sold out while the guest was choosing is refused with a clear message.
- **Abuse:** a photo of a table's QR could be used to order from anywhere. Defences:
  - Rate limits per QR link and per address.
  - Caps of 30 lines per order, 20 of any dish and 10 open orders per QR link (starting values).
  - The kitchen accepts or rejects every order.
  - The owner can pause ordering in one tap and replace any QR link.
- **Order numbers** start at 1 each day in the outlet's time zone. A number still open from the day before is skipped.
- **Retention:** the pickup name and dish notes are cleared after a day. The rest of an order (no personal data) is kept 30 days, for the owner's recent orders, then deleted. This is an HQ call (D2) the founder can change.
- **TV:** ready numbers never cover prices (screen playbook) and never show names.
- **Roles:** staff run the board (accept, reject, ready, completed, paid, pause). Owners also set up tables, payment and the ordering switch.

## Build order
Every item below sits in Backlog, ranked in this order, and moves to Planned when the v0 tracker work is done (D2). HQ decides when, because CLAUDE.md keeps Planned for v0.

| # | Item | Key | Why first |
| --- | --- | --- | --- |
| 1 | QR menu at the table and counter | MT-89 | Tables, QR cards and the guest's phone menu. Useful alone, and everything after needs it. PRD: [mt-89-qr-menu.md](prd/mt-89-qr-menu.md) |
| 2 | Order from the phone | MT-90 | Cart, order, number, the status page, the orders table (ADR) |
| 3 | Kitchen order board | MT-91 | Without it orders go nowhere. Ordering stays switched off until 2 and 3 are both in |
| 4 | Live status and the ready alert on the guest's phone | MT-92 | Tells the guest without any provider |
| 5 | Ready for pickup on the TV | MT-40 | The TV does the calling out |
| 6 | Pay at the counter or by the owner's UPI | MT-93 | The amount filled in; staff mark it paid |
| 7 | Today's orders for the owner | MT-94 | The list and the day's total, kept 30 days |

Later, no founder needed: queue and wait times (MT-41), ordering combos and happy-hour deals at the deal price (after MT-26), and the POS link (MT-38).

## Waiting on the founder
Each needs an account or a key (D2). They're in the tracker, tagged `waiting-on-founder`, and not built or stubbed.

| Item | Key | Needs |
| --- | --- | --- |
| "Your order is ready" by SMS or WhatsApp | MT-95 | An SMS provider with a DLT-registered template, or a WhatsApp Business account. The guest would type a number, used for that message only |
| Web push when an order is ready | MT-96 | Web push keys |
| Online payment that marks orders paid by itself | MT-97 | A payment gateway account (Razorpay) |

**One more decision for the founder:** is ordering in Free or Plus? Recommendation: free for every restaurant until billing (MT-33), and decide the split then, as for MT-26's schedules.

## Calls in this plan that HQ or the founder can change
- The ordering items sit in Backlog and phase v1 ("Sell more") until the v0 work is done.
- MT-40 becomes "Ready for pickup on the TV". MT-41 moves to Orders. MT-42 keeps QR codes for reviews and chat, since ordering by QR is now MT-89 and MT-90.
- Retention of 30 days, the 5-minute unaccepted warning, and the abuse caps are starting values.
