---
title: "QA baseline: load-flaky screens pairing test and gate env"
author: Chery60
date: 2026-11-14
branch: claude/qa-065b0b
cost: { minutes: 8, tokens: 157367 }
touches:
  - src/features/screens/repository.test.ts
---

## Decided
- Gate baseline at main 9fe4fe3: PASS, 433 passed, 1 skipped (photo golden set, needs MENU_PHOTO_EVAL=1), 137 built-site checks. Whole unit suite runs in under 4 s solo.
- Probe for load flakes by running vitest several times in parallel with --reporter=json and comparing per-test durations. 2-way is realistic for this Mac; 6-way is a stress test.

## Tried and ruled out
- Raising the timeout on src/features/screens/repository.test.ts "refuses new requests past 200 waiting": the cause is 200 serial startPairing calls, each re-reading, parsing and rewriting a growing screens file (quadratic). Seed the file directly instead.

## Watch out
- That test's `repo` is a module-level let reassigned in beforeEach. A timed-out loop keeps running against the next test's repo and races its rm (ENOTEMPTY in later tests, stray menutelly-screens-* folders in $TMPDIR).
- run-suite.sh passes the caller's env to every step. MENU_PHOTO_EVAL=1 with a real ANTHROPIC_API_KEY makes the unit step call the live model; *_DATA_FILE and PHOTOS_DIR reach the build and next start.
- vitest only runs src/**/*.test.ts (no .tsx). Coverage thresholds are global over src/lib and src/features, so single files at 0% still pass.
