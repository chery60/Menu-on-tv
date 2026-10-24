/**
 * Every word on the public site. The home page, JSON-LD, /llms.txt and /index.md all read from here,
 * so humans, search engines and AI assistants get the same story. Tell each idea once.
 */

export interface TextItem {
  readonly title: string;
  readonly body: string;
}

export interface FaqEntry {
  readonly question: string;
  readonly answer: string;
  /** A page that answers the question in full. */
  readonly link?: { readonly label: string; readonly href: string };
}

export interface LinkItem extends TextItem {
  readonly href: string;
}

/** A page's search title (without the site suffix) and description. */
export interface PageMeta {
  readonly title: string;
  readonly description: string;
}

export interface CellSection {
  readonly id: string;
  readonly title: string;
  readonly lead?: string;
  readonly items: readonly TextItem[];
  readonly numbered?: boolean;
}

export interface ComparisonTable {
  readonly title: string;
  readonly columns: readonly string[];
  readonly rows: readonly (readonly string[])[];
  readonly note: string;
}

export interface FaqSection {
  readonly title: string;
  readonly items: readonly FaqEntry[];
}

export interface GuidePage {
  readonly path: string;
  readonly meta: PageMeta;
  readonly title: string;
  readonly lead: string;
  readonly sections: readonly CellSection[];
  readonly table?: ComparisonTable;
  readonly faq?: FaqSection;
  readonly next: readonly LinkItem[];
}

export const hero = {
  title: 'A digital menu board on your TV.',
  lead: 'MenuOnTV turns the TV you already own into a digital menu board that sells. Snap a photo of your menu, open one link on the TV, and change prices, sold-out items and today’s special from your phone.',
  primary: { label: 'Get early access', href: '#early-access' },
  secondary: { label: 'Watch it work', href: '#demo' },
  note: 'Free for one screen. No installer, no designer.',
  drawingLabel: 'A drawing of a café counter. The TV on the wall above it plays the café’s menu.',
  readFrom: 'Read from 3 m',
  /** The drawing's title block, as on an architect's sheet. */
  sheet: ['Counter, front view', 'Not to scale'],
  /** What MenuOnTV does to a menu, shown while the drawing traces itself. */
  log: ['Reading the menu', 'Pricing in rupees', 'Adding veg marks', 'Sizing it for the queue', 'On air'],
  screenLabel: 'The café’s TV, showing its menu',
} as const;

/** The sentence after the hero, lit word by word as you scroll, and the facts that run under it. */
export const statement = {
  text: 'The board over your counter is the one salesperson who never takes a break. Most of them say the same thing all day, even after the samosas run out.',
  ribbon: ['Prices from your phone', 'Sold out in one tap', 'Today’s special', 'Hindi next to English', 'Plays when the internet drops', 'Free for one screen'],
} as const;

export const problems = {
  title: 'A printed board is out of date by lunch.',
  lead: 'Most counters run on a flex print, a chalkboard or a laminated sheet. They let you down in the same four ways.',
  items: [
    { title: 'Prices change. The print doesn’t.', body: 'Every new price means a reprint, a sticker or a pen mark that guests notice.' },
    { title: 'Sold out is said out loud.', body: 'Guests order what’s finished, and the counter spends the rush saying sorry.' },
    { title: 'Too small from the queue.', body: 'Guests can’t read it from where they stand, so they ask, and the line slows down.' },
    { title: 'Nothing pushes the next order.', body: 'Combos and specials sit on a flyer by the till, where nobody looks.' },
  ] satisfies readonly TextItem[],
} as const;

export interface PlanFlag {
  readonly id: 'far' | 'stale' | 'flyer';
  readonly problem: string;
  readonly fix: string;
}

