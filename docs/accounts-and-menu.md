# Accounts and the menu editor (MT-15 to MT-17)

Written 19 October 2026. This is what we learned from other products, what we decided, and where the code lives.

## What other products do

We loaded each product's sign-in page in an isolated headless Chrome and captured it with REA (`inspect_web_page`, `analyze_web_bundle`). Mobile patterns came from Mobbin; help centres were read on the web. No accounts were made and no codes were requested.

| Product | Evidence | What it showed |
| --- | --- | --- |
| Swiggy partner | REA `ev_40db9ad6d9d1…` | One field, "Restaurant ID / Mobile number", then Continue. Steps: install the app, "Login/Register using your phone number", "Enter restaurant details" |
| Petpooja | REA `ev_7262cff2b46a…`, `ev_9448dfbac666…` | One field, "Email address or mobile number". The page switches the field between phone (country code, length rules) and email as you type. No password on the first step |
| OptiSigns | REA `ev_c077e7673e50…` | Email and password, plus Google, Microsoft, Facebook and SSO. Global signage tools use passwords; Indian restaurant tools don't |
| Square POS | Help article 8430 | "Mark as sold out at this location", per item or size, with an optional time to reset to available |
| Toast | Platform guide, stock status | In stock, out of stock, or a quantity that runs out. Out-of-stock items stay on the menu, marked, and can't be ordered |
| StoreHub | Help search result | Out of stock for today only, or until the owner turns it back on |
| Opal, Abode, Shelf (Mobbin) | Mobbin login flows | "We sent a code to …", six boxes or one field, "Resend code in 30s/60s", a back arrow to change the number |
| Email sign-in links | Supabase, Laravel package and CIAM write-ups | Outlook Safe Links, Mimecast and Proofpoint open every link in an email, which spends a one-time link before the person clicks it. A typed code avoids this |

## What we decided

- **One field, a 6-digit code, no password.** The owner types a mobile number or an email. We send a code by SMS or email. Signing in the first time creates the account, so the page never says whether a number is registered.
- **A code, not a link, by email too.** Email scanners spend links; owners often read email on a laptop but sign in on their phone. MT-15 said "email link"; this is the deliberate change.
- **Code rules:** valid 10 minutes, 5 tries, a new code replaces the old one, 30 seconds between codes to one address, 5 codes an hour to one address, and per-address limits on sending and checking. Codes and session tokens are stored only as hashes. Sessions last 30 days in an `HttpOnly`, `SameSite=Lax` cookie (`Secure` in production).
- **Delivery:** email through Resend and SMS through Twilio, by plain HTTPS calls, when their keys are set. In development the code shows on the sign-in page. In production with no provider, sign-in says so and logs an error; it never pretends to send.
- **Restaurant and outlet:** after the first sign-in, the owner names the restaurant, adds the area and an optional line under the name, and picks an empty menu or a sample café menu to edit. The first outlet is made with it.
- **Roles:** an owner does everything. Staff edit the menu and mark items sold out; they can't change TVs, screens or people. Owners add people by mobile number or email; someone not yet signed up joins when they first sign in.
- **Two kinds of "off":** *Sold out today* shows "Sold out" on the TV and comes back by itself tomorrow (India time). *Hidden* takes the dish off the TV until the owner shows it again.
- **Sizes:** an item has one price or up to three sizes (Half and Full, Regular and Large). Prices are stored in paise.
- **FSSAI fields now:** veg or non-veg mark, calories and serving size, and the allergens the FSSAI labelling rules name (gluten, crustaceans, milk, egg, fish, peanuts, tree nuts, soy, sulphite).
- **Photos:** taken with the phone camera, shrunk on the phone to 800 px before upload, checked by their first bytes on the server, and served with a long cache. The TV's service worker keeps them for offline play.

## Where it lives

