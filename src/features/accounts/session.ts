import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { cache } from 'react';
import { SESSION_COOKIE } from './cookie';
import { getAccountsRepository, type Access } from './repository';
import type { Restaurant, Role } from './schema';

/** The owner app's session: a random token in an HttpOnly cookie, stored on our side only as a hash. */

const TOKEN_SHAPE = /^[A-Za-z0-9_-]{43}$/;

export interface RestaurantAccess extends Access {
  readonly restaurant: Restaurant;
  readonly role: Role;
}

/** Who is signed in on this request, read once per request. */
export const currentAccess = cache(async (): Promise<Access | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || !TOKEN_SHAPE.test(token)) return null;
  // Sessions expire by the clock, so this is request-time work, never part of a prerender.
  await connection();
  return getAccountsRepository().access(token, new Date());
});

export function hasRestaurant(access: Access | null): access is RestaurantAccess {
  return Boolean(access?.restaurant && access.role);
}

/** For owner app pages: someone signed in with a restaurant, or a redirect to sign in or to set one up. */
export async function requireRestaurant(nextPath: string): Promise<RestaurantAccess> {
  const access = await currentAccess();
  if (!access) redirect(`/sign-in?next=${encodeURIComponent(nextPath)}`);
  if (!hasRestaurant(access)) redirect('/studio/setup');
  return access;
}

export async function startSession(token: string, expiresAt: string): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(expiresAt),
  });
}

/** Signs this browser out: the cookie goes first, so a failed write can't leave someone signed in. */
export async function endSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  store.delete(SESSION_COOKIE);
  if (token && TOKEN_SHAPE.test(token)) await getAccountsRepository().endSession(token);
}
