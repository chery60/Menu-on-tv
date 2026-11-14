/**
 * QA checks for MT-26 slice 4, the six promo looks on the TV, written from docs/prd/mt-26-promo-studio.md (the
 * price table, "Every promo also has" and slice 4), its Design section, DESIGN.md (Screen, Promos) and
 * docs/screen-design.md (Legibility, enforced; Price anchoring; A QR on promo slides).
 *
 * The PRD's Design section is still "Design to write." on main. These checks follow the one written for slice 3,
 * on origin/hq/mt26-s3 (ddf970c) and origin/design/mt-26-promos-page (20328a3): "Slice 4, the TV" and "Limits".
 *
 * Each promo is made the way an owner makes it (studio promos and today's special on a menu) and reaches the card
 * through `screenRestaurant`, the bundle every TV plays. Card variants: takeover on Board and Spotlight, side on
 * Split and L-bar, hero on Portrait. Ticker shows promos only as ticker lines.
 */
import { readFileSync } from 'node:fs';
import QRCode from 'qrcode';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { applyEdit } from '@/features/menu/edit';
import { sampleMenu } from '@/features/menu/sample';
import { menuEditSchema, type Menu, type MenuEdit } from '@/features/menu/schema';
import { screenRestaurant } from '@/features/menu/to-screen';
import { promoInputSchema, promoSchema, type Promo as StudioPromo } from '@/features/promos/schema';
import { buildQrCodes } from '../qr';
import { contrastRatio, SCREEN_THEMES, type ScreenTheme } from '../themes';
import { THEME_IDS, type Promo, type PromoKind } from '../types';
import { PromoCard } from './parts';

vi.mock('server-only', () => ({}));

const NOW = new Date('2026-11-15T10:30:00.000Z');
const TODAY = '2026-11-15';
const TIME_ZONE = 'Asia/Kolkata';
/** 4 pm on Sunday 15 November in the outlet: inside the 3 to 5 pm happy hour. */
const FOUR_PM = { today: TODAY, weekday: 0, minute: 16 * 60 };
const profile = { name: 'Chai Point', tagline: 'Fresh chai all day' };
const LINK = 'https://example.com/menu';

function ids() {
  let next = 0;
  return () => `id-${(next += 1)}`;
}

const edit = (menu: Menu, value: MenuEdit): Menu => applyEdit(menu, menuEditSchema.parse(value), { today: TODAY, now: NOW, newId: ids() });
const dishId = (menu: Menu, name: string): string => menu.categories.flatMap((category) => category.items).find((item) => item.name.startsWith(name))!.id;

/** The PRD's café: Samosa ₹20 and Masala chai ₹30 (How we'll know 2), and Mango lassi ₹90. */
const base = sampleMenu(NOW, ids());
const menu = edit(base, { type: 'set-prices', itemId: dishId(base, 'Samosa'), prices: [{ label: '', paise: 2000 }] });
const dish = (name: string) => ({ itemId: dishId(menu, name), size: '' });

let made = 0;
function studio(input: object): StudioPromo {
  made += 1;
  return promoSchema.parse({ id: `look-${made}`, ...promoInputSchema.parse(input), paused: false, createdAt: NOW.toISOString(), updatedAt: NOW.toISOString() });
}

/** The slide a TV plays for one studio promo at 4 pm. */
function onTv(input: object): Promo {
  const promo = screenRestaurant(profile, menu, FOUR_PM, { promos: [studio(input)], timeZone: TIME_ZONE }).promos.find((candidate) => candidate.id.startsWith('promo-'));
  if (!promo) throw new Error('The promo is not on the TV at 4 pm.');
  return promo;
}

const LOOKS = {
  combo: onTv({ template: 'combo', dishes: [dish('Samosa'), dish('Masala chai')], dealPaise: 4500, headline: 'Chai and samosa' }),
  'happy-hour': onTv({ template: 'happy-hour', dishes: [dish('Masala chai')], dealPaise: 2000, headline: 'Chai hour', daypart: { from: 15 * 60, to: 17 * 60, days: [0, 1, 2, 3, 4, 5, 6] } }),
  new: onTv({ template: 'new', dishes: [dish('Mango lassi')], headline: 'Mango lassi is here' }),
  festival: onTv({ template: 'festival', festival: 'diwali', headline: 'Happy Diwali' }),
  special: screenRestaurant(profile, edit(menu, { type: 'set-special', itemId: dishId(menu, 'Mango lassi') }), FOUR_PM).promos[0],
  scan: onTv({ template: 'scan', link: LINK, headline: 'See the full menu' }),
} satisfies Record<PromoKind, Promo>;
const KINDS = Object.keys(LOOKS) as PromoKind[];
const VARIANTS = ['takeover', 'side', 'hero'] as const;
type Variant = (typeof VARIANTS)[number];

