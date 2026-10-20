import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { howItWorks, howPage, layoutsSection } from '@/content/site-content';
import { ScreenStage } from '@/features/screen/components/screen-stage';
import { LAYOUTS, type Restaurant } from '@/features/screen/types';

type QrCodes = Readonly<Record<string, string>>;

/** Step one: a paper menu, drawn, being read into prices. */
function ScanVisual() {
  return (
    <div className="mtv-scan">
      <svg className="mtv-draw-view mtv-scan-paper" viewBox="0 0 200 260" aria-hidden="true" focusable="false">
        <rect className="mtv-ink" x="10" y="10" width="180" height="240" pathLength={1} />
        <path className="mtv-ink" d="M40 40 h120" pathLength={1} />
        <path className="mtv-ink-faint" d="M30 78 h90 M30 108 h104 M30 138 h80 M30 168 h96 M30 198 h70 M30 228 h88" pathLength={1} />
        <path className="mtv-ink" d="M150 78 h20 M150 108 h20 M150 138 h20 M150 168 h20 M150 198 h20 M150 228 h20" pathLength={1} />
      </svg>
      <span className="mtv-scan-line" aria-hidden="true" />
      <div className="mtv-scan-read">
        <p className="mtv-mono">{howPage.scanning}</p>
        <ul>
          {howPage.scanned.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Step two: a live layout. */
function LayoutVisual({ restaurant, qrCodes }: { readonly restaurant: Restaurant; readonly qrCodes: QrCodes }) {
  return (
    <div className="mtv-tv">
      <div className="mtv-tv-screen">
        <ScreenStage restaurant={restaurant} layout="spotlight" theme="paper" qrCodes={qrCodes} label="Spotlight layout example" />
      </div>
    </div>
  );
}

/** Step three: the TV shows a short code; the owner's phone claims it. */
function PairVisual() {
  return (
    <div className="mtv-pair">
      <div className="mtv-tv">
        <div className="mtv-tv-screen mtv-pair-screen">
          <p className="mtv-pair-code" aria-label={`Pairing code ${howPage.pairCode.split('').join(' ')}`}>
            {howPage.pairCode.split('').map((char, index) => (
              <span key={`${char}-${index}`}>{char}</span>
            ))}
          </p>
        </div>
      </div>
      <p className="mtv-mono">{howPage.pairHint}</p>
    </div>
  );
}

/** The three steps, each with what it looks like. */
export function StepsDetail({ restaurant, qrCodes }: { readonly restaurant: Restaurant; readonly qrCodes: QrCodes }) {
  const visuals: readonly ReactNode[] = [<ScanVisual key="scan" />, <LayoutVisual key="layout" restaurant={restaurant} qrCodes={qrCodes} />, <PairVisual key="pair" />];

  return (
    <section className="mtv-how-steps" aria-labelledby="how-steps-title">
      <div className="mtv-sheet mtv-band">
        <h2 id="how-steps-title" className="sr-only">
          {howItWorks.title}
        </h2>
        <ol className="mtv-cells mtv-cells-3">
          {howItWorks.steps.map((step, index) => (
            <li key={step.title} className="mtv-how-step">
              <div className="mtv-how-visual">{visuals[index]}</div>
              <span className="mtv-num">{String(index + 1).padStart(2, '0')}</span>
              <h3 className="mtv-h3">{step.title}</h3>
              <p className="mtv-body">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/** The six layouts, live, one cell each. */
export function LayoutGallery({ restaurant, qrCodes }: { readonly restaurant: Restaurant; readonly qrCodes: QrCodes }) {
  return (
    <section id="layouts" className="mtv-layouts" aria-labelledby="layouts-title">
      <div className="mtv-sheet mtv-band">
        <div className="mtv-section-head">
          <h2 id="layouts-title" className="mtv-h2">
            {layoutsSection.title}
          </h2>
          <p className="mtv-lead">{layoutsSection.lead}</p>
        </div>
        <ul className="mtv-cells mtv-cells-3 mtv-gallery">
          {LAYOUTS.map((layout) => (
            <li key={layout.id} className="mtv-gallery-item">
              <div className={`mtv-gallery-stage ${layout.portrait ? 'is-portrait' : ''}`}>
                <div className="mtv-tv">
                  <div className="mtv-tv-screen">
                    <ScreenStage restaurant={restaurant} layout={layout.id} theme="paper" qrCodes={qrCodes} label={`${layout.name} layout example`} />
                  </div>
                </div>
              </div>
              <h3 className="mtv-h3">{layout.name}</h3>
              <p className="mtv-body">{layoutsSection.bestFor[layout.id]}.</p>
              <Link href={`/screen/demo?layout=${layout.id}`} className="mtv-link">
                {howPage.galleryLink}
                <span className="sr-only">: {layout.name}</span>
                <ArrowUpRight aria-hidden="true" className="size-4" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
