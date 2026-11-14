import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { ActionState } from '@/app/studio/action-state';
import type { MenuResult } from '@/app/studio/menu/menu-result';
import { applyEdit, emptyMenu, type EditContext } from '@/features/menu/edit';
import type { ItemInput, Menu, MenuEdit } from '@/features/menu/schema';
import type { LocalClock } from '@/lib/local-date';
import type { Promo } from '../schema';
import { emptyDraft } from './promo-form';
import { PromoEditor } from './promo-editor';
import { PromosStudio } from './promos-studio';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: () => {} }) }));

const NOW = new Date('2026-11-16T04:30:00.000Z');
const dish = (name: string, paise: number): ItemInput => ({ name, nameHi: '', description: '', prices: [{ label: '', paise }], diet: 'veg', badges: [], kcal: null, serving: '', allergens: [] });
let next = 0;
const ctx: EditContext = { today: '2026-11-16', now: NOW, newId: () => `id-${(next += 1)}` };
const edits: MenuEdit[] = [
  { type: 'add-category', name: 'Snacks', nameHi: '' },
  { type: 'add-item', categoryId: 'id-1', item: dish('Samosa', 2000) },
  { type: 'add-item', categoryId: 'id-1', item: dish('Masala chai', 3000) },
];
/** Snacks (id-1): Samosa ₹20 (id-2), Masala chai ₹30 (id-3). */
const MENU: Menu = edits.reduce((menu, change) => applyEdit(menu, change, ctx), emptyMenu(NOW));
const clock: LocalClock = { today: '2026-11-16', weekday: 1, minute: 600 };
const ok = async (): Promise<ActionState> => ({ status: 'ok' });
const okMenu = async (): Promise<MenuResult> => ({ ok: true, menu: null });
const combo: Promo = { id: 'p1', template: 'combo', dishes: [{ itemId: 'id-2', size: '' }, { itemId: 'id-3', size: '' }], dealPaise: 4500, headline: 'Chai and samosa', line: '', festival: null, link: null, startsAt: null, endsAt: null, daypart: null, countdown: false, paused: false, createdAt: '', updatedAt: '' };

const studio = (promos: readonly Promo[], isOwner: boolean) => renderToStaticMarkup(createElement(PromosStudio, { menu: MENU, clock, promos, isOwner, onSave: ok, onPause: ok, onRemove: ok, onSaveMenu: okMenu }));

describe('the Promos page', () => {
  it('shows an owner the six templates when there are no promos', () => {
    const html = studio([], true);
    for (const name of ['Combo', 'Happy hour', 'New item', 'Festival', 'Today’s special', 'Scan the QR']) expect(html).toContain(name);
  });

  it('lists each promo with what it is, its price and its state, and the owner’s actions', () => {
    const html = studio([combo], true);
    expect(html).toContain('Chai and samosa');
    expect(html).toContain('On air now');
    expect(html).toContain('Combo: Samosa and Masala chai');
    expect(html).toContain('₹45, menu ₹50');
    expect(html).toContain('New promo');
    for (const action of ['Edit', 'Pause', 'Remove']) expect(html).toContain(`>${action}<`);
  });

  it('gives staff the list without any way to change it', () => {
    const html = studio([combo], false);
    expect(html).toContain('Only an owner can change promos.');
    expect(html).not.toContain('New promo');
    expect(html).not.toContain('>Edit<');
    expect(studio([], false)).toContain('No promos yet. Only an owner can make them.');
  });
});

describe('the promo editor', () => {
  const editor = (template: Parameters<typeof emptyDraft>[0]) => renderToStaticMarkup(createElement(PromoEditor, { menu: MENU, initial: emptyDraft(template), onSave: ok, onClose: () => {}, onSaved: () => {} }));

  it('asks a combo for its dishes and price, with the headline count', () => {
    const html = editor('combo');
    expect(html).toContain('Dishes, 2 to 4');
    expect(html).toContain('Combo price in rupees');
    expect(html).toContain('0 of 30');
  });

  it('asks happy hour for one dish, and always for its times', () => {
    const html = editor('happy-hour');
    expect(html).toContain('type="radio"');
    expect(html).toContain('Plays only at these times');
    expect(html).toContain('type="time"');
  });

  it('asks a QR promo only for its link', () => {
    const html = editor('scan');
    expect(html).toContain('The link the QR opens');
    expect(html).not.toContain('promo-dish');
  });
});
