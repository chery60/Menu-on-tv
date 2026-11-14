import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getAccountsRepository } from '@/features/accounts/repository';
import { getFunnelRepository } from '@/features/funnel/repository';

/** The funnel page's "mark as test", called directly as anyone could: it asks for the team password itself. */

vi.mock('next/cache', () => ({ refresh: vi.fn() }));
let authorization: string | null = null;
vi.mock('next/headers', () => ({ headers: async () => new Headers(authorization ? { authorization } : {}) }));

const { setTestRestaurantAction } = await import('./actions');

const PASSWORD = 'team-secret';
const IDLE = { status: 'idle' } as const;
const basic = (password: string) => `Basic ${btoa(`team:${password}`)}`;
const mark = (restaurantId: string, test: string) => {
  const form = new FormData();
  form.set('restaurantId', restaurantId);
  form.set('test', test);
  return setTestRestaurantAction(IDLE, form);
};

let directory: string;
let restaurantId: string;

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'menutelly-funnel-team-'));
  vi.stubEnv('ACCOUNTS_DATA_FILE', join(directory, 'accounts.json'));
  vi.stubEnv('FUNNEL_DATA_FILE', undefined);
  vi.stubEnv('TRACKER_PASSWORD', PASSWORD);
  authorization = null;
  const accounts = getAccountsRepository();
  const started = await accounts.startSignIn({ channel: 'email', value: 'owner@example.com' }, new Date());
  if (started.status !== 'sent') throw new Error('expected a code');
  const verified = await accounts.verifySignIn(started.challengeId, started.code, new Date());
  if (verified.status !== 'signed-in') throw new Error('expected to sign in');
  restaurantId = (await accounts.createRestaurant(verified.userId, { name: 'Test Kitchen', city: 'Pune', tagline: '' }, new Date())).id;
});

afterEach(async () => {
  vi.unstubAllEnvs();
  await rm(directory, { recursive: true, force: true });
});

const isTest = async () => (await getFunnelRepository().read()).restaurants[restaurantId]?.test ?? false;

describe('mark a restaurant as test', () => {
  it('is refused without the team password, or with the wrong one', async () => {
    expect(await mark(restaurantId, 'true')).toMatchObject({ status: 'error', message: expect.stringMatching(/team password/) });
    authorization = basic('guess');
    expect(await mark(restaurantId, 'true')).toMatchObject({ status: 'error' });
    expect(await isTest()).toBe(false);
  });

  it('marks and unmarks with the team password', async () => {
    authorization = basic(PASSWORD);
    expect(await mark(restaurantId, 'true')).toMatchObject({ status: 'ok' });
    expect(await isTest()).toBe(true);
    expect(await mark(restaurantId, 'false')).toMatchObject({ status: 'ok' });
    expect(await isTest()).toBe(false);
  });

  it('only takes a restaurant that is on MenuOnTV', async () => {
    authorization = basic(PASSWORD);
    expect(await mark('not-a-restaurant', 'true')).toMatchObject({ status: 'error' });
    expect(await mark(restaurantId, 'maybe')).toMatchObject({ status: 'error' });
    expect((await getFunnelRepository().read()).restaurants).toEqual({});
  });

  it('follows the proxy when no password is set: open in development, shut in production', async () => {
    vi.stubEnv('TRACKER_PASSWORD', undefined);
    vi.stubEnv('NODE_ENV', 'production');
    expect(await mark(restaurantId, 'true')).toMatchObject({ status: 'error' });
    vi.stubEnv('NODE_ENV', 'development');
    expect(await mark(restaurantId, 'true')).toMatchObject({ status: 'ok' });
  });
});
