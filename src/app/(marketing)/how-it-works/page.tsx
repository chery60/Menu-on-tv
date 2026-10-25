import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { EarlyAccess } from '@/components/home/early-access';
import { Rules } from '@/components/home/rules';
import { LayoutGallery, StepsDetail } from '@/components/pages/how-sections';
import { PageHead } from '@/components/pages/page-head';
import { ReadNext } from '@/components/pages/read-next';
import { DEMO_RESTAURANT } from '@/content/demo-restaurant';
import { hero, howPage, tryBuilder } from '@/content/site-content';
import { buildQrCodes } from '@/features/screen/qr';
import { pageMetadata } from '@/lib/page-metadata';
import { breadcrumbJsonLd, pageJsonLd, serializeJsonLd } from '@/lib/structured-data';

const PATH = '/how-it-works';

export const metadata = pageMetadata({ ...howPage.meta, path: PATH });

export default async function HowItWorksPage() {
  const qrCodes = await buildQrCodes(DEMO_RESTAURANT);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(pageJsonLd(breadcrumbJsonLd({ name: howPage.meta.title, path: PATH }))) }} />
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
      <ReadNext links={howPage.next} />
      <EarlyAccess />
    </>
  );
}
