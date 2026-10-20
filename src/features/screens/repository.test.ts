import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FileScreensRepository, MAX_LINKS_PER_SCREEN, MAX_PENDING_PAIRINGS, MAX_SCREENS, PAIRING_TTL_MS, ScreensLimitError } from './repository';
import type { ScreenInput } from './schema';

let directory: string;
let file: string;
let repo: FileScreensRepository;
const NOW = new Date('2026-10-18T10:00:00.000Z');
const later = (ms: number): Date => new Date(NOW.getTime() + ms);
const counter: ScreenInput = { name: 'Counter TV', layout: 'split', theme: 'night', bilingual: false };
const R = 'restaurant-1';
const OTHER = 'restaurant-2';

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'menutelly-screens-'));
  file = join(directory, 'screens.json');
  repo = new FileScreensRepository(file);
});

afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

describe('screen links', () => {
  it('issue a token once and store only its hash', async () => {
    const { screen, token } = await repo.createScreen(R, counter, NOW);
    expect(screen).toMatchObject({ name: 'Counter TV', layout: 'split', links: [{ label: 'First TV' }] });
    expect(await readFile(file, 'utf8')).not.toContain(token);
    expect((await repo.resolveToken(token))?.screen.id).toBe(screen.id);
    expect(await repo.resolveToken('not-a-real-token')).toBeNull();
  });

  it('stop working the moment a link is rotated, without touching other TVs', async () => {
    const first = await repo.createScreen(R, counter, NOW);
    const second = await repo.startPairing(NOW);
    await repo.claimPairing(second.code, R, first.screen.id, NOW);
    const collected = await repo.collectPairing(second.code, second.deviceSecret, NOW);
    if (collected.status !== 'paired') throw new Error('expected paired');

    const rotated = await repo.rotateLink(R, first.screen.id, first.link.id, later(1000));
    expect(rotated?.link.id).toBe(first.link.id);
    expect(await repo.resolveToken(first.token)).toBeNull();
    expect((await repo.resolveToken(rotated?.token ?? ''))?.link.id).toBe(first.link.id);
    expect(await repo.resolveToken(collected.token)).not.toBeNull();
  });

  it('can be removed, and removing a screen removes all its links', async () => {
    const { screen, link, token } = await repo.createScreen(R, counter, NOW);
    expect(await repo.removeLink(R, screen.id, link.id, NOW)).toBe(true);
    expect(await repo.resolveToken(token)).toBeNull();
    expect(await repo.removeLink(R, screen.id, link.id, NOW)).toBe(false);
    expect(await repo.removeScreen(R, screen.id)).toBe(true);
    expect((await repo.read()).screens).toEqual([]);
  });

  it('record heartbeats on the right TV', async () => {
    const { token } = await repo.createScreen(R, counter, NOW);
    const beat = await repo.recordBeat(token, { version: 'abc', slide: 'menu:0' }, later(5000));
    expect(beat?.link).toMatchObject({ lastSeenAt: later(5000).toISOString(), lastVersion: 'abc', lastSlide: 'menu:0' });
    expect(await repo.recordBeat('nope', { version: null, slide: null }, NOW)).toBeNull();
  });

  it('update a screen’s layout and theme', async () => {
    const { screen } = await repo.createScreen(R, counter, NOW);
    const updated = await repo.updateScreen(R, screen.id, { ...counter, layout: 'board', theme: 'paper' }, later(1));
    expect(updated).toMatchObject({ layout: 'board', theme: 'paper' });
    expect(await repo.updateScreen(R, 'missing', counter, NOW)).toBeNull();
  });

  it(`stop at ${MAX_SCREENS} screens`, async () => {
    for (let i = 0; i < MAX_SCREENS; i += 1) await repo.createScreen(R, { ...counter, name: `TV ${i}` }, NOW);
    await expect(repo.createScreen(R, counter, NOW)).rejects.toBeInstanceOf(ScreensLimitError);
  });
});


