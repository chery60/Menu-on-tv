import { z } from 'zod';

/** Where a sign-in code goes: a mobile number in E.164 form, or an email address in lower case. */
export type Channel = 'phone' | 'email';

export interface Identifier {
  readonly channel: Channel;
  readonly value: string;
}

const EMAIL = z.email().max(254);
const INDIA_MOBILE = /^[6-9]\d{9}$/;
const E164 = /^\+[1-9]\d{7,14}$/;

const phone = (value: string): Identifier => ({ channel: 'phone', value });

/**
 * Reads what an owner typed into the one sign-in field: an Indian mobile number in any usual form
 * (98765 43210, 098765 43210, +91 98765-43210), an international number starting with +, or an email.
 */
export function parseIdentifier(raw: string): Identifier | null {
  const text = raw.trim();
  if (text.length === 0 || text.length > 254) return null;
  if (text.includes('@')) {
    const email = EMAIL.safeParse(text.toLowerCase());
    return email.success ? { channel: 'email', value: email.data } : null;
  }
  const compact = text.replace(/[\s().-]/g, '');
  const digits = compact.startsWith('+') ? compact.slice(1) : compact;
  if (!/^\d+$/.test(digits)) return null;
  if (INDIA_MOBILE.test(digits)) return phone(`+91${digits}`);
  if (digits.length === 11 && digits.startsWith('0') && INDIA_MOBILE.test(digits.slice(1))) return phone(`+91${digits.slice(1)}`);
  if (digits.length === 12 && digits.startsWith('91') && INDIA_MOBILE.test(digits.slice(2))) return phone(`+${digits}`);
  if (compact.startsWith('+') && E164.test(compact)) return phone(compact);
  return null;
}

/** How we show a sign-in address back to its owner: Indian mobiles grouped 5 and 5. */
export function formatIdentifier({ channel, value }: Identifier): string {
  if (channel === 'phone' && /^\+91\d{10}$/.test(value)) return `+91 ${value.slice(3, 8)} ${value.slice(8)}`;
  return value;
}
