'use client';

import { CalendarClock, CircleDot, Flag, Gauge, Hash, Layers, Link2, Shapes, Tags, Trash2, User, X } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { checklistProgress, iceScore } from '../domain/board';
import {
  AREA_META,
  AREAS,
  EFFORT_META,
  EFFORTS,
  PHASE_META,
  PHASES,
  PRIORITIES,
  PRIORITY_META,
  SCORES,
  STATUS_META,
  STATUSES,
  type ChecklistItem,
  type ItemPatch,
  type Score,
  type TrackerItem,
} from '../domain/types';
import { Markdown } from './markdown';
import { PropertySelect } from './tag';

const AUTOSAVE_MS = 600;
const EMOJIS = ['📌', '✨', '💳', '🧾', '📣', '🏫', '👥', '🔐', '🧠', '🤖', '📊', '📈', '🧪', '🛡️', '🎟️', '🔨', '👕', '🍎', '🚌', '🌍', '💬', '📧', '🗂️', '🧭', '🏗️', '🎨', '🔎', '⚖️', '🚀', '🧩', '🔁', '🏦', '💵', '📇', '🌡️', '🔗', '🎯', '🧰', '⭐', '🐛'];
const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

/** Saves a text value after a pause in typing, and once more when the panel closes. */
function useAutosave(value: string, save: (value: string) => void): () => void {
  const lastSaved = useRef(value);
  const latest = useRef(value);
  const saveRef = useRef(save);

  useEffect(() => {
    saveRef.current = save;
    latest.current = value;
  });

  const flush = (): void => {
    if (latest.current === lastSaved.current) return;
    lastSaved.current = latest.current;
    saveRef.current(latest.current);
  };

  useEffect(() => {
    if (value === lastSaved.current) return;
    const timer = window.setTimeout(() => {
      lastSaved.current = value;
      saveRef.current(value);
    }, AUTOSAVE_MS);
    return () => window.clearTimeout(timer);
  }, [value]);

  useEffect(
    () => () => {
      if (latest.current !== lastSaved.current) saveRef.current(latest.current);
    },
    [],
  );

  return flush;
}

interface PropertyRowProps {
  readonly icon: ReactNode;
  readonly label: string;
  readonly children: ReactNode;
}

function PropertyRow({ icon, label, children }: PropertyRowProps) {
  return (
    <>
      <dt className="flex h-8 items-center gap-2 text-ink-dim">
        {icon}
        {label}
      </dt>
      <dd className="flex min-h-8 items-center">{children}</dd>
    </>
  );
}

interface ScorePickerProps {
  readonly label: string;
  readonly value: Score;
  readonly onChange: (value: Score) => void;
}

function ScorePicker({ label, value, onChange }: ScorePickerProps) {
  return (
    <div role="group" aria-label={label} className="inline-flex overflow-hidden rounded-md border border-rule">
      {SCORES.map((score) => (
        <button
          key={score}
          type="button"
          aria-pressed={value === score}
          aria-label={`${label} ${score}`}
          onClick={() => onChange(score)}
          className={`h-7 w-8 text-sm tabular ${value === score ? 'bg-primary font-semibold text-primary-ink' : 'text-ink-dim hover:bg-hover'}`}
        >
          {score}
        </button>
      ))}
    </div>
  );
}

interface ChecklistEditorProps {
  readonly items: readonly ChecklistItem[];
  readonly onChange: (items: readonly ChecklistItem[]) => void;
}

