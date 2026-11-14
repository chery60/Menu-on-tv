'use client';

import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { ActionState } from '@/app/studio/action-state';
import type { MenuResult } from '@/app/studio/menu/menu-result';
import { Busy, card, heading, hint, primary, quiet } from '@/components/owner/ui';
import { closeSheet, Sheet } from '@/features/menu/components/sheet';
import { SpecialPicker } from '@/features/menu/components/special-card';
import type { Menu, MenuEdit } from '@/features/menu/schema';
import type { LocalClock } from '@/lib/local-date';
import type { Promo } from '../schema';
import { promoStatus } from '../status';
import { draftFrom, emptyDraft, priceText, promoSummary, statusLabel, TEMPLATES, type PromoDraft, type StatusTone, type TemplateChoice } from './promo-form';
import { PromoEditor } from './promo-editor';

type Action = (input: unknown) => Promise<ActionState>;

export interface PromosStudioProps {
  readonly menu: Menu;
  readonly clock: LocalClock;
  readonly promos: readonly Promo[];
  readonly isOwner: boolean;
  readonly onSave: Action;
  readonly onPause: Action;
  readonly onRemove: Action;
  readonly onSaveMenu: (edit: MenuEdit) => Promise<MenuResult>;
}

type Open = { readonly kind: 'templates' } | { readonly kind: 'edit'; readonly draft: PromoDraft; readonly id?: string } | { readonly kind: 'special' } | { readonly kind: 'remove'; readonly promo: Promo } | null;

const TONE: Readonly<Record<StatusTone, string>> = {
  live: 'border-chutney-deep text-chutney-deep',
  quiet: 'border-night/30 text-night-soft',
  warn: 'border-masala bg-masala-soft text-masala',
};
const NOTICE_SHOWN_MS = 5000;

