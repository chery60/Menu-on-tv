/** Prices are stored in paise and typed in rupees. */

export const MAX_PAISE = 10_000_000;

/** Reads a typed rupee amount ("80", "1,200", "₹ 49.50") into paise, or null if it isn't a price. */
export function parseRupees(typed: string): number | null {
  const text = typed.replace(/[₹,\s]/g, '').replace(/^rs\.?/i, '');
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
  const paise = Math.round(Number(text) * 100);
  return paise <= MAX_PAISE ? paise : null;
}

/** Paise as the owner types rupees: "80", "49.50". */
export function formatPaise(paise: number): string {
  return paise % 100 === 0 ? String(paise / 100) : (paise / 100).toFixed(2);
}
