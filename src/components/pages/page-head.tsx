import type { ReactNode } from 'react';

interface PageHeadProps {
  readonly title: string;
  readonly lead: string;
  readonly children?: ReactNode;
}

/** The top of an inner page: the title on the left, what it's about and what to do on the right. */
export function PageHead({ title, lead, children }: PageHeadProps) {
  return (
    <section className="mtv-page-head" aria-labelledby="page-title">
      <div className="mtv-sheet mtv-page-head-grid">
        <h1 id="page-title" className="mtv-h1 mtv-page-title">
          {title}
        </h1>
        <div className="mtv-page-head-side">
          <p className="mtv-lead">{lead}</p>
          {children}
        </div>
      </div>
    </section>
  );
}
