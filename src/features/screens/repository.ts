import { randomUUID } from 'node:crypto';
import { dataFilePath } from '@/lib/data-path';
import { openDocumentStore, type DocumentStore } from '@/lib/document-store';
import { screensFileSchema, type Screen, type ScreenInput, type ScreenLink, type ScreensFile } from './schema';
import { generatePairingCode, generateToken, hashSecret, secretMatches } from './tokens';

/** Storage boundary for screens, their TV links and pairing requests. Every owner call is scoped to one restaurant. */

export const PAIRING_TTL_MS = 10 * 60 * 1000;
/** Per restaurant. */
export const MAX_SCREENS = 20;
export const MAX_LINKS_PER_SCREEN = 10;
/** Cap on unclaimed pairing requests, so the public start endpoint can't grow the file without bound. */
export const MAX_PENDING_PAIRINGS = 200;

export interface IssuedToken {
  readonly screen: Screen;
  readonly link: ScreenLink;
  /** Shown once. Only its hash is stored. */
  readonly token: string;
}

export interface ResolvedScreen {
  readonly screen: Screen;
  readonly link: ScreenLink;
}

export type ClaimResult = 'claimed' | 'unknown' | 'expired' | 'already-claimed' | 'no-screen' | 'too-many-links';
export type CollectResult =
  | { readonly status: 'waiting' }
  | { readonly status: 'paired'; readonly token: string }
  | { readonly status: 'expired' }
  | { readonly status: 'unknown' };

export class ScreensLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScreensLimitError';
  }
}

function emptyFile(): ScreensFile {
  return { version: 2, screens: [], pairings: [] };
}

function newLink(label: string, now: Date): { readonly link: ScreenLink; readonly token: string } {
  const token = generateToken();
  return {
    token,
    link: { id: randomUUID(), label, tokenHash: hashSecret(token), createdAt: now.toISOString(), lastSeenAt: null, lastVersion: null, lastSlide: null },
  };
}

const isLive = (expiresAt: string, now: Date): boolean => Date.parse(expiresAt) > now.getTime();

/** Changes one screen, only if it belongs to the restaurant. */
function withScreen(file: ScreensFile, restaurantId: string, screenId: string, change: (screen: Screen) => Screen): ScreensFile {
  return { ...file, screens: file.screens.map((screen) => (screen.id === screenId && screen.restaurantId === restaurantId ? change(screen) : screen)) };
}

const owns = (screen: Screen, restaurantId: string, screenId: string): boolean => screen.id === screenId && screen.restaurantId === restaurantId;

export class FileScreensRepository {
  private readonly store: DocumentStore<ScreensFile>;

  constructor(filePath: string) {
    this.store = openDocumentStore<ScreensFile>({ name: 'screens', filePath, createInitial: emptyFile, parse: (raw) => screensFileSchema.parse(raw) });
  }

  async read(): Promise<ScreensFile> {
    return this.store.read();
  }

  async listScreens(restaurantId: string): Promise<readonly Screen[]> {
    return (await this.store.read()).screens.filter((screen) => screen.restaurantId === restaurantId);
  }

  /** A new screen with its first TV link, shown once to open on the TV. */
  async createScreen(restaurantId: string, input: ScreenInput, now: Date): Promise<IssuedToken> {
    const { link, token } = newLink('First TV', now);
    const screen = await this.addScreen(restaurantId, input, now, [link]);
    return { screen, link, token };
  }

  /** A new screen with no TVs yet, for when the first TV joins by its pairing code. */
  async addScreen(restaurantId: string, input: ScreenInput, now: Date, links: readonly ScreenLink[] = []): Promise<Screen> {
    const screen: Screen = { id: randomUUID(), restaurantId, ...input, links: [...links], createdAt: now.toISOString(), updatedAt: now.toISOString() };
    await this.store.update((file) => {
      if (file.screens.filter((entry) => entry.restaurantId === restaurantId).length >= MAX_SCREENS) throw new ScreensLimitError(`You can have up to ${MAX_SCREENS} screens.`);
      return { ...file, screens: [...file.screens, screen] };
    });
    return screen;
  }

  async updateScreen(restaurantId: string, screenId: string, input: ScreenInput, now: Date): Promise<Screen | null> {
    let updated: Screen | null = null;
    await this.store.update((file) =>
      withScreen(file, restaurantId, screenId, (screen) => {
        updated = { ...screen, ...input, updatedAt: now.toISOString() };
        return updated;
      }),
    );
    return updated;
  }

  async removeScreen(restaurantId: string, screenId: string): Promise<boolean> {
    let removed = false;
    await this.store.update((file) => {
      removed = file.screens.some((screen) => owns(screen, restaurantId, screenId));
      return removed ? { ...file, screens: file.screens.filter((screen) => !owns(screen, restaurantId, screenId)) } : file;
    });
    return removed;
  }

  /** A fresh token for one TV; the old link stops working at once. Other TVs on the screen keep theirs. */
  async rotateLink(restaurantId: string, screenId: string, linkId: string, now: Date): Promise<IssuedToken | null> {
    let issued: IssuedToken | null = null;
    await this.store.update((file) =>
      withScreen(file, restaurantId, screenId, (screen) => {
        const current = screen.links.find((link) => link.id === linkId);
        if (!current) return screen;
        const { link, token } = newLink(current.label, now);
        const replaced = { ...link, id: current.id };
        const next = { ...screen, links: screen.links.map((entry) => (entry.id === linkId ? replaced : entry)), updatedAt: now.toISOString() };
        issued = { screen: next, link: replaced, token };
        return next;
      }),
    );
    return issued;
  }

