import { z } from 'zod';
import { LAYOUT_IDS, THEME_IDS } from '@/features/screen/types';

/** The accounts data file and owner input, validated at every boundary. */

const id = z.string().min(1).max(64);
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const channel = z.enum(['phone', 'email']);

export const ROLES = ['owner', 'staff'] as const;
export type Role = (typeof ROLES)[number];
export const DEFAULT_TIME_ZONE = 'Asia/Kolkata';

export const userSchema = z.object({
  id,
  phone: z.string().nullable(),
  email: z.string().nullable(),
  createdAt: z.string(),
});

export const sessionSchema = z.object({
  tokenHash: hash,
  userId: id,
  createdAt: z.string(),
  expiresAt: z.string(),
});

/** A sign-in code waiting to be typed. Only its hash is kept. */
export const codeSchema = z.object({
  id,
  channel,
  destination: z.string(),
  codeHash: hash,
  attempts: z.number().int().nonnegative(),
  createdAt: z.string(),
  expiresAt: z.string(),
});

/** When a code was sent to an address, kept for an hour to cap how many one address gets. */
export const sendSchema = z.object({ destination: z.string(), at: z.string() });

export const outletSchema = z.object({
  id,
  name: z.string(),
  city: z.string(),
  timeZone: z.string(),
});

/** A layout and its colours, as picked while getting started (MT-34). */
export const lookSchema = z.object({ layout: z.enum(LAYOUT_IDS), theme: z.enum(THEME_IDS) });
export type Look = z.infer<typeof lookSchema>;
/** What the look picker starts on, and what a TV plays when no look was picked: Split on Paper. */
export const DEFAULT_LOOK: Look = { layout: 'split', theme: 'paper' };

export const restaurantSchema = z.object({
  id,
  name: z.string().min(1).max(60),
  tagline: z.string().max(80),
  city: z.string().max(60),
  outlets: z.array(outletSchema).min(1),
  /** Calories and allergens on every TV (MT-29, FSSAI display). Off until an owner turns it on; restaurants saved before read as off. */
  fssai: z.boolean().default(false),
  /** The look picked while getting started (MT-34); the first TV connected plays it. Null until picked, and for restaurants saved before. */
  look: lookSchema.nullable().default(null),
  /** Whether the owner answered "Add today's special?" (MT-34), so it shows once. */
  specialNudgeAnswered: z.boolean().default(false),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const memberSchema = z.object({
  restaurantId: id,
  userId: id,
  role: z.enum(ROLES),
  addedAt: z.string(),
});

/** Someone the owner added who hasn't signed in yet. They join on their first sign-in. */
export const inviteSchema = z.object({
  id,
  restaurantId: id,
  channel,
  destination: z.string(),
  role: z.enum(ROLES),
  createdAt: z.string(),
});

export const accountsFileSchema = z.object({
  version: z.literal(1),
  users: z.array(userSchema),
  sessions: z.array(sessionSchema),
  codes: z.array(codeSchema),
  sends: z.array(sendSchema),
  restaurants: z.array(restaurantSchema),
  members: z.array(memberSchema),
  invites: z.array(inviteSchema),
});

export type User = z.infer<typeof userSchema>;
export type Session = z.infer<typeof sessionSchema>;
export type SignInCode = z.infer<typeof codeSchema>;
export type Restaurant = z.infer<typeof restaurantSchema>;
export type Member = z.infer<typeof memberSchema>;
export type Invite = z.infer<typeof inviteSchema>;
export type AccountsFile = z.infer<typeof accountsFileSchema>;

export const restaurantInputSchema = z.object({
  name: z.string().trim().min(1, { error: 'Give your restaurant its name, as guests know it.' }).max(60, { error: 'Use 60 characters or fewer.' }),
  city: z.string().trim().min(1, { error: 'Add the area or city, like “Indiranagar, Bengaluru”.' }).max(60, { error: 'Use 60 characters or fewer.' }),
  tagline: z.string().trim().max(80, { error: 'Keep the line under the name to 80 characters.' }),
});

export type RestaurantInput = z.infer<typeof restaurantInputSchema>;
