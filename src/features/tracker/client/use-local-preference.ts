'use client';

import { useCallback, useSyncExternalStore } from 'react';

/**
 * A per-browser preference backed by localStorage, read through useSyncExternalStore so the
 * server render and first client render match. Falls back to memory when storage is blocked.
 */

const CHANGE_EVENT = 'mt-preference-change';
const memory = new Map<string, string | null>();

function readRaw(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return memory.get(key) ?? null;
  }
}

function writeRaw(key: string, value: string | null): void {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    memory.set(key, value);
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(callback: () => void): () => void {
  window.addEventListener('storage', callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

export function useLocalPreference(key: string): readonly [string | null, (value: string | null) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => readRaw(key),
    () => null,
  );
  const setValue = useCallback((next: string | null) => writeRaw(key, next), [key]);
  return [value, setValue] as const;
}
