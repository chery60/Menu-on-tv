# Order from the phone

Status: draft
Tracker: MT-90
Surface: guest's phone, owner app

## What it is
From the QR menu (MT-89), a guest adds dishes, places the order and gets a number, like "Order 42". The kitchen sees it on its board (MT-91). The server sets every price from the live menu. Part of the [ordering plan](../ordering-plan.md).

## Who uses it
- **Guests**, at a table or in the counter queue, with no app and no sign-up.
- **Owners**, who switch ordering on for the restaurant.

## What it does
- **The switch** on the Tables page (owners only): "Take orders from QR codes", off by default. While it's off, the QR menu shows no Add buttons.
- **Adding:** each dish in stock gets "Add". A dish with sizes asks which size. Quantity goes up and down from 1 to 20. Each line can take a note, up to 60 characters ("less spicy").
- **The order bar** stays at the foot of the menu: the number of items, the total, and "View order".
- **Review:** the lines (change quantity, remove), the total, and where it's going ("Table 4", or at the counter an optional first name for pickup, up to 20 characters). Then "Place order", and "Pay at the counter" until MT-93.
- **Placed:** the guest lands on the order's own page (`/o/<link>`), with the number large, the lines, the total and "Placed". "Cancel order" works until the kitchen accepts it. MT-92 makes this page live.
- **"Your orders today"** on the QR menu reopens the order's page. The list lives only on the guest's phone.
- **Errors,** each in plain words with the order kept as it was:
  - A dish sold out, or out of its hours, since it was added: the line is marked and the guest removes it.
  - Ordering paused or switched off: "We're not taking orders on the phone right now. Please order at the counter."
  - Too many orders: the caps below.
  - No connection: "Not sent. Check your internet and try again." Nothing is placed twice.

## Design
Design to write.

## Data it touches
- **Orders**, in a new table in Netlify Database. An ADR in `docs/architecture.md` comes first and decides the table, how numbers stay unique when two orders arrive together, and how it runs locally and in tests without a database. Each order holds: the outlet, the place, the number, the outlet's date, the lines (dish, its name and price then, size, quantity, note), the total, an optional pickup name, its state and the time of each change, and a hash of the order's link.
- **Order data lives in its own folder,** `src/features/orders/`, apart from the menu and screens.
- **Places** (MT-89) gain the restaurant's ordering switch.
- The menu is read, never changed.

## Rules and edge cases
- The server prices every line from the live menu at the moment of placing (size, sold out, dayparts) and ignores any price the phone sends.
- Numbers start at 1 each day at midnight in the outlet's time zone, and no two open orders share one.
- Caps (starting values): 30 lines, 20 of one dish, and 10 open orders per QR link. Each QR link and address is rate limited.
- "Place order" sent twice (a double tap, a retry) makes one order.
- The order's link is long and random; only its hash is stored, so only the guest who placed it can open it.
- No guest account, phone number, email or cookie. The pickup name and notes are cleared after a day (ordering plan).
- Menu prices include tax, so the total is the sum of the lines. The page says "Order summary", never "bill" or "invoice".

## Not in this version
- Live status and the ready alert (MT-92), and paying by UPI (MT-93).
- Combos and happy-hour deals at their deal price (after MT-26).
- Changing an order after it's placed (cancel and order again).
- Tips, service charge, packing charge and discounts.

## Slices
1. **Platform: the ADR, orders and placing one.** Owns `docs/architecture.md` (the ADR), new `src/features/orders/` (schema, pricing, numbering, caps and the repository, pure where it can be and tested), new `src/app/api/t/[link]/orders/route.ts` (place) and `src/app/api/o/[link]/cancel/route.ts` (cancel), and the switch in `src/features/places/` with its action in `src/app/studio/tables/actions.ts`.
2. **Design: adding, review and the order's page.** After slice 1. Owns `src/app/t/[link]/page.tsx` and its components, new `src/app/o/[link]/page.tsx`, new `src/features/orders/components/`, and the switch on `src/app/studio/tables/page.tsx`.

## How we'll know it works
With ordering on, a guest phone at 375 px scanning Table 4, and the owner's board or data to check against:
1. With the switch off, the QR menu has no Add buttons. Turn it on: they appear on the next load.
2. Add Masala chai ×2 and Paneer roll (Half) with the note "less spicy": the bar shows 3 items and the right total.
3. Place the order: the guest sees "Order 1" (the day's first), the lines, the total and "Placed". The stored order has Table 4, the lines with today's prices, and the note.
4. Change a price in the request by hand: the stored order still has the menu price.
5. Mark the paneer roll sold out before placing: it's refused, the line is marked, and nothing else in the order is lost.
6. Double-tap "Place order", or retry after cutting the internet: exactly one order exists.
7. Place two orders at the same moment from two phones: they get different numbers. After midnight in the outlet's time zone, numbering starts at 1.
8. An 11th open order from one QR link, a 31st line or a 21st of one dish is refused with a clear message.
9. Cancel before the kitchen accepts: the order shows "Cancelled". After it's accepted, there's no Cancel.
10. Pause ordering (MT-91) or switch it off: Add buttons go, and an open review page shows the "not taking orders" message on placing.
11. The menu and order pages set no cookies. A made-up order link shows "We can't find that order", and the stored data holds only the link's hash.
12. Design walks it as a guest at a table and at the counter on a 375 px phone, and fixes what gets in the way.
