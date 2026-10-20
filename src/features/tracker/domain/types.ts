/** Tracker domain model. Labels and colours live here so every view stays consistent. */

export const STATUSES = ['backlog', 'planned', 'in_progress', 'in_review', 'done'] as const;
export const PRIORITIES = ['urgent', 'high', 'medium', 'low'] as const;
export const PHASES = ['phase-0', 'phase-1', 'phase-2', 'phase-3', 'phase-4'] as const;
export const AREAS = [
  'foundations',
  'menu',
  'screens',
  'promos',
  'ai',
  'devices',
  'integrations',
  'ads',
  'analytics',
  'billing',
  'growth',
  'trust',
  'platform',
] as const;
export const EFFORTS = ['xs', 's', 'm', 'l', 'xl'] as const;
export const SCORES = [1, 2, 3, 4, 5] as const;

export type Status = (typeof STATUSES)[number];
export type Priority = (typeof PRIORITIES)[number];
export type Phase = (typeof PHASES)[number];
export type Area = (typeof AREAS)[number];
export type Effort = (typeof EFFORTS)[number];
export type Score = (typeof SCORES)[number];

export type TagColor = 'gray' | 'brown' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink' | 'red';

export interface ChecklistItem {
  readonly id: string;
  readonly text: string;
  readonly done: boolean;
}

export interface TrackerItem {
  readonly id: string;
  readonly key: string;
  readonly title: string;
  readonly icon: string;
  readonly status: Status;
  readonly priority: Priority;
  readonly phase: Phase;
  readonly area: Area;
  readonly effort: Effort;
  readonly impact: Score;
  readonly confidence: Score;
  readonly owner: string;
  readonly tags: readonly string[];
  readonly summary: string;
  readonly body: string;
  readonly checklist: readonly ChecklistItem[];
  readonly rank: number;
  readonly archived: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type EditableField =
  | 'title'
  | 'icon'
  | 'status'
  | 'priority'
  | 'phase'
  | 'area'
  | 'effort'
  | 'impact'
  | 'confidence'
  | 'owner'
  | 'tags'
  | 'summary'
  | 'body'
  | 'checklist'
  | 'rank'
  | 'archived';

export type ItemPatch = Partial<Pick<TrackerItem, EditableField>>;

export interface OptionMeta {
  readonly label: string;
  readonly short?: string;
  readonly color: TagColor;
}

export const STATUS_META: Readonly<Record<Status, OptionMeta>> = {
  backlog: { label: 'Backlog', color: 'gray' },
  planned: { label: 'Planned', color: 'purple' },
  in_progress: { label: 'In progress', color: 'blue' },
  in_review: { label: 'In review', color: 'orange' },
  done: { label: 'Done', color: 'green' },
};

export const PRIORITY_META: Readonly<Record<Priority, OptionMeta>> = {
  urgent: { label: 'Urgent', color: 'red' },
  high: { label: 'High', color: 'orange' },
  medium: { label: 'Medium', color: 'yellow' },
  low: { label: 'Low', color: 'gray' },
};

export const PHASE_META: Readonly<Record<Phase, OptionMeta>> = {
  'phase-0': { label: 'Foundations', short: 'P0', color: 'brown' },
  'phase-1': { label: 'First screen live', short: 'v0', color: 'blue' },
  'phase-2': { label: 'Sell more', short: 'v1', color: 'green' },
  'phase-3': { label: 'Screens that pay', short: 'v2', color: 'purple' },
  'phase-4': { label: 'Platform', short: 'v3', color: 'pink' },
};

export const AREA_META: Readonly<Record<Area, OptionMeta>> = {
  foundations: { label: 'Foundations', color: 'gray' },
  menu: { label: 'Menu builder', color: 'yellow' },
  screens: { label: 'Screens and layouts', color: 'blue' },
  promos: { label: 'Promos and ad studio', color: 'orange' },
  ai: { label: 'AI helpers', color: 'purple' },
  devices: { label: 'TVs and devices', color: 'brown' },
  integrations: { label: 'POS and integrations', color: 'green' },
  ads: { label: 'Local ad network', color: 'pink' },
  analytics: { label: 'Proof and analytics', color: 'blue' },
  billing: { label: 'Plans and billing', color: 'green' },
  growth: { label: 'Sales and growth', color: 'orange' },
  trust: { label: 'Privacy, safety and rules', color: 'red' },
  platform: { label: 'Platform and API', color: 'gray' },
};

export const EFFORT_META: Readonly<Record<Effort, OptionMeta & { readonly points: number }>> = {
  xs: { label: 'XS', color: 'gray', points: 1 },
  s: { label: 'S', color: 'gray', points: 2 },
  m: { label: 'M', color: 'gray', points: 3 },
  l: { label: 'L', color: 'gray', points: 4 },
  xl: { label: 'XL', color: 'gray', points: 5 },
};

export type GroupBy = 'status' | 'phase' | 'area' | 'priority';
export type SortBy = 'manual' | 'ice' | 'priority' | 'updated';

export interface TrackerFilters {
  readonly query: string;
  readonly phases: readonly Phase[];
  readonly areas: readonly Area[];
  readonly priorities: readonly Priority[];
}

export const EMPTY_FILTERS: TrackerFilters = { query: '', phases: [], areas: [], priorities: [] };
