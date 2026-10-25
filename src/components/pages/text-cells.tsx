import type { CellSection } from '@/content/site-content';

const COLUMNS: Readonly<Record<number, string>> = { 2: 'mtv-cells-2', 3: 'mtv-cells-3', 4: 'mtv-cells-4' };

/** A titled band of text cells: the demo page's notes block, for any list of ideas. */
export function TextCells({ section }: { readonly section: CellSection }) {
  const List = section.numbered ? 'ol' : 'ul';
  const titleId = `${section.id}-title`;

  return (
    <section aria-labelledby={titleId}>
      <div className="mtv-sheet mtv-band">
        <div className="mtv-section-head">
          <h2 id={titleId} className="mtv-h2">
            {section.title}
          </h2>
          {section.lead ? <p className="mtv-lead">{section.lead}</p> : null}
        </div>
        <List className={`mtv-cells ${COLUMNS[section.items.length] ?? 'mtv-cells-3'}`}>
          {section.items.map((item, index) => (
            <li key={item.title} className="mtv-problem">
              {section.numbered ? <span className="mtv-num">{String(index + 1).padStart(2, '0')}</span> : null}
              <h3 className="mtv-h3">{item.title}</h3>
              <p className="mtv-body">{item.body}</p>
            </li>
          ))}
        </List>
      </div>
    </section>
  );
}
