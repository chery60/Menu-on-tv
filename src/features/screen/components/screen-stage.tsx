'use client';

import { useEffect, useMemo, type CSSProperties, type ReactNode } from 'react';
import { inHindi, itemInHindi, languageAt, promoInHindi, rowWeightFor } from '../language';
import { DEFAULT_TIMING, mainSlides, menuFrame, paginateMenu, sideLoop, slideLabel, type LoopTiming, type Slide, type SlideAt } from '../loop';
import { themeStyle } from '../themes';
import type { LayoutId, MenuItem, Restaurant, ScreenLanguage, ThemeId } from '../types';
import { AdCard, BadgePill, LONG_NAME_CHARS, MenuColumns, Plate, Price, PromoCard, Sizes, TickerBand } from './parts';
import { ClockOffsetContext } from './promo-countdown';
import { useLoopPositions } from './use-loop-positions';

export interface ScreenStageProps {
  readonly restaurant: Restaurant;
  readonly layout: LayoutId;
  readonly theme: ThemeId;
  /** English only (the default), English and Hindi on every line, or the loop in English then in Hindi (MT-28). */
  readonly language?: ScreenLanguage;
  /** How long slides stay up; the playbook's timing when left out. */
  readonly timing?: LoopTiming;
  /** QR codes as SVG strings, keyed by promo id. Built on the server. */
  readonly qrCodes?: Readonly<Record<string, string>>;
  /** Free screens carry a small "Powered by MenuOnTV" badge. */
  readonly showBadge?: boolean;
  /** Shift static content a few pixels each minute, for TVs that run all day. */
  readonly burnInShift?: boolean;
  readonly className?: string;
  readonly label?: string;
  /** Milliseconds to add to this device's clock, from the heartbeat. */
  readonly clockOffsetMs?: number;
  /** Called each time a slide changes, with what the main zone now shows: the safe moment to swap content. */
  readonly onBoundary?: (slide: string) => void;
}

/** The first slide, used before the clock starts so server and client render the same thing. */
function at(loop: readonly Slide[], position: SlideAt | null): SlideAt {
  return position ?? { index: 0, slide: loop[0], elapsedMs: 0, endsAt: loop[0].durationMs };
}

function Progress({ position }: { readonly position: SlideAt }) {
  const style = { animationDuration: `${position.slide.durationMs}ms`, animationDelay: `-${position.elapsedMs}ms` } as CSSProperties;
  return <span key={position.index} className="scr-progress" style={style} aria-hidden="true" />;
}

