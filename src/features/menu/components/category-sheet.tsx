'use client';

import { Trash2 } from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';
import { Busy, field, hint, label, primary } from '@/components/owner/ui';
import type { MenuResult } from '@/app/studio/menu/menu-result';
import type { Daypart } from '../dayparts';
import { MENU_LIMITS, type MenuCategoryData, type MenuEdit } from '../schema';
import { closeSheet, Sheet } from './sheet';

/** Monday first, as owners read a week; values are 0 (Sunday) to 6. */
const DAYS = [
  { value: 1, short: 'Mon', name: 'Monday' },
  { value: 2, short: 'Tue', name: 'Tuesday' },
  { value: 3, short: 'Wed', name: 'Wednesday' },
  { value: 4, short: 'Thu', name: 'Thursday' },
  { value: 5, short: 'Fri', name: 'Friday' },
  { value: 6, short: 'Sat', name: 'Saturday' },
  { value: 0, short: 'Sun', name: 'Sunday' },
] as const;
/** A first daypart that fits most cafés: breakfast, every day. */
const BREAKFAST: Daypart = { from: 7 * 60, to: 11 * 60, days: [0, 1, 2, 3, 4, 5, 6] };

const toInput = (minutes: number): string => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
const fromInput = (value: string): number | null => {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
};

interface CategorySheetProps {
  /** The category being edited, or null to add one. */
  readonly category: MenuCategoryData | null;
  readonly onSave: (edit: MenuEdit) => Promise<MenuResult>;
  readonly onClose: () => void;
}

export function CategorySheet({ category, onSave, onClose }: CategorySheetProps) {
  const [name, setName] = useState(category?.name ?? '');
  const [nameHi, setNameHi] = useState(category?.nameHi ?? '');
  const [timed, setTimed] = useState(Boolean(category?.daypart));
  const [from, setFrom] = useState(toInput((category?.daypart ?? BREAKFAST).from));
  const [to, setTo] = useState(toInput((category?.daypart ?? BREAKFAST).to));
  const [days, setDays] = useState<readonly number[]>((category?.daypart ?? BREAKFAST).days);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const run = async (edit: MenuEdit): Promise<void> => {
    setSaving(true);
    const result = await onSave(edit);
    setSaving(false);
    if (!result.ok) return setError(result.message ?? 'Something went wrong. Try again.');
    closeSheet(formRef.current);
  };

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (!name.trim()) return setError('Give the category a name.');
    let daypart: Daypart | null = null;
    if (timed) {
      const start = fromInput(from);
      const end = fromInput(to);
      if (start === null || end === null) return setError('Enter both times, like 7 am and 11 am.');
      if (start === end) return setError('Pick an end time that isn’t the start time.');
      if (days.length === 0) return setError('Pick at least one day.');
      daypart = { from: start, to: end, days: [...days] };
    }
    void run(category ? { type: 'update-category', categoryId: category.id, name, nameHi, daypart } : { type: 'add-category', name, nameHi, daypart });
  };

  const remove = (): void => {
    if (!category) return;
    const count = category.items.length;
    const question = count > 0 ? `Delete ${category.name} and its ${count === 1 ? 'dish' : `${count} dishes`}? They come off every screen.` : `Delete ${category.name}?`;
    if (window.confirm(question)) void run({ type: 'remove-category', categoryId: category.id });
  };

  return (
    <Sheet title={category ? `Edit ${category.name}` : 'Add a category'} onClose={onClose}>
      <form ref={formRef} onSubmit={submit} noValidate className="space-y-5">
        <div>
          <label htmlFor="category-name" className={label}>
            Category name
          </label>
          <input id="category-name" value={name} onChange={(event) => setName(event.currentTarget.value)} maxLength={MENU_LIMITS.categoryName} data-autofocus placeholder="For example, Chai and coffee" className={field} />
          <p className={hint}>Short and plain, like guests would say it: Snacks, Rolls, Coolers.</p>
        </div>
        <div>
          <label htmlFor="category-hindi" className={label}>
            Hindi name <span className="font-normal text-night-dim">(optional)</span>
          </label>
          <input id="category-hindi" lang="hi" value={nameHi} onChange={(event) => setNameHi(event.currentTarget.value)} maxLength={MENU_LIMITS.categoryName} placeholder="नाश्ता" className={field} />
        </div>
        <fieldset>
          <legend className="sr-only">When it shows</legend>
          <label className="flex min-h-11 items-center gap-3 font-semibold">
            <input type="checkbox" checked={timed} onChange={(event) => setTimed(event.currentTarget.checked)} className="size-5 accent-night" />
            Show only at certain times
          </label>
          <p className={hint}>Like breakfast from 7 am to 11 am. Outside those times, these dishes come off your TVs by themselves.</p>
          {timed ? (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="category-from" className={label}>
                    From
                  </label>
                  <input id="category-from" type="time" step={900} value={from} onChange={(event) => setFrom(event.currentTarget.value)} className={field} />
                </div>
                <div>
                  <label htmlFor="category-to" className={label}>
                    Until
                  </label>
                  <input id="category-to" type="time" step={900} value={to} onChange={(event) => setTo(event.currentTarget.value)} className={field} />
                </div>
              </div>
              <div>
                <p className={label} id="category-days">
                  On
                </p>
                <div role="group" aria-labelledby="category-days" className="mt-1.5 flex flex-wrap gap-2">
                  {DAYS.map((day) => (
                    <label key={day.value} title={day.name} className="inline-flex h-11 min-w-12 cursor-pointer items-center justify-center rounded-control border border-night/30 px-3 text-sm font-semibold has-[:checked]:border-night has-[:checked]:bg-night has-[:checked]:text-mist has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-chilli">
                      <input
                        type="checkbox"
                        className="sr-only"
                        aria-label={day.name}
                        checked={days.includes(day.value)}
                        onChange={(event) => {
                          const on = event.currentTarget.checked;
                          setDays((current) => (on ? [...current, day.value] : current.filter((value) => value !== day.value)));
                        }}
                      />
                      {day.short}
                    </label>
                  ))}
                </div>
                <p className={hint}>A time that ends before it starts, like 10 pm until 2 am, runs past midnight.</p>
              </div>
            </div>
          ) : null}
        </fieldset>
        {error ? (
          <p role="alert" className="text-sm font-semibold text-masala">
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className={primary} disabled={saving}>
            <Busy pending={saving}>{category ? 'Save category' : 'Add category'}</Busy>
          </button>
          {category ? (
            <button type="button" onClick={remove} disabled={saving} className="ml-auto inline-flex h-11 items-center gap-2 px-2 text-sm font-semibold text-masala underline underline-offset-4">
              <Trash2 className="size-4" aria-hidden="true" />
              Delete category
            </button>
          ) : null}
        </div>
      </form>
    </Sheet>
  );
}
