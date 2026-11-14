# FSSAI display mode

Status: approved
Tracker: MT-29
Surface: owner app, TV

## What it is
One switch that puts calories, serving sizes, allergens and the 2,000 kcal line on every TV, from the menu you already keep. Chains with 10 or more outlets must show calories on menu boards ([research](../research.md), section 7).

## Who uses it
- **Owners** turn it on for the restaurant, and they or their staff fill in calories and allergens.
- **Guests** read calories and allergens at the counter.

## What it does
Built already: each dish in the Menu tab has calories, serving size and the nine FSSAI allergens, and veg marks show on every TV. None of the rest reaches the TV yet.

New:
- **The switch** on the Restaurant tab (owners only), off by default: "Show calories and allergens on your TVs (FSSAI)".
- **Before it goes on:** if any dish in stock has no calories, the switch says how many and lists them ("8 dishes have no calories yet. They'll show without calories until you add them."), then turns on if the owner goes ahead.
- **With it on, every TV shows:**
  - Calories and serving size on each dish that has them, like "320 kcal, 250 ml".
  - A mark for each allergen a dish contains, with a key on the slide that names the marks.
  - The reference line on every menu slide and Spotlight slide, in FSSAI's words: "An average active adult requires 2,000 kcal energy per day, however, calorie needs may vary."
- **In the Menu tab, with it on:** dishes with no calories say so, and a count at the top says how many are left.
- Turning it off takes all of this off the TVs. The calories and allergens stay in the menu.

## Design
**Job:** the TV meets the labelling rule without turning the menu into a label. **Direction:** the menu stays the menu; calories and allergens are one quiet mono line under each dish, and the key and the 2,000 kcal line live in a footer band.

- **Restaurant tab** (`restaurant-forms.tsx`, owners): a card "Calories and allergens" with one 44px switch (`role="switch"`, as sold out is), "Show calories and allergens on your TVs (FSSAI)", and the hint "Chains with 10 or more outlets must show calories." With dishes missing calories, turning it on opens a `Sheet`: "8 dishes have no calories yet. They'll show without calories until you add them.", the dish names (the first 10, then "and 4 more"), "Turn on anyway" (the chilli action) and "Add calories first" (quiet, to Menu). Staff read "On" or "Off".
- **Menu tab** (`item-row.tsx`, `menu-editor.tsx`), only while on: "No calories" in mono masala under each dish name that lacks them, and at the top of the list "8 dishes have no calories" (then "Every dish has calories."). Tapping the flag opens the dish sheet with its calories field open.
- **TV dish row:** a mono line under the name (and under the Hindi line, if on): "320 kcal, 250 ml", then a square outlined two-letter mark for each allergen (Gl gluten, Cr crustaceans, Mi milk, Eg egg, Fi fish, Pe peanuts, Nu tree nuts, So soy, Su sulphite), in the dim colour at 2.1cqmin (about 23 px at 1080p). It is secondary on purpose, never below the header note's 1.9cqmin, and read at the counter rather than from the queue. A sold-out dish dims the line with the row. No calories means the marks alone; no allergens ticked means no marks.
- **Footer band** on every menu slide and Spotlight, above the badge row: on the left the key for the marks on that slide only ("Gl Gluten, Mi Milk"); on the right the reference line word for word in Geist Mono at 1.9cqmin, never trimmed, wrapping to two lines on Portrait. Its height comes out of the menu zone, which Platform's row count in slice 1 has to include.
- **From 3 m:** name and price still read first; nothing on promo slides or the ticker. Checked on Paper and Night with `npm run player`. DESIGN.md (Screen, Owner app) and docs/screen-design.md (a "Calories and allergens" row) change in slices 2 and 3.

## Data it touches
- **The restaurant** gains the switch (accounts data), changed only by an owner.
- **The TV bundle** carries calories, serving size and allergens for each dish only while the switch is on, so screens without it stay as light as now.
- Calories, serving size and allergens stay where they are, on each dish in the menu.

## Rules and edge cases
- Calories are per serving, as typed (0 to 5,000). A dish with sizes has one calorie figure, for the serving the owner names (like "Full plate").
- Pages are counted with the calorie line included, so turning the switch on never pushes a dish off the screen. A menu may need an extra page.
- It works with Hindi on (MT-28): each dish row counts both.
- Staff can enter calories and allergens, but only owners can turn the switch on or off.
- An offline TV keeps its last bundle until it reconnects.
- The size of the calorie text and the reference line follows the screen playbook's legibility rules. Design checks it against the wording in FSSAI's guidance note.

## Not in this version
- Calories for each size of a dish.
- Saying "contains no allergens" for a dish; an unticked dish shows no marks.
- Calories on promo slides, and on the ticker line.
- Nutrition beyond calories (fat, sugar, salt).
- AI estimates of calories.

## Slices
1. **Platform: the switch and the bundle.** Owns `src/features/accounts/schema.ts`, `src/features/accounts/repository.ts`, `src/app/studio/restaurant/actions.ts` (owners only), `src/features/menu/to-screen.ts`, `src/features/screen/types.ts` and `src/features/screen/loop.ts` (row heights with the calorie line), with their tests. Changes the page-count checks in `loop.test.ts`. The row count includes the calorie line under each dish and a footer band (the allergen key and the 2,000 kcal line) on menu and Spotlight slides (Design, PR #23).
2. **Design: the switch and the missing-calories flags.** After slice 1. Owns `src/app/studio/restaurant/page.tsx`, `src/app/studio/restaurant/restaurant-forms.tsx`, `src/features/menu/components/item-row.tsx` and `src/features/menu/components/menu-editor.tsx`.
3. **Design: calories, allergens and the reference line on the TV.** After slice 1. Owns `src/features/screen/components/parts.tsx`, `src/features/screen/components/screen-stage.tsx` and `src/features/screen/screen.css`. Checked with `npm run player` on a `/s/<token>` TV.

## How we'll know it works
On a 375 px phone as the owner, with a TV on `/s/<token>` beside it:
1. The switch is on the Restaurant tab and starts off. With it off, the TV shows no calories, allergen marks or reference line.
2. With 8 dishes in stock lacking calories, turning the switch on first says "8 dishes have no calories yet" and lists them.
3. Turn it on: within 10 seconds, each dish with calories shows its calories and serving size, like "320 kcal, 250 ml".
4. The reference line shows, word for word, on every menu slide in all six layouts and on Spotlight. QA checks the words against FSSAI's guidance note.
5. A dish with milk and gluten ticked shows both marks, and the key on that slide names them.
6. The Menu tab marks each dish with no calories and counts them. Add calories to one: the mark goes, the count drops, and the TV shows them within 10 seconds.
7. On a menu that fills two pages, turning the switch on pushes no dish off the screen. The same with Hindi on.
8. Turn the switch off: within 10 seconds the TV drops all of it, and the Menu tab still has every calorie figure and allergen.
9. As staff: there is no switch to change, and calling the action directly is refused. Staff can still add calories and allergens.
10. Design walks it as an owner on a 375 px phone, then reads the TV from 3 metres, and fixes what gets in the way.
