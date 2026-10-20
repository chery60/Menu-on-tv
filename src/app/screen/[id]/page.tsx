import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { DEMO_RESTAURANT } from '@/content/demo-restaurant';
import { demoPage } from '@/content/site-content';
import { ScreenPlayer } from '@/features/screen/components/screen-player';
import { buildQrCodes } from '@/features/screen/qr';
import { isLayoutId, isThemeId, upgradeThemeId } from '@/features/screen/types';
import { BackLink } from './back-link';

export const metadata: Metadata = {
  title: 'Live demo screen',
  description: 'The MenuOnTV demo café, running full screen the way a restaurant TV shows it.',
  robots: { index: false, follow: true },
};

type Params = Promise<{ id: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

interface ScreenPageProps {
  readonly params: Params;
  readonly searchParams: SearchParams;
}

/** Only the demo screen exists until restaurant accounts ship (tracker MT-21 and MT-22). */
const SCREEN_IDS = ['demo'] as const;

export function generateStaticParams(): { id: string }[] {
  return SCREEN_IDS.map((id) => ({ id }));
}

async function Screen({ params, searchParams }: ScreenPageProps) {
  const { id } = await params;
  if (!(SCREEN_IDS as readonly string[]).includes(id)) notFound();
  const query = await searchParams;
  const qrCodes = await buildQrCodes(DEMO_RESTAURANT);
  // Old links with ?theme=chalk, neon or fresh open in the brand theme that replaced it.
  const theme = upgradeThemeId(query.theme);

  return (
    <ScreenPlayer
      restaurant={DEMO_RESTAURANT}
      layout={isLayoutId(query.layout) ? query.layout : 'split'}
      theme={isThemeId(theme) ? theme : 'paper'}
      bilingual={query.lang === 'hi'}
      qrCodes={qrCodes}
    >
      <BackLink href={demoPage.backFromScreen.href} label={demoPage.backFromScreen.label} />
    </ScreenPlayer>
  );
}

// URL data is read inside Suspense (Partial Prefetching), so an unknown id streams the not-found page.
export default function ScreenPage({ params, searchParams }: ScreenPageProps) {
  return (
    <Suspense fallback={<div className="fixed inset-0 bg-black" />}>
      <Screen params={params} searchParams={searchParams} />
    </Suspense>
  );
}
