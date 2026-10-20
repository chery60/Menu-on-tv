import { randomInt, randomUUID } from 'node:crypto';
import { dataFilePath } from '@/lib/data-path';
import { openDocumentStore, type DocumentStore } from '@/lib/document-store';
import { generateToken, hashSecret, secretMatches } from '@/features/screens/tokens';
import type { Identifier } from './identifier';
import {
  accountsFileSchema,
  DEFAULT_TIME_ZONE,
  type AccountsFile,
  type Invite,
  type Member,
  type Restaurant,
  type RestaurantInput,
  type Role,
  type User,
} from './schema';

/** Storage boundary for people, their sign-in codes and sessions, restaurants and who works at each. */

export const CODE_TTL_MS = 10 * 60 * 1000;
export const MAX_CODE_ATTEMPTS = 5;
export const RESEND_AFTER_MS = 30 * 1000;
export const MAX_SENDS_PER_HOUR = 5;
/** Cap on codes waiting to be typed, so the public sign-in form can't grow the file without bound. */
export const MAX_PENDING_CODES = 2000;
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const MAX_SESSIONS_PER_USER = 10;
export const MAX_PEOPLE = 20;
const HOUR_MS = 60 * 60 * 1000;

export class AccountsLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AccountsLimitError';
  }
}

export type StartResult =
  | { readonly status: 'sent'; readonly challengeId: string; readonly code: string; readonly expiresAt: string; readonly resendAt: string }
  | { readonly status: 'wait'; readonly retryAfterSeconds: number };

export type VerifyResult =
  | { readonly status: 'signed-in'; readonly token: string; readonly userId: string; readonly expiresAt: string }
  | { readonly status: 'wrong'; readonly attemptsLeft: number }
  | { readonly status: 'expired' }
  | { readonly status: 'locked' };

export interface Access {
  readonly user: User;
  readonly restaurant: Restaurant | null;
  readonly role: Role | null;
}

export interface TeamMember extends Member {
  readonly phone: string | null;
  readonly email: string | null;
}

export type AddPersonResult = 'added' | 'invited' | 'already';
export type RemovePersonResult = 'removed' | 'last-owner' | 'unknown';

function emptyFile(): AccountsFile {
  return { version: 1, users: [], sessions: [], codes: [], sends: [], restaurants: [], members: [], invites: [] };
}

const isLive = (expiresAt: string, now: Date): boolean => Date.parse(expiresAt) > now.getTime();
/** Salted with the challenge id, so the same code twice never gives the same hash. */
const codeSecret = (challengeId: string, code: string): string => `${challengeId}:${code}`;
const generateCode = (): string => String(randomInt(0, 1_000_000)).padStart(6, '0');
const matchesUser = (user: User, { channel, value }: Identifier): boolean => (channel === 'phone' ? user.phone === value : user.email === value);

/** Drops expired codes and sessions, and send records older than an hour. */
function prune(file: AccountsFile, now: Date): AccountsFile {
  const hourAgo = now.getTime() - HOUR_MS;
  return {
    ...file,
    codes: file.codes.filter((code) => isLive(code.expiresAt, now)),
    sessions: file.sessions.filter((session) => isLive(session.expiresAt, now)),
    sends: file.sends.filter((send) => Date.parse(send.at) > hourAgo),
  };
}

/** The restaurant a person works at. shortcut: the first one they joined; add a switcher when people work at two. */
function firstMembership(file: AccountsFile, userId: string): Member | null {
  return file.members.filter((member) => member.userId === userId).sort((a, b) => a.addedAt.localeCompare(b.addedAt))[0] ?? null;
}

export class FileAccountsRepository {
  private readonly store: DocumentStore<AccountsFile>;

  constructor(filePath: string) {
    this.store = openDocumentStore<AccountsFile>({ name: 'accounts', filePath, createInitial: emptyFile, parse: (raw) => accountsFileSchema.parse(raw) });
  }

  async read(): Promise<AccountsFile> {
    return this.store.read();
  }

