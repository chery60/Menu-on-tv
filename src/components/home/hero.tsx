import { ArrowDown, ArrowRight } from 'lucide-react';
import type { CSSProperties } from 'react';
import { hero } from '@/content/site-content';
import { ScreenStage } from '@/features/screen/components/screen-stage';
import type { Restaurant } from '@/features/screen/types';
import { CounterDrawing } from './counter-drawing';

interface HeroProps {
  readonly restaurant: Restaurant;
  readonly qrCodes: Readonly<Record<string, string>>;
}

/**
 * The first screen: a café counter traces itself in ink, then the TV on its wall switches on and plays
 * the real screen. The headline sits under the drawing, the way a title sits under a plan.
 */
export function Hero({ restaurant, qrCodes }: HeroProps) {
  return (
    <section className="mtv-hero" aria-labelledby="hero-title">
      <div className="mtv-sheet">
        <div className="mtv-hero-stage">
          <div className="mtv-hero-art">
            <CounterDrawing readFrom={hero.readFrom} />
            <p className="sr-only">{hero.drawingLabel}</p>
            <div className="mtv-hero-tv">
              <div className="mtv-tv-screen">
                <ScreenStage restaurant={restaurant} layout="split" theme="paper" qrCodes={qrCodes} label={hero.screenLabel} />
              </div>
            </div>
          </div>

          <p className="mtv-hero-block mtv-mono" aria-hidden="true">
            <span>{restaurant.name}</span>
            {hero.sheet.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </p>
          <ol className="mtv-hero-log mtv-mono" aria-hidden="true">
            {hero.log.map((line, index) => (
              <li key={line} style={{ '--i': index } as CSSProperties}>
                <span className="mtv-hero-log-n">{String(index + 1).padStart(3, '0')}</span>
                {line}
              </li>
            ))}
          </ol>
        </div>

        <div className="mtv-hero-copy">
          <h1 id="hero-title" className="mtv-h1">
            {hero.title}
          </h1>
          <div className="mtv-hero-side">
            <p className="mtv-lead">{hero.lead}</p>
            <div className="mtv-actions">
              <a href={hero.primary.href} className="mtv-btn mtv-btn-primary">
                {hero.primary.label}
                <ArrowRight aria-hidden="true" />
              </a>
              <a href={hero.secondary.href} className="mtv-btn">
                {hero.secondary.label}
                <ArrowDown aria-hidden="true" />
              </a>
            </div>
            <p className="mtv-mono">{hero.note}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
