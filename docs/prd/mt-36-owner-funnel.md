# Owner funnel

Status: draft
Tracker: MT-36
Surface: team area

## What it is
For the MenuOnTV team: how many restaurants get from sign-up to a screen on air to paying, how long it takes each one, where they stop, and how many keep using it each week. It counts restaurants and owners' actions, never guests (PRODUCT.md), and it's what the pilot (MT-37) is measured by (`docs/market-size.md`).

## Who uses it
- **The founder and the team**, weekly, and reps for their own restaurants (MT-35).
- Not owners or guests: they never see it, and nothing about guests is recorded.

## What it does
A **Funnel** page in the team area (`/tracker/funnel`, behind the team password):
- **The funnel**, for restaurants that signed up in the last 7, 30 or 90 days: signed up, restaurant set up, menu added, look picked (MT-34), TV connected, screen on air, and paid (once MT-33 exists). Each step shows a count and the share of the step before. It can be split by channel: on their own, or each rep.
- **Time to first screen:** the median from sign-up to screen on air, and a list of restaurants with their time and, for those not there yet, the step they stopped at.
- **Weekly active:** for each of the last 8 weeks, how many restaurants had an owner or staff member change something, and how many used a quick action (MT-25). The 60% target in PRODUCT.md reads from this.
- Empty state: "No restaurants yet in this period."

## Design
Design to write.

## Data it touches
- **Milestones**, one per restaurant per step: the step and when it first happened, and the channel (on their own, or the rep from MT-35). Recorded on the server by the action that completes the step. The first screen on air is the first heartbeat from one of the restaurant's TVs.
- **Activity**, one mark per restaurant per day: whether anyone changed something that day, and whether a quick action was used. It's recorded once a day at most, so it adds almost no writes.
- **Nothing else:** no phone numbers, emails or people's names; no IP addresses; no guest data; no cookies, scripts or third-party analytics anywhere. Restaurant names show on the team page only.
- Kept 13 months (starting value), then deleted. A restaurant that is deleted takes its milestones with it.

## Rules and edge cases
- Restaurants set up before this ships get the milestones that can be read from data they already have (when they signed up, set up, connected a TV), and no others.
- MenuOnTV's own test and demo restaurants are left out: drafts that were never handed over (MT-35) and restaurants the team marks as test in the funnel page.
- Times are shown in India time.
- Only someone with the team password can open the page.

## Not in this version
- Charts. Counts and lists only.
- Revenue figures (with MT-33).
- Anything about guests, TV audiences or menus' contents.

## Slices
1. **Platform: milestones and activity.** New `src/features/funnel/` (store, record, and the funnel and weekly sums, pure and tested) and new `src/app/tracker/funnel/actions.ts` (mark a restaurant as test). Activity is recorded in `src/app/studio/guard.ts`, which every owner action already passes through. Each milestone is one call in the action that completes it: `src/app/sign-in/actions.ts`, `src/app/studio/setup/actions.ts`, `src/app/studio/menu/actions.ts`, `src/app/studio/actions.ts` and `src/app/api/s/[token]/beat/route.ts`. Rebase over whichever slices of MT-25 to MT-35 have merged first.
2. **Design: the Funnel page.** After slice 1. Owns new `src/app/tracker/funnel/page.tsx` and its components.

## How we'll know it works
With the team password, and a fresh owner signing up on a 375 px phone:
1. Sign up, set up, paste a menu and connect a TV. The funnel for the last 7 days counts one more at each step, and the restaurant shows in Time to first screen with its time.
2. A second owner stops after setting up: they show at "Restaurant set up", with no time to first screen.
3. Mark a dish sold out as staff: this week's Weekly active and quick-action counts each go up by one, and doing it ten more times today changes neither.
4. A restaurant from an MT-35 demo shows under that rep's channel after its hand over; drafts never handed over don't count.
5. Without the team password, `/tracker/funnel` asks for it.
6. The funnel's store holds no phone number, email, person's name or IP address (QA reads the stored data).
7. Owner and guest pages make no requests to third parties and set no new cookies (browser tools).
8. Mark a restaurant as test: it leaves every count.
9. Design reads the page as the founder on a computer and a phone, and fixes what gets in the way.
