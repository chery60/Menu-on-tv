import { z } from 'zod';
import { daypartSchema } from '@/features/menu/dayparts';
import { MAX_PAISE } from '@/features/menu/money';
import { MENU_LIMITS } from '@/features/menu/schema';

/**
 * Promos the owner makes in the promo studio (MT-26). A promo names dishes and sizes; their names, prices,
 * photos and sold out are read from the menu every time, never copied here. Times are the outlet's own,
 * as YYYY-MM-DDTHH:mm, like dayparts and "sold out today".
 */

/** Today's special is a template on the Promos page too, but it opens MT-25's picker and lives on the menu. */
export const PROMO_TEMPLATES = ['combo', 'happy-hour', 'new', 'festival', 'scan'] as const;
export type PromoTemplate = (typeof PROMO_TEMPLATES)[number];

export const FESTIVALS = {
  diwali: 'Diwali',
  holi: 'Holi',
  eid: 'Eid',
  christmas: 'Christmas',
  'new-year': 'New Year',
  navratri: 'Navratri',
  'durga-puja': 'Durga Puja',
  'ganesh-chaturthi': 'Ganesh Chaturthi',
  onam: 'Onam',
  pongal: 'Pongal',
  lohri: 'Lohri',
  'raksha-bandhan': 'Raksha Bandhan',
} as const;
export type Festival = keyof typeof FESTIVALS;
const FESTIVAL_IDS = Object.keys(FESTIVALS) as [Festival, ...Festival[]];

/** Starting values from the PRD; Design confirms the text limits fit every layout at 3 metres. */
export const PROMO_LIMITS = {
  perRestaurant: 20,
  headline: 30,
  line: 60,
  link: 300,
  comboDishes: { min: 2, max: 4 },
  festivalDishes: 2,
} as const;

const id = z.string().min(1).max(64);

/** A minute in the outlet's time, as YYYY-MM-DDTHH:mm. Sorting the text sorts the times. */
export const localTimeSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, { error: 'Pick a date and time.' })
  .refine((value) => !Number.isNaN(Date.parse(`${value}:00Z`)) && new Date(`${value}:00Z`).toISOString().startsWith(value), { error: 'Pick a date and time.' });

/** Only https links, kept exactly as typed: the TV's QR opens them with no redirect through us. */
export function isHttpsLink(value: string): boolean {
  if (!value.startsWith('https://') || /\s/.test(value)) return false;
  try {
    const url = new URL(value);
    return url.hostname.includes('.') && !url.username && !url.password;
  } catch {
    return false;
  }
}

const dishSchema = z.object({ itemId: id, size: z.string().max(MENU_LIMITS.sizeLabel) });

