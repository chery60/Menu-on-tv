'use client';

import { Check, Copy } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useState } from 'react';
import { IDLE, type IssuedLink } from '@/app/studio/action-state';
import { connectTvAction, createScreenAction, disconnectTvAction, removeScreenAction, rotateLinkAction, updateScreenAction } from '@/app/studio/actions';
import { setSoldOutAction } from '@/app/studio/menu/actions';
import { Busy, Feedback, field, hint, label, primary, quiet } from '@/components/owner/ui';
import { DEFAULT_TIMING, TIMING_CHOICES, type LoopTiming } from '@/features/screen/loop';
import { LAYOUTS, THEMES, type LayoutId, type ThemeId } from '@/features/screen/types';

/** A link shown once, with a QR and a copy button. Only its hash is kept on our side. */
function IssuedLinkCard({ issued }: { readonly issued: IssuedLink }) {
  const [copied, setCopied] = useState(false);
  const copy = (): void => {
    void navigator.clipboard?.writeText(issued.url).then(() => setCopied(true));
  };
  return (
    <div className="mt-4 flex flex-col gap-4 rounded-card bg-telly-soft p-4 sm:flex-row sm:items-center">
      <span className="block w-32 shrink-0 rounded-control bg-white p-2" role="img" aria-label="QR code for the screen link" dangerouslySetInnerHTML={{ __html: issued.qrSvg }} />
      <div className="min-w-0">
        <p className="text-sm font-semibold">This link is shown once. Open it on the TV, or save it somewhere safe.</p>
        <p className="mt-2 break-all font-mono text-[0.8rem] text-night-soft">{issued.url}</p>
        <button type="button" onClick={copy} className={`${quiet} mt-3`}>
          {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
          {copied ? 'Copied' : 'Copy link'}
        </button>
      </div>
    </div>
  );
}

const seconds = (value: number, recommended: number): string => `${value} seconds${value === recommended ? ' (recommended)' : ''}`;

function ScreenFields({ name = '', layout = 'split', theme = 'paper', bilingual = false, timing = DEFAULT_TIMING, idPrefix }: {
  readonly name?: string;
  readonly layout?: LayoutId;
  readonly theme?: ThemeId;
  readonly timing?: LoopTiming;
  readonly bilingual?: boolean;
  readonly idPrefix: string;
}) {
  // The description under each choice follows what the owner picks, so "Split" or "Night" means something.
  const [layoutChoice, setLayoutChoice] = useState(layout);
  const [themeChoice, setThemeChoice] = useState(theme);
  return (
    <div className="grid gap-4 sm:grid-cols-[1.4fr_1fr_1fr]">
      <div>
        <label htmlFor={`${idPrefix}-name`} className={label}>
          Name
        </label>
        <input id={`${idPrefix}-name`} name="name" required maxLength={60} defaultValue={name} placeholder="For example, Counter TV" className={field} />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-layout`} className={label}>
          Layout
        </label>
        <select id={`${idPrefix}-layout`} name="layout" defaultValue={layout} onChange={(event) => setLayoutChoice(event.currentTarget.value as LayoutId)} className={field}>
          {LAYOUTS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
        <p className={hint}>{LAYOUTS.find((option) => option.id === layoutChoice)?.summary}</p>
      </div>
      <div>
        <label htmlFor={`${idPrefix}-theme`} className={label}>
          Colours
        </label>
        <select id={`${idPrefix}-theme`} name="theme" defaultValue={theme} onChange={(event) => setThemeChoice(event.currentTarget.value as ThemeId)} className={field}>
          {THEMES.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
        <p className={hint}>{THEMES.find((option) => option.id === themeChoice)?.summary}</p>
      </div>
      <div>
        <label htmlFor={`${idPrefix}-menu-seconds`} className={label}>
          Each menu page stays up
        </label>
        <select id={`${idPrefix}-menu-seconds`} name="menuSeconds" defaultValue={timing.menuSeconds} className={field}>
          {TIMING_CHOICES.menuSeconds.map((value) => (
            <option key={value} value={value}>
              {seconds(value, DEFAULT_TIMING.menuSeconds)}
            </option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={`${idPrefix}-promo-seconds`} className={label}>
          Each promo stays up
        </label>
        <select id={`${idPrefix}-promo-seconds`} name="promoSeconds" defaultValue={timing.promoSeconds} className={field}>
          {TIMING_CHOICES.promoSeconds.map((value) => (
            <option key={value} value={value}>
              {seconds(value, DEFAULT_TIMING.promoSeconds)}
            </option>
          ))}
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm font-semibold sm:col-span-3">
        <input type="checkbox" name="bilingual" defaultChecked={bilingual} className="size-4 accent-night" />
        Show Hindi names next to English
      </label>
    </div>
  );
}

export function CreateScreenForm() {
  const [state, action, pending] = useActionState(createScreenAction, IDLE);
  return (
    <form action={action}>
      <ScreenFields idPrefix="new-screen" />
      <button type="submit" className={`${primary} mt-4`} disabled={pending}>
        <Busy pending={pending}>Add screen</Busy>
      </button>
      <Feedback state={state} />
      {state.issued ? <IssuedLinkCard issued={state.issued} /> : null}
    </form>
  );
}

export function ScreenSettingsForm(props: {
  readonly screenId: string;
  readonly name: string;
  readonly layout: LayoutId;
  readonly theme: ThemeId;
  readonly bilingual: boolean;
  readonly timing?: LoopTiming;
}) {
  const [state, action, pending] = useActionState(updateScreenAction, IDLE);
  return (
    <form action={action}>
      <input type="hidden" name="screenId" value={props.screenId} />
      <ScreenFields idPrefix={`screen-${props.screenId}`} name={props.name} layout={props.layout} theme={props.theme} bilingual={props.bilingual} timing={props.timing} />
      <button type="submit" className={`${quiet} mt-3`} disabled={pending}>
        <Busy pending={pending}>Save changes</Busy>
      </button>
      <Feedback state={state} />
    </form>
  );
}

/** When to look again after connecting a TV: the TV collects its link on its next check, every 2 s or so. */
const CONNECT_REFRESH_MS = [3000, 7000, 15000] as const;

export function ConnectTvForm({ screens, initialCode }: { readonly screens: readonly { id: string; name: string }[]; readonly initialCode: string }) {
  const [state, action, pending] = useActionState(connectTvAction, IDLE);
  const connected = state.status === 'ok';
  const router = useRouter();
  useEffect(() => {
    if (!connected) return;
    if (window.location.search) window.history.replaceState(null, '', window.location.pathname);
    // The TV picks up its link a few seconds after the owner connects it; look again until it shows.
    const timers = CONNECT_REFRESH_MS.map((ms) => window.setTimeout(() => router.refresh(), ms));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [connected, router]);
  return (
    // A fresh form after each connection: an empty code box and the screens as they are now.
    <form key={connected ? `connected-${screens.length}` : 'connect'} action={action} className={`grid gap-4 sm:items-end ${screens.length === 0 ? 'sm:grid-cols-[1fr_auto]' : 'sm:grid-cols-[1fr_1.4fr_auto]'}`}>
      <div>
        <label htmlFor="connect-code" className={label}>
          Code on the TV
        </label>
        <input
          id="connect-code"
          name="code"
          required
          defaultValue={connected ? '' : initialCode}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={8}
          placeholder="ABC234"
          className={`${field} font-brand-mono text-xl tracking-[0.2em] uppercase`}
        />
      </div>
      {screens.length === 0 ? (
        // The first TV gets a screen with the usual look; the owner can change it once it plays.
        <input type="hidden" name="screenId" value="new" />
      ) : (
        <div>
          <label htmlFor="connect-screen" className={label}>
            Show on this TV
          </label>
          <select id="connect-screen" name="screenId" className={field} defaultValue={screens[0].id}>
            {screens.map((screen) => (
              <option key={screen.id} value={screen.id}>
                The same as {screen.name}
              </option>
            ))}
            <option value="new">A new screen with its own look</option>
          </select>
        </div>
      )}
      <button type="submit" className={primary} disabled={pending}>
        <Busy pending={pending}>Connect TV</Busy>
      </button>
      <div className="sm:col-span-full">
        <Feedback state={state} />
      </div>
    </form>
  );
}

export function TvLinkActions({ screenId, linkId, label: tvLabel }: { readonly screenId: string; readonly linkId: string; readonly label: string }) {
  const [rotated, rotate, rotating] = useActionState(rotateLinkAction, IDLE);
  const [removed, remove, removing] = useActionState(disconnectTvAction, IDLE);
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <form
          action={rotate}
          onSubmit={(event) => {
            if (!window.confirm(`Make a new link for ${tvLabel}? The TV stops showing your menu until you open the new link on it. Do this only if someone else has the old link.`)) event.preventDefault();
          }}
        >
          <input type="hidden" name="screenId" value={screenId} />
          <input type="hidden" name="linkId" value={linkId} />
          <button type="submit" className={quiet} disabled={rotating} aria-label={`Make a new link for ${tvLabel}`}>
            <Busy pending={rotating}>New link</Busy>
          </button>
        </form>
        <form
          action={remove}
          onSubmit={(event) => {
            if (!window.confirm(`Disconnect ${tvLabel}? It will stop showing the menu.`)) event.preventDefault();
          }}
        >
          <input type="hidden" name="screenId" value={screenId} />
          <input type="hidden" name="linkId" value={linkId} />
          <button type="submit" className={quiet} disabled={removing} aria-label={`Disconnect ${tvLabel}`}>
            <Busy pending={removing}>Disconnect</Busy>
          </button>
        </form>
      </div>
      <Feedback state={rotated.status !== 'idle' ? rotated : removed} />
      {rotated.issued ? <IssuedLinkCard issued={rotated.issued} /> : null}
    </div>
  );
}

export function RemoveScreenButton({ screenId, name }: { readonly screenId: string; readonly name: string }) {
  const [state, action, pending] = useActionState(removeScreenAction, IDLE);
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(`Remove ${name}? Every TV showing it will stop.`)) event.preventDefault();
      }}
    >
      <input type="hidden" name="screenId" value={screenId} />
      <button type="submit" className="text-sm font-semibold text-masala underline underline-offset-4" disabled={pending}>
        Remove screen
      </button>
      <Feedback state={state} />
    </form>
  );
}

export function SoldOutToggle({ itemId, name, soldOut }: { readonly itemId: string; readonly name: string; readonly soldOut: boolean }) {
  const [state, action, pending] = useActionState(setSoldOutAction, IDLE);
  return (
    <form action={action}>
      <input type="hidden" name="itemId" value={itemId} />
      <input type="hidden" name="soldOut" value={soldOut ? 'false' : 'true'} />
      <button
        type="submit"
        aria-pressed={soldOut}
        disabled={pending}
        className={`flex w-full items-center justify-between gap-3 rounded-control border px-3 py-2 text-left font-semibold transition-colors ${soldOut ? 'border-masala bg-masala-soft text-masala' : 'border-hairline bg-white text-night hover:border-night'}`}
      >
        <span className={soldOut ? 'line-through' : ''}>{name}</span>
        <span className="text-sm">{pending ? 'Saving…' : soldOut ? 'Sold out' : 'In stock'}</span>
      </button>
      {state.status === 'error' ? <Feedback state={state} /> : null}
    </form>
  );
}
