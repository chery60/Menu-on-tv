import { LoaderCircle } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * Shared look of the owner app, in the site's brand (DESIGN.md): phone-first, 44 px tap targets,
 * hairline panels on paper, square corners, one chilli action per form with ink text on it.
 */

/** The box itself; `field` adds the full width and spacing a stacked form needs. */
export const fieldBox = 'h-12 rounded-control border border-night/30 bg-page px-3 text-base text-night transition-colors hover:border-night focus:border-night focus:outline-2 focus:outline-chilli';
export const field = `mt-1.5 block w-full ${fieldBox}`;
export const label = 'font-brand-mono text-[0.8rem] text-night';
export const hint = 'mt-1 text-sm text-night-dim';
export const primary = 'inline-flex h-12 items-center justify-center gap-2 rounded-control border border-chilli bg-chilli px-5 font-semibold text-night transition-colors hover:border-night hover:bg-night hover:text-mist disabled:cursor-wait disabled:opacity-70';
export const quiet = 'inline-flex h-11 items-center justify-center gap-2 rounded-control border border-night px-4 text-sm font-semibold text-night transition-colors hover:bg-night hover:text-mist disabled:opacity-60';
export const textLink = 'font-semibold text-night underline decoration-1 underline-offset-4 hover:text-masala';
export const card = 'rounded-card border border-hairline bg-page p-5 sm:p-7';
export const heading = 'font-display text-[1.45rem] leading-tight sm:text-[1.65rem]';
/** Small mono label above a group, like the site's drawing labels. */
export const kicker = 'font-brand-mono text-[0.78rem] text-night-dim';

export interface Notice {
  readonly status: 'idle' | 'ok' | 'error';
  readonly message?: string;
}

export function Feedback({ state }: { readonly state: Notice }) {
  if (state.status === 'idle' || !state.message) return null;
  return (
    <p role={state.status === 'error' ? 'alert' : 'status'} className={`mt-3 text-sm font-semibold ${state.status === 'error' ? 'text-masala' : 'text-chutney-deep'}`}>
      {state.message}
    </p>
  );
}

export function Busy({ pending, children }: { readonly pending: boolean; readonly children: ReactNode }) {
  return (
    <>
      {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
      {children}
    </>
  );
}