function ChecklistEditor({ items, onChange }: ChecklistEditorProps) {
  const [draft, setDraft] = useState('');
  const progress = checklistProgress({ checklist: items });

  const add = (): void => {
    const text = draft.trim();
    if (!text) return;
    onChange([...items, { id: crypto.randomUUID(), text, done: false }]);
    setDraft('');
  };

  return (
    <section aria-labelledby="peek-checklist" className="mt-8">
      <h3 id="peek-checklist" className="flex items-baseline gap-2 text-sm font-semibold text-ink">
        Done when
        <span className="font-normal text-ink-faint tabular">
          {progress.done}/{progress.total}
        </span>
      </h3>
      <ul className="mt-2 space-y-1">
        {items.map((entry) => (
          <li key={entry.id} className="group flex items-start gap-2 rounded-md px-1 py-1 hover:bg-hover">
            <input
              type="checkbox"
              checked={entry.done}
              onChange={() => onChange(items.map((i) => (i.id === entry.id ? { ...i, done: !i.done } : i)))}
              aria-label={`Mark “${entry.text}” as ${entry.done ? 'not done' : 'done'}`}
              className="mt-1 size-4 shrink-0 accent-primary"
            />
            <input
              defaultValue={entry.text}
              aria-label="Criterion"
              onBlur={(event) => {
                const text = event.target.value.trim();
                if (!text) onChange(items.filter((i) => i.id !== entry.id));
                else if (text !== entry.text) onChange(items.map((i) => (i.id === entry.id ? { ...i, text } : i)));
              }}
              className={`min-w-0 flex-1 bg-transparent text-sm focus:outline-none ${entry.done ? 'text-ink-faint line-through' : 'text-ink'}`}
            />
            <button
              type="button"
              aria-label={`Remove “${entry.text}”`}
              onClick={() => onChange(items.filter((i) => i.id !== entry.id))}
              className="invisible grid size-5 place-items-center rounded text-ink-faint hover:text-ink group-hover:visible focus-visible:visible"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      <label htmlFor="peek-new-criterion" className="sr-only">
        Add a criterion
      </label>
      <input
        id="peek-new-criterion"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            add();
          }
        }}
        onBlur={add}
        placeholder="+ Add a criterion"
        className="mt-1 w-full rounded-md bg-transparent px-1 py-1 text-sm text-ink placeholder:text-ink-faint hover:bg-hover focus:bg-hover focus:outline-none"
      />
    </section>
  );
}

interface ItemPeekProps {
  readonly item: TrackerItem;
  readonly onClose: () => void;
  readonly onUpdate: (patch: ItemPatch) => void;
  readonly onArchive: () => void;
}

