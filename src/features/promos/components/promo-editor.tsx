'use client';

import { useState } from 'react';
import type { ActionState } from '@/app/studio/action-state';
import { Busy, field, hint, kicker, label, primary } from '@/components/owner/ui';
import { dishGroups } from '@/features/menu/components/quick-actions';
import { closeSheet, Sheet, sheetFooter } from '@/features/menu/components/sheet';
import { findItem } from '@/features/menu/edit';
import { formatPaise } from '@/features/menu/money';
import type { Menu } from '@/features/menu/schema';
import { FESTIVALS, PROMO_LIMITS, type Festival } from '../schema';
import { menuTotal, suggestedHeadline, templateName, toInput, type PromoDraft } from './promo-form';

type SaveAction = (input: unknown) => Promise<ActionState>;

const DAY_CHIPS = [
  { day: 1, name: 'Mon' },
  { day: 2, name: 'Tue' },
  { day: 3, name: 'Wed' },
  { day: 4, name: 'Thu' },
  { day: 5, name: 'Fri' },
  { day: 6, name: 'Sat' },
  { day: 0, name: 'Sun' },
];
const chip = 'inline-flex h-11 min-w-11 cursor-pointer items-center justify-center rounded-control border border-night/30 px-3 text-sm font-semibold has-[:checked]:border-night has-[:checked]:bg-night has-[:checked]:text-white has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-chilli';
const check = 'flex min-h-11 cursor-pointer items-center gap-3 font-semibold';

/** How many dishes a template takes, and whether the owner ticks several or picks one. */
const PICKS = { combo: { max: PROMO_LIMITS.comboDishes.max, many: true }, 'happy-hour': { max: 1, many: false }, new: { max: 1, many: false }, festival: { max: PROMO_LIMITS.festivalDishes, many: true }, scan: { max: 0, many: false } } as const;
const DISH_LABEL = { combo: 'Dishes, 2 to 4', 'happy-hour': 'The dish', new: 'The new dish', festival: 'Dishes, up to 2 (or none)', scan: '' } as const;

