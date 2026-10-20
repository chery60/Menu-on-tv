import { ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { EarlyAccess } from '@/components/home/early-access';
import { Rules } from '@/components/home/rules';
import { LayoutGallery, StepsDetail } from '@/components/pages/how-sections';
import { PageHead } from '@/components/pages/page-head';
import { siteConfig } from '@/config/site';
import { DEMO_RESTAURANT } from '@/content/demo-restaurant';
import { hero, howPage, tryBuilder } from '@/content/site-content';
import { buildQrCodes } from '@/features/screen/qr';

export const metadata: Metadata = {
  title: 'How it works',
  description: `${howPage.lead} Six layouts, light or dark, one link on the TV.`,
  alternates: { canonical: '/how-it-works', types: { 'text/markdown': '/index.md' } },
  openGraph: { type: 'website', url: '/how-it-works', siteName: siteConfig.name, title: `How ${siteConfig.name} works`, description: howPage.lead, locale: siteConfig.locale },
};

export default async function HowItWorksPage() {
  const qrCodes = await buildQrCodes(DEMO_RESTAURANT);

  return (
    <>
      <PageHead title={howPage.title} lead={howPage.lead}>
        <div className="mtv-actions">
          <a href={hero.primary.href} className="mtv-btn mtv-btn-primary">
            {hero.primary.label}
            <ArrowRight aria-hidden="true" />
          </a>
          <Link href={tryBuilder.href} className="mtv-btn">
            {tryBuilder.label}
          </Link>
        </div>
      </PageHead>
      <StepsDetail restaurant={DEMO_RESTAURANT} qrCodes={qrCodes} />
      <LayoutGallery restaurant={DEMO_RESTAURANT} qrCodes={qrCodes} />
      <Rules />
      <EarlyAccess />
    </>
  );
}
