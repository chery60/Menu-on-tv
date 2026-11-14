/**
 * A TV's live updates (MT-23): a server-sent event stream that says when the menu changed. A browser gives up on an
 * EventSource for good when a reconnect gets an HTTP error (a 429, a 502, a 404) and never says which, so this asks
 * the stream's address what it answers, waits as long as the server's Retry-After asks (and longer each time it
 * fails), and opens a new stream once the address answers again.
 */

/** The parts of an EventSource the player uses. */
export interface StreamSource {
  readonly readyState: number;
  addEventListener(type: 'open' | 'version' | 'revoked' | 'error', listener: (event: Event) => void): void;
  close(): void;
}

export interface ProbeResult {
  /** The HTTP status, or 0 when there was no answer. */
  readonly status: number;
  readonly retryAfterSeconds: number | null;
}

export interface LiveStreamOptions {
  readonly url: string;
  /** The version the stream announces: on every (re)connect, then whenever it changes. */
  readonly onVersion: (version: string) => void;
  /** The link no longer works. */
  readonly onGone: () => void;
  readonly open?: (url: string) => StreamSource;
  readonly probe?: (url: string) => Promise<ProbeResult>;
  /** Runs `run` after `ms`, returning a way to cancel it. */
  readonly schedule?: (run: () => void, ms: number) => () => void;
}

/** EventSource.CLOSED: the browser won't reconnect by itself. */
const CLOSED = 2;
export const RETRY_FIRST_MS = 2_000;
export const RETRY_MAX_MS = 60_000;

/** The wait before the next try after `failures` failed ones: 2 s, doubling to a minute, never sooner than the server asked. */
export function retryDelay(failures: number, retryAfterSeconds: number | null = null): number {
  const backoff = Math.min(RETRY_MAX_MS, RETRY_FIRST_MS * 2 ** Math.max(0, failures - 1));
  return Math.max(backoff, (retryAfterSeconds ?? 0) * 1000);
}

/** Asks the stream's address what it answers now, then hangs up: the status and Retry-After an EventSource hides. */
export async function probeStream(url: string): Promise<ProbeResult> {
  // Old TV browsers have fetch but not AbortController; cancelling the body hangs up there instead.
  const controller = typeof AbortController === 'undefined' ? null : new AbortController();
  try {
    const response = await fetch(url, { cache: 'no-store', ...(controller ? { signal: controller.signal } : {}) });
    const seconds = Number(response.headers.get('Retry-After'));
    if (!controller) void response.body?.cancel().catch(() => undefined);
    return { status: response.status, retryAfterSeconds: seconds > 0 ? seconds : null };
  } catch {
    return { status: 0, retryAfterSeconds: null };
  } finally {
    controller?.abort();
  }
}

function later(run: () => void, ms: number): () => void {
  const timer = setTimeout(run, ms);
  return () => clearTimeout(timer);
}

/** Opens the stream and keeps it open, reopening it whenever the browser gives up, until the returned function is called. */
export function openLiveStream({ url, onVersion, onGone, open = (address) => new EventSource(address), probe = probeStream, schedule = later }: LiveStreamOptions): () => void {
  let source: StreamSource | null = null;
  let cancelWait: (() => void) | null = null;
  let failures = 0;
  let stopped = false;

  const stop = (): void => {
    stopped = true;
    cancelWait?.();
    cancelWait = null;
    source?.close();
    source = null;
  };

  const tryAgain = (retryAfterSeconds: number | null = null): void => {
    failures += 1;
    cancelWait = schedule(() => void reopen(), retryDelay(failures, retryAfterSeconds));
  };

  const reopen = async (): Promise<void> => {
    cancelWait = null;
    const { status, retryAfterSeconds } = await probe(url);
    if (stopped) return;
    if (status === 404) {
      stop();
      onGone();
    } else if (status >= 200 && status < 300) {
      connect();
    } else {
      tryAgain(retryAfterSeconds);
    }
  };

  const connect = (): void => {
    const current = open(url);
    source = current;
    current.addEventListener('open', () => {
      failures = 0;
    });
    current.addEventListener('version', (event) => onVersion(String((event as MessageEvent).data)));
    current.addEventListener('revoked', () => {
      stop();
      onGone();
    });
    current.addEventListener('error', () => {
      // While CONNECTING the browser retries by itself; CLOSED means it has given up.
      if (stopped || source !== current || current.readyState !== CLOSED) return;
      current.close();
      source = null;
      tryAgain();
    });
  };

  connect();
  return stop;
}