/** The pinned floor plan: a café drawn to scale, seen the way a guest sees it. */
export const planStory = {
  title: 'Look at your shop the way a guest does.',
  label: 'A floor plan of a café that builds as you scroll',
  beats: [
    { title: 'A guest walks in.', body: 'They join the queue and look up at the board. You have until they reach the counter to sell them something.' },
    { title: 'The board lets them down.', body: 'From the queue it’s too small to read, the samosas ran out an hour ago, and the lunch combo is on a flyer by the till.' },
    { title: 'Put the menu where they look.', body: 'A TV over the counter, sized for the queue, playing your menu and your offers in turn.' },
    { title: 'Keep it right from your phone.', body: 'Sold out, prices and today’s special change in one tap, on every TV in the shop.' },
  ] satisfies readonly TextItem[],
  flags: [
    { id: 'far', problem: 'Too small to read from here', fix: 'Prices sized for 3 m' },
    { id: 'stale', problem: 'Samosas ran out. Still listed', fix: 'Sold out in one tap' },
    { id: 'flyer', problem: 'Lunch combo on a flyer', fix: 'The combo plays between menu slides' },
  ] satisfies readonly PlanFlag[],
  rooms: { door: 'Door', queue: 'Queue', counter: 'Counter', kitchen: 'Kitchen', seating: 'Seating', board: 'Printed board', tv: 'Your TV' },
  scrollHint: 'Scroll to continue',
} as const;

export interface DemoStep {
  readonly title: string;
  /** What the device says it is doing. */
  readonly status: string;
  /** What the owner sent from their phone, if anything. */
  readonly message?: string;
  readonly log: readonly string[];
}

/** The pinned demo: one afternoon at the sample café, played on the real screen. */
export const demoStory = {
  title: 'Change it from your phone. The TV keeps up.',
  lead: 'One afternoon at Masala Mornings, played on the real MenuOnTV screen.',
  phone: 'From the owner’s phone',
  steps: [
    { title: 'You snap the menu', status: 'reading your menu', message: 'Photo of the menu board', log: ['Photo received', 'Read 7 dishes and their prices', 'Veg marks added'] },
    { title: 'MenuOnTV builds the board', status: 'building the board', log: ['Layout: split, menu and today’s special', 'Prices sized for 3 m', 'On air on 2 TVs'] },
    { title: 'Samosas run out', status: 'updating', message: 'Samosa, 2 pieces: sold out', log: ['Marked sold out', 'Sent to 2 TVs'] },
    { title: 'Chai goes up by ₹5', status: 'updating', message: 'Masala chai: ₹30 to ₹35', log: ['New price saved', 'Sent to 2 TVs'] },
    { title: 'Today’s special changes', status: 'on air', message: 'Today’s special: mango lassi', log: ['Special changed', 'Keeps playing if the internet drops'] },
  ] satisfies readonly DemoStep[],
  boardTitle: 'Today’s menu',
  specialLabel: 'Today’s special',
  specialLines: {
    tikki: 'With sweet curd and green chutney',
    'mango-lassi': 'Thick, cold and made to order',
    'lava-cake': 'Warm and gooey, baked fresh at 11 am',
  },
  screenLabel: 'The café’s TV, playing the step you have scrolled to',
} as const;

export const why = {
  title: 'Why restaurants switch.',
  items: [
    { title: 'It makes your menu for you', body: 'Take a photo of your paper menu. In about ten minutes you have a board that reads from across the room, with your prices, veg marks and dishes.' },
    { title: 'It sells while you work', body: 'Combos, specials and add-ons rotate in front of every guest. Sold out and today’s special are one tap on your phone, and the TV changes in seconds.' },
    { title: 'It works on the TV you have', body: 'Open one link in the TV’s browser. If your TV can’t, a small stick in the HDMI port does it. No wiring, no installer.' },
    { title: 'It costs nothing to start', body: 'One screen is free forever. Pay only when you want more screens or want the small MenuOnTV badge gone.' },
    { title: 'It can pay for itself', body: 'Later, nearby businesses can book a slot on your screen. You approve every ad and keep half of what it earns.' },
    { title: 'It keeps you on the right side of the rules', body: 'Veg and non-veg marks on every item. Calories and allergens the way FSSAI asks, from the same menu, on every screen.' },
  ] satisfies readonly TextItem[],
} as const;


export const howItWorks = {
  title: 'Three steps. About ten minutes.',
  steps: [
    { title: 'Snap your menu', body: 'Photograph the paper menu or the board on your wall, or paste it from WhatsApp. Check the prices the AI read, then approve.' },
    { title: 'Pick a layout', body: 'Full board, split with promos, spotlight and more. Every layout keeps prices big enough to read from the counter.' },
    { title: 'Open the link on your TV', body: 'Type the short link or scan the code on the TV. Your menu appears, and keeps playing even if the internet drops.' },
  ] satisfies readonly TextItem[],
} as const;

