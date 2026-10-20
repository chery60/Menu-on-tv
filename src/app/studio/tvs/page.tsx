import type { Metadata } from 'next';
import { Suspense } from 'react';
import { OwnerFrame } from '@/components/owner/owner-frame';
import { card, heading, kicker } from '@/components/owner/ui';
import { requireRestaurant } from '@/features/accounts/session';
import { MenuPreview } from '@/features/menu/components/menu-preview';
import { getMenusRepository } from '@/features/menu/repository';
import type { Menu } from '@/features/menu/schema';
import type { ScreenProfile } from '@/features/menu/to-screen';
import { DEFAULT_TIMING } from '@/features/screen/loop';
import { LAYOUTS, THEMES } from '@/features/screen/types';
import { ConnectTvForm, CreateScreenForm, RemoveScreenButton, ScreenSettingsForm, TvLinkActions } from '@/features/screens/components/studio-forms';
import { getScreensRepository } from '@/features/screens/repository';
import type { Screen } from '@/features/screens/schema';
import { describeSlide, tvStatus } from '@/features/screens/status';
import { typedAddress } from '@/config/site';
import { localClock, type LocalClock } from '@/lib/local-date';
import { requestOrigin } from '@/lib/origin';

export const metadata: Metadata = {
  title: 'TVs',
  robots: { index: false, follow: false },
};

