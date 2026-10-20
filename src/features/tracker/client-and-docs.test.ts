import { afterEach, describe, expect, it, vi } from 'vitest';
import { messageOf, TrackerApiError, trackerApi } from './client/api-client';
import { docHrefForFile, TRACKER_DOCS } from './docs/links';

vi.mock('server-only', () => ({}));

const respond = (status: number, body: unknown): Response =>
  new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('trackerApi', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns data from a successful envelope and sends JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue(respond(200, { success: true, data: { id: 'a', title: 'x' } }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(trackerApi.update('a b', { title: 'x' })).resolves.toEqual({ id: 'a', title: 'x' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/tracker/items/a%20b');
    expect(init).toMatchObject({ method: 'PATCH', body: JSON.stringify({ title: 'x' }) });
  });

  it('surfaces the server’s plain-language error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respond(422, { success: false, error: 'Give the item a title.' })));
    await expect(trackerApi.create({ title: '' })).rejects.toThrow('Give the item a title.');
  });

  it('explains expired sign-in, offline and unreadable responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respond(401, 'nope')));
    await expect(trackerApi.archive('a')).rejects.toThrow(/sign-in expired/);

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(trackerApi.archive('a')).rejects.toThrow(/offline/);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respond(500, 'not json')));
    await expect(trackerApi.archive('a')).rejects.toThrow(/couldn’t save/);
  });

  it('turns unknown errors into a generic message', () => {
    expect(messageOf(new TrackerApiError('Specific'))).toBe('Specific');
    expect(messageOf(new Error('internal detail'))).toBe('Something went wrong. Try again.');
  });
});

describe('docs links', () => {
  it('maps repo-relative doc links to tracker pages', () => {
    expect(docHrefForFile('docs/research.md')).toBe('/tracker/docs/research');
    expect(docHrefForFile('./PRODUCT.md')).toBe('/tracker/docs/product-brief');
    expect(docHrefForFile('docs/architecture.md#decisions')).toBe('/tracker/docs/architecture');
  });

  it('links the market size and go-to-market doc', () => {
    expect(docHrefForFile('market-size.md')).toBe('/tracker/docs/market');
    expect(docHrefForFile('docs/market-size.md#is-v0-right')).toBe('/tracker/docs/market');
  });

  it('leaves external and unknown links alone', () => {
    expect(docHrefForFile('https://example.org/docs/research.md')).toBeNull();
    expect(docHrefForFile('notes/unknown.md')).toBeNull();
  });
});

describe('readTrackerDoc', () => {
  it('reads every registered planning document from disk', async () => {
    const { readTrackerDoc } = await import('./docs/registry');
    for (const doc of TRACKER_DOCS) {
      const result = await readTrackerDoc(doc.slug);
      expect(result?.doc.slug).toBe(doc.slug);
      expect(result?.markdown.startsWith('#')).toBe(true);
    }
  });

  it('returns null for slugs that are not registered', async () => {
    const { readTrackerDoc } = await import('./docs/registry');
    expect(await readTrackerDoc('../../package.json')).toBeNull();
  });
});
