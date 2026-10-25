import { ArrowRight } from 'lucide-react';
import { PlazaDemo } from '@/components/demo/plaza-demo';
import { EarlyAccess } from '@/components/home/early-access';
import { PageHead } from '@/components/pages/page-head';
import { TextCells } from '@/components/pages/text-cells';
import { demoPage, hero } from '@/content/site-content';
import { pageMetadata } from '@/lib/page-metadata';
import { breadcrumbJsonLd, pageJsonLd, serializeJsonLd } from '@/lib/structured-data';

const NOTES = { id: 'demo-notes', title: demoPage.notesTitle, items: demoPage.notes, numbered: true } as const;

const PATH = '/demo';

export const metadata = pageMetadata({ ...demoPage.meta, path: PATH });

/** The live demo inside the site: the sample café in 3D, its menu playing on the TV out front. */
export default function DemoPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(pageJsonLd(breadcrumbJsonLd({ name: demoPage.meta.title, path: PATH }))) }} />
      <PageHead title={demoPage.title} lead={demoPage.lead}>
        <div className="mtv-actions">
          <a href={hero.primary.href} className="mtv-btn mtv-btn-primary">
            {hero.primary.label}
            <ArrowRight aria-hidden="true" />
          </a>
        </div>
      </PageHead>
      <section className="mtv-plaza-section" aria-label={demoPage.sceneLabel}>
        <div className="mtv-sheet">
          <PlazaDemo labels={demoPage} />
        </div>
      </section>
      <TextCells section={NOTES} />
      <EarlyAccess />
    </>
  );
}
