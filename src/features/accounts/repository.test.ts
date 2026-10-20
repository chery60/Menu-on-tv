import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Identifier } from './identifier';
import {
  AccountsLimitError,
  CODE_TTL_MS,
  FileAccountsRepository,
  MAX_CODE_ATTEMPTS,
  MAX_PEOPLE,
  MAX_SENDS_PER_HOUR,
  RESEND_AFTER_MS,
  SESSION_TTL_MS,
  type StartResult,
} from './repository';

let directory: string;
let file: string;
let repo: FileAccountsRepository;
const NOW = new Date('2026-10-19T10:00:00.000Z');
const later = (ms: number): Date => new Date(NOW.getTime() + ms);
const owner: Identifier = { channel: 'phone', value: '+919876543210' };
const helper: Identifier = { channel: 'email', value: 'helper@cafe.in' };
const cafe = { name: 'Chai Point', city: 'Indiranagar', tagline: 'Fresh chai all day' };

function sent(result: StartResult) {
  if (result.status !== 'sent') throw new Error(`expected a code, got ${result.status}`);
  return result;
}

async function signIn(identifier: Identifier, at = NOW) {
  const { challengeId, code } = sent(await repo.startSignIn(identifier, at));
  const verified = await repo.verifySignIn(challengeId, code, at);
  if (verified.status !== 'signed-in') throw new Error('expected to sign in');
  return verified;
}

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'menutelly-accounts-'));
  file = join(directory, 'accounts.json');
  repo = new FileAccountsRepository(file);
});

afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

describe('sign-in codes', () => {
  it('are six digits, stored only as a hash, and sign the person in once', async () => {
    const { challengeId, code } = sent(await repo.startSignIn(owner, NOW));
    expect(code).toMatch(/^\d{6}$/);
    expect(await readFile(file, 'utf8')).not.toContain(`"${code}"`);

    const verified = await repo.verifySignIn(challengeId, code, later(1000));
    expect(verified.status).toBe('signed-in');
    expect(await repo.verifySignIn(challengeId, code, later(2000))).toEqual({ status: 'expired' });
  });

  it('count wrong tries and lock after the last one', async () => {
    const { challengeId, code } = sent(await repo.startSignIn(owner, NOW));
    const wrong = code === '000000' ? '111111' : '000000';
    expect(await repo.verifySignIn(challengeId, wrong, NOW)).toEqual({ status: 'wrong', attemptsLeft: MAX_CODE_ATTEMPTS - 1 });
    expect(await repo.verifySignIn(challengeId, 'abc', NOW)).toEqual({ status: 'wrong', attemptsLeft: MAX_CODE_ATTEMPTS - 2 });
    for (let attempt = 3; attempt < MAX_CODE_ATTEMPTS; attempt += 1) await repo.verifySignIn(challengeId, wrong, NOW);
    expect(await repo.verifySignIn(challengeId, wrong, NOW)).toEqual({ status: 'locked' });
    expect(await repo.verifySignIn(challengeId, code, NOW)).toEqual({ status: 'expired' });
  });

  it('expire after ten minutes', async () => {
    const { challengeId, code } = sent(await repo.startSignIn(owner, NOW));
    expect(await repo.verifySignIn(challengeId, code, later(CODE_TTL_MS + 1))).toEqual({ status: 'expired' });
  });

  it('make the person wait between codes and cap codes an hour', async () => {
    const first = sent(await repo.startSignIn(owner, NOW));
    expect(await repo.startSignIn(owner, later(5_000))).toEqual({ status: 'wait', retryAfterSeconds: 25 });

    const second = sent(await repo.startSignIn(owner, later(RESEND_AFTER_MS)));
    expect(await repo.verifySignIn(first.challengeId, first.code, later(RESEND_AFTER_MS))).toEqual({ status: 'expired' });
    expect((await repo.verifySignIn(second.challengeId, second.code, later(RESEND_AFTER_MS))).status).toBe('signed-in');

    for (let send = 2; send < MAX_SENDS_PER_HOUR; send += 1) sent(await repo.startSignIn(owner, later(RESEND_AFTER_MS * send)));
    const capped = await repo.startSignIn(owner, later(RESEND_AFTER_MS * MAX_SENDS_PER_HOUR));
    expect(capped.status).toBe('wait');
    expect(sent(await repo.startSignIn(helper, later(RESEND_AFTER_MS * MAX_SENDS_PER_HOUR))).code).toMatch(/^\d{6}$/);
  });
});

