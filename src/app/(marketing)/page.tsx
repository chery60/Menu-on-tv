import { EarlyAccess } from '@/components/home/early-access';
import { FloorPlan } from '@/components/home/floor-plan';
import { Hero } from '@/components/home/hero';
import { LiveDemo } from '@/components/home/live-demo';
import { MadeFor } from '@/components/home/made-for';
import { Problems } from '@/components/home/problems';
import { Rules } from '@/components/home/rules';
import { Statement } from '@/components/home/statement';
import { Steps } from '@/components/home/steps';
import { TryIt } from '@/components/home/try-it';
import { Faq } from '@/components/pages/pricing-sections';
import { siteConfig } from '@/config/site';
import { DEMO_RESTAURANT } from '@/content/demo-restaurant';
import { buildQrCodes } from '@/features/screen/qr';
import { pageMetadata } from '@/lib/page-metadata';
import { homeJsonLd, serializeJsonLd } from '@/lib/structured-data';

export const metadata = pageMetadata({ title: siteConfig.title, description: siteConfig.description, path: '/', absoluteTitle: true });

/** Without JavaScript the pinned scenes can't move, so their stages stop pinning and show as they are. */
const NO_SCRIPT_STYLES = '<style>.mtv-plan,.mtv-demo,.mtv-statement{height:auto!important}.mtv-plan-stage,.mtv-demo-stage,.mtv-statement-stage{position:static!important;height:auto!important}</style>';

/**
 * The home page (docs/site-v5-plan.md): a café counter drawn in ink whose TV switches on, a sentence
 * lit word by word, the problem in four cells, a café plan that builds and gets fixed as you scroll,
 * one afternoon played on the real screen, three steps, who it's for, the screen rules and the free
 * plan, the visitor's own menu on the TV, the questions owners ask (the FAQPage JSON-LD describes them), and early access.
 */
export default async function HomePage() {
  const qrCodes = await buildQrCodes(DEMO_RESTAURANT);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(homeJsonLd()) }} />
      <noscript dangerouslySetInnerHTML={{ __html: NO_SCRIPT_STYLES }} />
      <Hero restaurant={DEMO_RESTAURANT} qrCodes={qrCodes} />
      <Statement />
      <Problems />
      <FloorPlan />
      <LiveDemo base={DEMO_RESTAURANT} />
      <Steps />
      <MadeFor />
      <Rules />
      <TryIt />
      <Faq />
      <EarlyAccess />
    </>
  );
}
