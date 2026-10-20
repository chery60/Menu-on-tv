'use client';

import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus } from 'lucide-react';
import { useId, useState, type FormEvent, type KeyboardEvent } from 'react';
import type { Group } from '../domain/board';
import type { GroupBy, TrackerItem } from '../domain/types';
import { BoardCardBody } from './board-card';
import { StatusDot } from './tag';

const COLUMN_PREFIX = 'column:';
const DRAG_DISTANCE_PX = 5;

/**
 * Kanban-friendly collisions: whatever is under the pointer wins (a card over its column),
 * so empty columns are easy targets. Keyboard drags have no pointer and fall back to corners.
 */
const collisionDetection: CollisionDetection = (args) => {
  const underPointer = pointerWithin(args);
  if (underPointer.length > 0) {
    const card = underPointer.find((hit) => !String(hit.id).startsWith(COLUMN_PREFIX));
    return card ? [card] : underPointer;
  }
  return closestCorners(args);
};

interface BoardViewProps {
  readonly groups: readonly Group[];
  readonly groupBy: GroupBy;
  readonly selectedId: string | null;
  readonly onOpen: (id: string) => void;
  readonly onMove: (id: string, targetGroup: string, targetIndex: number) => void;
  readonly onCreate: (groupKey: string, title: string) => void;
  /** Called when a drag begins, so overlays like the side peek can get out of the way. */
  readonly onDragStart?: () => void;
}

interface SortableCardProps {
  readonly item: TrackerItem;
  readonly groupBy: GroupBy;
  readonly selected: boolean;
  readonly onOpen: (id: string) => void;
}

function SortableCard({ item, groupBy, selected, onOpen }: SortableCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), transition }} className={isDragging ? 'opacity-40' : undefined}>
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-roledescription="Draggable card"
        aria-label={`${item.key}: ${item.title}`}
        aria-describedby="tracker-dnd-help"
        onClick={() => onOpen(item.id)}
        className={`block w-full touch-manipulation rounded-lg border bg-paper p-3 text-left text-sm shadow-[0_1px_2px_rgba(15,20,18,0.05)] transition-colors duration-100 hover:bg-hover ${
          selected ? 'border-primary' : 'border-rule'
        }`}
      >
        <BoardCardBody item={item} groupBy={groupBy} />
      </button>
    </li>
  );
}

interface NewCardFormProps {
  readonly onCreate: (title: string) => void;
  readonly onDone: () => void;
}

function NewCardForm({ onCreate, onDone }: NewCardFormProps) {
  const [title, setTitle] = useState('');
  const inputId = useId();
  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const trimmed = title.trim();
    if (trimmed) onCreate(trimmed);
    setTitle('');
    onDone();
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Escape') onDone();
  };
  return (
    <form onSubmit={submit} className="rounded-lg border border-primary bg-paper p-2 shadow-float">
      <label className="sr-only" htmlFor={inputId}>
        Title
      </label>
      <input
        id={inputId}
        autoFocus
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => (title.trim() ? undefined : onDone())}
        maxLength={200}
        placeholder="Type a title, then press Enter"
        className="w-full bg-transparent px-1 py-1 text-sm text-ink placeholder:text-ink-faint focus:outline-none"
      />
    </form>
  );
}

interface ColumnProps {
  readonly group: Group;
  readonly groupBy: GroupBy;
  readonly selectedId: string | null;
  readonly onOpen: (id: string) => void;
  readonly onCreate: (groupKey: string, title: string) => void;
}

function Column({ group, groupBy, selectedId, onOpen, onCreate }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `${COLUMN_PREFIX}${group.key}` });
  const [adding, setAdding] = useState(false);
  const headingId = `column-${group.key}`;

  return (
    <section aria-labelledby={headingId} className="flex w-[286px] shrink-0 flex-col">
      <header className="flex items-center gap-2 px-1 pb-2 text-sm">
        <StatusDot color={group.meta.color} />
        <h2 id={headingId} className="font-medium text-ink">
          {group.meta.short ? `${group.meta.short} ` : ''}
          {group.meta.label}
        </h2>
        <span className="text-ink-faint tabular">{group.items.length}</span>
        <button
          type="button"
          onClick={() => setAdding(true)}
          aria-label={`Add an item to ${group.meta.label}`}
          className="ml-auto grid size-6 place-items-center rounded text-ink-faint hover:bg-hover hover:text-ink"
        >
          <Plus className="size-4" aria-hidden="true" />
        </button>
      </header>
      <div ref={setNodeRef} className={`flex min-h-24 flex-1 flex-col gap-2 rounded-xl p-1 transition-colors duration-100 ${isOver ? 'bg-primary-soft' : ''}`}>
        <SortableContext items={group.items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
          <ul className="flex flex-col gap-2">
            {group.items.map((item) => (
              <SortableCard key={item.id} item={item} groupBy={groupBy} selected={item.id === selectedId} onOpen={onOpen} />
            ))}
          </ul>
        </SortableContext>
        {adding ? (
          <NewCardForm onCreate={(title) => onCreate(group.key, title)} onDone={() => setAdding(false)} />
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-sm text-ink-faint hover:bg-hover hover:text-ink-dim"
          >
            <Plus className="size-4" aria-hidden="true" /> New
          </button>
        )}
      </div>
    </section>
  );
}

function resolveDrop(groups: readonly Group[], activeId: string, overId: string): { readonly group: string; readonly index: number } | null {
  if (overId.startsWith(COLUMN_PREFIX)) {
    const key = overId.slice(COLUMN_PREFIX.length);
    const group = groups.find((g) => g.key === key);
    return group ? { group: key, index: group.items.filter((item) => item.id !== activeId).length } : null;
  }
  const target = groups.find((g) => g.items.some((item) => item.id === overId));
  if (!target) return null;
  // Within a column this matches arrayMove semantics; across columns it inserts before the card under the pointer.
  return { group: target.key, index: target.items.findIndex((item) => item.id === overId) };
}

export function BoardView({ groups, groupBy, selectedId, onOpen, onMove, onCreate, onDragStart: notifyDragStart }: BoardViewProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: DRAG_DISTANCE_PX } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space'] },
    }),
  );

  const activeItem = activeId ? groups.flatMap((g) => g.items).find((item) => item.id === activeId) : undefined;

  const onDragStart = (event: DragStartEvent): void => {
    setActiveId(String(event.active.id));
    notifyDragStart?.();
  };

  const onDragEnd = (event: DragEndEvent): void => {
    setActiveId(null);
    if (!event.over) return;
    const id = String(event.active.id);
    const drop = resolveDrop(groups, id, String(event.over.id));
    if (drop) onMove(id, drop.group, drop.index);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={collisionDetection} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActiveId(null)}>
      <p id="tracker-dnd-help" className="sr-only">
        Press Enter to open. Press Space to pick up, use the arrow keys to move, and press Space again to drop.
      </p>
      <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-8 sm:-mx-8 sm:px-8">
        {groups.map((group) => (
          <Column key={group.key} group={group} groupBy={groupBy} selectedId={selectedId} onOpen={onOpen} onCreate={onCreate} />
        ))}
      </div>
      <DragOverlay dropAnimation={{ duration: 160, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }}>
        {activeItem ? (
          <div className="w-[278px] rotate-[1.5deg] rounded-lg border border-rule bg-paper p-3 text-sm shadow-float">
            <BoardCardBody item={activeItem} groupBy={groupBy} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
