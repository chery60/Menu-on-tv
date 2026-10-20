'use client';

import { X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';

/** A modal sheet: slides up from the bottom on a phone, a centred dialog on a larger screen. Esc and the X close it. */
export function Sheet({ title, onClose, children }: { readonly title: string; readonly onClose: () => void; readonly children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    // showModal focuses the first button (Close); start on the field marked to take focus instead.
    dialog?.querySelector<HTMLElement>('[data-autofocus]')?.focus();
  }, []);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="sheet-title"
      className="m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-y-auto rounded-t-panel bg-page p-0 text-night backdrop:bg-night/50 sm:m-auto sm:max-w-xl sm:rounded-panel"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-hairline bg-page px-5 py-3">
        <h2 id="sheet-title" className="text-lg font-bold">
          {title}
        </h2>
        <button type="button" onClick={() => ref.current?.close()} className="grid size-11 place-items-center rounded-control hover:bg-mist" aria-label="Close">
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>
      <div className="px-5 pt-4 pb-6">{children}</div>
    </dialog>
  );
}

export function closeSheet(element: HTMLElement | null): void {
  element?.closest('dialog')?.close();
}