const card = (promo: Promo, variant: Variant = 'side', qrSvg?: string): string => renderToStaticMarkup(createElement(PromoCard, { promo, variant, qrSvg }));
const text = (html: string): string => html.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const labelOf = (html: string): string | undefined => /<span class="scr-promo-label">([^<]*)<\/span>/.exec(html)?.[1];

// ---- screen.css, read as the TV gets it ----

const CSS = readFileSync(new URL('../screen.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const RULES = [...CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selectors, body]) => ({
  selectors: selectors.split(',').map((selector) => selector.trim().replace(/\s+/g, ' ')),
  body,
}));

/** A property's value in the last rule that names `selector` exactly. */
function declared(selector: string, property: string): string | undefined {
  let value: string | undefined;
  for (const rule of RULES.filter((entry) => entry.selectors.includes(selector))) {
    for (const [, name, found] of rule.body.matchAll(/(?:^|;)\s*([\w-]+)\s*:\s*([^;]+)/g)) if (name === property) value = found.trim();
  }
  return value;
}

/** A size in cqmin, a share of the screen's short side (its height on a landscape TV). */
function cqmin(selector: string, property: string): number {
  const value = declared(selector, property);
  if (!value?.endsWith('cqmin')) throw new Error(`${selector} sets ${property} to ${value}, not a cqmin size.`);
  return Number.parseFloat(value);
}

const TOKENS: Readonly<Record<string, keyof ScreenTheme>> = {
  'var(--scr-ground)': 'ground',
  'var(--scr-panel)': 'panel',
  'var(--scr-ink)': 'ink',
  'var(--scr-dim)': 'dim',
  'var(--scr-price)': 'price',
  'var(--scr-accent)': 'accent',
  'var(--scr-on-accent)': 'onAccent',
};
const colour = (theme: ScreenTheme, value: string | undefined): string => {
  const token = value ? TOKENS[value] : undefined;
  if (!token) throw new Error(`Not a theme colour: ${value}`);
  return theme[token];
};

describe('MT-26 slice 4: every template keeps the promo frame', () => {
  it.each(KINDS.flatMap((kind) => VARIANTS.map((variant) => [kind, variant] as const)))('%s makes a slide in the %s card, with its headline', (kind, variant) => {
    const html = card(LOOKS[kind], variant, kind === 'scan' ? '<svg viewBox="0 0 27 27"></svg>' : undefined);
    expect(html).toContain(`<article class="scr-promo scr-promo-${variant} scr-kind-${kind}">`);
    expect(html).toMatch(new RegExp(`<h2 class="scr-promo-headline">${LOOKS[kind].headline.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</h2>`));
  });

  it('changes only the label per template, never the frame (Design: "changes only its content")', () => {
    const kindRules = RULES.flatMap((rule) => rule.selectors).filter((selector) => selector.includes('scr-kind-'));
    expect(kindRules.length).toBeGreaterThan(0);
    for (const selector of kindRules) expect(selector).toMatch(/\.scr-promo-label$/);
  });

  it.each(['.scr-promo-side', '.scr-promo-hero'])('%s is a framed cell with a 1cqmin accent rule along the top (DESIGN.md)', (selector) => {
    expect(declared(selector, 'border-top')).toBe('1cqmin solid var(--scr-accent)');
    expect(declared(selector, 'border')).toMatch(/var\(--scr-line\)/);
  });
});