export const promoSchema = z.object({
  id,
  template: z.enum(PROMO_TEMPLATES),
  /** Each dish and the size it is offered in ('' for a dish with one price). */
  dishes: z.array(dishSchema).max(PROMO_LIMITS.comboDishes.max),
  /** The typed deal price: combo and happy hour only. */
  dealPaise: z.number().int().min(1).max(MAX_PAISE).nullable(),
  headline: z.string().min(1).max(PROMO_LIMITS.headline),
  line: z.string().max(PROMO_LIMITS.line),
  festival: z.enum(FESTIVAL_IDS).nullable(),
  link: z.string().max(PROMO_LIMITS.link).refine(isHttpsLink).nullable(),
  /** Null: from when it was made. */
  startsAt: localTimeSchema.nullable(),
  /** Null: it never ends. */
  endsAt: localTimeSchema.nullable(),
  /** Only at certain times and days, like a category's daypart. */
  daypart: daypartSchema.nullable(),
  /** The time left shows on the TV near the end. Only a promo with an end has one. */
  countdown: z.boolean(),
  paused: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Promo = z.infer<typeof promoSchema>;

export const promosFileSchema = z.object({
  version: z.literal(1),
  /** Each restaurant's promos, in the order they were made, which is the order they play. */
  promos: z.record(z.string(), z.array(promoSchema)),
});

export type PromosFile = z.infer<typeof promosFileSchema>;

type Fields = {
  readonly template: PromoTemplate;
  readonly dishes: readonly { readonly itemId: string }[];
  readonly dealPaise: number | null;
  readonly festival: Festival | null;
  readonly link: string | null;
  readonly startsAt: string | null;
  readonly endsAt: string | null;
  readonly daypart: unknown;
  readonly countdown: boolean;
};

/** What a template needs, in words for the owner; null when the promo has it. */
function templateProblem(input: Fields): string | null {
  const count = input.dishes.length;
  if (new Set(input.dishes.map((dish) => dish.itemId)).size !== count) return 'Pick each dish once.';
  switch (input.template) {
    case 'combo':
      if (count < PROMO_LIMITS.comboDishes.min || count > PROMO_LIMITS.comboDishes.max) return `Pick ${PROMO_LIMITS.comboDishes.min} to ${PROMO_LIMITS.comboDishes.max} dishes for a combo.`;
      if (input.dealPaise === null) return 'Enter the combo price.';
      break;
    case 'happy-hour':
      if (count !== 1) return 'Pick one dish for happy hour.';
      if (input.dealPaise === null) return 'Enter the happy-hour price.';
      if (!input.daypart) return 'Pick the times for happy hour.';
      break;
    case 'new':
      if (count !== 1) return 'Pick the new dish.';
      break;
    case 'festival':
      if (!input.festival) return 'Pick a festival.';
      if (count > PROMO_LIMITS.festivalDishes) return `Pick up to ${PROMO_LIMITS.festivalDishes} dishes for a festival.`;
      break;
    case 'scan':
      if (!input.link) return 'Add the link the QR opens.';
      break;
  }
  // Times end each run (a happy hour counts down to the end of today's times), so they count as an end too.
  if (input.countdown && !input.endsAt && !input.daypart) return 'A countdown needs an end time.';
  if (input.startsAt && input.endsAt && input.endsAt <= input.startsAt) return 'Pick an end after the start.';
  return null;
}

/** A promo from the owner, before it is checked against the menu. Fields a template doesn't use are dropped. */
export const promoInputSchema = z
  .object({
    template: z.enum(PROMO_TEMPLATES, { error: 'Pick a template.' }),
    dishes: z.array(dishSchema).max(PROMO_LIMITS.comboDishes.max, { error: `Pick up to ${PROMO_LIMITS.comboDishes.max} dishes.` }).default([]),
    dealPaise: z.number({ error: 'Enter a price in rupees.' }).int().min(1, { error: 'Enter a price above ₹0.' }).max(MAX_PAISE, { error: 'That price is too high.' }).nullish(),
    headline: z.string().trim().min(1, { error: 'Write a headline.' }).max(PROMO_LIMITS.headline, { error: `Keep the headline to ${PROMO_LIMITS.headline} characters.` }),
    line: z.string().trim().max(PROMO_LIMITS.line, { error: `Keep the line to ${PROMO_LIMITS.line} characters.` }).default(''),
    festival: z.enum(FESTIVAL_IDS, { error: 'Pick a festival.' }).nullish(),
    link: z
      .string()
      .trim()
      .max(PROMO_LIMITS.link, { error: `Keep the link to ${PROMO_LIMITS.link} characters.` })
      .refine(isHttpsLink, { error: 'Use the full link, starting with https://' })
      .nullish(),
    startsAt: localTimeSchema.nullish(),
    endsAt: localTimeSchema.nullish(),
    daypart: daypartSchema.nullish(),
    countdown: z.boolean().default(false),
  })
  .transform((input) => {
    const deal = input.template === 'combo' || input.template === 'happy-hour';
    return {
      template: input.template,
      dishes: input.template === 'scan' ? [] : input.dishes,
      dealPaise: deal ? (input.dealPaise ?? null) : null,
      headline: input.headline,
      line: input.line,
      festival: input.template === 'festival' ? (input.festival ?? null) : null,
      link: input.template === 'scan' ? (input.link ?? null) : null,
      startsAt: input.startsAt ?? null,
      endsAt: input.endsAt ?? null,
      daypart: input.daypart ?? null,
      countdown: input.countdown,
    };
  })
  .superRefine((input, context) => {
    const problem = templateProblem(input);
    if (problem) context.addIssue({ code: 'custom', message: problem });
  });

export type PromoInput = z.output<typeof promoInputSchema>;