export const layoutsSection = {
  title: 'Six layouts. Pick one, change it any time.',
  lead: 'Every layout splits the screen between your menu and your promos in a different way. Each one is live below, playing the same sample café.',
  bestFor: {
    board: 'Counters where the menu is the main job',
    split: 'Most cafés: menu always visible, offers always moving',
    spotlight: 'Launching a new dish or pushing a combo',
    lbar: 'Busy counters with many offers and order numbers',
    ticker: 'A calm menu with offers in the corner of the eye',
    portrait: 'TVs mounted on their side, by the door or the queue',
  },
} as const;

export const screenRules = {
  title: 'Built to be read in three seconds from three metres.',
  items: [
    { title: 'Big prices, always', body: 'Text is sized from the height of the screen, so prices stay readable from the counter on any TV.' },
    { title: 'One moving thing at a time', body: 'Only the slide that changes moves. Everything else stays still, so guests aren’t dazzled.' },
    { title: 'Your promos come first', body: 'Your offers take the first slots. Local ads, when you switch them on, take at most one slot in three and never cover prices.' },
    { title: 'Never a blank TV', body: 'If the internet drops, the screen keeps playing your last menu and catches up when it’s back.' },
  ] satisfies readonly TextItem[],
} as const;

export const earn = {
  title: 'Later, your screen can pay for itself.',
  body: 'When enough cafés near you use MenuOnTV, local businesses (gyms, coaching classes, salons, clinics) can book a slot on your screen. Planned for neighbourhoods with enough screens; we’ll switch it on street by street.',
  points: [
    'You approve every ad before it plays.',
    'You keep half of what your screen earns.',
    'Ads take at most one slot in three, never over your prices.',
    'Block whole categories, like competitors or alcohol.',
  ],
} as const;

export interface Plan {
  readonly name: string;
  readonly price: string;
  readonly cadence: string;
  readonly summary: string;
  readonly features: readonly string[];
  readonly highlight?: boolean;
  /** Rupees per screen a month, for the calculator. */
  readonly perScreen: number;
  /** The most screens the plan covers, when it is limited. */
  readonly maxScreens?: number;
}

export const pricing = {
  title: 'Free for one screen.',
  lead: 'Early-access prices, in rupees, per screen. We’ll confirm them with our first restaurants before launch.',
  plans: [
    { name: 'Free', price: '₹0', cadence: 'one screen, forever', summary: 'Everything you need for one TV.', features: ['All six layouts, light or dark', 'Menu from a photo', 'Sold out and today’s special', 'Your own promos', 'Small “Powered by MenuOnTV” badge'], perScreen: 0, maxScreens: 1 },
    { name: 'Plus', price: '₹499', cadence: 'per screen a month', summary: 'For more screens and more selling.', features: ['Everything in Free, without the badge', 'Breakfast, lunch and dinner menus', 'Scheduled promos and countdowns', 'Hindi next to English', 'Many outlets'], highlight: true, perScreen: 499 },
    { name: 'Pro', price: '₹999', cadence: 'per screen a month', summary: 'For owners who want proof.', features: ['Everything in Plus', 'Prices and sold-out from your POS', 'Which promos sold more, item by item', 'Brand kit and approvals'], perScreen: 999 },
  ] satisfies readonly Plan[],
  footnote: 'Prices include the software only. A TV stick, if your TV needs one, costs about ₹3,000. Taxes extra.',
} as const;

/** The pricing page's calculator: how many screens, and what each plan comes to. */
export const screensCalculator = {
  title: 'Work out your monthly bill.',
  label: 'Screens in your shop',
  perMonth: 'a month',
  coversOne: 'Covers one screen. Pick Plus or Pro for more.',
  note: 'Early-access prices, before tax.',
} as const;

export const comparison = {
  title: 'How MenuOnTV compares.',
  columns: ['MenuOnTV', 'General signage apps', 'Free ad-funded TV'],
  rows: [
    ['Makes the menu from a photo', 'Yes', 'No: templates', 'No'],
    ['Readable from the counter, enforced', 'Yes', 'Up to you', 'Not a menu product'],
    ['Price', 'Free for 1 screen, then ₹499', 'About $5 to $45 per screen', 'Free'],
    ['Whose ads play', 'Yours first; local ads you approve', 'Yours', 'Theirs'],
    ['Who keeps ad money', 'You keep half', 'You, at 100+ screens', 'The network'],
    ['Veg marks, Hindi, FSSAI calories', 'Built in', 'Rarely', 'No'],
  ],
  note: 'Competitor prices as published on their sites in October 2026.',
} as const satisfies ComparisonTable;