describe('MT-26 slice 4: Combo', () => {
  const html = card(LOOKS.combo);

  it('shows "₹45" big with the menu total "₹50" struck through beside it (How we’ll know 2)', () => {
    const price = /<span class="scr-price scr-promo-price">(.*?)<\/span><\/div>/.exec(html)?.[1] ?? '';
    expect(price).toMatch(/<s class="scr-was"[^>]*>₹50<\/s>/);
    expect(text(price)).toBe('₹50 ₹ 45');
    expect(labelOf(html)).toBe('Combo');
  });

  // Design: "Combo: the plates side by side". The PRD says "Picture: the first dish's photo or plate" and
  // screen-design.md "one picture", so this is a conflict for HQ as much as a gap in the card.
  it.fails('shows the combo’s dishes as plates side by side (Design, slice 4)', () => {
    expect(html.match(/class="scr-plate /g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });
});

describe('MT-26 slice 4: Happy hour', () => {
  const html = card(LOOKS['happy-hour']);

  it('shows the happy-hour price with the menu price struck through', () => {
    expect(html).toMatch(/<s class="scr-was"[^>]*>₹30<\/s>/);
    expect(text(html)).toContain('₹30 ₹ 20');
  });

  // Design: "Happy hour: the hours as a mono tag ("3 to 5 pm")". The card shows "Happy hour" and no hours.
  it.fails('shows its hours as a tag, like "3 to 5 pm" (Design, slice 4)', () => {
    expect(text(html)).toMatch(/3( pm)? to 5 pm/);
  });
});

describe('MT-26 slice 4: New item', () => {
  const html = card(LOOKS.new);

  it('carries the "New" label and its menu price, with nothing struck through', () => {
    expect(labelOf(html)).toBe('New');
    expect(text(html)).toContain('₹ 90');
    expect(html).not.toContain('scr-was');
  });

  it.each(THEME_IDS)('%s: the label is filled with ink, as the New badge is, and reads at 7:1 (DESIGN.md)', (id) => {
    const theme = SCREEN_THEMES[id];
    expect(declared('.scr-kind-new .scr-promo-label', 'background')).toBe('var(--scr-ink)');
    expect(contrastRatio(colour(theme, declared('.scr-kind-new .scr-promo-label', 'color')), theme.ink)).toBeGreaterThanOrEqual(7);
  });
});

describe('MT-26 slice 4: Festival', () => {
  it('shows the festival’s name as its tag, and no price with no dishes', () => {
    const html = card(LOOKS.festival);
    expect(labelOf(html)).toBe('Diwali');
    expect(html).not.toContain('scr-price');
  });

  // PRD price table: Festival shows "The dishes' menu prices, or none". With two dishes the slide carries no price.
  it.fails('with two dishes, shows the dishes’ menu prices (PRD price table)', () => {
    const two = onTv({ template: 'festival', festival: 'diwali', dishes: [dish('Samosa'), dish('Masala chai')], headline: 'Diwali treats' });
    const shown = text(card(two));
    expect(shown).toContain('₹ 20');
    expect(shown).toContain('₹ 30');
  });

  it.each(THEME_IDS.flatMap((id) => (['.scr-kind-festival .scr-promo-label', '.scr-kind-scan .scr-promo-label'] as const).map((selector) => [id, selector] as const)))(
    '%s: %s is outlined, in ink that reads at 7:1 on the card (DESIGN.md)',
    (id, selector) => {
      const theme = SCREEN_THEMES[id];
      expect(declared(selector, 'background')).toBe('none');
      const ink = colour(theme, declared(selector, 'color'));
      expect(contrastRatio(ink, theme.panel)).toBeGreaterThanOrEqual(7);
      expect(contrastRatio(ink, theme.ground)).toBeGreaterThanOrEqual(7);
    },
  );
});

describe('MT-26 slice 4: Today’s special', () => {
  it('carries "Today’s special" and its menu price, with nothing struck through', () => {
    const html = card(LOOKS.special);
    expect(labelOf(html)).toBe('Today’s special');
    expect(text(html)).toContain('₹ 90');
    expect(html).not.toContain('scr-was');
  });
});

describe('MT-26 slice 4: Scan the QR', () => {
  it('shows the QR with "Scan with your phone camera" under it, and no price', async () => {
    const svg = (await buildQrCodes({ ...screenRestaurant(profile, menu, FOUR_PM), promos: [LOOKS.scan] }))[LOOKS.scan.id];
    expect(svg).toMatch(/^<svg/);
    const html = card(LOOKS.scan, 'side', svg);
    expect(html).toMatch(/<span class="scr-qr" role="img" aria-label="QR code"><svg[\s\S]*<\/svg>\s*<\/span><figcaption class="scr-qr-hint">Scan with your phone camera<\/figcaption>/);
    expect(html).not.toContain('scr-price');
    expect(html).not.toContain('scr-plate');
  });

  it.each(VARIANTS)('the %s QR is at least a quarter of the screen’s short side (Design), so over 12% of its height (screen-design.md)', (variant) => {
    expect(cqmin(`.scr-promo-${variant} .scr-qr`, 'width')).toBeGreaterThanOrEqual(25);
  });

  // Design: "quiet zone kept". The QR standard (ISO/IEC 18004) asks for 4 modules of light round the code; the TV
  // gives the SVG's own margin plus the white box's padding. Counted generously, with the padding outside the width.
  it.fails.each(VARIANTS)('the %s QR keeps the standard 4-module quiet zone round the code', (variant) => {
    const size = QRCode.create(LINK, { errorCorrectionLevel: 'M' }).modules.size;
    const svg = QRCode.toString(LINK, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' });
    return svg.then((markup) => {
      const across = Number(/viewBox="0 0 (\d+) \d+"/.exec(markup)?.[1]);
      const moduleSize = cqmin(`.scr-promo-${variant} .scr-qr`, 'width') / across;
      const quiet = (across - size) / 2 + cqmin('.scr-qr', 'padding') / moduleSize;
      expect(quiet).toBeGreaterThanOrEqual(4);
    });
  });
});

describe('MT-26 slice 4: honest prices', () => {
  it('strikes through a menu price only on a deal, Combo and Happy hour (screen-design.md, Price anchoring)', () => {
    const struck = KINDS.filter((kind) => card(LOOKS[kind], 'side', kind === 'scan' ? '<svg></svg>' : undefined).includes('scr-was'));
    expect(struck).toEqual(['combo', 'happy-hour']);
  });
});

describe('MT-26 slice 4: legibility (screen-design.md)', () => {
  it.each(['takeover', 'hero'] as const)('the %s promo price is 12 to 18% of the screen’s short side', (variant) => {
    const size = cqmin(`.scr-promo-${variant} .scr-promo-price`, 'font-size');
    expect(size).toBeGreaterThanOrEqual(12);
    expect(size).toBeLessThanOrEqual(18);
  });

  // Set at 11cqmin on 2026-10-20 (8a2f430), before MT-26: 11% of a landscape TV's height on Split and L-bar.
  it.fails('the side promo price is 12 to 18% of the screen’s short side (Split and L-bar)', () => {
    expect(cqmin('.scr-promo-side .scr-promo-price', 'font-size')).toBeGreaterThanOrEqual(12);
  });

  it('never trims a headline: the longest headline (30) and line (60) reach the card whole (Design, Limits)', () => {
    for (const property of ['text-overflow', 'white-space', 'overflow', 'line-clamp', '-webkit-line-clamp']) {
      expect(declared('.scr-promo-headline', property), property).toBeUndefined();
      expect(declared('.scr-promo-line', property), property).toBeUndefined();
    }
    const headline = 'Masala chai and samosa for 45';
    const line = 'Two hot samosas with a cup of masala chai, every day till 7';
    expect([headline.length + 1, line.length + 1]).toEqual([30, 60]);
    for (const variant of VARIANTS) {
      const html = card({ ...LOOKS.combo, headline: `${headline}!`, line: `${line}.` }, variant);
      expect(html).toContain(`${headline}!</h2>`);
      expect(html).toContain(`${line}.</p>`);
    }
  });

  it.each(THEME_IDS)('%s: the QR hint and the struck-through price read at 4.5:1 or more on the card (secondary text)', (id) => {
    const theme = SCREEN_THEMES[id];
    for (const selector of ['.scr-qr-hint', '.scr-was']) {
      const ink = colour(theme, declared(selector, 'color'));
      expect(contrastRatio(ink, theme.panel), selector).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(ink, theme.ground), selector).toBeGreaterThanOrEqual(4.5);
    }
  });

  it.each(THEME_IDS)('%s: "Ends in 40 min" is a mono box in ink that reads at 7:1 (Design, DESIGN.md)', (id) => {
    const theme = SCREEN_THEMES[id];
    expect(declared('.scr-countdown', 'font-family')).toBe('var(--scr-mono)');
    expect(declared('.scr-countdown', 'border')).toMatch(/solid var\(--scr-ink\)/);
    const ink = colour(theme, declared('.scr-countdown', 'color') ?? 'var(--scr-ink)');
    expect(contrastRatio(ink, theme.panel)).toBeGreaterThanOrEqual(7);
    expect(contrastRatio(ink, theme.ground)).toBeGreaterThanOrEqual(7);
  });
});
