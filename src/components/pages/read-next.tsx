import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { type LinkItem, readNextTitle } from '@/content/site-content';

/** The pages to read after this one: one cell each, as links. */
export function ReadNext({ links }: { readonly links: readonly LinkItem[] }) {
  return (
    <section aria-labelledby="read-next-title">
      <div className="mtv-sheet mtv-band">
        <div className="mtv-section-head">
          <h2 id="read-next-title" className="mtv-h2">
            {readNextTitle}
          </h2>
        </div>
        <ul className="mtv-cells mtv-cells-3">
          {links.map((link) => (
            <li key={link.href} className="mtv-problem">
              <h3 className="mtv-h3">{link.title}</h3>
              <p className="mtv-body">{link.body}</p>
              <Link href={link.href} className="mtv-link">
                Read it
                <span className="sr-only">: {link.title}</span>
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
