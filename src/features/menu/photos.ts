import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getStore, type Store } from '@netlify/blobs';
import { dataFilePath } from '@/lib/data-path';
import { PHOTO_ID } from './schema';

/** Dish photos. Phones shrink them before upload; we check the bytes really are an image before keeping them. */

/** Phones send about 150 KB after shrinking to 800 px; this leaves room without letting big files in. */
export const MAX_PHOTO_BYTES = 800 * 1024;

export type PhotoType = 'image/jpeg' | 'image/png' | 'image/webp';

export class PhotoRejectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PhotoRejectedError';
  }
}

const startsWith = (bytes: Uint8Array, signature: readonly number[], offset = 0): boolean => signature.every((byte, index) => bytes[offset + index] === byte);

/** The image type from a file's first bytes, never from its name or the browser's word for it. */
export function sniffImage(bytes: Uint8Array): PhotoType | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) return 'image/webp';
  return null;
}

/** Throws PhotoRejectedError for anything that isn't a small JPEG, PNG or WebP. */
function checkPhoto(bytes: Uint8Array): void {
  if (bytes.byteLength === 0) throw new PhotoRejectedError('Choose a photo first.');
  if (bytes.byteLength > MAX_PHOTO_BYTES) throw new PhotoRejectedError('That photo is too large. Try another one.');
  if (!sniffImage(bytes)) throw new PhotoRejectedError('Use a JPEG, PNG or WebP photo.');
}

type StoredPhoto = { readonly bytes: Uint8Array; readonly type: PhotoType };

const asPhoto = (bytes: Uint8Array): StoredPhoto | null => {
  const type = sniffImage(bytes);
  return type ? { bytes, type } : null;
};

export interface PhotoStore {
  /** Keeps a photo and returns its new id. Throws PhotoRejectedError for anything that isn't a small JPEG, PNG or WebP. */
  save(bytes: Uint8Array): Promise<string>;
  read(id: string): Promise<StoredPhoto | null>;
  remove(id: string): Promise<void>;
}

export class FilePhotoStore implements PhotoStore {
  constructor(private readonly directory: string) {}

  async save(bytes: Uint8Array): Promise<string> {
    checkPhoto(bytes);
    const id = randomUUID();
    await mkdir(this.directory, { recursive: true });
    await writeFile(join(this.directory, id), bytes);
    return id;
  }

  async read(id: string): Promise<StoredPhoto | null> {
    if (!PHOTO_ID.test(id)) return null;
    try {
      return asPhoto(new Uint8Array(await readFile(join(this.directory, id))));
    } catch (error) {
      if ((error as { code?: string }).code === 'ENOENT') return null;
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    if (PHOTO_ID.test(id)) await rm(join(this.directory, id), { force: true });
  }
}

export type PhotoBlobs = Pick<Store, 'get' | 'set' | 'delete'>;

/** On Netlify: each photo is one blob under a new random key, written once and never changed. */
export class BlobPhotoStore implements PhotoStore {
  constructor(private readonly blobs: PhotoBlobs) {}

  async save(bytes: Uint8Array): Promise<string> {
    checkPhoto(bytes);
    const id = randomUUID();
    await this.blobs.set(id, new Blob([bytes.slice()]));
    return id;
  }

  async read(id: string): Promise<StoredPhoto | null> {
    if (!PHOTO_ID.test(id)) return null;
    const data = await this.blobs.get(id, { type: 'arrayBuffer' });
    return data ? asPhoto(new Uint8Array(data)) : null;
  }

  async remove(id: string): Promise<void> {
    if (PHOTO_ID.test(id)) await this.blobs.delete(id);
  }
}

/** Netlify Blobs when the app runs on Netlify; the photo folder locally and in tests. */
export function getPhotoStore(): PhotoStore {
  try {
    return new BlobPhotoStore(getStore('photos'));
  } catch (error) {
    if (!(error instanceof Error && error.name === 'MissingBlobsEnvironmentError')) throw error;
  }
  return new FilePhotoStore(dataFilePath('photos', process.env.PHOTOS_DIR));
}
