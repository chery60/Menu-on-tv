# Owner interviews (MT-11)

Written 20 October 2026. Prices, the free screen and the ad share are guesses until owners react to them. Fifteen conversations in one city, before we set final prices. Each question below answers one of the PRD's open questions (`.claude/prds/menutelly.prd.md`), marked **[Q1]** to **[Q7]**.

## Who

Fifteen owners or managers of counter-ordering outlets in the pilot neighbourhood (MT-13): four cafés, four quick-service places, four bakeries and three sweet shops. Talk to the person who decides what goes on the menu board, not the cashier.

## How

- In person, 15 minutes, at a quiet hour (3 to 5 pm suits most). Bring the field kit (`docs/field-kit.md`).
- Ask before you start: "Can I ask you some questions for 15 minutes? I won't record you or write your name." Don't record audio.
- **Privacy:** never write the owner's name, phone number or the outlet's name in the log or in this repository. Give each outlet a code (O-01 to O-15) and keep the code-to-outlet list on paper, not here. No photos of people.
- If they agree, run `/tv-check` on their TV. It changes nothing on the TV and takes a few seconds.
- Ask, listen, and write their words. Don't sell during the questions; show the demo after question 6.

## The questions

1. **Today.** What is on your menu board now: printed flex, a chalkboard, a TV, nothing? When did you last change it, and what did it cost? *(pain, reprint cost)*
2. **Changes.** How often do prices or dishes change? What do you do when something runs out? *(pain)*
3. **The TV.** Is there a TV in the shop? What brand and roughly what year? What plays on it now? *(Run `/tv-check` and write its verdict.)* **[Q2]**
4. **Billing.** What do you bill on: a POS like Petpooja or POSist, a billing app, a cash book? **[Q6]**
5. **Brands.** Has a brand (an ice-cream, drinks or dairy company) ever given you a board, a fridge or a sign? What did they ask in return? **[Q5]**
6. **The name.** "MenuOnTV": what do you think it does, from the name alone? **[Q7]**
7. *(Show the demo: the menu on the stick's TV, mark a dish sold out on the phone, watch the TV change.)* What would you use first? What's missing?
8. **The menu from a photo.** May we photograph your printed or handwritten menu to test how well we read it? Only the menu, no people. *(If yes, save it to `evals/menu-photos/` with the outlet code, never the outlet's name.)* **[Q3]**
9. **Price.** One screen is free, with a small "Powered by MenuOnTV" in the corner. More screens and no badge cost ₹499 a screen a month. What's your first reaction? What would you pay? **[Q1]**
10. **Ads that pay you.** If a local gym or coaching centre paid to show one ad in three slides, with your approval and you keeping half, would you allow it? What would you never allow? **[Q4, owner side]**
11. **Close.** Can I come back with your own menu on the TV? *(Leave a card from `/kit`.)*

**[Q4], advertiser side:** what a gym, salon or coaching centre would pay per screen per day is asked of advertisers, not owners. Five short conversations with local advertisers in the same neighbourhood; log them below the owner table.

## Log

One row per outlet. Words in quotes are the owner's own.

| Code | Type | Board today | Last change and cost | TV (make, year, `/tv-check`) | Billing | Brand boards | Name read as | First use | Price reaction | Would pay | Ads (yes, no, conditions) | Menu photo | Come back? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| O-01 | | | | | | | | | | | | | |
| O-02 | | | | | | | | | | | | | |
| O-03 | | | | | | | | | | | | | |
| O-04 | | | | | | | | | | | | | |
| O-05 | | | | | | | | | | | | | |
| O-06 | | | | | | | | | | | | | |
| O-07 | | | | | | | | | | | | | |
| O-08 | | | | | | | | | | | | | |
| O-09 | | | | | | | | | | | | | |
| O-10 | | | | | | | | | | | | | |
| O-11 | | | | | | | | | | | | | |
| O-12 | | | | | | | | | | | | | |
| O-13 | | | | | | | | | | | | | |
| O-14 | | | | | | | | | | | | | |
| O-15 | | | | | | | | | | | | | |

**Advertisers ([Q4]):**

| Code | Type | Spends on local ads today | Per screen per day they'd pay | Screens that make an area worth it |
| --- | --- | --- | --- | --- |
| A-01 | | | | |

## Summary, after the fifteenth

- **Price reaction** ([Q1]): how many said yes, maybe or no to ₹499; the range they'd pay; whether the free screen with a badge is enough to start.
- **Top three pains**, ranked by how many owners raised them unprompted.
- **TVs** ([Q2]): how many had a TV, how many passed `/tv-check`, how many need a stick.
- **PRD open questions:** mark each answered (with the evidence) or re-opened in `.claude/prds/menutelly.prd.md`.