/** Makes or edits one promo. Dishes and prices come from the menu; the headline writes itself until the owner changes it. */
export function PromoEditor({ menu, initial, promoId, onSave, onClose, onSaved }: {
  readonly menu: Menu;
  readonly initial: PromoDraft;
  readonly promoId?: string;
  readonly onSave: SaveAction;
  readonly onClose: () => void;
  readonly onSaved: (message: string) => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [ownHeadline, setOwnHeadline] = useState(Boolean(promoId));
  const [ownPrice, setOwnPrice] = useState(Boolean(promoId));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { template } = draft;
  const picks = PICKS[template];
  const deal = template === 'combo' || template === 'happy-hour';
  const total = menuTotal(draft, menu);

  /** Changing the dishes refills what the owner hasn't typed: the headline, the line and the deal price. */
  const withDishes = (dishes: PromoDraft['dishes'], festival = draft.festival): PromoDraft => {
    const items = dishes.map(({ itemId }) => findItem(menu, itemId)?.item).filter((item) => item !== undefined);
    const next = { ...draft, dishes, festival };
    return {
      ...next,
      headline: ownHeadline ? draft.headline : suggestedHeadline(template, items.map((item) => item.name), festival),
      line: ownHeadline ? draft.line : (items[0]?.description ?? '').slice(0, PROMO_LIMITS.line),
      dealText: ownPrice || !deal ? draft.dealText : dishes.length > 0 ? formatPaise(menuTotal(next, menu)) : '',
    };
  };

  const toggleDish = (itemId: string, size: string): void => {
    const chosen = draft.dishes.some((dish) => dish.itemId === itemId);
    if (!picks.many) return setDraft(withDishes([{ itemId, size }]));
    if (chosen) return setDraft(withDishes(draft.dishes.filter((dish) => dish.itemId !== itemId)));
    if (draft.dishes.length < picks.max) setDraft(withDishes([...draft.dishes, { itemId, size }]));
  };

  const save = async (form: HTMLFormElement): Promise<void> => {
    const input = toInput(draft);
    if (Number.isNaN(input.dealPaise)) return setError('Type the price in rupees, like 45.');
    setSaving(true);
    setError(null);
    const result = await onSave(promoId ? { ...input, id: promoId } : input);
    setSaving(false);
    if (result.status !== 'ok') return setError(result.message ?? 'That didn’t save. Try again.');
    onSaved(result.message ?? 'Promo saved.');
    closeSheet(form);
  };

  return (
    <Sheet title={promoId ? 'Edit promo' : `New ${templateName(template).toLowerCase()}`} onClose={onClose}>
      <form
        noValidate
        className="space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          void save(event.currentTarget);
        }}
      >
        {template === 'festival' ? (
          <div>
            <label htmlFor="promo-festival" className={label}>
              Festival
            </label>
            <select id="promo-festival" className={field} value={draft.festival ?? ''} onChange={(event) => setDraft(withDishes(draft.dishes, (event.currentTarget.value || null) as Festival | null))}>
              <option value="">Pick a festival</option>
              {Object.entries(FESTIVALS).map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {template === 'scan' ? (
          <div>
            <label htmlFor="promo-link" className={label}>
              The link the QR opens
            </label>
            <input id="promo-link" type="url" inputMode="url" autoComplete="off" placeholder="https://" maxLength={PROMO_LIMITS.link} className={field} value={draft.link} onChange={(event) => setDraft({ ...draft, link: event.currentTarget.value })} />
            <p className={hint}>Your ordering page or Instagram. Guests open exactly this link.</p>
          </div>
        ) : (
          <fieldset>
            <legend className={label}>{DISH_LABEL[template]}</legend>
            <div className="mt-2 max-h-[40dvh] space-y-4 overflow-y-auto pr-1">
              {dishGroups(menu).map(({ category, items }) => (
                <div key={category.id}>
                  <p className={kicker}>{category.name}</p>
                  <ul className="mt-1 divide-y divide-hairline">
                    {items.map((item) => {
                      const chosen = draft.dishes.find((dish) => dish.itemId === item.id);
                      const size = chosen?.size ?? item.prices[0].label;
                      return (
                        <li key={item.id} className="flex flex-wrap items-center justify-between gap-x-3">
                          <label className={`${check} min-w-0 flex-1`}>
                            <input type={picks.many ? 'checkbox' : 'radio'} name="promo-dish" checked={Boolean(chosen)} onChange={() => toggleDish(item.id, size)} className="size-5 shrink-0 accent-night" />
                            <span className="min-w-0">{item.name}</span>
                          </label>
                          {item.prices.length > 1 && chosen ? (
                            <select aria-label={`Size of ${item.name}`} className="h-11 rounded-control border border-night/30 bg-page px-2 text-sm" value={size} onChange={(event) => setDraft(withDishes(draft.dishes.map((dish) => (dish.itemId === item.id ? { ...dish, size: event.currentTarget.value } : dish))))}>
                              {item.prices.map((price) => (
                                <option key={price.label} value={price.label}>
                                  {price.label} ₹{formatPaise(price.paise)}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="tabular-nums text-night-soft">₹{formatPaise(item.prices[0].paise)}</span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </fieldset>
        )}

        {deal ? (
          <div>
            <label htmlFor="promo-price" className={label}>
              {template === 'combo' ? 'Combo price' : 'Happy-hour price'} in rupees
            </label>
            <input
              id="promo-price"
              inputMode="decimal"
              className={`${field} max-w-[10rem] tabular-nums`}
              value={draft.dealText}
              onChange={(event) => {
                setOwnPrice(true);
                setDraft({ ...draft, dealText: event.currentTarget.value });
              }}
            />
            <p className={hint}>{total > 0 ? `${template === 'combo' ? 'Menu total' : 'Menu price'} ₹${formatPaise(total)}. Keep it lower.` : `Pick the ${template === 'combo' ? 'dishes' : 'dish'} first.`}</p>
          </div>
        ) : null}

        <div>
          <label htmlFor="promo-headline" className={label}>
            Headline
          </label>
          <input
            id="promo-headline"
            maxLength={PROMO_LIMITS.headline}
            className={field}
            value={draft.headline}
            onChange={(event) => {
              setOwnHeadline(true);
              setDraft({ ...draft, headline: event.currentTarget.value });
            }}
          />
          <p className={hint}>
            {draft.headline.length} of {PROMO_LIMITS.headline}
          </p>
        </div>
        <div>
          <label htmlFor="promo-line" className={label}>
            A line under it <span className="text-night-dim">(optional)</span>
          </label>
          <input id="promo-line" maxLength={PROMO_LIMITS.line} className={field} value={draft.line} onChange={(event) => setDraft({ ...draft, line: event.currentTarget.value })} />
          <p className={hint}>
            {draft.line.length} of {PROMO_LIMITS.line}
          </p>
        </div>

        <fieldset className="space-y-2">
          <legend className={label}>When</legend>
          <label className={check}>
            <input type="checkbox" checked={draft.startsAt !== ''} onChange={(event) => setDraft({ ...draft, startsAt: event.currentTarget.checked ? defaultStart() : '' })} className="size-5 accent-night" />
            Starts later
          </label>
          {draft.startsAt !== '' ? <input type="datetime-local" aria-label="Starts at" className={field} value={draft.startsAt} onChange={(event) => setDraft({ ...draft, startsAt: event.currentTarget.value })} /> : null}
          <label className={check}>
            <input type="checkbox" checked={draft.endsAt !== ''} onChange={(event) => setDraft({ ...draft, endsAt: event.currentTarget.checked ? defaultEnd() : '', countdown: event.currentTarget.checked && draft.countdown })} className="size-5 accent-night" />
            Ends at a set time
          </label>
          {draft.endsAt !== '' ? <input type="datetime-local" aria-label="Ends at" className={field} value={draft.endsAt} onChange={(event) => setDraft({ ...draft, endsAt: event.currentTarget.value })} /> : null}
          {template === 'happy-hour' ? (
            <p className="flex min-h-11 items-center font-semibold">Plays only at these times</p>
          ) : (
            <label className={check}>
              <input type="checkbox" checked={draft.timed} onChange={(event) => setDraft({ ...draft, timed: event.currentTarget.checked })} className="size-5 accent-night" />
              Only at certain times
            </label>
          )}
          {draft.timed ? (
            <div className="space-y-3 pl-8">
              <div className="flex flex-wrap gap-3">
                <label className="text-sm font-semibold">
                  From
                  <input type="time" className={`${field} w-36`} value={draft.from} onChange={(event) => setDraft({ ...draft, from: event.currentTarget.value })} />
                </label>
                <label className="text-sm font-semibold">
                  Until
                  <input type="time" className={`${field} w-36`} value={draft.to} onChange={(event) => setDraft({ ...draft, to: event.currentTarget.value })} />
                </label>
              </div>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Days">
                {DAY_CHIPS.map(({ day, name }) => (
                  <label key={day} className={chip}>
                    <input type="checkbox" className="sr-only" checked={draft.days.includes(day)} onChange={(event) => setDraft({ ...draft, days: event.currentTarget.checked ? [...draft.days, day] : draft.days.filter((entry) => entry !== day) })} />
                    {name}
                  </label>
                ))}
              </div>
            </div>
          ) : null}
          {draft.endsAt !== '' ? (
            <label className={check}>
              <input type="checkbox" checked={draft.countdown} onChange={(event) => setDraft({ ...draft, countdown: event.currentTarget.checked })} className="size-5 accent-night" />
              Show the time left near the end
            </label>
          ) : null}
        </fieldset>

        <div className={sheetFooter}>
          {error ? (
            <p role="alert" className="mb-2 text-sm font-semibold text-masala">
              {error}
            </p>
          ) : null}
          <button type="submit" className={primary} disabled={saving}>
            <Busy pending={saving}>Save promo</Busy>
          </button>
        </div>
      </form>
    </Sheet>
  );
}

// shortcut: the first picks use the phone's clock, which is the outlet's for owners in India; pass the outlet clock in when outlets span time zones.
function localStamp(date: Date): string {
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
/** A first pick for "Starts later": the next whole hour. */
function defaultStart(): string {
  const next = new Date();
  next.setHours(next.getHours() + 1, 0, 0, 0);
  return localStamp(next);
}
/** A first pick for "Ends at a set time": 6 pm today, or 11 pm once it's past 6. */
function defaultEnd(): string {
  const end = new Date();
  end.setHours(end.getHours() < 18 ? 18 : 23, 0, 0, 0);
  return localStamp(end);
}
