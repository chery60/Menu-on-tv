/**
 * Maths for the home page's pinned scenes: a tall section holds a sticky stage, and how far the reader
 * has scrolled through it picks what the stage shows. Kept pure so it can be tested without a browser.
 */

export interface SectionBox {
  /** The section's top edge relative to the viewport, as `getBoundingClientRect().top` gives it. */
  readonly top: number;
  readonly height: number;
}

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

/** 0 when the section's top reaches the top of the screen, 1 when its bottom reaches the bottom. */
export function sceneProgress(box: SectionBox, viewportHeight: number): number {
  const travel = box.height - viewportHeight;
  if (travel <= 0) return box.top <= 0 ? 1 : 0;
  return clamp01(-box.top / travel);
}

/** Which of `count` equal steps the progress falls in. */
export function sceneStep(progress: number, count: number): number {
  return Math.min(count - 1, Math.floor(clamp01(progress) * count));
}

