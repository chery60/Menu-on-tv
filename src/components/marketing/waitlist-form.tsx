'use client';

import { ChevronDown, CircleCheck, LoaderCircle } from 'lucide-react';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { earlyAccess } from '@/content/site-content';
import { buttonPrimary } from './ui';

type Status = 'idle' | 'submitting' | 'success' | 'error';

interface WaitlistResponse {
  readonly success: boolean;
  readonly error?: string;
}

/** Fired by the home page's menu builder with the café's name, so this form arrives filled in. */
export const PREFILL_EVENT = 'menutelly:prefill';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const fieldClass = 'mtv-field';

const labelClass = 'mtv-label';

export function WaitlistForm() {
  const [status, setStatus] = useState<Status>('idle');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const restaurantRef = useRef<HTMLInputElement>(null);

  // The home page's menu builder hands over the café's name when the visitor heads here.
  useEffect(() => {
    const prefill = (event: Event) => {
      const restaurant = (event as CustomEvent<{ restaurant?: unknown }>).detail?.restaurant;
      if (typeof restaurant === 'string' && restaurant && restaurantRef.current && !restaurantRef.current.value) {
        restaurantRef.current.value = restaurant.slice(0, 120);
      }
    };
    window.addEventListener(PREFILL_EVENT, prefill);
    return () => window.removeEventListener(PREFILL_EVENT, prefill);
  }, []);
  const ids = useId();

  const onSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') ?? '').trim();

    if (!EMAIL_PATTERN.test(email)) {
      setEmailError('Enter an email address like name@cafe.in.');
      return;
    }
    setEmailError(null);
    setFormError(null);
    setStatus('submitting');

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          role: String(form.get('role') ?? ''),
          restaurant: String(form.get('restaurant') ?? '').trim() || undefined,
          website: String(form.get('website') ?? ''),
        }),
      });
      const result = (await response.json()) as WaitlistResponse;
      if (!response.ok || !result.success) {
        setFormError(result.error ?? 'We couldn’t add you. Try again.');
        setStatus('error');
        return;
      }
      setStatus('success');
      window.requestAnimationFrame(() => successRef.current?.focus());
    } catch {
      setFormError('We couldn’t reach the server. Check your connection and try again.');
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div ref={successRef} tabIndex={-1} role="status" className="mtv-form-card mtv-form-done">
        <CircleCheck className="mtv-form-tick" aria-hidden="true" />
        <p className="mtv-h3">{earlyAccess.success}</p>
      </div>
    );
  }

  const submitting = status === 'submitting';

  return (
    <form onSubmit={onSubmit} noValidate className="mtv-form-card">
      <div>
        <label htmlFor={`${ids}-email`} className={labelClass}>
          Email
        </label>
        <input
          id={`${ids}-email`}
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          aria-invalid={emailError ? true : undefined}
          aria-describedby={emailError ? `${ids}-email-error` : undefined}
          placeholder="name@cafe.in"
          className={fieldClass}
        />
        {emailError ? (
          <p id={`${ids}-email-error`} className="mtv-error mtv-form-gap">
            {emailError}
          </p>
        ) : null}
      </div>

      <div className="mtv-form-pair">
        <div>
          <label htmlFor={`${ids}-role`} className={labelClass}>
            You are
          </label>
          <div className="relative">
            <select id={`${ids}-role`} name="role" defaultValue={earlyAccess.roles[0]} className={`${fieldClass} appearance-none pr-10`}>
              {earlyAccess.roles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
            <ChevronDown className="mtv-select-chevron" aria-hidden="true" />
          </div>
        </div>
        <div>
          <label htmlFor={`${ids}-restaurant`} className={labelClass}>
            Restaurant name <span className="mtv-form-optional">(optional)</span>
          </label>
          <input ref={restaurantRef} id={`${ids}-restaurant`} name="restaurant" type="text" autoComplete="organization" maxLength={120} placeholder="Masala Mornings" className={fieldClass} />
        </div>
      </div>

      {/* Honeypot for bots: hidden from people and assistive technology. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor={`${ids}-website`}>Website</label>
        <input id={`${ids}-website`} name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="mtv-form-submit">
        <button type="submit" className={buttonPrimary} disabled={submitting}>
          {submitting ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
          {submitting ? 'Adding you…' : earlyAccess.submit}
        </button>
        <p className="mtv-mono">{earlyAccess.privacy}</p>
      </div>

      <div aria-live="polite" className="mtv-error mtv-form-live">
        {formError}
      </div>
    </form>
  );
}
