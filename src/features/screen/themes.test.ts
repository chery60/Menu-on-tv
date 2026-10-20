import { describe, expect, it } from 'vitest';
import { contrastRatio, luminance, SCREEN_THEMES, themeStyle } from './themes';
import { THEME_IDS, upgradeThemeId, type ThemeId } from './types';

describe('contrast maths', () => {
  it('matches the WCAG reference values', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.48, 2);
    expect(luminance('#ffffff')).toBe(1);
  });

  it('rejects colours it cannot read', () => {
    expect(() => luminance('red')).toThrow(/#rrggbb/);
  });
});

describe('screen themes follow the playbook', () => {
  it.each(THEME_IDS)('%s: item text is at least 7:1 on the ground and on panels', (id) => {
    const theme = SCREEN_THEMES[id];
    expect(contrastRatio(theme.ink, theme.ground)).toBeGreaterThanOrEqual(7);
    expect(contrastRatio(theme.ink, theme.panel)).toBeGreaterThanOrEqual(7);
  });

  it.each(THEME_IDS)('%s: prices, secondary text and promo text stay readable', (id) => {
    const theme = SCREEN_THEMES[id];
    expect(contrastRatio(theme.price, theme.ground)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(theme.dim, theme.ground)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(theme.onAccent, theme.accent)).toBeGreaterThanOrEqual(4.5);
  });

  it('exposes every token as a CSS variable', () => {
    expect(themeStyle('night')).toMatchObject({ '--scr-ground': '#0f0e0d', '--scr-price': '#ffb35c' });
  });

  it('keeps the brand ground for a theme id from an old cached bundle', () => {
    expect(themeStyle('neon' as ThemeId)).toEqual(themeStyle('paper'));
  });

  it.each(THEME_IDS)('%s: sets colours only, so the brand faces and shapes come from the stylesheet', (id) => {
    expect(Object.keys(themeStyle(id)).sort()).toEqual(['--scr-accent', '--scr-dim', '--scr-ground', '--scr-ink', '--scr-line', '--scr-on-accent', '--scr-panel', '--scr-price']);
  });

  it('puts the house theme first, so it is the default in every picker', () => {
    expect(THEME_IDS[0]).toBe('paper');
  });
});

describe('retired themes', () => {
  it('move to the brand theme that replaced them: dark to Night, light to Paper', () => {
    expect(['chalk', 'neon', 'fresh'].map(upgradeThemeId)).toEqual(['night', 'night', 'paper']);
  });

  it('leave current and unknown values for the caller to check', () => {
    expect(['paper', 'night', 'disco', undefined].map(upgradeThemeId)).toEqual(['paper', 'night', 'disco', undefined]);
  });
});
