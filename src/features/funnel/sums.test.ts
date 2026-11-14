import { describe, expect, it } from 'vitest';
import type { FunnelFile, FunnelRestaurant } from './schema';
import { funnelReport, type FunnelSources } from './sums';

/** Monday 16 November 2026, 10:00 in India. */
const NOW = new Date('2026-11-16T04:30:00.000Z');
const MINUTE = 60 * 1000;

const user = (id: string, createdAt: string) => ({ id, phone: null, email: null, createdAt });
const restaurant = (id: string, name: string, createdAt: string) => ({ id, name, tagline: '', city: 'Pune', outlets: [{ id: `${id}-o`, name, city: 'Pune', timeZone: 'Asia/Kolkata' }], fssai: false, createdAt, updatedAt: createdAt });
const member = (restaurantId: string, userId: string, addedAt: string) => ({ restaurantId, userId, role: 'owner' as const, addedAt });
const entry = (fields: Partial<FunnelRestaurant>): FunnelRestaurant => ({ channel: 'own', test: false, steps: {}, active: {}, ...fields });
const link = (createdAt: string) => ({ id: createdAt, label: 'TV 1', tokenHash: 'a'.repeat(64), createdAt, lastSeenAt: null, lastVersion: null, lastSlide: null });

const funnel: FunnelFile = {
  version: 1,
  signups: { u5: '2026-11-15T00:00:00.000Z', u6: '2026-11-15T00:00:00.000Z', u7: '2026-11-15T00:00:00.000Z' },
  restaurants: {
    r1: entry({
      steps: { 'signed-up': '2026-11-10T04:00:00.000Z', 'set-up': '2026-11-10T04:05:00.000Z', menu: '2026-11-10T04:10:00.000Z', tv: '2026-11-10T04:15:00.000Z', 'on-air': '2026-11-10T04:18:00.000Z' },
      active: { '2026-11-11': 'change', '2026-11-16': 'quick' },
    }),
    r2: entry({ channel: 'rep-1', steps: { 'set-up': '2026-11-12T04:10:00.000Z' }, active: { '2026-11-15': 'change' } }),
    r4: entry({ test: true, steps: { 'set-up': '2026-11-14T04:00:00.000Z' }, active: { '2026-11-16': 'quick' } }),
    gone: entry({ steps: { 'signed-up': '2026-11-14T04:00:00.000Z', 'on-air': '2026-11-14T04:05:00.000Z' } }),
  },
};

const sources: FunnelSources = {
  funnel,
  accounts: {
    users: [user('u1', '2026-11-10T04:00:00.000Z'), user('u2', '2026-11-12T04:00:00.000Z'), user('u3', '2026-09-01T04:00:00.000Z'), user('u4', '2026-11-14T03:00:00.000Z'), user('u5', '2026-11-15T00:00:00.000Z'), user('u6', '2026-11-15T00:00:00.000Z')],
    restaurants: [restaurant('r1', 'Chai Point', '2026-11-10T04:05:00.000Z'), restaurant('r2', 'Dosa Corner', '2026-11-12T04:10:00.000Z'), restaurant('r3', 'Old Cafe', '2026-09-01T04:10:00.000Z'), restaurant('r4', 'Test Kitchen', '2026-11-14T04:00:00.000Z')],
    members: [member('r1', 'u1', '2026-11-10T04:05:00.000Z'), member('r1', 'u6', '2026-11-15T01:00:00.000Z'), member('r2', 'u2', '2026-11-12T04:10:00.000Z'), member('r3', 'u3', '2026-09-01T04:10:00.000Z'), member('r4', 'u4', '2026-11-14T04:00:00.000Z')],
  },
  screens: [
    { restaurantId: 'r1', links: [link('2026-11-10T04:16:00.000Z')] },
    { restaurantId: 'r3', links: [link('2026-09-03T04:00:00.000Z'), link('2026-09-02T04:00:00.000Z')] },
  ],
};

const counts = (report: ReturnType<typeof funnelReport>) => Object.fromEntries(report.steps.map(({ step, count }) => [step, count]));

