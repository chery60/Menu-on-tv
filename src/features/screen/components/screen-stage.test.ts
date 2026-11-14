// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PROMO_SLIDE_MS } from '../loop';
import type { Restaurant } from '../types';
import { ScreenStage } from './screen-stage';

/** One dish and one promo: a Split TV whose menu and side zone each loop a single slide. */
const tiny: Restaurant = {
  name: 'Chai Point',
  tagline: 'Fresh chai all day',
  categories: [{ id: 'chai', name: 'Chai', items: [{ id: 'masala', name: 'Masala chai', price: 30, diet: 'veg', emoji: '☕' }] }],
  promos: [{ id: 'item-masala', kind: 'special', label: 'Bestseller', headline: 'Masala chai', line: 'Chai', price: 30, emoji: '☕' }],
  ads: [],
  ticker: [],
};

describe('ScreenStage boundaries', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('calls onBoundary at every slide change, even when each loop has one slide, so a new bundle never waits for the deadline', async () => {
    const onBoundary = vi.fn();
    render(createElement(ScreenStage, { restaurant: tiny, layout: 'split', theme: 'paper', onBoundary }));
    await act(() => vi.advanceTimersByTimeAsync(100));
    const atStart = onBoundary.mock.calls.length;
    // Four side slides go by (and a menu slide), one at a time so React renders each; before the fix none called it.
    for (let slide = 0; slide < 4; slide += 1) await act(() => vi.advanceTimersByTimeAsync(PROMO_SLIDE_MS));
    expect(onBoundary.mock.calls.length - atStart).toBeGreaterThanOrEqual(3);
  });
});
