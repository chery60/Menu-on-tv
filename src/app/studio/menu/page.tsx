import type { Metadata } from 'next';
import { Suspense } from 'react';
import { OwnerFrame } from '@/components/owner/owner-frame';
import { requireRestaurant } from '@/features/accounts/session';
import { MenuEditor } from '@/features/menu/components/menu-editor';
import { canReadMenuPhotos } from '@/features/menu/photo-reader';
import { getMenusRepository } from '@/features/menu/repository';
import { getScreensRepository } from '@/features/screens/repository';
import { localClock } from '@/lib/local-date';

export const metadata: Metadata = {
  title: 'Menu',
  robots: { index: false, follow: false },
};

/** What the preview looks like before the owner has a screen: the most common choice. */
const DEFAULT_PREVIEW = { name: 'A Split screen', layout: 'split', theme: 'paper', bilingual: false } as const;

async function MenuContent() {
  const { restaurant } = await requireRestaurant('/studio/menu');
  const now = new Date();
  const [menu, screens] = await Promise.all([getMenusRepository().get(restaurant.id, now), getScreensRepository().listScreens(restaurant.id)]);
  const [first] = screens;
  return (
    <MenuEditor
      initialMenu={menu}
      clock={localClock(now, restaurant.outlets[0].timeZone)}
      profile={{ name: restaurant.name, tagline: restaurant.tagline }}
      previewScreen={first ? { name: first.name, layout: first.layout, theme: first.theme, bilingual: first.bilingual, timing: first.timing } : DEFAULT_PREVIEW}
      canReadPhotos={canReadMenuPhotos()}
    />
  );
}

export default function MenuPage() {
  return (
    <OwnerFrame current="menu">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-panel bg-page" aria-label="Loading the menu" />}>
        <MenuContent />
      </Suspense>
    </OwnerFrame>
  );
}
