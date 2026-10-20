'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocalPreference } from '../client/use-local-preference';
import { useTracker } from '../client/use-tracker';
import { activeFilterCount, filterItems, groupItems, phaseProgress, planMove, type PhaseProgress } from '../domain/board';
import {
  EMPTY_FILTERS,
  PHASE_META,
  type GroupBy,
  type ItemPatch,
  type Phase,
  type SortBy,
  type TrackerFilters,
  type TrackerItem,
} from '../domain/types';
import type { CreateItemInput } from '../schema';
import { BoardView } from './board-view';
import { ItemPeek } from './item-peek';
import { TableView } from './table-view';
import { Toasts } from './toasts';
import { Toolbar, type ViewMode } from './toolbar';

const PREFS_KEY = 'mt-board-prefs';
const GROUP_VALUES: readonly GroupBy[] = ['status', 'phase', 'area', 'priority'];
const SORT_VALUES: readonly SortBy[] = ['manual', 'ice', 'priority', 'updated'];

interface StoredPrefs {
  readonly groupBy?: unknown;
  readonly sortBy?: unknown;
}

interface BoardPrefs {
  readonly groupBy: GroupBy;
  readonly sortBy: SortBy;
}

function parsePrefs(raw: string | null): BoardPrefs {
  let parsed: StoredPrefs = {};
  try {
    parsed = JSON.parse(raw ?? '{}') as StoredPrefs;
  } catch {
    parsed = {};
  }
  return {
    groupBy: GROUP_VALUES.find((value) => value === parsed.groupBy) ?? 'status',
    sortBy: SORT_VALUES.find((value) => value === parsed.sortBy) ?? 'manual',
  };
}

function syncUrl(selectedId: string | null, view: ViewMode): void {
  const url = new URL(window.location.href);
  if (selectedId) url.searchParams.set('item', selectedId);
  else url.searchParams.delete('item');
  if (view === 'table') url.searchParams.set('view', 'table');
  else url.searchParams.delete('view');
  window.history.replaceState(window.history.state, '', url);
}

interface PhaseStripProps {
  readonly progress: readonly PhaseProgress[];
  readonly active: readonly Phase[];
  readonly onToggle: (phase: Phase) => void;
}