export const faq = {
  title: 'Questions owners ask.',
  items: [
    { question: 'What is a digital menu board?', answer: 'A menu shown on a screen instead of printed. MenuOnTV plays yours on a TV with prices big enough to read from the queue, and you change it from your phone instead of reprinting.' },
    { question: 'How much does a digital menu board cost in India?', answer: 'MenuOnTV is free for one screen. Plus is ₹499 and Pro is ₹999 per screen a month, before tax. If your TV can’t open a link, a TV stick costs about ₹3,000.', link: { label: 'See what one café pays', href: '/pricing' } },
    { question: 'Can I show my menu on a smart TV without an app?', answer: 'Yes. Open one link in the TV’s browser and your menu plays full screen, with nothing to install. If your TV can’t, or if it’s an older TV, any HDMI port and a small Android TV stick will run it.', link: { label: 'Read the setup guide', href: '/how-to-show-menu-on-tv' } },
    { question: 'What if our internet goes down?', answer: 'The screen keeps playing your last menu and updates as soon as the connection is back. Guests never see a blank TV.' },
    { question: 'How do I change prices or mark something sold out?', answer: 'From your phone, one tap each. Every screen in your shop updates within seconds.' },
    { question: 'Do I need a designer?', answer: 'No. Take a photo of your menu; MenuOnTV lays it out. You can change the layout and theme any time.' },
    { question: 'My TV plays cricket. Can I still use it?', answer: 'Yes. Schedule the menu for when there’s no match, or put it on a second TV. Live sport stays yours.' },
    { question: 'Can the menu show Hindi?', answer: 'Yes. Item names can show in English and Hindi, side by side. More Indian languages are planned.' },
    { question: 'Do you watch my customers?', answer: 'No. There are no cameras and no tracking of guests. We count how often a slide played, not who saw it.' },
    { question: 'When can I put ads on my screen?', answer: 'Your own promos work from day one. Paid local ads come later, area by area, once enough restaurants nearby use MenuOnTV.' },
  ] satisfies readonly FaqEntry[],
} as const;


export const earlyAccess = {
  title: 'Put your menu on your TV.',
  body: 'We’re starting with cafés, quick-service counters and bakeries in one neighbourhood at a time. Leave your details and we’ll set up your first screen with you, free.',
  roles: ['Restaurant or café owner', 'Manager at a chain', 'Signage installer or POS partner', 'Local business that wants to advertise', 'Something else'] as const,
  submit: 'Get early access',
  success: 'You’re on the list. We’ll message you before your first screen goes live.',
  privacy: 'We use your details only to contact you about MenuOnTV.',
} as const;

/** The page for a link that leads nowhere: a TV with no signal. */
export const notFoundPage = {
  title: 'Nothing on this channel.',
  body: 'This page doesn’t exist, or it has moved. The menu is still on at the home page.',
  home: 'Go to the home page',
} as const;

export const footer = {
  line: 'MenuOnTV is a menu-screen product being built in India.',
} as const;

/** The lines that run from what the owner gives us into one TV link, beside the three steps. */
export const flow = {
  inputs: ['Menu photo', 'Your promos', 'Today’s special'],
  output: 'One TV link',
  more: { label: 'See how it works', href: '/how-it-works' },
} as const;

export const madeFor = {
  title: 'Made for counters that move fast.',
  items: [
    { title: 'Cafés and chai shops', body: 'A short menu, a big rush, and specials that change with the weather.' },
    { title: 'Quick-service counters', body: 'Combos and add-ons on the screen guests face while they queue.' },
    { title: 'Bakeries and sweet shops', body: 'What’s fresh from the oven, what’s finished, and festival boxes in season.' },
    { title: 'Food courts and pickup windows', body: 'A board that reads from across the hall, in English and Hindi.' },
    { title: 'Outlets of one brand', body: 'Change a price once and the TVs in every outlet follow.' },
  ] satisfies readonly TextItem[],
  drawingLabel: 'A drawing of a TV on a café wall, playing a menu.',
  more: { label: 'See menu boards for cafés and counters', href: '/digital-menu-board-for-cafes' },
} as const;

/** One shared heading for every “next pages” block. */
export const readNextTitle = 'Read next.';

/** The band after the screen rules: the free plan, and the way to the prices page. */
export const freeBand = {
  title: 'Free for one screen, for good.',
  body: 'Plus is ₹499 and Pro is ₹999 per screen a month, when you want more screens, more selling or proof of what sold.',
  link: { label: 'See prices', href: '/pricing' },
} as const;

