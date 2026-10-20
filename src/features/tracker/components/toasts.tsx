import { X } from 'lucide-react';
import type { Toast } from '../client/use-tracker';

interface ToastsProps {
  readonly toasts: readonly Toast[];
  readonly onDismiss: (id: number) => void;
}

export function Toasts({ toasts, onDismiss }: ToastsProps) {
  return (
    <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-0 bottom-5 z-50 flex flex-col items-center gap-2 px-4">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex max-w-md items-center gap-3 rounded-lg px-4 py-2.5 text-sm shadow-float ${
            toast.tone === 'error' ? 'bg-danger text-white' : 'bg-ink text-paper'
          }`}
        >
          <span>{toast.message}</span>
          {toast.action ? (
            <button
              type="button"
              onClick={() => {
                toast.action?.run();
                onDismiss(toast.id);
              }}
              className="rounded px-1.5 py-0.5 font-semibold underline underline-offset-2 hover:no-underline"
            >
              {toast.action.label}
            </button>
          ) : null}
          <button type="button" aria-label="Dismiss" onClick={() => onDismiss(toast.id)} className="opacity-70 hover:opacity-100">
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}
