# Quick actions on Today

Status: draft
Tracker: MT-25
Surface: owner app, TV

## What it is
The three things you change every day, each one tap from the Today tab: mark a dish sold out, pick today's special, and change a price. Every TV shows it within seconds.

## Who uses it
- **Owners and staff**, at the counter with one hand free. Staff can do all three: the platform plan gives staff sold out and today's special, and they can already edit prices in the Menu tab.
- **Guests** see the change on the TV.

## What it does
Today keeps what it has now (the live preview and the first-screen checklist) and holds the three actions.

- **Sold out today** (built, unchanged): tap a dish and every TV shows "Sold out" on it. It comes back by itself tomorrow.
- **Today's special** (new):
  - None set: "Pick today's special", then the dishes in stock by category, with a search box when the menu is long. One tap on a dish makes it the special.
  - One set: the dish and its price, with "Change" and "Remove".
  - One special at a time. Picking another replaces it. It ends by itself at midnight in the outlet's time zone, like sold out.
  - On every TV it plays as the first promo: first in the side zone (Split, L-bar, Portrait), the first takeover (Full board), the first ticker line (Ticker) and the first hero dish (Spotlight). The slide shows "Today's special", the dish name, its description (or its category), its menu price (the first size for a dish with sizes, as promos do now) and its photo or plate.
- **Change a price** (new on Today; the Menu tab already does it):
  - Every dish with its price in a field, one field per size, with a search box when the menu is long.
  - Type the new price and press Enter or leave the field to save. The message names the dish and its new price.
  - Same rules and messages as the menu editor: rupees, paise allowed (49.50), and an error on anything else.
- Loading shows Today's skeleton, as now. On an error the field keeps the old price and the editor's usual message shows.

## Design
Design to write.

## Data it touches
- **The menu** gains which dish is today's special and the outlet day it was set, cleared by date the way `soldOutOn` is. It lives with the menu, so the editor preview, Today's preview and every TV agree. No new data file.
- Prices change through the existing `set-prices` edit and sold out through `set-sold-out`.
- `screenRestaurant()` puts the special first in the bundle's promos and first among Spotlight's heroes.

## Rules and edge cases
- Only a dish that is on the menu, in stock and not hidden can be the special. Hiding or removing the dish clears it.
- If the special sells out, its slide stops and Today shows "Sold out" next to it with "Pick another". Back in stock the same day, it plays again.
- If the special's category is outside its daypart, it doesn't play then, and Today says "Not on your TVs now", as the editor does.
- Two phones changing the same price: each save applies to the server's latest menu, and the last one wins (as in the editor).
- Owners and staff both. Every action goes through `guard.ts` like every menu edit.
- An offline TV plays its last bundle until it reconnects, as with sold out.
- The special plays before the automatic featured dishes (bestsellers, new, chef's picks), which keep playing after it. Only promos made in the promo studio (MT-26) replace them.

## Not in this version
- More than one special a day, a special price, or a note just for today (happy-hour prices are MT-46; promos are MT-26).
- Undo, and a history of who changed which price (the audit log is MT-32).
- Sold out until a set time, or "only 6 left".
- Quick actions over WhatsApp (MT-51).
- Hindi on promo slides, the special's included (MT-28).

## Slices
1. **Platform: today's special in the menu and on the TV.** Owns `src/features/menu/schema.ts`, `src/features/menu/edit.ts`, `src/features/menu/to-screen.ts`, `src/features/screen/types.ts` and `src/features/screen/loop.ts` (the special leads Spotlight), with their tests. A new `set-special` edit goes through the existing `editMenuAction`. Changes the featured-promo checks in `to-screen.test.ts` and the Spotlight checks in `loop.test.ts`. Run `npm run player` to see it on a `/s/<token>` TV.
2. **Design: the special and prices on Today.** After slice 1. Owns `src/app/studio/page.tsx`, `src/features/screens/components/studio-forms.tsx` (where `SoldOutToggle` lives) and new components in `src/features/menu/components/` for the special picker and the price list. Calls `editMenuAction`; no new Server Action. The TV's look doesn't change.

## How we'll know it works
On a 375 px phone signed in as staff, with a TV on `/s/<token>` beside it:
1. Each action starts with one tap on Today, without opening another tab.
2. Tap Samosa under sold out: the TV shows it sold out within 10 seconds.
3. Pick Mango lassi as today's special: within 10 seconds the TV plays a "Today's special" slide for it, first, at its menu price, and the bestseller slides still play after it. Check it on Split, Full board (first takeover), Ticker (first line) and Spotlight (first hero).
4. Pick Cold coffee: the lassi slide stops and the coffee plays. There is never more than one special.
5. Tap Remove: the special leaves the TV within 10 seconds.
6. Mark the special sold out: its slide stops and Today says it's sold out. Mark it in stock: it plays again.
7. Hide the special in the Menu tab: Today shows no special. Hidden and sold-out dishes aren't in the picker.
8. Set the clock to the next day in the outlet's time zone: Today shows no special and the TV plays none.
9. Change Masala chai from 30 to 35 and press Enter: the message names chai and ₹35, and the TV and the Menu tab show ₹35 within 10 seconds.
10. On a dish with Half and Full, change only Full: the TV shows the new Full price and the same Half.
11. Type "abc" as a price: an error shows, nothing saves, and the TV keeps the old price.
12. Signed in as the owner, all of the above work. Signed out, or as a member of another restaurant, setting the special or a price is refused.
13. Design walks it as an owner on a 375 px phone and fixes what gets in the way.
