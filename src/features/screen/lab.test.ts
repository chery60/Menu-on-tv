import { describe, expect, it } from 'vitest';
import { labLines, labLoaded, labOffline, labOnline, labSample, type LabStats } from './lab';

const HOUR = 3_600_000;
const START = Date.UTC(2026, 9, 20, 6, 0, 0);

describe('the TV lab panel', () => {
  it('starts a run on the first load and counts the daily reloads after it', () => {
    const first = labLoaded(null, START, 41.6);
    expect(first).toEqual({ startedAt: START, loads: 1, worstFps: null, longestFreezeMs: 0, offlineCount: 0, longestOfflineMs: 0, memoryStartMb: 42, memoryPeakMb: 42 });
    const next = labLoaded(first, START + 24 * HOUR, 39);
    expect(next.loads).toBe(2);
    expect(next.startedAt).toBe(START);
    expect(next.memoryStartMb).toBe(42);
  });

  it('keeps the worst moments, not the latest', () => {
    let stats: LabStats = labLoaded(null, START, null);
    stats = labSample(stats, { fps: 58, freezeMs: 40, memoryMb: null });
    stats = labSample(stats, { fps: 31, freezeMs: 2_400, memoryMb: null });
    stats = labSample(stats, { fps: 60, freezeMs: 30, memoryMb: null });
    expect(stats.worstFps).toBe(31);
    expect(stats.longestFreezeMs).toBe(2_400);
    expect(stats.memoryPeakMb).toBeNull();
  });

  it('tracks the peak memory and the Wi-Fi drops', () => {
    let stats = labLoaded(null, START, 40);
    stats = labSample(stats, { fps: 60, freezeMs: 20, memoryMb: 61.4 });
    stats = labSample(stats, { fps: 60, freezeMs: 20, memoryMb: 55 });
    stats = labOnline(labOffline(stats), 250_000);
    stats = labOnline(labOffline(stats), 9_000);
    expect(stats.memoryPeakMb).toBe(61);
    expect(stats.offlineCount).toBe(2);
    expect(stats.longestOfflineMs).toBe(250_000);
  });

  it('writes lines a tester can copy into the lab sheet', () => {
    let stats = labLoaded(null, START, 40);
    stats = labLoaded(stats, START + 24 * HOUR, 41);
    stats = labSample(stats, { fps: 41, freezeMs: 2_400, memoryMb: 61 });
    stats = labOnline(labOffline(stats), 250_000);
    expect(labLines(stats, 58, START + 71 * HOUR + 58 * 60_000)).toEqual([
      'Running 71 h 58 min, 2 loads',
      '58 frames a second now, 41 at worst',
      'Longest freeze 2.4 s',
      'Wi-Fi dropped 1 time, longest 4 min 10 s',
      'Memory 40 MB at start, 61 MB at peak',
    ]);
  });

  it('says what it could not measure', () => {
    expect(labLines(labLoaded(null, START, null), null, START + 5_000)).toEqual([
      'Running 0 min, 1 load',
      'Frames a second not measured yet',
      'Longest freeze 0 s',
      'Wi-Fi never dropped',
      'Memory not reported by this browser',
    ]);
  });
});