describe('pairing', () => {
  it('hands the TV its own new link once, after the owner enters the code', async () => {
    const { screen } = await repo.createScreen(R, counter, NOW);
    const { code, deviceSecret } = await repo.startPairing(NOW);
    expect(await repo.collectPairing(code, deviceSecret, NOW)).toEqual({ status: 'waiting' });
    expect(await repo.claimPairing(code, R, screen.id, later(1000))).toBe('claimed');

    const collected = await repo.collectPairing(code, deviceSecret, later(2000));
    expect(collected.status).toBe('paired');
    const token = collected.status === 'paired' ? collected.token : '';
    expect((await repo.resolveToken(token))?.link.label).toBe('TV 2');
    expect(await readFile(file, 'utf8')).not.toContain(token);
    // Collected once: the request is gone.
    expect(await repo.collectPairing(code, deviceSecret, later(3000))).toEqual({ status: 'unknown' });
  });

  it('never stores the TV’s secret or answers someone who doesn’t hold it', async () => {
    const { screen } = await repo.createScreen(R, counter, NOW);
    const { code, deviceSecret } = await repo.startPairing(NOW);
    expect(await readFile(file, 'utf8')).not.toContain(deviceSecret);
    await repo.claimPairing(code, R, screen.id, NOW);
    expect(await repo.collectPairing(code, 'guess', NOW)).toEqual({ status: 'unknown' });
    expect((await repo.collectPairing(code, deviceSecret, NOW)).status).toBe('paired');
  });

  it(`expires after ${PAIRING_TTL_MS / 60000} minutes`, async () => {
    const { screen } = await repo.createScreen(R, counter, NOW);
    const { code, deviceSecret } = await repo.startPairing(NOW);
    expect(await repo.claimPairing(code, R, screen.id, later(PAIRING_TTL_MS + 1))).toBe('expired');
    expect(await repo.collectPairing(code, deviceSecret, later(PAIRING_TTL_MS + 1))).toEqual({ status: 'expired' });
    expect((await repo.read()).pairings).toEqual([]);
  });

  it('explains why a claim failed', async () => {
    const { screen } = await repo.createScreen(R, counter, NOW);
    const { code } = await repo.startPairing(NOW);
    expect(await repo.claimPairing('ZZZZZZ', R, screen.id, NOW)).toBe('unknown');
    expect(await repo.claimPairing(code, R, 'missing', NOW)).toBe('no-screen');
    expect(await repo.claimPairing(code, R, screen.id, NOW)).toBe('claimed');
    expect(await repo.claimPairing(code, R, screen.id, NOW)).toBe('already-claimed');
  });

  it(`stops adding TVs at ${MAX_LINKS_PER_SCREEN} per screen`, async () => {
    const { screen } = await repo.createScreen(R, counter, NOW);
    for (let i = 1; i < MAX_LINKS_PER_SCREEN; i += 1) {
      const { code, deviceSecret } = await repo.startPairing(NOW);
      await repo.claimPairing(code, R, screen.id, NOW);
      await repo.collectPairing(code, deviceSecret, NOW);
    }
    const { code } = await repo.startPairing(NOW);
    expect(await repo.claimPairing(code, R, screen.id, NOW)).toBe('too-many-links');
  });

  it('starts the TV over if its screen was removed after the claim', async () => {
    const { screen } = await repo.createScreen(R, counter, NOW);
    const { code, deviceSecret } = await repo.startPairing(NOW);
    await repo.claimPairing(code, R, screen.id, NOW);
    await repo.removeScreen(R, screen.id);
    expect(await repo.collectPairing(code, deviceSecret, NOW)).toEqual({ status: 'expired' });
  });

  it(`refuses new requests past ${MAX_PENDING_PAIRINGS} waiting, and forgets expired ones`, async () => {
    for (let i = 0; i < MAX_PENDING_PAIRINGS; i += 1) await repo.startPairing(NOW);
    await expect(repo.startPairing(NOW)).rejects.toBeInstanceOf(ScreensLimitError);
    await expect(repo.startPairing(later(PAIRING_TTL_MS + 1))).resolves.toMatchObject({ code: expect.any(String) });
    expect((await repo.read()).pairings).toHaveLength(1);
  });
});

