import 'server-only';
import QRCode from 'qrcode';
import { absoluteUrl } from '@/config/site';
import type { Restaurant } from './types';

/** Real, scannable QR codes for promos that carry a link, built once on the server. */
export async function buildQrCodes(restaurant: Restaurant): Promise<Readonly<Record<string, string>>> {
  const entries = await Promise.all(
    restaurant.promos
      .filter((promo) => promo.qrUrl)
      .map(async (promo) => {
        const url = promo.qrUrl?.startsWith('http') ? promo.qrUrl : absoluteUrl(promo.qrUrl ?? '/');
        const svg = await QRCode.toString(url, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#111111', light: '#ffffff' } });
        return [promo.id, svg] as const;
      }),
  );
  return Object.fromEntries(entries);
}
