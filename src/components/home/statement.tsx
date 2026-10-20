'use client';

import { type CSSProperties, useRef } from 'react';
import { useScene } from '@/components/site/use-scene';
import { statement } from '@/content/site-content';

const WORDS = statement.text.split(' ');

/**
 * One sentence, lit word by word as you scroll (each word's opacity is worked out in CSS from the
 * section's `--scene-p`), then a quiet ribbon of facts. Screen readers get the sentence whole.
 */
export function Statement() {
  const track = useRef<HTMLDivElement>(null);
  useScene(track, 1);

  return (
    <section className="mtv-statement-band">
      <div ref={track} className="mtv-statement">
        <div className="mtv-statement-stage">
          <div className="mtv-sheet mtv-band mtv-statement-sheet">
            <p className="sr-only">{statement.text}</p>
            <p className="mtv-statement-text" aria-hidden="true" style={{ '--n': WORDS.length } as CSSProperties}>
              {WORDS.map((word, index) => (
                <span key={`${word}-${index}`} style={{ '--i': index } as CSSProperties}>
                  {word}{' '}
                </span>
              ))}
            </p>
          </div>
        </div>
      </div>
      <div className="mtv-ribbon" aria-hidden="true">
        <div className="mtv-ribbon-track">
          {[0, 1].map((copy) => (
            <ul key={copy}>
              {statement.ribbon.map((fact) => (
                <li key={fact}>{fact}</li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </section>
  );
}
