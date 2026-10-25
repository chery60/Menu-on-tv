import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Fragment } from 'react';
import { EarlyAccess } from '@/components/home/early-access';
import { PageHead } from '@/components/pages/page-head';
import { ReadNext } from '@/components/pages/read-next';
import { TextCells } from '@/components/pages/text-cells';
import { siteConfig, typedAddress } from '@/config/site';
import { hero, menuOnTvGuide, tryBuilder } from '@/content/site-content';
import { pageMetadata } from '@/lib/page-metadata';
import { breadcrumbJsonLd, pageJsonLd, serializeJsonLd } from '@/lib/structured-data';

const page = menuOnTvGuide;

export const metadata = pageMetadata({ ...page.meta, path: page.path });

export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(pageJsonLd(breadcrumbJsonLd({ name: page.meta.title, path: page.path }))) }} />
      <PageHead title={page.title} lead={page.lead}>
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
      {page.sections.map((section) => (
        <Fragment key={section.id}>
          <TextCells section={section} />
          {section.id === 'check' ? (
            <section aria-label={page.tvCheck.label}>
              <div className="mtv-sheet mtv-band">
                <p className="mtv-mono">{typedAddress(siteConfig.url, page.tvCheck.href)}</p>
                <Link href={page.tvCheck.href} className="mtv-link">
                  {page.tvCheck.label}
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              </div>
            </section>
          ) : null}
        </Fragment>
      ))}
      <ReadNext links={page.next} />
      <EarlyAccess />
    </>
  );
}
