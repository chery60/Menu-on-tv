import { ArrowRight, Check } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { OwnerFrame } from '@/components/owner/owner-frame';
import { card, heading, kicker, quiet, textLink } from '@/components/owner/ui';
import { requireRestaurant } from '@/features/accounts/session';
import { isSoldOut } from '@/features/menu/edit';
import { MenuPreview } from '@/features/menu/components/menu-preview';
import { canReadMenuPhotos } from '@/features/menu/photo-reader';
import { getMenusRepository } from '@/features/menu/repository';
import type { Menu } from '@/features/menu/schema';
import { SoldOutToggle } from '@/features/screens/components/studio-forms';
import { getScreensRepository } from '@/features/screens/repository';
import { tvStatus } from '@/features/screens/status';
import { typedAddress } from '@/config/site';
import { localClock } from '@/lib/local-date';
import { requestOrigin } from '@/lib/origin';

export const metadata: Metadata = {
  title: 'Today',
  robots: { index: false, follow: false },
};

interface StudioPageProps {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** What the preview plays before the owner has a screen: the most common choice. */
const DEFAULT_PREVIEW = { name: 'Your first screen', layout: 'split', theme: 'paper', bilingual: false } as const;

function GetStarted({ hasMenu, hasTv, pairAddress }: { readonly hasMenu: boolean; readonly hasTv: boolean; readonly pairAddress: string }) {
  const steps = [
    { done: hasMenu, href: '/studio/menu', text: 'Add your menu', detail: canReadMenuPhotos() ? 'Photograph it, paste it, or type the dishes and prices.' : 'Paste it, or type the dishes and prices.' },
    { done: hasTv, href: '/studio/tvs', text: 'Connect your TV', detail: `On the TV, open its internet app and go to ${pairAddress}. Type the code it shows on the TVs tab.` },
    { done: hasMenu && hasTv, href: '/studio', text: 'Watch it play', detail: 'The TV shows up as on air, and this page shows what it plays.' },
  ];
  return (
    <section aria-labelledby="start-title" className={`${card} border-chilli`}>
      <p className={kicker}>Your first screen</p>
      <h2 id="start-title" className={`${heading} mt-1`}>
        Three steps, about ten minutes.
      </h2>
      <ol className="mt-5 grid gap-px overflow-hidden border border-hairline bg-hairline sm:grid-cols-3">
        {steps.map((step, index) => (
          <li key={step.text} className="flex items-start gap-3 bg-page p-4">
            <span aria-hidden="true" className={`grid size-8 shrink-0 place-items-center font-brand-mono text-sm font-bold ${step.done ? 'bg-chutney text-white' : 'border border-night'}`}>
              {step.done ? <Check className="size-4" /> : String(index + 1).padStart(2, '0')}
            </span>
            <span>
              <Link href={step.href} className={step.done ? 'font-semibold text-night-dim line-through' : textLink}>
                {step.text}
              </Link>
              <span className="sr-only">{step.done ? ' (done)' : ''}</span>
              <span className="mt-0.5 block text-sm text-night-dim">{step.detail}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function SoldOutToday({ menu, today }: { readonly menu: Menu; readonly today: string }) {
  const categories = menu.categories.map((category) => ({ ...category, items: category.items.filter((item) => !item.hidden) })).filter((category) => category.items.length > 0);
  const out = categories.flatMap((category) => category.items).filter((item) => isSoldOut(item, today)).length;
  return (
    <section aria-labelledby="sold-title" className={card}>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="sold-title" className={heading}>
          Sold out today.
        </h2>
        {categories.length > 0 ? <p className={kicker}>{out === 0 ? 'Everything is available' : `${out} sold out`}</p> : null}
      </div>
      {categories.length === 0 ? (
        <p className="mt-2 text-night-soft">
          Nothing on the menu yet. <Link href="/studio/menu" className={textLink}>Add your menu</Link> and it shows here.
        </p>
      ) : (
        <>
          <p className="mt-2 max-w-[44rem] text-night-soft">Tap a dish when it runs out. Every TV shows “Sold out” within seconds, and it comes back by itself tomorrow.</p>
          <div className="mt-5 grid gap-6 md:grid-cols-2">
            {categories.map((category) => (
              <div key={category.id}>
                <h3 className={kicker}>{category.name}</h3>
                <ul className="mt-2 space-y-2">
                  {category.items.map((item) => (
                    <li key={item.id}>
                      <SoldOutToggle itemId={item.id} name={item.name} soldOut={isSoldOut(item, today)} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

async function TodayContent() {
  const { restaurant, role } = await requireRestaurant('/studio');
  const now = new Date();
  const [screens, menu, origin] = await Promise.all([getScreensRepository().listScreens(restaurant.id), getMenusRepository().get(restaurant.id, now), requestOrigin()]);
  const clock = localClock(now, restaurant.outlets[0].timeZone);
  const { today } = clock;
  const isOwner = role === 'owner';
  const hasMenu = menu.categories.some((category) => category.items.length > 0);
  const links = screens.flatMap((screen) => screen.links);
  const hasTv = links.some((link) => link.lastSeenAt);
  const onAir = links.filter((link) => tvStatus(link.lastSeenAt, now.getTime()).online).length;
  const [first] = screens;
  const preview = first ? { name: first.name, layout: first.layout, theme: first.theme, bilingual: first.bilingual, timing: first.timing } : DEFAULT_PREVIEW;

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <p className={kicker}>{restaurant.city}</p>
        <h1 className="mt-1 font-display text-[clamp(2rem,6vw,3.4rem)] leading-[0.95]">{restaurant.name}.</h1>
        {isOwner ? null : <p className="mt-2 text-night-soft">You’re signed in as staff: you can mark dishes sold out and edit the menu.</p>}
      </div>

      {isOwner && !(hasMenu && hasTv) ? <GetStarted hasMenu={hasMenu} hasTv={hasTv} pairAddress={typedAddress(origin, '/pair')} /> : null}

      <section aria-labelledby="live-title" className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="rounded-card bg-night p-3 sm:p-4">
          <MenuPreview menu={menu} clock={clock} profile={{ name: restaurant.name, tagline: restaurant.tagline }} screen={preview} />
        </div>
        <div className={`${card} flex flex-col`}>
          <p className="flex items-center gap-2 font-brand-mono text-[0.8rem]">
            <span aria-hidden="true" className={`size-2.5 rounded-full ${onAir > 0 ? 'animate-pulse bg-chutney' : 'bg-hairline'}`} />
            {onAir > 0 ? `On air on ${onAir} ${onAir === 1 ? 'TV' : 'TVs'}` : 'No TV on air'}
          </p>
          <h2 id="live-title" className={`${heading} mt-2`}>
            On your TVs now.
          </h2>
          <p className="mt-2 text-night-soft">
            {first ? `This is ${first.name}, playing your menu as guests see it.` : 'This is how your menu will play on the TV.'} It changes the moment you save a change.
          </p>
          <div className="mt-auto flex flex-wrap gap-3 pt-5">
            <Link href="/studio/menu" className={quiet}>
              Edit the menu
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link href="/studio/tvs" className={quiet}>
              {isOwner ? 'Manage TVs' : 'See TVs'}
            </Link>
          </div>
        </div>
      </section>

      <SoldOutToday menu={menu} today={today} />
    </div>
  );
}

function TodaySkeleton() {
  return (
    <div className="space-y-8" aria-label="Loading">
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="h-48 animate-pulse rounded-panel bg-page" />
      ))}
    </div>
  );
}

/** A TV's QR code used to land here with its pairing code; connecting a TV now lives on the TVs page. */
async function Today({ searchParams }: StudioPageProps) {
  const query = await searchParams;
  const code = typeof query.code === 'string' ? query.code.replace(/[^A-Za-z0-9]/g, '').slice(0, 8) : '';
  if (code) redirect(`/studio/tvs?code=${code}`);
  return <TodayContent />;
}

/** The owner app's home: what the TVs play right now, what's sold out, and the first-screen checklist. */
export default function StudioPage(props: StudioPageProps) {
  return (
    <OwnerFrame current="today">
      <Suspense fallback={<TodaySkeleton />}>
        <Today {...props} />
      </Suspense>
    </OwnerFrame>
  );
}
