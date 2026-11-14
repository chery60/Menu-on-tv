# Kitchen order board

Status: draft
Tracker: MT-91
Surface: owner app, guest's phone

## What it is
The kitchen's screen for phone orders: new orders ring until someone accepts them, and each move is a tap. It runs on any phone or tablet in the kitchen, and if no board is open, ordering pauses by itself so no order goes unseen. Step 4 of the [ordering plan](../ordering-plan.md).

## Who uses it
- **Staff and owners** run the board: accept, reject, ready, collected or served, cancel, paid, refunded and pause.
- **Owners** also set "Pay first". Guests see each move on their status page (MT-90).

## What it does
**The board** (`/studio/orders`, staff and owners):
- New (Placed), Being made (Accepted) and Ready, stacked on a phone and side by side on a tablet. Below them, "Done today": Completed, Rejected, Cancelled and Closed, each with its reason.
- Each order shows its number very large, the place, the pickup name, each line (quantity, dish, size, note), the total, minutes since it was placed and "Paid" once marked. Names, notes and reasons show as plain text.
- Moves: Accept, Ready, then Collected (Counter) or Served (table), one tap each. Reject is one tap and a reason: sold out, closing, too busy or other. Cancel, from Being made or Ready, is one tap and a reason: ran out, guest left, mistake or other. "Other" takes up to 80 characters.
- "Mark paid" at any time, one tap. A paid order that is rejected or cancelled, by staff or by the clock, shows "Refund ₹X owed" with "Mark refunded" until staff tap it.

**Pay first** (owner setting on the ordering settings page): on by default for the Counter, off for tables. An unpaid order from a pay-first place shows as "Waiting for payment" in New, and its button is "Paid, accept", which does both in one tap. It can't be accepted unpaid. It counts toward the caps and closes after 15 minutes like any Placed order. The guest's page says "Not confirmed yet" until it's marked paid.

**Alerts:**
- A new order shows within 5 seconds, with a chime.
- While any order waits to be accepted, the chime repeats every 30 seconds. An unpaid pay-first order chimes once when it arrives and doesn't repeat, since staff are waiting for the guest to pay (Product's call, flagged to HQ).
- Browsers play sound only after a tap, so a full-width "Sound off. Tap to turn sound on." banner shows until someone taps it.
- When the live connection drops, a full-width "Reconnecting" banner shows. Coming back to the tab, or reconnecting, fetches the whole board at once.

**Keeping the board awake:** while the board is on screen, it keeps the screen on (wake lock) and takes the lock again when staff come back to the tab. A phone without wake lock sees "Set this phone's screen to stay on".

**Board liveness and auto-pause:**
- A board counts as live while it's open, on screen and connected. Boards check in every 30 seconds.
- With no live board for 2 minutes, ordering pauses by itself: the guest's menu says "Ordering is paused. Please order at the counter.", orders are refused, and Today and the ordering settings say "No kitchen board is open, so ordering is paused." Opening a board resumes ordering within seconds, unless someone paused it.
- So a board left in the background is safe: orders placed in its first 2 minutes wait in New and ring as soon as staff come back; after that, guests are sent to the counter.

**Pause and reject all:** "Pause ordering" for the outlet, or for one place (pause the Counter, keep tables), one tap to pause and one to resume, staff and owners. "Reject all new Counter orders" names the count ("Reject 12 new Counter orders"), asks first, and rejects every Placed Counter order as "Too busy".

**The clock:**
- A Placed order not accepted in 15 minutes closes as Rejected, "Not accepted in time", and stops counting toward the caps.
- The board shows the current business day, which turns over at 04:00 outlet time (D3). Accepted and Ready orders from before the cutoff stay on the board until finished, and close as Closed once they are 6 hours old.

**A shared kitchen device stays signed in:** a board on a kitchen tablet must keep working through a month of daily use. Today a session ends 30 days after sign-in (`SESSION_TTL_MS`) and `access()` never renews it. Product recommends a session that renews on use, so a device used every day never signs out. Platform picks the mechanism in an ADR; if it picks pairing the board like a TV, MT-102 closes into this item.

## Design
Design to write.

