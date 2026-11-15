// @vitest-environment jsdom
/**
 * QA checks for MT-26 slice 3, the Promos page as the owner and staff use it (docs/prd/mt-26-promo-studio.md,
 * "What it does", the Design section and "How we'll know it works" 1 to 4, 11, 12, 13 and 15). The Server
 * Actions are spies here; promos-page-rules.test.ts checks the real ones.
 */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { ActionState } from '@/app/studio/action-state';
import { applyEdit, emptyMenu, type EditContext } from '@/features/menu/edit';
import type { ItemInput, Menu, MenuEdit } from '@/features/menu/schema';
import type { LocalClock } from '@/lib/local-date';
import type { Promo } from '../schema';
import { PromosStudio } from './promos-studio';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: () => {} }) }));

// jsdom has no showModal; the Sheet only needs the dialog to open, and to fire "close" when it closes.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
});
afterEach(cleanup);

const NOW = new Date('2026-11-16T04:30:00.000Z');
const dish = (name: string, paise: number): ItemInput => ({ name, nameHi: '', description: '', prices: [{ label: '', paise }], diet: 'veg', badges: [], kcal: null, serving: '', allergens: [] });
let next = 0;
const ctx: EditContext = { today: '2026-11-16', now: NOW, newId: () => `id-${(next += 1)}` };
const edits: MenuEdit[] = [
  { type: 'add-category', name: 'Snacks', nameHi: '' },
  { type: 'add-item', categoryId: 'id-1', item: dish('Samosa', 2000) },
  { type: 'add-item', categoryId: 'id-1', item: dish('Masala chai', 3000) },
];
/** The PRD's café: Samosa ₹20 (id-2) and Masala chai ₹30 (id-3). */
const MENU: Menu = edits.reduce((menu, change) => applyEdit(menu, change, ctx), emptyMenu(NOW));
const clock: LocalClock = { today: '2026-11-16', weekday: 1, minute: 600 };
const COMBO: Promo = { id: 'p1', template: 'combo', dishes: [{ itemId: 'id-2', size: '' }, { itemId: 'id-3', size: '' }], dealPaise: 4500, headline: 'Chai and samosa', line: '', festival: null, link: null, startsAt: null, endsAt: null, daypart: null, countdown: false, paused: false, createdAt: '', updatedAt: '' };
const TEMPLATE_NAMES = ['Combo', 'Happy hour', 'New item', 'Festival', 'Today’s special', 'Scan the QR'];

type Spy = ReturnType<typeof vi.fn<(input: unknown) => Promise<ActionState>>>;
const answer = (state: ActionState): Spy => vi.fn<(input: unknown) => Promise<ActionState>>(async () => state);

function page(promos: readonly Promo[], isOwner: boolean, spies: { onSave?: Spy; onPause?: Spy; onRemove?: Spy } = {}) {
  const actions = { onSave: spies.onSave ?? answer({ status: 'ok', message: 'Promo saved.' }), onPause: spies.onPause ?? answer({ status: 'ok' }), onRemove: spies.onRemove ?? answer({ status: 'ok', message: 'Promo removed.' }) };
  render(createElement(PromosStudio, { menu: MENU, clock, promos, isOwner, ...actions, onSaveMenu: async () => ({ ok: true as const, menu: null }) }));
  return actions;
}

const templateButton = (name: string) => screen.getByRole('button', { name: new RegExp(`^${name}`) });
const dialog = () => screen.getByRole('dialog');

/** New promo, Combo, then Samosa and Masala chai ticked: the editor as check 2 leaves it before the price is typed. */
function startCombo() {
  fireEvent.click(screen.getByRole('button', { name: /New promo/ }));
  fireEvent.click(within(dialog()).getByRole('button', { name: /^Combo/ }));
  const editor = dialog();
  fireEvent.click(within(editor).getByRole('checkbox', { name: 'Samosa' }));
  fireEvent.click(within(editor).getByRole('checkbox', { name: 'Masala chai' }));
  return editor;
}

