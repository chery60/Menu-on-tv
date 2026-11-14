import { aboveTabBar } from '@/components/owner/ui';

export type SaveStatus = { readonly kind: 'idle' } | { readonly kind: 'saving' } | { readonly kind: 'saved' } | { readonly kind: 'error'; readonly message: string };

/** The menu editor's one line about saving: "Saving…", "Saved…" or the error, fixed at the foot of the screen. */
export function SaveBar({ status }: { readonly status: SaveStatus }) {
  const text = status.kind === 'saving' ? 'Saving…' : status.kind === 'saved' ? 'Saved. Your TVs update within seconds.' : status.kind === 'error' ? status.message : '';
  return (
    <div className={`pointer-events-none fixed inset-x-0 ${aboveTabBar} z-20 flex justify-center px-4 pb-4`}>
      <p
        role={status.kind === 'error' ? 'alert' : 'status'}
        className={`rounded-control px-4 py-2 text-sm font-semibold shadow-tv ${text ? '' : 'sr-only'} ${status.kind === 'error' ? 'bg-masala text-white' : 'bg-night text-white'}`}
      >
        {text}
      </p>
    </div>
  );
}
