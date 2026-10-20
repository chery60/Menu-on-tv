'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ScreenBundle } from '@/features/screens/bundle';
import { nextClockOffset } from '../clock';
import { ScreenPlayer } from './screen-player';

/** Heartbeat interval: marks the TV online, checks the version, corrects the clock. */
const BEAT_MS = 60_000;
const FIRST_BEAT_MS = 2_000;
/** If no slide boundary comes within this long, apply a new bundle anyway. */
const SWAP_DEADLINE_MS = 20_000;

interface LivePlayerProps {
  readonly token: string;
  readonly initialBundle: ScreenBundle;
  readonly pairUrl: string;
}

interface Envelope<T> {
  readonly success: boolean;
  readonly data?: T;
}

/**
 * A restaurant TV's player. It plays the bundle it has, listens for "version changed" (server-sent
 * events, with the heartbeat as a safety net), and swaps new content in between slides, never mid-slide.
 */
export function LivePlayer({ token, initialBundle, pairUrl }: LivePlayerProps) {
  const [bundle, setBundle] = useState(initialBundle);
  const [offline, setOffline] = useState(false);
  const [gone, setGone] = useState(false);
  const [clockOffsetMs, setClockOffsetMs] = useState(0);
  const versionRef = useRef(initialBundle.version);
  const pendingRef = useRef<ScreenBundle | null>(null);
  const slideRef = useRef<string | null>(null);
  const deadlineRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const base = `/api/s/${encodeURIComponent(token)}`;

  const apply = useCallback((next: ScreenBundle): void => {
    pendingRef.current = null;
    if (deadlineRef.current) clearTimeout(deadlineRef.current);
    deadlineRef.current = null;
    versionRef.current = next.version;
    setBundle(next);
  }, []);

  const fetchBundle = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch(`${base}/bundle`, { headers: { 'If-None-Match': `"${versionRef.current}"` }, cache: 'no-store' });
      if (response.status === 404) return setGone(true);
      setOffline(false);
      if (response.status === 304 || !response.ok) return;
      const body = (await response.json()) as Envelope<ScreenBundle>;
      if (!body.data || body.data.version === versionRef.current) return;
      pendingRef.current = body.data;
      deadlineRef.current ??= setTimeout(() => pendingRef.current && apply(pendingRef.current), SWAP_DEADLINE_MS);
    } catch {
      setOffline(true);
    }
  }, [apply, base]);

  // Live updates: server-sent events say when the version changes; the browser reconnects on its own.
  useEffect(() => {
    if (typeof EventSource === 'undefined') return;
    const events = new EventSource(`${base}/events`);
    events.addEventListener('version', (event) => {
      if ((event as MessageEvent<string>).data !== versionRef.current) void fetchBundle();
    });
    events.addEventListener('revoked', () => setGone(true));
    return () => events.close();
  }, [base, fetchBundle]);

  // Heartbeat: the safety net for dropped streams, plus screen health and clock correction.
  useEffect(() => {
    const beat = async (): Promise<void> => {
      const sentAt = Date.now();
      try {
        const response = await fetch(`${base}/beat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ version: versionRef.current, slide: slideRef.current, sentAt }),
          cache: 'no-store',
        });
        if (response.status === 404) return setGone(true);
        const body = (await response.json()) as Envelope<{ version: string; serverNow: number }>;
        if (!body.data) return;
        const { version, serverNow } = body.data;
        setOffline(false);
        setClockOffsetMs((current) => nextClockOffset(current, { sentAt, serverNow, receivedAt: Date.now() }));
        if (version !== versionRef.current) void fetchBundle();
      } catch {
        setOffline(true);
      }
    };
    const first = setTimeout(() => void beat(), FIRST_BEAT_MS);
    const every = setInterval(() => void beat(), BEAT_MS);
    const markOffline = (): void => setOffline(true);
    const markOnline = (): void => void beat();
    window.addEventListener('offline', markOffline);
    window.addEventListener('online', markOnline);
    return () => {
      clearTimeout(first);
      clearInterval(every);
      window.removeEventListener('offline', markOffline);
      window.removeEventListener('online', markOnline);
    };
  }, [base, fetchBundle]);

  // Offline playback: the service worker keeps this page, its assets and the last bundle.
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker
      .register('/sw.js', { scope: '/s/' })
      .then(() => navigator.serviceWorker.ready)
      .then((registration) => {
        // The standalone player's script, styles and fonts, or the Next.js chunks when it runs inside the site.
        const assets = performance
          .getEntriesByType('resource')
          .map((entry) => entry.name)
          .filter((url) => url.startsWith(window.location.origin) && /\/(_next\/static|player|fonts)\//.test(new URL(url).pathname));
        registration.active?.postMessage({ type: 'cache', urls: [window.location.pathname, `${base}/bundle`, ...assets] });
      })
      .catch(() => undefined);
  }, [base]);

  const onBoundary = useCallback(
    (slide: string): void => {
      slideRef.current = slide;
      if (pendingRef.current) apply(pendingRef.current);
    },
    [apply],
  );

  if (gone) {
    return (
      <div className="scr-message" role="alert">
        <p className="scr-message-title">This screen link no longer works.</p>
        <p className="scr-message-body">
          Open <strong>{pairUrl}</strong> on this TV to connect it again.
        </p>
      </div>
    );
  }

  return (
    // The version a TV is playing, for support and checks: compare it with the console's latest.
    <div data-version={bundle.version} style={{ display: 'contents' }}>
      <ScreenPlayer
        restaurant={bundle.restaurant}
        layout={bundle.layout}
        theme={bundle.theme}
        bilingual={bundle.bilingual}
        timing={bundle.timing}
        qrCodes={bundle.qrCodes}
        clockOffsetMs={clockOffsetMs}
        onBoundary={onBoundary}
        label={`${bundle.name}: ${bundle.restaurant.name} menu screen`}
      >
        {offline ? <span className="scr-offline" role="status" aria-label="Offline: playing the last menu" /> : null}
      </ScreenPlayer>
    </div>
  );
}
