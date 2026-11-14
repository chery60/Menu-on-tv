import { dirname, join } from 'node:path';
import { dataFilePath } from '@/lib/data-path';
import { openDocumentStore, type DocumentStore } from '@/lib/document-store';
import { localDate } from '@/lib/local-date';
import { FUNNEL_TIME_ZONE, funnelFileSchema, OWN_CHANNEL, type Activity, type FunnelFile, type FunnelRestaurant, type FunnelStep } from './schema';

/**
 * Storage boundary for the owner funnel (MT-36). Each change is a pure function of the latest copy that returns
 * the same file when there is nothing new, so a step already reached or a day already marked costs a read, not a write.
 */

/** The PRD's starting value: sign-ups, steps and active days older than this are deleted. */
export const RETENTION_MONTHS = 13;

const blank = (): FunnelRestaurant => ({ channel: OWN_CHANNEL, test: false, steps: {}, active: {} });

function withRestaurant(file: FunnelFile, restaurantId: string, change: (entry: FunnelRestaurant) => FunnelRestaurant): FunnelFile {
  const entry = file.restaurants[restaurantId] ?? blank();
  const next = change(entry);
  return next === entry ? file : { ...file, restaurants: { ...file.restaurants, [restaurantId]: next } };
}

/** Someone signed up and has no restaurant yet. Only the first time counts. */
export function withSignUp(file: FunnelFile, userId: string, signedUpAt: string): FunnelFile {
  return file.signups[userId] ? file : { ...file, signups: { ...file.signups, [userId]: signedUpAt } };
}

/** Their restaurant is set up: their sign-up moves onto it, and steps it already has keep their first times. */
export function withSetUp(file: FunnelFile, restaurantId: string, userId: string, signedUpAt: string, at: string): FunnelFile {
  const { [userId]: pending, ...signups } = file.signups;
  const moved = withRestaurant(file, restaurantId, (entry) =>
    entry.steps['set-up'] && entry.steps['signed-up'] ? entry : { ...entry, steps: { 'signed-up': signedUpAt, 'set-up': at, ...entry.steps } },
  );
  return pending === undefined ? moved : { ...moved, signups };
}

/** The first time a restaurant reaches a step; later times are ignored. */
export function withStep(file: FunnelFile, restaurantId: string, step: FunnelStep, at: string): FunnelFile {
  return withRestaurant(file, restaurantId, (entry) => (entry.steps[step] ? entry : { ...entry, steps: { ...entry.steps, [step]: at } }));
}

/** One mark per day: a quick action upgrades a day's plain change, and nothing downgrades it. */
export function withActivity(file: FunnelFile, restaurantId: string, day: string, activity: Activity): FunnelFile {
  return withRestaurant(file, restaurantId, (entry) => {
    const marked = entry.active[day];
    return marked === 'quick' || marked === activity ? entry : { ...entry, active: { ...entry.active, [day]: activity } };
  });
}

export function withTest(file: FunnelFile, restaurantId: string, test: boolean): FunnelFile {
  return withRestaurant(file, restaurantId, (entry) => (entry.test === test ? entry : { ...entry, test }));
}

const isEmpty = (entry: FunnelRestaurant): boolean => !entry.test && Object.keys(entry.steps).length === 0 && Object.keys(entry.active).length === 0;

/** Deletes what is older than the retention period, and restaurants left with nothing. */
export function pruned(file: FunnelFile, now: Date): FunnelFile {
  const cutoff = new Date(now);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - RETENTION_MONTHS);
  const oldestDay = localDate(cutoff, FUNNEL_TIME_ZONE);
  const recent = (at: string): boolean => Date.parse(at) >= cutoff.getTime();
  const restaurants = Object.entries(file.restaurants)
    .map(([restaurantId, entry]): [string, FunnelRestaurant] => [
      restaurantId,
      {
        ...entry,
        steps: Object.fromEntries(Object.entries(entry.steps).filter(([, at]) => recent(at))),
        active: Object.fromEntries(Object.entries(entry.active).filter(([day]) => day >= oldestDay)),
      },
    ])
    .filter(([, entry]) => !isEmpty(entry));
  return { ...file, signups: Object.fromEntries(Object.entries(file.signups).filter(([, at]) => recent(at))), restaurants: Object.fromEntries(restaurants) };
}

export class FileFunnelRepository {
  private readonly store: DocumentStore<FunnelFile>;

  constructor(filePath: string) {
    this.store = openDocumentStore<FunnelFile>({ name: 'funnel', filePath, createInitial: () => ({ version: 1, signups: {}, restaurants: {} }), parse: (raw) => funnelFileSchema.parse(raw) });
  }

  async read(): Promise<FunnelFile> {
    return this.store.read();
  }

  async signedUp(userId: string, signedUpAt: string, now: Date): Promise<void> {
    await this.change(now, (file) => withSignUp(file, userId, signedUpAt));
  }

  async setUp(restaurantId: string, userId: string, signedUpAt: string, now: Date): Promise<void> {
    await this.change(now, (file) => withSetUp(file, restaurantId, userId, signedUpAt, now.toISOString()));
  }

  async reached(restaurantId: string, step: FunnelStep, now: Date): Promise<void> {
    await this.change(now, (file) => withStep(file, restaurantId, step, now.toISOString()));
  }

  /** Today, in India time, someone at the restaurant changed something. */
  async active(restaurantId: string, activity: Activity, now: Date): Promise<void> {
    await this.change(now, (file) => withActivity(file, restaurantId, localDate(now, FUNNEL_TIME_ZONE), activity));
  }

  async setTest(restaurantId: string, test: boolean, now: Date): Promise<void> {
    await this.change(now, (file) => withTest(file, restaurantId, test));
  }

  /** Reads first and writes only when the change is new; the write prunes old data. */
  private async change(now: Date, change: (file: FunnelFile) => FunnelFile): Promise<void> {
    const current = await this.store.read();
    if (change(current) === current) return;
    await this.store.update((latest) => {
      const next = change(latest);
      return next === latest ? latest : pruned(next, now);
    });
  }
}

/** Beside the accounts file unless FUNNEL_DATA_FILE says otherwise, so a copy of the data, or a test's folder, keeps its own funnel. */
export function getFunnelRepository(): FileFunnelRepository {
  const accounts = process.env.ACCOUNTS_DATA_FILE;
  return new FileFunnelRepository(dataFilePath('funnel.json', process.env.FUNNEL_DATA_FILE || (accounts ? join(dirname(accounts), 'funnel.json') : undefined)));
}
