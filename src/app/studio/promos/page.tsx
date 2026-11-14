import type { Metadata } from 'next';
import { Suspense } from 'react';
import { editMenuAction } from '@/app/studio/menu/actions';
import { removePromoAction, savePromoAction, setPromoPausedAction } from '@/app/studio/promos/actions';
import { OwnerFrame } from '@/components/owner/owner-frame';
import { kicker } from '@/components/owner/ui';
import { requireRestaurant } from '@/features/accounts/session';
import { TodaysSpecial } from '@/features/menu/components/special-card';
import { getMenusRepository } from '@/features/menu/repository';
import { PromosStudio } from '@/features/promos/components/promos-studio';
import { getPromosRepository } from '@/features/promos/repository';
import { localClock } from '@/lib/local-date';

export const metadata: Metadata = {
  title: 'Promos',
  robots: { index: false, follow: false },
};

async function PromosContent() {
  const { restaurant, role } = await requireRestaurant('/studio/promos');
  const now = new Date();
  const [menu, promos] = await Promise.all([getMenusRepository().get(restaurant.id, now), getPromosRepository().list(restaurant.id)]);
  const clock = localClock(now, restaurant.outlets[0].timeZone);
  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <p className={kicker}>{restaurant.name}</p>
        <h1 className="mt-1 font-display text-[clamp(2rem,6vw,3.4rem)] leading-[0.95]">Promos.</h1>
        <p className="mt-2 max-w-[40rem] text-night-soft">Offers that play beside your menu. Prices come from your menu, so they’re never out of date.</p>
      </div>
      <TodaysSpecial menu={menu} clock={clock} onSave={editMenuAction} />
      <PromosStudio menu={menu} clock={clock} promos={promos} isOwner={role === 'owner'} onSave={savePromoAction} onPause={setPromoPausedAction} onRemove={removePromoAction} onSaveMenu={editMenuAction} />
    </div>
  );
}

/** The promo studio (MT-26): today's special, then the owner's promos, made from templates and priced from the menu. */
export default function PromosPage() {
  return (
    <OwnerFrame current="promos">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-panel bg-page" aria-label="Loading promos" />}>
        <PromosContent />
      </Suspense>
    </OwnerFrame>
  );
}