export const tryBuilder = { label: 'Try it with your menu', href: '/#your-menu' } as const;

export const builder = {
  title: 'Try it with your own menu.',
  lead: 'Type your café’s name and a few dishes. The TV plays them as you type, with the real MenuOnTV player.',
  cafeLabel: 'Café name',
  cafePlaceholder: 'Masala Mornings',
  dishLabel: 'Dish',
  priceLabel: 'Price in rupees',
  veg: 'Veg',
  nonveg: 'Non-veg',
  addDish: 'Add a dish',
  removeDish: 'Remove',
  privacy: 'This stays in your browser. Nothing is sent until you ask for early access.',
  cta: 'Get early access for',
  ctaFallback: 'Get early access',
} as const;

export const howPage = {
  meta: { title: 'How MenuOnTV works: menu photo to TV', description: 'Snap your paper menu, pick one of six layouts and open one link on the TV you already own. About ten minutes, with no designer and no installer.' } satisfies PageMeta,
  next: [
    { title: 'How to put it on your TV', body: 'What you need, and how to check your TV first.', href: '/how-to-show-menu-on-tv' },
    { title: 'Menu boards for cafés and counters', body: 'Which layout suits your counter.', href: '/digital-menu-board-for-cafes' },
    { title: 'What the free plan covers', body: 'One screen, for good.', href: '/free-digital-menu-board' },
  ] satisfies readonly LinkItem[],
  title: 'From a photo to the TV in ten minutes.',
  lead: 'No designer, no installer and no ladder. Snap your paper menu, pick a layout and open one link on the TV you already own.',
  scanning: 'Reading your prices',
  scanned: ['Idli, two: ₹40', 'Masala dosa: ₹70', 'Filter coffee: ₹30'],
  pairCode: 'K7Q4',
  pairHint: 'Enter this code on your phone, or scan it. The TV keeps the link.',
  galleryLink: 'Open full screen',
} as const;

const TWO_SCREENS_A_MONTH = `₹${(pricing.plans[1].perScreen * 2).toLocaleString('en-IN')}`;

export const pricingPage = {
  meta: { title: 'Digital menu board price in India', description: 'MenuOnTV is free for one screen. Plus is ₹499 and Pro is ₹999 per screen a month, before tax. See what one café pays in all, TV stick included.' } satisfies PageMeta,
  title: 'What a digital menu board costs in India.',
  lead: 'One screen is free, for good. Pay only when you want more screens, more selling or proof of what sold.',
  choose: 'Choose',
  keepHalf: 'of what your screen earns from local ads is yours.',
  cost: {
    title: 'What one café pays in all.',
    columns: ['One TV', 'Two TVs'],
    rows: [
      ['MenuOnTV', '₹0 on Free', `${TWO_SCREENS_A_MONTH} a month on Plus`],
      ['The TV', 'The one you already have', 'The ones you already have'],
      ['A TV stick', 'About ₹3,000 once, only if your TV can’t open a link', 'The same, for each TV that needs one'],
      ['Installer, designer, reprints', 'None', 'None'],
    ],
    note: 'Early-access prices, before tax.',
  } satisfies ComparisonTable,
  next: [
    { title: 'What the free plan covers', body: 'One screen, for good.', href: '/free-digital-menu-board' },
    { title: 'How to put it on your TV', body: 'What you need, and how to check your TV first.', href: '/how-to-show-menu-on-tv' },
    { title: 'Compare it with printed and QR menus', body: 'When each one is enough.', href: '/digital-menu-board-vs-printed-menu' },
  ] satisfies readonly LinkItem[],
} as const;

