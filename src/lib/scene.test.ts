import { describe, expect, it } from 'vitest';
import { sceneProgress, sceneStep } from './scene';

describe('sceneProgress', () => {
  it('is 0 before the stage pins and 1 once it has scrolled past', () => {
    expect(sceneProgress({ top: 200, height: 3000 }, 800)).toBe(0);
    expect(sceneProgress({ top: -2200, height: 3000 }, 800)).toBe(1);
    expect(sceneProgress({ top: -5000, height: 3000 }, 800)).toBe(1);
  });

  it('runs evenly through the scrollable length', () => {
    expect(sceneProgress({ top: -1100, height: 3000 }, 800)).toBeCloseTo(0.5);
  });

  it('treats a section no taller than the screen as finished once it reaches the top', () => {
    expect(sceneProgress({ top: 0, height: 600 }, 800)).toBe(1);
    expect(sceneProgress({ top: 10, height: 600 }, 800)).toBe(0);
  });
});

describe('sceneStep', () => {
  it('splits progress into equal steps', () => {
    expect(sceneStep(0, 4)).toBe(0);
    expect(sceneStep(0.24, 4)).toBe(0);
    expect(sceneStep(0.25, 4)).toBe(1);
    expect(sceneStep(0.99, 4)).toBe(3);
  });

  it('never runs past the last step', () => {
    expect(sceneStep(1, 4)).toBe(3);
    expect(sceneStep(1.4, 4)).toBe(3);
    expect(sceneStep(-0.2, 4)).toBe(0);
  });
});

