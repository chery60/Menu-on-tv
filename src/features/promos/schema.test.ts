import { describe, expect, it } from 'vitest';
import { isHttpsLink, PROMO_LIMITS, promoInputSchema } from './schema';

const combo = { template: 'combo', dishes: [{ itemId: 'samosa', size: '' }, { itemId: 'chai', size: '' }], dealPaise: 4500, headline: 'Chai and samosa' };
const problem = (input: object) => {
  const result = promoInputSchema.safeParse(input);
  return result.success ? null : result.error.issues[0]?.message;
};

describe('promoInputSchema', () => {
  it('fills in what the owner left out: no line, no times, no countdown', () => {
    expect(promoInputSchema.parse(combo)).toEqual({ ...combo, line: '', festival: null, link: null, startsAt: null, endsAt: null, daypart: null, countdown: false });
  });

  it('asks each template for what it needs', () => {
    expect(problem({ ...combo, dishes: combo.dishes.slice(0, 1) })).toBe('Pick 2 to 4 dishes for a combo.');
    expect(problem({ ...combo, dealPaise: null })).toBe('Enter the combo price.');
    const happyHour = { template: 'happy-hour', dishes: [{ itemId: 'chai', size: '' }], dealPaise: 2000, headline: 'Chai at ₹20', daypart: { from: 960, to: 1140, days: [1, 2, 3, 4, 5] } };
    expect(problem(happyHour)).toBeNull();
    expect(problem({ ...happyHour, daypart: null })).toBe('Pick the times for happy hour.');
    expect(problem({ ...happyHour, dealPaise: undefined })).toBe('Enter the happy-hour price.');
    expect(problem({ ...happyHour, dishes: combo.dishes })).toBe('Pick one dish for happy hour.');
    expect(problem({ template: 'new', dishes: [], headline: 'New: Cold coffee' })).toBe('Pick the new dish.');
    expect(problem({ template: 'festival', headline: 'Happy Diwali' })).toBe('Pick a festival.');
    expect(problem({ template: 'festival', festival: 'diwali', headline: 'Happy Diwali' })).toBeNull();
    expect(problem({ template: 'festival', festival: 'diwali', headline: 'Happy Diwali', dishes: [...combo.dishes, { itemId: 'lassi', size: '' }] })).toBe('Pick up to 2 dishes for a festival.');
    expect(problem({ template: 'scan', headline: 'Order on Zomato' })).toBe('Add the link the QR opens.');
  });

  it('keeps only the fields its template uses', () => {
    const parsed = promoInputSchema.parse({ template: 'new', dishes: [{ itemId: 'coffee', size: '' }], dealPaise: 9000, headline: 'New', festival: 'holi', link: 'https://example.com' });
    expect(parsed).toMatchObject({ dealPaise: null, festival: null, link: null });
    const scan = promoInputSchema.parse({ template: 'scan', dishes: combo.dishes, headline: 'Order online', link: '  https://www.zomato.com/x  ' });
    expect(scan).toMatchObject({ dishes: [], link: 'https://www.zomato.com/x' });
  });

  it('refuses the same dish twice, a countdown with no end, and an end before the start', () => {
    expect(problem({ ...combo, dishes: [combo.dishes[0], combo.dishes[0]] })).toBe('Pick each dish once.');
    expect(problem({ ...combo, countdown: true })).toBe('A countdown needs an end time.');
    expect(problem({ ...combo, startsAt: '2026-11-16T10:00', endsAt: '2026-11-16T10:00' })).toBe('Pick an end after the start.');
    expect(problem({ ...combo, startsAt: '2026-11-16T10:00', endsAt: '2026-11-16T12:00', countdown: true })).toBeNull();
  });

  it('keeps headlines and lines short enough to read across the room', () => {
    expect(problem({ ...combo, headline: '   ' })).toBe('Write a headline.');
    expect(problem({ ...combo, headline: 'x'.repeat(PROMO_LIMITS.headline + 1) })).toBe('Keep the headline to 30 characters.');
    expect(problem({ ...combo, line: 'x'.repeat(PROMO_LIMITS.line + 1) })).toBe('Keep the line to 60 characters.');
    expect(promoInputSchema.parse({ ...combo, headline: '  चाय और समोसा  ' }).headline).toBe('चाय और समोसा');
  });

  it('takes only real minutes in the outlet’s time', () => {
    expect(problem({ ...combo, endsAt: '2026-02-30T10:00' })).toBe('Pick a date and time.');
    expect(problem({ ...combo, endsAt: '2026-11-16T24:00' })).toBe('Pick a date and time.');
    expect(problem({ ...combo, endsAt: '2026-11-16 10:00' })).toBe('Pick a date and time.');
    expect(problem({ ...combo, endsAt: '2026-11-16T10:00Z' })).toBe('Pick a date and time.');
  });

  it('refuses a price of nothing', () => {
    expect(problem({ ...combo, dealPaise: 0 })).toBe('Enter a price above ₹0.');
    expect(problem({ ...combo, dealPaise: 45.5 })).toBeTruthy();
  });
});

describe('isHttpsLink', () => {
  it('takes a full https link and nothing else', () => {
    expect(isHttpsLink('https://www.zomato.com/x')).toBe(true);
    expect(isHttpsLink('zomato.com/x')).toBe(false);
    expect(isHttpsLink('hello')).toBe(false);
    expect(isHttpsLink('http://zomato.com/x')).toBe(false);
    expect(isHttpsLink('HTTPS://zomato.com/x')).toBe(false);
    expect(isHttpsLink('https://localhost/x')).toBe(false);
    expect(isHttpsLink('https://me:secret@zomato.com/x')).toBe(false);
    expect(isHttpsLink('https://zomato.com/a b')).toBe(false);
  });

  it('stops at 300 characters', () => {
    const long = `https://example.com/${'a'.repeat(PROMO_LIMITS.link)}`;
    expect(problem({ template: 'scan', headline: 'Scan', link: long })).toBe('Keep the link to 300 characters.');
  });
});

describe('a countdown on a happy hour with times only (MT-26 check 6)', () => {
  it('counts down to the end of today’s times when there is no end date, and still needs an end of some kind', () => {
    const happyHour = { template: 'happy-hour', dishes: [{ itemId: 'chai', size: '' }], dealPaise: 2000, headline: 'Chai at ₹20', daypart: { from: 960, to: 1140, days: [1] }, countdown: true };
    expect(problem(happyHour)).toBeNull();
    expect(problem({ ...combo, countdown: true })).toBe('A countdown needs an end time.');
  });
});