function TemplateGrid({ onPick }: { readonly onPick: (template: TemplateChoice) => void }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {TEMPLATES.map((template) => (
        <li key={template.id}>
          <button type="button" onClick={() => onPick(template.id)} className="flex min-h-11 w-full flex-col items-start gap-0.5 rounded-card border border-night/30 bg-page p-4 text-left transition-colors hover:border-night">
            <span className="font-semibold">{template.name}</span>
            <span className="text-sm text-night-soft">{template.line}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/** The Promos page's list and sheets (MT-26). Owners make, edit, pause and remove; staff read. */
export function PromosStudio({ menu, clock, promos, isOwner, onSave, onPause, onRemove, onSaveMenu }: PromosStudioProps) {
  const router = useRouter();
  const [open, setOpen] = useState<Open>(null);
  const [notice, setNotice] = useState<{ readonly kind: 'ok' | 'error'; readonly text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (notice?.kind !== 'ok') return;
    const timer = setTimeout(() => setNotice(null), NOTICE_SHOWN_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  const pickTemplate = (template: TemplateChoice): void => setOpen(template === 'special' ? { kind: 'special' } : { kind: 'edit', draft: emptyDraft(template) });

  const run = async (key: string, action: () => Promise<ActionState>): Promise<boolean> => {
    setBusy(key);
    const result = await action();
    setBusy(null);
    setNotice({ kind: result.status === 'ok' ? 'ok' : 'error', text: result.message ?? (result.status === 'ok' ? 'Saved.' : 'That didn’t save. Try again.') });
    return result.status === 'ok';
  };

  const pickSpecial = async (itemId: string): Promise<boolean> => {
    const result = await onSaveMenu({ type: 'set-special', itemId });
    if (!result.ok) {
      setNotice({ kind: 'error', text: result.message ?? 'That didn’t save. Try again.' });
      return false;
    }
    setNotice({ kind: 'ok', text: 'Today’s special saved. Your TVs show it first within seconds.' });
    router.refresh();
    return true;
  };

  return (
    <section aria-labelledby="promos-title" className={card}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="promos-title" className={heading}>
          Your promos.
        </h2>
        {isOwner && promos.length > 0 ? (
          <button type="button" className={primary} onClick={() => setOpen({ kind: 'templates' })} disabled={promos.length >= 20}>
            <Plus className="size-4" aria-hidden="true" />
            New promo
          </button>
        ) : null}
      </div>

      {notice ? (
        <p role={notice.kind === 'error' ? 'alert' : 'status'} className={`mt-3 text-sm font-semibold ${notice.kind === 'error' ? 'text-masala' : 'text-chutney-deep'}`}>
          {notice.text}
        </p>
      ) : null}

      {promos.length === 0 ? (
        isOwner ? (
          <div className="mt-2">
            <p className={hint}>A promo is one offer, one price and one picture, played between your menu pages. Pick one to start.</p>
            <div className="mt-5">
              <TemplateGrid onPick={pickTemplate} />
            </div>
          </div>
        ) : (
          <p className={hint}>No promos yet. Only an owner can make them.</p>
        )
      ) : (
        <>
          {isOwner ? null : <p className={hint}>Only an owner can change promos.</p>}
          <ul className="mt-5 divide-y divide-hairline border-y border-hairline">
            {promos.map((promo) => {
              const status = promoStatus(promo, menu, clock);
              const tag = statusLabel(status);
              const price = priceText(promo, menu);
              return (
                <li key={promo.id} className="py-4">
                  <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                    <p className="min-w-0 font-semibold">{promo.headline}</p>
                    <span className={`rounded-control border px-2 py-0.5 text-sm font-semibold ${TONE[tag.tone]}`}>{tag.text}</span>
                  </div>
                  <p className="mt-1 text-sm text-night-soft">
                    {promoSummary(promo, menu)}
                    {price ? <span className="tabular-nums">{`, ${price}`}</span> : null}
                  </p>
                  {isOwner ? (
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <button type="button" className={quiet} onClick={() => setOpen({ kind: 'edit', draft: draftFrom(promo), id: promo.id })}>
                        Edit
                      </button>
                      {status.state === 'ended' ? null : (
                        <button type="button" className={quiet} disabled={busy === promo.id} onClick={() => void run(promo.id, () => onPause({ id: promo.id, paused: !promo.paused }))}>
                          <Busy pending={busy === promo.id}>{promo.paused ? 'Resume' : 'Pause'}</Busy>
                        </button>
                      )}
                      <button type="button" onClick={() => setOpen({ kind: 'remove', promo })} className="inline-flex h-11 items-center px-2 text-sm font-semibold text-masala underline underline-offset-4">
                        Remove
                      </button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </>
      )}

      {open?.kind === 'templates' ? (
        <Sheet title="New promo" onClose={() => setOpen(null)}>
          <TemplateGrid onPick={pickTemplate} />
        </Sheet>
      ) : null}
      {open?.kind === 'edit' ? <PromoEditor key={open.id ?? open.draft.template} menu={menu} initial={open.draft} promoId={open.id} onSave={onSave} onClose={() => setOpen(null)} onSaved={(text) => setNotice({ kind: 'ok', text })} /> : null}
      {open?.kind === 'special' ? <SpecialPicker menu={menu} today={clock.today} currentId={menu.special?.on === clock.today ? menu.special.itemId : null} onPick={pickSpecial} onClose={() => setOpen(null)} /> : null}
      {open?.kind === 'remove' ? (
        <Sheet title="Remove this promo?" onClose={() => setOpen(null)}>
          <p>
            Remove “{open.promo.headline}”? It leaves your TVs at their next slide, and you can’t get it back.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              className={primary}
              disabled={busy === 'remove'}
              onClick={async (event) => {
                const button = event.currentTarget;
                if (await run('remove', () => onRemove({ id: open.promo.id }))) closeSheet(button);
              }}
            >
              <Busy pending={busy === 'remove'}>Remove promo</Busy>
            </button>
            <button type="button" className={quiet} onClick={(event) => closeSheet(event.currentTarget)}>
              Keep it
            </button>
          </div>
        </Sheet>
      ) : null}
    </section>
  );
}