describe('the funnel', () => {
  it('counts each step for the period, with reaching a step counting the ones before it', () => {
    const report = funnelReport(sources, { now: NOW, days: 7 });
    // Chai Point and Dosa Corner, plus u5 who signed up with no restaurant; not u6 (now staff) or u7 (no account).
    expect(counts(report)).toEqual({ 'signed-up': 3, 'set-up': 2, menu: 1, look: null, tv: 1, 'on-air': 1, paid: null });
    expect(report.steps.map(({ share }) => share)).toEqual([null, 2 / 3, 0.5, null, 1, 1, null]);
    expect(report.biggestDrop).toBe('set-up');
  });

  it('gives restaurants from before the funnel the steps their data shows, and the earliest time wins', () => {
    const report = funnelReport(sources, { now: NOW, days: 90 });
    expect(counts(report)).toEqual({ 'signed-up': 4, 'set-up': 3, menu: 2, look: null, tv: 2, 'on-air': 1, paid: null });
    expect(report.restaurants.find((row) => row.restaurantId === 'r3')).toEqual({ restaurantId: 'r3', name: 'Old Cafe', channel: 'own', ms: null, reached: 'tv' });
    // Dosa Corner's sign-up comes from its owner's account: two days ago, inside 7 days.
    expect(funnelReport(sources, { now: NOW, days: 7 }).restaurants.map((row) => row.restaurantId)).toContain('r2');
  });

  it('splits by channel, with people who have no restaurant yet counted as on their own', () => {
    expect(counts(funnelReport(sources, { now: NOW, days: 7, channel: 'own' }))).toMatchObject({ 'signed-up': 2, 'set-up': 1 });
    expect(counts(funnelReport(sources, { now: NOW, days: 7, channel: 'rep-1' }))).toMatchObject({ 'signed-up': 1, 'set-up': 1, menu: 0 });
  });

  it('leaves out test restaurants and restaurants no longer in accounts, and lists the tests', () => {
    const report = funnelReport(sources, { now: NOW, days: 7 });
    expect(report.restaurants.map((row) => row.restaurantId)).not.toContain('r4');
    expect(report.restaurants.map((row) => row.restaurantId)).not.toContain('gone');
    expect(report.tests).toEqual([{ restaurantId: 'r4', name: 'Test Kitchen' }]);
  });

  it('is empty for a period with no restaurants', () => {
    const report = funnelReport({ funnel: { version: 1, signups: {}, restaurants: {} }, accounts: { users: [], restaurants: [], members: [] }, screens: [] }, { now: NOW, days: 30 });
    expect(counts(report)).toEqual({ 'signed-up': 0, 'set-up': 0, menu: 0, look: null, tv: 0, 'on-air': 0, paid: null });
    expect(report.steps.every(({ share }) => share === null)).toBe(true);
    expect(report.biggestDrop).toBeNull();
    expect(report.medianToFirstScreenMs).toBeNull();
    expect(report.restaurants).toEqual([]);
  });
});

describe('time to first screen', () => {
  it('lists restaurants not on air first, longest waiting first, then the slowest times, with the median', () => {
    const report = funnelReport(sources, { now: NOW, days: 90 });
    expect(report.restaurants.map((row) => [row.name, row.ms, row.reached])).toEqual([
      ['Old Cafe', null, 'tv'],
      ['Dosa Corner', null, 'set-up'],
      ['Chai Point', 18 * MINUTE, 'on-air'],
    ]);
    expect(report.medianToFirstScreenMs).toBe(18 * MINUTE);
  });

  it('takes the middle of two times', () => {
    const second = { ...funnel.restaurants.r2, steps: { 'set-up': '2026-11-12T04:10:00.000Z', 'on-air': '2026-11-12T04:30:00.000Z' } };
    const report = funnelReport({ ...sources, funnel: { ...funnel, restaurants: { ...funnel.restaurants, r2: second } } }, { now: NOW, days: 7 });
    expect(report.restaurants.map((row) => row.ms)).toEqual([30 * MINUTE, 18 * MINUTE]);
    expect(report.medianToFirstScreenMs).toBe(24 * MINUTE);
  });
});

describe('weekly active', () => {
  it('counts the last 8 Monday-to-Sunday weeks in India time, out of restaurants set up by each week’s end', () => {
    const { weeks } = funnelReport(sources, { now: NOW, days: 7 });
    expect(weeks).toHaveLength(8);
    expect(weeks[0].weekStart).toBe('2026-09-28');
    expect(weeks.slice(-3)).toEqual([
      { weekStart: '2026-11-02', restaurants: 1, changed: 0, quick: 0 },
      { weekStart: '2026-11-09', restaurants: 3, changed: 2, quick: 0 },
      { weekStart: '2026-11-16', restaurants: 3, changed: 1, quick: 1 },
    ]);
  });

  it('puts a restaurant set up after midnight in India in the new week', () => {
    const late = { ...sources, accounts: { ...sources.accounts, restaurants: [restaurant('r9', 'Late Night', '2026-11-15T19:00:00.000Z')], members: [] } };
    const { weeks } = funnelReport(late, { now: NOW, days: 7 });
    expect(weeks.slice(-2).map((week) => week.restaurants)).toEqual([0, 1]);
  });
});
