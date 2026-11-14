# Promo studio

Status: approved
Tracker: MT-26
Surface: owner app, TV

## What it is
A promo for your TV in thirty seconds: pick a template, pick dishes from your menu, and the price fills itself. It plays beside the menu or between menu pages, when you schedule it.

## Who uses it
- **Owners** make, schedule, pause and remove promos.
- **Staff** see what's on air but can't change promos. They keep today's special (MT-25).
- **Guests** get one offer, one price and one picture, read from 3 to 5 metres.

## What it does
A Promos page lists every promo with its state: On air now, Starts (day and time), Ended, Paused, or Needs a fix (and what to fix). Empty, it shows the six templates and one line on what a promo does. "New promo" opens the templates:

| Template | The owner picks | Price on the TV |
| --- | --- | --- |
| Combo | 2 to 4 dishes, and a size for each | A combo price, filled in with the menu total and kept lower than it. The menu total shows struck through |
| Happy hour | One dish and size, plus times and days | A happy-hour price, filled in with the menu price and kept lower than it. The menu price shows struck through |
| New item | One dish | Its menu price |
| Festival | A festival from a list, then up to 2 dishes or none | The dishes' menu prices, or none |
| Today's special | Opens Today's special picker (MT-25) | Its menu price |
| Scan the QR | A link starting with https:// | None; a QR code instead |

Every promo also has:
- **Headline** (required) and **line** (optional), filled in from the dish names and description and editable. Starting limits: 30 and 60 characters, which Design confirms fit every layout at 3 metres.
- **Picture:** the first dish's photo or plate. No uploads.
- **When:** starts now or at a date and time; ends never or at a date and time; and, if wanted, only at certain times and days, with the same picker categories use for dayparts. Happy hour must have times and days, which it repeats on.
- **Countdown** (offered only when the promo has an end): the TV shows the time left, like "Ends in 40 min", in the last 3 hours (starting value).
- **Actions:** save, edit, pause, resume and remove (remove asks first). Up to 20 promos per restaurant (starting value).

## Design
Design to write.

## Data it touches
- **A new promos store** per restaurant, through `openDocumentStore`: template, dish and size ids, the typed deal price in paise (combo and happy hour only), headline, line, festival, link, schedule, countdown and paused. Locally a gitignored `data/promos.json` set by `PROMOS_DATA_FILE`, like the other stores; on Netlify, a row in the database.
- Dish names, prices, photos and sold out are read from the menu every time, never copied into the promo.
- **The TV bundle:** promos made here replace the automatic featured-dish promos while any is on air; with none on air, the featured dishes play as now. Today's special stays first and never replaces them (MT-25). A promo with an end carries it, so the TV can drop the promo on time and show the countdown.

## Rules and edge cases
- A dish sold out today takes every promo with it off the TV until it's back. A dish hidden or removed from the menu puts its promos in Needs a fix.
- A menu price change reaches the struck-through price at once. If a combo or happy-hour price is no longer lower than the menu price, the promo stops and shows Needs a fix.
- Times are the outlet's. Times that end before they start run past midnight, as dayparts do.
- A promo leaves the TV at its end, even if the TV is offline. A countdown appears only on a promo with an end, and reaches zero as the promo leaves.
- The QR opens exactly the owner's link: no redirect through us and no counting scans. Only https links, up to 300 characters.
- Promos play in the order they were made, after today's special. Local ads (v2) still take at most one slot in three.
- Only owners add, edit, pause or remove, checked in `guard.ts`. Staff get the list, read-only.
- Hindi typed into a headline or line shows on the TV.
- **Plans (D2):** the pricing page lists "Scheduled promos and countdowns" under Plus. Until billing (MT-33) exists, every restaurant gets schedules and countdowns; the Free and Plus split is decided with MT-33.

## Not in this version
- AI headline drafts (MT-27) and Hindi translations (MT-28).
- Reordering promos, promos per outlet or per screen, and uploaded pictures or video.
- Changing the menu price during happy hour (MT-46), and festival calendars or art packs (MT-49).
- "Only n left", and plays per promo (proof of play is MT-31).

## Slices
1. **Platform: promo data.** New `src/features/promos/` (schema, repository, schedule and status, pure and tested), new `src/app/studio/promos/actions.ts`, and `data/promos.json` in `.gitignore`. Adds `PROMOS_DATA_FILE` to CLAUDE.md's worktree line and to the design preview in `.claude/launch.json`. No UI.
2. **Platform: promos on the TV.** After slice 1. Owns `src/features/menu/to-screen.ts`, `src/features/screens/live.ts`, `src/features/screen/types.ts` (a promo's end), `src/features/screen/loop.ts` (drops ended promos by the wall clock) and a new `src/features/screen/countdown.ts` (the time-left text), with their tests. Changes the featured-promo checks in `to-screen.test.ts`.
3. **Design: the Promos page.** After slice 1. Owns `src/app/studio/promos/page.tsx`, new components in `src/features/promos/components/` and `src/components/owner/owner-frame.tsx`, which gains a Promos tab. DESIGN.md's "four tabs" becomes five in the same pull request.
4. **Design: the six promo looks on the TV.** After slice 2. Owns `src/features/screen/components/parts.tsx` and `src/features/screen/screen.css`, and shows the countdown from slice 2. Checked with `npm run player` on a `/s/<token>` TV.

## How we'll know it works
On a 375 px phone as the owner, with a TV on `/s/<token>` beside it (Split, then Full board):
1. Promos opens in one tap from any owner page. With no promos, it shows the six templates.
2. Combo: pick Samosa (₹20) and Masala chai (₹30). The price starts at ₹50; type 45 and save. Within 10 seconds the TV shows the combo at ₹45 with ₹50 struck through.
3. Prices come from the menu, never retyped: change chai to ₹35 in the Menu tab, and the struck-through price becomes ₹55 without touching the promo. The only price typed is the combo or happy-hour deal, and it starts at the menu price.
4. Try a combo price of ₹50 or more: it doesn't save, and the message says why.
5. Mark samosa sold out: the combo leaves the TV within 10 seconds, and comes back when samosa is in stock.
6. Happy hour on chai at ₹20, with its times set from 2 minutes from now to 10 minutes from now on today's day of the week, countdown on. It doesn't play before the start, plays within 10 seconds of it, counts down, and leaves at the end.
7. Cut the TV's network before a happy hour ends: it still leaves the screen at its end.
8. All six templates make a slide. Festival (Diwali, with two dates) plays only between them.
9. Scan the TV's QR with a phone: it opens exactly the owner's link. "zomato.com/x" without https, and "hello", are refused.
10. Schedule a promo for tomorrow at 9 am: it shows "Starts" with the day and time and doesn't play. With the clock at 9 am, it plays with no edit. Past its end, it shows Ended and is off the TV.
11. A promo with no end offers no countdown, and the TV never shows one for it.
12. Pause, resume and remove each reach the TV within 10 seconds. Remove asks first.
13. Today's special on Promos opens the same picker as Today, and there is never more than one special.
14. With a promo made here on air, the automatic bestseller slides stop. Pause every promo and they come back. Today's special alone never stops them.
15. Signed in as staff: Promos lists what's on air with no way to add, edit or remove, and calling the actions directly is refused.
16. A headline typed in Hindi shows correctly on the TV.
17. Design walks it as an owner on a 375 px phone and fixes what gets in the way.
