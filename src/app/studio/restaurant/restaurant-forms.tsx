'use client';

import { useActionState } from 'react';
import { Busy, Feedback, field, hint, label, primary, quiet } from '@/components/owner/ui';
import { IDLE } from '../action-state';
import { addPersonAction, cancelInviteAction, removePersonAction, updateRestaurantAction } from './actions';

export function RestaurantDetailsForm({ name, city, tagline }: { readonly name: string; readonly city: string; readonly tagline: string }) {
  const [state, action, pending] = useActionState(updateRestaurantAction, IDLE);
  return (
    <form action={action} className="mt-5 space-y-4">
      <div>
        <label htmlFor="restaurant-name" className={label}>
          Restaurant name
        </label>
        <input id="restaurant-name" name="name" required maxLength={60} defaultValue={name} className={field} />
      </div>
      <div>
        <label htmlFor="restaurant-city" className={label}>
          Area and city
        </label>
        <input id="restaurant-city" name="city" required maxLength={60} defaultValue={city} className={field} />
      </div>
      <div>
        <label htmlFor="restaurant-tagline" className={label}>
          Line under the name <span className="font-normal text-night-dim">(optional)</span>
        </label>
        <input id="restaurant-tagline" name="tagline" maxLength={80} defaultValue={tagline} className={field} />
        <p className={hint}>Shown on every screen, under your name.</p>
      </div>
      <button type="submit" className={primary} disabled={pending}>
        <Busy pending={pending}>Save details</Busy>
      </button>
      <Feedback state={state} />
    </form>
  );
}

export function AddPersonForm() {
  const [state, action, pending] = useActionState(addPersonAction, IDLE);
  return (
    <form action={action} className="mt-5 grid gap-4 sm:grid-cols-[1.4fr_1fr_auto] sm:items-end">
      <div>
        <label htmlFor="person-identifier" className={label}>
          Their mobile number or email
        </label>
        <input id="person-identifier" name="identifier" required maxLength={254} autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder="98765 43210" className={field} />
      </div>
      <div>
        <label htmlFor="person-role" className={label}>
          They can
        </label>
        <select id="person-role" name="role" defaultValue="staff" className={field}>
          <option value="staff">Edit the menu and sold out</option>
          <option value="owner">Do everything, as an owner</option>
        </select>
      </div>
      <button type="submit" className={primary} disabled={pending}>
        <Busy pending={pending}>Add person</Busy>
      </button>
      <div className="sm:col-span-3">
        <Feedback state={state} />
      </div>
    </form>
  );
}

export function RemovePersonButton({ userId, who, isSelf }: { readonly userId: string; readonly who: string; readonly isSelf: boolean }) {
  const [state, action, pending] = useActionState(removePersonAction, IDLE);
  return (
    <form
      action={action}
      onSubmit={(event) => {
        const question = isSelf ? 'Remove yourself? You will lose access to this restaurant.' : `Remove ${who}? They can no longer change your menu or TVs.`;
        if (!window.confirm(question)) event.preventDefault();
      }}
    >
      <input type="hidden" name="userId" value={userId} />
      <button type="submit" className={quiet} disabled={pending} aria-label={`Remove ${who}`}>
        <Busy pending={pending}>Remove</Busy>
      </button>
      <Feedback state={state} />
    </form>
  );
}

export function CancelInviteButton({ inviteId, who }: { readonly inviteId: string; readonly who: string }) {
  const [state, action, pending] = useActionState(cancelInviteAction, IDLE);
  return (
    <form action={action}>
      <input type="hidden" name="inviteId" value={inviteId} />
      <button type="submit" className={quiet} disabled={pending} aria-label={`Cancel the invite for ${who}`}>
        <Busy pending={pending}>Cancel invite</Busy>
      </button>
      <Feedback state={state} />
    </form>
  );
}
