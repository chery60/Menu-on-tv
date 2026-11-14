import 'server-only';
import { refresh } from 'next/cache';
import { AccountsLimitError } from '@/features/accounts/repository';
import { ROLES, type Role } from '@/features/accounts/schema';
import { currentAccess, hasRestaurant, type RestaurantAccess } from '@/features/accounts/session';
import { recordActivity } from '@/features/funnel/record';
import type { Activity } from '@/features/funnel/schema';
import { MenuEditError } from '@/features/menu/edit';
import { PhotoRejectedError } from '@/features/menu/photos';
import { PromoError } from '@/features/promos/repository';
import { ScreensLimitError } from '@/features/screens/repository';
import { logger } from '@/lib/logger';
import type { ActionState } from './action-state';

/**
 * Every owner app action starts here. Server Actions can be called from any page, so each one checks who is
 * signed in, that they work at a restaurant, and that their role allows the action, before touching data.
 */

export const SIGN_IN_AGAIN = 'You’ve been signed out. Sign in again, then try again.';
export const OWNERS_ONLY = 'Only an owner can do that. Ask the restaurant’s owner.';
export const TRY_AGAIN = 'Something went wrong. Try again.';
export const OWNER_ONLY: readonly Role[] = ['owner'];
export const EVERYONE: readonly Role[] = ROLES;

export const failed = (message: string): ActionState => ({ status: 'error', message });

export type Gate = { readonly ok: true; readonly access: RestaurantAccess } | { readonly ok: false; readonly message: string };

export async function gate(roles: readonly Role[]): Promise<Gate> {
  const access = await currentAccess();
  if (!hasRestaurant(access)) return { ok: false, message: SIGN_IN_AGAIN };
  if (!roles.includes(access.role)) return { ok: false, message: OWNERS_ONLY };
  return { ok: true, access };
}

/** The message for an error the owner can act on, or null for a fault, which is logged. */
export function userMessage(error: unknown): string | null {
  const known = error instanceof ScreensLimitError || error instanceof AccountsLimitError || error instanceof MenuEditError || error instanceof PhotoRejectedError || error instanceof PromoError;
  return known ? error.message : null;
}

/** Marks today as a day someone at the restaurant changed something, for the team's funnel (MT-36). Never fails the action. */
export async function markActive(access: RestaurantAccess, activity: Activity = 'change'): Promise<void> {
  await recordActivity(access.restaurant.id, activity);
}

/**
 * Runs a form action for a signed-in member with an allowed role, and refreshes the page when it worked.
 * Every one of these actions changes something, so one that worked marks the day active; a quick action (MT-25) says so.
 */
export async function guarded(roles: readonly Role[], event: string, run: (access: RestaurantAccess) => Promise<ActionState>, activity: Activity = 'change'): Promise<ActionState> {
  const checked = await gate(roles);
  if (!checked.ok) return failed(checked.message);
  try {
    const result = await run(checked.access);
    if (result.status === 'ok') {
      await markActive(checked.access, activity);
      refresh();
    }
    return result;
  } catch (error) {
    const message = userMessage(error);
    if (message) return failed(message);
    logger.error(event, error);
    return failed(TRY_AGAIN);
  }
}
