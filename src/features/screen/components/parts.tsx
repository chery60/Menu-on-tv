import type { CSSProperties } from 'react';
import type { Badge, Diet, LocalAd, MenuCategory, MenuItem, Promo } from '../types';
import { formatRupees, menuRowSpacing, type MenuFrame } from '../loop';

/** Building blocks of every layout. Sizes live in globals.css (.scr-*), in container units. */

const BADGE_LABEL: Readonly<Record<Badge, string>> = {
  bestseller: 'Bestseller',
  new: 'New',
  chef: 'Chef’s pick',
  spicy: 'Spicy',
  jain: 'Jain option',
};

export function DietMark({ diet }: { readonly diet: Diet }) {
  return (
    <span className={`scr-diet scr-diet-${diet}`} role="img" aria-label={diet === 'veg' ? 'Vegetarian' : 'Non-vegetarian'}>
      <span />
    </span>
  );
}

export function BadgePill({ badge }: { readonly badge: Badge }) {
  return <span className={`scr-badge scr-badge-${badge}`}>{BADGE_LABEL[badge]}</span>;
}

export function Price({ amount, was, className = '' }: { readonly amount: number; readonly was?: number; readonly className?: string }) {
  return (
    <span className={`scr-price ${className}`}>
      {was ? (
        <s className="scr-was" aria-label={`was ₹${formatRupees(was)}`}>
          ₹{formatRupees(was)}
        </s>
      ) : null}
      <span className="scr-rupee">₹</span>
      {formatRupees(amount)}
    </span>
  );
}

/** Half and full side by side, each with its own small label. */
export function Sizes({ sizes, className = '' }: { readonly sizes: readonly { readonly label: string; readonly price: number }[]; readonly className?: string }) {
  return (
    <span className={`scr-sizes ${className}`}>
      {sizes.map((size) => (
        <span key={size.label} className="scr-size">
          <span className="scr-size-label">{size.label}</span>
          <Price amount={size.price} />
        </span>
      ))}
    </span>
  );
}

function ItemRow({ item, bilingual }: { readonly item: MenuItem; readonly bilingual: boolean }) {
  return (
    <li className={`scr-row ${item.soldOut ? 'is-sold-out' : ''}`}>
      <DietMark diet={item.diet} />
      <span className="scr-row-name">
        <span className="scr-row-title">
          <span className="scr-row-label">{item.name}</span>
          {item.soldOut ? null : item.badges?.slice(0, 1).map((badge) => <BadgePill key={badge} badge={badge} />)}
        </span>
        {bilingual && item.nameHi ? (
          <span className="scr-hi" lang="hi">
            {item.nameHi}
          </span>
        ) : null}
      </span>
      <span className="scr-leader" aria-hidden="true" />
      {item.soldOut ? <span className="scr-sold-out">Sold out</span> : item.sizes ? <Sizes sizes={item.sizes} /> : <Price amount={item.price} />}
    </li>
  );
}

export function MenuColumns({
  categories,
  frame,
  bilingual,
  rowWeight = 1,
}: {
  readonly categories: readonly MenuCategory[];
  readonly frame: MenuFrame;
  readonly bilingual: boolean;
  readonly rowWeight?: number;
}) {
  return (
    <div className="scr-columns" style={{ columnCount: frame.columns, '--air': menuRowSpacing(categories, frame, rowWeight) } as CSSProperties}>
      {categories.map((category) => (
        <section key={category.id} className="scr-category">
          <h3 className="scr-cat-title">
            <span className="scr-cat-name">{category.name}</span>
            {bilingual && category.nameHi ? (
              <span className="scr-hi" lang="hi">
                {category.nameHi}
              </span>
            ) : null}
          </h3>
          <ul>
            {category.items.map((item) => (
              <ItemRow key={item.id} item={item} bilingual={bilingual} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** A dish on a plate: the owner's photo when there is one, otherwise its emoji. */
export function Plate({ emoji, photo, size = 'md' }: { readonly emoji: string; readonly photo?: string; readonly size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span className={`scr-plate scr-plate-${size} ${photo ? 'has-photo' : ''}`} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element -- TV players load plain images; next/image adds JavaScript and a server round trip. */}
      {photo ? <img src={photo} alt="" decoding="async" /> : <span>{emoji}</span>}
    </span>
  );
}

export function PromoCard({ promo, qrSvg, variant }: { readonly promo: Promo; readonly qrSvg?: string; readonly variant: 'takeover' | 'side' | 'hero' }) {
  return (
    <article className={`scr-promo scr-promo-${variant} scr-kind-${promo.kind}`}>
      <div className="scr-promo-art">
        {qrSvg ? <span className="scr-qr" role="img" aria-label="QR code" dangerouslySetInnerHTML={{ __html: qrSvg }} /> : <Plate emoji={promo.emoji} photo={promo.photo} size="lg" />}
      </div>
      <div className="scr-promo-copy">
        <span className="scr-promo-label">{promo.label}</span>
        <h2 className="scr-promo-headline">{promo.headline}</h2>
        <p className="scr-promo-line">{promo.line}</p>
        {promo.price ? <Price amount={promo.price} was={promo.wasPrice} className="scr-promo-price" /> : null}
      </div>
    </article>
  );
}

export function AdCard({ ad, variant }: { readonly ad: LocalAd; readonly variant: 'takeover' | 'side' | 'hero' }) {
  return (
    <article className={`scr-promo scr-promo-${variant} scr-ad`}>
      <div className="scr-promo-art">
        <Plate emoji={ad.emoji} size="lg" />
      </div>
      <div className="scr-promo-copy">
        <span className="scr-ad-label">Ad by {ad.advertiser}</span>
        <h2 className="scr-promo-headline">{ad.headline}</h2>
        <p className="scr-promo-line">{ad.line}</p>
      </div>
    </article>
  );
}

export function TickerBand({ lines }: { readonly lines: readonly string[] }) {
  // Two copies side by side make the scroll seamless; the second is hidden from screen readers.
  const run = (hidden: boolean) => (
    <span className="scr-ticker-run" aria-hidden={hidden || undefined}>
      {lines.map((line) => (
        <span key={line} className="scr-ticker-item">
          {line}
        </span>
      ))}
    </span>
  );
  return (
    <div className="scr-ticker">
      <div className="scr-ticker-track">
        {run(false)}
        {run(true)}
      </div>
    </div>
  );
}
