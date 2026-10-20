'use client';

import { type CSSProperties, useMemo, useRef } from 'react';
import { useScene } from '@/components/site/use-scene';
import { demoStory } from '@/content/site-content';
import { ScreenStage } from '@/features/screen/components/screen-stage';
import { heroRestaurant, initialHeroState, nudgePrice, type HeroDemoState } from '@/features/screen/hero-demo';
import type { Restaurant } from '@/features/screen/types';

/** What the TV shows at each step, built from the café's own starting menu. */
function statesFor(base: Restaurant): readonly HeroDemoState[] {
  const start = initialHeroState(base);
  const soldOut = { ...start, soldOut: ['samosa'] };
  const dearer = { ...soldOut, price: nudgePrice(start.price, 1) };
  return [start, start, soldOut, dearer, { ...dearer, special: 'mango-lassi' }];
}

/**
 * One afternoon at the sample café, told in five steps while the stage stays pinned: the steps on the
 * left, and on the right a night-dark device with the real screen player, what it is doing, what the
 * owner sent and a log of what happened. Readers who skip the motion get the steps as a list.
 */
export function LiveDemo({ base }: { readonly base: Restaurant }) {
  const section = useRef<HTMLElement>(null);
  const step = useScene(section, demoStory.steps.length);
  const states = useMemo(() => statesFor(base), [base]);
  const restaurants = useMemo(() => states.map((state) => heroRestaurant(base, state, demoStory)), [base, states]);
  const current = demoStory.steps[step];

  return (
    <section ref={section} id="demo" className="mtv-demo" data-step={step} style={{ '--step': step } as CSSProperties} aria-labelledby="demo-title">
      <div className="mtv-demo-stage">
        <div className="mtv-sheet mtv-band mtv-demo-sheet">
          <div className="mtv-demo-copy">
            <h2 id="demo-title" className="mtv-h2">
              {demoStory.title}
            </h2>
            <p className="mtv-lead">{demoStory.lead}</p>
            <ol className="mtv-demo-steps" aria-hidden="true">
              {demoStory.steps.map((item, index) => (
                <li key={item.title} data-state={index < step ? 'done' : index === step ? 'now' : 'next'}>
                  <span className="mtv-num">{String(index + 1).padStart(2, '0')}</span>
                  {item.title}
                </li>
              ))}
            </ol>
          </div>

          <div className="mtv-demo-device mtv-night" aria-hidden="true">
            <div className="mtv-demo-status">
              <span className="mtv-demo-dot" data-live={current.status === 'on air'} />
              <span key={current.status} className="mtv-demo-status-text">
                {current.status}
              </span>
              <span className="mtv-demo-where">{base.name}</span>
            </div>

            <div className="mtv-tv mtv-demo-tv">
              <div className="mtv-tv-screen">
                <ScreenStage restaurant={restaurants[step]} layout="split" theme="paper" label={demoStory.screenLabel} />
                {step === 0 ? <span className="mtv-demo-scan" /> : null}
              </div>
            </div>

            <div className="mtv-demo-feed">
              <div className="mtv-demo-phone">
                <p className="mtv-mono">{demoStory.phone}</p>
                {current.message ? (
                  <p key={current.message} className="mtv-demo-msg">
                    {current.message}
                  </p>
                ) : (
                  <p className="mtv-demo-msg mtv-demo-msg-quiet">…</p>
                )}
              </div>
              <ul key={step} className="mtv-demo-log">
                {current.log.map((line, index) => (
                  <li key={line} style={{ '--i': index } as CSSProperties}>
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <ol className="sr-only">
        {demoStory.steps.map((item) => (
          <li key={item.title}>
            {item.title}. {[item.message, ...item.log].filter(Boolean).join('. ')}.
          </li>
        ))}
      </ol>
    </section>
  );
}
