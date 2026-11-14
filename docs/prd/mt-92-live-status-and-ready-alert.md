# Live order status and the ready alert

Status: draft
Tracker: MT-92
Surface: guest's phone

## What it is
The guest's order page keeps itself up to date and tells them, with a sound, when their food is ready. No app, SMS or sign-up. With this item, ordering can go live (MT-90, MT-91 and MT-92 all in). Step 8 of the [ordering plan](../ordering-plan.md).

## Who uses it
- **Guests** waiting at a table or for pickup, with the status page open on their phone.
- **Staff** get fewer "is my order ready?" questions; nothing changes on the board.

## What it does
**A live page** (`/o/<status link>`, the page MT-90 built):
- Every change from the board shows within 5 seconds, with no reload: Placed, Being made, Ready, Completed, Rejected or Cancelled with the reason, Closed, "Not confirmed yet" turning to confirmed once paid, and the refund line.
- It uses the TV's live pattern (`src/app/api/s/[token]/events/route.ts`): one stream per open page, which ends after 50 seconds and reconnects 5 seconds later. On every connect, and whenever the page comes back to the foreground, it fetches the order as it stands, so a change made in the gap is never missed.
- While the stream is down, a quiet "Reconnecting" line shows, and the page keeps the last state it had.

**Sound on, then the ready alert:**
- Phones play sound only after a tap. Under the number: "Turn on sound to hear when it's ready." One tap plays a short chime, so the guest knows it works, and the button changes to "Turn off sound".
- When the order turns Ready with the page in the foreground: a chime on Android and iPhone (three times), a vibration on Android (iPhones can't vibrate from a web page), the page fills with "Ready" and the number, and the tab title becomes "Ready: order 42". Pickup says "Ready. Collect it at the counter." and a table says "Ready. It's on its way to your table.", as on the page MT-90 built.
- Without the tap the page still changes, silently.
- The alert plays on the change to Ready, not when someone opens an order that's already Ready.
- A guest whose phone is locked is told only by the TV (MT-40) until web push (MT-96). The page says "Keep this page open to hear when it's ready." and never promises an alert on a locked phone.

**Not accepted yet** (a fallback; the board's repeat chime and auto-pause are what catch missed orders):
- After 5 minutes in Placed: "Not accepted yet. Please tell the staff at the counter."
- For an unpaid pay-first order: "Pay at the counter to start your order."

**Lost this page?**
- Under the number: "Lost this page? Show order 42 at the counter."
- **Your orders today:** the place's menu (`/t/<link>`) lists the orders this phone placed from that QR code today, newest first, each with its number and a link to its status page. The list comes from the phone's own storage (the status links MT-90 saved), and the server never sees it. An order leaves the list at the business-day cutoff (04:00 outlet time), or when its link stops working.

## Design
Design to write.

## Data it touches
- **Reads** the order by its status secret's hash (MT-90's table); writes nothing.
- **The guest's menu reply** gains the current business day, so the phone can drop yesterday's orders from its list.
- **The phone's own storage:** the status links and numbers MT-90 saved, and whether sound is on for this page.

## Rules and edge cases
- Only someone with the status link can see the order or its stream. An unknown link gets "This order link no longer works", and the stream answers 404.
- Rate limits, as for TVs: streams per status link 10 a minute, under the house ceiling of 600 requests a minute per address. One page reconnecting about once a minute never hits them.
- Each open page's stream reads the order every 3 seconds, as TV streams do (ADR-004's shortcut). That's fine for a pilot; the pub/sub channel replaces it later.
- The page announces each change to screen readers.
- Status links and order contents are never logged; logs carry order ids only. No cookies, no third-party scripts, `noindex`, no referrer.
- Copy is English only in this version.

## Not in this version
- An alert on a locked phone: web push (MT-96) or SMS and WhatsApp (MT-95), both waiting on the founder.
- Ready numbers on the TV (MT-40) and wait times (MT-41). Once MT-40 ships, the page can also say "or watch the TV".
- Live states in "Your orders today"; each order shows its state when opened.

## Slices
No slice edits `src/features/screen/`. MT-40's TV band comes after MT-25, MT-26, MT-28 and MT-29's slices, which own the screen files.
1. **Platform: the order's live feed.** After MT-90 slice 3 and MT-91 slice 1. Owns new `src/app/api/o/[secret]/events/route.ts`, a client hook in `src/features/orders/client/` (stream, fetch on every connect and on return to the foreground, reconnecting state), and `src/app/api/t/[link]/menu/route.ts` (the business day), with tests.
2. **Design: the live page and the ready alert.** After slice 1 and MT-91 slice 5, which last edits the status page. Owns `src/app/o/[secret]/page.tsx` and `src/features/orders/components/status/`: the sound tap, the Ready screen, vibration, the tab title, the 5-minute messages and "Lost this page?".
3. **Design: your orders today.** After slice 1 and MT-90 slice 5, which owns the guest's menu. Owns `src/app/t/[link]/page.tsx` and new `src/features/orders/components/your-orders.tsx`.

Once all three are in, MT-91's last slice opens ordering in the owner app and turns MT-90's go-live flag on.

## How we'll know it works
On an Android phone (Chrome) and an iPhone (Safari), each at 375 px, with the ringer on, and staff on the board:
1. With the status page open, accept, ready and complete on the board: each change shows within 5 seconds, with no reload. So do a rejection and a cancel, with their reasons, and a Pay first order turning from "Not confirmed yet" to confirmed.
2. Turn the network off for 20 seconds, mark the order Ready, then turn it back on: the page shows Ready within 5 seconds of reconnecting. Keep the page open over a 50-second stream end: no change is lost.
3. Put the page in the background for 2 minutes, mark it Ready, bring it back: it shows Ready at once.
4. Tap "Turn on sound": a chime plays. Mark the order Ready with the page in front: the chime plays three times on both phones, and the Android phone vibrates. The page shows "Ready" and the number, and the tab title is "Ready: order 42".
5. Without tapping "Turn on sound", Ready still shows, and nothing plays.
6. Reload a page whose order is already Ready: it shows Ready and plays nothing.
7. A pickup order says to collect at the counter; a table order says it's on its way.
8. Leave an order Placed for 5 minutes: the page says to tell the staff. An unpaid pay-first order says "Pay at the counter to start your order".
9. The page shows "Lost this page? Show order 42 at the counter." with the order's own number.
10. Place 2 orders from Table 4, close the tab, scan Table 4 again: "Your orders today" lists both, newest first, and each opens its status page. A second phone's list is empty. With the clock moved past 04:00 outlet time, the list is empty. No request to the server carries the list.
11. A made-up status link shows "This order link no longer works", and its stream answers 404.
12. Many stream requests a second from one address get 429. One page left open for 10 minutes never does.
13. With VoiceOver on the iPhone and TalkBack on Android, each change is read out.
14. No cookies, no third-party requests, `noindex` and no referrer on the page. The logs never show a status link.
15. The page never says it will alert a locked phone.
16. Design walks it as a guest on a 375 px phone, ordering at the counter, turning sound on and waiting for Ready from the board, and fixes what gets in the way.
