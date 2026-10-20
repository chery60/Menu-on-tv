'use client';

import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';

const IDLE_MS = 2500;

/** A way back to the site from the full-screen demo: it shows when the pointer moves or a key is pressed, and hides when they rest. */
export function BackLink({ href, label }: { readonly href: string; readonly label: string }) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const wake = (): void => {
      setShown(true);
      clearTimeout(timer);
      timer = setTimeout(() => setShown(false), IDLE_MS);
    };
    window.addEventListener('pointermove', wake);
    window.addEventListener('keydown', wake);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('pointermove', wake);
      window.removeEventListener('keydown', wake);
    };
  }, []);

  return (
    <a
      href={href}
      className="scr-back"
      data-shown={shown}
      onClick={(event) => {
        // The player behind goes full screen on a click; leaving should not.
        event.stopPropagation();
        if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
      }}
    >
      <ArrowLeft aria-hidden="true" />
      {label}
    </a>
  );
}
