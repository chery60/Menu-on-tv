'use server';

import { redirect } from 'next/navigation';
import { AccountsLimitError, getAccountsRepository } from '@/features/accounts/repository';
import { restaurantInputSchema } from '@/features/accounts/schema';
import { currentAccess } from '@/features/accounts/session';
import { getMenusRepository } from '@/features/menu/repository';
import { sampleMenu } from '@/features/menu/sample';
import { randomUUID } from 'node:crypto';
import { logger } from '@/lib/logger';
import type { ActionState } from '../action-state';
import { failed, SIGN_IN_AGAIN, TRY_AGAIN } from '../guard';

/** Makes the signed-in person's restaurant and first outlet, with an empty or sample menu, then opens the menu. */
export async function createRestaurantAction(_previous: ActionState, form: FormData): Promise<ActionState> {
  const access = await currentAccess();
  if (!access) return failed(SIGN_IN_AGAIN);
  if (access.restaurant) redirect('/studio');
  const parsed = restaurantInputSchema.safeParse({ name: form.get('name'), city: form.get('city'), tagline: form.get('tagline') ?? '' });
  if (!parsed.success) return failed(parsed.error.issues[0]?.message ?? 'Check the form and try again.');

  try {
    const now = new Date();
    const restaurant = await getAccountsRepository().createRestaurant(access.user.id, parsed.data, now);
    if (form.get('start') === 'sample') await getMenusRepository().update(restaurant.id, () => sampleMenu(now, randomUUID), now);
  } catch (error) {
    if (error instanceof AccountsLimitError) return failed(error.message);
    logger.error('setup.create_failed', error);
    return failed(TRY_AGAIN);
  }
  redirect('/studio/menu');
}
