import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { madeFor } from '@/content/site-content';

/** A poster of the product: one chilli sun, and a TV on a café wall playing its menu. */
function PosterDrawing() {
  return (
    <svg className="mtv-draw-view mtv-poster-svg" viewBox="0 0 480 560" aria-hidden="true" focusable="false">
      <circle className="mtv-poster-sun" cx="150" cy="150" r="108" />
      <rect className="mtv-poster-slab" x="300" y="0" width="70" height="330" />
      <g className="mtv-ink">
        <line x1="0" y1="470" x2="480" y2="470" pathLength={1} />
        <rect x="70" y="250" width="320" height="180" rx="5" pathLength={1} />
        <line x1="190" y1="430" x2="190" y2="470" pathLength={1} />
        <line x1="270" y1="430" x2="270" y2="470" pathLength={1} />
      </g>
      <rect className="mtv-poster-screen" x="82" y="262" width="296" height="156" />
      <g className="mtv-poster-menu">
        <path d="M104 290 h90 M104 316 h120 M104 342 h104 M104 368 h112 M104 394 h84" />
        <path d="M250 290 h30 M250 316 h30 M250 342 h30 M250 368 h30 M250 394 h30" />
        <rect x="300" y="282" width="60" height="118" rx="3" />
      </g>
      <g className="mtv-ink-faint">
        <path d="M0 500 h480 M0 530 h480" pathLength={1} />
      </g>
    </svg>
  );
}

/** Who it's for: a poster on one side, the kinds of counter on the other, one open at a time. */
export function MadeFor() {
  return (
    <section className="mtv-madefor" aria-labelledby="madefor-title">
      <div className="mtv-sheet mtv-band mtv-madefor-grid">
        <div className="mtv-madefor-art">
          <PosterDrawing />
          <p className="sr-only">{madeFor.drawingLabel}</p>
        </div>
        <div className="mtv-madefor-copy">
          <h2 id="madefor-title" className="mtv-h2">
            {madeFor.title}
          </h2>
          <div className="mtv-accordion">
            {madeFor.items.map((item, index) => (
              <details key={item.title} name="made-for" open={index === 0}>
                <summary>
                  <span className="mtv-h3">{item.title}</span>
                  <span className="mtv-accordion-sign" aria-hidden="true" />
                </summary>
                <p className="mtv-body">{item.body}</p>
              </details>
            ))}
          </div>
          <Link href={madeFor.more.href} className="mtv-link">
            {madeFor.more.label}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
