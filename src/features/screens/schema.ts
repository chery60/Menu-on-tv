import { z } from 'zod';
import { TIMING_CHOICES } from '@/features/screen/loop';
import { LAYOUT_IDS, THEME_IDS, upgradeThemeId } from '@/features/screen/types';

/** The screens data file and owner input, validated at every boundary. */

const NAME_MAX = 60;

const choice = (values: readonly number[], message: string) => z.number().refine((value) => values.includes(value), { error: message });

/** How long this screen's slides stay up (MT-24); a screen without it plays the playbook's timing. */
export const timingSchema = z.object({
  menuSeconds: choice(TIMING_CHOICES.menuSeconds, 'Choose how long menu pages stay up from the list.'),
  promoSeconds: choice(TIMING_CHOICES.promoSeconds, 'Choose how long promos stay up from the list.'),
});

export const linkSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(NAME_MAX),
  tokenHash: z.string().regex(/^[a-f0-9]{64}$/),
  createdAt: z.string(),
  lastSeenAt: z.string().nullable(),
  lastVersion: z.string().nullable(),
  lastSlide: z.string().nullable(),
});

export const screenSchema = z.object({
  id: z.string().min(1),
  restaurantId: z.string().min(1),
  name: z.string().min(1).max(NAME_MAX),
  layout: z.enum(LAYOUT_IDS),
  // Screens saved with a retired theme (Chalk, Neon, Fresh) read as its brand theme.
  theme: z.preprocess(upgradeThemeId, z.enum(THEME_IDS)),
  bilingual: z.boolean(),
  timing: timingSchema.optional(),
  links: z.array(linkSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const pairingSchema = z.object({
  code: z.string(),
  deviceSecretHash: z.string().regex(/^[a-f0-9]{64}$/),
  createdAt: z.string(),
  expiresAt: z.string(),
  /** Set when the owner enters the code; the TV's link is only made when the TV collects it. */
  screenId: z.string().nullable(),
});

const currentFileSchema = z.object({
  version: z.literal(2),
  screens: z.array(screenSchema),
  pairings: z.array(pairingSchema),
});

/**
 * Version 1 came from the team console, before restaurant accounts: screens had no owner and today's
 * sold-out list lived here. Those screens can't be given to anyone, so the upgrade keeps only pairings.
 */
const firstFileSchema = z.object({ version: z.literal(1), pairings: z.array(pairingSchema) }).transform(({ pairings }) => ({ version: 2 as const, screens: [], pairings }));

export const screensFileSchema = z.union([currentFileSchema, firstFileSchema]);

export type ScreenLink = z.infer<typeof linkSchema>;
export type Screen = z.infer<typeof screenSchema>;
export type Pairing = z.infer<typeof pairingSchema>;
export type ScreensFile = z.infer<typeof currentFileSchema>;

export const screenInputSchema = z.object({
  name: z.string().trim().min(1, { error: 'Give the screen a name, like “Counter TV”.' }).max(NAME_MAX, { error: 'Use 60 characters or fewer.' }),
  layout: z.enum(LAYOUT_IDS, { error: 'Choose a layout from the list.' }),
  theme: z.enum(THEME_IDS, { error: 'Choose a theme from the list.' }),
  bilingual: z.boolean(),
  timing: timingSchema.optional(),
});

export type ScreenInput = z.infer<typeof screenInputSchema>;

export const beatInputSchema = z.object({
  version: z.string().max(64).nullable(),
  slide: z.string().max(60).nullable(),
  sentAt: z.number().finite(),
});