| Piece | Code |
| --- | --- |
| Sign-in, sessions, restaurants, people | `src/features/accounts`, `/sign-in`, `/studio/setup`, `/studio/restaurant` |
| Menu model, edits and screen conversion | `src/features/menu` (pure, tested), `/studio/menu` |
| Photos | `src/features/menu/photos.ts`, `GET /api/photos/<id>` |
| TV bundle from the owner's menu | `src/features/screens/live.ts` |

## Owner walkthrough (19 October 2026)

Signed up as a new café owner on a 375 px phone, built a menu, paired two TVs, edited from the phone, added staff and signed in as them, then checked production. What a real owner would have tripped on, all fixed:

| What happened | Fix |
| --- | --- |
| "Owner sign in" sat at the far end of a sideways-scrolling nav on phones | "Sign in" is pinned at the end of the nav row on every page |
| The sign-in field opened a letter keyboard, though most owners type a mobile number | Number pad first, "Use email instead" one tap away |
| Sheets opened with focus on Close, so typing went nowhere | The first field takes focus |
| Labels (Bestseller) didn't show in the dish list | Shown under the dish name |
| In the sizes form, the size names (Half, Full) were squeezed out of sight | Name box flexes, price box keeps its width |
| "Saved" never went away and covered the bottom of the page | It clears after a moment; problems stay longer |
| Scanning the TV's QR opened Today with the connect form below the checklist | The connect form comes first when a code arrives |
| After connecting, the used code stayed in the box | The form starts fresh and the address bar drops the code |
| "In stock" in the editor, "Available" on Today | "In stock" everywhere |
| On the TV, half and full prices squeezed a dish name to "C." | Sizes stack in the price slot, and pages count their height |
| On the TV, the line under the name was cut off | The tax note moved under it, so the line keeps the width |
| The only owner saw a "Remove" button on themselves | "The only owner" instead |
| Nothing helped the owner tell new staff to sign in | "Send the link on WhatsApp" (or email) on each invite |
| A quick swipe could end before React saw its last move | The swipe distance is kept in a ref |
| With no SMS or email provider, phone said "use email" and email said "use mobile" | One plain message when neither works |
| Cache Components rejected `/studio/setup` and `/s/<token>` for reading the clock during prerender | Both read the time only after a request-time call |

## Paste and spreadsheet import (MT-18)

Built 19 October 2026. "Paste or upload" on the menu page takes the menu an owner already has.

- **What it reads:** a WhatsApp message (bold headings, emojis, bullets, "Rs. 80", "80/-", "₹ 1,200", leader dots, chat copy headers), cells copied from Excel or Google Sheets (tabs), and CSV, text or Excel (.xlsx) files. Phone numbers and links are skipped.
- **Sizes:** "half 180 full 320", "180 half 320 full", "(H) 140 (F) 240", "S 199 M 299 L 399", "7 inch 249 10 inch 399" and Hinglish "adha/poora". Two bare prices ("180/320") become Half and Full but are flagged for a check.
- **Never guess a price:** a number that might belong to the name ("Chicken 65 ₹220" is fine, "Chicken 65 220" is not) is flagged. A line with no price, a size with no price, more than three prices, a price over ₹10,000 or two dishes on one line are flagged too. Flagged dishes can't be saved until the owner changes them, removes them, or taps "Keep it as it is".
- **Spreadsheets:** a header row is mapped by its words (item name, price/rate/MRP, category/group, variation/size, veg/non-veg) or by size columns (Half, Full). A dish listed once per size is joined into one dish.
- **Saving:** one save, through the same edit functions as the editor (`applyImport` in `src/features/menu/edit.ts`). Categories are matched by name; a dish already on the menu keeps its photo and marks and gets the new prices, so importing twice never doubles the menu.
- **No new dependency:** .xlsx is a zip, unpacked with the browser's `DecompressionStream`. Old .xls files and PDFs get a plain message saying what to do instead.

| Piece | Code |
| --- | --- |
| Reader (pure, tested) | `src/features/menu/import.ts` |
| Files and Excel | `src/features/menu/spreadsheet.ts` |
| Preview sheet | `src/features/menu/components/import-sheet.tsx` |
| Save | `importMenuAction` in `src/app/studio/menu/actions.ts` (guarded like every menu edit) |

