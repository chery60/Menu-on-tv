# Hindi on screen

Status: approved
Tracker: MT-28
Surface: owner app, TV

## What it is
Your dishes in English and Hindi on the TV, either both on every line or switching language each time the menu comes round, with the Hindi never smaller than the English.

## Who uses it
- **Guests** who read Hindi first, from 3 to 5 metres.
- **Owners** choose the language setting for each TV and type the Hindi names. Staff can type Hindi names, as they edit the menu now.

## What it does
Built already: a Hindi name on every dish and category (Menu tab), and a "Show Hindi" switch for each screen (TVs tab) that puts the Hindi name under the English one.

New:
- **Language, for each screen** (TVs tab, owners only), one of three:
  - **English only** (the default).
  - **English and Hindi**: both names on each line. This is today's "Show Hindi", and screens with it on keep it.
  - **English, then Hindi**: one pass of the whole loop in English, the next in Hindi. Dishes without a Hindi name stay in English. Prices, veg marks and badges don't change between passes.
- **Never smaller:** Devanagari is set at least as large as the English it goes with, on dish names, category headings, Spotlight and promo slides.
- **Promos in Hindi:** with Hindi on, promos made from a dish (today's special, new item, featured dishes) show its Hindi name. Headlines the owner types in the promo studio show as typed.
- **What's missing:** with Hindi on, the TVs tab says how many dishes have no Hindi name yet ("12 dishes have no Hindi name"), and the link opens the Menu tab.
- **Translation drafts** (waits on the founder: needs an AI key, D2): "Draft Hindi names" fills in the missing ones for the owner to check. Nothing reaches a TV until the owner saves it.

## Design
**Job:** a guest who reads Hindi first picks a dish as fast as one who reads English. **Direction:** Hindi is a second voice at the same size, told apart by weight, never by size or colour.

- **TVs tab** (`studio-forms.tsx`, owners): the "Show Hindi names next to English" checkbox becomes a "Language" group of three radio cards, the `choice` pattern setup uses for "Your menu": English only; English and Hindi ("Both names on every line."); English, then Hindi ("The menu plays once in English, then once in Hindi."). Cards stack at 375px, three across from `sm`, each at least 44px. Staff read the choice as plain text.
- **Missing names** (`tvs/page.tsx`): under the group, only while Hindi is on and names are missing: "12 dishes have no Hindi name yet." with the link "Add Hindi names" to Menu ("1 dish has…" for one). Nothing when none are missing.
- **TV, English and Hindi:** the Hindi line sits under the English name at the same font size (`.scr-hi` goes from 0.8em to 1em), Mukta 500 against the English at 600, in the item ink rather than the dim colour: for this guest it is the name. Category headings set Hindi beside the English at the same size, Mukta 700. A sold-out dish strikes through both lines; a Hindi name wider than its column trims like the English. For Platform: at full size a bilingual row is about 1.85 standard rows (5.2cqmin plus 3.4cqmin × 1.25), so `BILINGUAL_ROW_WEIGHT` should be 1.9 in slice 1 (1.7 today; screen-design.md's "1.6" is stale and becomes 1.9).
- **TV, English then Hindi:** on the Hindi pass the Hindi name takes the English name's place and size (Mukta 600; categories Mukta 700). Prices, veg marks, badges and positions don't move, so it reads as the same board in another language. Dishes without a Hindi name stay in English.
- **Spotlight and promo slides:** the Hindi name sits under the English headline at the same size; with both shown the pair drops to 80% of today's headline so the price stays the biggest thing (promo price, 12 to 18% of height).
- **From 3 m:** price first, then the name in the guest's language. Checked on Paper and Night at 1920 by 1080 with `npm run player`, the Devanagari measured at or above the English font size. DESIGN.md (Screen) and docs/screen-design.md ("Two languages") change in slice 2.

## Data it touches
- **Screens:** the language setting replaces the `bilingual` yes or no. Screens with `bilingual` on read as "English and Hindi"; the rest read as "English only".
- **The TV bundle** carries the setting. The pass in Hindi is worked out from the wall clock, so every TV on a screen switches at the same moment, with no syncing.
- Hindi names stay where they are, on dishes and categories in the menu.

## Rules and edge cases
- Pages are counted for the taller of the two languages, so switching language never pushes a dish onto another page or off the screen.
- A Hindi name is plain text, up to 80 characters (40 for a category), as now. Mixed scripts ("पनीर Tikka") show as typed.
- An offline TV keeps switching language from its last bundle.
- Only Hindi in this version. The setting is worded so another language can join it later.

## Not in this version
- Tamil, Telugu, Kannada, Marathi and Bengali.
- Hindi on the owner app itself, and Hindi in the ticker line.
- Typing Hindi names for many dishes on one page (owners type them in each dish's sheet, as now).

## Slices
1. **Platform: the language setting and the Hindi pass.** Owns `src/features/screens/schema.ts`, `src/features/screens/repository.ts`, `src/features/screens/bundle.ts`, `src/app/studio/actions.ts` (still reads the old `bilingual` field), `src/features/screen/loop.ts` (which pass is on), `src/features/screen/types.ts` and `src/features/menu/to-screen.ts` (a dish promo carries the Hindi name), `src/features/screen/components/screen-stage.tsx`, `src/features/screen/components/live-player.tsx`, `src/features/menu/components/menu-preview.tsx` and the studio pages that pass a screen to the preview, with their tests. Changes the bilingual checks in `loop.test.ts` and the screens tests. With the Hindi line at full size, a bilingual row is about 1.85 rows, so `BILINGUAL_ROW_WEIGHT` becomes 1.9 (Design, PR #23); update the stale "1.6" in `docs/screen-design.md` in the same pull request.
2. **Design: the setting, the sizes and Hindi promos.** After slice 1. Owns `src/features/screens/components/studio-forms.tsx` (the three choices), `src/app/studio/tvs/page.tsx` (the missing-names line), `src/features/screen/components/parts.tsx` and `src/features/screen/screen.css` (`.scr-hi` is 0.8em today). Checked with `npm run player` on a `/s/<token>` TV.
3. **Platform, then Design: translation drafts.** Waits on the founder's AI key (D2); not built or stubbed until then.

## How we'll know it works
On a 375 px phone as the owner, with a TV on `/s/<token>` beside it:
1. A screen saved with "Show Hindi" on still shows both names after the change. A new screen starts on English only.
2. Set the screen to English and Hindi: within 10 seconds every dish with a Hindi name shows it with the English, and dishes without one show English alone.
3. Measure on the TV (browser dev tools): the Devanagari is never a smaller font size than the English beside it, on dish names, category headings, Spotlight and promo slides.
4. Set the screen to English, then Hindi: one full loop shows Hindi names and the next shows English. Prices, veg marks and badges don't change.
5. Two TVs on the same screen show the same language at the same moment.
6. Switch the language on a menu that fills two pages: no dish moves page or falls off the screen.
7. With Hindi on, make Mango lassi today's special: the special slide shows its Hindi name.
8. The TVs tab says how many dishes have no Hindi name. Add one, and the count drops by one.
9. As staff: the language setting can't be changed. Hindi names can be typed in the Menu tab.
10. Design walks it as an owner on a 375 px phone, then reads the TV from 3 metres, and fixes what gets in the way.
11. When the AI key is in place (slice 3): drafts show only in the owner app, and nothing reaches a TV until the owner saves.
