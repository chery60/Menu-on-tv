'use client';

import { useEffect, type ReactNode } from 'react';
import { ScreenStage, type ScreenStageProps } from './screen-stage';

/** Reload once a day in the small hours, to clear memory on weak TV browsers. */
const RELOAD_HOUR = 4;
/** If the server can't be reached at reload time, try again this much later. */
const RELOAD_RETRY_MS = 30 * 60 * 1000;

function msUntilNextReload(now: Date): number {
  const next = new Date(now);
  next.setHours(RELOAD_HOUR, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next.getTime() - now.getTime();
}

/** The full-screen player a TV opens. No controls for guests: a click or OK press asks for full screen. */
export function ScreenPlayer({ children, ...props }: ScreenStageProps & { readonly children?: ReactNode }) {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    // Reload only when the page can come back: an offline reload would leave a browser error on the TV.
    const reloadIfReachable = (): void => {
      fetch(window.location.href, { method: 'HEAD', cache: 'no-store' })
        .then((response) => {
          if (response.ok) window.location.reload();
          else timer = setTimeout(reloadIfReachable, RELOAD_RETRY_MS);
        })
        .catch(() => {
          timer = setTimeout(reloadIfReachable, RELOAD_RETRY_MS);
        });
    };
    timer = setTimeout(reloadIfReachable, msUntilNextReload(new Date()));
    return () => clearTimeout(timer);
  }, []);

  const goFullScreen = (): void => {
    if (!document.fullscreenElement) void document.documentElement.requestFullscreen?.().catch(() => undefined);
  };

  return (
    <div className="scr-player" onClick={goFullScreen} onKeyDown={(event) => event.key === 'Enter' && goFullScreen()} tabIndex={0}>
      <ScreenStage {...props} burnInShift />
      {children}
    </div>
  );
}
