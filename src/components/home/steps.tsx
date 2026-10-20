import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { flow, howItWorks } from '@/content/site-content';

const ROWS = [60, 150, 240];
const STRANDS = [-12, -6, 0, 6, 12];
const MEET = { x: 700, y: 150 };

/** What the owner gives MenuOnTV, drawn as threads that meet in one TV link. */
function FlowDrawing() {
  return (
    <svg className="mtv-draw-view mtv-flow-svg" viewBox="0 0 1000 300" aria-hidden="true" focusable="false">
      {flow.inputs.map((input, row) => (
        <g key={input}>
          <text className="mtv-flow-text" x="20" y={ROWS[row] + 5}>
            {input}
          </text>
          {STRANDS.map((offset) => {
            const y = ROWS[row] + offset;
            return <path key={offset} className="mtv-strand" d={`M190 ${y} C 430 ${y}, 520 ${MEET.y}, ${MEET.x} ${MEET.y}`} pathLength={1} />;
          })}
          <circle className="mtv-flow-dot" cx="182" cy={ROWS[row]} r="4" />
        </g>
      ))}
      <path className="mtv-ink" d={`M${MEET.x} ${MEET.y} H784`} pathLength={1} />
      <rect className="mtv-ink" x="786" y="106" width="150" height="88" rx="4" pathLength={1} />
      <path className="mtv-ink-faint" d="M800 124 h60 M800 140 h84 M800 156 h70 M800 172 h50" pathLength={1} />
      <circle className="mtv-flow-on" cx="922" cy="182" r="4" />
      <text className="mtv-flow-text" x="861" y="226" textAnchor="middle">
        {flow.output}
      </text>
    </svg>
  );
}

/** How it works, in three steps and about ten minutes. */
export function Steps() {
  return (
    <section className="mtv-steps" aria-labelledby="steps-title">
      <div className="mtv-sheet mtv-band">
        <div className="mtv-section-head">
          <h2 id="steps-title" className="mtv-h2">
            {howItWorks.title}
          </h2>
          <Link href={flow.more.href} className="mtv-link">
            {flow.more.label}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
        <div className="mtv-flow">
          <FlowDrawing />
        </div>
        <ol className="mtv-cells mtv-cells-3">
          {howItWorks.steps.map((step, index) => (
            <li key={step.title} className="mtv-step">
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
