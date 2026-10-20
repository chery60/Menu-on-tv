import { BADGE_LABELS } from '@/features/menu/labels';
import type { TvFrame } from '@/features/plaza/tv-frame';
import { formatRupees, MENU_FRAMES, menuRowSpacing } from '@/features/screen/loop';
import type { Badge, MenuCategory, MenuItem, Restaurant } from '@/features/screen/types';

/** CSS font families, read from the page so the TV uses the site's own fonts. */
export interface TvFonts {
  readonly display: string;
  readonly text: string;
  readonly mono: string;
}

/** The Paper theme, as in src/features/screen/themes.ts, and the FSSAI marks' colours from globals.css. */
const PAPER = { ground: '#f2f0ea', panel: '#fbfaf7', ink: '#1d1c19', dim: '#5c5a55', price: '#c8330a', accent: '#f24a14', line: '#d9d5ca', veg: '#138a3e', nonveg: '#7a3b16' };
export const TV_SIZE = { width: 1280, height: 720 } as const;

/*
 * The plaza TV draws the real Split screen (globals.css, .scr-*) at 1280 by 720: the same zones, sizes
 * and shapes, in canvas pixels. CQ is one cqmin, a hundredth of the screen's short side.
 */
const CQ = TV_SIZE.height / 100;
const HAIR = 2;
const PAD = { x: (4.5 * TV_SIZE.width) / 100, y: 5 * CQ };
const SPLIT_GAP = 3.5 * CQ;
const MENU_WIDTH = ((TV_SIZE.width - PAD.x * 2 - SPLIT_GAP) * 1.85) / 2.85;
const SIDE = { x: PAD.x + MENU_WIDTH + SPLIT_GAP, y: PAD.y, width: TV_SIZE.width - PAD.x * 2 - SPLIT_GAP - MENU_WIDTH, height: TV_SIZE.height - PAD.y * 2 };
const COLUMN_GAP = 5 * CQ;
const ITEM_PX = 3.4 * CQ;

interface Box {
  readonly fill?: string;
  readonly stroke: string;
  readonly text: string;
}

/** Badges as the screen draws them: Geist Mono in a square box, only Bestseller filled. */
const BADGE_BOX: Readonly<Record<Badge, Box>> = {
  bestseller: { fill: PAPER.accent, stroke: PAPER.accent, text: PAPER.ink },
  new: { fill: PAPER.ink, stroke: PAPER.ink, text: PAPER.ground },
  chef: { stroke: PAPER.ink, text: PAPER.ink },
  spicy: { stroke: PAPER.price, text: PAPER.price },
  jain: { stroke: PAPER.dim, text: PAPER.dim },
};

function context(canvas: HTMLCanvasElement): CanvasRenderingContext2D | null {
  const ctx = canvas.getContext('2d');
  if (ctx) ctx.textBaseline = 'alphabetic';
  return ctx;
}

/** Sets a font, narrow or not, with tracking in pixels (negative tightens). */
function setFont(ctx: CanvasRenderingContext2D, font: string, condensed = false, tracking = 0): void {
  ctx.font = font;
  ctx.fontStretch = condensed ? 'condensed' : 'normal';
  ctx.letterSpacing = `${tracking}px`;
}

/**
 * Draws text no wider than `max`, shrinking it a little first and cutting it short only if it still won't fit.
 * `tracking` is in ems. Returns the drawn width.
 */
function fitText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, max: number, size: number, build: (px: number) => string, condensed = false, tracking = 0): number {
  let px = size;
  setFont(ctx, build(px), condensed, tracking * px);
  while (ctx.measureText(text).width > max && px > size * 0.8) {
    px -= 1;
    setFont(ctx, build(px), condensed, tracking * px);
  }
  let shown = text;
  while (ctx.measureText(shown).width > max && shown.length > 1) shown = `${shown.slice(0, -2)}…`;
  ctx.fillText(shown, x, y);
  return ctx.measureText(shown).width;
}

