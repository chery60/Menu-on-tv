# Owner walkthrough, November 2026

Design, 15 November 2026. No PRD applies: this walkthrough feeds the first ones. Screenshots are in [owner-walkthrough-2026-11/](owner-walkthrough-2026-11/).

## How we walked it

- `main` at 9fe4fe3, run from the Design worktree with `next dev` on port 4330, reading the main checkout's `data/` files. The built-in browser at 375 by 812 (phone) first, then 1440 by 900 (computer), with a second tab at 1920 by 1080 as the TV.
- As a new café owner: read the home page, How it works, Prices and the live demo; signed in with an `example.com` email (locally the code shows on the page); set up "Walkthrough Chai Corner" with an empty menu; pasted a WhatsApp-style menu with a Hindi dish name and half and full prices; changed two prices; marked two dishes sold out (one from Menu, one from Today); opened `/pair` in the TV tab and connected it with the code typed in lowercase; switched the screen from Split to Full board; opened a dish sheet, the screen settings and Restaurant.
- The browser pane was hidden for part of the run. That freezes CSS animations and slows timers in background tabs, so timings below say how they were taken, and no finding rests on an animation.

## What gets in the way, ranked

Fix sizes: **small** fits in a slice alongside other small fixes; **one slice** is its own pull request of an hour or two; **needs a PRD** means a decision or a flow comes first.

### 1. The site sells today's special and promos; the app has neither

