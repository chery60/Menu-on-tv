'use server';

import { z } from 'zod';
import { getMenusRepository } from '@/features/menu/repository';
import { getPromosRepository } from '@/features/promos/repository';
import { promoInputSchema } from '@/features/promos/schema';
import { saveProblem } from '@/features/promos/status';
import { localClock } from '@/lib/local-date';
import type { ActionState } from '../action-state';
import { failed, guarded, OWNER_ONLY } from '../guard';

/** The promo studio's changes (MT-26). Owners only: staff see the list but can't change it. */

const id = z.string().min(1).max(64);
const GONE = 'That promo was removed on another phone.';
const target = z.object({ id });

/** Makes a promo, or saves new details for one when `id` is given. Prices and dishes are checked against today's menu. */
export async function savePromoAction(input: unknown): Promise<ActionState> {
  return guarded(OWNER_ONLY, 'promos.save_failed', async ({ restaurant }) => {
    const editing = z.object({ id: id.optional() }).safeParse(input);
    const parsed = promoInputSchema.safeParse(input);
    if (!editing.success || !parsed.success) return failed(parsed.error?.issues[0]?.message ?? 'Check the promo and try again.');
    const now = new Date();
    const menu = await getMenusRepository().get(restaurant.id, now);
    const problem = saveProblem(parsed.data, menu, localClock(now, restaurant.outlets[0].timeZone));
    if (problem) return failed(problem);
    const promos = getPromosRepository();
    if (editing.data.id === undefined) {
      await promos.create(restaurant.id, parsed.data, now);
      return { status: 'ok', message: 'Promo saved.' };
    }
    return (await promos.update(restaurant.id, editing.data.id, parsed.data, now)) ? { status: 'ok', message: 'Promo saved.' } : failed(GONE);
  });
}

export async function setPromoPausedAction(input: unknown): Promise<ActionState> {
  return guarded(OWNER_ONLY, 'promos.pause_failed', async ({ restaurant }) => {
    const parsed = target.extend({ paused: z.boolean() }).safeParse(input);
    if (!parsed.success) return failed(GONE);
    const promo = await getPromosRepository().setPaused(restaurant.id, parsed.data.id, parsed.data.paused, new Date());
    if (!promo) return failed(GONE);
    return { status: 'ok', message: parsed.data.paused ? 'Paused. It leaves your TVs at their next slide.' : 'Back on your TVs when it’s scheduled.' };
  });
}

export async function removePromoAction(input: unknown): Promise<ActionState> {
  return guarded(OWNER_ONLY, 'promos.remove_failed', async ({ restaurant }) => {
    const parsed = target.safeParse(input);
    if (!parsed.success || !(await getPromosRepository().remove(restaurant.id, parsed.data.id))) return failed(GONE);
    return { status: 'ok', message: 'Promo removed.' };
  });
}
