# TV compatibility lab (MT-12)

Written 20 October 2026. Every competitor warns that TV browsers are unreliable. Before we promise owners "just open a link on your TV", we run the real player on ten TVs and sticks for 72 hours each and write down what happens. This page is the procedure and the results sheet.

## The tools

| Tool | Where | What it does |
| --- | --- | --- |
| TV check | `/tv-check`, opened in the TV's browser | Measures the browser in about 3 seconds and answers in plain words: can it show the menu, will changes arrive in seconds, can it start without Wi-Fi, how sharp and how smooth. It runs on the player's own bundle, so a browser too old for the player leaves the message "If this message stays, this TV's browser is too old" on screen. Owners can use it too. |
| Lab panel | A TV's link with `?lab` (or `?lab=reset` to start a new run) | A small panel in the corner while the menu plays: time running and loads (the player reloads once a day), frames a second now and at worst, the longest freeze, Wi-Fi drops and the longest one, and memory at start and at peak (Chromium browsers only). The numbers live in the TV's own storage, so the daily reload keeps them. |
| Owner app | TVs page | Shows each TV's last heartbeat; a TV that stops beating for more than a few minutes shows as offline. |

Code: `src/features/screens/tv-check.ts` (the verdict, tested), `src/player/tv-check.tsx`, `src/features/screen/lab.ts` (the panel's arithmetic, tested), `src/player/lab-panel.ts`.

## What the player needs from a browser

| Need | Why | Without it |
| --- | --- | --- |
| CSS container queries and units (Chromium 105+, Safari 16+) | Every size on a screen is set in container units (`cqw`, `cqh`), so the menu scales to any TV | Fails: text and photos come out the wrong size |
| ES2019 JavaScript (Chromium 73+) | The player is compiled for ES2019 | Fails: the player never starts, and the TV check's fallback message stays |
| Server-sent events | Changes arrive in a few seconds | Workaround: changes arrive with the next heartbeat, within a minute |
| Service worker | The TV can start playing without Wi-Fi | Workaround: after a restart without Wi-Fi, the TV waits for the Wi-Fi |

## What we know before testing

- **Samsung (Tizen).** Samsung's own table of TV web engines: 2026 sets run Chromium M130, 2025 M120, 2024 M108, 2023 M94, 2022 M85, 2021 M76, 2020 M69 ([Samsung developer site](https://developer.samsung.com/smarttv/develop/specifications/web-engine-specifications.html)). So a 2024 or newer Samsung should pass, and a 2023 or older one should fail on container units. Many restaurant TVs in India are 2019 to 2023 sets, so this is the biggest risk to "just a link". See the open question below.
- **LG (webOS).** No official table found. Third-party lists put webOS 6 (2021) at Chromium 79. Test before believing anything.
- **Android TV and Google TV** (Mi, TCL, OnePlus, Sony, and most set-top boxes such as JioTV+ and Airtel Xstream). Most have no web browser installed. The owner has to install one from the Play Store, which uses the stick's Android System WebView, usually up to date. Test with one browser and write down which.
- **Fire TV sticks.** Amazon's Silk browser is built on Chromium and updated regularly ([Amazon Silk docs](https://docs.aws.amazon.com/silk/latest/developerguide/what-is-silk.md)). The likely recommended stick, if it passes the 72 hours.

## The devices

Ten, covering what owners in the pilot neighbourhood actually have, and what we would tell them to buy.

| # | Device | Browser | Expectation |
| --- | --- | --- | --- |
| 1 | Samsung smart TV, 2024 or newer | Built-in Internet | Pass |
| 2 | Samsung smart TV, 2022 or 2023 | Built-in Internet | Fail (container units) |
| 3 | LG smart TV, 2023 or 2024 | Built-in Web Browser | Unknown |
| 4 | Mi or Xiaomi TV (Android TV or PatchWall) | A browser from the Play Store | Unknown |
| 5 | TCL or Sony Google TV | A browser from the Play Store | Unknown |
| 6 | Amazon Fire TV Stick (Fire OS) | Silk | Pass |
| 7 | Amazon Fire TV Stick on Vega OS | Silk | Unknown |
| 8 | Google TV Streamer or Chromecast with Google TV | A browser from the Play Store | Unknown |
| 9 | A ₹2,000-class Android box | A browser from the Play Store | Unknown |
| 10 | An operator box (JioTV+ or Airtel Xstream) | Whatever it allows | Unknown |

## The procedure, per device

1. **Check.** Open `/tv-check` on the TV. Photograph the screen. Write the verdict and each line into the sheet.
2. **Connect.** Open `/pair`, connect the TV from the owner app on a phone, and note how long it took.
3. **Start the run.** Add `?lab=reset` to the end of the TV's link and open it. Leave the TV on for 72 hours with the Full board layout.
4. **During the run:**
   - Day 1: mark a dish sold out on the phone and time how long the TV takes. Do it three times.
   - Day 1: unplug the Wi-Fi router for 5 minutes, plug it back, and note whether the menu kept playing and when it caught up.
   - Day 2: put the TV in standby for 10 minutes and turn it back on. Note whether the menu comes back without touching the remote.
   - Day 2: switch the TV off at the wall for a minute with the Wi-Fi off, turn it on, and note whether the menu starts (needs the service worker).
   - Day 3: just leave it.
5. **Read the panel** at 72 hours and copy its five lines into the sheet.
6. **Verdict:** pass, workaround (what the owner has to do) or fail.

**Pass means:** the TV check says yes; the menu played for 72 hours with no manual help; the worst frame rate stayed at 20 or above while slides changed; changes arrived in under 10 seconds; it recovered from the Wi-Fi drop and the standby on its own; memory at peak stayed under twice the starting memory.

## Results

| # | Device and model year | Browser and version | TV check | 72-hour panel | Sold out took | Wi-Fi drop | Standby | Cold start offline | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | | | | | | | | | |
| 2 | | | | | | | | | |
| 3 | | | | | | | | | |
| 4 | | | | | | | | | |
| 5 | | | | | | | | | |
| 6 | | | | | | | | | |
| 7 | | | | | | | | | |
| 8 | | | | | | | | | |
| 9 | | | | | | | | | |
| 10 | | | | | | | | | |

**Recommended stick:** to be chosen from the passes, by price in India and how easy the browser is to set up for an owner.

**Player budget:** confirmed on 20 October 2026. The TV downloads 13.8 KB of JavaScript and 3.9 KB of CSS, gzipped (under the 100 KB budget, ADR-005).

## Open question for the owner

If the lab confirms that 2023 and older Samsung TVs fail, we choose between: (a) a build of the player CSS that uses viewport units instead of container units on browsers without container queries (a TV's stage is nearly always its whole 16:9 screen, so the two match), so older TVs work; or (b) telling owners with older TVs to plug in a stick. Tracker MT-88 holds this.
