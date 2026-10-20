import 'server-only';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { TRACKER_DOCS, type TrackerDoc } from './links';

/**
 * Reads a registered planning document. Each path is a literal so the bundler
 * traces exactly these files, and nothing outside this list can ever be read.
 */
const READERS: Readonly<Record<string, () => Promise<string>>> = {
  'product-brief': () => readFile(join(process.cwd(), 'PRODUCT.md'), 'utf8'),
  'platform-plan': () => readFile(join(process.cwd(), 'docs', 'platform-plan.md'), 'utf8'),
  prd: () => readFile(join(process.cwd(), '.claude', 'prds', 'menutelly.prd.md'), 'utf8'),
  research: () => readFile(join(process.cwd(), 'docs', 'research.md'), 'utf8'),
  teardown: () => readFile(join(process.cwd(), 'docs', 'teardown.md'), 'utf8'),
  market: () => readFile(join(process.cwd(), 'docs', 'market-size.md'), 'utf8'),
  'screen-design': () => readFile(join(process.cwd(), 'docs', 'screen-design.md'), 'utf8'),
  architecture: () => readFile(join(process.cwd(), 'docs', 'architecture.md'), 'utf8'),
  'design-system': () => readFile(join(process.cwd(), 'DESIGN.md'), 'utf8'),
};

export async function readTrackerDoc(slug: string): Promise<{ readonly doc: TrackerDoc; readonly markdown: string } | null> {
  const doc = TRACKER_DOCS.find((entry) => entry.slug === slug);
  const read = READERS[slug];
  if (!doc || !read) return null;
  return { doc, markdown: await read() };
}
