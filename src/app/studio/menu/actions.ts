'use server';

import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { RestaurantAccess } from '@/features/accounts/session';
import { applyEdit, applyImport, menuPhotos, setPhoto, type EditContext } from '@/features/menu/edit';
import type { ImportedItem } from '@/features/menu/import';
import { MENU_PHOTO_LIMITS, toImportedItems } from '@/features/menu/photo-import';
import { canReadMenuPhotos, MenuPhotoError, readMenuPhoto } from '@/features/menu/photo-reader';
import { getPhotoStore, sniffImage } from '@/features/menu/photos';
import { getMenusRepository } from '@/features/menu/repository';
import { sampleMenu } from '@/features/menu/sample';
import { menuEditSchema, menuImportSchema, type Menu } from '@/features/menu/schema';
import { localDate } from '@/lib/local-date';
import { logger } from '@/lib/logger';
import { RateLimiter } from '@/lib/rate-limit';
import type { ActionState } from '../action-state';
import { EVERYONE, failed, gate, guarded, TRY_AGAIN, userMessage } from '../guard';
import type { MenuResult } from './menu-result';

/** Menu changes from the editor and the Today page. Owners and staff may both edit the menu. */

const itemId = z.string().min(1).max(64);

function editContext(access: RestaurantAccess, now: Date, onNewId?: (id: string) => void): EditContext {
  return {
    today: localDate(now, access.restaurant.outlets[0].timeZone),
    now,
    newId: () => {
      const id = randomUUID();
      onNewId?.(id);
      return id;
    },
  };
}

/** Photos no longer on the menu are deleted. A failed delete only leaves a file behind, so it is logged, not shown. */
async function deletePhotos(ids: readonly string[]): Promise<void> {
  const store = getPhotoStore();
  await Promise.all(ids.map((id) => store.remove(id).catch((error: unknown) => logger.error('menu.photo_delete_failed', error))));
}

/** Runs a menu change for a signed-in member. Known problems come back as a message with the latest menu. */
async function changeMenu(event: string, change: (menu: Menu, access: RestaurantAccess, now: Date) => Menu, extra: { createdId?: () => string | undefined } = {}): Promise<MenuResult> {
  const checked = await gate(EVERYONE);
  if (!checked.ok) return { ok: false, menu: null, message: checked.message };
  const { access } = checked;
  const now = new Date();
  const menus = getMenusRepository();
  let removed: readonly string[] = [];
  try {
    const menu = await menus.update(
      access.restaurant.id,
      (before) => {
        const after = change(before, access, now);
        const kept = new Set(menuPhotos(after));
        removed = menuPhotos(before).filter((photo) => !kept.has(photo));
        return after;
      },
      now,
    );
    await deletePhotos(removed);
    return { ok: true, menu, createdId: extra.createdId?.() };
  } catch (error) {
    const message = userMessage(error);
    if (!message) logger.error(event, error);
    return { ok: false, menu: await menus.get(access.restaurant.id, now).catch(() => null), message: message ?? TRY_AGAIN };
  }
}

export async function editMenuAction(input: unknown): Promise<MenuResult> {
  const parsed = menuEditSchema.safeParse(input);
  if (!parsed.success) return { ok: false, menu: null, message: parsed.error.issues[0]?.message ?? 'Check what you typed and try again.' };
  let created: string | undefined;
  return changeMenu('menu.edit_failed', (menu, access, now) => applyEdit(menu, parsed.data, editContext(access, now, (id) => (created = id))), {
    createdId: () => (parsed.data.type === 'add-item' ? created : undefined),
  });
}

/** Dishes the owner pasted or uploaded and checked, saved as one change so TVs never show half an import. */
export async function importMenuAction(input: unknown): Promise<MenuResult> {
  const parsed = menuImportSchema.safeParse(input);
  if (!parsed.success) return { ok: false, menu: null, message: parsed.error.issues[0]?.message ?? 'Check the dishes and try again.' };
  return changeMenu('menu.import_failed', (menu, access, now) => applyImport(menu, parsed.data, editContext(access, now)));
}

export async function startFromSampleAction(): Promise<MenuResult> {
  return changeMenu('menu.sample_failed', (menu, _access, now) => {
    if (menu.categories.length > 0) return menu;
    return sampleMenu(now, randomUUID);
  });
}

