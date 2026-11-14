# Kitchen order board

Status: draft
Tracker: MT-91
Surface: owner app

## What it is
Every phone order on one board in the kitchen, on a phone or a tablet: new, being made, ready. One tap moves an order on, and a chime says a new one has come in. Part of the [ordering plan](../ordering-plan.md).

## Who uses it
- **Staff and owners**, in the kitchen or at the counter, with wet hands and no time to type.
- **Guests** see each move on their order's page (MT-92) and the TV (MT-40).

## What it does
An **Orders** page in the owner app (`/studio/orders`), for owners and staff:
- **Three groups:** New, Being made, Ready, oldest first. On a tablet or computer they sit side by side; on a phone they're one list in three sections.
- **Each order card:** the number, the place ("Table 4", or "Counter" with the pickup name), minutes since it was placed, each line (quantity, dish, size, note), the total, and Paid or Not paid.
- **Moves, one tap each:**
  - New: "Accept", or "Reject" with a reason: Sold out (pick the dish, with "Mark it sold out too" ticked), Closing soon, or Other (up to 60 characters).
  - Being made: "Ready".
  - Ready: "Collected" for pickup, or "Served" at a table.
  - Any time: "Paid" or "Not paid".
  - "Undo" for 10 seconds after any move.
- **New orders** appear within 5 seconds with a chime and a vibration, once someone taps "Turn on sound" (browsers need a tap first). The page keeps the screen awake while it's open.
- **Not live:** if the board loses its connection, a band says "Not live. Reconnecting…" until it's back, and it checks for missed orders when it reconnects.
- **Pause orders:** one tap for anyone on the board. Guests see "We're not taking orders on the phone right now. Please order at the counter." Resume is one tap. (The owner's switch on the Tables page, MT-90, turns ordering off for good.)
- **Done today:** completed, rejected and cancelled orders, folded away under the board.
- Empty state: "No orders yet. They show here the moment a guest orders." With ordering switched off, it says so and links owners to the switch.

## Design
Design to write.

## Data it touches
- **Orders** (MT-90): the state and the time of each move, the reject reason, and the paid mark.
- **The menu:** "Mark it sold out too" uses the same sold-out change as Today.
- **Places:** the pause.

## Rules and edge cases
- The moves allowed are fixed: New to Being made or Rejected; Being made to Ready; Ready to Collected or Served. Anything else is refused, so two phones tapping at once can't put an order in a wrong state. The second tap gets "Already moved", and the card refreshes.
- At midnight in the outlet's time zone, orders still open are closed ("Closed at the end of the day").
- Every move goes through `guard.ts` and is scoped to the restaurant. Staff and owners both.
- The chime and vibration never play for guests, and the board is never on the TV.

## Not in this version
- Kitchen printer tickets and screens per station (grill, drinks).
- Estimated ready times (MT-41).
- Editing an order's lines.
- Sending orders to the POS (MT-38).

## Slices
1. **Platform: moves, pause and the live feed.** Owns `src/features/orders/states.ts` (the allowed moves, pure and tested), new `src/app/studio/orders/actions.ts` (every move, undo, paid and pause), new `src/app/api/studio/orders/events/route.ts` (the board's live feed, session-checked, built like the TV's events route), and the midnight close. After MT-90 slice 1.
2. **Design: the board.** After slice 1. Owns new `src/app/studio/orders/page.tsx`, the board components in `src/features/orders/components/`, the chime in `public/sounds/`, and an Orders tab in `src/components/owner/owner-frame.tsx` (after MT-26 slice 3 and MT-35 slice 2, which also edit it).

## How we'll know it works
On a tablet at 1024 px and a phone at 375 px signed in as staff, with a guest phone placing orders:
1. Tap "Turn on sound". A guest places an order: it shows under New within 5 seconds, with a chime and a vibration.
2. Accept it: it moves to Being made, and the guest's page says so (MT-92).
3. Ready, then Collected: each move is one tap, and the order ends under Done today.
4. Undo within 10 seconds puts the order back. After 10 seconds there's no Undo.
5. Reject with "Sold out", picking Paneer roll with "Mark it sold out too" ticked: the guest sees the reason, and Paneer roll is sold out on Today and the TV.
6. Two phones tap Accept and Reject on the same order at once: one wins, and the other shows "Already moved".
7. Pause: an order placed a second later is refused with the message, and the guest's menu loses its Add buttons on its next check. Resume brings them back.
8. Turn off the board's internet for a minute while a guest orders: the band shows "Not live", and on reconnecting the order appears.
9. Mark an order Paid, then Not paid: the card shows each.
10. Set the clock past midnight in the outlet's time zone: open orders show as closed.
11. As a member of another restaurant, the board shows none of these orders, and calling the actions on them is refused.
12. Design walks it as a cook on a tablet and as staff on a 375 px phone during a burst of ten orders, and fixes what gets in the way.