  async removeLink(restaurantId: string, screenId: string, linkId: string, now: Date): Promise<boolean> {
    let removed = false;
    await this.store.update((file) =>
      withScreen(file, restaurantId, screenId, (screen) => {
        removed = screen.links.some((link) => link.id === linkId);
        return removed ? { ...screen, links: screen.links.filter((link) => link.id !== linkId), updatedAt: now.toISOString() } : screen;
      }),
    );
    return removed;
  }

  async resolveToken(token: string): Promise<ResolvedScreen | null> {
    const file = await this.store.read();
    for (const screen of file.screens) {
      const link = screen.links.find((entry) => secretMatches(token, entry.tokenHash));
      if (link) return { screen, link };
    }
    return null;
  }

  /** Records that a TV is alive and what it is showing. Returns null for an unknown or revoked link. */
  async recordBeat(token: string, beat: { readonly version: string | null; readonly slide: string | null }, now: Date): Promise<ResolvedScreen | null> {
    const resolved = await this.resolveToken(token);
    if (!resolved) return null;
    let result: ResolvedScreen | null = null;
    await this.store.update((file) =>
      withScreen(file, resolved.screen.restaurantId, resolved.screen.id, (screen) => {
        const links = screen.links.map((link) =>
          link.id === resolved.link.id ? { ...link, lastSeenAt: now.toISOString(), lastVersion: beat.version, lastSlide: beat.slide } : link,
        );
        const next = { ...screen, links };
        const link = links.find((entry) => entry.id === resolved.link.id);
        if (link) result = { screen: next, link };
        return next;
      }),
    );
    return result;
  }


  /** A TV asks to be paired. It keeps the secret; we keep its hash and show the code. */
  async startPairing(now: Date): Promise<{ readonly code: string; readonly deviceSecret: string; readonly expiresAt: string }> {
    const deviceSecret = generateToken();
    let started: { code: string; expiresAt: string } | null = null;
    await this.store.update((file) => {
      const pairings = file.pairings.filter((pairing) => isLive(pairing.expiresAt, now));
      if (pairings.filter((pairing) => !pairing.screenId).length >= MAX_PENDING_PAIRINGS) {
        throw new ScreensLimitError('Too many screens are waiting to pair. Try again in a few minutes.');
      }
      const taken = new Set(pairings.map((pairing) => pairing.code));
      let code = generatePairingCode();
      while (taken.has(code)) code = generatePairingCode();
      const expiresAt = new Date(now.getTime() + PAIRING_TTL_MS).toISOString();
      started = { code, expiresAt };
      return {
        ...file,
        pairings: [...pairings, { code, deviceSecretHash: hashSecret(deviceSecret), createdAt: now.toISOString(), expiresAt, screenId: null }],
      };
    });
    if (!started) throw new Error('Pairing finished without a code.');
    const { code, expiresAt } = started;
    return { code, deviceSecret, expiresAt };
  }

  /** The owner enters the TV's code. Nothing secret is made yet: the TV's link is created when it collects. */
  async claimPairing(code: string, restaurantId: string, screenId: string, now: Date): Promise<ClaimResult> {
    let result: ClaimResult = 'unknown';
    await this.store.update((file) => {
      const pairing = file.pairings.find((entry) => entry.code === code);
      if (!pairing) return file;
      if (!isLive(pairing.expiresAt, now)) {
        result = 'expired';
        return file;
      }
      if (pairing.screenId) {
        result = 'already-claimed';
        return file;
      }
      const screen = file.screens.find((entry) => owns(entry, restaurantId, screenId));
      if (!screen) {
        result = 'no-screen';
        return file;
      }
      if (screen.links.length >= MAX_LINKS_PER_SCREEN) {
        result = 'too-many-links';
        return file;
      }
      result = 'claimed';
      return { ...file, pairings: file.pairings.map((entry) => (entry.code === code ? { ...entry, screenId } : entry)) };
    });
    return result;
  }

  /**
   * The waiting TV polls with its secret. Once the owner has claimed the code, the TV's link is created
   * here and its token returned once; the pairing request is deleted. No token is ever stored.
   */
  async collectPairing(code: string, deviceSecret: string, now: Date): Promise<CollectResult> {
    let result: CollectResult = { status: 'unknown' };
    await this.store.update((file) => {
      const pairing = file.pairings.find((entry) => entry.code === code);
      if (!pairing || !secretMatches(deviceSecret, pairing.deviceSecretHash)) return file;
      const rest = file.pairings.filter((entry) => entry.code !== code);
      if (!isLive(pairing.expiresAt, now)) {
        result = { status: 'expired' };
        return { ...file, pairings: rest };
      }
      if (!pairing.screenId) {
        result = { status: 'waiting' };
        return file;
      }
      const screen = file.screens.find((entry) => entry.id === pairing.screenId);
      if (!screen || screen.links.length >= MAX_LINKS_PER_SCREEN) {
        // The screen was removed or filled up after the claim: the TV starts over with a new code.
        result = { status: 'expired' };
        return { ...file, pairings: rest };
      }
      const { link, token } = newLink(`TV ${screen.links.length + 1}`, now);
      result = { status: 'paired', token };
      return {
        ...withScreen(file, screen.restaurantId, screen.id, (entry) => ({ ...entry, links: [...entry.links, link], updatedAt: now.toISOString() })),
        pairings: rest,
      };
    });
    return result;
  }
}

export function getScreensRepository(): FileScreensRepository {
  const filePath = dataFilePath('screens.json', process.env.SCREENS_DATA_FILE);
  return new FileScreensRepository(filePath);
}
