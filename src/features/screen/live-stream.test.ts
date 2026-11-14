import { afterEach, describe, expect, it, vi } from 'vitest';
import { openLiveStream, probeStream, RETRY_MAX_MS, retryDelay, type ProbeResult, type StreamSource } from './live-stream';

/** A stand-in EventSource the test drives: it can announce versions, be revoked, and fail like a browser does. */
class FakeSource implements StreamSource {
  readyState = 0;
  closed = false;
  private readonly listeners = new Map<string, ((event: Event) => void)[]>();

  addEventListener(type: string, listener: (event: Event) => void): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }

  close(): void {
    this.closed = true;
    this.readyState = 2;
  }

  emit(type: string, data?: string): void {
    const event = Object.assign(new Event(type), { data });
    (this.listeners.get(type) ?? []).forEach((listener) => listener(event));
  }

  opened(): void {
    this.readyState = 1;
    this.emit('open');
  }

  /** A reconnect that got an HTTP error: the browser closes the stream for good. */
  givesUp(): void {
    this.readyState = 2;
    this.emit('error');
  }
}

/** Runs the stream with fake sources, answers and timers; `waits` records each delay the stream asked for. */
function harness(answers: ProbeResult[] = []) {
  const sources: FakeSource[] = [];
  const waits: number[] = [];
  let pending: (() => void) | null = null;
  const versions: string[] = [];
  const gone = vi.fn();
  const probe = vi.fn(async (): Promise<ProbeResult> => answers.shift() ?? { status: 200, retryAfterSeconds: null });
  const stop = openLiveStream({
    url: '/api/s/token/events',
    onVersion: (version) => versions.push(version),
    onGone: gone,
    open: () => {
      const source = new FakeSource();
      sources.push(source);
      return source;
    },
    probe,
    schedule: (run, ms) => {
      waits.push(ms);
      pending = run;
      return () => {
        pending = null;
      };
    },
  });
  /** Lets the waiting timer fire and the probe answer. */
  const elapse = async (): Promise<void> => {
    const run = pending;
    pending = null;
    run?.();
    await Promise.resolve();
    await Promise.resolve();
  };
  return { sources, waits, versions, gone, probe, stop, elapse, current: () => sources[sources.length - 1], waiting: () => pending !== null };
}

describe('openLiveStream', () => {
  it('passes on the versions the stream announces, and stops for good when the link is revoked', () => {
    const tv = harness();
    tv.current().opened();
    tv.current().emit('version', 'v1');
    tv.current().emit('version', 'v2');
    expect(tv.versions).toEqual(['v1', 'v2']);
    tv.current().emit('revoked');
    expect(tv.gone).toHaveBeenCalledOnce();
    expect(tv.current().closed).toBe(true);
  });

  it('leaves the browser to reconnect while it is still trying', () => {
    const tv = harness();
    tv.current().opened();
    tv.current().readyState = 0;
    tv.current().emit('error');
    expect(tv.waiting()).toBe(false);
    expect(tv.sources).toHaveLength(1);
  });

  it('opens a new stream when the browser gives up after an HTTP error, and hears the menu change on it', async () => {
    const tv = harness();
    tv.current().opened();
    tv.current().givesUp();
    expect(tv.waits).toEqual([2_000]);
    await tv.elapse();
    expect(tv.probe).toHaveBeenCalledWith('/api/s/token/events');
    expect(tv.sources).toHaveLength(2);
    tv.current().opened();
    tv.current().emit('version', 'v2');
    expect(tv.versions).toEqual(['v2']);
  });

  it('waits as long as the server’s Retry-After asks after a 429, then goes back to live', async () => {
    const tv = harness([{ status: 429, retryAfterSeconds: 40 }]);
    tv.current().givesUp();
    await tv.elapse();
    expect(tv.waits).toEqual([2_000, 40_000]);
    expect(tv.sources).toHaveLength(1);
    await tv.elapse();
    expect(tv.sources).toHaveLength(2);
  });

  it('backs off longer each time the server keeps failing, up to a minute, and starts over once a stream opens', async () => {
    const failing = Array.from({ length: 7 }, () => ({ status: 502, retryAfterSeconds: null }));
    const tv = harness(failing);
    tv.current().givesUp();
    for (let i = 0; i < 7; i += 1) await tv.elapse();
    expect(tv.waits).toEqual([2_000, 4_000, 8_000, 16_000, 32_000, 60_000, 60_000, 60_000]);
    await tv.elapse();
    tv.current().opened();
    tv.current().givesUp();
    expect(tv.waits.at(-1)).toBe(2_000);
  });

  it('tries again when there is no network, and gives up for good only when the link no longer works', async () => {
    const tv = harness([{ status: 0, retryAfterSeconds: null }, { status: 404, retryAfterSeconds: null }]);
    tv.current().givesUp();
    await tv.elapse();
    expect(tv.gone).not.toHaveBeenCalled();
    await tv.elapse();
    expect(tv.gone).toHaveBeenCalledOnce();
    expect(tv.waiting()).toBe(false);
    expect(tv.sources).toHaveLength(1);
  });

  it('stops trying once the player closes it', async () => {
    const tv = harness();
    tv.current().givesUp();
    tv.stop();
    expect(tv.waiting()).toBe(false);
    await tv.elapse();
    expect(tv.sources).toHaveLength(1);
  });
});

describe('retryDelay', () => {
  it('starts at 2 seconds, doubles to a minute, and never comes sooner than Retry-After', () => {
    expect([1, 2, 3, 6, 7, 20].map((failures) => retryDelay(failures))).toEqual([2_000, 4_000, 8_000, 60_000, RETRY_MAX_MS, RETRY_MAX_MS]);
    expect(retryDelay(1, 45)).toBe(45_000);
    expect(retryDelay(7, 5)).toBe(RETRY_MAX_MS);
  });
});

describe('probeStream', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reads the status and Retry-After, then hangs up', async () => {
    let signal: AbortSignal | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init?: RequestInit) => {
        signal = init?.signal ?? undefined;
        return new Response('Too many requests', { status: 429, headers: { 'Retry-After': '37' } });
      }),
    );
    expect(await probeStream('/api/s/token/events')).toEqual({ status: 429, retryAfterSeconds: 37 });
    expect(signal?.aborted).toBe(true);
  });

  it('answers 0 when there is no network', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))));
    expect(await probeStream('/api/s/token/events')).toEqual({ status: 0, retryAfterSeconds: null });
  });
});
