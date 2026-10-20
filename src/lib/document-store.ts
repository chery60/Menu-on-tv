import { getDatabase, MissingDatabaseConnectionError } from '@netlify/database';
import { inTurn } from './in-turn';
import { JsonFileStore, StoreCorruptedError } from './json-file-store';

/**
 * Where the app keeps each JSON document (accounts, menus, screens, tracker, waitlist).
 * On Netlify, Netlify Database (Postgres) holds one row per document; locally and in tests, a JSON file does.
 * shortcut: a whole document is rewritten on every change, fine for a pilot of tens of restaurants; move hot data to tables (ADR-008) before that hurts.
 */
export interface DocumentStore<T> {
  read(): Promise<T>;
  /** Applies a pure change to the latest document and saves it. If the change throws, nothing is saved. */
  update(transform: (current: T) => T): Promise<T>;
}

export interface DocumentStoreOptions<T> {
  /** The document's row name in Postgres. */
  readonly name: string;
  /** The document's file when there is no database. */
  readonly filePath: string;
  readonly createInitial: () => T;
  /** Validates and narrows stored JSON; throw to reject. */
  readonly parse: (raw: unknown) => T;
}

interface DocumentClient {
  query(text: string, values?: unknown[]): Promise<{ rows: Array<{ body: unknown }> }>;
}

/** A Postgres pool, from pg or Neon; transactions need one client from connect(). */
export interface DocumentPool extends DocumentClient {
  connect(): Promise<DocumentClient & { release(): void }>;
}

export class PostgresDocumentStore<T> implements DocumentStore<T> {
  constructor(private readonly options: DocumentStoreOptions<T> & { readonly pool: DocumentPool }) {}

  async read(): Promise<T> {
    const { rows } = await this.options.pool.query('SELECT body FROM documents WHERE name = $1', [this.options.name]);
    if (rows.length === 0) return this.update((current) => current);
    return this.parse(rows[0].body);
  }

  /** Queued within this server instance, and the row is locked across instances. */
  update(transform: (current: T) => T): Promise<T> {
    return inTurn(`documents/${this.options.name}`, () => this.updateNow(transform));
  }

  private async updateNow(transform: (current: T) => T): Promise<T> {
    const client = await this.options.pool.connect();
    try {
      await client.query('BEGIN');
      const current = await this.lockOrCreate(client);
      const next = transform(current);
      if (next !== current) await client.query('UPDATE documents SET body = $2, updated_at = now() WHERE name = $1', [this.options.name, JSON.stringify(next)]);
      await client.query('COMMIT');
      return next;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  /** Locks the document's row for this transaction, creating it first if it doesn't exist yet. */
  private async lockOrCreate(client: DocumentClient): Promise<T> {
    const select = 'SELECT body FROM documents WHERE name = $1 FOR UPDATE';
    let { rows } = await client.query(select, [this.options.name]);
    if (rows.length === 0) {
      await client.query('INSERT INTO documents (name, body) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING', [this.options.name, JSON.stringify(this.options.createInitial())]);
      ({ rows } = await client.query(select, [this.options.name]));
    }
    return this.parse(rows[0].body);
  }

  private parse(body: unknown): T {
    try {
      return this.options.parse(body);
    } catch (error) {
      throw new StoreCorruptedError(`documents/${this.options.name}`, error);
    }
  }
}

let sharedPool: DocumentPool | null | undefined;

/** One pool per server instance, or null when Netlify Database isn't configured here (local and tests). */
function databasePool(): DocumentPool | null {
  if (sharedPool !== undefined) return sharedPool;
  try {
    sharedPool = getDatabase().pool as unknown as DocumentPool;
  } catch (error) {
    if (!(error instanceof MissingDatabaseConnectionError)) throw error;
    sharedPool = null;
  }
  return sharedPool;
}

export function openDocumentStore<T>(options: DocumentStoreOptions<T>, pool: DocumentPool | null = databasePool()): DocumentStore<T> {
  return pool ? new PostgresDocumentStore({ ...options, pool }) : new JsonFileStore(options);
}
