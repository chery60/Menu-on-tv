'use client';

import { closestCenter, DndContext, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ArrowDown, ArrowUp, Camera, ClipboardPaste, Pencil, Plus } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { editMenuAction, importMenuAction, removePhotoAction, uploadPhotoAction, startFromSampleAction } from '@/app/studio/menu/actions';
import type { MenuResult } from '@/app/studio/menu/menu-result';
import { primary, quiet } from '@/components/owner/ui';
import type { LocalClock } from '@/lib/local-date';
import { describeDaypart, showsAt } from '../dayparts';
import { applyEdit, findItem } from '../edit';
import type { Menu, MenuCategoryData, MenuEdit, MenuImport } from '../schema';
import type { ScreenProfile } from '../to-screen';
import { CategorySheet } from './category-sheet';
import { ImportSheet } from './import-sheet';
import { ItemRow } from './item-row';
import { ItemSheet } from './item-sheet';
import { MenuPreview, type PreviewScreen } from './menu-preview';

/** Edits that look instant: applied here first, then confirmed by the server's copy of the menu. */
const OPTIMISTIC: ReadonlySet<MenuEdit['type']> = new Set(['set-prices', 'set-sold-out', 'set-hidden', 'move-item', 'move-category', 'remove-item']);
/** A finger must rest on the handle this long before a drag starts, so scrolling past it never moves a dish. */
const TOUCH_HOLD_MS = 180;
const SAVED_SHOWN_MS = 2500;
const ERROR_SHOWN_MS = 8000;

type ItemSheetState = { readonly kind: 'add'; readonly categoryId: string } | { readonly kind: 'edit'; readonly itemId: string };
type CategorySheetState = { readonly kind: 'add' } | { readonly kind: 'edit'; readonly categoryId: string };

interface MenuEditorProps {
  readonly initialMenu: Menu;
  /** The outlet's clock when the page loaded: sold out today, and which dayparts are on. */
  readonly clock: LocalClock;
  readonly profile: ScreenProfile;
  readonly previewScreen: PreviewScreen;
  /** Whether the server can read menu photos; without it, adding a menu starts from paste. */
  readonly canReadPhotos: boolean;
}

type SaveStatus = { readonly kind: 'idle' } | { readonly kind: 'saving' } | { readonly kind: 'saved' } | { readonly kind: 'error'; readonly message: string };

function SaveBar({ status }: { readonly status: SaveStatus }) {
  const text = status.kind === 'saving' ? 'Saving…' : status.kind === 'saved' ? 'Saved. Your TVs update within seconds.' : status.kind === 'error' ? status.message : '';
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex justify-center px-4 pb-4">
      <p
        role={status.kind === 'error' ? 'alert' : 'status'}
        className={`rounded-control px-4 py-2 text-sm font-semibold shadow-tv ${text ? '' : 'sr-only'} ${status.kind === 'error' ? 'bg-masala text-white' : 'bg-night text-white'}`}
      >
        {text}
      </p>
    </div>
  );
}

