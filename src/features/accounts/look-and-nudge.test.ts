/**
 * QA checks for MT-34 slice 1 (docs/prd/mt-34-ten-minute-onboarding.md), at the accounts repository: the restaurant
 * keeps the look picked in step 2 and whether "Add today's special?" was answered ("Data it touches"). The kept look
 * is still there when the owner comes back the next day (line 3); the nudge, once answered, never comes back (line 5);
 * restaurants set up before this ship read as not picked and not answered ("Rules and edge cases"). Split on Paper is
 * what the picker starts on (Design).
 */
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LAYOUT_IDS, THEME_IDS } from '@/features/screen/types';
import { FileAccountsRepository } from './repository';
import { DEFAULT_LOOK } from './schema';

let directory: string;
let file: string;
let repo: FileAccountsRepository;
const NOW = new Date('2026-11-15T04:00:00.000Z');
const NEXT_DAY = new Date('2026-11-16T04:00:00.000Z');

async function restaurantFor(phone: string, name: string) {
  const started = await repo.startSignIn({ channel: 'phone', value: phone }, NOW);
  if (started.status !== 'sent') throw new Error('expected a code');
  const verified = await repo.verifySignIn(started.challengeId, started.code, NOW);
  if (verified.status !== 'signed-in') throw new Error('expected to sign in');
  return repo.createRestaurant(verified.userId, { name, city: 'Indiranagar', tagline: '' }, NOW);
}

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'menuontv-qa-mt34-'));
  file = join(directory, 'accounts.json');
  repo = new FileAccountsRepository(file);
});

afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

describe('the look picked while getting started', () => {
  it('starts on Split on Paper in the picker, and a new restaurant has picked nothing yet', async () => {
    expect(DEFAULT_LOOK).toEqual({ layout: 'split', theme: 'paper' });
    const chai = await restaurantFor('+919876500101', 'Chai Point');
    expect(chai).toMatchObject({ look: null, specialNudgeAnswered: false });
  });

  it('is still there the next day, read back from disk (line 3)', async () => {
    const chai = await restaurantFor('+919876500102', 'Chai Point');
    expect(await repo.setLook(chai.id, { layout: 'board', theme: 'night' }, NOW)).toMatchObject({ look: { layout: 'board', theme: 'night' } });
    const nextDay = new FileAccountsRepository(file);
    expect((await nextDay.restaurant(chai.id))?.look).toEqual({ layout: 'board', theme: 'night' });
  });

  it('takes each of the six layouts in both colours, and keeping again replaces the choice (line 2)', async () => {
    const chai = await restaurantFor('+919876500103', 'Chai Point');
    expect(LAYOUT_IDS).toHaveLength(6);
    expect(THEME_IDS).toEqual(['paper', 'night']);
    for (const layout of LAYOUT_IDS) {
      for (const theme of THEME_IDS) {
        expect((await repo.setLook(chai.id, { layout, theme }, NOW))?.look).toEqual({ layout, theme });
        expect((await new FileAccountsRepository(file).restaurant(chai.id))?.look).toEqual({ layout, theme });
      }
    }
  });

  it('changes only the restaurant asked, and only its look', async () => {
    const chai = await restaurantFor('+919876500104', 'Chai Point');
    const dosa = await restaurantFor('+919876500105', 'Dosa Corner');
    await repo.setLook(chai.id, { layout: 'lbar', theme: 'night' }, NOW);
    expect(await repo.restaurant(dosa.id)).toMatchObject({ name: 'Dosa Corner', look: null, specialNudgeAnswered: false });
    expect(await repo.restaurant(chai.id)).toMatchObject({ name: 'Chai Point', city: 'Indiranagar', look: { layout: 'lbar', theme: 'night' }, specialNudgeAnswered: false });
  });
});

describe('"Add today\'s special?", answered once', () => {
  it('stays answered for good: read back the next day, answered again, or after the look changes (line 5)', async () => {
    const chai = await restaurantFor('+919876500106', 'Chai Point');
    await repo.setLook(chai.id, { layout: 'spotlight', theme: 'paper' }, NOW);
    expect(await repo.answerSpecialNudge(chai.id, NOW)).toMatchObject({ specialNudgeAnswered: true, look: { layout: 'spotlight', theme: 'paper' } });

    const nextDay = new FileAccountsRepository(file);
    expect((await nextDay.restaurant(chai.id))?.specialNudgeAnswered).toBe(true);
    expect((await nextDay.answerSpecialNudge(chai.id, NEXT_DAY))?.specialNudgeAnswered).toBe(true);
    expect(await nextDay.setLook(chai.id, { layout: 'ticker', theme: 'night' }, NEXT_DAY)).toMatchObject({ specialNudgeAnswered: true, look: { layout: 'ticker', theme: 'night' } });
    expect((await new FileAccountsRepository(file).restaurant(chai.id))?.specialNudgeAnswered).toBe(true);
  });

  it('answered at one restaurant still shows at another', async () => {
    const chai = await restaurantFor('+919876500107', 'Chai Point');
    const dosa = await restaurantFor('+919876500108', 'Dosa Corner');
    await repo.answerSpecialNudge(chai.id, NOW);
    expect((await repo.restaurant(dosa.id))?.specialNudgeAnswered).toBe(false);
  });
});

describe('an unknown restaurant', () => {
  it('gets nothing back, and nothing saved changes', async () => {
    await restaurantFor('+919876500109', 'Chai Point');
    const saved = async () => JSON.parse(await readFile(file, 'utf8')) as unknown;
    const before = await saved();
    expect(await repo.setLook('nowhere', { layout: 'board', theme: 'night' }, NOW)).toBeNull();
    expect(await repo.answerSpecialNudge('nowhere', NOW)).toBeNull();
    expect(await saved()).toEqual(before);
  });
});

describe('a restaurant set up before this ships', () => {
  const outlet = { id: 'o1', name: 'Old Cafe', city: 'HSR', timeZone: 'Asia/Kolkata' };
  const old = { id: 'r1', name: 'Old Cafe', tagline: 'Since 1998', city: 'HSR', outlets: [outlet], fssai: true, createdAt: NOW.toISOString(), updatedAt: NOW.toISOString() };

  beforeEach(async () => {
    await writeFile(file, JSON.stringify({ version: 1, users: [], sessions: [], codes: [], sends: [], restaurants: [old], members: [], invites: [] }));
  });

  it('reads as not picked and not answered, so the path offers those steps', async () => {
    expect(await new FileAccountsRepository(file).restaurant('r1')).toMatchObject({ name: 'Old Cafe', fssai: true, look: null, specialNudgeAnswered: false });
  });

  it('can keep a look and answer the nudge, and keeps everything it had', async () => {
    const legacy = new FileAccountsRepository(file);
    await legacy.setLook('r1', { layout: 'portrait', theme: 'paper' }, NEXT_DAY);
    await legacy.answerSpecialNudge('r1', NEXT_DAY);
    expect(await new FileAccountsRepository(file).restaurant('r1')).toMatchObject({
      name: 'Old Cafe',
      tagline: 'Since 1998',
      city: 'HSR',
      fssai: true,
      outlets: [outlet],
      look: { layout: 'portrait', theme: 'paper' },
      specialNudgeAnswered: true,
    });
  });
});
