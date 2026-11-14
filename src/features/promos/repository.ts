import { randomUUID } from 'node:crypto';
import { dataFilePath } from '@/lib/data-path';
import { openDocumentStore, type DocumentStore } from '@/lib/document-store';
import { PROMO_LIMITS, promosFileSchema, type Promo, type PromoInput, type PromosFile } from './schema';

/** Storage boundary for each restaurant's promos. Every call is scoped to one restaurant; changes run on the latest copy. */

export class PromoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PromoError';
  }
}

const withPromos = (file: PromosFile, restaurantId: string, promos: readonly Promo[]): PromosFile => ({ ...file, promos: { ...file.promos, [restaurantId]: [...promos] } });
const findPromo = (file: PromosFile, restaurantId: string, promoId: string): Promo | null => file.promos[restaurantId]?.find((promo) => promo.id === promoId) ?? null;

export class FilePromosRepository {
  private readonly store: DocumentStore<PromosFile>;

  constructor(
    filePath: string,
    private readonly newId: () => string = randomUUID,
  ) {
    this.store = openDocumentStore<PromosFile>({ name: 'promos', filePath, createInitial: () => ({ version: 1, promos: {} }), parse: (raw) => promosFileSchema.parse(raw) });
  }

  /** In the order they were made, which is the order they play. */
  async list(restaurantId: string): Promise<readonly Promo[]> {
    return (await this.store.read()).promos[restaurantId] ?? [];
  }

  async create(restaurantId: string, input: PromoInput, now: Date): Promise<Promo> {
    const id = this.newId();
    const stamp = now.toISOString();
    const file = await this.store.update((current) => {
      const promos = current.promos[restaurantId] ?? [];
      if (promos.length >= PROMO_LIMITS.perRestaurant) throw new PromoError(`You can have up to ${PROMO_LIMITS.perRestaurant} promos. Remove one you no longer need.`);
      return withPromos(current, restaurantId, [...promos, { id, ...input, paused: false, createdAt: stamp, updatedAt: stamp }]);
    });
    const created = findPromo(file, restaurantId, id);
    if (!created) throw new Error('The promo was not saved.');
    return created;
  }

  /** New details for a promo, keeping its place in the order and whether it is paused. Null if it is gone. */
  async update(restaurantId: string, promoId: string, input: PromoInput, now: Date): Promise<Promo | null> {
    return this.change(restaurantId, promoId, (promo) => ({ ...promo, ...input, updatedAt: now.toISOString() }));
  }

  async setPaused(restaurantId: string, promoId: string, paused: boolean, now: Date): Promise<Promo | null> {
    return this.change(restaurantId, promoId, (promo) => ({ ...promo, paused, updatedAt: now.toISOString() }));
  }

  async remove(restaurantId: string, promoId: string): Promise<boolean> {
    let removed = false;
    await this.store.update((current) => {
      const promos = current.promos[restaurantId] ?? [];
      removed = promos.some((promo) => promo.id === promoId);
      return removed ? withPromos(current, restaurantId, promos.filter((promo) => promo.id !== promoId)) : current;
    });
    return removed;
  }

  private async change(restaurantId: string, promoId: string, change: (promo: Promo) => Promo): Promise<Promo | null> {
    const file = await this.store.update((current) => {
      const promos = current.promos[restaurantId] ?? [];
      if (!promos.some((promo) => promo.id === promoId)) return current;
      return withPromos(current, restaurantId, promos.map((promo) => (promo.id === promoId ? change(promo) : promo)));
    });
    return findPromo(file, restaurantId, promoId);
  }
}

export function getPromosRepository(): FilePromosRepository {
  return new FilePromosRepository(dataFilePath('promos.json', process.env.PROMOS_DATA_FILE));
}