describe('restaurants', () => {
  it('only see and change their own screens and TVs', async () => {
    const { screen, link, token } = await repo.createScreen(R, counter, NOW);
    expect(await repo.listScreens(OTHER)).toEqual([]);
    expect(await repo.updateScreen(OTHER, screen.id, { ...counter, name: 'Taken' }, NOW)).toBeNull();
    expect(await repo.rotateLink(OTHER, screen.id, link.id, NOW)).toBeNull();
    expect(await repo.removeLink(OTHER, screen.id, link.id, NOW)).toBe(false);
    expect(await repo.removeScreen(OTHER, screen.id)).toBe(false);
    const { code } = await repo.startPairing(NOW);
    expect(await repo.claimPairing(code, OTHER, screen.id, NOW)).toBe('no-screen');
    expect((await repo.resolveToken(token))?.screen).toMatchObject({ name: 'Counter TV', restaurantId: R });
  });

  it('can add a screen with no TVs, for the first TV to join by code', async () => {
    const screen = await repo.addScreen(R, counter, NOW);
    expect(screen.links).toEqual([]);
    const { code, deviceSecret } = await repo.startPairing(NOW);
    expect(await repo.claimPairing(code, R, screen.id, NOW)).toBe('claimed');
    const collected = await repo.collectPairing(code, deviceSecret, NOW);
    expect(collected.status === 'paired' ? (await repo.resolveToken(collected.token))?.link.label : null).toBe('TV 1');
  });

  it('each get their own screen allowance', async () => {
    for (let i = 0; i < MAX_SCREENS; i += 1) await repo.createScreen(R, counter, NOW);
    await expect(repo.createScreen(OTHER, counter, NOW)).resolves.toMatchObject({ screen: { restaurantId: OTHER } });
  });
});

describe('old data files', () => {
  it('keep pairings and drop the ownerless screens from the team console', async () => {
    const pairing = { code: 'ABC234', deviceSecretHash: 'a'.repeat(64), createdAt: NOW.toISOString(), expiresAt: later(60_000).toISOString(), screenId: null };
    const legacy = { version: 1, menu: { version: 3, soldOut: ['samosa'], updatedAt: NOW.toISOString() }, screens: [{ id: 'old' }], pairings: [pairing] };
    await writeFile(file, JSON.stringify(legacy));
    expect(await repo.read()).toEqual({ version: 2, screens: [], pairings: [pairing] });
  });

  it('read screens saved with a retired theme in the brand theme that replaced it', async () => {
    const saved = (id: string, theme: string) => ({ id, restaurantId: R, name: 'TV', layout: 'split', theme, bilingual: false, links: [], createdAt: NOW.toISOString(), updatedAt: NOW.toISOString() });
    await writeFile(file, JSON.stringify({ version: 2, screens: [saved('a', 'chalk'), saved('b', 'neon'), saved('c', 'fresh'), saved('d', 'night')], pairings: [] }));
    expect((await repo.read()).screens.map((screen) => screen.theme)).toEqual(['night', 'night', 'paper', 'night']);
  });

  it('still refuse a theme that never existed', async () => {
    const screen = { id: 'a', restaurantId: R, name: 'TV', layout: 'split', theme: 'disco', bilingual: false, links: [], createdAt: NOW.toISOString(), updatedAt: NOW.toISOString() };
    await writeFile(file, JSON.stringify({ version: 2, screens: [screen], pairings: [] }));
    await expect(repo.read()).rejects.toThrow();
  });
});
