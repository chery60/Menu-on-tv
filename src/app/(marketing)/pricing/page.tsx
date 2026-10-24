import Link from 'next/link';
import { EarlyAccess } from '@/components/home/early-access';
import { PageHead } from '@/components/pages/page-head';
import { Comparison, Earn, Faq, Plans } from '@/components/pages/pricing-sections';
import { ReadNext } from '@/components/pages/read-next';
import { faq, pricingPage, tryBuilder } from '@/content/site-content';
import { pageMetadata } from '@/lib/page-metadata';
import { breadcrumbJsonLd, faqPageJsonLd, pageJsonLd, serializeJsonLd } from '@/lib/structured-data';

const PATH = '/pricing';

export const metadata = pageMetadata({ ...pricingPage.meta, path: PATH });

export default function PricingPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(pageJsonLd(breadcrumbJsonLd({ name: pricingPage.meta.title, path: PATH }), faqPageJsonLd(faq.items))) }} />
      <PageHead title={pricingPage.title} lead={pricingPage.lead}>
        <div className="mtv-actions">
          <Link href={tryBuilder.href} className="mtv-btn">
            {tryBuilder.label}
          </Link>
        </div>
      </PageHead>
      <Plans />
      <Comparison table={pricingPage.cost} id="cost" />
      <Comparison />
      <Earn />
      <Faq />
      <ReadNext links={pricingPage.next} />
      <EarlyAccess />
    </>
  );
}