export async function uploadPhotoAction(form: FormData): Promise<MenuResult> {
  const checked = await gate(EVERYONE);
  if (!checked.ok) return { ok: false, menu: null, message: checked.message };
  const target = itemId.safeParse(form.get('itemId'));
  const file = form.get('photo');
  if (!target.success || !(file instanceof File)) return { ok: false, menu: null, message: 'Choose a photo first.' };

  let photoId: string;
  try {
    photoId = await getPhotoStore().save(new Uint8Array(await file.arrayBuffer()));
  } catch (error) {
    const message = userMessage(error);
    if (!message) logger.error('menu.photo_save_failed', error);
    return { ok: false, menu: null, message: message ?? 'We couldn’t keep that photo. Try again.' };
  }
  const result = await changeMenu('menu.photo_failed', (menu, _access, now) => setPhoto(menu, target.data, photoId, now).menu);
  if (!result.ok) await deletePhotos([photoId]);
  return result;
}

export async function removePhotoAction(id: unknown): Promise<MenuResult> {
  const target = itemId.safeParse(id);
  if (!target.success) return { ok: false, menu: null, message: 'Choose an item.' };
  return changeMenu('menu.photo_remove_failed', (menu, _access, now) => setPhoto(menu, target.data, null, now).menu);
}

/** Each photo costs a model call, so one restaurant reads at most this many a day (a menu is a few photos). */
const PHOTO_READS_PER_DAY = 40;
const photoReads = new RateLimiter(PHOTO_READS_PER_DAY, 24 * 60 * 60 * 1000);

export type PhotoReadResult = { readonly ok: true; readonly items: readonly ImportedItem[] } | { readonly ok: false; readonly message: string };

/**
 * Reads one photo of the menu into dishes for the import preview. Nothing is saved: the owner checks the
 * dishes and saves them with importMenuAction. The photo itself is kept nowhere.
 */
export async function readMenuPhotoAction(form: FormData): Promise<PhotoReadResult> {
  const checked = await gate(EVERYONE);
  if (!checked.ok) return { ok: false, message: checked.message };
  if (!canReadMenuPhotos()) return { ok: false, message: 'Reading menus from photos isn’t switched on yet. Paste your menu instead.' };
  const file = form.get('photo');
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: 'Choose a photo of your menu first.' };
  if (file.size > MENU_PHOTO_LIMITS.bytes) return { ok: false, message: 'That photo is too large. Try it again from the camera.' };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffImage(bytes);
  if (!type) return { ok: false, message: 'Use a JPEG, PNG or WebP photo.' };
  if (!photoReads.take(checked.access.restaurant.id, Date.now()).allowed) return { ok: false, message: 'You’ve read a lot of menu photos today. Paste the menu instead, or try again tomorrow.' };

  try {
    const reading = await readMenuPhoto({ bytes, type });
    const items = toImportedItems(reading);
    if (items.length === 0) return { ok: false, message: reading.problem.trim() || 'We couldn’t find any dishes in that photo. Take a closer photo in good light, or paste your menu.' };
    return { ok: true, items };
  } catch (error) {
    if (error instanceof MenuPhotoError) return { ok: false, message: error.message };
    logger.error('menu.photo_read_failed', error);
    return { ok: false, message: 'We couldn’t read that photo right now. Try again in a minute, or paste your menu.' };
  }
}

/** The Today page's one-tap sold-out switch. */
export async function setSoldOutAction(_previous: ActionState, form: FormData): Promise<ActionState> {
  return guarded(EVERYONE, 'studio.sold_out_failed', async (access) => {
    const target = itemId.safeParse(form.get('itemId'));
    if (!target.success) return failed('That item isn’t on the menu.');
    const soldOut = form.get('soldOut') === 'true';
    const now = new Date();
    await getMenusRepository().update(access.restaurant.id, (menu) => applyEdit(menu, { type: 'set-sold-out', itemId: target.data, soldOut }, editContext(access, now)), now);
    return { status: 'ok', message: soldOut ? 'Marked sold out on every screen until tomorrow.' : 'Back on every screen.' };
  });
}
