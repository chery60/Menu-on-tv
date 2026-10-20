'use client';

import { Monitor, Undo2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { DEMO_RESTAURANT } from '@/content/demo-restaurant';
import type { Plaza, PlazaView } from './plaza/scene';
import type { TvFonts } from './plaza/textures';

export interface PlazaLabels {
  readonly sceneLabel: string;
  readonly loading: string;
  readonly failed: string;
  readonly hint: string;
  readonly toTv: string;
  readonly toPlaza: string;
  readonly fullScreen: { readonly label: string; readonly href: string };
}

type Status = 'loading' | 'ready' | 'failed';

/** The site's own font families, from the variables the root layout sets, so the TV and the sign match the page. */
function readFonts(element: HTMLElement): TvFonts {
  const style = getComputedStyle(element);
  const family = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  return { display: family('--font-archivo', 'Arial Black, sans-serif'), text: family('--font-geist', 'system-ui, sans-serif'), mono: family('--font-geist-mono', 'ui-monospace, monospace') };
}

async function loadFonts(fonts: TvFonts): Promise<void> {
  // Canvas text only uses a font that has loaded, so ask for the faces the TV draws with first.
  await Promise.allSettled([`800 40px ${fonts.display}`, `500 22px ${fonts.text}`, `600 18px ${fonts.mono}`].map((font) => document.fonts.load(font)));
}

/** The 3D café on its square, with a button that walks the camera to the TV and back. */
export function PlazaDemo({ labels }: { readonly labels: PlazaLabels }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const plazaRef = useRef<Plaza | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [view, setView] = useState<PlazaView>('plaza');

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    const fonts = readFonts(host);
    Promise.all([import('./plaza/scene'), loadFonts(fonts)])
      .then(([{ createPlaza }]) => {
        if (cancelled) return;
        plazaRef.current = createPlaza(host, {
          restaurant: DEMO_RESTAURANT,
          fonts,
          reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
          coarse: matchMedia('(pointer: coarse)').matches,
        });
        setStatus('ready');
      })
      .catch(() => {
        // No WebGL, or the scene's code failed to load: say so where the café would be.
        if (!cancelled) setStatus('failed');
      });
    return () => {
      cancelled = true;
      plazaRef.current?.dispose();
      plazaRef.current = null;
    };
  }, []);

  const toggle = () => {
    const next: PlazaView = view === 'plaza' ? 'tv' : 'plaza';
    plazaRef.current?.setView(next);
    setView(next);
  };

  return (
    <div className="mtv-plaza" data-status={status}>
      <div className="mtv-plaza-stage" role="img" aria-label={labels.sceneLabel}>
        {/* three.js owns this element's children; React renders nothing into it. */}
        <div ref={hostRef} className="mtv-plaza-host" />
        {status === 'loading' ? <p className="mtv-plaza-note">{labels.loading}</p> : null}
        {status === 'failed' ? <p className="mtv-plaza-note">{labels.failed}</p> : null}
      </div>
      <div className="mtv-plaza-bar">
        {status === 'ready' ? (
          <>
            <button type="button" className="mtv-btn mtv-btn-primary" onClick={toggle}>
              {view === 'plaza' ? <Monitor aria-hidden="true" /> : <Undo2 aria-hidden="true" />}
              {view === 'plaza' ? labels.toTv : labels.toPlaza}
            </button>
            <span className="mtv-plaza-hint">{labels.hint}</span>
          </>
        ) : null}
        <a href={labels.fullScreen.href} className="mtv-btn mtv-plaza-full">
          {labels.fullScreen.label}
        </a>
      </div>
    </div>
  );
}
