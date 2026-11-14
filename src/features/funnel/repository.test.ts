import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FileFunnelRepository, getFunnelRepository, pruned, withActivity, withSetUp, withSignUp, withStep, withTest } from './repository';
import type { FunnelFile } from './schema';

const NOW = new Date('2026-11-16T04:30:00.000Z');
const LATER = new Date('2026-11-16T09:00:00.000Z');
const EMPTY: FunnelFile = { version: 1, signups: {}, restaurants: {} };

let directory: string;
let file: string;

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'menutelly-funnel-'));
  file = join(directory, 'funnel.json');
});

afterEach(async () => {
  vi.unstubAllEnvs();
  await rm(directory, { recursive: true, force: true });
});

describe('funnel changes', () => {
  it('keep the first time each step happened, and give back the same file when nothing is new', () => {
    const first = withStep(EMPTY, 'r1', 'menu', NOW.toISOString());
    expect(first.restaurants.r1).toEqual({ channel: 'own', test: false, steps: { menu: NOW.toISOString() }, active: {} });
    expect(withStep(first, 'r1', 'menu', LATER.toISOString())).toBe(first);
    expect(withSignUp(withSignUp(EMPTY, 'u1', 'a'), 'u1', 'b').signups).toEqual({ u1: 'a' });
  });

  it('move a sign-up onto the restaurant when it is set up', () => {
    const signedUp = withSignUp(EMPTY, 'u1', '2026-11-16T04:00:00.000Z');
    const setUp = withSetUp(signedUp, 'r1', 'u1', '2026-11-16T04:00:00.000Z', NOW.toISOString());
    expect(setUp.signups).toEqual({});
    expect(setUp.restaurants.r1.steps).toEqual({ 'signed-up': '2026-11-16T04:00:00.000Z', 'set-up': NOW.toISOString() });
    expect(withSetUp(setUp, 'r1', 'u1', 'x', LATER.toISOString())).toBe(setUp);
  });

  it('mark a day once, upgrading a plain change to a quick action but never back', () => {
    const changed = withActivity(EMPTY, 'r1', '2026-11-16', 'change');
    expect(withActivity(changed, 'r1', '2026-11-16', 'change')).toBe(changed);
    const quick = withActivity(changed, 'r1', '2026-11-16', 'quick');
    expect(quick.restaurants.r1.active).toEqual({ '2026-11-16': 'quick' });
    expect(withActivity(quick, 'r1', '2026-11-16', 'change')).toBe(quick);
    expect(withActivity(quick, 'r1', '2026-11-16', 'quick')).toBe(quick);
  });

  it('mark and unmark a test restaurant, and make no entry to unmark one never marked', () => {
    expect(withTest(EMPTY, 'r1', false)).toBe(EMPTY);
    const marked = withTest(EMPTY, 'r1', true);
    expect(marked.restaurants.r1.test).toBe(true);
    expect(withTest(marked, 'r1', false).restaurants.r1.test).toBe(false);
  });

  it('delete sign-ups, steps and days older than 13 months, and restaurants left with nothing', () => {
    const old = '2025-10-01T00:00:00.000Z';
    const recent = '2025-11-01T00:00:00.000Z';
    const result = pruned(
      {
        version: 1,
        signups: { gone: old, kept: recent },
        restaurants: {
          old: { channel: 'own', test: false, steps: { 'signed-up': old }, active: { '2025-10-01': 'change' } },
          testOnly: { channel: 'own', test: true, steps: { 'signed-up': old }, active: {} },
          mixed: { channel: 'own', test: false, steps: { 'signed-up': old, tv: recent }, active: { '2025-10-15': 'change', '2025-10-16': 'quick' } },
        },
      },
      NOW,
    );
    expect(result.signups).toEqual({ kept: recent });
    expect(Object.keys(result.restaurants).sort()).toEqual(['mixed', 'testOnly']);
    expect(result.restaurants.mixed).toMatchObject({ steps: { tv: recent }, active: { '2025-10-16': 'quick' } });
  });
});

describe('the funnel store', () => {
  it('keeps what it records across instances', async () => {
    const repo = new FileFunnelRepository(file);
    await repo.signedUp('u1', NOW.toISOString(), NOW);
    await repo.setUp('r1', 'u1', NOW.toISOString(), NOW);
    await repo.reached('r1', 'on-air', LATER);
    await repo.active('r1', 'quick', LATER);
    await repo.setTest('r1', true, LATER);
    expect(await new FileFunnelRepository(file).read()).toEqual({
      version: 1,
      signups: {},
      restaurants: { r1: { channel: 'own', test: true, steps: { 'signed-up': NOW.toISOString(), 'set-up': NOW.toISOString(), 'on-air': LATER.toISOString() }, active: { '2026-11-16': 'quick' } } },
    });
  });

  it('marks the day in India time', async () => {
    const repo = new FileFunnelRepository(file);
    await repo.active('r1', 'change', new Date('2026-11-16T19:00:00.000Z'));
    expect((await repo.read()).restaurants.r1.active).toEqual({ '2026-11-17': 'change' });
  });

  it('writes nothing when the day is already marked', async () => {
    const repo = new FileFunnelRepository(file);
    await repo.active('r1', 'quick', NOW);
    const written = await readFile(file, 'utf8');
    const { mtimeMs } = await stat(file);
    for (let index = 0; index < 10; index += 1) await repo.active('r1', 'quick', LATER);
    expect(await readFile(file, 'utf8')).toBe(written);
    expect((await stat(file)).mtimeMs).toBe(mtimeMs);
  });

  it('lives beside the accounts file unless FUNNEL_DATA_FILE says otherwise', async () => {
    vi.stubEnv('FUNNEL_DATA_FILE', undefined);
    vi.stubEnv('ACCOUNTS_DATA_FILE', join(directory, 'accounts.json'));
    await getFunnelRepository().reached('r1', 'menu', NOW);
    expect(JSON.parse(await readFile(file, 'utf8')).restaurants.r1.steps.menu).toBe(NOW.toISOString());

    vi.stubEnv('FUNNEL_DATA_FILE', join(directory, 'elsewhere.json'));
    await getFunnelRepository().reached('r2', 'menu', NOW);
    expect(JSON.parse(await readFile(join(directory, 'elsewhere.json'), 'utf8')).restaurants.r2).toBeDefined();
  });
});