/** The live demo page: the sample café in 3D, its menu on a TV out front. */
export const demoPage = {
  meta: { title: 'Live demo: a café menu on a TV', description: 'Masala Mornings, our sample café, in 3D. Its TV plays the menu the way yours would: prices sized for the queue, sold-out dishes marked, combos between slides.' } satisfies PageMeta,
  title: 'A café with its menu on a TV.',
  lead: 'This is Masala Mornings, our sample café. The TV out front plays its menu the way yours would: prices sized for the queue, sold-out dishes marked, and the combo between menu slides.',
  sceneLabel: 'A 3D café on a busy square. A big TV in front of it plays the menu, a guest orders at the counter and more wait in line.',
  loading: 'Setting up the café',
  failed: 'This browser can’t draw the 3D café. The TV screen shows the same menu.',
  hint: 'Drag to look around.',
  toTv: 'Look at the TV',
  toPlaza: 'Go back to the square',
  fullScreen: { label: 'Open the TV screen', href: '/screen/demo' },
  notesTitle: 'What to watch for.',
  /** Shown on /screen/demo when the pointer moves, so the full-screen demo is never a dead end. */
  backFromScreen: { label: 'Go back to the site', href: '/demo' },
  notes: [
    { title: 'The TV does the selling.', body: 'Guests read the menu while they wait, so they know what they want by the time they reach the counter.' },
    { title: 'Sold out stays off the order.', body: 'The kathi roll ran out, so the TV marks it sold out. Nobody orders it, and nobody has to say sorry.' },
    { title: 'Offers play beside the menu.', body: 'The chai and samosa combo takes the side of the screen in turn with today’s special, where everyone in the line sees it.' },
  ] satisfies readonly TextItem[],
} as const;

/** The field kit's leave-behind card (tracker MT-13, /kit): ten to an A4 sheet, left with an owner after a demo. */
export const leaveBehindCard = {
  pageTitle: 'Leave-behind cards.',
  howToPrint: 'Print on A4 card at 100% size, then cut along the dashed lines. Ten cards to a sheet.',
  print: 'Print the cards',
  headline: 'Your menu, on your TV.',
  points: ['Made from a photo of your menu.', 'Sold out and prices, changed from your phone.', 'Free for one screen.'],
  scan: 'Scan to try it with your own menu.',
  contact: 'Ask for',
} as const;

const earlyLinks = {
  how: { title: 'How to put it on your TV', body: 'What you need, and how to check your TV first.', href: '/how-to-show-menu-on-tv' },
  free: { title: 'What the free plan covers', body: 'One screen, for good.', href: '/free-digital-menu-board' },
  cost: { title: 'What one café pays', body: 'Plans in rupees, TV stick included.', href: '/pricing' },
} satisfies Record<string, LinkItem>;

/** /how-to-show-menu-on-tv: the how-to, and the “will my TV work?” part of the TV question. */
export const menuOnTvGuide = {
  path: '/how-to-show-menu-on-tv',
  meta: { title: 'How to show your menu on a TV, no app', description: 'Open one link in your TV’s browser and your menu plays full screen, with no app to install. What you need, how to check your TV, and what if the Wi-Fi drops.' },
  title: 'Your menu on a TV, with no app to install.',
  lead: 'Open one link in your TV’s browser and the menu plays full screen. You run it from your phone. Here is what you need, the four steps, and how to check your TV first.',
  sections: [
    {
      id: 'need',
      title: 'What you need.',
      items: [
        { title: 'A TV that can open a web page', body: 'If it has a web browser, that is all. If it doesn’t, a small stick in the HDMI port adds one, for about ₹3,000.' },
        { title: 'Wi-Fi in the shop', body: 'The TV uses it to get your changes. If it drops, the menu keeps playing.' },
        { title: 'Your phone', body: 'You make the menu and change it from your phone. No laptop, no designer.' },
      ],
    },
    {
      id: 'steps',
      title: 'Four steps. About ten minutes.',
      lead: 'During early access we set up your first screen with you.',
      numbered: true,
      items: [
        { title: 'Photograph your menu', body: 'Snap the paper menu or the board on your wall, or paste it from WhatsApp. Check the prices it read, then approve.' },
        { title: 'Pick a layout', body: 'Six layouts, and every one keeps prices big enough to read from the counter.' },
        { title: 'Open the pairing page on the TV', body: 'In the TV’s browser, type the short address from your phone. A code appears on the screen.' },
        { title: 'Enter the code on your phone', body: 'The TV keeps the link and plays your menu full screen.' },
      ],
    },
    {
      id: 'check',
      title: 'Check your TV first.',
      items: [
        { title: 'Check it in a few seconds', body: 'Open the TV check in the TV’s browser. It says in plain words whether the menu will play, and changes nothing on the TV.' },
        { title: 'If the browser is too old', body: 'A small TV stick in the HDMI port runs the menu. It costs about ₹3,000, once.' },
      ],
    },
    {
      id: 'after',
      title: 'Once it’s on the wall.',
      items: [
        { title: 'Change a price', body: 'One tap on your phone, and every TV in the shop updates within seconds.' },
        { title: 'Mark something sold out', body: 'One tap. Guests stop ordering it, and nobody has to say sorry.' },
        { title: 'If the internet drops', body: 'The screen keeps playing your last menu and catches up when it’s back.' },
      ],
    },
  ],
  tvCheck: { label: 'Open the TV check', href: '/tv-check' },
  next: [
    { title: 'See the six layouts', body: 'Each one live, playing the same café.', href: '/how-it-works' },
    earlyLinks.free,
    earlyLinks.cost,
  ],
} satisfies GuidePage & { readonly tvCheck: { readonly label: string; readonly href: string } };

