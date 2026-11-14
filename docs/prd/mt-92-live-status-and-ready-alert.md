# Live order status and the ready alert

Status: draft
Tracker: MT-92
Surface: guest's phone

## What it is
After ordering, the guest's phone follows the order live, from placed to being made to ready, and says so with sound and vibration when the food is ready. It needs no SMS, app or sign-up. Part of the [ordering plan](../ordering-plan.md).

## Who uses it
- **Guests** waiting at a table or near the counter, with the order's page open.
- **Staff** get fewer "is mine ready?" questions.

## What it does
The order's page (`/o/<link>`, made in MT-90) becomes live:
- **The steps:** Placed, Being made, Ready, then Collected or Served, with the current one marked. The number stays large at the top.
- **Updates** reach the page within 5 seconds of each move on the kitchen board (MT-91), with no reload. If the page loses its connection, a line says "Updating…" and it catches up when it's back.
- **Ready:** the page changes to "Order 42 is ready" across the screen, with "Collect it at the counter" for pickup or "It's on its way to Table 4" at a table.
  - It plays a sound if the guest tapped "Turn on the ready sound" earlier (browsers need a tap first).
  - It vibrates where the phone allows.
  - The browser tab's title becomes "Ready: Order 42".
- **Not accepted yet:** 5 minutes after placing with no move from the kitchen (starting value), the page adds: "The kitchen hasn't seen your order yet. Please tell the staff at the counter."
- **Rejected:** the reason from the kitchen ("Paneer roll is sold out") and "Please talk to the staff".
- **Cancelled, or closed at the end of the day:** said plainly, with a link back to the menu.
- **Done:** "Enjoy your meal", and the order leaves "Your orders today" at midnight.

## Design
Design to write.

## Data it touches
- **Orders** (MT-90) are read, never changed here, except Cancel (MT-90).
- **A live feed for one order,** reached only with the order's link and rate limited.
- Nothing about the guest is stored. "Your orders today" stays on the guest's phone.

## Rules and edge cases
- Only someone with the order's link can see it. The feed shows the order's state, number, place, lines and total, nothing else about the restaurant's orders.
- The 5-minute warning comes from the time the order was placed, so it's right even after a reload.
- Sound and vibration happen once, when Ready arrives, never again on reload.
- A page left open past midnight shows the order as closed.
- If the guest's phone sleeps, the page shows the latest state as soon as it wakes.

## Not in this version
- A message when the page is closed: by SMS or WhatsApp (MT-95), or web push (MT-96). Both wait on the founder.
- Paying from this page (MT-93).
- An estimated wait time (MT-41).

## Slices
1. **Platform: the order's live feed.** Owns new `src/app/api/o/[link]/events/route.ts` (built like the TV's events route, rate limited per link and address) and the pure helpers for the page's state and the 5-minute warning in `src/features/orders/status.ts`, with tests. After MT-91 slice 1.
2. **Design: the live page and the ready alert.** After slice 1. Owns `src/app/o/[link]/page.tsx` and its components in `src/features/orders/components/`, and the ready sound in `public/sounds/`.

## How we'll know it works
With a guest phone at 375 px on the order's page and the kitchen board beside it:
1. Accept on the board: within 5 seconds the guest's page shows Being made, with no reload.
2. Tap "Turn on the ready sound", then mark the order Ready: within 5 seconds the page shows "Order 1 is ready" with the right words for pickup or table, plays the sound, vibrates on Android, and the tab's title changes.
3. Reload the page: it still shows Ready, with no second sound.
4. Place an order and leave it for 5 minutes: the page asks the guest to tell the staff. Accept it: the warning goes.
5. Reject with "Sold out": the page shows the reason and "Please talk to the staff".
6. Turn off the phone's internet, mark Ready on the board, and turn it back on: the page shows Ready within 5 seconds of reconnecting.
7. Open a made-up order link: "We can't find that order", and the feed for it is refused.
8. Collected: the page says "Enjoy your meal".
9. The page sets no cookies and loads nothing from third parties (browser tools).
10. Design walks it as a guest waiting at the counter and at a table on a 375 px phone, with the phone locked and unlocked, and fixes what gets in the way.