  /** Makes a code for this address. A new code replaces any older one for the same address. */
  async startSignIn(identifier: Identifier, now: Date): Promise<StartResult> {
    let result: StartResult = { status: 'wait', retryAfterSeconds: 60 };
    await this.store.update((current) => {
      const file = prune(current, now);
      const sends = file.sends.filter((send) => send.destination === identifier.value).map((send) => Date.parse(send.at));
      const last = Math.max(0, ...sends);
      if (last + RESEND_AFTER_MS > now.getTime()) {
        result = { status: 'wait', retryAfterSeconds: Math.ceil((last + RESEND_AFTER_MS - now.getTime()) / 1000) };
        return file;
      }
      if (sends.length >= MAX_SENDS_PER_HOUR) {
        result = { status: 'wait', retryAfterSeconds: Math.ceil((Math.min(...sends) + HOUR_MS - now.getTime()) / 1000) };
        return file;
      }
      if (file.codes.length >= MAX_PENDING_CODES) throw new AccountsLimitError('Lots of people are signing in right now. Try again in a minute.');
      const challengeId = randomUUID();
      const code = generateCode();
      const expiresAt = new Date(now.getTime() + CODE_TTL_MS).toISOString();
      result = { status: 'sent', challengeId, code, expiresAt, resendAt: new Date(now.getTime() + RESEND_AFTER_MS).toISOString() };
      return {
        ...file,
        codes: [
          ...file.codes.filter((entry) => entry.destination !== identifier.value),
          { id: challengeId, channel: identifier.channel, destination: identifier.value, codeHash: hashSecret(codeSecret(challengeId, code)), attempts: 0, createdAt: now.toISOString(), expiresAt },
        ],
        sends: [...file.sends, { destination: identifier.value, at: now.toISOString() }],
      };
    });
    return result;
  }

  /** Checks a typed code. The right code signs the person in, creating their account and joining any invites. */
  async verifySignIn(challengeId: string, code: string, now: Date): Promise<VerifyResult> {
    let result: VerifyResult = { status: 'expired' };
    await this.store.update((current) => {
      const file = prune(current, now);
      const challenge = file.codes.find((entry) => entry.id === challengeId);
      if (!challenge) return file;
      const rest = file.codes.filter((entry) => entry.id !== challengeId);
      if (!/^\d{6}$/.test(code) || !secretMatches(codeSecret(challengeId, code), challenge.codeHash)) {
        const attempts = challenge.attempts + 1;
        if (attempts >= MAX_CODE_ATTEMPTS) {
          result = { status: 'locked' };
          return { ...file, codes: rest };
        }
        result = { status: 'wrong', attemptsLeft: MAX_CODE_ATTEMPTS - attempts };
        return { ...file, codes: [...rest, { ...challenge, attempts }] };
      }

      const identifier: Identifier = { channel: challenge.channel, value: challenge.destination };
      const existing = file.users.find((user) => matchesUser(user, identifier));
      const user: User = existing ?? {
        id: randomUUID(),
        phone: identifier.channel === 'phone' ? identifier.value : null,
        email: identifier.channel === 'email' ? identifier.value : null,
        createdAt: now.toISOString(),
      };
      const invites = file.invites.filter((invite) => invite.destination === identifier.value);
      const joined: Member[] = invites
        .filter((invite) => !file.members.some((member) => member.userId === user.id && member.restaurantId === invite.restaurantId))
        .map((invite) => ({ restaurantId: invite.restaurantId, userId: user.id, role: invite.role, addedAt: now.toISOString() }));
      const token = generateToken();
      const expiresAt = new Date(now.getTime() + SESSION_TTL_MS).toISOString();
      const own = file.sessions.filter((session) => session.userId === user.id).slice(-(MAX_SESSIONS_PER_USER - 1));
      result = { status: 'signed-in', token, userId: user.id, expiresAt };
      return {
        ...file,
        codes: rest,
        users: existing ? file.users : [...file.users, user],
        invites: file.invites.filter((invite) => invite.destination !== identifier.value),
        members: [...file.members, ...joined],
        sessions: [
          ...file.sessions.filter((session) => session.userId !== user.id),
          ...own,
          { tokenHash: hashSecret(token), userId: user.id, createdAt: now.toISOString(), expiresAt },
        ],
      };
    });
    return result;
  }

  /** Who a session token belongs to and the restaurant they work at, or null for an unknown or expired session. */
  async access(token: string, now: Date): Promise<Access | null> {
    const file = await this.store.read();
    const session = file.sessions.find((entry) => secretMatches(token, entry.tokenHash));
    if (!session || !isLive(session.expiresAt, now)) return null;
    const user = file.users.find((entry) => entry.id === session.userId);
    if (!user) return null;
    const membership = firstMembership(file, user.id);
    const restaurant = membership ? (file.restaurants.find((entry) => entry.id === membership.restaurantId) ?? null) : null;
    return { user, restaurant, role: restaurant ? (membership?.role ?? null) : null };
  }

  async endSession(token: string): Promise<void> {
    const tokenHash = hashSecret(token);
    await this.store.update((file) => (file.sessions.some((session) => session.tokenHash === tokenHash) ? { ...file, sessions: file.sessions.filter((session) => session.tokenHash !== tokenHash) } : file));
  }

  async restaurant(restaurantId: string): Promise<Restaurant | null> {
    return (await this.store.read()).restaurants.find((entry) => entry.id === restaurantId) ?? null;
  }

