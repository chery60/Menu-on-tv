'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'menutelly.pairing';
const POLL_MS = 3_000;

interface Pending {
  readonly code: string;
  readonly deviceSecret: string;
  readonly expiresAt: string;
  readonly qrSvg: string;
  readonly studioUrl: string;
}

type View = { readonly kind: 'starting' } | { readonly kind: 'waiting'; readonly pending: Pending } | { readonly kind: 'error'; readonly message: string };

interface Envelope<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: string;
}

function readPending(): Pending | null {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null') as Pending | null;
    return saved && Date.parse(saved.expiresAt) > Date.now() + POLL_MS ? saved : null;
  } catch {
    return null;
  }
}

function savePending(pending: Pending | null): void {
  try {
    if (pending) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Private mode or blocked storage: pairing still works, it just restarts if the page reloads.
  }
}

/**
 * The TV side of pairing: show a code and a QR, then wait. Once the owner enters the code, this TV
 * receives its own screen link and opens it. The TV's secret stays in this browser.
 */
export function PairScreen() {
  const [view, setView] = useState<View>({ kind: 'starting' });

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;

    const show = (pending: Pending): void => {
      if (!stopped) setView({ kind: 'waiting', pending });
    };

    const start = async (): Promise<void> => {
      // A code saved before a reload is checked with the server before it is shown again.
      const saved = readPending();
      if (saved) return poll(saved);
      try {
        const response = await fetch('/api/pairing/start', { method: 'POST', cache: 'no-store' });
        const body = (await response.json()) as Envelope<Pending>;
        if (!response.ok || !body.data) throw new Error(body.error ?? 'Couldn’t get a code.');
        savePending(body.data);
        show(body.data);
        timer = setTimeout(() => void poll(body.data as Pending), POLL_MS);
      } catch (error) {
        if (stopped) return;
        setView({ kind: 'error', message: error instanceof Error ? error.message : 'Couldn’t get a code.' });
        timer = setTimeout(() => void start(), 15_000);
      }
    };

    const poll = async (pending: Pending): Promise<void> => {
      try {
        const response = await fetch(`/api/pairing/${pending.code}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deviceSecret: pending.deviceSecret }),
          cache: 'no-store',
        });
        const body = (await response.json()) as Envelope<{ status: string; token?: string }>;
        const status = body.data?.status;
        if (status === 'paired' && body.data?.token) {
          savePending(null);
          window.location.replace(`/s/${body.data.token}`);
          return;
        }
        if (status === 'expired' || status === 'unknown') {
          savePending(null);
          return void start();
        }
        if (status === 'waiting') show(pending);
      } catch {
        // Offline for a moment: keep showing the code and try again.
        show(pending);
      }
      if (!stopped) timer = setTimeout(() => void poll(pending), POLL_MS);
    };

    timer = setTimeout(() => void start(), 0);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, []);

  return (
    <main className="scr-message">
      <p className="scr-message-title">Connect this TV to MenuOnTV.</p>
      {view.kind === 'waiting' ? (
        <>
          <p className="scr-message-body">
            On your phone, open the TVs tab in MenuOnTV (<strong>{view.pending.studioUrl.replace(/^https?:\/\//, '')}</strong>) and enter this code:
          </p>
          <p className="scr-pair-code" aria-label={`Code ${view.pending.code.split('').join(' ')}`}>
            {view.pending.code}
          </p>
          <span className="scr-pair-qr" role="img" aria-label="Or scan this QR code with your phone" dangerouslySetInnerHTML={{ __html: view.pending.qrSvg }} />
          <p className="scr-message-body">Or scan the code with your phone. This code works for 10 minutes.</p>
        </>
      ) : view.kind === 'error' ? (
        <p className="scr-message-body" role="alert">
          {view.message} Trying again in a few seconds.
        </p>
      ) : (
        <p className="scr-message-body">Getting a code…</p>
      )}
    </main>
  );
}
