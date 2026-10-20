import { describe, expect, it } from 'vitest';
import { formatPaise, MAX_PAISE, parseRupees } from './money';

describe('parseRupees', () => {
  it('reads what owners type', () => {
    expect(parseRupees('80')).toBe(8000);
    expect(parseRupees('1,200')).toBe(120000);
    expect(parseRupees('₹ 49.50')).toBe(4950);
    expect(parseRupees('Rs. 30')).toBe(3000);
    expect(parseRupees('0')).toBe(0);
  });

  it('rejects what isn’t a price', () => {
    for (const typed of ['', 'free', '12.345', '-5', '1e3', String(MAX_PAISE)]) expect(parseRupees(typed)).toBeNull();
  });
});

describe('formatPaise', () => {
  it('drops paise only when there are none', () => {
    expect(formatPaise(8000)).toBe('80');
    expect(formatPaise(4950)).toBe('49.50');
    expect(formatPaise(4905)).toBe('49.05');
  });
});
