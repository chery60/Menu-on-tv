'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { MenuResult } from '@/app/studio/menu/menu-result';
import { card, field, heading, hint, kicker, label, quiet } from '@/components/owner/ui';
import { findItem } from '../edit';
import { formatPaise, parseRupees } from '../money';
import type { Menu, MenuEdit, MenuItemData } from '../schema';
import { countDishes, dishGroups, notAPriceMessage, priceSavedMessage, searchGroups, SEARCH_FROM, withPrice } from './quick-actions';
import { Sheet } from './sheet';

type SaveEdit = (edit: MenuEdit) => Promise<MenuResult>;
type Notice = { readonly kind: 'ok' | 'error' | 'saving'; readonly text: string };

interface SizePriceProps {
  readonly item: MenuItemData;
  readonly index: number;
  /** Saves the new price; resolves to whether it saved. */
  readonly onSave: (index: number, paise: number) => Promise<boolean>;
  readonly onInvalid: (typed: string) => void;
}

/** One size's price, saved on Enter or when the field loses focus, like the menu editor's price box. */
function SizePrice({ item, index, onSave, onInvalid }: SizePriceProps) {
  const saved = formatPaise(item.prices[index].paise);
  const [text, setText] = useState(saved);
  const size = item.prices[index].label;
  const commit = async (): Promise<void> => {
    const typed = text.trim();
    if (typed === saved) return;
    const paise = parseRupees(typed);
    if (paise === null) {
      setText(saved);
      onInvalid(typed);
      return;
    }
    setText((await onSave(index, paise)) ? formatPaise(paise) : saved);
  };
  return (
    <label className="flex items-center gap-2">
      {size ? <span className="text-sm font-semibold text-night-soft">{size}</span> : null}
      <span className="flex h-11 items-center rounded-control border border-night/30 bg-page pl-2 focus-within:border-night focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-chilli">
        <span aria-hidden="true" className="font-semibold text-night-dim">
          ₹
        </span>
        <span className="sr-only">
          Price of {item.name}
          {size ? `, ${size},` : ''} in rupees
        </span>
        <input
          value={text}
          onChange={(event) => setText(event.currentTarget.value)}
          onBlur={() => void commit()}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur();
            if (event.key === 'Escape') setText(saved);
          }}
          inputMode="decimal"
          enterKeyHint="done"
          maxLength={9}
          className="h-full w-20 bg-transparent px-1 text-right font-semibold tabular-nums focus-visible:outline-none!"
        />
      </span>
    </label>
  );
}

/** "Change a price" on Today: every shown dish with a field per size, searchable when the menu is long. */
export function PricesCard({ menu, onSave }: { readonly menu: Menu; readonly onSave: SaveEdit }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [latest, setLatest] = useState(menu);
  const [notices, setNotices] = useState<Readonly<Record<string, Notice>>>({});
  const [changed, setChanged] = useState(false);
  const all = dishGroups(latest);
  const groups = searchGroups(all, query);

  const note = (itemId: string, notice: Notice): void => setNotices((current) => ({ ...current, [itemId]: notice }));

  /** Saves one size against the latest menu, so the dish's other sizes go back as they are. */
  const savePrice = (itemId: string) => async (index: number, paise: number): Promise<boolean> => {
    const found = findItem(latest, itemId);
    if (!found) return false;
    const { item } = found;
    note(itemId, { kind: 'saving', text: 'Saving…' });
    const result = await onSave({ type: 'set-prices', itemId, prices: withPrice(item.prices, index, paise) });
    if (result.menu) setLatest(result.menu);
    if (!result.ok) {
      note(itemId, { kind: 'error', text: result.message ?? 'That didn’t save. Try again.' });
      return false;
    }
    setChanged(true);
    note(itemId, { kind: 'ok', text: priceSavedMessage(item.name, item.prices[index].label, paise) });
    return true;
  };

  const close = (): void => {
    setOpen(false);
    setQuery('');
    setNotices({});
    if (changed) router.refresh();
    setChanged(false);
  };

  return (
    <section aria-labelledby="prices-title" className={`${card} flex flex-col`}>
      <h2 id="prices-title" className={heading}>
        Prices.
      </h2>
      <p className={hint}>Type a new price and every TV shows it within seconds.</p>
      <div className="mt-auto pt-5">
        <button
          type="button"
          className={quiet}
          onClick={() => {
            setLatest(menu);
            setOpen(true);
          }}
        >
          Change a price
        </button>
      </div>
      {open ? (
        <Sheet title="Change a price" onClose={close}>
          {countDishes(all) >= SEARCH_FROM ? (
            <div className="mb-5">
              <label htmlFor="price-search" className={label}>
                Find a dish
              </label>
              <input id="price-search" type="search" value={query} onChange={(event) => setQuery(event.currentTarget.value)} className={field} autoComplete="off" data-autofocus />
            </div>
          ) : null}
          {all.length === 0 ? <p className="text-night-soft">No dishes on your TVs yet. Add them in Menu.</p> : null}
          {all.length > 0 && groups.length === 0 ? <p className="text-night-soft">No dish matches “{query.trim()}”.</p> : null}
          <div className="space-y-5">
            {groups.map(({ category, items }) => (
              <section key={category.id}>
                <h3 className={kicker}>{category.name}</h3>
                <ul className="mt-2 divide-y divide-hairline border-y border-hairline">
                  {items.map((item) => {
                    const notice = notices[item.id];
                    return (
                      <li key={item.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
                        <p className={`min-w-0 font-semibold ${item.prices.length > 1 ? 'basis-full' : 'flex-1'}`}>{item.name}</p>
                        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                          {item.prices.map((price, index) => (
                            <SizePrice
                              key={`${price.label}-${index}`}
                              item={item}
                              index={index}
                              onSave={savePrice(item.id)}
                              onInvalid={(typed) => note(item.id, { kind: 'error', text: notAPriceMessage(typed) })}
                            />
                          ))}
                        </div>
                        <p
                          role={notice?.kind === 'error' ? 'alert' : 'status'}
                          className={`text-sm font-semibold ${notice ? 'basis-full' : 'sr-only'} ${notice?.kind === 'error' ? 'text-masala' : notice?.kind === 'ok' ? 'text-chutney-deep' : 'text-night-soft'}`}
                        >
                          {notice?.text ?? ''}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </Sheet>
      ) : null}
    </section>
  );
}
