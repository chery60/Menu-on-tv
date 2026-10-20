import type { ChecklistItem } from '../domain/types';

/** Turns seed text into tracker item fields. Shared by every seed file. */

const DONE_PREFIX = '[x] ';

export interface BodyParts {
  readonly why: string;
  readonly what: string;
  readonly notes?: string;
}

/** Acceptance criteria become checklist entries. Prefix an entry with "[x] " when it is already met. */
export function toChecklist(entries: readonly string[], idPrefix: string): readonly ChecklistItem[] {
  return entries.map((entry, index) => {
    const done = entry.startsWith(DONE_PREFIX);
    return { id: `${idPrefix}-c${index + 1}`, text: done ? entry.slice(DONE_PREFIX.length) : entry, done };
  });
}

export function toBody({ why, what, notes }: BodyParts): string {
  const parts = [`**Why.** ${why}`, `**What.** ${what}`];
  if (notes) parts.push(notes);
  return parts.join('\n\n');
}