  /** A person's own restaurant, with its first outlet. v0 allows one restaurant per account. */
  async createRestaurant(userId: string, input: RestaurantInput, now: Date): Promise<Restaurant> {
    let created: Restaurant | null = null;
    await this.store.update((file) => {
      if (!file.users.some((user) => user.id === userId)) throw new AccountsLimitError('Sign in again, then try again.');
      if (file.members.some((member) => member.userId === userId)) throw new AccountsLimitError('You already have a restaurant on MenuOnTV.');
      const stamp = now.toISOString();
      const restaurant: Restaurant = {
        id: randomUUID(),
        ...input,
        outlets: [{ id: randomUUID(), name: input.name, city: input.city, timeZone: DEFAULT_TIME_ZONE }],
        createdAt: stamp,
        updatedAt: stamp,
      };
      created = restaurant;
      return { ...file, restaurants: [...file.restaurants, restaurant], members: [...file.members, { restaurantId: restaurant.id, userId, role: 'owner', addedAt: stamp }] };
    });
    if (!created) throw new Error('Creating the restaurant finished without one.');
    return created;
  }

  async updateRestaurant(restaurantId: string, input: RestaurantInput, now: Date): Promise<Restaurant | null> {
    let updated: Restaurant | null = null;
    await this.store.update((file) => ({
      ...file,
      restaurants: file.restaurants.map((restaurant) => {
        if (restaurant.id !== restaurantId) return restaurant;
        const [first, ...others] = restaurant.outlets;
        updated = { ...restaurant, ...input, outlets: [{ ...first, name: input.name, city: input.city }, ...others], updatedAt: now.toISOString() };
        return updated;
      }),
    }));
    return updated;
  }

  async team(restaurantId: string): Promise<{ readonly members: readonly TeamMember[]; readonly invites: readonly Invite[] }> {
    const file = await this.store.read();
    const members = file.members
      .filter((member) => member.restaurantId === restaurantId)
      .map((member) => {
        const user = file.users.find((entry) => entry.id === member.userId);
        return { ...member, phone: user?.phone ?? null, email: user?.email ?? null };
      });
    return { members, invites: file.invites.filter((invite) => invite.restaurantId === restaurantId) };
  }

  /** Adds someone by mobile or email. People who already have an account join now; others join when they first sign in. */
  async addPerson(restaurantId: string, identifier: Identifier, role: Role, now: Date): Promise<AddPersonResult> {
    let result: AddPersonResult = 'already';
    await this.store.update((file) => {
      const people = file.members.filter((member) => member.restaurantId === restaurantId).length + file.invites.filter((invite) => invite.restaurantId === restaurantId).length;
      const user = file.users.find((entry) => matchesUser(entry, identifier));
      if (user && file.members.some((member) => member.userId === user.id && member.restaurantId === restaurantId)) return file;
      if (file.invites.some((invite) => invite.restaurantId === restaurantId && invite.destination === identifier.value)) return file;
      if (people >= MAX_PEOPLE) throw new AccountsLimitError(`A restaurant can have up to ${MAX_PEOPLE} people.`);
      if (user) {
        result = 'added';
        return { ...file, members: [...file.members, { restaurantId, userId: user.id, role, addedAt: now.toISOString() }] };
      }
      result = 'invited';
      const invite: Invite = { id: randomUUID(), restaurantId, channel: identifier.channel, destination: identifier.value, role, createdAt: now.toISOString() };
      return { ...file, invites: [...file.invites, invite] };
    });
    return result;
  }

  /** Takes someone off the restaurant. The last owner can't be removed, so a restaurant is never left without one. */
  async removePerson(restaurantId: string, userId: string): Promise<RemovePersonResult> {
    let result: RemovePersonResult = 'unknown';
    await this.store.update((file) => {
      const members = file.members.filter((member) => member.restaurantId === restaurantId);
      const target = members.find((member) => member.userId === userId);
      if (!target) return file;
      if (target.role === 'owner' && members.filter((member) => member.role === 'owner').length <= 1) {
        result = 'last-owner';
        return file;
      }
      result = 'removed';
      return { ...file, members: file.members.filter((member) => !(member.restaurantId === restaurantId && member.userId === userId)) };
    });
    return result;
  }

  async cancelInvite(restaurantId: string, inviteId: string): Promise<boolean> {
    let removed = false;
    await this.store.update((file) => {
      removed = file.invites.some((invite) => invite.id === inviteId && invite.restaurantId === restaurantId);
      return removed ? { ...file, invites: file.invites.filter((invite) => invite.id !== inviteId) } : file;
    });
    return removed;
  }
}

export function getAccountsRepository(): FileAccountsRepository {
  return new FileAccountsRepository(dataFilePath('accounts.json', process.env.ACCOUNTS_DATA_FILE));
}
