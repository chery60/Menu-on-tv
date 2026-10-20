'use client';

import { useActionState } from 'react';
import { Busy, Feedback, field, hint, label, primary } from '@/components/owner/ui';
import { IDLE } from '../action-state';
import { createRestaurantAction } from './actions';

const choice = 'flex cursor-pointer gap-3 rounded-card border border-night/30 bg-page p-4 has-[:checked]:border-night has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-night';

export function SetupForm({ canReadPhotos }: { readonly canReadPhotos: boolean }) {
  const [state, action, pending] = useActionState(createRestaurantAction, IDLE);
  return (
    <form action={action} className="mt-6 space-y-5">
      <div>
        <label htmlFor="setup-name" className={label}>
          Restaurant name
        </label>
        <input id="setup-name" name="name" required maxLength={60} autoComplete="organization" placeholder="For example, Chai Point" className={field} />
        <p className={hint}>As guests know it. It goes at the top of every screen.</p>
      </div>
      <div>
        <label htmlFor="setup-city" className={label}>
          Area and city
        </label>
        <input id="setup-city" name="city" required maxLength={60} placeholder="For example, Indiranagar, Bengaluru" className={field} />
      </div>
      <div>
        <label htmlFor="setup-tagline" className={label}>
          A line under the name <span className="font-normal text-night-dim">(optional)</span>
        </label>
        <input id="setup-tagline" name="tagline" maxLength={80} placeholder="For example, Chai and fresh bakes" className={field} />
      </div>
      <fieldset>
        <legend className={label}>Your menu</legend>
        <div className="mt-2 grid gap-3">
          <label className={choice}>
            <input type="radio" name="start" value="empty" defaultChecked className="mt-1 size-4 accent-night" />
            <span>
              <span className="block font-semibold">Start with an empty menu</span>
              <span className="block text-sm text-night-dim">{canReadPhotos ? 'Photograph or paste the menu you already have, or add dishes one by one.' : 'Paste the menu you already have, or add dishes one by one.'}</span>
            </span>
          </label>
          <label className={choice}>
            <input type="radio" name="start" value="sample" className="mt-1 size-4 accent-night" />
            <span>
              <span className="block font-semibold">Start from a sample café menu</span>
              <span className="block text-sm text-night-dim">Chai, snacks and bakes with prices. Change or delete anything before it goes on a TV.</span>
            </span>
          </label>
        </div>
      </fieldset>
      <button type="submit" className={`${primary} w-full sm:w-auto`} disabled={pending}>
        <Busy pending={pending}>Create restaurant</Busy>
      </button>
      <Feedback state={state} />
    </form>
  );
}
