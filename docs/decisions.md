# Decisions

The founder decides; agents propose. Each decision is numbered and dated, and it quotes the founder's own words. If it isn't here, it hasn't been decided.

Decisions from before D1 (the name, the India-first wedge, prices, the Paper and Night themes, the Netlify stack) live in [PRODUCT.md](../PRODUCT.md), [DESIGN.md](../DESIGN.md), the ADRs in [architecture.md](architecture.md) and the tracker. They stand until a decision here changes them.

## D1: Teams, the way we work, and a product designer

2026-11-14

> "just like that we have the process in the  weenroll project for doing the development, similarly here in the project we need to have the same setup and also hire a top notch product designer agent using the ecc skill anbd basing on that lets setup this project."

What this means:
- MenuOnTV works the way WeEnroll does: the founder decides, HQ plans and merges, and each team works in its own session, worktree and branch. [CLAUDE.md](../CLAUDE.md) has the details.
- The teams are HQ, Product, Design, Platform and QA. The verifier is a role QA fills. The architect and the search analyst (hired for the site revamp on 2026-10-25) stay on call for public-site search work.
- Work goes PRD first (`docs/prd/`), in small slices, one pull request each, with checks written by QA from the PRD and not from the code. QA's full suite (`.claude/qa/run-suite.sh`) is the merge gate; there is no CI on GitHub.
- The tracker stays the roadmap. Every PRD names its MT-n item.
- Design is a senior product designer, equipped with ECC's design skills (`ecc:frontend-design-direction`, `ecc:make-interfaces-feel-better`, `ecc:accessibility`, and `ecc:design-system` and `ecc:product-lens` on demand). It covers the site, the owner app and the TV, and walks every change as a restaurant owner before it merges.

Calls HQ made, which the founder can overrule:
- As at WeEnroll, HQ approves PRDs and merges pull requests once QA passes, without waiting for the founder. The founder reviews at check-ins.
- "Founder" in these files means the person who runs MenuOnTV. "Owner" always means a restaurant owner, because the product already uses it that way (Owner sign in, the owner app).
- The existing `product-designer` role, which built public pages from the architect's design, grows into the Design team rather than adding a second designer.
