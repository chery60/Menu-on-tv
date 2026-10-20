import { ArrowRight, Check } from 'lucide-react';
import { comparison, earn, faq, pricing, pricingPage } from '@/content/site-content';
import { ScreensCalculator } from './screens-calculator';

/** The three plans, one cell each, then the calculator. */
export function Plans() {
  return (
    <section className="mtv-plans" aria-labelledby="plans-title">
      <div className="mtv-sheet mtv-band">
        <div className="mtv-section-head">
          <h2 id="plans-title" className="mtv-h2">
            {pricing.title}
          </h2>
          <p className="mtv-lead">{pricing.lead}</p>
        </div>
        <ul className="mtv-cells mtv-cells-3">
          {pricing.plans.map((plan) => (
            <li key={plan.name} className="mtv-plan-cell" data-highlight={plan.highlight ?? false}>
              <h3 className="mtv-h3">{plan.name}</h3>
              <p className="mtv-plan-price">{plan.price}</p>
              <p className="mtv-mono">{plan.cadence}</p>
              <p className="mtv-body">{plan.summary}</p>
              <ul className="mtv-plan-features">
                {plan.features.map((feature) => (
                  <li key={feature}>
                    <Check aria-hidden="true" />
                    {feature}
                  </li>
                ))}
              </ul>
              <a href="#early-access" className={plan.highlight ? 'mtv-btn mtv-btn-primary' : 'mtv-btn'}>
                {pricingPage.choose} {plan.name}
                <ArrowRight aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
        <ScreensCalculator plans={pricing.plans} />
        <p className="mtv-mono mtv-pricing-foot">{pricing.footnote}</p>
      </div>
    </section>
  );
}

/** MenuOnTV against the alternatives, as published by them. */
export function Comparison() {
  return (
    <section className="mtv-compare" aria-labelledby="compare-title">
      <div className="mtv-sheet mtv-band">
        <div className="mtv-section-head">
          <h2 id="compare-title" className="mtv-h2">
            {comparison.title}
          </h2>
          <p className="mtv-mono">{comparison.note}</p>
        </div>
        <div className="mtv-table-wrap">
          <table className="mtv-table">
            <thead>
              <tr>
                <td />
                {comparison.columns.map((column, index) => (
                  <th key={column} scope="col" className={index === 0 ? 'is-us' : undefined}>
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparison.rows.map(([label, ...cells]) => (
                <tr key={label}>
                  <th scope="row">{label}</th>
                  {cells.map((cell, index) => (
                    <td key={`${label}-${index}`} className={index === 0 ? 'is-us' : undefined}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

/** The local-ad share, with its one number. */
export function Earn() {
  return (
    <section className="mtv-earn" aria-labelledby="earn-title">
      <div className="mtv-sheet mtv-band mtv-earn-grid">
        <div>
          <h2 id="earn-title" className="mtv-h2">
            {earn.title}
          </h2>
          <p className="mtv-lead mtv-earn-body">{earn.body}</p>
          <ul className="mtv-plan-features">
            {earn.points.map((point) => (
              <li key={point}>
                <Check aria-hidden="true" />
                {point}
              </li>
            ))}
          </ul>
        </div>
        <div className="mtv-earn-figure">
          <p className="mtv-earn-number">50%</p>
          <p className="mtv-body">{pricingPage.keepHalf}</p>
        </div>
      </div>
    </section>
  );
}

/** Questions owners ask, one open at a time. */
export function Faq() {
  return (
    <section id="faq" className="mtv-faq" aria-labelledby="faq-title">
      <div className="mtv-sheet mtv-band mtv-faq-grid">
        <h2 id="faq-title" className="mtv-h2">
          {faq.title}
        </h2>
        <div className="mtv-accordion">
          {faq.items.map((entry) => (
            <details key={entry.question} name="faq">
              <summary>
                <span className="mtv-h3">{entry.question}</span>
                <span className="mtv-accordion-sign" aria-hidden="true" />
              </summary>
              <p className="mtv-body">{entry.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
