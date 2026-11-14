# Field demo mode

Status: draft
Tracker: MT-35
Surface: owner app (rep), TV, team area

## What it is
A MenuOnTV rep walks into a shop, builds a draft of the owner's own menu on the rep's phone, and shows it on a TV in about a minute. If the owner likes it, the rep hands the draft to the owner's mobile number and the owner carries on from there. This is our main sales channel (`docs/field-kit.md`).

## Who uses it
- **Reps**, MenuOnTV's field team, on their own phone with a demo stick.
- **Owners**, who receive a ready restaurant with their menu and TV.
- **The team**, who add reps and see which rep brought which restaurant.

## What it does
- **Reps** are added in the team area (`/tracker/reps`, behind the team password) by mobile number or email. A rep signs in like an owner and gets a Demos page.
- **The rep's demo TV:** the rep pairs their demo stick once, to "My demo TV". It always shows the rep's latest demo, or a standby card with the MenuOnTV name when there's none.
- **New demo:** the shop's name, then the menu: a photo (when the AI key is set), paste, or the sample café menu with the shop's name on it. The demo TV shows it within 10 seconds of saving.
- **The shop's own TV:** connected with the usual `/pair` code, from the draft's TVs tab. It stays with the restaurant after the handover.
- **Hand over:** the rep types the owner's mobile number or email and taps "Hand over". The owner becomes the restaurant's only owner. The rep loses access, and the demo TV goes back to standby. When the owner signs in, they land on Today with their menu and any TV already connected.
- **Demos list:** the rep's open drafts with their age. "Delete" asks first.
- Empty state: "No demos yet. Start one in a shop."

## Design
Design to write.

## Data it touches
- **People:** a rep mark on a person (accounts data), set and cleared only in the team area.
- **Restaurants:** a draft mark, the rep who made it and when it was handed over. MT-36's funnel reads this to count restaurants by rep.
- **Screens:** the rep's demo TV, which follows the rep's latest draft rather than one restaurant.
- The owner's number or email, entered at hand over, is stored only as the owner's sign-in, exactly as an invite is today.

## Rules and edge cases
- Up to 20 open drafts per rep (starting value). A draft not handed over within 7 days is deleted, with its menu and TV links.
- A number that already owns a restaurant can't receive a draft (one restaurant per account for now). The rep is told to hand over to another number.
- Only reps see Demos, and every demo action checks the rep mark and that the draft is the rep's own, in `guard.ts`.
- In production, the owner's sign-in after the hand over needs the email or SMS provider, like every sign-in (MT-14). In development the code shows on the sign-in page, as now.

## Waiting on the founder (D2)
- **Draft from a photo** needs the AI key (as MT-19). Until then reps use paste or the sample menu.
- **Signing in, in production,** needs the email provider (Resend) or the SMS provider (Twilio), as every sign-in does (MT-14).

## Not in this version
- Rep commissions or payouts.
- Rep targets, maps or routes.
- Handing a draft to someone who already has a restaurant.

## Slices
1. **Platform: reps, drafts and the hand over.** Owns `src/features/accounts/schema.ts` and `src/features/accounts/repository.ts` (after MT-34 slice 1, which also edits them), `src/features/screens/repository.ts` (the demo TV follows the latest draft), and new `src/app/studio/demos/actions.ts` and `src/app/tracker/reps/actions.ts`, with tests. A daily clean-up removes drafts older than 7 days.
2. **Design: the Demos page and the team area's reps list.** After slice 1. Owns new `src/app/studio/demos/page.tsx`, `src/app/tracker/reps/page.tsx` and their components, and a Demos link for reps in `src/components/owner/owner-frame.tsx` (after MT-26 slice 3, which adds Promos there).

## How we'll know it works
As a rep on a 375 px phone, with a TV tab standing in for the demo stick:
1. In the team area, add the rep's email. When the rep signs in, Demos shows. A person who isn't a rep can't open Demos, and calling the demo actions directly is refused.
2. Pair the demo stick to "My demo TV": it shows the standby card.
3. Tap New demo, type "Sharma Sweets" and pick the sample menu: the demo TV shows Sharma Sweets within 60 seconds of tapping New demo, timed.
4. Paste a 10-line menu into the demo: the demo TV shows it within 10 seconds of saving.
5. Connect a second TV tab with the `/pair` code: it plays the draft.
6. Hand over to an email that has no restaurant: the rep can no longer open the draft, the demo TV goes back to standby, and the second TV keeps playing. Signing in as that email lands on Sharma Sweets' Today as its owner, with the menu and the TV there.
7. Hand over to an email that already has a restaurant: it's refused with a clear message.
8. The draft shows the rep's name in the team area, and MT-36's funnel counts it under that rep.
9. Set the clock 8 days ahead: a draft that wasn't handed over is gone, and its TV link stops working.
10. A 21st open draft is refused.
11. Once the AI key is set: a draft from a photo of a menu reaches the demo TV within 60 seconds.
12. Design walks it as a rep in a shop on a 375 px phone and fixes what gets in the way.
