import type { Metadata } from 'next';
import QRCode from 'qrcode';
import { BrandLogo } from '@/components/brand/brand-mark';
import { siteConfig } from '@/config/site';
import { leaveBehindCard as copy } from '@/content/site-content';
import { PrintButton } from './print-button';
import './kit.css';

export const metadata: Metadata = {
  title: 'Leave-behind cards',
  robots: { index: false, follow: false },
};

const CARDS_PER_SHEET = 10;

/** The field kit's leave-behind cards (MT-13): print, cut, and leave one with each owner after a demo. */
export default async function KitPage() {
  const qr = await QRCode.toString(siteConfig.url, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#161412', light: '#ffffff' } });
  const host = new URL(siteConfig.url).host;
  return (
    <main className="kit">
      <header className="kit-head">
        <h1 className="kit-title">{copy.pageTitle}</h1>
        <p>{copy.howToPrint}</p>
        <PrintButton label={copy.print} />
      </header>
      <div className="kit-sheet">
        {Array.from({ length: CARDS_PER_SHEET }, (_, index) => (
          <article key={index} className="kit-card">
            <div className="kit-card-text">
              <BrandLogo className="kit-logo" />
              <p className="kit-headline">{copy.headline}</p>
              <ul className="kit-points">
                {copy.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
              <p className="kit-contact">{copy.contact} ______________</p>
            </div>
            <div className="kit-card-scan">
              <div className="kit-qr" dangerouslySetInnerHTML={{ __html: qr }} />
              <p className="kit-scan">{copy.scan}</p>
              <p className="kit-host">{host}</p>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
