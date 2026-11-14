import { logger } from '@/lib/logger';
import { getFunnelRepository } from './repository';
import type { Activity, FunnelStep } from './schema';

/**
 * One call in each action that completes a funnel step (MT-36). Recording never fails the owner's action or a
 * TV's heartbeat: a fault is logged, without ids, and dropped.
 */

async function safely(event: string, record: () => Promise<void>): Promise<void> {
  try {
    await record();
  } catch (error) {
    logger.error(event, error);
  }
}

/** A person signed in and has no restaurant: they count as signed up until they set one up. */
export function recordSignUp(userId: string, signedUpAt: string, now = new Date()): Promise<void> {
  return safely('funnel.sign_up_failed', () => getFunnelRepository().signedUp(userId, signedUpAt, now));
}

export function recordSetUp(restaurantId: string, userId: string, signedUpAt: string, now = new Date()): Promise<void> {
  return safely('funnel.set_up_failed', () => getFunnelRepository().setUp(restaurantId, userId, signedUpAt, now));
}

export function recordStep(restaurantId: string, step: FunnelStep, now = new Date()): Promise<void> {
  return safely(`funnel.${step}_failed`, () => getFunnelRepository().reached(restaurantId, step, now));
}

export function recordActivity(restaurantId: string, activity: Activity, now = new Date()): Promise<void> {
  return safely('funnel.activity_failed', () => getFunnelRepository().active(restaurantId, activity, now));
}
