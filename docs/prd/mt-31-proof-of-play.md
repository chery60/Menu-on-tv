# Proof of play

Status: draft
Tracker: MT-31
Surface: owner app, TV

## What it is
See what each TV actually played: how many times each promo, menu page and spotlight dish showed, hour by hour, even through internet cuts. It counts plays, never people (PRODUCT.md), and it's the base for sales lift (v1) and ad reports (v2).

## Who uses it
- **Owners**, to see that their promos ran ("Cold coffee combo: 412 times this week on 2 TVs").
- **MenuOnTV**, later, for lift reports and ad billing.

## What it does
- **Every TV counts** each slide it shows from start to end: menu pages, promos, today's special, spotlight dishes and (v2) ads. It keeps the counts by hour and sends them with its heartbeat each minute.
- **Offline:** the TV keeps its counts on the TV, up to 7 days, and sends them when it's back online. Nothing is counted twice.
- **"What your TVs played"** (TVs tab, owners only): the last 7 days, with a row per promo and a column per day for all TVs together. Tap a promo for each TV and each hour. Menu pages show as one row, "Menu".
- **Download CSV:** the last 30 days, one row per TV, hour and slide, with columns for date, hour (outlet time), TV, slide kind, slide name, plays and seconds on screen.
- **Empty state:** "Nothing played yet. Counts start when a TV is on air."
- A promo that has since been removed shows as "A removed promo" with its counts kept.

## Design
Design to write.

## Data it touches
- **A play log:** for each screen link, hour and slide, the number of plays and the seconds shown. Kept 90 days (starting value), then deleted. It's write-heavy (every TV, every minute), so it goes in a table in Netlify Database, with an ADR from Platform; the orders table (MT-90) can share the decision.
- **The heartbeat** (`/api/s/<token>/beat`) gains the hourly counts the TV hasn't sent yet. The server answers with what it saved, so the TV can drop them.
- Slide names come from the slide labels the loop already makes (`slideLabel`), with names looked up from the menu and promos at report time.

## Rules and edge cases
- A slide counts only if it was on screen until its end and the page was visible. A TV that reloads mid-slide doesn't count that slide.
- The server refuses counts that can't be true, such as more plays in an hour than the loop's timing allows, or hours in the future, and logs the refusal without the token.
- Counts are per TV link. Replacing a TV's link starts a new row, labelled with the same TV name.
- Hours are the outlet's time zone.
- No guest data of any kind: no cameras, no counting people and no phones near the TV.
- Staff can't see the report (it's owners only), as with the TVs tab today.

## Not in this version
- Sales lift per promo (MT-39) and ad reports (v2).
- Counts in real time; the report is up to a minute behind.
- Charts. The report is a table.

## Slices
1. **Platform: counting on the TV and saving it.** Owns the player's counting (in `src/features/screen/components/live-player.tsx` and `src/player/`), `src/features/screens/schema.ts` (the heartbeat's counts), `src/app/api/s/[token]/beat/route.ts`, a new `src/features/plays/` (store, checks, report and CSV, pure and tested), and the ADR in `docs/architecture.md`. Run `npm run player` after.
2. **Platform: the CSV download.** New `src/app/studio/tvs/plays.csv/route.ts`, owners only.
3. **Design: the report.** After slice 1. Owns a new `src/app/studio/tvs/plays/page.tsx` and its components, and a link to it from `src/app/studio/tvs/page.tsx`.

## How we'll know it works
With a TV on `/s/<token>` playing a menu with two promos, as the owner on a 375 px phone:
1. After 10 minutes, the report shows each promo's plays for today, and the count matches the loop's timing (10 minutes divided by the loop length, give or take one).
2. Tap a promo: the counts show for each TV and each hour.
3. Cut the TV's internet for 20 minutes, then restore it: within 2 minutes the report includes those 20 minutes, and nothing is counted twice.
4. Reload the TV mid-slide: that slide isn't counted.
5. Download CSV: it opens in a spreadsheet with the columns above, for 30 days, in the outlet's hours.
6. Send the heartbeat by hand with 5,000 plays in one hour: it's refused, and the report doesn't change.
7. Remove a promo: its past counts stay, as "A removed promo".
8. As staff: there's no report, and the CSV address is refused.
9. Design walks it as an owner on a 375 px phone and fixes what gets in the way.