function Spotlight({ item, pairs, bilingual }: { readonly item: MenuItem; readonly pairs: readonly MenuItem[]; readonly bilingual: boolean }) {
  return (
    <article className="scr-spotlight">
      <div className="scr-spotlight-art">
        <Plate emoji={item.emoji} photo={item.photo} size="lg" />
      </div>
      <div className="scr-spotlight-copy">
        <div className="scr-spotlight-badges">{item.badges?.map((badge) => <BadgePill key={badge} badge={badge} />)}</div>
        <h2 className="scr-spotlight-name">{item.name}</h2>
        {bilingual && item.nameHi ? (
          <p className="scr-hi scr-spotlight-hi" lang="hi">
            {item.nameHi}
          </p>
        ) : null}
        {item.sizes ? <Sizes sizes={item.sizes} className="scr-spotlight-price" /> : <Price amount={item.price} className="scr-spotlight-price" />}
        {pairs.length > 0 ? (
          <>
            <p className="scr-pairs-title">Goes well with</p>
            <ul className="scr-pairs">
              {pairs.map((pair) => (
                <li key={pair.id}>
                  <Plate emoji={pair.emoji} photo={pair.photo} size="sm" />
                  <span className="scr-pair-name">{pair.name}</span>
                  <Price amount={pair.price} />
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>
    </article>
  );
}


function Header({ restaurant }: { readonly restaurant: Restaurant }) {
  return (
    <header className="scr-header">
      <p className={`scr-name ${restaurant.name.length > LONG_NAME_CHARS ? 'is-long' : ''}`}>{restaurant.name}</p>
      <div className="scr-header-lines">
        {restaurant.tagline ? <p className="scr-tagline">{restaurant.tagline}</p> : null}
        <p className="scr-note">Prices in ₹, taxes included</p>
      </div>
    </header>
  );
}

export function ScreenStage({
  restaurant,
  layout,
  theme,
  language = 'en',
  timing = DEFAULT_TIMING,
  qrCodes = {},
  showBadge = true,
  burnInShift = false,
  className = '',
  label,
  clockOffsetMs = 0,
  onBoundary,
}: ScreenStageProps) {
  const bilingual = language === 'en-hi';
  const rowWeight = rowWeightFor(language);
  const frame = useMemo(() => menuFrame(layout, restaurant.fssai), [layout, restaurant.fssai]);
  const pages = useMemo(() => paginateMenu(restaurant.categories, frame, rowWeight), [restaurant, frame, rowWeight]);
  // The Hindi pass shows the same pages with Hindi names in place, so no dish moves between passes.
  const hindiPages = useMemo(() => (language === 'en-then-hi' ? paginateMenu(inHindi(restaurant).categories, frame, rowWeight) : pages), [language, restaurant, frame, rowWeight, pages]);
  const loops = useMemo(() => [mainSlides(layout, restaurant, rowWeight, timing), sideLoop(restaurant, timing)], [layout, restaurant, rowWeight, timing]);
  const { positions, syncing } = useLoopPositions(loops, clockOffsetMs);
  const [mainPosition, sidePosition] = positions;
  const main = at(loops[0], mainPosition);
  const side = at(loops[1], sidePosition);
  // Which pass the current main slide belongs to; it flips only when the main loop comes round.
  const onHindi = languageAt(language, loops[0], main.endsAt - main.slide.durationMs) === 'hi';
  const mainLabel = slideLabel(main.slide);
  const boundary = `${main.index}:${side.index}`;

  useEffect(() => {
    onBoundary?.(mainLabel);
  }, [boundary, mainLabel, onBoundary]);

  const renderSlide = (slide: Slide, variant: 'takeover' | 'side' | 'hero'): ReactNode => {
    switch (slide.kind) {
      case 'menu': {
        const shown = onHindi ? hindiPages : pages;
        return <MenuColumns categories={shown[slide.page] ?? shown[0]} frame={frame} bilingual={bilingual} rowWeight={rowWeight} />;
      }
      case 'promo':
        return <PromoCard promo={onHindi ? promoInHindi(slide.promo) : slide.promo} variant={variant} bilingual={bilingual} qrSvg={slide.promo.qrUrl ? qrCodes[slide.promo.id] : undefined} />;
      case 'ad':
        return <AdCard ad={slide.ad} variant={variant} />;
      case 'spotlight':
        return <Spotlight item={onHindi ? itemInHindi(slide.item) : slide.item} pairs={onHindi ? slide.pairs.map(itemInHindi) : slide.pairs} bilingual={bilingual} />;
    }
  };

  const zone = (position: SlideAt, variant: 'takeover' | 'side' | 'hero', zoneClass: string): ReactNode => (
    <div className={`scr-zone ${zoneClass}`}>
      <div key={position.index} className="scr-slide">
        {renderSlide(position.slide, variant)}
      </div>
      <Progress position={position} />
    </div>
  );

  const menuWithHeader = (
    <div className="scr-menu-area">
      <Header restaurant={restaurant} />
      {zone(main, 'takeover', 'scr-zone-menu')}
    </div>
  );

  let body: ReactNode;
  switch (layout) {
    case 'board':
      body = main.slide.kind === 'menu' ? menuWithHeader : zone(main, 'takeover', 'scr-zone-full');
      break;
    case 'split':
      body = (
        <div className="scr-split">
          {menuWithHeader}
          {zone(side, 'side', 'scr-zone-side')}
        </div>
      );
      break;
    case 'spotlight':
      body = zone(main, 'takeover', 'scr-zone-full');
      break;
    case 'lbar':
      body = (
        <div className="scr-lbar">
          {menuWithHeader}
          {zone(side, 'side', 'scr-zone-side')}
          <TickerBand lines={restaurant.ticker} />
        </div>
      );
      break;
    case 'ticker':
      body = (
        <div className="scr-tickerlayout">
          {menuWithHeader}
          <TickerBand lines={restaurant.ticker} />
        </div>
      );
      break;
    case 'portrait':
      body = (
        <div className="scr-portrait">
          {zone(side, 'hero', 'scr-zone-hero')}
          {menuWithHeader}
        </div>
      );
      break;
  }

  return (
    <div
      className={`scr scr-layout-${layout} ${burnInShift ? 'scr-burn-in' : ''} ${syncing ? 'scr-syncing' : ''} ${className}`}
      style={themeStyle(theme)}
      lang={onHindi ? 'hi' : undefined}
      role="region"
      aria-label={label ?? `${restaurant.name} menu screen`}
      data-slide={mainLabel}
      data-side={slideLabel(side.slide)}
    >
      {/* The countdown reads the loop's corrected clock, so it reaches zero as the promo leaves. */}
      <ClockOffsetContext.Provider value={clockOffsetMs}>
        <div className="scr-canvas">{body}</div>
      </ClockOffsetContext.Provider>
      {showBadge ? <p className="scr-powered">
          Powered by <b>Menu<span>On</span>TV</b>
        </p> : null}
    </div>
  );
}
