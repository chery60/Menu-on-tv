import {
  AREA_META,
  AREAS,
  EFFORT_META,
  PHASE_META,
  PHASES,
  PRIORITIES,
  PRIORITY_META,
  STATUS_META,
  STATUSES,
  type GroupBy,
  type ItemPatch,
  type OptionMeta,
  type Phase,
  type SortBy,
  type TrackerFilters,
  type TrackerItem,
} from './types';

/** Pure board logic: scoring, filtering, grouping, ordering and moves. */

const RANK_STEP = 1024;

export function iceScore(item: Pick<TrackerItem, 'impact' | 'confidence' | 'effort'>): number {
  const raw = (item.impact * item.confidence) / EFFORT_META[item.effort].points;
  return Math.round(raw * 10) / 10;
}

export function matchesFilters(item: TrackerItem, filters: TrackerFilters): boolean {
  if (filters.phases.length > 0 && !filters.phases.includes(item.phase)) return false;
  if (filters.areas.length > 0 && !filters.areas.includes(item.area)) return false;
  if (filters.priorities.length > 0 && !filters.priorities.includes(item.priority)) return false;

  const query = filters.query.trim().toLowerCase();
  if (!query) return true;
  const haystack = [item.key, item.title, item.summary, item.owner, ...item.tags].join(' ').toLowerCase();
  return query.split(/\s+/).every((word) => haystack.includes(word));
}

export function filterItems(items: readonly TrackerItem[], filters: TrackerFilters): readonly TrackerItem[] {
  return items.filter((item) => !item.archived && matchesFilters(item, filters));
}

export function activeFilterCount(filters: TrackerFilters): number {
  return filters.phases.length + filters.areas.length + filters.priorities.length;
}

const PRIORITY_ORDER = Object.fromEntries(PRIORITIES.map((p, i) => [p, i])) as Record<string, number>;

const comparators: Readonly<Record<SortBy, (a: TrackerItem, b: TrackerItem) => number>> = {
  manual: (a, b) => a.rank - b.rank,
  ice: (a, b) => iceScore(b) - iceScore(a) || a.rank - b.rank,
  priority: (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || a.rank - b.rank,
  updated: (a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.rank - b.rank,
};

export function sortItems(items: readonly TrackerItem[], sortBy: SortBy): readonly TrackerItem[] {
  return [...items].sort(comparators[sortBy]);
}

export interface Group {
  readonly key: string;
  readonly meta: OptionMeta;
  readonly items: readonly TrackerItem[];
}

const GROUP_DEFINITIONS: Readonly<Record<GroupBy, readonly (readonly [string, OptionMeta])[]>> = {
  status: STATUSES.map((s) => [s, STATUS_META[s]] as const),
  phase: PHASES.map((p) => [p, PHASE_META[p]] as const),
  area: AREAS.map((a) => [a, AREA_META[a]] as const),
  priority: PRIORITIES.map((p) => [p, PRIORITY_META[p]] as const),
};

export function groupKeyOf(item: TrackerItem, groupBy: GroupBy): string {
  return item[groupBy];
}

/** Every group appears, in canonical order, even when empty, so items can be dropped into it. */
export function groupItems(items: readonly TrackerItem[], groupBy: GroupBy, sortBy: SortBy): readonly Group[] {
  return GROUP_DEFINITIONS[groupBy].map(([key, meta]) => ({
    key,
    meta,
    items: sortItems(
      items.filter((item) => groupKeyOf(item, groupBy) === key),
      sortBy,
    ),
  }));
}

export function rankBetween(before: number | undefined, after: number | undefined): number {
  if (before === undefined && after === undefined) return RANK_STEP;
  if (before === undefined) return (after as number) - RANK_STEP;
  if (after === undefined) return before + RANK_STEP;
  return (before + after) / 2;
}

export function nextRank(items: readonly TrackerItem[]): number {
  return items.reduce((max, item) => Math.max(max, item.rank), 0) + RANK_STEP;
}

/**
 * Computes the patch for dropping `itemId` into `targetGroup` at `targetIndex`,
 * where the index counts positions in the target group *without* the moved item.
 */
export function planMove(
  items: readonly TrackerItem[],
  itemId: string,
  groupBy: GroupBy,
  targetGroup: string,
  targetIndex: number,
): ItemPatch | null {
  const moving = items.find((item) => item.id === itemId);
  if (!moving) return null;

  const siblings = sortItems(
    items.filter((item) => item.id !== itemId && !item.archived && groupKeyOf(item, groupBy) === targetGroup),
    'manual',
  );
  const index = Math.max(0, Math.min(targetIndex, siblings.length));
  const rank = rankBetween(siblings[index - 1]?.rank, siblings[index]?.rank);

  const sameGroup = groupKeyOf(moving, groupBy) === targetGroup;
  if (sameGroup && rank === moving.rank) return null;

  return sameGroup ? { rank } : ({ rank, [groupBy]: targetGroup } as ItemPatch);
}

export function applyPatch(item: TrackerItem, patch: ItemPatch, now: string): TrackerItem {
  return { ...item, ...patch, updatedAt: now };
}

export function nextKey(items: readonly TrackerItem[]): string {
  const highest = items.reduce((max, item) => {
    const number = Number(item.key.replace(/^MT-/, ''));
    return Number.isFinite(number) ? Math.max(max, number) : max;
  }, 0);
  return `MT-${highest + 1}`;
}

export interface PhaseProgress {
  readonly phase: Phase;
  readonly total: number;
  readonly done: number;
}

export function phaseProgress(items: readonly TrackerItem[]): readonly PhaseProgress[] {
  const live = items.filter((item) => !item.archived);
  return PHASES.map((phase) => {
    const inPhase = live.filter((item) => item.phase === phase);
    return { phase, total: inPhase.length, done: inPhase.filter((item) => item.status === 'done').length };
  });
}

export function checklistProgress(item: Pick<TrackerItem, 'checklist'>): { readonly done: number; readonly total: number } {
  return { done: item.checklist.filter((entry) => entry.done).length, total: item.checklist.length };
}
