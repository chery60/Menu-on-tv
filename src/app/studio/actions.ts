'use server';

import QRCode from 'qrcode';
import { z } from 'zod';
import { getScreensRepository, type ClaimResult } from '@/features/screens/repository';
import { screenInputSchema } from '@/features/screens/schema';
import { isPairingCode } from '@/features/screens/tokens';
import { requestOrigin } from '@/lib/origin';
import type { ActionState, IssuedLink } from './action-state';
import { failed, guarded, OWNER_ONLY } from './guard';

/** Screens and TVs. Owners only; every call is scoped to the signed-in owner's restaurant. */

async function issue(token: string): Promise<IssuedLink> {
  const url = `${await requestOrigin()}/s/${token}`;
  const qrSvg = await QRCode.toString(url, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#111111', light: '#ffffff' } });
  return { url, qrSvg };
}

const id = z.string().min(1).max(64);

function readScreenInput(form: FormData) {
  return screenInputSchema.safeParse({
    name: form.get('name'),
    layout: form.get('layout'),
    theme: form.get('theme'),
    bilingual: form.get('bilingual') === 'on',
    // Forms without the timing fields (connect a TV) leave the screen on the playbook's timing.
    timing: form.has('menuSeconds') ? { menuSeconds: Number(form.get('menuSeconds')), promoSeconds: Number(form.get('promoSeconds')) } : undefined,
  });
}

export async function createScreenAction(_previous: ActionState, form: FormData): Promise<ActionState> {
  return guarded(OWNER_ONLY, 'studio.create_failed', async ({ restaurant }) => {
    const parsed = readScreenInput(form);
    if (!parsed.success) return failed(parsed.error.issues[0]?.message ?? 'Check the form and try again.');
    const { token } = await getScreensRepository().createScreen(restaurant.id, parsed.data, new Date());
    return { status: 'ok', message: 'Screen added. Open this link on the TV, or scan the code with the TV’s phone app.', issued: await issue(token) };
  });
}

export async function updateScreenAction(_previous: ActionState, form: FormData): Promise<ActionState> {
  return guarded(OWNER_ONLY, 'studio.update_failed', async ({ restaurant }) => {
    const screenId = id.safeParse(form.get('screenId'));
    const parsed = readScreenInput(form);
    if (!screenId.success || !parsed.success) return failed(parsed.success ? 'Choose a screen.' : (parsed.error.issues[0]?.message ?? 'Check the form.'));
    const updated = await getScreensRepository().updateScreen(restaurant.id, screenId.data, parsed.data, new Date());
    return updated ? { status: 'ok', message: 'Saved. The TV changes at its next slide.' } : failed('This screen was removed.');
  });
}

const CLAIM_MESSAGES: Readonly<Record<ClaimResult, ActionState>> = {
  claimed: { status: 'ok', message: 'Connected. The TV shows your menu in a few seconds.' },
  unknown: failed('No TV is showing that code. Check the code on the TV and try again.'),
  expired: failed('That code has expired. The TV will show a new one; enter that instead.'),
  'already-claimed': failed('That TV is already connected.'),
  'no-screen': failed('Choose which screen this TV should show.'),
  'too-many-links': failed('This screen already has the most TVs it can show on. Disconnect one first.'),
};

/** Value of the "show this screen" choice that makes a new screen for the TV. */
const NEW_SCREEN = 'new';

export async function connectTvAction(_previous: ActionState, form: FormData): Promise<ActionState> {
  return guarded(OWNER_ONLY, 'studio.connect_failed', async ({ restaurant }) => {
    const code = String(form.get('code') ?? '').toUpperCase().replace(/[\s-]/g, '');
    const screenId = id.safeParse(form.get('screenId'));
    if (!isPairingCode(code)) return failed('Enter the 6-character code shown on the TV.');
    if (!screenId.success) return CLAIM_MESSAGES['no-screen'];
    const screens = getScreensRepository();
    const now = new Date();
    if (screenId.data !== NEW_SCREEN) return CLAIM_MESSAGES[await screens.claimPairing(code, restaurant.id, screenId.data, now)];

    const count = (await screens.listScreens(restaurant.id)).length;
    const screen = await screens.addScreen(restaurant.id, { name: count === 0 ? 'Counter TV' : `Screen ${count + 1}`, layout: 'split', theme: 'paper', bilingual: false }, now);
    const claimed = await screens.claimPairing(code, restaurant.id, screen.id, now);
    if (claimed !== 'claimed') await screens.removeScreen(restaurant.id, screen.id);
    return CLAIM_MESSAGES[claimed];
  });
}

export async function rotateLinkAction(_previous: ActionState, form: FormData): Promise<ActionState> {
  return guarded(OWNER_ONLY, 'studio.rotate_failed', async ({ restaurant }) => {
    const screenId = id.safeParse(form.get('screenId'));
    const linkId = id.safeParse(form.get('linkId'));
    if (!screenId.success || !linkId.success) return failed('Choose a TV.');
    const rotated = await getScreensRepository().rotateLink(restaurant.id, screenId.data, linkId.data, new Date());
    if (!rotated) return failed('That TV was disconnected.');
    return { status: 'ok', message: 'New link made. The old one stopped working; open this one on the TV.', issued: await issue(rotated.token) };
  });
}

export async function disconnectTvAction(_previous: ActionState, form: FormData): Promise<ActionState> {
  return guarded(OWNER_ONLY, 'studio.disconnect_failed', async ({ restaurant }) => {
    const screenId = id.safeParse(form.get('screenId'));
    const linkId = id.safeParse(form.get('linkId'));
    if (!screenId.success || !linkId.success) return failed('Choose a TV.');
    const removed = await getScreensRepository().removeLink(restaurant.id, screenId.data, linkId.data, new Date());
    return removed ? { status: 'ok', message: 'Disconnected. That TV now shows how to connect again.' } : failed('That TV was already disconnected.');
  });
}

export async function removeScreenAction(_previous: ActionState, form: FormData): Promise<ActionState> {
  return guarded(OWNER_ONLY, 'studio.remove_failed', async ({ restaurant }) => {
    const screenId = id.safeParse(form.get('screenId'));
    if (!screenId.success) return failed('Choose a screen.');
    return (await getScreensRepository().removeScreen(restaurant.id, screenId.data)) ? { status: 'ok', message: 'Screen removed.' } : failed('That screen was already removed.');
  });
}