function CategorySection({
  category,
  index,
  count,
  clock,
  onEdit,
  onError,
  onOpenItem,
  onAddItem,
  onEditCategory,
}: {
  readonly category: MenuCategoryData;
  readonly index: number;
  readonly count: number;
  readonly clock: LocalClock;
  readonly onEdit: (edit: MenuEdit) => void;
  readonly onError: (message: string) => void;
  readonly onOpenItem: (itemId: string) => void;
  readonly onAddItem: () => void;
  readonly onEditCategory: () => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: TOUCH_HOLD_MS, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const onDragEnd = ({ active, over }: DragEndEvent): void => {
    if (!over || active.id === over.id) return;
    const toIndex = category.items.findIndex((item) => item.id === over.id);
    if (toIndex >= 0)
      onEdit({
        type: 'move-item',
        itemId: String(active.id),
        categoryId: category.id,
        toIndex,
      });
  };
  const arrow = 'grid size-11 place-items-center rounded-control hover:bg-mist disabled:opacity-30';

  return (
    <section aria-labelledby={`category-${category.id}`} className="rounded-panel border border-hairline bg-page p-3 sm:p-5">
      <div className="flex items-center gap-1 pl-1">
        <h2 id={`category-${category.id}`} className="min-w-0 flex-1 font-display text-[1.3rem] leading-tight">
          {category.name}
          {category.nameHi ? (
            <span lang="hi" className="ml-2 text-base font-semibold text-night-dim">
              {category.nameHi}
            </span>
          ) : null}
          {category.daypart ? (
            <span className="mt-1 block font-brand-mono text-[0.78rem] font-normal text-night-dim">
              {describeDaypart(category.daypart)}
              {showsAt(category.daypart, clock) ? '' : '. Not on your TVs now.'}
            </span>
          ) : null}
        </h2>
        <button
          type="button"
          className={arrow}
          disabled={index === 0}
          onClick={() =>
            onEdit({
              type: 'move-category',
              categoryId: category.id,
              toIndex: index - 1,
            })
          }
          aria-label={`Move ${category.name} up`}
        >
          <ArrowUp className="size-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          className={arrow}
          disabled={index === count - 1}
          onClick={() =>
            onEdit({
              type: 'move-category',
              categoryId: category.id,
              toIndex: index + 1,
            })
          }
          aria-label={`Move ${category.name} down`}
        >
          <ArrowDown className="size-5" aria-hidden="true" />
        </button>
        <button type="button" className={arrow} onClick={onEditCategory} aria-label={`Change or delete ${category.name}`}>
          <Pencil className="size-4" aria-hidden="true" />
        </button>
      </div>

      {category.items.length === 0 ? (
        <p className="mt-3 px-1 text-night-soft">No dishes yet.</p>
      ) : (
        <DndContext /* a stable id keeps dnd-kit's screen-reader ids the same on the server and in the browser */ id={`dishes-${category.id}`} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={category.items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
            <ul className="mt-3 space-y-2">
              {category.items.map((item) => (
                <ItemRow key={item.id} item={item} today={clock.today} onOpen={() => onOpenItem(item.id)} onEdit={onEdit} onError={onError} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
      <button type="button" onClick={onAddItem} className="mt-3 inline-flex h-11 items-center gap-2 rounded-control px-3 font-semibold text-masala hover:bg-masala-soft">
        <Plus className="size-4" aria-hidden="true" />
        Add a dish to {category.name}
      </button>
    </section>
  );
}

/** The phone-first menu editor. Every change is saved at once and reaches the TVs within seconds. */
export function MenuEditor({ initialMenu, clock, profile, previewScreen, canReadPhotos }: MenuEditorProps) {
  const { today } = clock;
  const [menu, setMenu] = useState(initialMenu);
  const [status, setStatus] = useState<SaveStatus>({ kind: 'idle' });
  const [itemSheet, setItemSheet] = useState<ItemSheetState | null>(null);
  const [categorySheet, setCategorySheet] = useState<CategorySheetState | null>(null);
  const [starting, setStarting] = useState(false);
  const [importing, setImporting] = useState(false);
  const latest = useRef(0);

  useEffect(() => {
    if (status.kind !== 'saved' && status.kind !== 'error') return;
    const timer = setTimeout(() => setStatus({ kind: 'idle' }), status.kind === 'saved' ? SAVED_SHOWN_MS : ERROR_SHOWN_MS);
    return () => clearTimeout(timer);
  }, [status]);

  /** Applies the server's answer if it is the newest one; an older answer would undo a later change. */
  const settle = useCallback((request: number, result: MenuResult): MenuResult => {
    if (request === latest.current) {
      if (result.menu) setMenu(result.menu);
      setStatus(
        result.ok
          ? { kind: 'saved' }
          : {
              kind: 'error',
              message: result.message ?? 'Something went wrong. Try again.',
            },
      );
    }
    return result;
  }, []);

  const save = useCallback(
    async (edit: MenuEdit): Promise<MenuResult> => {
      const request = (latest.current += 1);
      setStatus({ kind: 'saving' });
      if (OPTIMISTIC.has(edit.type)) {
        setMenu((current) => {
          try {
            return applyEdit(current, edit, {
              today,
              now: new Date(),
              newId: () => `pending-${request}`,
            });
          } catch {
            return current;
          }
        });
      }
      try {
        return settle(request, await editMenuAction(edit));
      } catch {
        return settle(request, {
          ok: false,
          menu: null,
          message: 'You seem to be offline. Check the connection and try again.',
        });
      }
    },
    [settle, today],
  );

  const run = useCallback(
    async (action: () => Promise<MenuResult>): Promise<MenuResult> => {
      const request = (latest.current += 1);
      setStatus({ kind: 'saving' });
      try {
        return settle(request, await action());
      } catch {
        return settle(request, {
          ok: false,
          menu: null,
          message: 'You seem to be offline. Check the connection and try again.',
        });
      }
    },
    [settle],
  );

  const uploadPhoto = useCallback(
    (itemId: string, photo: Blob) =>
      run(() => {
        const form = new FormData();
        form.set('itemId', itemId);
        form.set('photo', photo, 'dish.jpg');
        return uploadPhotoAction(form);
      }),
    [run],
  );
  const removePhoto = useCallback((itemId: string) => run(() => removePhotoAction(itemId)), [run]);
  const showError = useCallback((message: string) => setStatus({ kind: 'error', message }), []);
  const edit = useCallback((change: MenuEdit) => void save(change), [save]);
  const importDishes = useCallback((groups: MenuImport) => run(() => importMenuAction(groups)), [run]);

  const categories = menu.categories.map(({ id, name }) => ({ id, name }));
  const editing = itemSheet?.kind === 'edit' ? findItem(menu, itemSheet.itemId) : null;
  const editingCategory = categorySheet?.kind === 'edit' ? (menu.categories.find((category) => category.id === categorySheet.categoryId) ?? null) : null;
  const dishes = menu.categories.reduce((total, category) => total + category.items.length, 0);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-brand-mono text-[0.78rem] text-night-dim">{profile.name}</p>
          <h1 className="mt-1 font-display text-[clamp(2rem,6vw,3.4rem)] leading-[0.95]">Menu.</h1>
          <p className="mt-1 text-night-soft">
            {dishes === 0
              ? 'Add what you sell. Changes reach your TVs within seconds.'
              : `${dishes} ${dishes === 1 ? 'dish' : 'dishes'} in ${menu.categories.length} ${menu.categories.length === 1 ? 'category' : 'categories'}. Changes reach your TVs within seconds.`}
          </p>
        </div>
        {menu.categories.length > 0 ? (
          <button type="button" className={quiet} onClick={() => setImporting(true)}>
            {canReadPhotos ? <Camera className="size-4" aria-hidden="true" /> : <ClipboardPaste className="size-4" aria-hidden="true" />}
            {canReadPhotos ? 'Add dishes from a photo or paste' : 'Add dishes by pasting them'}
          </button>
        ) : null}
      </div>

      {menu.categories.length === 0 ? (
        <section className="mt-6 rounded-panel border border-dashed border-night/40 bg-page p-6 text-center sm:p-10">
          <h2 className="font-display text-[1.5rem] leading-tight">Your menu is empty.</h2>
          <p className="mx-auto mt-2 max-w-[30rem] text-night-soft">
            {canReadPhotos ? 'Take a photo of the menu you already have, or paste it' : 'Paste the menu you already have'} from WhatsApp, your billing software or a spreadsheet. Or add a category, like “Chai and coffee”, and its dishes one by one.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <button type="button" className={primary} onClick={() => setImporting(true)}>
              {canReadPhotos ? <Camera className="size-4" aria-hidden="true" /> : <ClipboardPaste className="size-4" aria-hidden="true" />}
              {canReadPhotos ? 'Add your menu from a photo' : 'Paste your menu'}
            </button>
            <button type="button" className={quiet} onClick={() => setCategorySheet({ kind: 'add' })}>
              <Plus className="size-4" aria-hidden="true" />
              Add a category
            </button>
            <button
              type="button"
              className={quiet}
              disabled={starting}
              onClick={async () => {
                setStarting(true);
                await run(() => startFromSampleAction());
                setStarting(false);
              }}
            >
              Use the sample café menu
            </button>
          </div>
        </section>
      ) : (
        <>
          <p className="mt-4 rounded-card bg-telly-soft px-4 py-3 text-sm">
            Tap a dish to change it. Type a new price straight into its box. Hold <span className="font-semibold">⋮⋮</span> to drag a dish into place. On a phone, swipe a dish left to hide it from your screens.
          </p>
          <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-start">
            <div>
              <div className="space-y-5">
                {menu.categories.map((category, index) => (
                  <CategorySection
                    key={category.id}
                    category={category}
                    index={index}
                    count={menu.categories.length}
                    clock={clock}
                    onEdit={edit}
                    onError={showError}
                    onOpenItem={(itemId) => setItemSheet({ kind: 'edit', itemId })}
                    onAddItem={() => setItemSheet({ kind: 'add', categoryId: category.id })}
                    onEditCategory={() =>
                      setCategorySheet({
                        kind: 'edit',
                        categoryId: category.id,
                      })
                    }
                  />
                ))}
              </div>
              <button type="button" onClick={() => setCategorySheet({ kind: 'add' })} className={`${quiet} mt-5`}>
                <Plus className="size-4" aria-hidden="true" />
                Add a category
              </button>
            </div>

            {/* Beside the list on a computer, so every change shows on the TV as it is made; under it on a phone. */}
            <aside aria-labelledby="preview-title" className="rounded-panel border border-hairline bg-page p-4 lg:sticky lg:top-24 sm:p-5">
              <h2 id="preview-title" className="font-display text-[1.25rem] leading-tight">
                See it on a TV.
              </h2>
              <p className="mt-1 mb-4 text-sm text-night-soft">
                {previewScreen.name}, as your TVs will play it. Change the layout and theme on the{' '}
                <a className="font-semibold underline underline-offset-4" href="/studio/tvs">
                  TVs
                </a>{' '}
                page.
              </p>
              <div className="rounded-card bg-night p-2">
                <MenuPreview menu={menu} clock={clock} profile={profile} screen={previewScreen} />
              </div>
            </aside>
          </div>
        </>
      )}

      {itemSheet && (itemSheet.kind === 'add' || editing) ? (
        <ItemSheet
          key={itemSheet.kind === 'add' ? `add-${itemSheet.categoryId}` : itemSheet.itemId}
          mode={
            itemSheet.kind === 'add'
              ? itemSheet
              : {
                  kind: 'edit',
                  item: editing!.item,
                  categoryId: editing!.category.id,
                }
          }
          categories={categories}
          onSave={save}
          onUploadPhoto={uploadPhoto}
          onRemovePhoto={removePhoto}
          onClose={() => setItemSheet(null)}
        />
      ) : null}
      {categorySheet && (categorySheet.kind === 'add' || editingCategory) ? (
        <CategorySheet key={categorySheet.kind === 'add' ? 'add' : categorySheet.categoryId} category={editingCategory} onSave={save} onClose={() => setCategorySheet(null)} />
      ) : null}
      {importing ? <ImportSheet menu={menu} canReadPhotos={canReadPhotos} onImport={importDishes} onClose={() => setImporting(false)} /> : null}
      <SaveBar status={status} />
    </div>
  );
}
