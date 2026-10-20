import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { DocumentStore } from './document-store';
import { inTurn } from './in-turn';

/**
 * A tiny JSON document store for Phase 0. Writes are serialised per file within
 * the process and land atomically (temp file + rename), so a crash never leaves
 * half-written JSON. Swap for Postgres behind the same repository interfaces.
 */

export class StoreCorruptedError extends Error {
  constructor(filePath: string, cause: unknown) {
    super(`The data file at ${filePath} could not be read. Fix or remove it, then try again.`, { cause });
    this.name = 'StoreCorruptedError';
  }
}

function isMissingFile(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === 'ENOENT';
}

export interface JsonFileStoreOptions<T> {
  readonly filePath: string;
  /** Builds the first document when the file does not exist yet. */
  readonly createInitial: () => T;
  /** Validates and narrows parsed JSON; throw to reject. */
  readonly parse: (raw: unknown) => T;
}

export class JsonFileStore<T> implements DocumentStore<T> {
  private readonly filePath: string;
  private readonly createInitial: () => T;
  private readonly parse: (raw: unknown) => T;

  constructor(options: JsonFileStoreOptions<T>) {
    this.filePath = options.filePath;
    this.createInitial = options.createInitial;
    this.parse = options.parse;
  }

  async read(): Promise<T> {
    let raw: string;
    try {
      raw = await readFile(this.filePath, 'utf8');
    } catch (error) {
      if (!isMissingFile(error)) throw error;
      return this.update((current) => current);
    }

    try {
      return this.parse(JSON.parse(raw));
    } catch (error) {
      throw new StoreCorruptedError(this.filePath, error);
    }
  }

  /** Applies a pure transform to the current document and persists the result. */
  async update(transform: (current: T) => T): Promise<T> {
    return inTurn(this.filePath, async () => {
      const { document, created } = await this.readOrCreate();
      const next = transform(document);
      if (created || next !== document) await this.writeAtomic(next);
      return next;
    });
  }

  private async readOrCreate(): Promise<{ readonly document: T; readonly created: boolean }> {
    let raw: string;
    try {
      raw = await readFile(this.filePath, 'utf8');
    } catch (error) {
      if (isMissingFile(error)) return { document: this.createInitial(), created: true };
      throw error;
    }

    try {
      return { document: this.parse(JSON.parse(raw)), created: false };
    } catch (error) {
      throw new StoreCorruptedError(this.filePath, error);
    }
  }

  private async writeAtomic(data: T): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    const tempPath = `${this.filePath}.${randomUUID()}.tmp`;
    try {
      await writeFile(tempPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
      await rename(tempPath, this.filePath);
    } catch (error) {
      await rm(tempPath, { force: true });
      throw error;
    }
  }
}
