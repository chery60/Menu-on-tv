// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TrackerItem } from '../domain/types';
import { useLocalPreference } from './use-local-preference';
import { useTracker } from './use-tracker';

const item: TrackerItem = {
  id: 'a',
  key: 'MT-1',
  title: 'Original',
  icon: '📌',
  status: 'backlog',
  priority: 'medium',
  phase: 'phase-1',
  area: 'screens',
  effort: 'm',
  impact: 3,
  confidence: 3,
  owner: '',
  tags: [],
  summary: '',
  body: '',
  checklist: [],
  rank: 1024,
  archived: false,
  createdAt: '2026-10-11T00:00:00.000Z',
  updatedAt: '2026-10-11T00:00:00.000Z',
};

const ok = (data: unknown): Response => new Response(JSON.stringify({ success: true, data }), { status: 200 });
const failure = (error: string): Response => new Response(JSON.stringify({ success: false, error }), { status: 500 });

describe('useTracker', () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('applies an update immediately and keeps the saved version', async () => {
    const saved = { ...item, title: 'Renamed', updatedAt: '2026-10-12T00:00:00.000Z' };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok(saved)));
    const { result } = renderHook(() => useTracker([item]));

    await act(async () => {
      await result.current.update('a', { title: 'Renamed' });
    });

    expect(result.current.items[0]).toMatchObject({ title: 'Renamed', updatedAt: saved.updatedAt });
    expect(result.current.toasts).toHaveLength(0);
  });

  it('rolls back a failed update and explains why', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(failure('We couldn’t save your changes. Try again.')));
    const { result } = renderHook(() => useTracker([item]));

    await act(async () => {
      await result.current.update('a', { title: 'Lost', status: 'done' });
    });

    expect(result.current.items[0]).toMatchObject({ title: 'Original', status: 'backlog' });
    expect(result.current.toasts[0]).toMatchObject({ tone: 'error', message: 'We couldn’t save your changes. Try again.' });
  });

  it('ignores updates for unknown items', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useTracker([item]));
    await act(async () => {
      await result.current.update('missing', { title: 'x' });
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('adds created items and reports failures', async () => {
    const created = { ...item, id: 'b', key: 'MT-2', title: 'New' };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(ok(created)).mockResolvedValueOnce(failure('Nope')));
    const { result } = renderHook(() => useTracker([item]));

    let first: TrackerItem | null = null;
    await act(async () => {
      first = await result.current.create({ title: 'New' });
    });
    expect(first).toMatchObject({ id: 'b' });
    expect(result.current.items).toHaveLength(2);

    let second: TrackerItem | null = created;
    await act(async () => {
      second = await result.current.create({ title: 'Fails' });
    });
    expect(second).toBeNull();
    expect(result.current.toasts.at(-1)).toMatchObject({ tone: 'error', message: 'Nope' });
  });

  it('archives with an undo action, and undo restores the item', async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok({ ...item, archived: true }));
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useTracker([item]));

    await act(async () => {
      await result.current.archive('a');
    });
    expect(result.current.items[0].archived).toBe(true);
    const toast = result.current.toasts[0];
    expect(toast).toMatchObject({ message: 'Moved to trash', tone: 'info' });

    fetchMock.mockResolvedValueOnce(ok({ ...item, archived: false }));
    await act(async () => {
      toast.action?.run();
    });
    expect(result.current.items[0].archived).toBe(false);
    expect(fetchMock).toHaveBeenLastCalledWith('/api/tracker/items/a', expect.objectContaining({ method: 'PATCH' }));
  });

  it('restores the item when archiving fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(failure('Trash is unavailable')));
    const { result } = renderHook(() => useTracker([item]));
    await act(async () => {
      await result.current.archive('a');
    });
    expect(result.current.items[0].archived).toBe(false);
    expect(result.current.toasts[0]).toMatchObject({ tone: 'error' });
  });

  it('dismisses toasts by hand and after a few seconds', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(failure('First')));
    const { result } = renderHook(() => useTracker([item]));
    await act(async () => {
      await result.current.update('a', { title: 'x' });
      await result.current.update('a', { title: 'y' });
    });
    expect(result.current.toasts).toHaveLength(2);

    act(() => result.current.dismissToast(result.current.toasts[0].id));
    expect(result.current.toasts).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(6000);
    });
    await waitFor(() => expect(result.current.toasts).toHaveLength(0));
  });
});

describe('useLocalPreference', () => {
  afterEach(() => window.localStorage.clear());

  it('reads, writes and clears a stored value', () => {
    const { result } = renderHook(() => useLocalPreference('tm-test'));
    expect(result.current[0]).toBeNull();

    act(() => result.current[1]('dark'));
    expect(result.current[0]).toBe('dark');
    expect(window.localStorage.getItem('tm-test')).toBe('dark');

    act(() => result.current[1](null));
    expect(result.current[0]).toBeNull();
  });

  it('keeps working in memory when storage is blocked', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const { result } = renderHook(() => useLocalPreference('tm-blocked'));

    act(() => result.current[1]('light'));
    expect(result.current[0]).toBe('light');

    getItem.mockRestore();
    setItem.mockRestore();
  });
});
