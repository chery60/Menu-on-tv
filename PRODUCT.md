# MenuOnTV: product brief

> "Your menu, on your TV." Change the name in `src/config/site.ts`; every page, metadata file and agent file reads from there.

MenuOnTV turns the TV a restaurant already owns into a menu board that sells. The owner photographs the paper menu, picks a layout, opens one link on the TV, and runs it from a phone: prices, sold-out items, today's special and promos. The screen mixes the menu with the restaurant's own promos, and later with local ads the owner approves and earns from.

## 1. Who is this for?

- **Primary:** owners of independent counter-ordering outlets in Indian cities: cafés, quick-service counters, bakeries, sweet shops, juice and ice-cream counters, food-court stalls. They run the business from a phone and WhatsApp and have no designer.
- **Secondary:** small chains of 5 to 50 outlets, staff who mark items sold out, installers and POS partners, and (later) local businesses that want to advertise nearby.
- **Guests:** people standing a few metres from the TV, deciding in a few glances.

## 2. What is the pain?

- **Reprinting.** Every price change means a new flex or stickers over old prices.
- **No designer.** Signage tools give a blank canvas. A menu that reads from across the room needs design skill most owners don't have.
- **Specials go unseen.** Combos and new items live on a paper stand or a WhatsApp status.
- **The TV is wasted.** It plays music videos or nothing. Ad-funded TV is free but fills it with someone else's channel and keeps the ad money.
- **Rules.** Chains must show calories; everyone shows veg marks; many guests read Hindi or a regional language first.

Evidence and sources: [docs/research.md](docs/research.md).

## 3. Why now?

- Vision AI can read a photo of a menu into structured items and prices well enough for an owner to approve in a minute.
- Every restaurant already has a TV, and new TV platforms favour web apps (Amazon's Vega OS), so a link can be the player.
- Owners already change prices from a phone (POS apps, WhatsApp); they expect the same from their screens.
- Indian advertisers already buy restaurant screens through networks. A platform where owners control and share in the ads is missing.

## 4. What is the 10-star version?

An owner in a busy café photographs her menu. Ten minutes later the TV shows it in clean columns with veg marks and prices that read from the door, rotating a cold-coffee promo on hot afternoons. At 3 pm she messages "samosa sold out" on WhatsApp and the screen updates before the next guest looks up. On Sunday she gets a note: "Your cold-coffee promo ran 1,400 times and cold coffee sold 18% more than last week." The gym next door books her screen for a week; she approves the ad and the money covers her plan. No designer, no installer, no reprint.

## 5. What is the MVP?

**"First screen live in ten minutes":** menu from a photo or paste, six layouts and three themes, a link-based player that keeps playing offline, quick actions from the phone, a promo studio with an AI writer, Hindi, FSSAI mode, one free screen with a badge and a Plus plan. The full scope and build order are in the [platform plan](docs/platform-plan.md); the rules for what guests see are in the [screen design playbook](docs/screen-design.md).

## 6. Anti-goals (what we will not build)

- No cameras, face detection or tracking of guests. We count plays, not people.
- No ads the owner hasn't approved, and no ads over prices while guests order.
- No general-purpose signage canvas. We make menus and promos.
- No POS of our own. We integrate with the owner's.
- No selling restaurant or guest data, and no training AI models on it.
- No fake urgency: countdowns and "only n left" appear only when true.

## 7. How do we know it's working?

| Metric | Target (first 12 months) |
| --- | --- |
| Time from sign-up to first screen live | under 10 minutes (median) |
| Screens still live after 30 days | 80% or more |
| Free outlets that pay within 90 days | 20% or more |
| Owners using a quick action every week | 60% or more |
| Player uptime during opening hours | 99% |

## Brand and voice

- **Name:** MenuOnTV, chosen by the owner on 2026-10-19 (the working name was MenuTelly; "telly" is not how Indian owners talk about a TV). The name is the promise: your menu, on your TV. One word for search engines and AI assistants: "MenuOnTV digital menu boards for restaurants". menuontv.in and menuontv.app were free that day (tracker MT-4).
- **Voice:** a helpful friend who runs a café. Plain words, short sentences, rupees, no jargon. Hinglish where the owner uses it.
- **Personality:** warm, quick and a bit cheeky, like a good counter. Visuals: ink on paper with one chilli colour, like an architect's drawing of a café, where the only light is the TV; the TV's house theme, Paper, wears the same brand (see DESIGN.md).
- **Never:** fake urgency, invented sales numbers, or claims we haven't measured.

## Go / no-go

**Go**, with three conditions. First, 15 owner interviews before fixing prices. Second, the TV compatibility lab passes on 8 of 10 common devices before promising "just a link". Third, no promise of ad earnings until a neighbourhood has 40 screens and a paid ad pilot.
