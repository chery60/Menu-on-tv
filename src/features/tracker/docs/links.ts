/** Planning documents shown in the tracker. Safe to import on the client (no file access here). */

export interface TrackerDoc {
  readonly slug: string;
  readonly title: string;
  readonly icon: string;
  readonly file: string;
}

export const TRACKER_DOCS: readonly TrackerDoc[] = [
  { slug: 'product-brief', title: 'Product brief', icon: '🧭', file: 'PRODUCT.md' },
  { slug: 'platform-plan', title: 'Platform plan', icon: '🗺️', file: 'docs/platform-plan.md' },
  { slug: 'prd', title: 'PRD', icon: '📄', file: '.claude/prds/menutelly.prd.md' },
  { slug: 'research', title: 'Market research', icon: '🔎', file: 'docs/research.md' },
  { slug: 'teardown', title: 'Competitor teardown', icon: '🔬', file: 'docs/teardown.md' },
  { slug: 'market', title: 'Market, money and GTM', icon: '📈', file: 'docs/market-size.md' },
  { slug: 'screen-design', title: 'Screen design playbook', icon: '📺', file: 'docs/screen-design.md' },
  { slug: 'architecture', title: 'Architecture', icon: '🏗️', file: 'docs/architecture.md' },
  { slug: 'design-system', title: 'Design system', icon: '🎨', file: 'DESIGN.md' },
];

/** Maps a relative link like `docs/research.md` to its tracker page, if it is a registered doc. */
export function docHrefForFile(href: string): string | null {
  if (/^[a-z]+:/i.test(href)) return null;
  const normalized = href.replace(/^\.\//, '').replace(/^\.\.\//, '').split('#')[0];
  const doc = TRACKER_DOCS.find((entry) => entry.file === normalized || entry.file.endsWith(`/${normalized}`));
  return doc ? `/tracker/docs/${doc.slug}` : null;
}
