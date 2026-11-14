import { z } from 'zod';

/**
 * The owner funnel's data (MT-36): when each restaurant first reached each step, and which days someone there
 * changed something. Only ids, step names, India-time days and times: no names, phone numbers, emails or
 * addresses, and nothing about guests. Restaurant names are joined from accounts on the team page.
 */

/** In funnel order. */
export const FUNNEL_STEPS = ['signed-up', 'set-up', 'menu', 'look', 'tv', 'on-air', 'paid'] as const;
export type FunnelStep = (typeof FUNNEL_STEPS)[number];

/** A day someone changed something; "quick" when one of the changes was a quick action (MT-25). */
export const ACTIVITIES = ['change', 'quick'] as const;
export type Activity = (typeof ACTIVITIES)[number];

/** Restaurants that found us themselves. MT-35 adds each rep's id as a channel. */
export const OWN_CHANNEL = 'own';

/** Every day and time in the funnel is India time (the PRD's rule). */
export const FUNNEL_TIME_ZONE = 'Asia/Kolkata';

const id = z.string().min(1).max(64);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const funnelRestaurantSchema = z.object({
  channel: id,
  /** Marked as one of MenuOnTV's own test or demo restaurants in the team area: left out of every count. */
  test: z.boolean(),
  /** When each step first happened, as an ISO time. */
  steps: z.partialRecord(z.enum(FUNNEL_STEPS), z.string()),
  /** One mark per India-time day (YYYY-MM-DD) that someone changed something. */
  active: z.record(day, z.enum(ACTIVITIES)),
});

export const funnelFileSchema = z.object({
  version: z.literal(1),
  /** People who signed up and haven't set up a restaurant yet: their random user id and when they signed up. */
  signups: z.record(id, z.string()),
  restaurants: z.record(id, funnelRestaurantSchema),
});

export type FunnelRestaurant = z.infer<typeof funnelRestaurantSchema>;
export type FunnelFile = z.infer<typeof funnelFileSchema>;
