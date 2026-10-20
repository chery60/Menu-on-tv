import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { freeBand, screenRules } from '@/content/site-content';

function Diagram({ children }: { readonly children: ReactNode }) {
  return (
    <svg className="mtv-draw-view mtv-rule-art" viewBox="0 0 160 90" aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

const DIAGRAMS: readonly ReactNode[] = [
  // Big prices: the price is the biggest thing on the line.
  <Diagram key="big">
    <path className="mtv-ink-faint" d="M10 30 h60 M10 48 h48 M10 66 h56" pathLength={1} />
    <text className="mtv-rule-price" x="150" y="68" textAnchor="end">
      ₹45
    </text>
  </Diagram>,
  // One moving thing: three panels, only one of them changing.
  <Diagram key="one">
    <rect className="mtv-ink-faint" x="8" y="18" width="40" height="54" pathLength={1} />
    <rect className="mtv-ink" x="60" y="18" width="40" height="54" pathLength={1} />
    <rect className="mtv-ink-faint" x="112" y="18" width="40" height="54" pathLength={1} />
    <path className="mtv-chilli" d="M68 45 h24 M86 39 l6 6 l-6 6" pathLength={1} />
  </Diagram>,
  // Your promos first: the loop's first slots are yours; an ad, if any, takes one in three at most.
  <Diagram key="first">
    <rect className="mtv-rule-yours" x="8" y="34" width="22" height="22" />
    <rect className="mtv-rule-yours" x="34" y="34" width="22" height="22" />
    <rect className="mtv-ink" x="60" y="34" width="22" height="22" pathLength={1} />
    <rect className="mtv-rule-yours" x="86" y="34" width="22" height="22" />
    <rect className="mtv-rule-yours" x="112" y="34" width="22" height="22" />
    <rect className="mtv-dash" x="138" y="34" width="16" height="22" />
  </Diagram>,
  // Never a blank TV: no signal, and the menu still showing.
  <Diagram key="never">
    <rect className="mtv-ink" x="20" y="10" width="120" height="70" rx="3" pathLength={1} />
    <path className="mtv-ink-faint" d="M32 26 h50 M32 40 h62 M32 54 h44 M32 68 h56" pathLength={1} />
    <path className="mtv-chilli" d="M108 30 a14 14 0 0 1 22 0 M112 36 a8 8 0 0 1 14 0 M106 26 l28 22" pathLength={1} />
  </Diagram>,
];

/** The four screen rules, then the free plan. */
export function Rules() {
  return (
    <section className="mtv-rules" aria-labelledby="rules-title">
      <div className="mtv-sheet mtv-band">
        <div className="mtv-section-head">
          <h2 id="rules-title" className="mtv-h2">
            {screenRules.title}
          </h2>
        </div>
        <ul className="mtv-cells mtv-cells-4">
          {screenRules.items.map((rule, index) => (
            <li key={rule.title} className="mtv-rule">
              {DIAGRAMS[index]}
              <h3 className="mtv-h3">{rule.title}</h3>
              <p className="mtv-body">{rule.body}</p>
            </li>
          ))}
        </ul>
        <div className="mtv-free">
          <h2 className="mtv-h2">{freeBand.title}</h2>
          <div>
            <p className="mtv-free-body">{freeBand.body}</p>
            <Link href={freeBand.link.href} className="mtv-btn mtv-free-btn">
              {freeBand.link.label}
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
