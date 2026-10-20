import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { dataFilePath } from '@/lib/data-path';
import { openDocumentStore, type DocumentStore } from '@/lib/document-store';
import { logger } from '@/lib/logger';
import { applyPatch, nextKey, nextRank } from './domain/board';
import type { TrackerItem } from './domain/types';
import { trackerFileSchema, type CreateItemInput, type TrackerFile, type UpdateItemInput } from './schema';
import { buildSeedItems } from './seed';

/** Storage boundary for the tracker. Callers depend on the interface, not the file. */
export interface TrackerRepository {
  list(): Promise<readonly TrackerItem[]>;
  get(id: string): Promise<TrackerItem | null>;
  create(input: CreateItemInput, now: Date): Promise<TrackerItem>;
  update(id: string, patch: UpdateItemInput, now: Date): Promise<TrackerItem | null>;
  archive(id: string, now: Date): Promise<TrackerItem | null>;
}

const DEFAULTS = {
  icon: '📌',
  status: 'backlog',
  priority: 'medium',
  phase: 'phase-1',
  area: 'foundations',
  effort: 'm',
  impact: 3,
  confidence: 3,
  owner: '',
  summary: '',
  body: '',
} as const satisfies Partial<TrackerItem>;

export class FileTrackerRepository implements TrackerRepository {
  private readonly store: DocumentStore<TrackerFile>;

  constructor(filePath: string, seed: () => readonly TrackerItem[] = buildSeedItems) {
    this.store = openDocumentStore<TrackerFile>({
      name: 'tracker',
      filePath,
      createInitial: () => ({ version: 1, items: [...seed()] }),
      parse: (raw) => trackerFileSchema.parse(raw),
    });
  }

  async list(): Promise<readonly TrackerItem[]> {
    const file = await this.store.read();
    return file.items;
  }

  async get(id: string): Promise<TrackerItem | null> {
    const items = await this.list();
    return items.find((item) => item.id === id) ?? null;
  }

  async create(input: CreateItemInput, now: Date): Promise<TrackerItem> {
    const timestamp = now.toISOString();
    let created: TrackerItem | null = null;
    await this.store.update((file) => {
      const item: TrackerItem = {
        ...DEFAULTS,
        ...input,
        id: randomUUID(),
        key: nextKey(file.items),
        tags: input.tags ?? [],
        checklist: input.checklist ?? [],
        rank: input.rank ?? nextRank(file.items),
        archived: false,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      created = item;
      return { ...file, items: [...file.items, item] };
    });
    if (!created) throw new Error('Tracker create finished without an item.');
    return created;
  }

  async update(id: string, patch: UpdateItemInput, now: Date): Promise<TrackerItem | null> {
    let updated: TrackerItem | null = null;
    await this.store.update((file) => {
      const index = file.items.findIndex((item) => item.id === id);
      if (index < 0) return file;
      const item = applyPatch(file.items[index], patch, now.toISOString());
      updated = item;
      return { ...file, items: file.items.map((existing, i) => (i === index ? item : existing)) };
    });
    return updated;
  }

  async archive(id: string, now: Date): Promise<TrackerItem | null> {
    return this.update(id, { archived: true }, now);
  }
}

/**
 * What a fresh tracker store starts with (a new database on Netlify): the roadmap committed in data/tracker.json,
 * which is newer than the seed in code, or the seed when there is none.
 */
export function committedRoadmap(read: () => string = () => readFileSync(join(process.cwd(), 'data', 'tracker.json'), 'utf8')): readonly TrackerItem[] {
  try {
    // The path stays written out at the read, so the build bundles only data/ and not the whole project.
    return trackerFileSchema.parse(JSON.parse(read())).items;
  } catch (error) {
    if ((error as { code?: string }).code !== 'ENOENT') logger.error('tracker.committed_roadmap_unreadable', error);
    return buildSeedItems();
  }
}

export function getTrackerRepository(): TrackerRepository {
  const filePath = dataFilePath('tracker.json', process.env.TRACKER_DATA_FILE);
  return new FileTrackerRepository(filePath, () => committedRoadmap());
}