Owner walkthrough on a 375 px phone (a 16-line WhatsApp menu, then an Excel export) found and fixed:

| What happened | Fix |
| --- | --- |
| Removing a dish and removing a size used the same bin icon, stacked in one column | Sizes use an X |
| "Fix the dishes marked in red" stayed after the owner fixed them | The message clears on the next change |
| "Add 3 dishes" when one of them only changed a price | "Add 2 dishes, update 1" |
| Paneer tikka showed a chicken leg in the editor and on the TV | A veg dish never gets a meat or egg picture |
| The setup page never said a menu can be pasted | "Paste the menu you already have, or add dishes one by one." |

## Menu from a photo (MT-19)

Started 20 October 2026. "Add your menu" on the menu page now leads with "Take or choose photos"; pasting and files stay below it.

- **How it reads:** each photo is shrunk on the phone (about 1568 px on the long side, under 950 KB, so it fits a Server Action) and sent on its own to Claude (`claude-opus-5-5`, medium effort) with the Anthropic SDK. Up to four photos are read side by side and their dishes join in the order chosen. The answer must match a zod schema (`menuReadingSchema`): category, name, Hindi name, veg or non-veg or unknown, prices in rupees by size, and the fields the model was unsure of.
- **Never guess a price:** a price the model can't read comes back empty and the dish asks the owner to type it; a price of 0 or over ₹1,00,000 is dropped; more than three sizes are cut to three. Every unsure field (name, price, veg mark) is outlined in deep chilli and the dish says what to check. Nothing is saved until the owner checks the dishes and saves them, through the same preview and `importMenuAction` as a paste.
- **Privacy and cost:** the photo is sent once and kept nowhere. One restaurant can read 40 photos a day. A safety decline falls back to another model in the same call (`fallbacks: "default"`).
- **Setup:** set `ANTHROPIC_API_KEY` on the server. Without it, or if the model fails, the owner sees "We couldn’t read that photo right now. Try again in a minute, or paste your menu." and the fault is logged as `menu.photo_read_failed`.
- **Golden set:** `evals/menu-photos/` holds real photos and their answers; `MENU_PHOTO_EVAL=1 npx vitest run src/features/menu/photo-eval.test.ts` reads them all and fails under 95% of prices exact. It is empty until real photos are added.

| Piece | Code |
| --- | --- |
| Schema, mapping to dishes, scoring (pure, tested) | `src/features/menu/photo-import.ts` |
| The model call | `src/features/menu/photo-reader.ts` |
| Server Action | `readMenuPhotoAction` in `src/app/studio/menu/actions.ts` |
| Photo picker and outlines | `src/features/menu/components/import-sheet.tsx` |

## Dayparts and slide timing (MT-24)

Built 20 October 2026.

- **Dayparts:** the category sheet has "Show only at certain times": from, until (in 12-hour time on phones) and the days, Monday first. Stored on the category as minutes of the outlet's day and days 0 (Sunday) to 6 (`src/features/menu/dayparts.ts`, tested); `screenRestaurant` leaves out categories that aren't on at the outlet's `localClock`. The editor says when each timed category shows, and "Not on your TVs now" outside it.
- **Timing:** each screen's "Each menu page stays up" and "Each promo stays up" choices on the TVs page (`TIMING_CHOICES` in `src/features/screen/loop.ts`); screens saved before this play the defaults, 18 and 7 seconds. The bundle carries the timing to the TV.
- **Preview:** each screen on the TVs page has "Preview what it plays", the live loop with that screen's layout, theme, timing and current dayparts.
- **Checked on a production build:** a daypart ending at 2:28 am left the bundle at 2:28:02 and the TV at 2:28:05 with no edit; setting promos to 10 seconds made the TV turn them every 10.0 seconds (after its daily reload brought the new player, see ADR-005).