function PhaseStrip({ progress, active, onToggle }: PhaseStripProps) {
  return (
    <ul className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5" aria-label="Progress by phase">
      {progress.map((entry) => {
        const meta = PHASE_META[entry.phase];
        const share = entry.total ? Math.round((entry.done / entry.total) * 100) : 0;
        const pressed = active.includes(entry.phase);
        return (
          <li key={entry.phase}>
            <button
              type="button"
              aria-pressed={pressed}
              onClick={() => onToggle(entry.phase)}
              title={pressed ? 'Show all phases' : `Show only ${meta.label}`}
              className={`w-full rounded-lg border p-3 text-left transition-colors duration-100 hover:bg-hover ${pressed ? 'border-primary bg-primary-soft' : 'border-rule'}`}
            >
              <span className="text-xs text-ink-faint">{meta.short}</span>
              <span className="block truncate text-sm font-medium text-ink">{meta.label}</span>
              <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-hover" aria-hidden="true">
                <span className="block h-full rounded-full bg-primary" style={{ width: `${share}%` }} />
              </span>
              <span className="mt-1.5 block text-xs text-ink-dim tabular">
                {entry.done} of {entry.total} done
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

interface TrackerAppProps {
  readonly initialItems: readonly TrackerItem[];
  readonly initialView: ViewMode;
  readonly initialSelectedId: string | null;
}

export function TrackerApp({ initialItems, initialView, initialSelectedId }: TrackerAppProps) {
  const { items, toasts, dismissToast, create, update, archive } = useTracker(initialItems);
  const [view, setView] = useState<ViewMode>(initialView);
  const [storedPrefs, setStoredPrefs] = useLocalPreference(PREFS_KEY);
  const { groupBy, sortBy } = useMemo(() => parsePrefs(storedPrefs), [storedPrefs]);
  const [filters, setFilters] = useState<TrackerFilters>(EMPTY_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId);
  const searchRef = useRef<HTMLInputElement>(null);

  const visible = useMemo(() => filterItems(items, filters), [items, filters]);
  const groups = useMemo(() => groupItems(visible, groupBy, sortBy), [visible, groupBy, sortBy]);
  const progress = useMemo(() => phaseProgress(items), [items]);
  const selected = selectedId ? items.find((item) => item.id === selectedId && !item.archived) : undefined;

  const open = useCallback(
    (id: string): void => {
      setSelectedId(id);
      syncUrl(id, view);
    },
    [view],
  );

  const close = useCallback((): void => {
    setSelectedId(null);
    syncUrl(null, view);
  }, [view]);

  const createAndOpen = useCallback(async (): Promise<void> => {
    const item = await create({ title: 'Untitled', icon: '📌' });
    if (item) open(item.id);
  }, [create, open]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target instanceof HTMLElement ? event.target : null;
      const typing = Boolean(
        target?.closest(
          'textarea, select, [contenteditable="true"], input:not([type="checkbox"]):not([type="radio"]):not([type="button"])',
        ),
      );

      if (event.key === 'Escape') {
        if (typing) target?.blur();
        else if (selectedId) close();
        return;
      }
      if (typing) return;
      if (event.key === 'c') {
        event.preventDefault();
        void createAndOpen();
      } else if (event.key === '/') {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close, createAndOpen, selectedId]);

  const changeView = (next: ViewMode): void => {
    setView(next);
    syncUrl(selectedId, next);
  };

  const changeGroupBy = (next: GroupBy): void => setStoredPrefs(JSON.stringify({ groupBy: next, sortBy }));
  const changeSortBy = (next: SortBy): void => setStoredPrefs(JSON.stringify({ groupBy, sortBy: next }));

  const togglePhase = (phase: Phase): void => {
    setFilters((current) => ({ ...current, phases: current.phases.length === 1 && current.phases[0] === phase ? [] : [phase] }));
  };

  const moveItem = (id: string, targetGroup: string, targetIndex: number): void => {
    const patch = planMove(items, id, groupBy, targetGroup, targetIndex);
    if (patch) void update(id, patch);
  };

  const createInGroup = (groupKey: string, title: string): void => {
    void create({ title, [groupBy]: groupKey } as CreateItemInput);
  };

  const hasFilters = activeFilterCount(filters) > 0 || filters.query.trim().length > 0;

  return (
    <div className="px-4 sm:px-8">
      <header className="pt-10 pb-5">
        <div aria-hidden="true" className="text-[2.6rem] leading-none">
          🗺️
        </div>
        <h1 className="mt-3 font-display text-[2.25rem] font-semibold leading-tight tracking-[-0.02em] text-ink">Product roadmap</h1>
        <p className="mt-2 max-w-[72ch] text-ink-dim">
          Everything we plan to build for MenuOnTV, from research to the ad network. Drag cards between columns, open one to edit it, or press C to add an item.
        </p>
        <PhaseStrip progress={progress} active={filters.phases} onToggle={togglePhase} />
      </header>

      <Toolbar
        view={view}
        groupBy={groupBy}
        sortBy={sortBy}
        filters={filters}
        searchRef={searchRef}
        onViewChange={changeView}
        onGroupByChange={changeGroupBy}
        onSortByChange={changeSortBy}
        onFiltersChange={setFilters}
        onNew={() => void createAndOpen()}
      />

      <div className="pt-4">
        {hasFilters && visible.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-ink-dim">No items match these choices. Change your filters.</p>
            <button
              type="button"
              onClick={() => setFilters(EMPTY_FILTERS)}
              className="mt-3 rounded-md border border-rule px-3 py-1.5 text-sm text-ink hover:bg-hover"
            >
              Clear filters and search
            </button>
          </div>
        ) : view === 'board' ? (
          <BoardView
            groups={groups}
            groupBy={groupBy}
            selectedId={selectedId}
            onOpen={open}
            onMove={moveItem}
            onCreate={createInGroup}
            onDragStart={() => (selectedId ? close() : undefined)}
          />
        ) : (
          <TableView groups={groups} selectedId={selectedId} onOpen={open} />
        )}
        {sortBy !== 'manual' && view === 'board' ? (
          <p className="pb-6 text-xs text-ink-faint">Sorted by {sortBy === 'ice' ? 'ICE score' : sortBy === 'priority' ? 'priority' : 'last update'}. Switch to manual order to reorder cards inside a column.</p>
        ) : null}
      </div>

      {selected ? (
        <ItemPeek
          key={selected.id}
          item={selected}
          onClose={close}
          onUpdate={(patch: ItemPatch) => void update(selected.id, patch)}
          onArchive={() => {
            void archive(selected.id);
            close();
          }}
        />
      ) : null}

      <Toasts toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