describe('the Promos page with no promos (check 1)', () => {
  it('shows an owner the six templates as cards, each with its name and one line', () => {
    page([], true);
    for (const name of TEMPLATE_NAMES) {
      const card = templateButton(name);
      expect(card.textContent?.length).toBeGreaterThan(name.length + 10);
    }
  });

  it('opens a template’s editor in a sheet from its card', () => {
    page([], true);
    fireEvent.click(templateButton('Combo'));
    expect(within(dialog()).getByLabelText(/Combo price/)).toBeTruthy();
    expect(within(dialog()).getByRole('button', { name: /Save promo/ })).toBeTruthy();
  });

  it('opens Today’s special picker, the same one Today uses, from its card (check 13)', () => {
    page([], true);
    fireEvent.click(templateButton('Today’s special'));
    expect(within(dialog()).getByRole('heading', { name: 'Pick today’s special' })).toBeTruthy();
    expect(within(dialog()).queryByRole('button', { name: /Save promo/ })).toBeNull();
  });

  it('gives staff nothing to press', () => {
    page([], false);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });
});

describe('making a combo (checks 2, 3 and 4)', () => {
  it('opens the six templates from New promo', () => {
    page([COMBO], true);
    fireEvent.click(screen.getByRole('button', { name: /New promo/ }));
    const sheet = dialog();
    for (const name of TEMPLATE_NAMES) expect(within(sheet).getByRole('button', { name: new RegExp(`^${name}`) })).toBeTruthy();
  });

  it('starts the price at the menu total, says to keep it lower, and fills the headline with a live count', () => {
    page([COMBO], true);
    const editor = startCombo();
    expect((within(editor).getByLabelText(/Combo price/) as HTMLInputElement).value).toMatch(/^50(\.00)?$/);
    expect(within(editor).getByText('Menu total ₹50. Keep it lower.')).toBeTruthy();
    const headline = within(editor).getByLabelText('Headline') as HTMLInputElement;
    expect(headline.value).not.toBe('');
    expect(within(editor).getByText(`${headline.value.length} of 30`)).toBeTruthy();
    fireEvent.change(headline, { target: { value: 'Chai + samosa deal' } });
    expect(within(editor).getByText('18 of 30')).toBeTruthy();
  });

  it('saves the typed ₹45 with both dishes, then shows the action’s message', async () => {
    const onSave = answer({ status: 'ok', message: 'Promo saved.' });
    page([COMBO], true, { onSave });
    const editor = startCombo();
    fireEvent.change(within(editor).getByLabelText(/Combo price/), { target: { value: '45' } });
    fireEvent.click(within(editor).getByRole('button', { name: /Save promo/ }));
    expect(await screen.findByText('Promo saved.')).toBeTruthy();
    expect(onSave).toHaveBeenCalledTimes(1);
    const sent = onSave.mock.calls[0][0] as Record<string, unknown>;
    expect(sent).toMatchObject({ template: 'combo', dealPaise: 4500 });
    expect(sent).not.toHaveProperty('id');
    expect(sent.dishes).toEqual(expect.arrayContaining([expect.objectContaining({ itemId: 'id-2' }), expect.objectContaining({ itemId: 'id-3' })]));
  });

  it('keeps the sheet open on a refused price, with the action’s reason above Save', async () => {
    const reason = 'The combo price has to be lower than ₹50, the menu price.';
    page([COMBO], true, { onSave: answer({ status: 'error', message: reason }) });
    const editor = startCombo();
    fireEvent.change(within(editor).getByLabelText(/Combo price/), { target: { value: '50' } });
    const save = within(editor).getByRole('button', { name: /Save promo/ });
    fireEvent.click(save);
    const alert = await within(editor).findByRole('alert');
    expect(alert.textContent).toBe(reason);
    expect(editor.hasAttribute('open')).toBe(true);
    expect(alert.compareDocumentPosition(save) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('offers the countdown only once the promo has an end (check 11)', () => {
    page([COMBO], true);
    const editor = startCombo();
    expect(within(editor).queryByText('Show the time left near the end')).toBeNull();
    fireEvent.click(within(editor).getByRole('checkbox', { name: /Ends at a set time/ }));
    expect(within(editor).getByText('Show the time left near the end')).toBeTruthy();
  });

  it.fails('PRODUCT GAP: puts the owner’s New promo after the list, as Design orders the page', () => {
    page([COMBO], true);
    const list = screen.getByRole('list');
    const button = screen.getByRole('button', { name: /New promo/ });
    expect(list.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

describe('editing, pausing and removing (check 12)', () => {
  it('opens Edit with the promo as saved, and saves the change to that promo', async () => {
    const onSave = answer({ status: 'ok', message: 'Promo saved.' });
    page([COMBO], true, { onSave });
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const editor = dialog();
    expect((within(editor).getByLabelText('Headline') as HTMLInputElement).value).toBe('Chai and samosa');
    expect((within(editor).getByLabelText(/Combo price/) as HTMLInputElement).value).toBe('45');
    expect((within(editor).getByRole('checkbox', { name: 'Samosa' }) as HTMLInputElement).checked).toBe(true);
    expect((within(editor).getByRole('checkbox', { name: 'Masala chai' }) as HTMLInputElement).checked).toBe(true);
    fireEvent.change(within(editor).getByLabelText('Headline'), { target: { value: 'Tea time' } });
    fireEvent.click(within(editor).getByRole('button', { name: /Save promo/ }));
    expect(await screen.findByText('Promo saved.')).toBeTruthy();
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1', headline: 'Tea time', dealPaise: 4500 }));
  });

  it('pauses a promo on air, and shows the action’s message', async () => {
    const onPause = answer({ status: 'ok', message: 'Paused. It leaves your TVs at their next slide.' });
    page([COMBO], true, { onPause });
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    expect(await screen.findByText('Paused. It leaves your TVs at their next slide.')).toBeTruthy();
    expect(onPause).toHaveBeenCalledWith({ id: 'p1', paused: true });
  });

  it('shows a paused promo as Paused, with Resume in place of Pause', async () => {
    const onPause = answer({ status: 'ok' });
    page([{ ...COMBO, paused: true }], true, { onPause });
    expect(screen.getByText('Paused')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Pause' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }));
    await screen.findByRole('status');
    expect(onPause).toHaveBeenCalledWith({ id: 'p1', paused: false });
  });

  it('asks before removing, names the promo, and removes only on the second press', async () => {
    const onRemove = answer({ status: 'ok', message: 'Promo removed.' });
    page([COMBO], true, { onRemove });
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    const ask = dialog();
    expect(ask.textContent).toContain('Remove “Chai and samosa”?');
    expect(ask.textContent).toContain('It leaves your TVs at their next slide');
    expect(onRemove).not.toHaveBeenCalled();

    fireEvent.click(within(ask).getByRole('button', { name: 'Keep it' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(onRemove).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    fireEvent.click(within(dialog()).getByRole('button', { name: /Remove promo/ }));
    expect(await screen.findByText('Promo removed.')).toBeTruthy();
    expect(onRemove).toHaveBeenCalledWith({ id: 'p1' });
  });
});

describe('staff on the Promos page (check 15)', () => {
  it('see each promo, what it is, its price and its state, and can’t add, edit, pause, resume or remove', () => {
    page([COMBO, { ...COMBO, id: 'p2', headline: 'Paused combo', paused: true }], false);
    expect(screen.getByText('Only an owner can change promos.')).toBeTruthy();
    expect(screen.getByText('Chai and samosa')).toBeTruthy();
    expect(screen.getAllByText(/Combo: Samosa and Masala chai/)).toHaveLength(2);
    expect(screen.getAllByText(/₹45, menu ₹50/)).toHaveLength(2);
    expect(screen.getByText('On air now')).toBeTruthy();
    expect(screen.getByText('Paused')).toBeTruthy();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });
});