## Brand and layout revamp (19 October 2026, evening)

The owner app moved to the site's brand and four tabs (DESIGN.md, Owner app). Walked through as a new owner on a 375px screen, with a TV tab at 1920 by 1080, then at 1440 by 900: sign up by email code, set up the restaurant, paste a menu, pair a TV, mark a dish sold out (on the TV in about 2 s), add staff and sign in as them, connect a second TV. Fixed on the way:

- Pasting a menu read section names between dishes ("Snacks", "Bakes") as dishes with no price. Lines made only of common section words are now headings (`isSectionName` in `import.ts`, tested); an unpriced dish like "Masala dosa" still stays a dish.
- After connecting a TV, the TVs page said "Connected" but still listed no TVs: the TV collects its link a few seconds later. The form now refreshes the page 3, 7 and 15 s after connecting.
- The menu editor sent owners to Today to change the layout and theme; it now points to TVs.
- The menu editor had a hydration mismatch from dnd-kit's counter-based ids; each dish list now has a stable `id`.
- The TV's pairing screen still wore the old slate and yellow; it is now the brand at night.

## Walkthrough as an owner who isn't comfortable with tech (20 October 2026)

On a 375 px phone with a 1920 by 1080 TV tab: a sweet shop signed up with a messy number (`+91-98765 00002`), typed a wrong code, pasted a WhatsApp menu, connected a TV with the code typed in lowercase with a space, changed the look, added a staff member and signed in as them, and marked a dish sold out from their phone. What tripped us up, and the fix:

| Where | What confused us | Fix |
| --- | --- | --- |
| Menu, empty | The main button reads a photo, but without `ANTHROPIC_API_KEY` it failed with "try again in a minute", forever | `canReadMenuPhotos()`: without a key, the empty menu, setup and Today lead with paste, the sheet is paste or a file, and the action says reading photos isn't switched on |
| Paste | The shop name at the top became a category, and "MITHAI (per kg)" a dish with no price | A note in brackets no longer stops a line from reading as a heading (`withoutNote` in import.ts) |
| Today, TVs | "Open /pair in the TV's browser": no site address, and many owners don't know their TV has a browser | Numbered steps with the full address as typed (`typedAddress`, like menuontv.in/pair), the TV's internet app named, and /tv-check for "will my TV work?" |
| TVs | "New link" cut the TV off in one tap | Asks first and says what happens |
| TVs | "A screen is a layout and a theme…" before anything was connected; "Show this screen: A new screen (Split layout, Paper theme)" on the first TV | A plain intro; the first TV gets the usual look without a question; later TVs choose "The same as Counter TV" or a new look |
| TVs | Layout and theme were bare names | Each choice shows a plain description of what it looks like; "Theme" is "Colours"; layout descriptions reworded without "promo", "ticker" or "hero" |
| TVs | "Add a screen by link" shown to everyone | Folded under "Other ways to connect a TV" |
| Setup, sheets | Grey examples ("Chai Point", "Paneer tikka roll", "80") looked like filled answers | "For example, …", and no example price |
| Restaurant | "When they sign in at /sign-in" | "When they sign in to MenuOnTV", pointing to the WhatsApp link |
| Site, phone | Owner sign-in hidden in the menu on narrow phones | A short "Sign in" in the bar where the main button was |
| TV pairing screen | "open http://…/studio/tvs" | "the TVs tab in MenuOnTV", the address without the scheme |

What worked without help: messy numbers, a wrong code (tries left, field cleared), rupee signs, `/-` and `Rs.`, half and full prices, the code typed in lowercase with spaces, the TV list filling in by itself after connecting, staff seeing a clear "signed in as staff" line, and sold out on the TV within seconds.

## Known limits

- Data still lives in JSON files (ADR-008). Postgres and blob storage are the next infrastructure step.
- SMS and email need provider accounts (MT-14). Indian SMS also needs a DLT-registered template.
- One restaurant per account for now; someone on two restaurants' teams sees the first.
