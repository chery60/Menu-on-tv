import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/waitlist/route';
import { FileWaitlistRepository, isHoneypotFilled, waitlistInputSchema } from './waitlist';

let directory: string;

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'menutelly-waitlist-'));
  vi.stubEnv('WAITLIST_DATA_FILE', join(directory, 'waitlist.json'));
  vi.spyOn(console, 'info').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(async () => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  await rm(directory, { recursive: true, force: true });
});

const post = (body: unknown, ip = '203.0.113.1'): Promise<Response> =>
  POST(
    new Request('http://localhost/api/waitlist', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
  );

describe('waitlistInputSchema', () => {
  it('normalises email and accepts a known role', () => {
    const parsed = waitlistInputSchema.parse({ email: '  Pat@Cafe.IN ', role: 'Restaurant or café owner' });
    expect(parsed.email).toBe('pat@cafe.in');
  });

  it('rejects invalid emails and unknown roles', () => {
    expect(waitlistInputSchema.safeParse({ email: 'nope', role: 'Restaurant or café owner' }).success).toBe(false);
    expect(waitlistInputSchema.safeParse({ email: 'a@b.org', role: 'Astronaut' }).success).toBe(false);
  });
});

describe('isHoneypotFilled', () => {
  it('detects a filled hidden field only', () => {
    expect(isHoneypotFilled({ website: 'http://spam' })).toBe(true);
    expect(isHoneypotFilled({ website: '' })).toBe(false);
    expect(isHoneypotFilled({})).toBe(false);
    expect(isHoneypotFilled(null)).toBe(false);
  });
});

describe('FileWaitlistRepository', () => {
  it('adds entries and de-duplicates by email', async () => {
    const repository = new FileWaitlistRepository(join(directory, 'repo.json'));
    const now = new Date('2026-10-11T00:00:00.000Z');
    const first = await repository.add({ email: 'a@b.org', role: 'Manager at a chain' }, now);
    const second = await repository.add({ email: 'a@b.org', role: 'Manager at a chain' }, now);
    expect(first.duplicate).toBe(false);
    expect(second.duplicate).toBe(true);
    expect(second.entry.id).toBe(first.entry.id);
    expect(await repository.count()).toBe(1);
  });
});

describe('POST /api/waitlist', () => {
  it('stores a valid signup and returns 201', async () => {
    const response = await post({ email: 'lead@chain.in', role: 'Manager at a chain', restaurant: 'Masala Mornings' }, '198.51.100.1');
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ success: true, data: { status: 'added' } });
    const stored = JSON.parse(await readFile(join(directory, 'waitlist.json'), 'utf8'));
    expect(stored.entries).toHaveLength(1);
    expect(stored.entries[0]).toMatchObject({ email: 'lead@chain.in', restaurant: 'Masala Mornings' });
  });

  it('returns 422 with a readable message for invalid input', async () => {
    const response = await post({ email: 'bad', role: 'Restaurant or café owner' }, '198.51.100.2');
    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/email/i);
  });

  it('returns 400 for a body that is not JSON', async () => {
    const response = await post('not json', '198.51.100.3');
    expect(response.status).toBe(400);
  });

  it('accepts but does not store honeypot submissions', async () => {
    const response = await post({ email: 'bot@spam.io', role: 'Restaurant or café owner', website: 'http://spam' }, '198.51.100.4');
    expect(response.status).toBe(201);
    await expect(readFile(join(directory, 'waitlist.json'), 'utf8')).rejects.toThrow();
  });

  it('rate limits repeated submissions from one address', async () => {
    const ip = '198.51.100.5';
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 6; attempt += 1) {
      statuses.push((await post({ email: `p${attempt}@cafe.in`, role: 'Restaurant or café owner' }, ip)).status);
    }
    expect(statuses.slice(0, 5).every((status) => status === 201)).toBe(true);
    expect(statuses[5]).toBe(429);
  });
});
