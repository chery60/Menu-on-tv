import type { Area, Effort, Phase, Priority, Score, Status, TrackerItem } from '../domain/types';
import { toBody, toChecklist } from './format';
import { V1, V2, V3 } from './later';
import { PHASE_0 } from './phase-0';
import { V0 } from './v0';

/**
 * The full MenuOnTV plan as tracker items. This is only the *initial* content of
 * data/tracker.json; after the first run the tracker file is the source of truth.
 * v0 is listed in build order, so the Planned column reads top to bottom as the build plan.
 */

export interface SeedInput {
  readonly title: string;
  readonly icon: string;
  readonly status: Status;
  readonly priority: Priority;
  readonly area: Area;
  readonly effort: Effort;
  readonly impact: Score;
  readonly confidence: Score;
  readonly summary: string;
  readonly why: string;
  readonly what: string;
  /** Acceptance criteria. Prefix with "[x] " when already met. */
  readonly doneWhen: readonly string[];
  readonly tags?: readonly string[];
  readonly owner?: string;
  readonly notes?: string;
}

const SEED_TIMESTAMP = '2026-10-18T00:00:00.000Z';
const RANK_STEP = 1024;

export const PLAN: readonly (readonly [Phase, readonly SeedInput[]])[] = [
  ['phase-0', PHASE_0],
  ['phase-1', V0],
  ['phase-2', V1],
  ['phase-3', V2],
  ['phase-4', V3],
];

export function buildSeedItems(): readonly TrackerItem[] {
  let counter = 0;
  return PLAN.flatMap(([phase, inputs]) =>
    inputs.map((input) => {
      counter += 1;
      const id = `seed-${String(counter).padStart(3, '0')}`;
      return {
        id,
        key: `MT-${counter}`,
        title: input.title,
        icon: input.icon,
        status: input.status,
        priority: input.priority,
        phase,
        area: input.area,
        effort: input.effort,
        impact: input.impact,
        confidence: input.confidence,
        owner: input.owner ?? '',
        tags: input.tags ?? [],
        summary: input.summary,
        body: toBody(input),
        checklist: toChecklist(input.doneWhen, id),
        // Global plan order, so every column lists earlier phases first and v0 in build order.
        rank: counter * RANK_STEP,
        archived: false,
        createdAt: SEED_TIMESTAMP,
        updatedAt: SEED_TIMESTAMP,
      } satisfies TrackerItem;
    }),
  );
}
