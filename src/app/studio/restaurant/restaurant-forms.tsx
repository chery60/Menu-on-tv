'use client';

import Link from 'next/link';
import { useActionState, useRef, useState, type MouseEvent } from 'react';
import { Busy, Feedback, field, hint, label, primary, quiet } from '@/components/owner/ui';
import { caloriesWarning } from '@/features/menu/components/calorie-flags';
import { closeSheet, Sheet, sheetFooter } from '@/features/menu/components/sheet';
import { IDLE, type ActionState } from '../action-state';
import { addPersonAction, cancelInviteAction, removePersonAction, setFssaiAction, updateRestaurantAction } from './actions';

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

interface FssaiSwitchProps {
  readonly on: boolean;
  /** Dishes on the TVs with no calories yet: how many, and the first few by name. */
  readonly missingCount: number;
  readonly missing: readonly { readonly id: string; readonly name: string }[];
}

/** Calories and allergens on every TV (MT-29). With dishes missing calories, turning it on asks first. */
export function FssaiSwitch({ on, missingCount, missing }: FssaiSwitchProps) {
  const [asking, setAsking] = useState(false);
  const confirm = useRef<HTMLButtonElement>(null);
  const [state, action, pending] = useActionState(async (previous: ActionState, form: FormData) => {
    const result = await setFssaiAction(previous, form);
    // Closed once the answer is in, not on click: unmounting the button that submitted would drop the submit.
    closeSheet(confirm.current);
    return result;
  }, IDLE);
  const ask = (event: MouseEvent<HTMLButtonElement>): void => {
    const turningOnWithGaps = !on && missingCount > 0;
    if (pending || turningOnWithGaps) event.preventDefault();
    if (!pending && turningOnWithGaps) setAsking(true);
  };
  const more = missingCount - missing.length;

  return (
    <form action={action} className="mt-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p id="fssai-label" className="font-semibold">
            Show calories and allergens on your TVs (FSSAI)
          </p>
          <p id="fssai-hint" className={hint}>
            Chains with 10 or more outlets must show calories.
          </p>
        </div>
        <button
          type="submit"
          name="fssai"
          value={on ? 'false' : 'true'}
          role="switch"
          aria-checked={on}
          aria-labelledby="fssai-label"
          aria-describedby="fssai-hint"
          onClick={ask}
          // Not disabled while saving: a disabled button drops keyboard focus, and the sheet hands focus back here.
          aria-disabled={pending}
          className={`inline-flex h-11 min-w-[5.5rem] shrink-0 items-center justify-center gap-2 rounded-control border px-3 text-sm font-semibold transition-colors aria-disabled:cursor-wait ${on ? 'border-night bg-night text-mist' : 'border-night/30 bg-page text-night-soft hover:border-night'}`}
        >
          <Busy pending={pending && !asking}>{on ? 'On' : 'Off'}</Busy>
        </button>
      </div>
      <Feedback state={state} />
      {asking ? (
        <Sheet title="Turn on calories and allergens" onClose={() => setAsking(false)}>
          <p className="text-pretty">{caloriesWarning(missingCount)}</p>
          <ul className="mt-4 divide-y divide-hairline border-y border-hairline">
            {missing.map((dish) => (
              <li key={dish.id} className="py-2.5 font-semibold">
                {dish.name}
              </li>
            ))}
            {more > 0 ? <li className="py-2.5 text-night-dim">and {more} more</li> : null}
          </ul>
          <div className={`${sheetFooter} flex flex-wrap gap-3`}>
            <button ref={confirm} type="submit" name="fssai" value="true" className={primary} disabled={pending}>
              <Busy pending={pending}>Turn on anyway</Busy>
            </button>
            {/* Closed before leaving: Next keeps this page alive, hidden, and an open modal would leave the Menu page inert. */}
            <Link href="/studio/menu" className={quiet} onClick={(event) => closeSheet(event.currentTarget)}>
              Add calories first
            </Link>
          </div>
        </Sheet>
      ) : null}
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