export const freePage = {
  path: '/free-digital-menu-board',
  meta: { title: 'Free digital menu board for one TV', description: 'Yes, it’s free: one TV, for good, with all six layouts and your own promos. The catch is a small MenuOnTV badge. What’s free and what you pay for.' },
  title: 'A free digital menu board, for one TV.',
  lead: 'Yes, it’s free. One screen, for good, with all six layouts, your own promos and sold out in one tap. The catch is a small “Powered by MenuOnTV” badge on the screen.',
  sections: [
    {
      id: 'free',
      title: 'What’s free, and what isn’t.',
      items: [
        { title: 'Free, for good', body: 'One TV, all six layouts, light or dark, your menu from a photo, sold out, today’s special and your own promos.' },
        { title: 'The badge', body: 'A small “Powered by MenuOnTV” badge shows on the free screen. Plus takes it off.' },
        { title: 'What you pay for', body: 'More screens, breakfast, lunch and dinner menus, Hindi next to English and scheduled promos are on Plus, at ₹499 per screen a month.' },
        { title: 'The one cost outside us', body: 'If your TV can’t open a link, a TV stick costs about ₹3,000, once.' },
      ],
    },
    {
      id: 'elsewhere',
      title: 'Free here, and free elsewhere.',
      items: [
        { title: 'A free QR menu', body: 'It opens on the guest’s own phone. It doesn’t put anything on your TV.' },
        { title: 'Free ad-funded TV', body: 'It costs nothing, but it fills your TV with someone else’s channel and they keep the ad money. MenuOnTV plays your menu and your promos.' },
      ],
    },
  ],
  faq: {
    title: 'Questions about the free plan.',
    items: [
      { question: 'Is the free plan free forever?', answer: 'Yes. One screen is free, for good. Plus and Pro are early-access prices that we’ll confirm with our first restaurants before launch.' },
      { question: 'What happens when I want a second TV?', answer: 'Move to Plus, at ₹499 per screen a month before tax. Every screen then plays without the badge.' },
      { question: 'Do I need to buy any hardware?', answer: 'Not if your TV can open a web page. If it can’t, a small TV stick in the HDMI port costs about ₹3,000, once.' },
    ],
  },
  next: [
    earlyLinks.cost,
    { title: 'How to put it on your TV', body: 'What you need, and how to check your TV first.', href: '/how-to-show-menu-on-tv' },
    { title: 'Compare it with printed and QR menus', body: 'When each one is enough.', href: '/digital-menu-board-vs-printed-menu' },
  ],
} satisfies GuidePage;