/** Breaks text into at most `lines` lines no wider than `max`. */
function wrap(ctx: CanvasRenderingContext2D, text: string, max: number, lines: number): string[] {
  const out: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > max && line) {
      out.push(line);
      line = word;
    } else line = next;
  }
  if (line) out.push(line);
  return out.slice(0, lines);
}

/** The site's crosshair mark, centred on (x, y). */
function crosshair(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  const half = 1.1 * CQ;
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = PAPER.ink;
  ctx.fillRect(x - half, y - HAIR / 2, half * 2, HAIR);
  ctx.fillRect(x - HAIR / 2, y - half, HAIR, half * 2);
  ctx.restore();
}

/** A mono label in a square box, vertically centred on `mid`, drawn from `x` or, when `fromRight`, ending at `x`. Returns its width. */
function labelBox(ctx: CanvasRenderingContext2D, text: string, x: number, mid: number, px: number, box: Box, fonts: TvFonts, fromRight = false): number {
  setFont(ctx, `600 ${px}px ${fonts.mono}`);
  const width = ctx.measureText(text).width + px * 1.1;
  const height = px * 1.7;
  const left = fromRight ? x - width : x;
  ctx.textAlign = 'left';
  if (box.fill) {
    ctx.fillStyle = box.fill;
    ctx.fillRect(left, mid - height / 2, width, height);
  }
  ctx.strokeStyle = box.stroke;
  ctx.lineWidth = HAIR;
  ctx.strokeRect(left + HAIR / 2, mid - height / 2 + HAIR / 2, width - HAIR, height - HAIR);
  ctx.fillStyle = box.text;
  ctx.fillText(text, left + px * 0.55, mid + px * 0.36);
  return width;
}

function dietMark(ctx: CanvasRenderingContext2D, item: MenuItem, x: number, mid: number): void {
  const size = 2.3 * CQ;
  const top = mid - size / 2;
  const color = item.diet === 'veg' ? PAPER.veg : PAPER.nonveg;
  ctx.fillStyle = '#fff';
  ctx.fillRect(x, top, size, size);
  ctx.strokeStyle = color;
  ctx.lineWidth = HAIR;
  ctx.strokeRect(x + 1, top + 1, size - 2, size - 2);
  ctx.fillStyle = color;
  ctx.beginPath();
  if (item.diet === 'veg') ctx.arc(x + size / 2, mid, size * 0.23, 0, Math.PI * 2);
  else {
    ctx.moveTo(x + size / 2, mid - size * 0.24);
    ctx.lineTo(x + size * 0.76, mid + size * 0.22);
    ctx.lineTo(x + size * 0.24, mid + size * 0.22);
  }
  ctx.fill();
}

function drawPrice(ctx: CanvasRenderingContext2D, amount: number, x: number, y: number, px: number, fonts: TvFonts, align: CanvasTextAlign = 'right'): number {
  ctx.fillStyle = PAPER.price;
  setFont(ctx, `800 ${px}px ${fonts.display}`, true);
  ctx.textAlign = align;
  const text = `₹${formatRupees(amount)}`;
  ctx.fillText(text, x, y);
  ctx.textAlign = 'left';
  return ctx.measureText(text).width;
}

