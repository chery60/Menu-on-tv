import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FilePromosRepository, PromoError } from './repository';
import { PROMO_LIMITS, type PromoInput } from './schema';

const NOW = new Date('2026-11-16T04:30:00.000Z');
const LATER = new Date('2026-11-16T05:00:00.000Z');
const R = 'restaurant-1';
const OTHER = 'restaurant-2';
const combo: PromoInput = {
  template: 'combo',
  dishes: [{ itemId: 'samosa', size: '' }, { itemId: 'chai', size: '' }],
  dealPaise: 4500,
  headline: 'Chai and samosa',
  line: '',
  festival: null,
  link: null,
  startsAt: null,
  endsAt: null,
  daypart: null,
  countdown: false,
};

let directory: string;
let file: string;

function repository(): FilePromosRepository {
  let next = 0;
  return new FilePromosRepository(file, () => `promo-${(next += 1)}`);
}

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'menutelly-promos-'));
  file = join(directory, 'promos.json');
});

afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

describe('promos', () => {
  it('start with none, and keep each new promo in the order it was made, unpaused', async () => {
    const repo = repository();
    expect(await repo.list(R)).toEqual([]);
    await repo.create(R, combo, NOW);
    const second = await repo.create(R, { ...combo, headline: 'Second' }, LATER);
    expect(second).toMatchObject({ id: 'promo-2', paused: false, createdAt: LATER.toISOString(), updatedAt: LATER.toISOString() });
    expect((await repo.list(R)).map((promo) => promo.headline)).toEqual(['Chai and samosa', 'Second']);
    expect((await new FilePromosRepository(file).list(R)).map((promo) => promo.id)).toEqual(['promo-1', 'promo-2']);
  });

  it(`stop at ${PROMO_LIMITS.perRestaurant} per restaurant`, async () => {
    const full = Array.from({ length: PROMO_LIMITS.perRestaurant }, (_, index) => ({ ...combo, id: `p${index}`, paused: false, createdAt: NOW.toISOString(), updatedAt: NOW.toISOString() }));
    await writeFile(file, JSON.stringify({ version: 1, promos: { [R]: full } }));
    const repo = repository();
    await expect(repo.create(R, combo, NOW)).rejects.toBeInstanceOf(PromoError);
    await expect(repo.create(OTHER, combo, NOW)).resolves.toMatchObject({ headline: 'Chai and samosa' });
  });

  it('take new details in place, keeping their order, start and pause', async () => {
    const repo = repository();
    await repo.create(R, combo, NOW);
    await repo.create(R, { ...combo, headline: 'Second' }, NOW);
    await repo.setPaused(R, 'promo-1', true, NOW);
    const updated = await repo.update(R, 'promo-1', { ...combo, headline: 'Tea time', dealPaise: 4000 }, LATER);
    expect(updated).toMatchObject({ id: 'promo-1', headline: 'Tea time', dealPaise: 4000, paused: true, createdAt: NOW.toISOString(), updatedAt: LATER.toISOString() });
    expect((await repo.list(R)).map((promo) => promo.headline)).toEqual(['Tea time', 'Second']);
    expect(await repo.update(R, 'gone', combo, LATER)).toBeNull();
  });

  it('pause, resume and remove', async () => {
    const repo = repository();
    await repo.create(R, combo, NOW);
    expect(await repo.setPaused(R, 'promo-1', true, LATER)).toMatchObject({ paused: true });
    expect(await repo.setPaused(R, 'promo-1', false, LATER)).toMatchObject({ paused: false });
    expect(await repo.setPaused(R, 'gone', true, LATER)).toBeNull();
    expect(await repo.remove(R, 'promo-1')).toBe(true);
    expect(await repo.remove(R, 'promo-1')).toBe(false);
    expect(await repo.list(R)).toEqual([]);
  });

  it('keep each restaurant’s promos to itself', async () => {
    const repo = repository();
    await repo.create(R, combo, NOW);
    expect(await repo.list(OTHER)).toEqual([]);
    expect(await repo.update(OTHER, 'promo-1', { ...combo, headline: 'Taken' }, LATER)).toBeNull();
    expect(await repo.setPaused(OTHER, 'promo-1', true, LATER)).toBeNull();
    expect(await repo.remove(OTHER, 'promo-1')).toBe(false);
    expect(await repo.list(R)).toMatchObject([{ headline: 'Chai and samosa', paused: false }]);
  });
});