export const cafesPage = {
  path: '/digital-menu-board-for-cafes',
  meta: { title: 'Digital menu board for cafés, bakeries, QSR', description: 'A TV menu board for cafés, chai shops, bakeries and quick-service counters in India. Which layout suits your counter, and what to put on the screen.' },
  title: 'A digital menu board for your café or counter.',
  lead: 'Cafés, chai shops, bakeries and quick-service counters sell from a queue. Here is what to put on the TV for each, and which of the six layouts fits.',
  sections: [
    {
      id: 'outlets',
      title: 'What goes on the screen, by counter.',
      items: [
        { title: 'Cafés and chai shops', body: 'A short menu and a big rush. The Split layout keeps the menu still while today’s special and your combos take turns beside it.' },
        { title: 'Bakeries and sweet shops', body: 'Mark what’s finished the moment the tray is empty, and put festival boxes on screen in season. Spotlight puts one cake or box on the whole screen.' },
        { title: 'Quick-service counters', body: 'Combos and add-ons on the screen guests face while they queue. The L-bar layout fits many offers beside the menu.' },
        { title: 'Food courts and pickup windows', body: 'A board that reads from across the hall, in English and Hindi. A TV mounted on its side uses the Portrait layout.' },
      ],
    },
    {
      id: 'every',
      title: 'What every counter gets.',
      items: [
        { title: 'Prices sized for the queue', body: 'Text is sized from the height of the screen, so prices read from the counter on any TV.' },
        { title: 'Sold out in one tap', body: 'From your phone, and every TV in the shop follows within seconds.' },
        { title: 'Veg marks and FSSAI calories', body: 'Veg and non-veg marks on every item, with calories and allergens the way FSSAI asks.' },
        { title: 'Breakfast, lunch and dinner', body: 'On Plus, each menu takes over at its time, with Hindi next to English.' },
      ],
    },
  ],
  faq: {
    title: 'Questions from café and counter owners.',
    items: [
      { question: 'Which layout suits a small café?', answer: 'Split, for most cafés: the menu always shows and your offers keep moving. You can switch layouts any time.' },
      { question: 'Can the TV be mounted on its side?', answer: 'Yes. The Portrait layout is made for TVs on their side, by the door or the queue.' },
      { question: 'Can I show a different menu in the morning?', answer: 'Yes, on Plus. Breakfast, lunch and dinner menus each take over at their time.' },
    ],
  },
  next: [
    { title: 'How to put it on your TV', body: 'What you need, and how to check your TV first.', href: '/how-to-show-menu-on-tv' },
    { title: 'See a café with its menu on a TV', body: 'The live demo.', href: '/demo' },
    earlyLinks.cost,
  ],
} satisfies GuidePage;

export const versusPage = {
  path: '/digital-menu-board-vs-printed-menu',
  meta: { title: 'Digital menu board vs printed menu vs QR', description: 'Printed board, QR menu or a menu on your TV? An honest look at changing prices, sold-out items and what guests see, and when a printed board is enough.' },
  title: 'Digital menu board, printed menu or QR menu.',
  lead: 'Each one does a different job. Here is an honest comparison for one counter, and when a printed board or a QR code is all you need.',
  table: {
    title: 'How they compare.',
    columns: ['MenuOnTV on your TV', 'Printed board', 'QR menu'],
    rows: [
      ['Changing a price', 'One tap on your phone; the TV changes in seconds', 'A reprint, a sticker or a pen mark', 'Edit it online'],
      ['Sold out', 'Marked on the screen in one tap', 'Said out loud at the counter', 'Depends on the menu app'],
      ['Where guests read it', 'On the TV, from the queue', 'On the wall or the counter', 'On their own phone, after a scan'],
      ['Specials and combos', 'Play between menu slides', 'A flyer by the till', 'Inside the menu, if they scroll to it'],
      ['Cost to start', '₹0 for one screen, plus a stick (about ₹3,000) if the TV needs one', 'A print run, and another for each change', 'Depends on the app'],
    ],
    note: 'MenuOnTV prices are early-access prices, before tax.',
  },
  sections: [
    {
      id: 'enough',
      title: 'When printed or QR is enough.',
      items: [
        { title: 'Your prices hardly change', body: 'If the menu stays the same for months and nothing sells out, a good printed board does the job.' },
        { title: 'Guests order at the table', body: 'If people sit down first and order there, a QR code on the table works. A TV helps most where people queue at a counter.' },
        { title: 'Use both', body: 'A QR code on the table for people sitting down, the TV over the counter for the queue. They do different jobs.' },
      ],
    },
  ],
  faq: {
    title: 'Questions about switching.',
    items: [
      { question: 'Is a digital menu board cheaper than reprinting?', answer: 'Changing a price on MenuOnTV costs nothing, and one screen is free. A printed board costs a reprint or a sticker every time a price changes.' },
      { question: 'Is a QR menu the same as a digital menu board?', answer: 'No. A QR menu opens on the guest’s own phone. A digital menu board plays on a screen everyone in the queue can read, without scanning anything.' },
      { question: 'Can I keep my printed menu too?', answer: 'Yes. Keep it for takeaway if you like; the TV shows the prices that are right today.' },
    ],
  },
  next: [
    earlyLinks.free,
    { title: 'How to put it on your TV', body: 'What you need, and how to check your TV first.', href: '/how-to-show-menu-on-tv' },
    earlyLinks.cost,
  ],
} satisfies GuidePage;

/** The four search pages, for Markdown, llms.txt and tests. */
export const guidePages: readonly GuidePage[] = [menuOnTvGuide, freePage, cafesPage, versusPage];
