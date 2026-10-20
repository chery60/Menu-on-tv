'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { applyPatch } from '../domain/board';
import type { ItemPatch, TrackerItem } from '../domain/types';
import type { CreateItemInput } from '../schema';
import { messageOf, trackerApi } from './api-client';

/** Client state for the tracker: optimistic edits that roll back with a clear message on failure. */

export interface ToastAction {
  readonly label: string;
  readonly run: () => void;
}

export interface Toast {
  readonly id: number;
  readonly message: string;
  readonly tone: 'info' | 'error';
  readonly action?: ToastAction;
}

const TOAST_MS = 5000;

function pickFields(item: TrackerItem, patch: ItemPatch): ItemPatch {
  return Object.fromEntries(Object.keys(patch).map((key) => [key, item[key as keyof ItemPatch]])) as ItemPatch;
}

export interface TrackerState {
  readonly items: readonly TrackerItem[];
  readonly toasts: readonly Toast[];
  readonly dismissToast: (id: number) => void;
  readonly create: (input: CreateItemInput) => Promise<TrackerItem | null>;
  readonly update: (id: string, patch: ItemPatch) => Promise<void>;
  readonly archive: (id: string) => Promise<void>;
}

export function useTracker(initialItems: readonly TrackerItem[]): TrackerState {
  const [items, setItems] = useState<readonly TrackerItem[]>(initialItems);
  const [toasts, setToasts] = useState<readonly Toast[]>([]);
  const toastCounter = useRef(0);
  const toastTimers = useRef(new Map<number, number>());

  useEffect(() => {
    const timers = toastTimers.current;
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, []);

  const dismissToast = useCallback((id: number): void => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = toastTimers.current.get(id);
    if (timer) window.clearTimeout(timer);
    toastTimers.current.delete(id);
  }, []);

  const notify = useCallback(
    (message: string, tone: Toast['tone'], action?: ToastAction): void => {
      toastCounter.current += 1;
      const id = toastCounter.current;
      setToasts((current) => [...current.slice(-2), { id, message, tone, action }]);
      toastTimers.current.set(
        id,
        window.setTimeout(() => dismissToast(id), TOAST_MS),
      );
    },
    [dismissToast],
  );

  const replace = useCallback((id: string, transform: (item: TrackerItem) => TrackerItem): void => {
    setItems((current) => current.map((item) => (item.id === id ? transform(item) : item)));
  }, []);

  const update = useCallback(
    async (id: string, patch: ItemPatch): Promise<void> => {
      const existing = items.find((item) => item.id === id);
      if (!existing) return;
      const previous = pickFields(existing, patch);
      replace(id, (item) => applyPatch(item, patch, new Date().toISOString()));
      try {
        const saved = await trackerApi.update(id, patch);
        replace(id, (item) => ({ ...item, ...pickFields(saved, patch), updatedAt: saved.updatedAt }));
      } catch (error) {
        replace(id, (item) => ({ ...item, ...previous }));
        notify(messageOf(error), 'error');
      }
    },
    [items, notify, replace],
  );

  const create = useCallback(
    async (input: CreateItemInput): Promise<TrackerItem | null> => {
      try {
        const item = await trackerApi.create(input);
        setItems((current) => [...current, item]);
        return item;
      } catch (error) {
        notify(messageOf(error), 'error');
        return null;
      }
    },
    [notify],
  );

  const archive = useCallback(
    async (id: string): Promise<void> => {
      replace(id, (item) => ({ ...item, archived: true }));
      try {
        await trackerApi.archive(id);
        notify('Moved to trash', 'info', {
          label: 'Undo',
          run: () => {
            replace(id, (item) => ({ ...item, archived: false }));
            trackerApi.update(id, { archived: false }).catch((error: unknown) => {
              replace(id, (item) => ({ ...item, archived: true }));
              notify(messageOf(error), 'error');
            });
          },
        });
      } catch (error) {
        replace(id, (item) => ({ ...item, archived: false }));
        notify(messageOf(error), 'error');
      }
    },
    [notify, replace],
  );

  return { items, toasts, dismissToast, create, update, archive };
}
