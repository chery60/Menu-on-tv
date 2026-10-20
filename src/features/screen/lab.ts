/**
 * The TV lab panel (tracker MT-12, docs/tv-lab.md): open a TV's link with ?lab and a corner panel keeps score
 * for a 72-hour run. Stats live in the TV's localStorage, so they survive the player's daily reload.
 */

export interface LabStats {
  readonly startedAt: number;
  readonly loads: number;
  readonly worstFps: number | null;
  /** The longest gap between two painted frames: sleep, a hang or heavy jank. */
  readonly longestFreezeMs: number;
  readonly offlineCount: number;
  readonly longestOfflineMs: number;
  readonly memoryStartMb: number | null;
  readonly memoryPeakMb: number | null;
}

export interface LabSample {
  readonly fps: number;
  readonly freezeMs: number;
  readonly memoryMb: number | null;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

const roundMb = (memoryMb: number | null): number | null => (memoryMb === null ? null : Math.round(memoryMb));
const higher = (a: number | null, b: number | null): number | null => (a === null ? b : b === null ? a : Math.max(a, b));

/** A page load: starts the run the first time, then counts reloads. */
export function labLoaded(previous: LabStats | null, now: number, memoryMb: number | null): LabStats {
  if (previous) return { ...previous, loads: previous.loads + 1, memoryPeakMb: higher(previous.memoryPeakMb, roundMb(memoryMb)) };
  const memory = roundMb(memoryMb);
  return { startedAt: now, loads: 1, worstFps: null, longestFreezeMs: 0, offlineCount: 0, longestOfflineMs: 0, memoryStartMb: memory, memoryPeakMb: memory };
}

export function labSample(stats: LabStats, sample: LabSample): LabStats {
  const fps = Math.round(sample.fps);
  return {
    ...stats,
    worstFps: stats.worstFps === null ? fps : Math.min(stats.worstFps, fps),
    longestFreezeMs: Math.max(stats.longestFreezeMs, sample.freezeMs),
    memoryPeakMb: higher(stats.memoryPeakMb, roundMb(sample.memoryMb)),
  };
}

export const labOffline = (stats: LabStats): LabStats => ({ ...stats, offlineCount: stats.offlineCount + 1 });

export const labOnline = (stats: LabStats, offlineForMs: number): LabStats => ({ ...stats, longestOfflineMs: Math.max(stats.longestOfflineMs, offlineForMs) });

const plural = (count: number, word: string): string => `${count} ${word}${count === 1 ? '' : 's'}`;

function runTime(ms: number): string {
  const hours = Math.floor(ms / HOUR);
  const minutes = Math.floor((ms % HOUR) / MINUTE);
  return hours > 0 ? `${hours} h ${minutes} min` : `${minutes} min`;
}

function span(ms: number): string {
  const minutes = Math.floor(ms / MINUTE);
  const seconds = Math.round((ms % MINUTE) / 1000);
  return minutes > 0 ? `${minutes} min ${seconds} s` : `${seconds} s`;
}

export function labLines(stats: LabStats, fpsNow: number | null, now: number): readonly string[] {
  return [
    `Running ${runTime(now - stats.startedAt)}, ${plural(stats.loads, 'load')}`,
    fpsNow === null ? 'Frames a second not measured yet' : `${Math.round(fpsNow)} frames a second now, ${stats.worstFps ?? Math.round(fpsNow)} at worst`,
    `Longest freeze ${Number((stats.longestFreezeMs / 1000).toFixed(1))} s`,
    stats.offlineCount === 0 ? 'Wi-Fi never dropped' : `Wi-Fi dropped ${plural(stats.offlineCount, 'time')}, longest ${span(stats.longestOfflineMs)}`,
    stats.memoryStartMb === null ? 'Memory not reported by this browser' : `Memory ${stats.memoryStartMb} MB at start, ${stats.memoryPeakMb ?? stats.memoryStartMb} MB at peak`,
  ];
}
