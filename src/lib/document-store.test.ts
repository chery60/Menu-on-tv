import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getDatabase } from '@netlify/database';
import { NetlifyDB } from '@netlify/database-dev';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { openDocumentStore, PostgresDocumentStore, type DocumentPool } from './document-store';
import { JsonFileStore, StoreCorruptedError } from './json-file-store';

const counterSchema = z.object({ count: z.number().int() });
type Counter = z.infer<typeof counterSchema>;

const options = { name: 'counter', filePath: '/unused/counter.json', createInitial: (): Counter => ({ count: 0 }), parse: (raw: unknown) => counterSchema.parse(raw) };

let db: NetlifyDB;
let pool: DocumentPool & { end(): Promise<void> };

const makeStore = (): PostgresDocumentStore<Counter> => new PostgresDocumentStore<Counter>({ ...options, pool });
const storedBody = async (): Promise<unknown> => (await pool.query('SELECT body FROM documents WHERE name = $1', ['counter'])).rows[0]?.body;

beforeAll(async () => {
  db = new NetlifyDB({ logger: () => undefined });
  const connectionString = await db.start();
  await db.applyMigrations(join(process.cwd(), 'netlify/database/migrations'));
  pool = getDatabase({ connectionString }).pool as unknown as DocumentPool & { end(): Promise<void> };
}, 60_000);

afterAll(async () => {
  await pool?.end();
  await db?.stop();
});

beforeEach(async () => {
  await pool.query('DELETE FROM documents');
});

describe('PostgresDocumentStore', () => {
  it('creates the row with the initial document on first read', async () => {
    expect(await makeStore().read()).toEqual({ count: 0 });
    expect(await storedBody()).toEqual({ count: 0 });
  });

  it('persists updates without mutating the previous document', async () => {
    const store = makeStore();
    const before = await store.read();
    const after = await store.update((current) => ({ count: current.count + 1 }));
    expect(before).toEqual({ count: 0 });
    expect(after).toEqual({ count: 1 });
    expect(await makeStore().read()).toEqual({ count: 1 });
  });

  // PGlite is a single session, so it can't show row locks between server instances; those rest on SELECT ... FOR UPDATE.
  it('applies concurrent updates in turn so none are lost', async () => {
    await Promise.all(Array.from({ length: 12 }, () => makeStore().update((current) => ({ count: current.count + 1 }))));
    expect(await makeStore().read()).toEqual({ count: 12 });
  });

  it('saves nothing when the change throws', async () => {
    const store = makeStore();
    await store.update(() => ({ count: 5 }));
    await expect(
      store.update(() => {
        throw new Error('no');
      }),
    ).rejects.toThrow('no');
    expect(await store.read()).toEqual({ count: 5 });
  });

  it('refuses to overwrite a document that fails validation', async () => {
    await pool.query('INSERT INTO documents (name, body) VALUES ($1, $2)', ['counter', JSON.stringify({ count: 'many' })]);
    const store = makeStore();
    await expect(store.read()).rejects.toBeInstanceOf(StoreCorruptedError);
    await expect(store.update(() => ({ count: 1 }))).rejects.toBeInstanceOf(StoreCorruptedError);
    expect(await storedBody()).toEqual({ count: 'many' });
  });
});

describe('openDocumentStore', () => {
  it('uses Postgres when a database is configured', () => {
    expect(openDocumentStore(options, pool)).toBeInstanceOf(PostgresDocumentStore);
  });

  it('uses the JSON file when there is no database', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'menuontv-docs-'));
    try {
      const store = openDocumentStore({ ...options, filePath: join(directory, 'counter.json') }, null);
      expect(store).toBeInstanceOf(JsonFileStore);
      expect(await store.update((current) => ({ count: current.count + 2 }))).toEqual({ count: 2 });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
