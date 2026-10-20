'use client';

import { Check } from 'lucide-react';
import { type CSSProperties, useRef } from 'react';
import { useScene } from '@/components/site/use-scene';
import { planStory } from '@/content/site-content';
import { FIXED_AT, FLAG_SPOTS, PlanDrawing } from './plan-drawing';

const PLAN = { width: 1000, height: 640 } as const;
const FLAGS_FROM = 1;

/**
 * The problem, shown on the guest's own path through a café: a plan that builds as you scroll, the
 * printed board's problems flagged on it, then fixed one by one by the TV. The stage is pinned while
 * the section scrolls; the caption tells the step in words. Readers who skip the motion get every
 * step as a list.
 */
export function FloorPlan() {
  const section = useRef<HTMLElement>(null);
  const step = useScene(section, planStory.beats.length);
  const beat = planStory.beats[step];

  return (
    <section ref={section} className="mtv-plan" data-step={step} aria-labelledby="plan-title">
      <div className="mtv-plan-stage">
        <div className="mtv-sheet mtv-band mtv-plan-sheet">
          <h2 id="plan-title" className="mtv-h2 mtv-plan-title">
            {planStory.title}
          </h2>

          <div className="mtv-plan-art">
            <PlanDrawing step={step} />
            {planStory.flags.map((flag, index) => {
              const spot = FLAG_SPOTS[flag.id];
              const fixed = step >= FIXED_AT[flag.id];
              return (
                <span
                  key={flag.id}
                  className="mtv-flag"
                  data-on={step >= FLAGS_FROM}
                  data-fixed={fixed}
                  style={{ left: `${(spot.x / PLAN.width) * 100}%`, top: `${(spot.y / PLAN.height) * 100}%`, '--i': index } as CSSProperties}
                  aria-hidden="true"
                >
                  {fixed ? <Check strokeWidth={3} /> : index + 1}
                </span>
              );
            })}
          </div>

          <div className="mtv-plan-card" aria-hidden="true">
            <p className="mtv-mono">
              {step + 1} / {planStory.beats.length}
            </p>
            <h3 key={beat.title} className="mtv-h3 mtv-plan-beat">
              {beat.title}
            </h3>
            <p key={beat.body} className="mtv-body mtv-plan-beat">
              {beat.body}
            </p>
            <div className="mtv-plan-meter">
              <span />
            </div>
            {step < planStory.beats.length - 1 ? <p className="mtv-mono mtv-plan-hint">{planStory.scrollHint}</p> : null}
          </div>

          <ol className="mtv-plan-legend" aria-hidden="true" data-on={step >= FLAGS_FROM}>
            {planStory.flags.map((flag, index) => {
              const fixed = step >= FIXED_AT[flag.id];
              return (
                <li key={flag.id} data-fixed={fixed}>
                  <span className="mtv-flag-key">{fixed ? <Check strokeWidth={3} /> : index + 1}</span>
                  <span>{fixed ? flag.fix : flag.problem}</span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      <ol className="sr-only">
        {planStory.beats.map((item) => (
          <li key={item.title}>
            <h3>{item.title}</h3>
            <p>{item.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
