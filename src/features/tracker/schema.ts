import { z } from 'zod';
import { AREAS, EFFORTS, PHASES, PRIORITIES, STATUSES, type TrackerItem } from './domain/types';

/** Validation for tracker data at every boundary: API input and the data file. */

const TITLE_MAX = 200;
const SUMMARY_MAX = 300;
const BODY_MAX = 20_000;
const OWNER_MAX = 80;
const TAG_MAX = 40;
const TAGS_MAX = 12;
const CHECKLIST_MAX = 40;
const ICON_MAX = 16;

const score = z.literal([1, 2, 3, 4, 5], { error: 'Use a score from 1 to 5.' });

export const checklistItemSchema = z.object({
  id: z.string().min(1).max(64),
  text: z.string().trim().min(1, { error: 'Checklist items need some text.' }).max(SUMMARY_MAX),
  done: z.boolean(),
});

const editableShape = {
  title: z.string().trim().min(1, { error: 'Give the item a title.' }).max(TITLE_MAX, { error: 'Keep the title under 200 characters.' }),
  icon: z.string().trim().min(1).max(ICON_MAX),
  status: z.enum(STATUSES),
  priority: z.enum(PRIORITIES),
  phase: z.enum(PHASES),
  area: z.enum(AREAS),
  effort: z.enum(EFFORTS),
  impact: score,
  confidence: score,
  owner: z.string().trim().max(OWNER_MAX),
  tags: z.array(z.string().trim().min(1).max(TAG_MAX)).max(TAGS_MAX),
  summary: z.string().trim().max(SUMMARY_MAX),
  body: z.string().max(BODY_MAX),
  checklist: z.array(checklistItemSchema).max(CHECKLIST_MAX),
  rank: z.number().finite(),
  archived: z.boolean(),
};

export const trackerItemSchema = z.object({
  id: z.string().min(1),
  key: z.string().regex(/^MT-\d+$/),
  ...editableShape,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const createItemSchema = z.object({
  title: editableShape.title,
  icon: editableShape.icon.optional(),
  status: editableShape.status.optional(),
  priority: editableShape.priority.optional(),
  phase: editableShape.phase.optional(),
  area: editableShape.area.optional(),
  effort: editableShape.effort.optional(),
  impact: score.optional(),
  confidence: score.optional(),
  owner: editableShape.owner.optional(),
  tags: editableShape.tags.optional(),
  summary: editableShape.summary.optional(),
  body: editableShape.body.optional(),
  checklist: editableShape.checklist.optional(),
  rank: editableShape.rank.optional(),
});

export const updateItemSchema = z
  .object(editableShape)
  .partial()
  .strict()
  .refine((patch) => Object.keys(patch).length > 0, { error: 'Send at least one field to change.' });

export const trackerFileSchema = z.object({
  version: z.literal(1),
  items: z.array(trackerItemSchema),
});

export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;

/** The data file, typed with the domain's readonly item model (zod output is assignable to it). */
export interface TrackerFile {
  readonly version: 1;
  readonly items: readonly TrackerItem[];
}
