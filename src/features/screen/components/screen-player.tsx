'use client';

import { useEffect, type ReactNode } from 'react';
import { pageReachable, scheduleDailyReload } from '../daily-reload';
import { ScreenStage, type ScreenStageProps } from './screen-stage';

/** The full-screen player a TV opens. No controls for guests: a click or OK press asks for full screen. */
export function ScreenPlayer({ children, ...props }: ScreenStageProps & { readonly children?: ReactNode }) {
  // Once a day at 4 am, when the page can come back (daily-reload.ts).
  useEffect(() => scheduleDailyReload({ isReachable: () => pageReachable(window.location.href), reload: () => window.location.reload() }), []);

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
