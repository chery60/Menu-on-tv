import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { applyEdit, MenuEditError } from './edit';
import { BlobPhotoStore, FilePhotoStore, MAX_PHOTO_BYTES, PhotoRejectedError, sniffImage, type PhotoBlobs, type PhotoStore } from './photos';
import { FileMenusRepository } from './repository';

let directory: string;
const NOW = new Date('2026-10-19T10:00:00.000Z');
const ctx = { today: '2026-10-19', now: NOW, newId: () => 'cat-1' };
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
const WEBP = new Uint8Array([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50]);

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'menutelly-menus-'));
});

afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

describe('FileMenusRepository', () => {
  it('starts each restaurant empty and keeps menus apart', async () => {
    const repo = new FileMenusRepository(join(directory, 'menus.json'));
    expect((await repo.get('a', NOW)).categories).toEqual([]);
    await repo.update('a', (menu) => applyEdit(menu, { type: 'add-category', name: 'Chai', nameHi: '' }, ctx), NOW);
    expect((await repo.get('a', NOW)).categories).toHaveLength(1);
    expect((await repo.get('b', NOW)).categories).toEqual([]);
  });

  it('saves nothing when a change fails', async () => {
    const repo = new FileMenusRepository(join(directory, 'menus.json'));
    await expect(repo.update('a', (menu) => applyEdit(menu, { type: 'remove-item', itemId: 'gone' }, ctx), NOW)).rejects.toBeInstanceOf(MenuEditError);
    expect((await repo.get('a', NOW)).categories).toEqual([]);
  });
});

describe('photos', () => {
  it('are recognised by their bytes', () => {
    expect(sniffImage(JPEG)).toBe('image/jpeg');
    expect(sniffImage(PNG)).toBe('image/png');
    expect(sniffImage(WEBP)).toBe('image/webp');
    expect(sniffImage(new TextEncoder().encode('<svg onload=alert(1)>'))).toBeNull();
  });

});

/** Netlify Blobs, in memory: set takes a Blob, get returns an ArrayBuffer or null. */
function memoryBlobs(): PhotoBlobs {
  const kept = new Map<string, ArrayBuffer>();
  return {
    set: async (key: string, value: Blob) => {
      kept.set(key, await value.arrayBuffer());
      return { modified: true };
    },
    get: async (key: string) => kept.get(key) ?? null,
    delete: async (key: string) => {
      kept.delete(key);
    },
  } as unknown as PhotoBlobs;
}

describe.each([
  ['files', (): PhotoStore => new FilePhotoStore(join(directory, 'photos'))],
  ['Netlify Blobs', (): PhotoStore => new BlobPhotoStore(memoryBlobs())],
])('photo store on %s', (_name, makeStore) => {
  it('keeps, reads back and removes photos by id only', async () => {
    const store = makeStore();
    const id = await store.save(JPEG);
    expect(await store.read(id)).toMatchObject({ type: 'image/jpeg', bytes: JPEG });
    expect(await store.read('../menus.json')).toBeNull();
    expect(await store.read('0f8fad5b-d9cb-469f-a165-70867728950e')).toBeNull();
    await store.remove(id);
    expect(await store.read(id)).toBeNull();
  });

  it('refuses empty, oversized and non-image files', async () => {
    const store = makeStore();
    await expect(store.save(new Uint8Array())).rejects.toBeInstanceOf(PhotoRejectedError);
    await expect(store.save(new Uint8Array(MAX_PHOTO_BYTES + 1).fill(0xff))).rejects.toThrow(/too large/);
    await expect(store.save(new TextEncoder().encode('<html>'))).rejects.toThrow(/JPEG, PNG or WebP/);
  });
});
