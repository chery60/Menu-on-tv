import { ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';
import { PlazaDemo } from '@/components/demo/plaza-demo';
import { EarlyAccess } from '@/components/home/early-access';
import { PageHead } from '@/components/pages/page-head';
import { siteConfig } from '@/config/site';
import { demoPage, hero } from '@/content/site-content';

export const metadata: Metadata = {
  title: 'Live demo',
  description: demoPage.lead,
  alternates: { canonical: '/demo', types: { 'text/markdown': '/index.md' } },
  openGraph: { type: 'website', url: '/demo', siteName: siteConfig.name, title: `${siteConfig.name} live demo`, description: demoPage.lead, locale: siteConfig.locale },
};

/** The live demo inside the site: the sample café in 3D, its menu playing on the TV out front. */
export default function DemoPage() {
  return (
    <>
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
      <section aria-labelledby="demo-notes-title">
        <div className="mtv-sheet mtv-band">
          <div className="mtv-section-head">
            <h2 id="demo-notes-title" className="mtv-h2">
              {demoPage.notesTitle}
            </h2>
          </div>
          <ol className="mtv-cells mtv-cells-3">
            {demoPage.notes.map((note, index) => (
              <li key={note.title} className="mtv-problem">
                <span className="mtv-num">{String(index + 1).padStart(2, '0')}</span>
                <h3 className="mtv-h3">{note.title}</h3>
                <p className="mtv-body">{note.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <EarlyAccess />
    </>
  );
}
