import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DELETE, GET as GET_ONE, PATCH } from '@/app/api/tracker/items/[id]/route';
import { GET, POST } from '@/app/api/tracker/items/route';
import type { TrackerItem } from './domain/types';

let directory: string;
let dataFile: string;

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'menutelly-api-'));
  dataFile = join(directory, 'tracker.json');
  vi.stubEnv('TRACKER_DATA_FILE', dataFile);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(async () => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  await rm(directory, { recursive: true, force: true });
});

const context = (id: string) => ({ params: Promise.resolve({ id }) });
const json = (body: unknown, method: string): Request =>
  new Request('http://localhost/api/tracker/items', {
    method,
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

async function data<T>(response: Response): Promise<T> {
  const body = (await response.json()) as { success: boolean; data: T };
  expect(body.success).toBe(true);
  return body.data;
}

describe('tracker API', () => {
  it('lists the seeded plan on first load', async () => {
    const items = await data<TrackerItem[]>(await GET());
    expect(items.length).toBeGreaterThan(80);
    expect(items[0].key).toBe('MT-1');
  });

  it('creates, reads, updates and archives an item', async () => {
    const created = await data<TrackerItem>(await POST(json({ title: 'Try the API', status: 'planned', area: 'ai' }, 'POST')));
    expect(created).toMatchObject({ title: 'Try the API', status: 'planned', area: 'ai' });

    const fetched = await data<TrackerItem>(await GET_ONE(new Request('http://localhost'), context(created.id)));
    expect(fetched.id).toBe(created.id);

    const patched = await data<TrackerItem>(await PATCH(json({ status: 'done', impact: 5 }, 'PATCH'), context(created.id)));
    expect(patched).toMatchObject({ status: 'done', impact: 5 });

    const archived = await data<TrackerItem>(await DELETE(new Request('http://localhost'), context(created.id)));
    expect(archived.archived).toBe(true);
  });

  it('rejects invalid input with 422 and a readable message', async () => {
    const response = await POST(json({ title: '   ' }, 'POST'));
    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error).toBe('Give the item a title.');

    const patch = await PATCH(json({ status: 'shipped' }, 'PATCH'), context('seed-001'));
    expect(patch.status).toBe(422);
  });

  it('rejects bodies that are not JSON', async () => {
    expect((await POST(json('nope', 'POST'))).status).toBe(400);
    expect((await PATCH(json('nope', 'PATCH'), context('seed-001'))).status).toBe(400);
  });

  it('returns 404 for unknown items', async () => {
    expect((await GET_ONE(new Request('http://localhost'), context('missing'))).status).toBe(404);
    expect((await PATCH(json({ title: 'x' }, 'PATCH'), context('missing'))).status).toBe(404);
    expect((await DELETE(new Request('http://localhost'), context('missing'))).status).toBe(404);
  });

  it('returns 500 with a clear message when the data file is corrupted', async () => {
    await writeFile(dataFile, '{ broken', 'utf8');
    const response = await GET();
    expect(response.status).toBe(500);
    expect((await response.json()).error).toMatch(/couldn’t load the tracker/);
  });
});
