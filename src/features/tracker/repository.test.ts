import { readFileSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { TrackerItem } from './domain/types';
import { committedRoadmap, FileTrackerRepository } from './repository';
import { trackerFileSchema, updateItemSchema } from './schema';
import { buildSeedItems } from './seed';

let directory: string;
const now = new Date('2026-10-12T09:00:00.000Z');

const seedOne = (): readonly TrackerItem[] => [
  {
    id: 'seed-1',
    key: 'MT-1',
    title: 'Seeded item',
    icon: '🌱',
    status: 'planned',
    priority: 'high',
    phase: 'phase-0',
    area: 'foundations',
    effort: 's',
    impact: 4,
    confidence: 4,
    owner: '',
    tags: [],
    summary: '',
    body: '',
    checklist: [],
    rank: 1024,
    archived: false,
    createdAt: '2026-10-11T00:00:00.000Z',
    updatedAt: '2026-10-11T00:00:00.000Z',
  },
];

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'menutelly-tracker-'));
});

afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

const repo = (): FileTrackerRepository => new FileTrackerRepository(join(directory, 'tracker.json'), seedOne);

describe('FileTrackerRepository', () => {
  it('seeds the file on first read', async () => {
    const items = await repo().list();
    expect(items.map((item) => item.key)).toEqual(['MT-1']);
  });

  it('creates items with defaults, the next key and a rank after the last item', async () => {
    const created = await repo().create({ title: 'New idea', status: 'backlog' }, now);
    expect(created).toMatchObject({ key: 'MT-2', title: 'New idea', status: 'backlog', priority: 'medium', rank: 2048, archived: false });
    expect(created.createdAt).toBe(now.toISOString());
    expect(await repo().get(created.id)).toEqual(created);
  });

  it('updates fields and stamps updatedAt', async () => {
    const updated = await repo().update('seed-1', { status: 'done', title: 'Renamed' }, now);
    expect(updated).toMatchObject({ status: 'done', title: 'Renamed', updatedAt: now.toISOString() });
  });

  it('returns null when updating an unknown item', async () => {
    expect(await repo().update('nope', { title: 'x' }, now)).toBeNull();
  });

  it('archives instead of deleting', async () => {
    const archived = await repo().archive('seed-1', now);
    expect(archived?.archived).toBe(true);
    expect(await repo().list()).toHaveLength(1);
  });
});

describe('committedRoadmap', () => {
  it('starts a fresh store, like a new database on Netlify, from the roadmap committed in the repository', async () => {
    const committed = join(directory, 'committed.json');
    await writeFile(committed, JSON.stringify({ version: 1, items: seedOne() }), 'utf8');
    expect(committedRoadmap(() => readFileSync(committed, 'utf8'))).toEqual(seedOne());
  });

  it('falls back to the seed in code when no roadmap was committed', () => {
    expect(committedRoadmap(() => readFileSync(join(directory, 'missing.json'), 'utf8'))).toEqual(buildSeedItems());
  });
});

describe('updateItemSchema', () => {
  it('rejects empty patches and unknown fields', () => {
    expect(updateItemSchema.safeParse({}).success).toBe(false);
    expect(updateItemSchema.safeParse({ id: 'hack' }).success).toBe(false);
    expect(updateItemSchema.safeParse({ impact: 9 }).success).toBe(false);
    expect(updateItemSchema.safeParse({ status: 'done', impact: 5 }).success).toBe(true);
  });
});

describe('seed plan', () => {
  const items = buildSeedItems();

  it('is valid against the file schema', () => {
    expect(trackerFileSchema.safeParse({ version: 1, items }).success).toBe(true);
  });

  it('has unique ids and keys', () => {
    expect(new Set(items.map((item) => item.id)).size).toBe(items.length);
    expect(new Set(items.map((item) => item.key)).size).toBe(items.length);
  });

  it('covers every phase of the roadmap', () => {
    const phases = new Set(items.map((item) => item.phase));
    expect([...phases].sort()).toEqual(['phase-0', 'phase-1', 'phase-2', 'phase-3', 'phase-4']);
  });
});
