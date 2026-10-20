'use client';

import { Kanban, ListFilter, Plus, Search, Table2, X } from 'lucide-react';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { activeFilterCount } from '../domain/board';
import {
  AREA_META,
  AREAS,
  EMPTY_FILTERS,
  PHASE_META,
  PHASES,
  PRIORITIES,
  PRIORITY_META,
  type GroupBy,
  type OptionMeta,
  type SortBy,
  type TrackerFilters,
} from '../domain/types';
import { Tag } from './tag';

export type ViewMode = 'board' | 'table';

interface ToolbarProps {
  readonly view: ViewMode;
  readonly groupBy: GroupBy;
  readonly sortBy: SortBy;
  readonly filters: TrackerFilters;
  readonly searchRef: RefObject<HTMLInputElement | null>;
  readonly onViewChange: (view: ViewMode) => void;
  readonly onGroupByChange: (groupBy: GroupBy) => void;
  readonly onSortByChange: (sortBy: SortBy) => void;
  readonly onFiltersChange: (filters: TrackerFilters) => void;
  readonly onNew: () => void;
}

const GROUP_OPTIONS: readonly (readonly [GroupBy, string])[] = [
  ['status', 'Status'],
  ['phase', 'Phase'],
  ['area', 'Area'],
  ['priority', 'Priority'],
];

const SORT_OPTIONS: readonly (readonly [SortBy, string])[] = [
  ['manual', 'Manual order'],
  ['ice', 'ICE score'],
  ['priority', 'Priority'],
  ['updated', 'Recently updated'],
];

const selectClass =
  'h-8 rounded-md border border-rule bg-paper px-2 text-sm text-ink hover:bg-hover focus-visible:outline-2 focus-visible:outline-primary';

function toggle<T>(list: readonly T[], value: T): readonly T[] {
  return list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value];
}

interface FilterGroupProps<T extends string> {
  readonly title: string;
  readonly options: readonly T[];
  readonly meta: Readonly<Record<T, OptionMeta>>;
  readonly selected: readonly T[];
  readonly onToggle: (value: T) => void;
}

function FilterGroup<T extends string>({ title, options, meta, selected, onToggle }: FilterGroupProps<T>) {
  return (
    <fieldset className="py-2">
      <legend className="px-2 pb-1 text-xs text-ink-faint">{title}</legend>
      {options.map((option) => (
        <label key={option} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-hover">
          <input type="checkbox" checked={selected.includes(option)} onChange={() => onToggle(option)} className="accent-primary" />
          <Tag color={meta[option].color}>
            {meta[option].short ? `${meta[option].short} ` : ''}
            {meta[option].label}
          </Tag>
        </label>
      ))}
    </fieldset>
  );
}

function FilterMenu({ filters, onFiltersChange }: Pick<ToolbarProps, 'filters' | 'onFiltersChange'>) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const count = activeFilterCount(filters);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent): void => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('pointerdown', onPointer);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-sm hover:bg-hover ${count ? 'border-primary text-primary' : 'border-rule text-ink'}`}
      >
        <ListFilter className="size-4" aria-hidden="true" />
        Filter
        {count ? (
          <span className="grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-ink tabular">
            <span className="sr-only">, </span>
            {count}
            <span className="sr-only"> active</span>
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 z-30 mt-1 max-h-[70vh] w-[min(320px,calc(100vw-2rem))] overflow-y-auto rounded-lg border border-rule bg-paper p-1 shadow-float">
          <FilterGroup title="Phase" options={PHASES} meta={PHASE_META} selected={filters.phases} onToggle={(v) => onFiltersChange({ ...filters, phases: toggle(filters.phases, v) })} />
          <FilterGroup title="Priority" options={PRIORITIES} meta={PRIORITY_META} selected={filters.priorities} onToggle={(v) => onFiltersChange({ ...filters, priorities: toggle(filters.priorities, v) })} />
          <FilterGroup title="Area" options={AREAS} meta={AREA_META} selected={filters.areas} onToggle={(v) => onFiltersChange({ ...filters, areas: toggle(filters.areas, v) })} />
          {count ? (
            <button
              type="button"
              onClick={() => onFiltersChange({ ...EMPTY_FILTERS, query: filters.query })}
              className="m-1 w-[calc(100%-0.5rem)] rounded-md px-2 py-1.5 text-left text-sm text-ink-dim hover:bg-hover"
            >
              Clear filters
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function Toolbar(props: ToolbarProps) {
  const { view, groupBy, sortBy, filters, searchRef, onViewChange, onGroupByChange, onSortByChange, onFiltersChange, onNew } = props;

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-rule pb-3">
      <div role="tablist" aria-label="View" className="flex items-center gap-1">
        {(
          [
            ['board', 'Board', Kanban],
            ['table', 'Table', Table2],
          ] as const
        ).map(([mode, label, Icon]) => (
          <button
            key={mode}
            role="tab"
            type="button"
            aria-selected={view === mode}
            onClick={() => onViewChange(mode)}
            className={`inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm ${view === mode ? 'bg-hover font-medium text-ink' : 'text-ink-dim hover:bg-hover'}`}
          >
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      <div className="relative order-last w-full sm:order-none sm:ml-2 sm:w-64">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
        <label htmlFor="tracker-search" className="sr-only">
          Search items
        </label>
        <input
          id="tracker-search"
          ref={searchRef}
          type="search"
          value={filters.query}
          onChange={(event) => onFiltersChange({ ...filters, query: event.target.value })}
          placeholder="Search   /"
          className="h-8 w-full rounded-md border border-rule bg-paper pr-8 pl-8 text-sm text-ink placeholder:text-ink-faint focus:border-primary focus:outline-none"
        />
        {filters.query ? (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => onFiltersChange({ ...filters, query: '' })}
            className="absolute top-1/2 right-1.5 grid size-5 -translate-y-1/2 place-items-center rounded text-ink-faint hover:bg-hover"
          >
            <X className="size-3.5" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-ink-dim">
          <span className="hidden lg:inline">Group</span>
          <select value={groupBy} onChange={(event) => onGroupByChange(event.target.value as GroupBy)} className={selectClass} aria-label="Group by">
            {GROUP_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-ink-dim">
          <span className="hidden lg:inline">Sort</span>
          <select value={sortBy} onChange={(event) => onSortByChange(event.target.value as SortBy)} className={selectClass} aria-label="Sort by">
            {SORT_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <FilterMenu filters={filters} onFiltersChange={onFiltersChange} />
        <button
          type="button"
          onClick={onNew}
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-ink hover:opacity-90"
          title="New item (C)"
        >
          <Plus className="size-4" aria-hidden="true" />
          New
        </button>
      </div>
    </div>
  );
}
