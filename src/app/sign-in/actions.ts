'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { formatIdentifier, parseIdentifier } from '@/features/accounts/identifier';
import { safeNextPath } from '@/features/accounts/next-path';
import { AccountsLimitError, getAccountsRepository } from '@/features/accounts/repository';
import { canSend, DeliveryError, sendSignInCode } from '@/features/accounts/send-code';
import { endSession, startSession } from '@/features/accounts/session';
import { logger } from '@/lib/logger';
import { clientKey, RateLimiter } from '@/lib/rate-limit';
import type { StartState, VerifyState } from './sign-in-state';

/** Sign-in by a one-time code. Per-address limits sit on top of the per-number limits in the repository. */

const startLimiter = new RateLimiter(10, 10 * 60 * 1000);
const verifyLimiter = new RateLimiter(30, 10 * 60 * 1000);
const SLOW_DOWN = 'Too many tries from this connection. Wait a few minutes and try again.';
const TRY_AGAIN = 'Something went wrong. Try again.';

async function limited(limiter: RateLimiter, scope: string): Promise<boolean> {
  return !limiter.take(`${scope}:${clientKey(await headers())}`, Date.now()).allowed;
}

function waitMessage(seconds: number): string {
  return seconds <= 60 ? `Wait ${seconds} seconds, then ask for a new code.` : `You’ve asked for several codes. Try again in ${Math.ceil(seconds / 60)} minutes.`;
}

/** Points to the channel that works, and never sends the owner back and forth when neither does. */
function notSetUp(channel: 'phone' | 'email'): string {
  const other = channel === 'phone' ? 'email' : 'phone';
  if (!canSend(other)) return 'Sign-in isn’t switched on here yet. Try again later.';
  return channel === 'phone' ? 'Codes by text message aren’t switched on yet. Use your email address instead.' : 'Codes by email aren’t switched on yet. Use your mobile number instead.';
}

export async function startSignInAction(_previous: StartState, form: FormData): Promise<StartState> {
  if (await limited(startLimiter, 'sign-in-start')) return { status: 'error', message: SLOW_DOWN };
  const identifier = parseIdentifier(String(form.get('identifier') ?? ''));
  if (!identifier) return { status: 'error', message: 'Enter a 10-digit mobile number or an email address.' };
  // shortcut: texts go only to Indian (+91) numbers, which blocks SMS-pumping fraud to premium numbers abroad; add a country list when we sell outside India.
  if (identifier.channel === 'phone' && !identifier.value.startsWith('+91')) {
    return { status: 'error', message: 'Codes by text message work for Indian (+91) numbers. Use your email address instead.' };
  }
  try {
    const started = await getAccountsRepository().startSignIn(identifier, new Date());
    if (started.status === 'wait') return { status: 'error', message: waitMessage(started.retryAfterSeconds) };
    const delivery = await sendSignInCode(identifier, started.code);
    return {
      status: 'code-sent',
      challengeId: started.challengeId,
      destination: formatIdentifier(identifier),
      channel: identifier.channel,
      resendAt: started.resendAt,
      ...(delivery.via === 'screen' ? { devCode: delivery.code } : {}),
    };
  } catch (error) {
    if (error instanceof AccountsLimitError) return { status: 'error', message: error.message };
    logger.error('auth.code_not_sent', error, { channel: identifier.channel });
    if (error instanceof DeliveryError && error.reason === 'not-configured') return { status: 'error', message: notSetUp(identifier.channel) };
    return { status: 'error', message: 'We couldn’t send a code just now. Try again in a minute.' };
  }
}

const verifySchema = z.object({ challengeId: z.uuid(), code: z.string().regex(/^\d{6}$/) });

export async function verifySignInAction(_previous: VerifyState, form: FormData): Promise<VerifyState> {
  if (await limited(verifyLimiter, 'sign-in-verify')) return { status: 'error', message: SLOW_DOWN, needsNewCode: false };
  const parsed = verifySchema.safeParse({ challengeId: form.get('challengeId'), code: String(form.get('code') ?? '').replace(/\D/g, '') });
  if (!parsed.success) return { status: 'error', message: 'Enter the 6-digit code.', needsNewCode: false };

  let destination: string;
  try {
    const accounts = getAccountsRepository();
    const result = await accounts.verifySignIn(parsed.data.challengeId, parsed.data.code, new Date());
    if (result.status === 'wrong') {
      return { status: 'error', message: `That code isn’t right. ${result.attemptsLeft === 1 ? '1 try' : `${result.attemptsLeft} tries`} left.`, needsNewCode: false };
    }
    if (result.status === 'locked') return { status: 'error', message: 'Too many wrong tries. Ask for a new code.', needsNewCode: true };
    if (result.status === 'expired') return { status: 'error', message: 'That code has expired. Ask for a new one.', needsNewCode: true };
    await startSession(result.token, result.expiresAt);
    const access = await accounts.access(result.token, new Date());
    destination = access?.restaurant ? safeNextPath(form.get('next')) : '/studio/setup';
  } catch (error) {
    logger.error('auth.verify_failed', error);
    return { status: 'error', message: TRY_AGAIN, needsNewCode: false };
  }
  redirect(destination);
}

export async function signOutAction(): Promise<void> {
  try {
    await endSession();
  } catch (error) {
    logger.error('auth.sign_out_failed', error);
  }
  redirect('/sign-in');
}
