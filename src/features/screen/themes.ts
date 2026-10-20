import type { CSSProperties } from 'react';
import type { ThemeId } from './types';

/**
 * Screen themes: colours only. Every theme wears the brand's faces and shapes from globals.css (.scr),
 * so a menu looks like MenuOnTV whichever colours the owner picks. Kept in TypeScript so the contrast
 * test reads the same values the TV renders.
 */

export interface ScreenTheme {
  /** Screen background. */
  readonly ground: string;
  /** Cards, columns and side zones. */
  readonly panel: string;
  /** Item names and headings. */
  readonly ink: string;
  /** Descriptions and secondary text. */
  readonly dim: string;
  /** Prices and highlights. */
  readonly price: string;
  /** Promo blocks, badges and the ticker band. */
  readonly accent: string;
  /** Text on the accent colour. */
  readonly onAccent: string;
  readonly line: string;
}

export const SCREEN_THEMES: Readonly<Record<ThemeId, ScreenTheme>> = {
  /** The house theme: the website's ink on paper with chilli prices. */
  paper: {
    ground: '#f2f0ea',
    panel: '#fbfaf7',
    ink: '#1d1c19',
    dim: '#5c5a55',
    price: '#c8330a',
    accent: '#f24a14',
    onAccent: '#1d1c19',
    line: '#d9d5ca',
  },
  /** The site's night (the demo device): paper on night, glow prices, the same chilli accent. */
  night: {
    ground: '#0f0e0d',
    panel: '#1a1816',
    ink: '#f2f0ea',
    dim: '#b3aea6',
    price: '#ffb35c',
    accent: '#f24a14',
    onAccent: '#1d1c19',
    line: '#3a3835',
  },
};

/** CSS custom properties for a theme, applied on the screen element. */
export function themeStyle(theme: ThemeId): CSSProperties {
  // A TV offline on a bundle cached before a theme was retired still gets a brand theme.
  const t = SCREEN_THEMES[theme] ?? SCREEN_THEMES.paper;
  return {
    '--scr-ground': t.ground,
    '--scr-panel': t.panel,
    '--scr-ink': t.ink,
    '--scr-dim': t.dim,
    '--scr-price': t.price,
    '--scr-accent': t.accent,
    '--scr-on-accent': t.onAccent,
    '--scr-line': t.line,
  } as CSSProperties;
}

function channel(value: number): number {
  const s = value / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance of a #rrggbb colour. */
export function luminance(hex: string): number {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match) throw new Error(`Use a #rrggbb colour, not "${hex}".`);
  const n = Number.parseInt(match[1], 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

/** WCAG contrast ratio between two #rrggbb colours, from 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}
