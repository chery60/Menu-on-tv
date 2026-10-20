import { describe, expect, it } from 'vitest';
import { SCREEN_RANGE, monthlyBill, screensFrom } from './plan-cost';

const free = { perScreen: 0, maxScreens: 1 };
const plus = { perScreen: 499 };

describe('monthlyBill', () => {
  it('charges nothing for the one free screen', () => {
    expect(monthlyBill(free, 1)).toEqual({ available: true, total: 0 });
  });

  it('says when a plan does not cover that many screens', () => {
    expect(monthlyBill(free, 3)).toEqual({ available: false, limit: 1 });
  });

  it('adds up the per-screen price', () => {
    expect(monthlyBill(plus, 4)).toEqual({ available: true, total: 1996 });
  });
});

describe('screensFrom', () => {
  it('reads a whole number of screens within the range', () => {
    expect(screensFrom('5')).toBe(5);
    expect(screensFrom('2.6')).toBe(3);
    expect(screensFrom('0')).toBe(SCREEN_RANGE.min);
    expect(screensFrom('500')).toBe(SCREEN_RANGE.max);
    expect(screensFrom('lots')).toBe(SCREEN_RANGE.min);
  });
});