- **Where:** site (home ribbon "Today's special", demo step 05 "Today's special changes", Prices: Free includes "Sold out and today's special" and "Your own promos", the rule "Your promos come first") against the owner app (Today, Menu, TVs).
- **What happened:** nothing in `/studio` lets an owner set today's special or write an offer like "Chai and samosa ₹59". The only lever is a dish label (Bestseller, New, Chef's pick), which gives that dish its own promo slide.
- **Why it matters:** specials going unseen is one of the four pains the product exists for (PRODUCT.md), and the owner meets the gap on day one, right after the site promised it. MT-25 (quick actions, including today's special) and MT-26 (promo studio) are planned and not built, so this isn't news to HQ; the finding is that the site already sells them.
- **Screenshot:** [tv-split-names-and-note-cut.jpg](owner-walkthrough-2026-11/tv-split-names-and-note-cut.jpg): the right panel is a dish the app picked, not the owner's special.
- **Fix:** needs a PRD for MT-25's today's special. The smallest useful version: from Today, pick a dish or type a line, and it ends tonight. Until it ships, a small copy change on the site (the Free plan line, the ribbon, demo step 05) keeps the promise honest. Founder call on which comes first.

### 2. Dish names are cut off on the TV while space sits empty

- **Where:** TV, the screen link, Split and Full board, Paper, 1920 by 1080.
- **What happened:** "Paneer tikka sandwich" shows as "Paneer tikka san…" beside its Half and Full prices on both layouts, and "Cold coffee with vanilla ice cream and chocolate sauce" as "Cold coffee with vanil…". On Full board the third column held one dish and the bottom half of the screen was empty. On Split the header note read "Prices in ₹, taxes includ", cut off by the side panel.
- **Why it matters:** the guest reads the name to decide; a cut name becomes a question at the counter, which is what the TV is meant to stop. `docs/screen-design.md` says a name trims only when it alone is wider than its column. "Paneer tikka sandwich" is 21 characters, under the 24 that switch to the narrow face (`LONG_NAME_CHARS` in `screen-stage.tsx`), and still trims because the stacked sizes take the width: that breaks the rule. The 54-character cold coffee trims within the rule, but real cafés have names like it. The clipped tax note undoes the October fix that moved it under the name: it appears with a 23-character restaurant name and no line under the name.
- **Screenshots:** [tv-full-board-names-cut.jpg](owner-walkthrough-2026-11/tv-full-board-names-cut.jpg), [tv-split-names-and-note-cut.jpg](owner-walkthrough-2026-11/tv-split-names-and-note-cut.jpg).
- **Fix:** one slice (Design, `screen.css` and `screen-stage.tsx`): use the narrow face when a row is tight, not only by length, and let a name wrap to two lines before it trims. Wrapping changes row heights, so Platform's page-height count has to agree; QA checks long names on Split, Full board and Portrait. The tax note is small and goes in the same slice. MT-20.

### 3. The site offers only a waitlist, but signing in opens the product

- **Where:** site, every page, and sign-in.
- **What happened:** "Get early access" in the bar, "Choose Free", "Choose Plus" and "Choose Pro" all lead to an email-only form: "Leave your details and we'll set up your first screen with you". "Owner sign in" says "New here? This makes your account" and lets anyone set up a restaurant and connect a TV in a few minutes, as this walkthrough did.
- **Why it matters:** an owner ready to try today is told to wait, or finds the way in by accident. If sign-ups are meant to stay closed until the pilot, sign-in shouldn't create accounts. The form also asks only for an email, while owners live on the phone and WhatsApp and sign-in already takes a mobile number.
- **Screenshots:** [phone-early-access.jpg](owner-walkthrough-2026-11/phone-early-access.jpg), [phone-sign-in-code.jpg](owner-walkthrough-2026-11/phone-sign-in-code.jpg).
- **Fix:** needs a founder decision (open to everyone, or invite-only for the pilot), then a PRD. Either way the early-access form should take a mobile number (small). MT-34, MT-13, MT-37.

### 4. "Saved" and save errors are hidden behind the phone's tab bar

- **Where:** owner app, Menu, phone.
- **What happened:** after typing a new price and pressing Done, nothing on screen confirmed it. The editor does say "Saved. Your TVs update within seconds." (and "Saving…", and any error), but its bar sits 16px from the bottom at z-index 20, and the phone's tab bar covers the bottom 65px at z-index 30. Measured while the message showed: the bar spans 760 to 796px of an 812px screen, all of it under the tab bar. The price had saved; the TV showed it.
- **Why it matters:** prices are what owners change most. With no feedback they type again or walk over to the TV. Worse, a save that fails on a slow connection is just as invisible, so the owner believes the TV changed when it didn't. The TVs page's "Saved. The TV changes at its next slide." shows fine, so the two pages disagree.
- **Screenshot:** none can show it, since the message is covered. [phone-menu-sold-out.jpg](owner-walkthrough-2026-11/phone-menu-sold-out.jpg) shows the tab bar where it should appear.
- **Fix:** small. Lift the save bar above the tab bar on phones (the bar's height plus the safe area), with a test that fails first, as for any bug. It's in `menu-editor.tsx` (`SaveBar`). MT-17.

### 5. The layout is picked blind from a dropdown

- **Where:** owner app, TVs, "Change how it looks, its timing or its name".
- **What happened:** layout is a select of six names (Full board, Split, Spotlight, L-bar, Ticker, Portrait) with one line of text for the chosen one. Nothing shows what L-bar or Ticker looks like; "Preview what it plays" is a separate link further up. Switching to Full board and saving worked: the TV changed at its next slide, as the page said.
- **Why it matters:** picking a layout is the "make it look good" moment of setting up a first screen. How it works on the site plays all six live; the app, where the owner actually chooses, shows none.
- **Screenshot:** [phone-tvs-layout-dropdown.jpg](owner-walkthrough-2026-11/phone-tvs-layout-dropdown.jpg).
- **Fix:** one slice (Design): six small live screens as radio cards, reusing the site's layout gallery and playing the owner's own menu. MT-20.

### 6. The TV features dishes the owner never chose, labelled with their category

- **Where:** TV, Split's right panel and Full board's full-screen slides.
- **What happened:** with no special or labels set, the TV cycles ordinary dishes (Adrak chai, Masala chai, Filter coffee) as featured slides, each in a filled chilli box reading "Chai & Coffee", with "Chai & Coffee" again under the name.
- **Why it matters:** it reads as a promo the owner didn't make, and the box that should say why ("Today's special", "Bestseller") says nothing new.
- **Screenshot:** [tv-auto-featured-dish.jpg](owner-walkthrough-2026-11/tv-auto-featured-dish.jpg).
- **Fix:** small: show the category once, as the plain line, and drop the filled box when a dish has no label. Whether plain dishes should be featured at all belongs in the MT-25 and MT-26 PRDs.

### 7. On a phone, the home page is about 25 screens long

- **Where:** site, home, 375px.
- **What happened:** the page is 19,963px tall. The pinned plan (3,573px) and demo (4,222px) come before "Three steps. About ten minutes." at 12,268px, and the free plan sits further down. The statement band spends 1,521px on one sentence. The plan drawing's labels ("Queue", "Printed board") are about 6px tall at this width.
- **Why it matters:** owners read between orders. Most will stop before the steps and the free plan, the two parts that answer "is this for me, and what does it cost".
- **Screenshot:** [phone-home-plan.jpg](owner-walkthrough-2026-11/phone-home-plan.jpg).
- **Fix:** needs a PRD, with the architect, since the home page's order is part of the search design: on phones, shorten the pinned scenes and bring the steps and the free plan up. The plan's label size is small. No tracker item yet.

### 8. "Try it" on a phone: the TV is out of sight while you type

- **Where:** site, home, "Try it with your own menu", 375px.
- **What happened:** the live TV sits 796px below the first field, after four dish rows, "Add a dish" and the note. With the keyboard up you never see it change.
- **Why it matters:** "The TV plays them as you type" is the section's whole pitch.
- **Screenshot:** [phone-try-it.jpg](owner-walkthrough-2026-11/phone-try-it.jpg).
- **Fix:** one slice (Design): on phones, put the TV above the fields, or keep a small one pinned while the form has focus.

### 9. The dish sheet's Save button is below the fold

- **Where:** owner app, Menu, dish sheet, phone.
- **What happened:** the sheet holds 1,061px of content in 747px; "Save dish" is at the very end and doesn't stick. The paste sheet's "Add 9 dishes" does stick.
- **Why it matters:** staff fixing a price or adding a photo in a rush have to scroll to find Save, or close the sheet and lose the change.
- **Screenshot:** [phone-dish-sheet.jpg](owner-walkthrough-2026-11/phone-dish-sheet.jpg).
- **Fix:** small: a sticky footer, as the paste sheet has. MT-17.

### 10. Two different sold-out controls, and one names the state, not the action

- **Where:** owner app, Menu and Today, phone.
- **What happened:** Menu has an "In stock" button on each dish that turns into a filled "Sold out" (a switch to screen readers, "Masala chai sold out today"). Today lists the menu as full-width rows with "In stock" at the right. Both work. On Today the rows are 42px tall, under our 44px, and "In stock" wraps onto two lines beside a long name.
- **Why it matters:** new staff learn two looks for one job, and a button reading "In stock" doesn't say "tap when it runs out" until you've tried it.
- **Screenshots:** [phone-menu-sold-out.jpg](owner-walkthrough-2026-11/phone-menu-sold-out.jpg), [phone-today.jpg](owner-walkthrough-2026-11/phone-today.jpg).
- **Fix:** small: one control in both places, at least 44px, with a label that never wraps. MT-25.

### 11. Smaller copy and polish (all small)

- Today with no TV connected says "No TV on air" above the headline "On your TVs now."
- Setup tells someone who signed in by email to "ask its owner to add your number".
- How it works shows a 4-character TV code ("K7Q4"); real TVs show six ("V7SVGC").
- The layouts' sample ticker still advertises "Diwali mithai boxes: pre-order by 30 October".
- Prices says "50% of what your screen earns from local ads is yours" in a large figure, and the hero TV plays a sample ad. PRODUCT.md's go/no-go says no promise of ad earnings before a 40-screen neighbourhood and a paid pilot. The page frames it as planned; founder call.
- "Not you? Sign out" on setup is 24px tall. On a phone, sign out is the only control in the top bar and acts in one tap.
- Price boxes show focus only by darkening a 1px border, which is weak for keyboard users (WCAG 2.4.11).
- Menu's "Sold out" button is white on deep chilli (#c8330a, about 5.3:1, so it passes AA), where the owner app's rule is ink on chilli. Consistency only.

## What already works well

- **Sign-in:** one field and a 6-digit code; the code box takes focus with a number keyboard and one-time-code autofill; a 30-second resend and "Use a different number or email". "New here? This makes your account" removes the sign-up question.
- **Setup:** three fields with "For example" hints and a plain choice of an empty or a sample menu; done in under a minute ([phone-setup.jpg](owner-walkthrough-2026-11/phone-setup.jpg)).
- **Paste:** a WhatsApp-style menu with a shouty title line, "&", "₹25", "Rs. 30/-", "(2 pcs)", half and full prices and a Devanagari name became 9 dishes in 3 categories, all right first time ([phone-paste-check.jpg](owner-walkthrough-2026-11/phone-paste-check.jpg)). Fitting emoji stand in until the owner adds photos.
- **Sold out:** one tap; the name is struck through with "Sold out today", the TV marks it within seconds (about 7 s here, in a throttled background tab; the October walkthrough measured about 2 s), and the page explains that it comes back tomorrow.
- **Connecting a TV:** numbered steps with the address as typed, a "will my TV work?" check, the code accepted in lowercase, and the TV listed as "Online, showing menu page 1" by itself ([phone-tv-connected.jpg](owner-walkthrough-2026-11/phone-tv-connected.jpg)). Today then drops the checklist and says "On air on 1 TV".
- **The TV:** veg marks, stacked half and full prices, Devanagari in Mukta and sold-out marks all read cleanly on Paper; the layout change arrived at the next slide, as the app said.
- **On a computer:** the Menu's TV preview stays beside the list while you scroll ([desktop-menu.jpg](owner-walkthrough-2026-11/desktop-menu.jpg)), and Today puts what's on air first ([desktop-today.jpg](owner-walkthrough-2026-11/desktop-today.jpg)).
- **Site:** no horizontal scroll at 375px, a clear nav sheet, a 3D demo café that loads and offers "Open the TV screen", and named controls throughout (veg toggles, sold-out switches, price boxes).

## Left out

- Photo import (no reading key locally; MT-19), Hindi names on the TV (the screen setting exists but wasn't tried), the Night theme, staff sign-in, Portrait and the other layouts on a TV, real TV hardware and slow networks.
- Pricing, How it works, TVs and Restaurant got only a quick look at computer width.

## Notes for HQ (not product findings)

- This walkthrough wrote test data into the main checkout's `data/` files: an owner with an `example.com` email, the restaurant "Walkthrough Chai Corner" with 9 dishes, the screen "Counter TV" and one paired TV. Delete them when convenient.
- The `menutelly-design` preview in `.claude/launch.json` assumes the Design worktree is `.claude/worktrees/design`. This session's was `.claude/worktrees/design-615fa7`, so the preview couldn't start; a local entry with absolute paths worked and isn't committed.
- `next dev` logs every TV heartbeat with the screen token in the path (`/api/s/<token>/beat`). CLAUDE.md says never log screen tokens; worth Platform checking what production logs keep.
