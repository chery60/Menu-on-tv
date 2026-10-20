'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { EyeOff, GripVertical } from 'lucide-react';
import { useRef, useState, type PointerEvent } from 'react';
import { emojiFor } from '@/features/screen/visitor-menu';
import { BADGE_LABELS } from '../labels';
import { isSoldOut } from '../edit';
import { formatPaise, parseRupees } from '../money';
import type { MenuEdit, MenuItemData } from '../schema';
import { photoUrl } from '../to-screen';

/** How far left an owner swipes a dish to hide or show it. */
const SWIPE_TO_TOGGLE_PX = 80;
const SWIPE_MAX_PX = 112;
const SWIPE_START_PX = 10;

interface ItemRowProps {
  readonly item: MenuItemData;
  readonly today: string;
  readonly onOpen: () => void;
  readonly onEdit: (edit: MenuEdit) => void;
  readonly onError: (message: string) => void;
}

export function DietMark({ diet }: { readonly diet: MenuItemData['diet'] }) {
  return (
    <span role="img" aria-label={diet === 'veg' ? 'Veg' : 'Non-veg'} className={`grid size-4 shrink-0 place-items-center rounded-[3px] border-2 ${diet === 'veg' ? 'border-chutney' : 'border-[#8b4513]'}`}>
      <span className={`size-1.5 rounded-full ${diet === 'veg' ? 'bg-chutney' : 'bg-[#8b4513]'}`} />
    </span>
  );
}

export function Thumb({ item, size = 'size-11' }: { readonly item: MenuItemData; readonly size?: string }) {
  if (item.photo) {
    // eslint-disable-next-line @next/next/no-img-element -- owner photos are small, already-resized JPEGs from our own route
    return <img src={photoUrl(item.photo)} alt="" className={`${size} shrink-0 rounded-xl object-cover`} />;
  }
  return (
    <span aria-hidden="true" className={`${size} grid shrink-0 place-items-center rounded-xl bg-mist text-xl`}>
      {item.emoji || emojiFor(item.name, item.diet)}
    </span>
  );
}

/** Edits the first price where it stands. Saves on Enter or when the field loses focus. */
function PriceField({ item, onEdit, onError }: Omit<ItemRowProps, 'today' | 'onOpen'>) {
  const saved = formatPaise(item.prices[0].paise);
  const [text, setText] = useState(saved);
  const save = (): void => {
    const paise = parseRupees(text);
    if (paise === null) {
      setText(saved);
      onError(`“${text}” isn’t a price. Type rupees, like 80 or 49.50.`);
      return;
    }
    if (paise !== item.prices[0].paise) onEdit({ type: 'set-prices', itemId: item.id, prices: [{ label: '', paise }] });
  };
  return (
    <label className="flex h-11 items-center rounded-control border border-night/30 bg-page pl-2 focus-within:border-night" data-no-swipe>
      <span aria-hidden="true" className="font-semibold text-night-dim">
        ₹
      </span>
      <span className="sr-only">Price of {item.name} in rupees</span>
      <input
        value={text}
        onChange={(event) => setText(event.currentTarget.value)}
        onBlur={save}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
          if (event.key === 'Escape') setText(saved);
        }}
        inputMode="decimal"
        enterKeyHint="done"
        maxLength={9}
        className="h-full w-16 bg-transparent px-1 text-right font-semibold tabular-nums focus:outline-none"
      />
    </label>
  );
}

function SizePrices({ item, onOpen }: { readonly item: MenuItemData; readonly onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} data-no-swipe className="h-11 rounded-control border border-night/30 px-2 text-sm font-semibold tabular-nums hover:border-night" aria-label={`Prices of ${item.name}: ${item.prices.map((price) => `${price.label} ₹${formatPaise(price.paise)}`).join(', ')}. Change them.`}>
      ₹{item.prices.map((price) => formatPaise(price.paise)).join(' / ')}
    </button>
  );
}

function SoldOutSwitch({ item, today, onEdit }: Pick<ItemRowProps, 'item' | 'today' | 'onEdit'>) {
  const soldOut = isSoldOut(item, today);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={soldOut}
      aria-label={`${item.name} sold out today`}
      data-no-swipe
      onClick={() => onEdit({ type: 'set-sold-out', itemId: item.id, soldOut: !soldOut })}
      className={`h-11 min-w-[5.5rem] rounded-control border px-3 text-sm font-semibold ${soldOut ? 'border-masala bg-masala text-white' : 'border-night/30 bg-page text-night-soft hover:border-night'}`}
    >
      {soldOut ? 'Sold out' : 'In stock'}
    </button>
  );
}

