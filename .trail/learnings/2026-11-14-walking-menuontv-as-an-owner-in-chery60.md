---
title: Walking MenuOnTV as an owner in the built-in browser
author: Chery60
date: 2026-11-14
branch: claude/design-615fa7
cost: { minutes: 23, tokens: 396715 }
touches:
  - docs/research/owner-walkthrough-2026-11.md
  - docs/research/owner-walkthrough-2026-11/desktop-menu.jpg
  - docs/research/owner-walkthrough-2026-11/desktop-today.jpg
  - docs/research/owner-walkthrough-2026-11/phone-dish-sheet.jpg
  - docs/research/owner-walkthrough-2026-11/phone-early-access.jpg
  - docs/research/owner-walkthrough-2026-11/phone-home-plan.jpg
  - docs/research/owner-walkthrough-2026-11/phone-menu-sold-out.jpg
  - docs/research/owner-walkthrough-2026-11/phone-paste-check.jpg
  - docs/research/owner-walkthrough-2026-11/phone-setup.jpg
  - docs/research/owner-walkthrough-2026-11/phone-sign-in-code.jpg
---

## Decided
- Owner walkthroughs run from a team worktree on port 4330 against the main checkout's data/ files, at 375x812 first, then 1440x900, with a second tab at 1920x1080 on /pair as the TV. Sign in with an example.com email; locally the code shows on the page.
- Findings live in docs/research/owner-walkthrough-<yyyy-mm>.md with screenshots in a sibling folder, ranked, each with surface, page, what happened, why it matters, screenshot and fix size.

## Tried and ruled out
- The menutelly-design entry in .claude/launch.json: it cds into .claude/worktrees/design, so it fails in any other worktree name (e.g. design-615fa7). A local entry with absolute data paths works.
- Judging "nothing confirmed the save" from screenshots alone: the menu editor's SaveBar exists but sits under the phone tab bar (z-20 under z-30). Grep for a status line and test elementFromPoint before calling something silent.

## Watch out
- When the browser pane is hidden, CSS animations freeze (currentTime stays 0) and background-tab timers slow. A blank hero or a slow sold-out is then an artifact; check getAnimations() and say how a timing was taken.
- Screenshots in the pane can lag one action behind; take a second one or read state with JS.
- Never copy the TV's /s/<token> URL into docs, images or PRs; next dev logs it in request paths.