interface TvsPageProps {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const layoutName = (id: string) => LAYOUTS.find((layout) => layout.id === id)?.name ?? id;
const themeName = (id: string) => THEMES.find((theme) => theme.id === id)?.name ?? id;

interface Playing {
  readonly menu: Menu;
  readonly clock: LocalClock;
  readonly profile: ScreenProfile;
}

function ScreenCard({ screen, isOwner, now, playing }: { readonly screen: Screen; readonly isOwner: boolean; readonly now: number; readonly playing: Playing }) {
  const timing = screen.timing ?? DEFAULT_TIMING;
  return (
    <li className={card}>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="font-display text-[1.35rem] leading-tight">{screen.name}</h3>
        <p className={kicker}>
          {layoutName(screen.layout)}, {themeName(screen.theme)}
          {screen.bilingual ? ', with Hindi' : ''}. Menu pages {timing.menuSeconds} s, promos {timing.promoSeconds} s.
        </p>
      </div>
      <details className="mt-4">
        <summary className="flex h-11 cursor-pointer items-center text-sm font-semibold underline underline-offset-4">Preview what it plays</summary>
        <div className="mt-3 max-w-[40rem] rounded-card bg-night p-3">
          <MenuPreview menu={playing.menu} clock={playing.clock} profile={playing.profile} screen={{ name: screen.name, layout: screen.layout, theme: screen.theme, bilingual: screen.bilingual, timing }} />
        </div>
        <p className="mt-2 text-sm text-night-soft">The same loop, at the same moment, as every TV on this screen. Categories with set times show only during them.</p>
      </details>
      <h4 className={`${kicker} mt-5`}>TVs showing this screen</h4>
      {screen.links.length === 0 ? (
        <p className="mt-2 text-night-soft">No TVs yet. Connect one with a code above.</p>
      ) : (
        <ul className="mt-2 divide-y divide-hairline border-y border-hairline">
          {screen.links.map((link) => {
            const status = tvStatus(link.lastSeenAt, now);
            const showing = status.online ? describeSlide(link.lastSlide) : null;
            return (
              <li key={link.id} className="grid gap-3 py-4 sm:grid-cols-[1fr_auto] sm:items-start">
                <div>
                  <p className="font-semibold">{link.label}</p>
                  <p className="mt-1 flex items-center gap-2 text-sm">
                    <span aria-hidden="true" className={`size-2.5 rounded-full ${status.online ? 'bg-chutney' : 'bg-hairline'}`} />
                    {showing ? `${status.text}, showing ${showing}` : status.text}
                  </p>
                </div>
                {isOwner ? <TvLinkActions screenId={screen.id} linkId={link.id} label={link.label} /> : null}
              </li>
            );
          })}
        </ul>
      )}
      {isOwner ? (
        <>
          <details className="mt-5">
            <summary className="flex h-11 cursor-pointer items-center text-sm font-semibold underline underline-offset-4">Change how it looks, its timing or its name</summary>
            <div className="mt-4">
              <ScreenSettingsForm screenId={screen.id} name={screen.name} layout={screen.layout} theme={screen.theme} bilingual={screen.bilingual} timing={screen.timing} />
            </div>
          </details>
          <div className="mt-3">
            <RemoveScreenButton screenId={screen.id} name={screen.name} />
          </div>
        </>
      ) : null}
    </li>
  );
}

async function TvsContent({ searchParams }: TvsPageProps) {
  const query = await searchParams;
  const initialCode = typeof query.code === 'string' ? query.code.replace(/[^A-Za-z0-9]/g, '').slice(0, 8) : '';
  const { restaurant, role } = await requireRestaurant(initialCode ? `/studio/tvs?code=${initialCode}` : '/studio/tvs');
  const now = new Date();
  const [screens, menu, origin] = await Promise.all([getScreensRepository().listScreens(restaurant.id), getMenusRepository().get(restaurant.id, now), requestOrigin()]);
  const isOwner = role === 'owner';
  const playing: Playing = { menu, clock: localClock(now, restaurant.outlets[0].timeZone), profile: { name: restaurant.name, tagline: restaurant.tagline } };

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <p className={kicker}>{restaurant.name}</p>
        <h1 className="mt-1 font-display text-[clamp(2rem,6vw,3.4rem)] leading-[0.95]">Your TVs.</h1>
        <p className="mt-2 max-w-[44rem] text-night-soft">Connect the TV in your shop, then choose how your menu looks on it.</p>
      </div>

      {isOwner ? (
        <section aria-labelledby="connect-title" className={`${card} ${initialCode ? 'border-chilli' : ''}`}>
          <h2 id="connect-title" className={heading}>
            Connect a TV.
          </h2>
          <ol className="mt-3 max-w-[44rem] list-decimal space-y-1.5 pl-5 text-night-soft marker:font-brand-mono marker:text-night">
            <li>On the TV, open its internet app. It’s often called Internet, Browser or Web.</li>
            <li>
              Go to <strong className="font-brand-mono text-night">{typedAddress(origin, '/pair')}</strong>. The TV shows a code.
            </li>
            <li>Type that code below, or scan the TV’s QR code with this phone’s camera.</li>
          </ol>
          <p className="mt-3 max-w-[44rem] text-sm text-night-dim">
            Not sure your TV can do it? Open <strong className="font-brand-mono">{typedAddress(origin, '/tv-check')}</strong> on the TV first. No internet app on the TV? A streaming stick in its HDMI port has one.
          </p>
          <div className="mt-5">
            <ConnectTvForm screens={screens.map(({ id, name }) => ({ id, name }))} initialCode={initialCode} />
          </div>
        </section>
      ) : (
        <p className={`${card} text-night-soft`}>Only an owner can connect TVs or change screens. Ask the owner if a TV needs setting up.</p>
      )}

      <section aria-labelledby="screens-title" className="space-y-4">
        <h2 id="screens-title" className={heading}>
          Screens.
        </h2>
        {screens.length === 0 ? (
          <p className="text-night-soft">{isOwner ? 'No screens yet. Connect a TV above, or add a screen below to get a link for it.' : 'No screens yet.'}</p>
        ) : (
          <ul className="space-y-6">
            {screens.map((screen) => (
              <ScreenCard key={screen.id} screen={screen} isOwner={isOwner} now={now.getTime()} playing={playing} />
            ))}
          </ul>
        )}
      </section>

      {isOwner ? (
        <details className={card}>
          <summary className="flex h-11 cursor-pointer items-center font-semibold underline underline-offset-4">Other ways to connect a TV</summary>
          <p className="mt-3 max-w-[44rem] text-night-soft">Make a screen and get its link, for a TV where typing a long link is easier than a code, or for a computer driving a TV.</p>
          <div className="mt-5">
            <CreateScreenForm />
          </div>
        </details>
      ) : null}
    </div>
  );
}

/** Connect TVs, see which are on air, and change what each screen plays. */
export default function TvsPage(props: TvsPageProps) {
  return (
    <OwnerFrame current="tvs">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-panel bg-page" aria-label="Loading" />}>
        <TvsContent {...props} />
      </Suspense>
    </OwnerFrame>
  );
}
