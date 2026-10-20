import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { JsonFileStore, StoreCorruptedError } from './json-file-store';

const counterSchema = z.object({ count: z.number().int() });
type Counter = z.infer<typeof counterSchema>;

let directory: string;
let filePath: string;

const makeStore = (): JsonFileStore<Counter> =>
  new JsonFileStore<Counter>({ filePath, createInitial: () => ({ count: 0 }), parse: (raw) => counterSchema.parse(raw) });

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'menutelly-store-'));
  filePath = join(directory, 'nested', 'counter.json');
});

afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

describe('JsonFileStore', () => {
  it('creates the file with the initial document on first read', async () => {
    const store = makeStore();
    expect(await store.read()).toEqual({ count: 0 });
    expect(JSON.parse(await readFile(filePath, 'utf8'))).toEqual({ count: 0 });
  });

  it('persists updates without mutating the previous document', async () => {
    const store = makeStore();
    const before = await store.read();
    const after = await store.update((current) => ({ count: current.count + 1 }));
    expect(before).toEqual({ count: 0 });
    expect(after).toEqual({ count: 1 });
    expect(await store.read()).toEqual({ count: 1 });
  });

  it('serialises concurrent updates so none are lost', async () => {
    const store = makeStore();
    await Promise.all(Array.from({ length: 25 }, () => store.update((current) => ({ count: current.count + 1 }))));
    expect(await store.read()).toEqual({ count: 25 });
  });

  it('refuses to overwrite a corrupted file', async () => {
    const store = makeStore();
    await store.read();
    await writeFile(filePath, '{ not json', 'utf8');
    await expect(store.read()).rejects.toBeInstanceOf(StoreCorruptedError);
    await expect(store.update((current) => current)).rejects.toBeInstanceOf(StoreCorruptedError);
    expect(await readFile(filePath, 'utf8')).toBe('{ not json');
  });

  it('rejects documents that fail validation', async () => {
    const store = makeStore();
    await store.read();
    await writeFile(filePath, JSON.stringify({ count: 'many' }), 'utf8');
    await expect(store.read()).rejects.toBeInstanceOf(StoreCorruptedError);
  });

  it('keeps working after a failed transform', async () => {
    const store = makeStore();
    await expect(
      store.update(() => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    expect(await store.update((current) => ({ count: current.count + 2 }))).toEqual({ count: 2 });
  });
});
