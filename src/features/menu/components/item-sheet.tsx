'use client';

import { Camera, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Busy, field, fieldBox, hint, label, primary, quiet } from '@/components/owner/ui';
import { BADGE_IDS, type Badge } from '@/features/screen/types';
import { BADGE_LABELS } from '../labels';
import type { MenuResult } from '@/app/studio/menu/menu-result';
import { formatPaise, parseRupees } from '../money';
import { ALLERGEN_LABELS, ALLERGENS, itemInputSchema, MENU_LIMITS, type Allergen, type ItemInput, type MenuEdit, type MenuItemData } from '../schema';
import { Thumb } from './item-row';
import { shrinkPhoto } from './resize-photo';
import { closeSheet, Sheet } from './sheet';

const chip = 'inline-flex h-10 cursor-pointer items-center rounded-control border border-night/30 px-3 text-sm font-semibold has-[:checked]:border-night has-[:checked]:bg-night has-[:checked]:text-white has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-night';

export type ItemSheetMode = { readonly kind: 'add'; readonly categoryId: string } | { readonly kind: 'edit'; readonly item: MenuItemData; readonly categoryId: string };

interface ItemSheetProps {
  readonly mode: ItemSheetMode;
  readonly categories: readonly { readonly id: string; readonly name: string }[];
  readonly onSave: (edit: MenuEdit) => Promise<MenuResult>;
  readonly onUploadPhoto: (itemId: string, photo: Blob) => Promise<MenuResult>;
  readonly onRemovePhoto: (itemId: string) => Promise<MenuResult>;
  readonly onClose: () => void;
}

interface SizeDraft {
  readonly label: string;
  readonly text: string;
}

interface Draft {
  readonly name: string;
  readonly nameHi: string;
  readonly description: string;
  readonly diet: ItemInput['diet'];
  readonly sized: boolean;
  readonly sizes: readonly SizeDraft[];
  readonly categoryId: string;
  readonly badges: readonly Badge[];
  readonly kcal: string;
  readonly serving: string;
  readonly allergens: readonly Allergen[];
  readonly hidden: boolean;
}

function draftFrom(mode: ItemSheetMode): Draft {
  if (mode.kind === 'add') {
    return { name: '', nameHi: '', description: '', diet: 'veg', sized: false, sizes: [{ label: '', text: '' }], categoryId: mode.categoryId, badges: [], kcal: '', serving: '', allergens: [], hidden: false };
  }
  const { item } = mode;
  return {
    name: item.name,
    nameHi: item.nameHi,
    description: item.description,
    diet: item.diet,
    sized: item.prices.length > 1,
    sizes: item.prices.map((price) => ({ label: price.label, text: formatPaise(price.paise) })),
    categoryId: mode.categoryId,
    badges: item.badges,
    kcal: item.kcal === null ? '' : String(item.kcal),
    serving: item.serving,
    allergens: item.allergens,
    hidden: item.hidden,
  };
}

/** The form as a validated item, or the first thing to fix, in plain words. */
function toInput(draft: Draft): { readonly input: ItemInput } | { readonly error: string } {
  const sizes = draft.sized ? draft.sizes : draft.sizes.slice(0, 1);
  const prices = sizes.map((size) => ({ label: draft.sized ? size.label.trim() : '', paise: parseRupees(size.text) }));
  if (prices.some((price) => price.paise === null)) return { error: draft.sized ? 'Enter a price in rupees for each size, like 80 or 49.50.' : 'Enter the price in rupees, like 80 or 49.50.' };
  const kcal = draft.kcal.trim() === '' ? null : Number(draft.kcal);
  if (kcal !== null && !Number.isInteger(kcal)) return { error: 'Enter calories as a whole number, or leave them empty.' };
  const parsed = itemInputSchema.safeParse({ ...draft, prices, kcal, badges: [...draft.badges], allergens: [...draft.allergens] });
  return parsed.success ? { input: parsed.data } : { error: parsed.error.issues[0]?.message ?? 'Check the form.' };
}

