import { z } from 'zod';
import type { Diet, MenuItem, Restaurant } from './types';

/**
 * "Your menu, on your TV": turns what a visitor types on the home page into a Restaurant the real
 * screen player can play. Runs in the browser only; nothing here is stored or sent.
 */

export const VISITOR_LIMITS = { cafe: 40, dish: 32, dishes: 8, price: 9999 } as const;

export interface VisitorDish {
  readonly name: string;
  /** As typed: the form keeps prices as text until they are parsed here. */
  readonly price: string | number;
  readonly diet: Diet;
}

export interface VisitorMenuInput {
  readonly cafe: string;
  readonly dishes: readonly VisitorDish[];
}

export const FALLBACK_CAFE = 'Your café';

/** What the screen plays until the visitor has typed at least one complete dish. */
export const SAMPLE_DISHES: readonly VisitorDish[] = [
  { name: 'Masala chai', price: 30, diet: 'veg' },
  { name: 'Samosa, 2 pieces', price: 40, diet: 'veg' },
  { name: 'Paneer tikka roll', price: 140, diet: 'veg' },
  { name: 'Chicken biryani', price: 220, diet: 'nonveg' },
];

const cafeSchema = z.string().trim().min(1).max(VISITOR_LIMITS.cafe);
const dishSchema = z.object({
  name: z.string().trim().min(1).max(VISITOR_LIMITS.dish),
  price: z.coerce.number().int().positive().max(VISITOR_LIMITS.price),
  diet: z.enum(['veg', 'nonveg']),
});

const MEAT = '🍗';
const EGG = '🍳';

/** A plate for each dish, guessed from its name; first match wins, so specific words come first. */
const EMOJI_RULES: readonly (readonly [RegExp, string])[] = [
  [/roll|wrap|frankie|kathi|shawarma/i, '🌯'],
  [/burger|pav/i, '🍔'],
  [/pizza/i, '🍕'],
  [/sandwich|toast/i, '🥪'],
  [/samosa|momo|dumpling|kachori/i, '🥟'],
  [/dosa|uttapam|idli|vada|paratha|roti|naan/i, '🫓'],
  [/noodle|chowmein|ramen|pasta/i, '🍜'],
  [/biryani|rice|pulao|thali|curry|dal/i, '🍛'],
  [/fries|chips/i, '🍟'],
  [/chicken|mutton|kebab|tikka|tandoori/i, MEAT],
  [/egg|omelette|bhurji/i, EGG],
  [/salad/i, '🥗'],
  [/paneer|cheese/i, '🧀'],
  [/cake|pastry|brownie|muffin/i, '🍰'],
  [/ice cream|kulfi|sundae|gelato/i, '🍨'],
  [/cookie|biscuit/i, '🍪'],
  [/lassi|milk|shake|smoothie/i, '🥛'],
  [/juice|soda|lime|cooler|mojito|sharbat/i, '🧃'],
  [/chai|tea|coffee|latte|cappuccino|espresso/i, '☕'],
  [/bread|bun|maska|bakery/i, '🍞'],
];

/** A veg dish never gets a meat or egg plate, so "Paneer tikka" isn't shown as a drumstick. */
export function emojiFor(dishName: string, diet: Diet = 'nonveg'): string {
  return EMOJI_RULES.find(([pattern, emoji]) => pattern.test(dishName) && !(diet === 'veg' && (emoji === MEAT || emoji === EGG)))?.[1] ?? '🍽️';
}

function toItems(dishes: readonly VisitorDish[]): MenuItem[] {
  return dishes.slice(0, VISITOR_LIMITS.dishes).flatMap((dish, index) => {
    const parsed = dishSchema.safeParse(dish);
    if (!parsed.success) return [];
    const { name, price, diet } = parsed.data;
    return [{ id: `visitor-${index}`, name, price, diet, emoji: emojiFor(name, diet) }];
  });
}

/** The visitor's café as a Restaurant: their dishes, a special made from the first, and a ticker. */
export function buildVisitorRestaurant(input: VisitorMenuInput): Restaurant {
  const cafe = cafeSchema.safeParse(input.cafe);
  const name = cafe.success ? cafe.data : FALLBACK_CAFE;
  const typed = toItems(input.dishes);
  const items = typed.length > 0 ? typed : toItems(SAMPLE_DISHES);
  const special = items[0];

  return {
    name,
    tagline: 'On the TV, from today',
    categories: [{ id: 'visitor-menu', name: 'Our menu', items }],
    promos: [
      {
        id: 'visitor-special',
        kind: 'special',
        label: 'Today’s special',
        headline: special.name,
        line: `Fresh at ${name}`,
        price: special.price,
        emoji: special.emoji,
      },
    ],
    ads: [],
    ticker: [`${name}: your menu, on your TV`, 'Prices change from the owner’s phone in seconds'],
  };
}
