import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { scorePriceReading, toImportedItems, type GoldenMenu } from './photo-import';
import { readMenuPhoto } from './photo-reader';
import { sniffImage } from './photos';

/**
 * The golden-set eval for menu photos (evals/menu-photos/README.md). It calls the real model, so it runs
 * only when asked: MENU_PHOTO_EVAL=1 npx vitest run src/features/menu/photo-eval.test.ts
 */

vi.mock('server-only', () => ({}));

const FOLDER = join(process.cwd(), 'evals/menu-photos');
const PASS = 0.95;

describe.runIf(process.env.MENU_PHOTO_EVAL === '1')('menu photo golden set', () => {
  it(`reads at least ${PASS * 100}% of the prices exactly`, { timeout: 30 * 60 * 1000 }, async () => {
    const names = (await readdir(FOLDER)).filter((name) => /\.(jpe?g|png|webp)$/i.test(name));
    expect(names.length, 'Add photos to evals/menu-photos first').toBeGreaterThan(0);
    let prices = 0;
    let correct = 0;
    for (const name of names) {
      const bytes = new Uint8Array(await readFile(join(FOLDER, name)));
      const type = sniffImage(bytes);
      if (!type) throw new Error(`${name} is not a JPEG, PNG or WebP image.`);
      const golden = JSON.parse(await readFile(join(FOLDER, name.replace(/\.\w+$/, '.json')), 'utf8')) as GoldenMenu;
      const score = scorePriceReading(golden, toImportedItems(await readMenuPhoto({ bytes, type })));
      prices += score.prices;
      correct += score.correct;
      console.info(`${name}: ${score.correct}/${score.prices}${score.misses.length > 0 ? `, missed ${score.misses.join('; ')}` : ''}`);
    }
    console.info(`Golden set: ${names.length} photos, ${correct}/${prices} prices (${((correct / Math.max(prices, 1)) * 100).toFixed(1)}%)`);
    expect(correct / Math.max(prices, 1)).toBeGreaterThanOrEqual(PASS);
  });
});
