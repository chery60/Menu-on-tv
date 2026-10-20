'use client';

import { useEffect, useRef } from 'react';

/** The part of a hairline figure this host uses (see src/components/home/hairline). */
interface HairlineFigure {
  readonly range: readonly [number, number, number];
  readonly tour: readonly ([number, number] | null)[] | null;
  mount(host: { stage: HTMLElement; svg: SVGSVGElement; read: { textContent: string } }, value: number): { destroy(): void };
}

interface HairlineKernel {
  inject(root: Document): void;
  mk(tag: 'svg', attrs: Record<string, string>, parent: HTMLElement): SVGSVGElement;
  tour(stage: HTMLElement, stops: HairlineFigure['tour'], onStop: (i: number) => void): { stop(): void };
  LAP: HairlineFigure['tour'];
}

export type ProblemFigureName = 'reprints' | 'pans' | 'queue' | 'flyers';

// Loaded in the browser only: the drawings are decoration, and the engine needs a DOM.
const FIGURES: Record<ProblemFigureName, () => Promise<{ figure: unknown }>> = {
  reprints: () => import('./hairline/reprints.js'),
  pans: () => import('./hairline/pans.js'),
  queue: () => import('./hairline/queue.js'),
  flyers: () => import('./hairline/flyers.js'),
};

/**
 * One problem drawn as a hairline figure: it answers the pointer, and while it
 * is on screen an unseen pointer walks its tour (it rests under reduced motion).
 */
export function ProblemFigure({ name }: { readonly name: ProblemFigureName }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const readRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let cancelled = false;
    let teardown = (): void => {};

    Promise.all([import('./hairline/kernel.mjs'), FIGURES[name]()])
      .then(([kernel, mod]) => {
        if (cancelled) return;
        const HL = kernel.HL as unknown as HairlineKernel;
        const figure = mod.figure as HairlineFigure;
        HL.inject(document);
        const svg = HL.mk('svg', { viewBox: '0 0 400 320', 'aria-hidden': 'true' }, stage);
        const read = {
          set textContent(text: string) {
            if (readRef.current) readRef.current.textContent = text === 'rest' ? '' : text;
          },
        } as { textContent: string };
        const handle = figure.mount({ stage, svg, read }, figure.range[1]);
        const tour = HL.tour(stage, figure.tour ?? HL.LAP, () => {});
        teardown = () => {
          tour.stop();
          handle.destroy();
          svg.remove();
        };
      })
      .catch(() => {
        // A drawing that fails to load leaves its cell's words in place; mark it so it can be found.
        stage.dataset.failed = 'true';
      });

    return () => {
      cancelled = true;
      teardown();
    };
  }, [name]);

  return (
    <div className="mtv-problem-art">
      <div ref={stageRef} data-hairline={name} aria-hidden="true" />
      <span ref={readRef} className="mtv-problem-read" aria-hidden="true" />
    </div>
  );
}
