'use client';

import { type RefObject, useEffect, useState } from 'react';
import { sceneProgress, sceneStep } from '@/lib/scene';

/**
 * Drives one pinned scene: while the section is on screen, its scroll progress is written to the
 * section's `--scene-p` (0 to 1) every frame, and the step is returned, so React re-renders only
 * when the step changes. Steps change for everyone; with reduced motion the CSS drops the fades and
 * shows every drawing finished.
 */
export function useScene(ref: RefObject<HTMLElement | null>, steps: number): number {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const section = ref.current;
    if (!section) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const progress = sceneProgress(section.getBoundingClientRect(), window.innerHeight);
      section.style.setProperty('--scene-p', progress.toFixed(4));
      setStep(sceneStep(progress, steps));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const listen = (on: boolean) => {
      const method = on ? 'addEventListener' : 'removeEventListener';
      window[method]('scroll', schedule, { passive: true });
      window[method]('resize', schedule);
    };

    // Listen only while the section is near the screen.
    const watcher = new IntersectionObserver(([entry]) => {
      listen(Boolean(entry?.isIntersecting));
      if (entry?.isIntersecting) schedule();
    });
    watcher.observe(section);
    schedule();

    return () => {
      watcher.disconnect();
      listen(false);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [ref, steps]);

  return step;
}
