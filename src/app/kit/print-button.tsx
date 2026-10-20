'use client';

/** Opens the browser's print dialog; the sheet's print styles hide everything but the cards. */
export function PrintButton({ label }: { readonly label: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="kit-print">
      {label}
    </button>
  );
}