export function ItemPeek({ item, onClose, onUpdate, onArchive }: ItemPeekProps) {
  const [title, setTitle] = useState(item.title);
  const [summary, setSummary] = useState(item.summary);
  const [body, setBody] = useState(item.body);
  const [editingBody, setEditingBody] = useState(item.body.trim().length === 0);
  const [showEmojis, setShowEmojis] = useState(false);
  const [copied, setCopied] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const openedUntitled = useRef(item.title === 'Untitled');

  const flushTitle = useAutosave(title, (value) => value.trim() && onUpdate({ title: value.trim() }));
  const flushSummary = useAutosave(summary, (value) => onUpdate({ summary: value.trim() }));
  const flushBody = useAutosave(body, (value) => onUpdate({ body: value }));

  // Focus runs once per opened item (the parent keys this panel by item id) and returns focus on close.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    if (openedUntitled.current) titleRef.current?.select();
    else panelRef.current?.focus();
    return () => previous?.focus?.();
  }, []);

  useLayoutEffect(() => {
    const element = titleRef.current;
    if (!element) return;
    element.style.height = 'auto';
    element.style.height = `${element.scrollHeight}px`;
  }, [title]);

  const copyLink = async (): Promise<void> => {
    const url = new URL(window.location.href);
    url.searchParams.set('item', item.id);
    try {
      await navigator.clipboard.writeText(url.toString());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  const onTitleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key === 'Enter') {
      event.preventDefault();
      event.currentTarget.blur();
    }
  };

  const iconClass = 'size-4 shrink-0';

  return (
    <aside
      ref={panelRef}
      tabIndex={-1}
      aria-labelledby="peek-title"
      className="peek-enter fixed inset-y-0 right-0 z-40 flex w-full flex-col border-l border-rule bg-paper shadow-float focus:outline-none sm:w-[min(640px,100vw)]"
    >
      <div className="flex h-12 shrink-0 items-center gap-1 border-b border-rule px-3 text-sm text-ink-dim">
        <span className="tabular">{item.key}</span>
        <div className="ml-auto flex items-center gap-1">
          <button type="button" onClick={copyLink} className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 hover:bg-hover hover:text-ink">
            <Link2 className={iconClass} aria-hidden="true" />
            {copied ? 'Link copied' : 'Copy link'}
          </button>
          <button type="button" onClick={onArchive} className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 hover:bg-hover hover:text-danger">
            <Trash2 className={iconClass} aria-hidden="true" />
            Move to trash
          </button>
          <button type="button" onClick={onClose} aria-label="Close (Esc)" className="grid size-8 place-items-center rounded-md hover:bg-hover hover:text-ink">
            <X className={iconClass} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pt-8 pb-16 sm:px-12">
        <div className="relative">
          <button
            type="button"
            aria-label="Change icon"
            aria-expanded={showEmojis}
            onClick={() => setShowEmojis((value) => !value)}
            className="grid size-14 place-items-center rounded-lg text-[2.4rem] leading-none hover:bg-hover"
          >
            {item.icon}
          </button>
          {showEmojis ? (
            <div className="absolute z-10 mt-1 grid w-[296px] grid-cols-8 gap-0.5 rounded-lg border border-rule bg-paper p-2 shadow-float">
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  aria-label={`Use ${emoji}`}
                  onClick={() => {
                    onUpdate({ icon: emoji });
                    setShowEmojis(false);
                  }}
                  className="grid size-8 place-items-center rounded text-lg hover:bg-hover"
                >
                  {emoji}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <label htmlFor="peek-title" className="sr-only">
          Title
        </label>
        <textarea
          id="peek-title"
          ref={titleRef}
          rows={1}
          value={title}
          maxLength={200}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={onTitleKeyDown}
          onBlur={flushTitle}
          className="mt-3 block w-full resize-none overflow-hidden bg-transparent font-display text-[2rem] leading-[1.15] font-semibold tracking-[-0.02em] text-ink placeholder:text-ink-faint focus:outline-none"
          placeholder="Untitled"
        />
        <label htmlFor="peek-summary" className="sr-only">
          One-line summary
        </label>
        <input
          id="peek-summary"
          value={summary}
          maxLength={300}
          onChange={(event) => setSummary(event.target.value)}
          onBlur={flushSummary}
          placeholder="Add a one-line summary"
          className="mt-2 w-full bg-transparent text-[15px] text-ink-dim placeholder:text-ink-faint focus:outline-none"
        />

        <dl className="mt-6 grid grid-cols-[132px_1fr] gap-x-2 gap-y-0.5 text-sm">
          <PropertyRow icon={<CircleDot className={iconClass} aria-hidden="true" />} label="Status">
            <PropertySelect label="Status" value={item.status} options={STATUSES} meta={STATUS_META} onChange={(status) => onUpdate({ status })} />
          </PropertyRow>
          <PropertyRow icon={<Flag className={iconClass} aria-hidden="true" />} label="Priority">
            <PropertySelect label="Priority" value={item.priority} options={PRIORITIES} meta={PRIORITY_META} onChange={(priority) => onUpdate({ priority })} />
          </PropertyRow>
          <PropertyRow icon={<Layers className={iconClass} aria-hidden="true" />} label="Phase">
            <PropertySelect label="Phase" value={item.phase} options={PHASES} meta={PHASE_META} onChange={(phase) => onUpdate({ phase })} />
          </PropertyRow>
          <PropertyRow icon={<Shapes className={iconClass} aria-hidden="true" />} label="Area">
            <PropertySelect label="Area" value={item.area} options={AREAS} meta={AREA_META} onChange={(area) => onUpdate({ area })} />
          </PropertyRow>
          <PropertyRow icon={<Gauge className={iconClass} aria-hidden="true" />} label="Effort">
            <PropertySelect label="Effort" value={item.effort} options={EFFORTS} meta={EFFORT_META} onChange={(effort) => onUpdate({ effort })} />
          </PropertyRow>
          <PropertyRow icon={<Hash className={iconClass} aria-hidden="true" />} label="Impact">
            <ScorePicker label="Impact" value={item.impact} onChange={(impact) => onUpdate({ impact })} />
          </PropertyRow>
          <PropertyRow icon={<Hash className={iconClass} aria-hidden="true" />} label="Confidence">
            <ScorePicker label="Confidence" value={item.confidence} onChange={(confidence) => onUpdate({ confidence })} />
          </PropertyRow>
          <PropertyRow icon={<Gauge className={iconClass} aria-hidden="true" />} label="ICE score">
            <span className="px-1 text-ink tabular" title="Impact × confidence ÷ effort points">
              {iceScore(item).toFixed(1)}
            </span>
          </PropertyRow>
          <PropertyRow icon={<User className={iconClass} aria-hidden="true" />} label="Owner">
            <input
              defaultValue={item.owner}
              aria-label="Owner"
              maxLength={80}
              placeholder="Empty"
              onBlur={(event) => event.target.value.trim() !== item.owner && onUpdate({ owner: event.target.value.trim() })}
              className="w-full rounded-md bg-transparent px-1 py-1 text-ink placeholder:text-ink-faint hover:bg-hover focus:bg-hover focus:outline-none"
            />
          </PropertyRow>
          <PropertyRow icon={<Tags className={iconClass} aria-hidden="true" />} label="Tags">
            <input
              defaultValue={item.tags.join(', ')}
              aria-label="Tags, separated by commas"
              placeholder="Empty"
              onBlur={(event) => {
                const tags = event.target.value
                  .split(',')
                  .map((tag) => tag.trim())
                  .filter(Boolean)
                  .slice(0, 12);
                if (tags.join(',') !== item.tags.join(',')) onUpdate({ tags });
              }}
              className="w-full rounded-md bg-transparent px-1 py-1 text-ink placeholder:text-ink-faint hover:bg-hover focus:bg-hover focus:outline-none"
            />
          </PropertyRow>
          <PropertyRow icon={<CalendarClock className={iconClass} aria-hidden="true" />} label="Updated">
            <span className="px-1 text-ink-dim tabular" suppressHydrationWarning>
              {dateFormat.format(new Date(item.updatedAt))}
            </span>
          </PropertyRow>
        </dl>

        <ChecklistEditor items={item.checklist} onChange={(checklist) => onUpdate({ checklist })} />

        <section aria-labelledby="peek-notes" className="mt-8 border-t border-rule pt-6">
          <div className="flex items-center gap-1">
            <h3 id="peek-notes" className="mr-auto text-sm font-semibold text-ink">
              Notes
            </h3>
            <button
              type="button"
              aria-pressed={editingBody}
              onClick={() => setEditingBody(true)}
              className={`rounded-md px-2 py-1 text-xs ${editingBody ? 'bg-hover text-ink' : 'text-ink-dim hover:bg-hover'}`}
            >
              Write
            </button>
            <button
              type="button"
              aria-pressed={!editingBody}
              onClick={() => {
                flushBody();
                setEditingBody(false);
              }}
              className={`rounded-md px-2 py-1 text-xs ${!editingBody ? 'bg-hover text-ink' : 'text-ink-dim hover:bg-hover'}`}
            >
              Preview
            </button>
          </div>
          {editingBody ? (
            <>
              <label htmlFor="peek-body" className="sr-only">
                Notes in Markdown
              </label>
              <textarea
                id="peek-body"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                onBlur={flushBody}
                placeholder="Write notes in Markdown: **bold**, lists, links…"
                className="mt-3 min-h-60 w-full resize-y rounded-lg border border-rule bg-paper p-3 font-mono text-[13px] leading-relaxed text-ink placeholder:text-ink-faint focus:border-primary focus:outline-none"
              />
            </>
          ) : (
            <Markdown source={body || '_No notes yet._'} className="mt-3" />
          )}
        </section>
      </div>
    </aside>
  );
}
