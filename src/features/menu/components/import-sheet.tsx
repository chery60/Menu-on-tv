'use client';

import { Camera, FileUp, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { readMenuPhotoAction, type PhotoReadResult } from '@/app/studio/menu/actions';
import type { MenuResult } from '@/app/studio/menu/menu-result';
import { Busy, fieldBox, hint, label, primary, quiet } from '@/components/owner/ui';
import { parseMenuText, toItemInput, type ImportedField, type ImportedItem } from '../import';
import { formatPaise, parseRupees } from '../money';
import { MENU_PHOTO_LIMITS } from '../photo-import';
import { MENU_LIMITS, type ItemInput, type Menu, type MenuImport, type MenuItemData } from '../schema';
import { MenuFileError, readMenuFile } from '../spreadsheet';
import { DietMark } from './item-row';
import { shrinkMenuPhoto } from './resize-photo';
import { closeSheet, Sheet } from './sheet';

/** More than this is a whole billing catalogue; the preview would be too long to check on a phone. */
const MAX_DISHES = 300;
/** Where dishes go when the paste had no headings. The owner can rename it. */
const UNSORTED = 'Dishes';
const EXAMPLE = 'For example:\n\nSnacks\nSamosa 20\nVada pav ₹25\n\nMain course\nChicken biryani half 180 full 320';
const UNREADABLE_FILE = 'We couldn’t read that file. Save it as .xlsx or .csv and try again.';

interface SizeDraft {
  readonly label: string;
  readonly text: string;
}

interface Row {
  readonly key: number;
  readonly line: number;
  readonly group: number;
  readonly name: string;
  readonly nameHi: string;
  readonly diet: MenuItemData['diet'];
  readonly sizes: readonly SizeDraft[];
  /** The reader's doubt about this line; cleared once the owner changes the dish or keeps it as it is. */
  readonly flag: string | null;
  /** Fields a photo reader was unsure of, outlined until the owner touches the dish. */
  readonly unsure: readonly ImportedField[];
}

interface Draft {
  readonly groups: readonly string[];
  readonly rows: readonly Row[];
  readonly cut: number;
  /** Photos that couldn't be read, said once above the dishes. */
  readonly note: string | null;
}

type Check = { readonly input: ItemInput } | { readonly error: string };

function draftFrom(items: readonly ImportedItem[], note: string | null): Draft {
  const kept = items.slice(0, MAX_DISHES);
  const groups = [...new Set(kept.map((item) => item.category || UNSORTED))];
  const rows = kept.map((item, key) => ({
    key,
    line: item.line,
    group: groups.indexOf(item.category || UNSORTED),
    name: item.name,
    nameHi: item.nameHi,
    diet: item.diet,
    sizes: item.prices.length > 0 ? item.prices.map((price) => ({ label: price.label, text: formatPaise(price.paise) })) : [{ label: '', text: '' }],
    flag: item.flag,
    unsure: item.unsure ?? [],
  }));
  return { groups, rows, cut: items.length - kept.length, note };
}

function checkRow(row: Row): Check {
  const prices = row.sizes.map((size) => ({ label: size.label.trim(), paise: parseRupees(size.text) }));
  if (prices.some((price) => price.paise === null)) return { error: row.sizes.length > 1 ? 'Enter a price in rupees for each size, like 80.' : 'Enter the price in rupees, like 80.' };
  return toItemInput({ ...row, prices: prices.map((price) => ({ label: price.label, paise: price.paise ?? 0 })) });
}

const problemOf = (row: Row, check: Check): string | null => row.flag ?? ('error' in check ? check.error : null);
const iconButton = 'grid size-11 shrink-0 place-items-center rounded-control hover:bg-mist';
/** A field the photo reader was unsure of: an outline in deep chilli, until the owner changes the dish. */
const doubtful = 'outline-2 outline-offset-1 outline-masala';

interface DishRowProps {
  readonly row: Row;
  readonly check: Check;
  /** A dish of this name is on the menu already, so saving changes its price. */
  readonly known: boolean;
  readonly onChange: (next: Partial<Row>) => void;
  readonly onRemove: () => void;
}

function DishRow({ row, check, known, onChange, onRemove }: DishRowProps) {
  const named = row.name.trim() || `line ${row.line}`;
  const sized = row.sizes.length > 1 || row.sizes[0].label !== '';
  const problem = problemOf(row, check);
  const noteId = `import-row-${row.key}-note`;
  const doubt = (field: ImportedField): { readonly className: string; readonly 'aria-describedby'?: string } => (row.unsure.includes(field) ? { className: doubtful, 'aria-describedby': noteId } : { className: '' });
  const setSize = (index: number, next: Partial<SizeDraft>) => onChange({ sizes: row.sizes.map((size, at) => (at === index ? { ...size, ...next } : size)) });
  return (
    <li id={`import-row-${row.key}`} className={`rounded-card border p-2.5 ${problem ? 'border-masala bg-masala-soft' : 'border-hairline bg-page'}`}>
      <div className="flex items-center gap-1.5">
        <button type="button" className={`${iconButton} ${doubt('diet').className}`} aria-describedby={doubt('diet')['aria-describedby']} onClick={() => onChange({ diet: row.diet === 'veg' ? 'nonveg' : 'veg' })} aria-label={`${row.diet === 'veg' ? 'Veg' : 'Non-veg'}. Change ${named} to ${row.diet === 'veg' ? 'non-veg' : 'veg'}`}>
          <DietMark diet={row.diet} />
        </button>
        <input aria-label={`Name of the dish on line ${row.line}`} value={row.name} onChange={(event) => onChange({ name: event.currentTarget.value })} maxLength={MENU_LIMITS.name + 40} aria-describedby={doubt('name')['aria-describedby']} className={`${fieldBox} min-w-0 flex-1 ${doubt('name').className}`} />
        <button type="button" className={iconButton} onClick={onRemove} aria-label={`Remove ${named}`}>
          <Trash2 className="size-4" aria-hidden="true" />
        </button>
      </div>
      <div className="mt-2 space-y-2">
        {row.sizes.map((size, index) => (
          <div key={index} className="flex items-center gap-1.5">
            {sized ? <input aria-label={`Size ${index + 1} of ${named}`} value={size.label} onChange={(event) => setSize(index, { label: event.currentTarget.value })} maxLength={MENU_LIMITS.sizeLabel} placeholder={index === 0 ? 'Half' : 'Full'} className={`${fieldBox} min-w-0 flex-1`} /> : null}
            <label className={`flex h-12 shrink-0 items-center rounded-control border border-night/30 bg-page pl-3 focus-within:border-night ${doubt('price').className}`}>
              <span aria-hidden="true" className="font-semibold text-night-dim">
                ₹
              </span>
              <span className="sr-only">{sized ? `Price of ${size.label || `size ${index + 1}`} of ${named} in rupees` : `Price of ${named} in rupees`}</span>
              <input value={size.text} onChange={(event) => setSize(index, { text: event.currentTarget.value })} aria-describedby={doubt('price')['aria-describedby']} inputMode="decimal" maxLength={9} className="h-full w-20 bg-transparent px-2 text-right font-semibold tabular-nums focus:outline-none" />
            </label>
            {row.sizes.length > 1 ? (
              <button type="button" className={iconButton} onClick={() => onChange({ sizes: row.sizes.filter((_, at) => at !== index) })} aria-label={`Remove the ${size.label || `size ${index + 1}`} price of ${named}`}>
                <X className="size-4" aria-hidden="true" />
              </button>
            ) : null}
          </div>
        ))}
      </div>
      {problem ? (
        <div className="mt-1 flex flex-wrap items-center gap-x-3">
          <p id={noteId} className="min-w-0 flex-1 py-1 text-sm font-semibold text-masala">
            {problem}
          </p>
          {row.flag && 'input' in check ? (
            <button type="button" onClick={() => onChange({})} className="h-11 text-sm font-semibold underline underline-offset-4">
              Keep it as it is
            </button>
          ) : null}
        </div>
      ) : known ? (
        <p className="mt-2 text-sm text-night-soft">Already on your menu. Its price will change.</p>
      ) : null}
    </li>
  );
}

/** One photo, shrunk on the phone and read on the server. A failure comes back as a message, never a throw. */
async function readPhoto(file: File): Promise<PhotoReadResult> {
  let photo: Blob;
  try {
    photo = await shrinkMenuPhoto(file, MENU_PHOTO_LIMITS.bytes);
  } catch {
    return { ok: false, message: 'We couldn’t open that photo. Try another one.' };
  }
  const data = new FormData();
  data.set('photo', photo, 'menu.jpg');
  try {
    return await readMenuPhotoAction(data);
  } catch {
    return { ok: false, message: 'We couldn’t reach MenuOnTV. Check the internet and try again.' };
  }
}

function PhotoForm({ onRead }: { readonly onRead: (items: readonly ImportedItem[], note: string | null) => string | null }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const input = event.currentTarget;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (files.length === 0) return;
    setBusy(true);
    setError(null);
    const results = await Promise.all(files.slice(0, MENU_PHOTO_LIMITS.photos).map(readPhoto));
    setBusy(false);
    // Photos are read side by side; their dishes join in the order the photos were chosen.
    const items = results.flatMap((result) => (result.ok ? result.items : [])).map((item, index) => ({ ...item, line: index + 1 }));
    const failed = results.flatMap((result) => (result.ok ? [] : [result.message]));
    if (items.length === 0) return setError(failed[0] ?? null);
    const notes = [
      failed.length > 0 ? `${failed.length === 1 ? 'One photo' : `${failed.length} photos`} couldn’t be read. ${failed[0]}` : '',
      files.length > MENU_PHOTO_LIMITS.photos ? `We read the first ${MENU_PHOTO_LIMITS.photos} photos; add the others in a second go.` : '',
    ].filter(Boolean);
    setError(onRead(items, notes.length > 0 ? notes.join(' ') : null));
  };

  return (
    <section aria-labelledby="import-photo-title">
      <h3 id="import-photo-title" className="font-display text-[1.25rem] leading-tight">
        Take a photo of your menu.
      </h3>
      <p className="mt-1.5 text-sm text-night-soft">Photograph each page or board, up to {MENU_PHOTO_LIMITS.photos}. We read the dishes and prices, and you check them before anything reaches a TV.</p>
      <label className={`${primary} mt-4 cursor-pointer has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-night ${busy ? 'pointer-events-none opacity-70' : ''}`}>
        <Busy pending={busy}>{busy ? null : <Camera className="size-4" aria-hidden="true" />}</Busy>
        {busy ? 'Reading your menu' : 'Take or choose photos'}
        <input type="file" accept="image/*" multiple disabled={busy} data-autofocus onChange={(event) => void pick(event)} className="sr-only" />
      </label>
      {busy ? (
        <p role="status" className={hint}>
          This takes about half a minute. Keep this page open.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-3 text-sm font-semibold text-masala">
          {error}
        </p>
      ) : null}
    </section>
  );
}

