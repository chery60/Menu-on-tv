# "Try it" on phones: the TV stays in view

Status: approved
Tracker: MT-98
Surface: site

## What it is
On the home page, "Try it with your own menu" promises the TV plays your dishes as you type. On a phone the TV sits 796 px below the first field, so with the keyboard up an owner never sees it change ([owner walkthrough, finding 8](../research/owner-walkthrough-2026-11.md)). This keeps the TV in view while you type.

## Who uses it
- **Owners** on the site, on a phone, deciding whether MenuOnTV is for them. Most visit on a phone between orders.

## What it does
- **On a phone,** while the focus is in the café name or any dish field, the whole TV screen is in view above the keyboard and changes as the owner types.
- **On a computer,** nothing changes: the TV stays beside the form.
- The section's copy, fields, the sample dishes and the button to early access stay as they are.
- Design picks how: the TV above the fields on phones, or a small TV pinned in view while a field has focus. Either has to pass the checks below.

## Design
**Job:** an owner on a phone watches their own dishes appear on the TV as they type. **Direction:** pinned, not moved: on phones the TV goes above the fields and stays in view for as long as the form is on screen.

- **Under 768px** (`.mtv-try`): the TV moves above the fields and becomes `position: sticky`, just under the site bar, for the length of the section. Typing in any field, with the keyboard up, keeps the whole 16:9 TV in view, about 193px tall at 375px, and leaves room for the field below it. Past the section it scrolls away as usual.
- The pinned TV gets a hairline rule and paper ground under it, so the fields scroll beneath it cleanly.
- With reduced motion, it pins with no transition.
- **From 768px:** no change. The TV stays beside the form.
- Checked at 375 by 667 (a small phone with the keyboard up leaves about 360px), and at 390 and 430 widths.

## Data it touches
None. Everything stays in the component's state, as now. Nothing is sent or stored until the owner goes to the early-access form.

## Rules and edge cases
- The home page's order and the section's place in it don't change; they're part of the search design (`docs/site-search-pages.md`).
- No layout shift while typing: the TV and fields don't jump when the keyboard opens or closes.
- Reduced motion: no animation to pin or unpin the TV when the visitor has asked for less motion.
- The TV is the same `ScreenStage` the section uses now, with no new weight on the page.

## Not in this version
- Shortening the home page on phones (walkthrough finding 7, held for the architect).
- Saving what the owner typed into a real menu.

## Slices
1. **Design: the TV in view on phones.** Owns `src/components/home/try-it.tsx` and the `.mtv-try` rules in `src/app/(marketing)/home.css`. No Platform work.

## How we'll know it works
On a phone at 375 by 667 px (and the browser's tools set to show a keyboard-sized window of about 375 by 360 px when a field has focus):
1. Tap the café name field and type "Chai Point": the whole TV screen stays in view, and its name changes on the TV within a second.
2. Do the same in the third dish's name and price fields: the TV stays in view and shows the change.
3. Add a dish and type in it: the same.
4. Nothing on the page jumps when a field gains or loses focus.
5. At 1280 px wide, the section looks as it does now.
6. With reduced motion on, nothing animates when the TV moves into view.
7. Lighthouse on the home page at phone width shows no new layout shift from this section (CLS stays under 0.1).
8. Design walks it as an owner on a 375 px phone, typing a café and three dishes, and fixes what gets in the way.