/** One menu row: mark, name, its first badge when it fits, a dotted leader and the price or "Sold out". */
function drawRow(ctx: CanvasRenderingContext2D, item: MenuItem, x: number, mid: number, width: number, fonts: TvFonts): void {
  const baseline = mid + ITEM_PX * 0.36;
  const right = x + width;
  dietMark(ctx, item, x, mid);
  const end = item.soldOut
    ? right - labelBox(ctx, 'Sold out', right, mid, ITEM_PX * 0.58, { stroke: PAPER.dim, text: PAPER.dim }, fonts, true)
    : right - drawPrice(ctx, item.price, right, baseline, ITEM_PX * 1.18, fonts);
  const nameX = x + 3.7 * CQ;
  const nameMax = end - 3.4 * CQ - nameX;
  ctx.save();
  if (item.soldOut) ctx.globalAlpha = 0.55;
  ctx.fillStyle = PAPER.ink;
  const nameWidth = fitText(ctx, item.name, nameX, baseline, nameMax, ITEM_PX, (px) => `600 ${px}px ${fonts.text}`);
  if (item.soldOut) ctx.fillRect(nameX, baseline - ITEM_PX * 0.3, nameWidth, HAIR);
  ctx.restore();

  let after = nameX + nameWidth;
  const badge = item.soldOut ? undefined : item.badges?.[0];
  if (badge) {
    setFont(ctx, `600 ${ITEM_PX * 0.52}px ${fonts.mono}`);
    const room = nameX + nameMax - (after + 1.2 * CQ);
    if (ctx.measureText(BADGE_LABELS[badge]).width + ITEM_PX * 0.57 <= room) after += 1.2 * CQ + labelBox(ctx, BADGE_LABELS[badge], after + 1.2 * CQ, mid, ITEM_PX * 0.52, BADGE_BOX[badge], fonts);
  }
  const from = after + 1.4 * CQ;
  const to = end - 1.4 * CQ;
  if (to - from < 2 * CQ) return;
  ctx.strokeStyle = PAPER.line;
  ctx.lineWidth = HAIR;
  ctx.setLineDash([HAIR, HAIR * 1.5]);
  ctx.beginPath();
  ctx.moveTo(from, baseline);
  ctx.lineTo(to, baseline);
  ctx.stroke();
  ctx.setLineDash([]);
}

/** A column of whole categories: heading in Archivo set narrow, a hairline, then rows spread by the screen's own spacing. */
function drawColumn(ctx: CanvasRenderingContext2D, column: readonly MenuCategory[], x: number, top: number, width: number, air: number, fonts: TvFonts): void {
  const heading = 5.2 * CQ;
  const row = 5.2 * CQ * air;
  let y = top;
  for (const category of column) {
    ctx.fillStyle = PAPER.ink;
    fitText(ctx, category.name, x, y + heading * 0.8, width, heading, (px) => `800 ${px}px ${fonts.display}`, true);
    y += heading + 0.6 * CQ;
    ctx.fillStyle = PAPER.line;
    ctx.fillRect(x, y, width, HAIR);
    y += HAIR;
    for (const item of category.items) {
      drawRow(ctx, item, x, y + row / 2, width, fonts);
      y += row;
    }
    y += 2.6 * CQ * air;
  }
}

/** The name, the tagline and the tax note beside it, then a hairline with crosshairs at its ends. Returns where the menu starts. */
function drawHeader(ctx: CanvasRenderingContext2D, restaurant: Restaurant, fonts: TvFonts): number {
  const name = 6.4 * CQ;
  ctx.fillStyle = PAPER.ink;
  const nameWidth = fitText(ctx, restaurant.name, PAD.x, PAD.y + name * 0.8, MENU_WIDTH * 0.7, name, (px) => `800 ${px}px ${fonts.display}`, false, -0.03);
  const x = PAD.x + nameWidth + 2.4 * CQ;
  const max = PAD.x + MENU_WIDTH - x;
  ctx.fillStyle = PAPER.dim;
  if (restaurant.tagline) fitText(ctx, restaurant.tagline, x, PAD.y + 2.9 * CQ, max, 2.7 * CQ, (px) => `400 ${px}px ${fonts.text}`);
  fitText(ctx, 'Prices in ₹, taxes included', x, PAD.y + 5.6 * CQ, max, 1.9 * CQ, (px) => `400 ${px}px ${fonts.mono}`);
  const rule = PAD.y + name + 1.6 * CQ;
  ctx.fillStyle = PAPER.line;
  ctx.fillRect(PAD.x, rule, MENU_WIDTH, HAIR);
  crosshair(ctx, PAD.x, rule + HAIR / 2);
  crosshair(ctx, PAD.x + MENU_WIDTH, rule + HAIR / 2);
  return rule + HAIR + 2.6 * CQ;
}

