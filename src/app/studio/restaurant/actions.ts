'use server';

import { z } from 'zod';
import { formatIdentifier, parseIdentifier } from '@/features/accounts/identifier';
import { getAccountsRepository, type AddPersonResult } from '@/features/accounts/repository';
import { restaurantInputSchema, ROLES } from '@/features/accounts/schema';
import type { ActionState } from '../action-state';
import { failed, guarded, OWNER_ONLY } from '../guard';

/** The restaurant's details and the people who can use MenuOnTV for it. Owners only. */

const id = z.string().min(1).max(64);

export async function updateRestaurantAction(_previous: ActionState, form: FormData): Promise<ActionState> {
  return guarded(OWNER_ONLY, 'restaurant.update_failed', async ({ restaurant }) => {
    const parsed = restaurantInputSchema.safeParse({ name: form.get('name'), city: form.get('city'), tagline: form.get('tagline') ?? '' });
    if (!parsed.success) return failed(parsed.error.issues[0]?.message ?? 'Check the form and try again.');
    await getAccountsRepository().updateRestaurant(restaurant.id, parsed.data, new Date());
    return { status: 'ok', message: 'Saved. Your TVs show the new name at their next slide.' };
  });
}

export async function addPersonAction(_previous: ActionState, form: FormData): Promise<ActionState> {
  return guarded(OWNER_ONLY, 'restaurant.add_person_failed', async ({ restaurant }) => {
    const identifier = parseIdentifier(String(form.get('identifier') ?? ''));
    const role = z.enum(ROLES).safeParse(form.get('role'));
    if (!identifier) return failed('Enter their 10-digit mobile number or email address.');
    if (!role.success) return failed('Choose what they can do.');
    const who = formatIdentifier(identifier);
    const messages: Readonly<Record<AddPersonResult, ActionState>> = {
      added: { status: 'ok', message: `${who} can now use MenuOnTV for ${restaurant.name}.` },
      invited: { status: 'ok', message: `Added. When ${who} signs in to MenuOnTV, they join ${restaurant.name}. Send them the link on WhatsApp.` },
      already: failed(`${who} is already on your team.`),
    };
    return messages[await getAccountsRepository().addPerson(restaurant.id, identifier, role.data, new Date())];
  });
}

export async function removePersonAction(_previous: ActionState, form: FormData): Promise<ActionState> {
  return guarded(OWNER_ONLY, 'restaurant.remove_person_failed', async ({ restaurant }) => {
    const userId = id.safeParse(form.get('userId'));
    if (!userId.success) return failed('Choose someone to remove.');
    const result = await getAccountsRepository().removePerson(restaurant.id, userId.data);
    if (result === 'last-owner') return failed('A restaurant needs at least one owner. Make someone else an owner first.');
    return result === 'removed' ? { status: 'ok', message: 'Removed. They can no longer change your menu or TVs.' } : failed('They were already removed.');
  });
}

export async function cancelInviteAction(_previous: ActionState, form: FormData): Promise<ActionState> {
  return guarded(OWNER_ONLY, 'restaurant.cancel_invite_failed', async ({ restaurant }) => {
    const inviteId = id.safeParse(form.get('inviteId'));
    if (!inviteId.success) return failed('Choose an invite.');
    return (await getAccountsRepository().cancelInvite(restaurant.id, inviteId.data)) ? { status: 'ok', message: 'Invite cancelled.' } : failed('That invite was already cancelled.');
  });
}