function PasteForm({
  text,
  onText,
  onRead,
  only,
}: {
  readonly text: string;
  readonly onText: (text: string) => void;
  readonly onRead: (items: readonly ImportedItem[]) => string | null;
  /** The sheet's only way in, so reading the paste is its one chilli action. */
  readonly only: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const read = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setError(text.trim() ? onRead(parseMenuText(text)) : 'Paste your menu first, or choose a file.');
  };

  const pick = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    setBusy(true);
    try {
      setError(onRead(await readMenuFile(file)));
    } catch (problem) {
      setError(problem instanceof MenuFileError ? problem.message : UNREADABLE_FILE);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={read} noValidate className="space-y-4">
      <div>
        <label htmlFor="import-text" className={label}>
          Your menu
        </label>
        <textarea id="import-text" value={text} onChange={(event) => onText(event.currentTarget.value)} rows={9} placeholder={EXAMPLE} className="mt-1.5 block w-full rounded-control border border-night/30 bg-page p-3 text-base text-night focus:border-night focus:outline-none" />
        <p className={hint}>Paste it from WhatsApp, your billing software or a spreadsheet. One dish a line, with its price. Headings become categories.</p>
      </div>
      {error ? (
        <p role="alert" className="text-sm font-semibold text-masala">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        {/* The photo is the sheet's one chilli action; reading a paste is the quieter second way, unless it's the only one. */}
        <button type="submit" className={only ? primary : quiet} disabled={busy}>
          Read the menu
        </button>
        <label className={`${quiet} cursor-pointer has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-night`}>
          <Busy pending={busy}>
            <FileUp className="size-4" aria-hidden="true" />
          </Busy>
          Choose a file
          <input type="file" accept=".xlsx,.csv,.tsv,.txt,text/csv,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => void pick(event)} className="sr-only" />
        </label>
      </div>
      <p className={hint}>Excel (.xlsx), CSV or text, up to 2 MB.</p>
    </form>
  );
}

interface PreviewProps {
  readonly initial: Draft;
  readonly menu: Menu;
  readonly onImport: (groups: MenuImport) => Promise<MenuResult>;
  readonly onBack: () => void;
}

function Preview({ initial, menu, onImport, onBack }: PreviewProps) {
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const summaryRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => summaryRef.current?.focus(), []);

  const known = new Set(menu.categories.flatMap((category) => category.items.map((item) => item.name.trim().toLowerCase())));
  const checks = new Map(draft.rows.map((row) => [row.key, checkRow(row)] as const));
  const checkOf = (row: Row): Check => checks.get(row.key) ?? checkRow(row);
  const problems = draft.rows.filter((row) => problemOf(row, checkOf(row)) !== null);
  const usedGroups = draft.groups.flatMap((_, index) => (draft.rows.some((row) => row.group === index) ? [index] : []));
  const unnamed = usedGroups.some((index) => !draft.groups[index].trim());
  const dishes = draft.rows.length;
  const updates = draft.rows.filter((row) => known.has(row.name.trim().toLowerCase())).length;
  const adds = dishes - updates;
  const plural = (count: number, one: string, many: string): string => `${count} ${count === 1 ? one : many}`;
  const action = dishes === 0 ? 'No dishes left' : updates === 0 ? `Add ${plural(adds, 'dish', 'dishes')}` : adds === 0 ? `Update ${plural(updates, 'price', 'prices')}` : `Add ${plural(adds, 'dish', 'dishes')}, update ${updates}`;

  // Updates read the latest draft, so two quick taps on a slow phone never undo each other.
  const edit = (next: (rows: readonly Row[]) => readonly Row[]): void => {
    setDraft((current) => ({ ...current, rows: next(current.rows) }));
    setError(null);
  };
  const change = (key: number, next: Partial<Row>): void => edit((rows) => rows.map((row) => (row.key === key ? { ...row, ...next, flag: null, unsure: [] } : row)));
  const remove = (key: number): void => edit((rows) => rows.filter((row) => row.key !== key));
  const rename = (index: number, name: string): void => setDraft((current) => ({ ...current, groups: current.groups.map((group, at) => (at === index ? name : group)) }));

  const save = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (problems.length > 0 || unnamed) {
      setError(unnamed ? 'Give each category a name.' : 'Fix or remove the dishes marked in red first.');
      if (problems[0]) document.getElementById(`import-row-${problems[0].key}`)?.querySelector('input')?.focus();
      return;
    }
    const groups = usedGroups.map((index) => ({
      category: draft.groups[index].trim(),
      items: draft.rows.filter((row) => row.group === index).flatMap((row) => {
        const check = checkOf(row);
        return 'input' in check ? [check.input] : [];
      }),
    }));
    setSaving(true);
    const result = await onImport(groups);
    setSaving(false);
    if (!result.ok) return setError(result.message ?? 'Something went wrong. Try again.');
    closeSheet(formRef.current);
  };

  return (
    <form ref={formRef} onSubmit={(event) => void save(event)} noValidate>
      <p ref={summaryRef} tabIndex={-1} className="text-sm focus:outline-none">
        We found {dishes} {dishes === 1 ? 'dish' : 'dishes'}. {problems.length > 0 ? `${problems.length} marked in red ${problems.length === 1 ? 'needs' : 'need'} a look.` : 'Change anything that’s not right.'}
        {draft.cut > 0 ? ` We kept the first ${MAX_DISHES}; add the other ${draft.cut} in a second paste.` : ''}
      </p>
      {draft.note ? <p className="mt-2 text-sm font-semibold text-masala">{draft.note}</p> : null}
      <datalist id="import-categories">
        {menu.categories.map((category) => (
          <option key={category.id} value={category.name} />
        ))}
      </datalist>
      <div className="mt-4 space-y-6">
        {usedGroups.map((index) => {
          const name = draft.groups[index];
          const existing = menu.categories.find((category) => category.name.trim().toLowerCase() === name.trim().toLowerCase());
          return (
            <section key={index} aria-labelledby={`import-group-${index}`}>
              <label id={`import-group-${index}`} htmlFor={`import-group-name-${index}`} className={label}>
                Category
              </label>
              <input id={`import-group-name-${index}`} list="import-categories" value={name} onChange={(event) => rename(index, event.currentTarget.value)} maxLength={MENU_LIMITS.categoryName} className={`mt-1.5 block w-full ${fieldBox} font-bold`} />
              <p className={hint}>{existing ? `Adds to your ${existing.name} category.` : 'A new category on your menu.'}</p>
              <ul className="mt-3 space-y-2">
                {draft.rows
                  .filter((row) => row.group === index)
                  .map((row) => (
                    <DishRow key={row.key} row={row} check={checkOf(row)} known={known.has(row.name.trim().toLowerCase())} onChange={(next) => change(row.key, next)} onRemove={() => remove(row.key)} />
                  ))}
              </ul>
            </section>
          );
        })}
      </div>
      <div className="sticky bottom-0 -mx-5 -mb-6 mt-6 border-t border-hairline bg-page px-5 pt-3 pb-5">
        {error ? (
          <p role="alert" className="mb-2 text-sm font-semibold text-masala">
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className={primary} disabled={saving || dishes === 0}>
            <Busy pending={saving}>{action}</Busy>
          </button>
          <button type="button" className={quiet} onClick={onBack} disabled={saving}>
            Start again
          </button>
        </div>
      </div>
    </form>
  );
}

interface ImportSheetProps {
  readonly menu: Menu;
  /** Without a photo reader on the server, the sheet is just paste or a file. */
  readonly canReadPhotos: boolean;
  readonly onImport: (groups: MenuImport) => Promise<MenuResult>;
  readonly onClose: () => void;
}

/** Photograph, paste or pick a file of the menu, check every dish the reader found, then add them all in one save. */
export function ImportSheet({ menu, canReadPhotos, onImport, onClose }: ImportSheetProps) {
  const [text, setText] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);

  const read = (items: readonly ImportedItem[], note: string | null = null): string | null => {
    if (items.length === 0) return 'We couldn’t find any dishes. Put each dish on its own line with its price, like “Masala chai 30”.';
    setDraft(draftFrom(items, note));
    return null;
  };

  return (
    <Sheet title={draft ? 'Check the dishes' : 'Add your menu'} onClose={onClose}>
      {draft ? (
        <Preview initial={draft} menu={menu} onImport={onImport} onBack={() => setDraft(null)} />
      ) : (
        <>
          {canReadPhotos ? (
            <>
              <PhotoForm onRead={read} />
              <p className="my-7 flex items-center gap-3 font-brand-mono text-[0.8rem] text-night-dim" aria-hidden="true">
                <span className="h-px flex-1 bg-hairline" />
                or paste it
                <span className="h-px flex-1 bg-hairline" />
              </p>
            </>
          ) : null}
          <PasteForm text={text} onText={setText} onRead={read} only={!canReadPhotos} />
        </>
      )}
    </Sheet>
  );
}
