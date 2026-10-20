import { problems } from '@/content/site-content';
import { ProblemFigure, type ProblemFigureName } from './problem-figure';

/** One hairline figure per problem, in the order of `problems.items`: drawn in ink, the bright stroke marks what goes wrong. */
const FIGURES: readonly ProblemFigureName[] = ['reprints', 'pans', 'queue', 'flyers'];

/** The problem, broken into four: what a printed board gets wrong, one cell each. */
export function Problems() {
  return (
    <section className="mtv-problems" aria-labelledby="problems-title">
      <div className="mtv-sheet mtv-band">
        <div className="mtv-section-head">
          <h2 id="problems-title" className="mtv-h2">
            {problems.title}
          </h2>
          <p className="mtv-lead">{problems.lead}</p>
        </div>
        <ol className="mtv-cells mtv-cells-4">
          {problems.items.map((item, index) => (
            <li key={item.title} className="mtv-problem">
              <span className="mtv-num">{String(index + 1).padStart(2, '0')}</span>
              <ProblemFigure name={FIGURES[index]} />
              <h3 className="mtv-h3">{item.title}</h3>
              <p className="mtv-body">{item.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