## Data it touches
- **Orders** (MT-90's table): each move and its time, reasons, paid and refunded marks, the 15-minute and 6-hour closes.
- **Board check-ins** in the database next to orders, not in a JSON document, because every open board writes every 30 seconds. Platform adds them to MT-90's ADR.
- **Places document:** a pause for each place, and Pay first for the Counter and for tables.
- **Sessions** (`src/features/accounts`), if the session renews on use.
- The guest's menu and order route read the pauses and liveness.

## Rules and edge cases
- Staff and owners run the board; only owners set Pay first. Every action goes through `guard.ts` and checks that the order belongs to the member's restaurant.
- Two boards open at once: the first tap wins, and the other board shows the move within 5 seconds. A move on an order that has already moved is refused with "This order has already moved."
- The repeat chime and auto-pause are what catch missed orders; MT-92's 5-minute message to the guest is only a fallback.
- Until orders reach the POS (MT-105), staff key each board order into the POS for the bill. The board total is an order summary, not a bill.
- Logs carry order and place ids only.

## Not in this version
- The Orders tab before MT-92 is in (go-live gate, last slice).
- A test order (MT-100), one unavailable dish at accept (MT-101), grouping by table (MT-103), UPI (MT-93), today's orders and totals (MT-94).
- A board-only device paired by code (MT-102), unless the ADR picks it.
- Ready numbers on the TV (MT-40).

## Slices
No slice edits `src/features/screen/`. MT-40's TV band comes after MT-25, MT-26, MT-28 and MT-29's slices, which own the screen files.
1. **Platform: moves, payment and the clock.** After MT-90 slice 3. Owns `src/features/orders/` (staff moves, paid and refunded, Pay first, the 15-minute and 6-hour closes, reject all), `src/features/places/` (place pauses, Pay first), `src/app/studio/orders/actions.ts` and `src/app/api/t/[link]/orders/route.ts`, with tests.
2. **Platform: the live board and auto-pause.** After slice 1. Owns new `src/app/api/studio/orders/events/route.ts` (the board's stream, the same pattern as `src/app/api/s/[token]/events/route.ts`, session checked), the check-in route, the migration for check-ins, a client hook in new `src/features/orders/client/` (stream, check-ins, refetch on return, wake lock), and `src/app/api/t/[link]/menu/route.ts` (auto-pause).
3. **Platform: a kitchen device stays signed in.** After MT-29 slice 1, which owns the accounts files. Owns `src/features/accounts/repository.ts`, `src/features/accounts/session.ts` and the ADR.
4. **Design: the board.** After slice 2. Owns new `src/app/studio/orders/page.tsx` and new `src/features/orders/components/board/` (cards, columns, reasons, banners, chime).
5. **Design: what owners and guests see of it.** After slice 4, MT-90 slices 4 and 6, and MT-34 slice 3, which owns Today. Owns `src/app/studio/page.tsx` (the no-board line), the settings page and its components (Pay first, the no-board line), and `src/features/orders/components/status/` ("Not confirmed yet", the refund line, cancel reasons).
6. **Design: open ordering.** Last: after MT-92's slices, and after MT-26 slice 3 and MT-35 slice 2, which also edit the frame. Owns `src/components/owner/owner-frame.tsx` (an Orders tab leading to the board and its settings) and DESIGN.md's tab count.

## How we'll know it works
As staff on a kitchen tablet, the owner on a 375 px phone, and a guest phone:
1. A guest order shows on the board within 5 seconds with a chime. Each move works, and the guest's page shows it after a reload.
2. With an order left in New, the chime repeats every 30 seconds until it's accepted. With sound never tapped, the "Sound off" banner shows and no chime plays.
3. Reject with "other" takes up to 80 characters. Names, notes and reasons typed as `<b>hi</b>` show as typed.
4. Staff cancel a Being made order as "ran out": the guest's page shows it. A paid order rejected or cancelled shows "Refund ₹X owed" until "Mark refunded"; the guest's page says "If you paid, staff will refund you."
5. Pay first: a Counter order shows "Waiting for payment", can't be accepted, chimes once and doesn't repeat; the guest's page says "Not confirmed yet". "Paid, accept" moves it to Being made in one tap. A table order isn't pay-first.
6. A Placed order left 15 minutes closes as "Not accepted in time" and the place takes new orders again.
7. With the clock moved past 04:00, a Being made order from before stays on the board; at 6 hours old it closes as Closed.
8. Pause the Counter: Counter orders are refused at once and tables still order. Resume: Counter orders work. Pause the outlet: every place says paused.
9. "Reject all new Counter orders" names the count, asks first, then rejects all of them as "Too busy".
10. Close every board: within 2 minutes plus 30 seconds the guest's menu says paused, orders are refused, and Today says no kitchen board is open. Open one: ordering resumes within 10 seconds.
11. Board in the background for 10 minutes, an order placed at minute 1 and one tried at minute 5: the first rings as soon as the board is back in front, and the second was refused as paused.
12. Network off for 30 seconds: "Reconnecting" shows; network on: the banner goes and the board catches up at once.
13. On Android Chrome the screen stays on with the board open for 30 minutes, and again after switching away and back.
14. Two boards: accept on one, the other shows it within 5 seconds, and accepting it there says it has already moved.
15. A session used every day stays signed in past day 30 (clock moved, or as the ADR's test shows).
16. As staff, Pay first can't be changed and calling that action is refused. A second restaurant can't move or see these orders.
17. Before the last slice, no owner app page links to the board or its settings. After it, the Orders tab opens the board.
18. Logs show order and place ids only.
19. Design runs a lunch rush with three phones ordering and the board on a tablet and a 375 px phone, and fixes what gets in the way.
