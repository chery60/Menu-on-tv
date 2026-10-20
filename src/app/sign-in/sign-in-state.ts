/** What the sign-in actions return. Kept out of actions.ts: a 'use server' file may only export async functions. */

export type StartState =
  | { readonly status: 'idle' }
  | { readonly status: 'error'; readonly message: string }
  | {
      readonly status: 'code-sent';
      readonly challengeId: string;
      /** The address as we show it back: "+91 98765 43210". */
      readonly destination: string;
      readonly channel: 'phone' | 'email';
      readonly resendAt: string;
      /** Development only, when no SMS or email provider is set up. */
      readonly devCode?: string;
    };

export type VerifyState = { readonly status: 'idle' } | { readonly status: 'error'; readonly message: string; readonly needsNewCode: boolean };

export const START_IDLE: StartState = { status: 'idle' };
export const VERIFY_IDLE: VerifyState = { status: 'idle' };
