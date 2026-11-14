'use client';

import { Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { MenuResult } from '@/app/studio/menu/menu-result';
import { card, field, heading, hint, kicker, label, primary, quiet } from '@/components/owner/ui';
import type { LocalClock } from '@/lib/local-date';
import { formatPaise } from '../money';
import type { Menu, MenuEdit, MenuItemData } from '../schema';
import { Thumb } from './item-row';
import { countDishes, dishGroups, searchGroups, SEARCH_FROM, specialStatus } from './quick-actions';
import { closeSheet, Sheet } from './sheet';

type SaveEdit = (edit: MenuEdit) => Promise<MenuResult>;
type Notice = { readonly kind: 'ok' | 'error'; readonly text: string } | null;

const price = (item: MenuItemData): string => `₹${formatPaise(item.prices[0].paise)}`;
/** As the menu editor's "Saved": long enough to read, gone before the special changes from somewhere else. */
const SAVED_SHOWN_MS = 5000;

/** Picks today's special from the dishes in stock and shown. Shared by Today and, later, Promos (MT-26). */
export function SpecialPicker({ menu, today, currentId, onPick, onClose }: {
  readonly menu: Menu;
  readonly today: string;
  readonly currentId: string | null;
  readonly onPick: (itemId: string) => Promise<boolean>;
  readonly onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [picking, setPicking] = useState<string | null>(null);
  const all = dishGroups(menu, today);
  const groups = searchGroups(all, query);
  const pick = async (itemId: string, button: HTMLElement): Promise<void> => {
    setPicking(itemId);
    const done = await onPick(itemId);
    setPicking(null);
    if (done) closeSheet(button);
  };
  return (
    <Sheet title="Pick today’s special" onClose={onClose}>
      {countDishes(all) >= SEARCH_FROM ? (
        <div className="mb-5">
          <label htmlFor="special-search" className={label}>
            Find a dish
          </label>
          <input id="special-search" type="search" value={query} onChange={(event) => setQuery(event.currentTarget.value)} className={field} autoComplete="off" data-autofocus />
        </div>
      ) : null}
      {all.length === 0 ? <p className="text-night-soft">Every dish is sold out or hidden.</p> : null}
      {all.length > 0 && groups.length === 0 ? <p className="text-night-soft">No dish matches “{query.trim()}”.</p> : null}
      <div className="space-y-5">
        {groups.map(({ category, items }) => (
          <section key={category.id}>
            <h3 className={kicker}>{category.name}</h3>
            <ul className="mt-2 space-y-2">
              {items.map((item) => {
                const current = item.id === currentId;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={(event) => void pick(item.id, event.currentTarget)}
                      disabled={picking !== null}
                      aria-current={current ? 'true' : undefined}
                      className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-control border px-3 py-2 text-left font-semibold transition-colors disabled:opacity-70 ${current ? 'border-night bg-mist' : 'border-hairline bg-white hover:border-night'}`}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        {current ? <Check className="size-4 shrink-0" aria-hidden="true" /> : null}
                        <span className="min-w-0">{item.name}</span>
                        {current ? <span className="sr-only">(today’s special)</span> : null}
                      </span>
                      <span className="shrink-0 tabular-nums">{picking === item.id ? 'Saving…' : price(item)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </Sheet>
  );
}

/** Today's special on Today: pick, change or remove it; says when it is sold out or outside its hours. */
export function TodaysSpecial({ menu, clock, onSave }: { readonly menu: Menu; readonly clock: LocalClock; readonly onSave: SaveEdit }) {
  const router = useRouter();
  const [picking, setPicking] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const status = specialStatus(menu, clock);

  useEffect(() => {
    if (notice?.kind !== 'ok') return;
    const timer = setTimeout(() => setNotice(null), SAVED_SHOWN_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  const save = async (itemId: string | null): Promise<boolean> => {
    const result = await onSave({ type: 'set-special', itemId });
    if (!result.ok) {
      setNotice({ kind: 'error', text: result.message ?? 'That didn’t save. Try again.' });
      return false;
    }
    const name = itemId ? menu.categories.flatMap((category) => category.items).find((item) => item.id === itemId)?.name : null;
    setNotice({ kind: 'ok', text: name ? `${name} is today’s special. Your TVs show it first within seconds.` : 'Today’s special is off your TVs.' });
    router.refresh();
    return true;
  };

  const remove = async (): Promise<void> => {
    setRemoving(true);
    await save(null);
    setRemoving(false);
  };

  return (
    <section aria-labelledby="special-title" className={`${card} flex flex-col`}>
      <h2 id="special-title" className={heading}>
        Today’s special.
      </h2>
      {status.kind === 'none' ? (
        <>
          <p className={hint}>It plays first on every TV until midnight.</p>
          <div className="mt-auto pt-5">
            <button type="button" className={primary} onClick={() => setPicking(true)}>
              Pick today’s special
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="mt-4 flex items-center gap-3">
            <Thumb item={status.item} />
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-x-2 font-semibold">
                <span className={status.soldOut ? 'line-through' : ''}>{status.item.name}</span>
                {status.soldOut ? <span className="rounded-control bg-masala-soft px-2 py-0.5 text-sm text-masala">Sold out</span> : null}
              </p>
              <p className="text-sm text-night-soft">
                {status.category.name}, <span className="tabular-nums">{price(status.item)}</span>
              </p>
            </div>
          </div>
          {status.soldOut ? <p className={hint}>It’s off your TVs until it’s back in stock.</p> : null}
          {status.offNow ? <p className={hint}>Not on your TVs now: {status.offNow}.</p> : null}
          <div className="mt-auto flex flex-wrap items-center gap-3 pt-5">
            <button type="button" className={status.soldOut ? primary : quiet} onClick={() => setPicking(true)} disabled={removing}>
              {status.soldOut ? 'Pick another' : 'Change'}
            </button>
            <button type="button" onClick={() => void remove()} disabled={removing} className="inline-flex h-11 items-center px-2 text-sm font-semibold text-masala underline underline-offset-4">
              {removing ? 'Removing…' : 'Remove'}
            </button>
          </div>
        </>
      )}
      {notice ? (
        <p role={notice.kind === 'error' ? 'alert' : 'status'} className={`mt-3 text-sm font-semibold ${notice.kind === 'error' ? 'text-masala' : 'text-chutney-deep'}`}>
          {notice.text}
        </p>
      ) : null}
      {picking ? <SpecialPicker menu={menu} today={clock.today} currentId={status.kind === 'set' ? status.item.id : null} onPick={save} onClose={() => setPicking(false)} /> : null}
    </section>
  );
}
