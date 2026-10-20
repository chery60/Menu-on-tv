import type { ItemPatch, TrackerItem } from '../domain/types';
import type { CreateItemInput } from '../schema';

/** Browser-side calls to the tracker API, with errors turned into plain-language messages. */

interface Envelope<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: string;
}

export class TrackerApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TrackerApiError';
  }
}

const BASE = '/api/tracker/items';

async function request<T>(url: string, init: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json' } });
  } catch {
    throw new TrackerApiError('You seem to be offline. Your change wasn’t saved.');
  }

  if (response.status === 401) throw new TrackerApiError('Your sign-in expired. Reload the page to sign in again.');

  let body: Envelope<T> | null = null;
  try {
    body = (await response.json()) as Envelope<T>;
  } catch {
    body = null;
  }

  if (!response.ok || !body?.success || body.data === undefined) {
    throw new TrackerApiError(body?.error ?? 'We couldn’t save your change. Try again.');
  }
  return body.data;
}

export const trackerApi = {
  create: (input: CreateItemInput): Promise<TrackerItem> => request(BASE, { method: 'POST', body: JSON.stringify(input) }),
  update: (id: string, patch: ItemPatch): Promise<TrackerItem> =>
    request(`${BASE}/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  archive: (id: string): Promise<TrackerItem> => request(`${BASE}/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};

export function messageOf(error: unknown): string {
  return error instanceof TrackerApiError ? error.message : 'Something went wrong. Try again.';
}