describe('sessions', () => {
  it('belong to one person, last 30 days and end on sign out', async () => {
    const { token, userId } = await signIn(owner);
    expect((await repo.access(token, later(1000)))?.user.id).toBe(userId);
    expect(await repo.access(token, later(SESSION_TTL_MS + 1))).toBeNull();
    expect(await repo.access('not-a-token', NOW)).toBeNull();
    await repo.endSession(token);
    expect(await repo.access(token, NOW)).toBeNull();
  });

  it('reuse the account when the same number signs in again', async () => {
    const first = await signIn(owner);
    const second = await signIn(owner, later(RESEND_AFTER_MS));
    expect(second.userId).toBe(first.userId);
    expect((await repo.read()).users).toHaveLength(1);
  });
});

describe('restaurants and people', () => {
  it('make the creator the owner, once', async () => {
    const { token, userId } = await signIn(owner);
    expect((await repo.access(token, NOW))?.restaurant).toBeNull();
    const restaurant = await repo.createRestaurant(userId, cafe, NOW);
    expect(restaurant.outlets[0]).toMatchObject({ name: 'Chai Point', city: 'Indiranagar', timeZone: 'Asia/Kolkata' });
    expect(await repo.access(token, NOW)).toMatchObject({ restaurant: { id: restaurant.id }, role: 'owner' });
    await expect(repo.createRestaurant(userId, cafe, NOW)).rejects.toBeInstanceOf(AccountsLimitError);
  });

  it('let invited staff join on their first sign-in, with their role', async () => {
    const { userId } = await signIn(owner);
    const restaurant = await repo.createRestaurant(userId, cafe, NOW);
    expect(await repo.addPerson(restaurant.id, helper, 'staff', NOW)).toBe('invited');
    expect(await repo.addPerson(restaurant.id, helper, 'staff', NOW)).toBe('already');

    const staff = await signIn(helper);
    expect(await repo.access(staff.token, NOW)).toMatchObject({ restaurant: { id: restaurant.id }, role: 'staff' });
    expect((await repo.team(restaurant.id)).invites).toHaveLength(0);
    expect((await repo.team(restaurant.id)).members.map((member) => member.email)).toContain('helper@cafe.in');
  });

  it('add people who already have an account at once', async () => {
    const { userId } = await signIn(owner);
    const helperSession = await signIn(helper);
    const restaurant = await repo.createRestaurant(userId, cafe, NOW);
    expect(await repo.addPerson(restaurant.id, helper, 'owner', NOW)).toBe('added');
    expect(await repo.access(helperSession.token, NOW)).toMatchObject({ role: 'owner' });
  });

  it('never remove the last owner, and remove access the moment someone is taken off', async () => {
    const { userId } = await signIn(owner);
    const restaurant = await repo.createRestaurant(userId, cafe, NOW);
    expect(await repo.removePerson(restaurant.id, userId)).toBe('last-owner');

    await repo.addPerson(restaurant.id, helper, 'staff', NOW);
    const staff = await signIn(helper);
    expect(await repo.removePerson(restaurant.id, staff.userId)).toBe('removed');
    expect(await repo.access(staff.token, NOW)).toMatchObject({ restaurant: null, role: null });
    expect(await repo.removePerson(restaurant.id, staff.userId)).toBe('unknown');
  });

  it('keep each restaurant’s people to itself', async () => {
    const first = await signIn(owner);
    const second = await signIn(helper);
    const mine = await repo.createRestaurant(first.userId, cafe, NOW);
    const theirs = await repo.createRestaurant(second.userId, { ...cafe, name: 'Dosa Hut' }, NOW);
    await repo.addPerson(theirs.id, { channel: 'phone', value: '+919000000001' }, 'staff', NOW);
    const [invite] = (await repo.team(theirs.id)).invites;
    expect(await repo.cancelInvite(mine.id, invite.id)).toBe(false);
    expect(await repo.removePerson(mine.id, second.userId)).toBe('unknown');
    expect(await repo.cancelInvite(theirs.id, invite.id)).toBe(true);
  });

  it('cap how many people a restaurant has', async () => {
    const { userId } = await signIn(owner);
    const restaurant = await repo.createRestaurant(userId, cafe, NOW);
    for (let person = 1; person < MAX_PEOPLE; person += 1) await repo.addPerson(restaurant.id, { channel: 'phone', value: `+9190000${String(person).padStart(5, '0')}` }, 'staff', NOW);
    await expect(repo.addPerson(restaurant.id, helper, 'staff', NOW)).rejects.toBeInstanceOf(AccountsLimitError);
  });

  it('update the name, area and line under the name', async () => {
    const { userId } = await signIn(owner);
    const restaurant = await repo.createRestaurant(userId, cafe, NOW);
    const updated = await repo.updateRestaurant(restaurant.id, { name: 'Chai Point Cafe', city: 'HSR Layout', tagline: '' }, later(1000));
    expect(updated).toMatchObject({ name: 'Chai Point Cafe', outlets: [{ name: 'Chai Point Cafe', city: 'HSR Layout' }] });
    expect(await repo.updateRestaurant('missing', cafe, NOW)).toBeNull();
  });
});