const toggle = <T,>(list: readonly T[], value: T): T[] => (list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value]);

function PriceInputs({ draft, change }: { readonly draft: Draft; readonly change: (next: Partial<Draft>) => void }) {
  const setSize = (index: number, next: Partial<SizeDraft>) => change({ sizes: draft.sizes.map((size, at) => (at === index ? { ...size, ...next } : size)) });
  if (!draft.sized) {
    return (
      <div>
        <label htmlFor="item-price" className={label}>
          Price in rupees, taxes included
        </label>
        <input id="item-price" value={draft.sizes[0]?.text ?? ''} onChange={(event) => setSize(0, { text: event.currentTarget.value })} inputMode="decimal" maxLength={9} className={`${field} max-w-[10rem]`} />
        <button type="button" className="mt-2 text-sm font-semibold underline underline-offset-4" onClick={() => change({ sized: true, sizes: [{ label: 'Half', text: draft.sizes[0]?.text ?? '' }, { label: 'Full', text: '' }] })}>
          It comes in sizes, like half and full
        </button>
      </div>
    );
  }
  return (
    <fieldset>
      <legend className={label}>Sizes and prices in rupees</legend>
      <div className="mt-2 space-y-2">
        {draft.sizes.map((size, index) => (
          <div key={index} className="flex items-center gap-2">
            <input aria-label={`Size ${index + 1} name`} value={size.label} onChange={(event) => setSize(index, { label: event.currentTarget.value })} maxLength={MENU_LIMITS.sizeLabel} placeholder={index === 0 ? 'Half' : 'Full'} className={`${fieldBox} min-w-0 flex-1`} />
            <input aria-label={`Size ${index + 1} price`} value={size.text} onChange={(event) => setSize(index, { text: event.currentTarget.value })} inputMode="decimal" maxLength={9} placeholder="₹" className={`${fieldBox} w-28 shrink-0`} />
            {draft.sizes.length > 2 ? (
              <button type="button" onClick={() => change({ sizes: draft.sizes.filter((_, at) => at !== index) })} className="grid size-11 shrink-0 place-items-center rounded-control hover:bg-mist" aria-label={`Remove size ${size.label || index + 1}`}>
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            ) : null}
          </div>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm font-semibold">
        {draft.sizes.length < MENU_LIMITS.sizes ? (
          <button type="button" className="underline underline-offset-4" onClick={() => change({ sizes: [...draft.sizes, { label: '', text: '' }] })}>
            Add a size
          </button>
        ) : null}
        <button type="button" className="underline underline-offset-4" onClick={() => change({ sized: false, sizes: draft.sizes.slice(0, 1) })}>
          Use one price
        </button>
      </div>
    </fieldset>
  );
}

function PhotoPicker({ item, pending, onPick, onRemove, busy }: { readonly item: MenuItemData | null; readonly pending: Blob | null; readonly onPick: (file: File) => void; readonly onRemove: () => void; readonly busy: boolean }) {
  const preview = useMemo(() => (pending ? URL.createObjectURL(pending) : null), [pending]);
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);
  return (
    <div className="flex items-center gap-4">
      {/* eslint-disable-next-line @next/next/no-img-element -- a local preview of the photo about to be uploaded */}
      {preview ? <img src={preview} alt="" className="size-20 rounded-xl object-cover" /> : item ? <Thumb item={item} size="size-20" /> : <span className="grid size-20 place-items-center rounded-xl bg-mist text-night-dim">No photo</span>}
      <div className="flex flex-col items-start gap-2">
        <label className={`${quiet} cursor-pointer has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-night`}>
          <Busy pending={busy}>
            <Camera className="size-4" aria-hidden="true" />
            {item?.photo || pending ? 'Change photo' : 'Take or choose a photo'}
          </Busy>
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={busy}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = '';
              if (file) onPick(file);
            }}
          />
        </label>
        {item?.photo ? (
          <button type="button" onClick={onRemove} disabled={busy} className="text-sm font-semibold text-masala underline underline-offset-4">
            Remove photo
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function ItemSheet({ mode, categories, onSave, onUploadPhoto, onRemovePhoto, onClose }: ItemSheetProps) {
  const [draft, setDraft] = useState<Draft>(() => draftFrom(mode));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [pendingPhoto, setPendingPhoto] = useState<Blob | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const item = mode.kind === 'edit' ? mode.item : null;
  const change = (next: Partial<Draft>) => setDraft((current) => ({ ...current, ...next }));

  const pickPhoto = async (file: File): Promise<void> => {
    setError(null);
    setPhotoBusy(true);
    try {
      const photo = await shrinkPhoto(file);
      if (!item) return setPendingPhoto(photo);
      const result = await onUploadPhoto(item.id, photo);
      if (!result.ok) setError(result.message ?? 'The photo didn’t upload. Try again.');
    } catch {
      setError('That photo couldn’t be opened. Try another one.');
    } finally {
      setPhotoBusy(false);
    }
  };

  const removePhoto = async (): Promise<void> => {
    if (!item) return;
    setPhotoBusy(true);
    const result = await onRemovePhoto(item.id);
    setPhotoBusy(false);
    if (!result.ok) setError(result.message ?? 'Something went wrong. Try again.');
  };

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const checked = toInput(draft);
    if ('error' in checked) return setError(checked.error);
    setError(null);
    setSaving(true);
    const result = item
      ? await onSave({ type: 'update-item', itemId: item.id, categoryId: draft.categoryId, item: checked.input })
      : await onSave({ type: 'add-item', categoryId: draft.categoryId, item: checked.input });
    if (result.ok && item && draft.hidden !== item.hidden) await onSave({ type: 'set-hidden', itemId: item.id, hidden: draft.hidden });
    if (result.ok && !item && pendingPhoto && result.createdId) {
      const uploaded = await onUploadPhoto(result.createdId, pendingPhoto);
      if (!uploaded.ok) {
        setSaving(false);
        return setError(`The dish was added, but its photo didn’t upload: ${uploaded.message ?? 'try again from the dish.'}`);
      }
    }
    setSaving(false);
    if (!result.ok) return setError(result.message ?? 'Something went wrong. Try again.');
    closeSheet(formRef.current);
  };

  const remove = async (): Promise<void> => {
    if (!item || !window.confirm(`Delete ${item.name}? It comes off every screen.`)) return;
    setSaving(true);
    const result = await onSave({ type: 'remove-item', itemId: item.id });
    setSaving(false);
    if (!result.ok) return setError(result.message ?? 'Something went wrong. Try again.');
    closeSheet(formRef.current);
  };

  return (
    <Sheet title={item ? `Edit ${item.name}` : 'Add a dish'} onClose={onClose}>
      <form ref={formRef} onSubmit={submit} noValidate className="space-y-5">
        <div>
          <label htmlFor="item-name" className={label}>
            Dish name
          </label>
          <input id="item-name" value={draft.name} onChange={(event) => change({ name: event.currentTarget.value })} maxLength={MENU_LIMITS.name} required data-autofocus={item ? undefined : true} placeholder="For example, Paneer tikka roll" className={field} />
        </div>

        <fieldset>
          <legend className={label}>Veg or non-veg</legend>
          <div className="mt-2 flex gap-2">
            {(['veg', 'nonveg'] as const).map((diet) => (
              <label key={diet} className={chip}>
                <input type="radio" name="diet" value={diet} checked={draft.diet === diet} onChange={() => change({ diet })} className="sr-only" />
                {diet === 'veg' ? 'Veg' : 'Non-veg (includes egg)'}
              </label>
            ))}
          </div>
        </fieldset>

        <PriceInputs draft={draft} change={change} />

        <div>
          <span className={label}>Photo</span>
          <div className="mt-2">
            <PhotoPicker item={item} pending={pendingPhoto} busy={photoBusy} onPick={(file) => void pickPhoto(file)} onRemove={() => void removePhoto()} />
          </div>
          <p className={hint}>A clear photo from above, in good light. Photos show on Spotlight and promo slides.</p>
        </div>

        <div>
          <label htmlFor="item-category" className={label}>
            Category
          </label>
          <select id="item-category" value={draft.categoryId} onChange={(event) => change({ categoryId: event.currentTarget.value })} className={field}>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <fieldset>
          <legend className={label}>Labels on the screen</legend>
          <p className={hint}>Bestsellers, new dishes and chef’s picks also get their own promo slide.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {BADGE_IDS.map((badge) => (
              <label key={badge} className={chip}>
                <input type="checkbox" checked={draft.badges.includes(badge)} onChange={() => change({ badges: toggle(draft.badges, badge) })} className="sr-only" />
                {BADGE_LABELS[badge]}
              </label>
            ))}
          </div>
        </fieldset>

        <details className="rounded-card border border-hairline px-4 py-1">
          <summary className="flex h-11 cursor-pointer items-center font-semibold">Hindi name, description, calories and allergens</summary>
          <div className="space-y-5 pt-2 pb-4">
            <div>
              <label htmlFor="item-hindi" className={label}>
                Hindi name
              </label>
              <input id="item-hindi" lang="hi" value={draft.nameHi} onChange={(event) => change({ nameHi: event.currentTarget.value })} maxLength={MENU_LIMITS.name} placeholder="पनीर टिक्का रोल" className={field} />
              <p className={hint}>Shown when a screen is set to show Hindi.</p>
            </div>
            <div>
              <label htmlFor="item-description" className={label}>
                Short description
              </label>
              <textarea id="item-description" value={draft.description} onChange={(event) => change({ description: event.currentTarget.value })} maxLength={MENU_LIMITS.description} rows={2} placeholder="For example, smoky paneer, mint chutney, onions" className={`${field} h-auto py-2`} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="item-kcal" className={label}>
                  Calories (kcal)
                </label>
                <input id="item-kcal" value={draft.kcal} onChange={(event) => change({ kcal: event.currentTarget.value.replace(/\D/g, '') })} inputMode="numeric" maxLength={4} className={field} />
              </div>
              <div>
                <label htmlFor="item-serving" className={label}>
                  Per serving of
                </label>
                <input id="item-serving" value={draft.serving} onChange={(event) => change({ serving: event.currentTarget.value })} maxLength={MENU_LIMITS.serving} placeholder="For example, 250 ml" className={field} />
              </div>
            </div>
            <fieldset>
              <legend className={label}>Contains</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {ALLERGENS.map((allergen) => (
                  <label key={allergen} className={chip}>
                    <input type="checkbox" checked={draft.allergens.includes(allergen)} onChange={() => change({ allergens: toggle(draft.allergens, allergen) })} className="sr-only" />
                    {ALLERGEN_LABELS[allergen]}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        </details>

        {item ? (
          <label className="flex min-h-11 items-center gap-3 font-semibold">
            <input type="checkbox" checked={!draft.hidden} onChange={(event) => change({ hidden: !event.currentTarget.checked })} className="size-5 accent-night" />
            Show on screens
          </label>
        ) : null}

        {error ? (
          <p role="alert" className="text-sm font-semibold text-masala">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className={primary} disabled={saving || photoBusy}>
            <Busy pending={saving}>
              {item ? null : <Plus className="size-4" aria-hidden="true" />}
              {item ? 'Save dish' : 'Add dish'}
            </Busy>
          </button>
          {item ? (
            <button type="button" onClick={() => void remove()} disabled={saving} className="ml-auto inline-flex h-11 items-center gap-2 px-2 text-sm font-semibold text-masala underline underline-offset-4">
              <Trash2 className="size-4" aria-hidden="true" />
              Delete dish
            </button>
          ) : null}
        </div>
      </form>
    </Sheet>
  );
}
