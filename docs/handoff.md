# Handoff: the night of 15 November 2026 (D2)

Written by HQ for the founder's 08:00 review, and for whoever picks the work up next. Decisions are in [decisions.md](decisions.md) (D1 to D3); the roadmap is the tracker. Main is at the merge of #58.

## In one line

Most of the tracker's next v0 work is built and on main: quick actions (MT-25), all four promo studio slices (MT-26), Hindi on screen (MT-28, apart from AI translation), FSSAI mode's first slice (MT-29), onboarding's first slice (MT-34), and both TV player bugs. The full ordering plan, reviewed, is in the tracker with its first four PRDs. Ordering itself is not built yet, because D2 puts the tracker work first. Some merged slices still have gaps QA found; they are listed below and kept out of Done.

## Merged with the full process (PRD, build, QA's checks from the PRD, gate, walk)

| Tracker | What | PRs |
|---|---|---|
| MT-25 | Today's special in the menu and on the TV; the special, prices and sold out on Today | #14 + QA #22, #31 + QA #37 (QA walked at 375 px with a TV) |
| MT-26 slice 1 | Promo data, schedules, status and owner actions | #21 + QA #27 |
| MT-26 slice 2 | Studio promos on the TV, ending by the wall clock | #26 + QA #29, as #34 (QA checked on a real TV) |
| MT-26 slice 3 | The Promos page and tab | #39 + QA checks, as #55 (walked at 375 px as owner and staff) |
| MT-28 slice 1 | The screen language setting and the Hindi pass | #40 + QA #44 |
| MT-28 slice 2 | Hindi at full size, language cards, Hindi on promos | #51, as #53 (QA walked at 375 px with a TV; the merge with the promo looks was checked on a TV) |
| MT-29 slice 1 | The FSSAI switch and calories in the bundle | #42 + QA #50 |
| MT-34 slice 1 | Onboarding's saved look and milestones (data only) | as #58, with QA's checks |
| MT-23 | B1: a TV reopens its live stream after an error (1.2 s to the TV, was 48 s) | #30 (QA re-ran its repro on a real TV) |
| MT-21 | B2: an offline reload plays the newest menu; B3: the 4 am reload is tested | #35 + QA #36, as #38 (QA checked on a real TV) |

Bug fixes, each with a test that failed first: #4 (zod advisory), #9 (load-flaky pairing test), #11 ("Saved" above the phone tab bar), #13 (Save in reach on sheets), #15 (copy), #18 (dish names cut on the TV), #46 (paste import), #48 as #54 (a happy hour's countdown), #49 (dish names, not ids, in drag announcements).

## Merged, with gaps QA found afterwards

HQ merged #43 and #47 on the gate alone, before QA had written PRD checks or walked them. That broke HQ's own D2 rule. QA-role checks followed (#56, #57); the gaps are pinned as known failures (`it.fails`), so MT-26 and MT-98 stay out of Done until they're fixed.

