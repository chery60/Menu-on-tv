import 'server-only';
import { siteConfig } from '@/config/site';
import { CODE_TTL_MS } from './repository';
import type { Identifier } from './identifier';

/**
 * Sends a sign-in code by email (Resend) or text message (Twilio), whichever the code is for and has keys set.
 * In development (or on a test site that opts in) with no provider, the code is handed back to show on screen.
 * In production with no provider, sign-in fails loudly instead of pretending a code was sent.
 */

export type Delivery = { readonly via: 'email' | 'sms' } | { readonly via: 'screen'; readonly code: string };

export class DeliveryError extends Error {
  constructor(
    message: string,
    readonly reason: 'not-configured' | 'rejected',
  ) {
    super(message);
    this.name = 'DeliveryError';
  }
}

const MINUTES = CODE_TTL_MS / 60_000;

function emailBody(code: string): string {
  return [`Your MenuOnTV sign-in code is ${code}.`, '', `It works for ${MINUTES} minutes. If you didn’t ask for it, you can ignore this email.`].join('\n');
}

/** The last line lets Android Chrome offer the code on our site (the WebOTP format); iOS reads the code on its own. */
function smsBody(code: string): string {
  return `${code} is your MenuOnTV sign-in code. It works for ${MINUTES} minutes.\n\n@${new URL(siteConfig.url).host} #${code}`;
}

/** Whether codes can go out by this channel: its provider keys are set. */
export function canSend(channel: Identifier['channel']): boolean {
  if (channel === 'email') return Boolean(process.env.RESEND_API_KEY && process.env.AUTH_EMAIL_FROM);
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM);
}

async function sendEmail(to: string, code: string, fetcher: typeof fetch): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.AUTH_EMAIL_FROM;
  if (!canSend('email') || !key || !from) return false;
  const response = await fetcher('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject: `${code} is your MenuOnTV code`, text: emailBody(code) }),
  });
  if (!response.ok) throw new DeliveryError(`Resend answered ${response.status}`, 'rejected');
  return true;
}

async function sendSms(to: string, code: string, fetcher: typeof fetch): Promise<boolean> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM;
  if (!canSend('phone') || !sid || !token || !from) return false;
  const response = await fetcher(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, {
    method: 'POST',
    headers: { Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ To: to, From: from, Body: smsBody(code) }),
  });
  if (!response.ok) throw new DeliveryError(`Twilio answered ${response.status}`, 'rejected');
  return true;
}

export async function sendSignInCode(identifier: Identifier, code: string, fetcher: typeof fetch = fetch): Promise<Delivery> {
  const sent = identifier.channel === 'email' ? await sendEmail(identifier.value, code, fetcher) : await sendSms(identifier.value, code, fetcher);
  if (sent) return { via: identifier.channel === 'email' ? 'email' : 'sms' };
  // A test site may opt in with SIGN_IN_CODES_ON_SCREEN=true: then anyone can sign in as anyone, so never on the real site.
  if (process.env.NODE_ENV !== 'production' || process.env.SIGN_IN_CODES_ON_SCREEN === 'true') return { via: 'screen', code };
  throw new DeliveryError(`No ${identifier.channel} provider is set up`, 'not-configured');
}
