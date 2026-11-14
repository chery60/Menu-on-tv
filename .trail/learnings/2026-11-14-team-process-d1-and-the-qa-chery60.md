---
title: Team process (D1) and the QA gate
author: Chery60
date: 2026-11-14
branch: chore/team-process
cost: { minutes: 15, tokens: 264808 }
touches:
  - CLAUDE.md
  - package.json
  - ".serena/.gitignore"
  - ".serena/project.yml"
  - docs/decisions.md
  - docs/prd/README.md
---

## Decided
- MenuOnTV runs as WeEnroll does (D1, docs/decisions.md): founder decides, HQ plans and merges, teams HQ / Product / Design / Platform / QA each in their own session and `.claude/worktrees/<team>` worktree. PRDs in docs/prd/ name their MT-n tracker item; the tracker stays the roadmap.
- "Founder" = the person running MenuOnTV; "owner" always means a restaurant owner.
- The product-designer agent preloads ecc:frontend-design-direction, ecc:make-interfaces-feel-better and ecc:accessibility via `skills:` frontmatter. Plugin-scoped `ecc:` names do resolve there.
- `npm run typecheck` is now `next typegen && tsc --noEmit`.

## Tried and ruled out
- Copying WeEnroll's run-suite.sh as is: hard-coded repo path, unquoted vars (this repo's path has a space), Playwright and host tests this repo doesn't have.
- `claude agents` to list agent definitions: it lists running sessions, not agents.

## Watch out
- A fresh checkout or worktree fails `tsc --noEmit` on `RouteContext`/`PageProps` until `next typegen` (or dev/build) runs. The gate runs typegen as its own step so older commits still gate.
- `skills:` preloads only when the agent runs as a subagent. Started as a main session (`--agent` or a team session), the skills aren't injected; the role file tells it to load them with the Skill tool.
- `.claude/qa/run-suite.sh <name> <sha>` takes about 45 s at d1d6f27 (433 unit tests, build, 137 built-site checks on port 4360). Use a new name per run; a FAIL keeps its worktree in $TMPDIR/menuontv-qa/.
