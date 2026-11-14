import { describe, expect, it } from 'vitest';
import { clockAt, clockStamp, firstShowing, scheduleState } from './schedule';

// 2026-11-15 is a Sunday; 2026-11-16 a Monday.
const weekdays = { from: 16 * 60, to: 19 * 60, days: [1, 2, 3, 4, 5] };
const saturdayNight = { from: 22 * 60, to: 2 * 60, days: [6] };
const always = { startsAt: null, endsAt: null, daypart: null };

describe('the outlet’s clock as local times', () => {
  it('reads and writes YYYY-MM-DDTHH:mm', () => {
    expect(clockAt('2026-11-16T09:05')).toEqual({ today: '2026-11-16', weekday: 1, minute: 545 });
    expect(clockAt('2026-11-15T23:59')).toEqual({ today: '2026-11-15', weekday: 0, minute: 1439 });
    expect(clockStamp({ today: '2026-11-16', weekday: 1, minute: 545 })).toBe('2026-11-16T09:05');
  });
});

describe('firstShowing', () => {
  it('is the moment itself with no daypart, or when the daypart is on', () => {
    expect(firstShowing(null, '2026-11-16T10:00')).toBe('2026-11-16T10:00');
    expect(firstShowing(weekdays, '2026-11-16T17:30')).toBe('2026-11-16T17:30');
  });

  it('is the next start of the daypart: later today, or the next day it runs', () => {
    expect(firstShowing(weekdays, '2026-11-16T10:00')).toBe('2026-11-16T16:00');
    expect(firstShowing(weekdays, '2026-11-16T19:00')).toBe('2026-11-17T16:00');
    expect(firstShowing(weekdays, '2026-11-20T20:00')).toBe('2026-11-23T16:00');
    expect(firstShowing(weekdays, '2026-11-15T12:00')).toBe('2026-11-16T16:00');
  });

  it('counts the small hours as the night a late daypart started, and waits a week for a one-day daypart', () => {
    expect(firstShowing(saturdayNight, '2026-11-15T01:00')).toBe('2026-11-15T01:00');
    expect(firstShowing(saturdayNight, '2026-11-15T03:00')).toBe('2026-11-21T22:00');
    expect(firstShowing(saturdayNight, '2026-11-21T22:30')).toBe('2026-11-21T22:30');
    expect(firstShowing({ from: 9 * 60, to: 10 * 60, days: [1] }, '2026-11-16T10:00')).toBe('2026-11-23T09:00');
  });
});

describe('scheduleState', () => {
  const at = (stamp: string) => clockAt(stamp);

  it('plays with no times at all', () => {
    expect(scheduleState(always, at('2026-11-16T10:00'))).toEqual({ state: 'playing' });
  });

  it('starts at its start time, then plays until one minute before its end', () => {
    const window = { startsAt: '2026-11-16T09:00', endsAt: '2026-11-16T21:00', daypart: null };
    expect(scheduleState(window, at('2026-11-16T08:59'))).toEqual({ state: 'starts', at: '2026-11-16T09:00' });
    expect(scheduleState(window, at('2026-11-16T09:00'))).toEqual({ state: 'playing' });
    expect(scheduleState(window, at('2026-11-16T20:59'))).toEqual({ state: 'playing' });
    expect(scheduleState(window, at('2026-11-16T21:00'))).toEqual({ state: 'ended' });
  });

  it('waits for its times and days inside its dates', () => {
    const happyHour = { startsAt: null, endsAt: null, daypart: weekdays };
    expect(scheduleState(happyHour, at('2026-11-16T12:00'))).toEqual({ state: 'starts', at: '2026-11-16T16:00' });
    expect(scheduleState(happyHour, at('2026-11-16T16:00'))).toEqual({ state: 'playing' });
    const later = { startsAt: '2026-11-18T00:00', endsAt: null, daypart: weekdays };
    expect(scheduleState(later, at('2026-11-16T17:00'))).toEqual({ state: 'starts', at: '2026-11-18T16:00' });
  });

  it('has ended when it can never play again before its end', () => {
    const mondayOnly = { startsAt: null, endsAt: '2026-11-22T23:00', daypart: { from: 9 * 60, to: 10 * 60, days: [1] } };
    expect(scheduleState(mondayOnly, at('2026-11-16T09:30'))).toEqual({ state: 'playing' });
    expect(scheduleState(mondayOnly, at('2026-11-16T11:00'))).toEqual({ state: 'ended' });
  });
});
