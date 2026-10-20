import { describe, expect, it } from 'vitest';
import { formatIdentifier, parseIdentifier } from './identifier';

describe('parseIdentifier', () => {
  it('reads Indian mobiles however they are typed', () => {
    for (const typed of ['9876543210', '98765 43210', '098765 43210', '+91 98765-43210', '919876543210', '(+91) 98765 43210']) {
      expect(parseIdentifier(typed)).toEqual({ channel: 'phone', value: '+919876543210' });
    }
  });

  it('keeps international numbers that start with +', () => {
    expect(parseIdentifier('+1 650 213 7552')).toEqual({ channel: 'phone', value: '+16502137552' });
  });

  it('lower-cases emails', () => {
    expect(parseIdentifier('  Owner@Cafe.IN ')).toEqual({ channel: 'email', value: 'owner@cafe.in' });
  });

  it('rejects what is neither', () => {
    for (const typed of ['', '12345', '5876543210', 'owner@', 'chai', '+0123456789', 'x'.repeat(300), '98765abc10']) {
      expect(parseIdentifier(typed)).toBeNull();
    }
  });
});

describe('formatIdentifier', () => {
  it('groups Indian mobiles and leaves everything else alone', () => {
    expect(formatIdentifier({ channel: 'phone', value: '+919876543210' })).toBe('+91 98765 43210');
    expect(formatIdentifier({ channel: 'phone', value: '+16502137552' })).toBe('+16502137552');
    expect(formatIdentifier({ channel: 'email', value: 'a@b.in' })).toBe('a@b.in');
  });
});
