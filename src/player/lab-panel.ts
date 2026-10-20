import { labLines, labLoaded, labOffline, labOnline, labSample, type LabStats } from '@/features/screen/lab';

/*
 * The TV lab panel (MT-12, docs/tv-lab.md): a TV link opened with ?lab keeps score in a corner for a 72-hour run;
 * ?lab=reset starts a new run. The numbers live in localStorage so the daily reload doesn't lose them.
 */

const KEY = 'menuontv-lab';
const SAMPLE_MS = 10_000;

function memoryMb(): number | null {
  const memory = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
  return memory ? memory.usedJSHeapSize / 1_048_576 : null;
}

function load(): LabStats | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as LabStats) : null;
  } catch {
    return null;
  }
}

function save(stats: LabStats): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(stats));
  } catch {
    // Storage full or blocked: the panel still keeps score for this load, and the lab sheet notes it.
  }
}

export function startLab(reset: boolean): void {
  let stats = labLoaded(reset ? null : load(), Date.now(), memoryMb());
  save(stats);
  const panel = document.createElement('div');
  panel.className = 'scr-lab';
  document.body.appendChild(panel);

  let frames = 0;
  let lastFrame = 0;
  let freezeMs = 0;
  let fpsNow: number | null = null;
  let windowStart = performance.now();
  let offlineSince = 0;

  const render = (): void => {
    panel.textContent = labLines(stats, fpsNow, Date.now()).join('\n');
  };
  const frame = (time: number): void => {
    // A long gap between frames is a freeze: the TV slept, hung or stuttered.
    if (lastFrame) freezeMs = Math.max(freezeMs, time - lastFrame);
    lastFrame = time;
    frames += 1;
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  setInterval(() => {
    const now = performance.now();
    fpsNow = (frames * 1000) / (now - windowStart);
    stats = labSample(stats, { fps: fpsNow, freezeMs, memoryMb: memoryMb() });
    frames = 0;
    freezeMs = 0;
    windowStart = now;
    save(stats);
    render();
  }, SAMPLE_MS);

  window.addEventListener('offline', () => {
    offlineSince = Date.now();
    stats = labOffline(stats);
    save(stats);
    render();
  });
  window.addEventListener('online', () => {
    if (offlineSince) stats = labOnline(stats, Date.now() - offlineSince);
    offlineSince = 0;
    save(stats);
    render();
  });
  render();
}
