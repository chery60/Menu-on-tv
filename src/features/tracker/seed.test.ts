import { describe, expect, it } from 'vitest';
import { trackerFileSchema } from './schema';
import { buildSeedItems } from './seed';

const items = buildSeedItems();
const byKey = new Map(items.map((item) => [item.key, item]));

describe('MenuOnTV seed plan', () => {
  it('numbers keys MT-1 upwards with no gaps', () => {
    expect(items.map((item) => item.key)).toEqual(items.map((_, index) => `MT-${index + 1}`));
  });

  it('is valid against the data file schema', () => {
    expect(trackerFileSchema.safeParse({ version: 1, items }).success).toBe(true);
  });

  it('keeps the Planned column to v0 only', () => {
    const planned = items.filter((item) => item.status === 'planned');
    expect(planned.length).toBeGreaterThan(15);
    expect(planned.every((item) => item.phase === 'phase-1')).toBe(true);
  });

  it('lists v0 in build order: sign-in first, the pilot last', () => {
    const v0 = items.filter((item) => item.phase === 'phase-1').sort((a, b) => a.rank - b.rank);
    expect(v0[0].title).toMatch(/sign in/i);
    expect(v0.at(-1)?.title).toMatch(/pilot/i);
    expect(v0.every((item) => item.tags.includes('v0-launch'))).toBe(true);
  });

  it('puts every later-phase item in the backlog', () => {
    const later = items.filter((item) => ['phase-2', 'phase-3', 'phase-4'].includes(item.phase));
    expect(later.every((item) => item.status === 'backlog')).toBe(true);
  });

  it('records the research as done and the name as waiting for a decision', () => {
    expect(byKey.get('MT-1')).toMatchObject({ status: 'done', title: expect.stringMatching(/research/i) });
    expect(byKey.get('MT-2')?.body).toMatch(/REA/);
    expect(byKey.get('MT-4')).toMatchObject({ status: 'in_review', owner: 'Charan' });
    expect(byKey.get('MT-4')?.title).toMatch(/MenuOnTV/);
  });

  it('gives every item a why, a what and at least one acceptance check', () => {
    for (const item of items) {
      expect(item.body).toMatch(/^\*\*Why\.\*\* .+\n\n\*\*What\.\*\* /);
      expect(item.checklist.length).toBeGreaterThan(0);
    }
  });

  it('marks acceptance checks that are already met', () => {
    const player = items.find((item) => item.title === 'Screen player on a link');
    expect(player?.checklist.filter((entry) => entry.done).map((entry) => entry.text)).toContain('Wall-clock loop with tests');
  });
});

describe('docs/platform-plan.md', () => {
  it('names the same item for every MT key it cites', async () => {
    const { readFile } = await import('node:fs/promises');
    const plan = await readFile(new URL('../../../docs/platform-plan.md', import.meta.url), 'utf8');
    // Any table row that cites a key: the title is its first cell that isn't a row number.
    const rows = plan
      .split('\n')
      .filter((line) => line.startsWith('|') && /\| MT-\d+ \|/.test(line))
      .map((line) => {
        const cells = line.split('|').map((cell) => cell.trim()).filter(Boolean);
        return ['', cells.find((cell) => !/^\d+$/.test(cell)) ?? '', cells.find((cell) => /^MT-\d+$/.test(cell)) ?? ''] as const;
      });
    expect(rows.length).toBeGreaterThan(30);
    const words = (text: string): string[] => text.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((word) => word.length > 3);
    for (const [, title, key] of rows) {
      const item = byKey.get(key);
      expect(item, key).toBeDefined();
      // The doc may shorten a title, but its words must come from the tracker item.
      const itemWords = new Set(words(`${item?.title} ${item?.summary}`));
      expect(words(title).some((word) => itemWords.has(word)), `${key}: "${title}" vs "${item?.title}"`).toBe(true);
    }
  });
});
