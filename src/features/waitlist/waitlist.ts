import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { earlyAccess } from '@/content/site-content';
import { dataFilePath } from '@/lib/data-path';
import { openDocumentStore, type DocumentStore } from '@/lib/document-store';

/** Early-access waitlist: validation, storage and a repository interface. */

const MAX_EMAIL_LENGTH = 254;
const MAX_RESTAURANT_LENGTH = 120;

export const waitlistInputSchema = z.object({
  email: z
    .string({ error: 'Enter your email address.' })
    .trim()
    .toLowerCase()
    .max(MAX_EMAIL_LENGTH, { error: 'Use a shorter email address.' })
    .pipe(z.email({ error: 'Enter an email address like name@cafe.in.' })),
  role: z.enum(earlyAccess.roles, { error: 'Choose your role from the list.' }),
  restaurant: z.string().trim().max(MAX_RESTAURANT_LENGTH, { error: 'Use 120 characters or fewer.' }).optional(),
});

export type WaitlistInput = z.infer<typeof waitlistInputSchema>;

const entrySchema = z.object({
  id: z.string(),
  email: z.string(),
  role: z.string(),
  restaurant: z.string().optional(),
  createdAt: z.string(),
});

export type WaitlistEntry = z.infer<typeof entrySchema>;

const fileSchema = z.object({ entries: z.array(entrySchema) });
type WaitlistFile = z.infer<typeof fileSchema>;

/** Bots fill hidden fields; people never see them. */
export function isHoneypotFilled(body: unknown): boolean {
  if (typeof body !== 'object' || body === null || !('website' in body)) return false;
  const value = (body as { website?: unknown }).website;
  return typeof value === 'string' && value.trim().length > 0;
}

export interface AddResult {
  readonly entry: WaitlistEntry;
  readonly duplicate: boolean;
}

export interface WaitlistRepository {
  add(input: WaitlistInput, now: Date): Promise<AddResult>;
  count(): Promise<number>;
}

export class FileWaitlistRepository implements WaitlistRepository {
  private readonly store: DocumentStore<WaitlistFile>;

  constructor(filePath: string) {
    this.store = openDocumentStore<WaitlistFile>({
      name: 'waitlist',
      filePath,
      createInitial: () => ({ entries: [] }),
      parse: (raw) => fileSchema.parse(raw),
    });
  }

  async add(input: WaitlistInput, now: Date): Promise<AddResult> {
    let result: AddResult | null = null;
    await this.store.update((current) => {
      const existing = current.entries.find((entry) => entry.email === input.email);
      if (existing) {
        result = { entry: existing, duplicate: true };
        return current;
      }
      const entry: WaitlistEntry = {
        id: randomUUID(),
        email: input.email,
        role: input.role,
        ...(input.restaurant ? { restaurant: input.restaurant } : {}),
        createdAt: now.toISOString(),
      };
      result = { entry, duplicate: false };
      return { entries: [...current.entries, entry] };
    });
    if (!result) throw new Error('Waitlist update finished without a result.');
    return result;
  }

  async count(): Promise<number> {
    const file = await this.store.read();
    return file.entries.length;
  }
}

export function getWaitlistRepository(): WaitlistRepository {
  const filePath = dataFilePath('waitlist.json', process.env.WAITLIST_DATA_FILE);
  return new FileWaitlistRepository(filePath);
}
