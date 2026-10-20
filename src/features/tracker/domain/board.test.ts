import { describe, expect, it } from 'vitest';
import {
  activeFilterCount,
  applyPatch,
  checklistProgress,
  filterItems,
  groupItems,
  iceScore,
  nextKey,
  nextRank,
  phaseProgress,
  planMove,
  rankBetween,
  sortItems,
} from './board';
import { EMPTY_FILTERS, type TrackerItem } from './types';

const base: TrackerItem = {
  id: 'id-1',
  key: 'MT-1',
  title: 'Screen pairing',
  icon: '💳',
  status: 'backlog',
  priority: 'medium',
  phase: 'phase-1',
  area: 'screens',
  effort: 'm',
  impact: 3,
  confidence: 3,
  owner: '',
  tags: ['stripe'],
  summary: 'Pair a TV with a short code',
  body: '',
  checklist: [],
  rank: 1024,
  archived: false,
  createdAt: '2026-10-11T00:00:00.000Z',
  updatedAt: '2026-10-11T00:00:00.000Z',
};

const make = (overrides: Partial<TrackerItem>): TrackerItem => ({ ...base, ...overrides });

describe('iceScore', () => {
  it('divides impact × confidence by effort points, to one decimal', () => {
    expect(iceScore({ impact: 5, confidence: 4, effort: 's' })).toBe(10);
    expect(iceScore({ impact: 3, confidence: 3, effort: 'm' })).toBe(3);
    expect(iceScore({ impact: 2, confidence: 5, effort: 'xl' })).toBe(2);
    expect(iceScore({ impact: 4, confidence: 2, effort: 'm' })).toBe(2.7);
  });
});

describe('filterItems', () => {
  const items = [
    make({ id: 'a', key: 'MT-1', title: 'Screen pairing', phase: 'phase-1', area: 'screens', priority: 'high' }),
    make({ id: 'b', key: 'MT-2', title: 'Local ad booking', phase: 'phase-2', area: 'ads', priority: 'medium', tags: ['ads'] }),
    make({ id: 'c', key: 'MT-3', title: 'Old idea', archived: true }),
  ];

  it('hides archived items', () => {
    expect(filterItems(items, EMPTY_FILTERS).map((i) => i.id)).toEqual(['a', 'b']);
  });

  it('filters by phase, area and priority together', () => {
    expect(filterItems(items, { ...EMPTY_FILTERS, phases: ['phase-2'] }).map((i) => i.id)).toEqual(['b']);
    expect(filterItems(items, { ...EMPTY_FILTERS, areas: ['screens'], priorities: ['high'] }).map((i) => i.id)).toEqual(['a']);
    expect(filterItems(items, { ...EMPTY_FILTERS, areas: ['screens'], priorities: ['low'] })).toEqual([]);
  });

  it('matches every word of the query across key, title, summary and tags', () => {
    expect(filterItems(items, { ...EMPTY_FILTERS, query: 'mt-2' }).map((i) => i.id)).toEqual(['b']);
    expect(filterItems(items, { ...EMPTY_FILTERS, query: 'local ads' }).map((i) => i.id)).toEqual(['b']);
    expect(filterItems(items, { ...EMPTY_FILTERS, query: 'pairing nothing' })).toEqual([]);
  });

  it('counts active filters', () => {
    expect(activeFilterCount({ ...EMPTY_FILTERS, phases: ['phase-1'], areas: ['ai', 'ads'] })).toBe(3);
  });
});

describe('sortItems', () => {
  const items = [
    make({ id: 'a', rank: 3000, priority: 'low', impact: 5, confidence: 5, effort: 'xs', updatedAt: '2026-10-01T00:00:00.000Z' }),
    make({ id: 'b', rank: 1000, priority: 'urgent', impact: 1, confidence: 1, effort: 'xl', updatedAt: '2026-10-03T00:00:00.000Z' }),
    make({ id: 'c', rank: 2000, priority: 'high', impact: 3, confidence: 3, effort: 'm', updatedAt: '2026-10-02T00:00:00.000Z' }),
  ];

  it('sorts manually by rank', () => expect(sortItems(items, 'manual').map((i) => i.id)).toEqual(['b', 'c', 'a']));
  it('sorts by ICE, highest first', () => expect(sortItems(items, 'ice').map((i) => i.id)).toEqual(['a', 'c', 'b']));
  it('sorts by priority', () => expect(sortItems(items, 'priority').map((i) => i.id)).toEqual(['b', 'c', 'a']));
  it('sorts by most recently updated', () => expect(sortItems(items, 'updated').map((i) => i.id)).toEqual(['b', 'c', 'a']));

  it('does not mutate its input', () => {
    const copy = [...items];
    sortItems(items, 'ice');
    expect(items).toEqual(copy);
  });
});