function drawMenu(ctx: CanvasRenderingContext2D, frame: TvFrame, top: number, fonts: TvFonts): void {
  const width = (MENU_WIDTH - COLUMN_GAP) / 2;
  const air = menuRowSpacing(frame.columns.flat(), MENU_FRAMES.split);
  ctx.fillStyle = PAPER.line;
  ctx.fillRect(PAD.x + width + COLUMN_GAP / 2 - HAIR / 2, top, HAIR, TV_SIZE.height - PAD.y - top);
  frame.columns.forEach((column, i) => drawColumn(ctx, column, PAD.x + i * (width + COLUMN_GAP), top, width, air, fonts));
}

/** The side slide as a framed cell with the accent along its top: the dish in a framed square, its label, headline, line and price, centred. */
function drawSide(ctx: CanvasRenderingContext2D, frame: TvFrame, restaurant: Restaurant, fonts: TvFonts): void {
  const { x, y, width, height } = SIDE;
  ctx.fillStyle = PAPER.panel;
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = PAPER.line;
  ctx.lineWidth = HAIR;
  ctx.strokeRect(x + HAIR / 2, y + HAIR / 2, width - HAIR, height - HAIR);
  ctx.fillStyle = PAPER.accent;
  ctx.fillRect(x, y, width, CQ);

  const slide = frame.side;
  const card =
    slide.kind === 'promo'
      ? { label: slide.promo.label, box: { fill: PAPER.accent, stroke: PAPER.accent, text: PAPER.ink }, headline: slide.promo.headline, line: slide.promo.line, price: slide.promo.price, was: slide.promo.wasPrice, emoji: slide.promo.emoji }
      : slide.kind === 'ad'
        ? { label: `Ad by ${slide.ad.advertiser}`, box: { stroke: PAPER.dim, text: PAPER.dim }, headline: slide.ad.headline, line: slide.ad.line, price: undefined, was: undefined, emoji: slide.ad.emoji }
        : { label: 'Welcome', box: { fill: PAPER.accent, stroke: PAPER.accent, text: PAPER.ink }, headline: restaurant.name, line: restaurant.tagline, price: undefined, was: undefined, emoji: '🍽️' };

  const inner = width - 6 * CQ;
  const centre = x + width / 2;
  const head = 7 * CQ;
  const text = 2.9 * CQ;
  const price = 11 * CQ;
  const label = 2.6 * CQ;
  setFont(ctx, `800 ${head}px ${fonts.display}`, false, -0.03 * head);
  const heads = wrap(ctx, card.headline, inner, 3);
  setFont(ctx, `400 ${text}px ${fonts.text}`);
  const lines = wrap(ctx, card.line, inner, 3);
  const copy = label * 1.7 + 2 * CQ + heads.length * head * 0.95 + 1.2 * CQ + lines.length * text * 1.15 + (card.price === undefined ? 0 : 2 * CQ + price);
  // The dish goes first when there is room for it, as on the real screen; a long promo keeps its words instead.
  const plate = copy + 30 * CQ + 3 * CQ <= height - 8 * CQ ? 30 * CQ : 0;
  let top = y + CQ + (height - CQ - copy - (plate ? plate + 3 * CQ : 0)) / 2;

  if (plate) {
    const left = centre - plate / 2;
    ctx.fillStyle = PAPER.ground;
    ctx.fillRect(left, top, plate, plate);
    ctx.strokeStyle = PAPER.line;
    ctx.strokeRect(left + HAIR / 2, top + HAIR / 2, plate - HAIR, plate - HAIR);
    crosshair(ctx, left, top);
    crosshair(ctx, left + plate, top);
    setFont(ctx, `${17 * CQ}px sans-serif`);
    ctx.textAlign = 'center';
    ctx.fillText(card.emoji, centre, top + plate / 2 + 6 * CQ);
    ctx.textAlign = 'left';
    top += plate + 3 * CQ;
  }

  setFont(ctx, `600 ${label}px ${fonts.mono}`);
  const labelWidth = ctx.measureText(card.label).width + label * 1.1;
  labelBox(ctx, card.label, centre - labelWidth / 2, top + label * 0.85, label, card.box, fonts);
  top += label * 1.7 + 2 * CQ;

  ctx.textAlign = 'center';
  ctx.fillStyle = PAPER.ink;
  setFont(ctx, `800 ${head}px ${fonts.display}`, false, -0.03 * head);
  heads.forEach((line) => {
    top += head * 0.95;
    ctx.fillText(line, centre, top - head * 0.15);
  });
  top += 1.2 * CQ;
  ctx.fillStyle = PAPER.dim;
  setFont(ctx, `400 ${text}px ${fonts.text}`);
  lines.forEach((line) => {
    top += text * 1.15;
    ctx.fillText(line, centre, top - text * 0.25);
  });
  ctx.textAlign = 'left';

  if (card.price === undefined) return;
  top += 2 * CQ + price;
  setFont(ctx, `800 ${price}px ${fonts.display}`, true);
  const now = `₹${formatRupees(card.price)}`;
  const nowWidth = ctx.measureText(now).width;
  setFont(ctx, `700 ${price * 0.5}px ${fonts.display}`, true);
  const was = card.was === undefined ? '' : `₹${formatRupees(card.was)}`;
  const wasWidth = was ? ctx.measureText(was).width + price * 0.35 : 0;
  const start = centre - (nowWidth + wasWidth) / 2;
  if (was) {
    ctx.fillStyle = PAPER.dim;
    ctx.fillText(was, start, top - price * 0.15);
    ctx.fillRect(start, top - price * 0.15 - price * 0.17, wasWidth - price * 0.35, HAIR);
  }
  drawPrice(ctx, card.price, start + wasWidth, top - price * 0.15, price, fonts, 'left');
}