/** Swipe left on a phone to hide a dish from every screen, or show it again. Mouse users use the dish's sheet. */
function useSwipe(onSwipe: () => void) {
  const [offset, setOffset] = useState(0);
  const start = useRef<{ x: number; y: number; swiping: boolean } | null>(null);
  // The distance lives in a ref too: a quick swipe can end before React re-renders with the last move.
  const distance = useRef(0);
  const swiped = useRef(false);
  const move = (to: number): void => {
    distance.current = to;
    setOffset(to);
  };

  const handlers = {
    onPointerDown: (event: PointerEvent<HTMLDivElement>) => {
      swiped.current = false;
      if (event.pointerType === 'mouse' || (event.target as HTMLElement).closest('[data-no-swipe]')) return;
      start.current = { x: event.clientX, y: event.clientY, swiping: false };
    },
    onPointerMove: (event: PointerEvent<HTMLDivElement>) => {
      const from = start.current;
      if (!from) return;
      const dx = event.clientX - from.x;
      const dy = event.clientY - from.y;
      if (!from.swiping) {
        if (Math.abs(dy) > SWIPE_START_PX) start.current = null;
        else if (dx < -SWIPE_START_PX && Math.abs(dx) > Math.abs(dy)) {
          from.swiping = true;
          event.currentTarget.setPointerCapture(event.pointerId);
        }
        return;
      }
      move(Math.max(-SWIPE_MAX_PX, Math.min(0, dx)));
    },
    onPointerUp: () => {
      if (start.current?.swiping) {
        swiped.current = true;
        if (distance.current <= -SWIPE_TO_TOGGLE_PX) onSwipe();
      }
      start.current = null;
      move(0);
    },
    onPointerCancel: () => {
      start.current = null;
      move(0);
    },
  };
  return { offset, handlers, swiped };
}

export function ItemRow({ item, today, onOpen, onEdit, onError }: ItemRowProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const { offset, handlers, swiped } = useSwipe(() => onEdit({ type: 'set-hidden', itemId: item.id, hidden: !item.hidden }));
  const soldOut = isSoldOut(item, today);
  const status = item.hidden ? 'Hidden from screens' : soldOut ? 'Sold out today' : null;
  const details = [item.nameHi, item.badges.map((badge) => BADGE_LABELS[badge]).join(', ')].filter(Boolean).join(' · ');

  return (
    <li ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), transition }} className={`relative overflow-hidden rounded-card border ${isDragging ? 'z-10 border-night shadow-tv' : 'border-hairline'}`}>
      <div aria-hidden="true" className="absolute inset-y-0 right-0 flex w-28 items-center justify-center bg-night text-sm font-semibold text-white">
        {item.hidden ? 'Show' : 'Hide'}
      </div>
      <div
        {...handlers}
        style={{ transform: offset ? `translateX(${offset}px)` : undefined }}
        className={`relative flex touch-pan-y flex-wrap items-center gap-x-2 gap-y-2 bg-page py-2 pr-2 pl-1 ${offset ? '' : 'transition-transform'} ${item.hidden ? 'bg-mist' : ''}`}
      >
        <button ref={setActivatorNodeRef} type="button" {...attributes} {...listeners} data-no-swipe aria-label={`Move ${item.name}`} className="grid h-11 w-8 shrink-0 cursor-grab touch-none place-items-center text-night-dim active:cursor-grabbing">
          <GripVertical className="size-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => {
            if (!swiped.current) onOpen();
          }}
          className={`flex min-w-[9rem] flex-1 items-center gap-3 text-left ${item.hidden ? 'opacity-60' : ''}`}
        >
          <Thumb item={item} />
          <span className="min-w-0">
            <span className="flex items-center gap-2">
              <DietMark diet={item.diet} />
              <span className={`font-semibold leading-snug ${soldOut ? 'line-through decoration-2' : ''}`}>{item.name}</span>
            </span>
            {status ? (
              <span className={`mt-0.5 flex items-center gap-1 text-sm font-semibold ${item.hidden ? 'text-night-dim' : 'text-masala'}`}>
                {item.hidden ? <EyeOff className="size-3.5" aria-hidden="true" /> : null}
                {status}
              </span>
            ) : details ? (
              <span className="mt-0.5 block text-sm text-night-dim">{details}</span>
            ) : null}
          </span>
        </button>
        <div className="ml-auto flex items-center gap-2">
          {item.prices.length > 1 ? <SizePrices item={item} onOpen={onOpen} /> : <PriceField key={item.prices[0].paise} item={item} onEdit={onEdit} onError={onError} />}
          <SoldOutSwitch item={item} today={today} onEdit={onEdit} />
        </div>
      </div>
    </li>
  );
}
