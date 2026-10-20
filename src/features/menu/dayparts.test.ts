import { describe, expect, it } from 'vitest';
import { describeDaypart, showsAt, type Daypart } from './dayparts';

const WEEKDAYS = [1, 2, 3, 4, 5];
const breakfast: Daypart = { from: 7 * 60, to: 11 * 60, days: [0, 1, 2, 3, 4, 5, 6] };
const at = (weekday: number, hour: number, minute = 0) => ({ today: '2026-10-20', weekday, minute: hour * 60 + minute });

describe('when a category is on the screens', () => {
  it('always, when it has no daypart', () => {
    expect(showsAt(null, at(3, 3))).toBe(true);
  });

  it('from its start time up to, not including, its end time', () => {
    expect(showsAt(breakfast, at(2, 6, 59))).toBe(false);
    expect(showsAt(breakfast, at(2, 7))).toBe(true);
    expect(showsAt(breakfast, at(2, 10, 59))).toBe(true);
    expect(showsAt(breakfast, at(2, 11))).toBe(false);
  });

  it('only on its days', () => {
    const weekdayLunch: Daypart = { from: 12 * 60, to: 15 * 60, days: WEEKDAYS };
    expect(showsAt(weekdayLunch, at(1, 13))).toBe(true);
    expect(showsAt(weekdayLunch, at(0, 13))).toBe(false);
  });

  it('past midnight for a late menu, counting the small hours as the night it started', () => {
    const lateNight: Daypart = { from: 22 * 60, to: 2 * 60, days: [5, 6] };
    expect(showsAt(lateNight, at(5, 23))).toBe(true);
    expect(showsAt(lateNight, at(6, 1))).toBe(true);
    expect(showsAt(lateNight, at(0, 1))).toBe(true);
    expect(showsAt(lateNight, at(5, 1))).toBe(false);
    expect(showsAt(lateNight, at(6, 3))).toBe(false);
  });
});

describe('a daypart in words', () => {
  it('says the times and the days plainly', () => {
    expect(describeDaypart(breakfast)).toBe('7 am to 11 am, every day');
    expect(describeDaypart({ from: 12 * 60 + 30, to: 15 * 60, days: WEEKDAYS })).toBe('12:30 pm to 3 pm, Monday to Friday');
    expect(describeDaypart({ from: 18 * 60, to: 23 * 60 + 45, days: [0, 6] })).toBe('6 pm to 11:45 pm, Saturday and Sunday');
    expect(describeDaypart({ from: 22 * 60, to: 0, days: [1, 3, 5] })).toBe('10 pm to 12 am, Monday, Wednesday and Friday');
  });
});