describe('groupItems', () => {
  it('returns every group in canonical order, including empty ones', () => {
    const groups = groupItems([make({ status: 'done' })], 'status', 'manual');
    expect(groups.map((g) => g.key)).toEqual(['backlog', 'planned', 'in_progress', 'in_review', 'done']);
    expect(groups.find((g) => g.key === 'done')?.items).toHaveLength(1);
    expect(groups.find((g) => g.key === 'backlog')?.items).toHaveLength(0);
  });
});

describe('ranks and moves', () => {
  it('computes ranks between neighbours and at the ends', () => {
    expect(rankBetween(undefined, undefined)).toBe(1024);
    expect(rankBetween(undefined, 1024)).toBe(0);
    expect(rankBetween(1024, undefined)).toBe(2048);
    expect(rankBetween(1000, 2000)).toBe(1500);
  });

  it('places a new item after the highest rank', () => {
    expect(nextRank([make({ rank: 5000 }), make({ rank: 2000 })])).toBe(6024);
    expect(nextRank([])).toBe(1024);
  });

  const items = [
    make({ id: 'a', status: 'backlog', rank: 1000 }),
    make({ id: 'b', status: 'backlog', rank: 2000 }),
    make({ id: 'c', status: 'planned', rank: 1000 }),
  ];

  it('moves an item into another group at an index', () => {
    expect(planMove(items, 'a', 'status', 'planned', 1)).toEqual({ rank: 2024, status: 'planned' });
    expect(planMove(items, 'a', 'status', 'planned', 0)).toEqual({ rank: -24, status: 'planned' });
  });

  it('reorders within a group without changing the group field', () => {
    expect(planMove(items, 'a', 'status', 'backlog', 1)).toEqual({ rank: 3024 });
  });

  it('returns null for no-op moves and unknown items', () => {
    const single = [make({ id: 'solo', status: 'backlog', rank: 1024 })];
    expect(planMove(single, 'solo', 'status', 'backlog', 0)).toBeNull();
    expect(planMove(items, 'missing', 'status', 'backlog', 0)).toBeNull();
  });

  it('works for other group fields', () => {
    expect(planMove(items, 'a', 'phase', 'phase-3', 0)).toEqual({ rank: 1024, phase: 'phase-3' });
  });
});

describe('helpers', () => {
  it('applies a patch immutably and stamps updatedAt', () => {
    const updated = applyPatch(base, { title: 'New' }, '2026-10-12T00:00:00.000Z');
    expect(updated.title).toBe('New');
    expect(updated.updatedAt).toBe('2026-10-12T00:00:00.000Z');
    expect(base.title).toBe('Screen pairing');
  });

  it('creates the next key', () => {
    expect(nextKey([make({ key: 'MT-9' }), make({ key: 'MT-41' })])).toBe('MT-42');
    expect(nextKey([])).toBe('MT-1');
  });

  it('summarises progress per phase, ignoring archived items', () => {
    const progress = phaseProgress([
      make({ phase: 'phase-0', status: 'done' }),
      make({ phase: 'phase-0', status: 'planned' }),
      make({ phase: 'phase-0', status: 'done', archived: true }),
    ]);
    expect(progress[0]).toEqual({ phase: 'phase-0', total: 2, done: 1 });
    expect(progress).toHaveLength(5);
  });

  it('counts checklist progress', () => {
    expect(
      checklistProgress({
        checklist: [
          { id: '1', text: 'a', done: true },
          { id: '2', text: 'b', done: false },
        ],
      }),
    ).toEqual({ done: 1, total: 2 });
  });
});
