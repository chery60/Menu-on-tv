/** The owner's words for dishes on the TVs with no calories yet (MT-29): before the switch goes on, and above the menu while it is on. */

/** The Restaurant tab lists this many dishes before "and 4 more". */
export const LISTED_WITHOUT_CALORIES = 10;

export function caloriesWarning(count: number): string {
  return count === 1 ? '1 dish has no calories yet. It’ll show without calories until you add them.' : `${count} dishes have no calories yet. They’ll show without calories until you add them.`;
}

export function caloriesCount(count: number): string {
  if (count === 0) return 'Every dish has calories.';
  return count === 1 ? '1 dish has no calories.' : `${count} dishes have no calories.`;
}