- **MT-26 slice 4, promo looks on the TV (#43; 52 checks pass, 8 gaps):**
  1. Combo shows one plate; Design's section said "plates side by side". **HQ call: one picture**, as the PRD and `docs/screen-design.md` say; Design's line and QA's check follow.
  2. Happy hour shows no hours tag ("3 to 5 pm").
  3. A festival promo with two dishes shows no prices (the PRD says the dishes' menu prices).
  4. The QR quiet zone is under the standard 4 modules (2.66 on Split, 1.88 on Board).
  5. The side promo price is 11% of screen height; the screen rules say 12 to 18% (older than MT-26).
  6. The countdown reads the TV's raw clock while the loop uses the corrected one, so on a TV whose clock is off they disagree.
  7. A 30-character headline wraps to 3 lines (5 on Portrait); Design says two lines before it trims.
  8. On Board, "Ends in 30 min" sits beside the price, not under it.
- **MT-98, "Try it" on phones (#47; 204 checks pass, 3 gaps):**
  1. With the keyboard up, the field being typed in can end up under the pinned TV. Fix this one first.
  2. The TV is 167 px tall at 375 px; Design said about 193 px.
  3. A new dish shows on the TV only once it has a price; the PRD says typing shows it.
- **MT-26 slice 3 (#55), low:** "New promo" sits above the list, not after it as Design ordered.

## Built on branches, not verified, not merged

These were built by workflow agents in Platform's or Design's role after 05:05, while the team sessions were idle. Their QA steps started after the 07:15 cut-off and stopped, so none is verified. Don't build them again; review and verify them.

| Branch | What | State |
|---|---|---|
| `platform/special-timing` (8528ee0) | MT-25: a new special comes up in the side zone within 10 s (option B, `special.setAt`), and a new bundle swaps in at every slide change | Built with tests; needs QA's checks and the 10 s measurement on a TV |
| `platform/dev-log-ignore` (a718cbc) + `qa/dev-log-checks` | Screen links out of the dev server's request log | QA **failed** it: links still reach the dev log through Next's Server Function log line (the add-screen form sends the previous link back). Fix: `logging.serverFunctions: false`, or stop returning the link in the action state. The sign-in resend form can log a phone, email and dev code the same way |
| `mt-36/funnel-data` (1419117) | MT-36 slice 1, owner funnel data | Built with tests; needs QA's checks |
| `design/mt-29-switch` (9b9d51d) | MT-29 slice 2, the FSSAI switch and missing-calories flags | Built; needs QA's checks and a walk at 375 px |
| `platform/promo-gaps` (8cdedb9) | Platform's half of the MT-26 slice 4 gaps (2, 3, 6) | Stopped at 08:25; Design's half not started |

## The ordering plan (your D2 goal)

- On main: [ordering-plan.md](ordering-plan.md) and an Orders area in the tracker, in build order: MT-89 QR menu, MT-90 order from the phone, MT-91 kitchen board, MT-92 live status and ready alert, MT-40 "Ready for pickup" on the TV, MT-93 pay at the counter or by your UPI, MT-94 today's orders, then MT-99 to MT-103 (confirm a changed price, test order, one dish unavailable, pair the kitchen board, orders by table) and MT-105 (send board orders to the POS).
- HQ ran an independent review (five lenses, then a skeptic pass; 19 findings held), the comment on PR #12. D3 records HQ's calls. The review is folded into the plan's Done-when lines (#52; a checker confirmed 78 of 78 points after one fix round).
- PRDs: MT-89 approved; MT-90, MT-91 and MT-92 drafted, waiting for Design's sections and HQ approval.
- Waiting on you: SMS or WhatsApp (MT-95), web push (MT-96), a payment gateway (MT-97), and Free or Plus for ordering (MT-104).

## Tracker status

- Done: MT-16, MT-17, MT-18, MT-22, MT-24.
- Ready for Done, not yet moved: MT-23 (every line met).
- Not yet moved for tonight's builds: MT-25, MT-26, MT-28, MT-29, MT-34, MT-98. Product was idle, so `data/tracker.json` doesn't show them. Move them by the evidence above: MT-25 waits on the special timing; MT-26 and MT-98 on their gaps; MT-28 is built apart from its AI slice.
- In review: MT-15 (real SMS and email wait on MT-14), MT-21 (needs a check on real TVs).
- Waiting on you: MT-19 and MT-27 (an AI key), MT-33 (a payment provider), MT-37 (field work).
- Two notes: the gate never parses the committed `data/tracker.json` (MT-106 adds that test), so a passing gate doesn't prove the tracker page works. And some orders items carry an `updatedAt` of 09:00 today, ahead of when they were edited; only the "updated" sort reads it, so they float to the top until then.

## Next, in order

1. Verify and merge the branches above (QA, then HQ).
2. Fix the MT-98 field-under-the-TV gap, then the eight MT-26 promo look gaps.
3. MT-29 slice 3 (calories and allergens on the TV), MT-34 slice 2 (the guided path and look picker), MT-36 slice 2, MT-31, MT-35.
4. Then ordering, from MT-89, once the founder promotes the Orders items to Planned (D3).

## Your calls

1. **Waitlist or open self-serve?** Today the site sends owners to an email waitlist, but "Owner sign in" opens the whole product. Product recommends open self-serve; HQ held it because PRODUCT.md plans a pilot first.
2. **Ordering on Free or Plus (MT-104)?** HQ doesn't set prices. Product recommends free until billing (MT-33); HQ suggests asking whether it's priced per outlet rather than per screen after that.
3. **Screen links in web addresses.** A TV's secret link is in its URL by design (ADR-001), so any page-address log Netlify itself keeps would see it. Our own logs don't, apart from the dev-only leak above.
4. **Keys and accounts:** an AI key (MT-19, MT-27, MT-28's translation drafts), a payment provider (MT-33), SMS and email providers (MT-14), and a real ₹1 UPI test (MT-93).
5. **Review HQ's calls** in D2 and D3, the merge of #43 and #47 before QA's checks, and the slices built by workflow agents rather than the team sessions.

## Why the night slowed, and ran past 08:00

- The app lets a session send 20 messages to other sessions until its own user types in it. HQ hit that limit around 03:30 and the teams hit theirs soon after, so briefs, answers and reports stopped flowing, and from about 04:30 every team session sat idle. HQ answered on PR comments and ran the teams' next jobs as workflows (visible under /workflows, not as chats).
- HQ's 20-minute heartbeats queued up while long workflows ran, so the 07:31 wrap-up only started at 08:21. Work still in flight then was stopped and is listed above.
- To restart the teams: type anything in HQ's chat so HQ can brief them, and type in each team's chat whose own messages are capped.
