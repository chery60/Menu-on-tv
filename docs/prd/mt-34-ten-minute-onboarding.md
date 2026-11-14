# Ten-minute onboarding

Status: approved
Tracker: MT-34
Surface: owner app

## What it is
From signing in to your menu on your own TV in under ten minutes, on your phone alone: add the menu, pick the look, connect the TV. Then one nudge to put today's special on.

## Who uses it
- **New owners**, at the counter, often between orders and often without a laptop.
- **Field reps** helping an owner set up (MT-35 builds on the same steps).

## What it does
Built already: sign-in by code, "Set up your restaurant" (name, area, line under the name, empty or sample menu), and a three-step checklist on Today ("Add your menu", "Connect your TV", "Watch it play").

New, after setup, as one guided path on Today that the owner can leave and come back to:
1. **Add your menu.** Photo (when the AI key is set), paste, or start from the sample and edit. Done when the menu has a dish with a price.
2. **Pick the look.** Six small live screens, one per layout, as choices, each playing the owner's own menu, plus the two colours. "Keep this look" is one tap; Split on Paper is preselected. The choice becomes the first TV's look.
3. **Connect your TV.** The numbered steps already on the TVs tab (the TV's internet app, the address typed out, the code), with "Will my TV work?" (`/tv-check`). Done when the TV is on air with the owner's menu.
4. **Nudge, once:** "Add today's special?" opens MT-25's picker. "Not now" hides it for good.
- Each step shows done or not, and the path says "About 10 minutes". A step done elsewhere (the Menu or TVs tab) shows as done here too.
- When all three steps are done, the path is replaced by the usual Today page.
- Owners only. Staff never see the path, as with today's checklist.
- **The same look picker on the TVs tab** replaces the layout dropdown in "Change how it looks" (walkthrough finding 5, `docs/research/owner-walkthrough-2026-11.md`, MT-20), so owners see every layout before they choose, wherever they choose.

## Design
Design to write.

## Data it touches
- **The restaurant** gains the look picked in step 2 and whether the nudge was answered.
- **Screens:** connecting the first TV uses that look, instead of always Split on Paper.
- **Funnel events (MT-36):** each step's first completion is recorded, so drop-off per step can be measured. Nothing else is recorded.

## Rules and edge cases
- Every step works on a 360 px phone with no laptop. Pairing needs only the TV's remote and the phone.
- Without the AI key, step 1 leads with paste and the sample, as the empty menu does today (`canReadMenuPhotos`).
- An owner who changes the look later on the TVs tab changes that screen, not the onboarding choice.
- A restaurant set up before this ships sees the path only for the steps it hasn't done.

## Not in this version
- A video or animated tour.
- Hindi for the owner app.
- The pilot's real median time. That's measured in the pilot (MT-37) from MT-36's funnel.

## Slices
1. **Platform: the look and the milestones.** Owns `src/features/accounts/schema.ts` and `src/features/accounts/repository.ts` (the look and the nudge), and `src/app/studio/actions.ts` (the first TV uses the look). After MT-29 slice 1, which also edits the accounts files. Records each step's first completion through MT-36's event store when that has merged.
2. **Design: the look picker.** Can start now. Owns a new `src/features/onboarding/components/look-picker.tsx` (six live screens and two colours, reusing `MenuPreview` and the site's layout gallery) and puts it in place of the dropdown in `src/features/screens/components/studio-forms.tsx`, after MT-28 slice 2, which also edits that file.
3. **Design: the guided path on Today.** After slices 1 and 2 and MT-25 slice 2, which owns Today. Owns `src/app/studio/page.tsx` and the other new components in `src/features/onboarding/components/`.

## How we'll know it works
As a brand-new owner on a 375 px phone, with a TV tab at 1920 by 1080 standing in for the TV:
1. Sign in, set up "Chai Point", paste a 10-line menu, keep the look, connect the TV and see the menu on air, all in under 10 minutes, timed. Nothing needs a laptop.
2. Step 2 shows the owner's own dishes in each of the six layouts and both colours. Pick Full board on Night: the TV, once connected, plays Full board on Night.
3. Leave after step 1 and come back the next day: Today opens on step 2, with step 1 shown as done.
4. Add a dish on the Menu tab instead of the path: step 1 shows as done.
5. Once the TV is on air, "Add today's special?" shows once. "Not now" hides it, and it never comes back.
6. With all three steps done, Today looks as it does now, with no path.
7. Without the AI key, step 1 offers paste and the sample, never a photo button that fails.
8. Signed in as staff: no path.
9. On the TVs tab, "Change how it looks" shows the six layouts as live screens playing the owner's menu, with no dropdown. Pick L-bar and save: the TV changes at its next slide.
10. Design walks it as a new owner who isn't comfortable with tech, on a 375 px phone, and fixes what gets in the way.
