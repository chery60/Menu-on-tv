/** What an owner console action returns. Kept out of actions.ts: a 'use server' file may only export async functions. */

export interface IssuedLink {
  readonly url: string;
  readonly qrSvg: string;
}

export interface ActionState {
  readonly status: 'idle' | 'ok' | 'error';
  readonly message?: string;
  readonly issued?: IssuedLink;
}

export const IDLE: ActionState = { status: 'idle' };
