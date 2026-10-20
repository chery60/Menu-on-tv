'use client';

import { useActionState, useCallback, useEffect, useRef, useState } from 'react';
import { Busy, Feedback, field, hint, label, primary, textLink } from '@/components/owner/ui';
import { startSignInAction, verifySignInAction } from './actions';
import { START_IDLE, VERIFY_IDLE, type StartState } from './sign-in-state';

const secondsUntil = (iso: string): number => Math.max(0, Math.ceil((Date.parse(iso) - Date.now()) / 1000));

function useCountdown(until: string | null): number {
  const [left, setLeft] = useState(() => (until ? secondsUntil(until) : 0));
  useEffect(() => {
    if (!until) return;
    const tick = (): void => setLeft(secondsUntil(until));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [until]);
  return left;
}

interface OtpNavigator {
  readonly credentials: { get(options: { otp: { transport: string[] }; signal: AbortSignal }): Promise<{ code?: string } | null> };
}

/** Android Chrome can read the code from the text message (WebOTP); everywhere else the phone's keyboard suggests it. */
function useWebOtp(active: boolean, onCode: (code: string) => void): void {
  useEffect(() => {
    if (!active || !('OTPCredential' in window)) return;
    const controller = new AbortController();
    (navigator as unknown as OtpNavigator).credentials
      .get({ otp: { transport: ['sms'] }, signal: controller.signal })
      .then((credential) => credential?.code && onCode(credential.code))
      .catch(() => undefined);
    return () => controller.abort();
  }, [active, onCode]);
}

function CodeStep({ sent, identifier, next, onChangeAddress }: { readonly sent: Extract<StartState, { status: 'code-sent' }>; readonly identifier: string; readonly next: string; readonly onChangeAddress: () => void }) {
  const [verified, verify, verifying] = useActionState(verifySignInAction, VERIFY_IDLE);
  const [resent, resend, resending] = useActionState(startSignInAction, START_IDLE);
  const current = resent.status === 'code-sent' ? resent : sent;
  const left = useCountdown(current.resendAt);
  const formRef = useRef<HTMLFormElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);
  const fillAndSubmit = useCallback((code: string) => {
    if (!codeRef.current) return;
    codeRef.current.value = code;
    formRef.current?.requestSubmit();
  }, []);
  useWebOtp(true, fillAndSubmit);

  return (
    <div>
      <h1 className="font-display text-[clamp(1.9rem,6vw,2.6rem)] leading-tight">Enter the code.</h1>
      {current.devCode ? (
        <p className="mt-4 rounded-card bg-telly-soft px-4 py-3">
          This is a test site, so we don’t send codes yet. Your code for <strong>{current.destination}</strong> is{' '}
          <strong className="font-mono text-lg tracking-[0.2em]">{current.devCode}</strong>.
        </p>
      ) : (
        <p className="mt-3 text-night-soft">
          We sent a 6-digit code {current.channel === 'phone' ? 'by text message' : 'by email'} to <strong className="text-night">{current.destination}</strong>.
        </p>
      )}

      <form ref={formRef} action={verify} className="mt-6">
        <input type="hidden" name="challengeId" value={current.challengeId} />
        <input type="hidden" name="next" value={next} />
        <label htmlFor="sign-in-code" className={label}>
          Code
        </label>
        <input
          ref={codeRef}
          id="sign-in-code"
          name="code"
          required
          autoFocus
          autoComplete="one-time-code"
          inputMode="numeric"
          pattern="[0-9 ]{6,7}"
          maxLength={7}
          placeholder="123456"
          onChange={(event) => {
            if (event.currentTarget.value.replace(/\D/g, '').length === 6) event.currentTarget.form?.requestSubmit();
          }}
          className={`${field} max-w-[14rem] font-mono text-2xl tracking-[0.35em]`}
        />
        <button type="submit" className={`${primary} mt-5 w-full sm:w-auto`} disabled={verifying}>
          <Busy pending={verifying}>Sign in</Busy>
        </button>
        <Feedback state={verified} />
      </form>

      <form action={resend} className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <input type="hidden" name="identifier" value={identifier} />
        <button type="submit" className={`${textLink} disabled:text-night-dim disabled:no-underline`} disabled={left > 0 || resending}>
          {left > 0 ? `Send a new code in ${left}s` : resending ? 'Sending…' : 'Send a new code'}
        </button>
        <button type="button" className={textLink} onClick={onChangeAddress}>
          Use a different number or email
        </button>
      </form>
      {resent.status === 'error' ? <Feedback state={resent} /> : null}
      {resent.status === 'code-sent' ? <p role="status" className="mt-3 text-sm font-semibold text-chutney-deep">New code sent. The old one no longer works.</p> : null}
    </div>
  );
}

/** One field for a mobile number or an email, then a 6-digit code. Signing in the first time makes the account. */
export function SignInForm({ next }: { readonly next: string }) {
  const [started, start, starting] = useActionState(startSignInAction, START_IDLE);
  const [identifier, setIdentifier] = useState('');
  // Owners in India sign in by mobile, so the number pad comes first; email is one tap away.
  const [byEmail, setByEmail] = useState(false);
  // The code step the owner backed out of; a new code (a new challenge) shows the code step again.
  const [dismissed, setDismissed] = useState<string | null>(null);

  if (started.status === 'code-sent' && started.challengeId !== dismissed) {
    return <CodeStep key={started.challengeId} sent={started} identifier={identifier} next={next} onChangeAddress={() => setDismissed(started.challengeId)} />;
  }

  return (
    <div>
      <h1 className="font-display text-[clamp(1.9rem,6vw,2.6rem)] leading-tight">Sign in to MenuOnTV.</h1>
      <p className="mt-3 text-night-soft">No password. We send you a 6-digit code. New here? This makes your account.</p>
      <form action={start} className="mt-6">
        <label htmlFor="sign-in-identifier" className={label}>
          {byEmail ? 'Email address' : 'Mobile number'}
        </label>
        <input
          key={byEmail ? 'email' : 'phone'}
          id="sign-in-identifier"
          name="identifier"
          required
          autoFocus
          type={byEmail ? 'email' : 'tel'}
          inputMode={byEmail ? 'email' : 'tel'}
          autoComplete={byEmail ? 'email' : 'tel-national'}
          autoCapitalize="none"
          spellCheck={false}
          maxLength={254}
          value={identifier}
          onChange={(event) => setIdentifier(event.currentTarget.value)}
          placeholder={byEmail ? 'owner@yourcafe.in' : '98765 43210'}
          className={field}
        />
        <p className={hint}>
          {byEmail ? 'We email you a code. ' : 'We text you a code. No need to type +91. '}
          <button
            type="button"
            className="font-semibold text-night underline underline-offset-4"
            onClick={() => {
              setByEmail(!byEmail);
              setIdentifier('');
            }}
          >
            {byEmail ? 'Use your mobile number instead' : 'Use email instead'}
          </button>
        </p>
        <button type="submit" className={`${primary} mt-5 w-full sm:w-auto`} disabled={starting}>
          <Busy pending={starting}>Send code</Busy>
        </button>
        {started.status === 'error' ? <Feedback state={started} /> : null}
      </form>
    </div>
  );
}
