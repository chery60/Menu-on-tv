import type { Metadata } from 'next';
import Link from 'next/link';
import { EarlyAccess } from '@/components/home/early-access';
import { PageHead } from '@/components/pages/page-head';
import { Comparison, Earn, Faq, Plans } from '@/components/pages/pricing-sections';
import { siteConfig } from '@/config/site';
import { pricing, pricingPage, tryBuilder } from '@/content/site-content';

export const metadata: Metadata = {
  title: 'Prices',
  description: `${pricing.title} Plus ₹499 and Pro ₹999 per screen a month. ${pricing.lead}`,
  alternates: { canonical: '/pricing', types: { 'text/markdown': '/index.md' } },
  openGraph: { type: 'website', url: '/pricing', siteName: siteConfig.name, title: `${siteConfig.name} prices`, description: pricing.lead, locale: siteConfig.locale },
};

export default function PricingPage() {
  return (
    <>
      <PageHead title={pricingPage.title} lead={pricingPage.lead}>
        <div className="mtv-actions">
          <Link href={tryBuilder.href} className="mtv-btn">
            {tryBuilder.label}
          </Link>
        </div>
      </PageHead>
      <Plans />
      <Comparison />
      <Earn />
      <Faq />
      <EarlyAccess />
    </>
  );
}