/** One frame of the plaza TV: the Split layout in the Paper theme, as /screen/demo?layout=split draws it. */
export function drawTv(canvas: HTMLCanvasElement, frame: TvFrame, restaurant: Restaurant, fonts: TvFonts): void {
  const ctx = context(canvas);
  if (!ctx) return;
  ctx.fillStyle = PAPER.ground;
  ctx.fillRect(0, 0, TV_SIZE.width, TV_SIZE.height);
  drawMenu(ctx, frame, drawHeader(ctx, restaurant, fonts), fonts);
  drawSide(ctx, frame, restaurant, fonts);
}

/** The café's name board over the counter: paper letters on ink, a chilli rule under them. */
export function signCanvas(name: string, fonts: TvFonts): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 176;
  const ctx = context(canvas);
  if (!ctx) return canvas;
  ctx.fillStyle = PAPER.ink;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = PAPER.ground;
  ctx.textAlign = 'center';
  fitText(ctx, name, canvas.width / 2, 112, canvas.width - 120, 96, (px) => `800 ${px}px ${fonts.display}`);
  ctx.fillStyle = PAPER.accent;
  ctx.fillRect(canvas.width / 2 - 70, 136, 140, 8);
  return canvas;
}

/** The awning's stripes, chilli and paper. */
export function awningCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 16;
  const ctx = context(canvas);
  if (!ctx) return canvas;
  for (let i = 0; i < 10; i += 1) {
    ctx.fillStyle = i % 2 === 0 ? PAPER.accent : PAPER.panel;
    ctx.fillRect((i * canvas.width) / 10, 0, canvas.width / 10, canvas.height);
  }
  return canvas;
}

/** One tile of the square's paving, repeated across the ground. */
export function pavingCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = context(canvas);
  if (!ctx) return canvas;
  ctx.fillStyle = '#ebe6da';
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = '#ddd6c7';
  for (const at of [0, 128]) {
    ctx.fillRect(at, 0, 3, 256);
    ctx.fillRect(0, at, 256, 3);
  }
  return canvas;
}
