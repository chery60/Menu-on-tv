'use server';

import { refresh } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';
import type { ActionState } from '@/app/studio/action-state';
import { getAccountsRepository } from '@/features/accounts/repository';
import { getFunnelRepository } from '@/features/funnel/repository';
import { checkBasicAuth } from '@/lib/basic-auth';
import { logger } from '@/lib/logger';

/**
 * The team's own changes on the funnel page (MT-36). The proxy asks for the team password on /tracker, but a
 * Server Action can be called from any page, so each action checks the password again, by the proxy's rule.
 */

async function isTeam(): Promise<boolean> {
  const password = process.env.TRACKER_PASSWORD;
  if (!password) return process.env.NODE_ENV !== 'production';
  return checkBasicAuth((await headers()).get('authorization'), password);
}

const testInputSchema = z.object({ restaurantId: z.string().min(1).max(64), test: z.enum(['true', 'false']) });

/** Marks a restaurant as one of MenuOnTV's own test or demo restaurants, so it leaves every count, or puts it back. */
export async function setTestRestaurantAction(_previous: ActionState, form: FormData): Promise<ActionState> {
  if (!(await isTeam())) return { status: 'error', message: 'Sign in with the team password, then try again.' };
  const parsed = testInputSchema.safeParse({ restaurantId: form.get('restaurantId'), test: form.get('test') });
  if (!parsed.success) return { status: 'error', message: 'Choose a restaurant.' };
  const { restaurantId } = parsed.data;
  const test = parsed.data.test === 'true';
  try {
    if (!(await getAccountsRepository().restaurant(restaurantId))) return { status: 'error', message: 'That restaurant isn’t on MenuOnTV any more.' };
    await getFunnelRepository().setTest(restaurantId, test, new Date());
  } catch (error) {
    logger.error('funnel.set_test_failed', error);
    return { status: 'error', message: 'Something went wrong. Try again.' };
  }
  refresh();
  return { status: 'ok', message: test ? 'Marked as test. It’s left out of every count.' : 'Back in the counts.' };
}
