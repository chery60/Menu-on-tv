import { describe, expect, it } from 'vitest';
import { caloriesCount, caloriesWarning } from './calorie-flags';

describe('calorie flags', () => {
  it('warns how many dishes will show without calories, in the singular for one', () => {
    expect(caloriesWarning(8)).toBe('8 dishes have no calories yet. They’ll show without calories until you add them.');
    expect(caloriesWarning(1)).toBe('1 dish has no calories yet. It’ll show without calories until you add them.');
  });

  it('counts the dishes left, and says when every dish has calories', () => {
    expect(caloriesCount(8)).toBe('8 dishes have no calories.');
    expect(caloriesCount(1)).toBe('1 dish has no calories.');
    expect(caloriesCount(0)).toBe('Every dish has calories.');
  });
});
