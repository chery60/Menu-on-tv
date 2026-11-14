import { describe, expect, it } from 'vitest';
import { instantAt, localClock, localDate } from './local-date';

describe('localDate', () => {
  it('uses the outlet’s day, not the server’s', () => {
    const lateEvening = new Date('2026-10-19T19:00:00.000Z');
    expect(localDate(lateEvening, 'Asia/Kolkata')).toBe('2026-10-20');
    expect(localDate(lateEvening, 'UTC')).toBe('2026-10-19');
  });

  it('falls back to India time for an unknown zone', () => {
    expect(localDate(new Date('2026-10-19T19:00:00.000Z'), 'Mars/Olympus')).toBe('2026-10-20');
  });
});

describe('localClock', () => {
  it('gives the outlet’s day, weekday and minute of the day', () => {
    // 19:00 UTC on Monday 19 October is 00:30 on Tuesday 20 October in India.
    expect(localClock(new Date('2026-10-19T19:00:00.000Z'), 'Asia/Kolkata')).toEqual({ today: '2026-10-20', weekday: 2, minute: 30 });
    expect(localClock(new Date('2026-10-19T19:00:00.000Z'), 'UTC')).toEqual({ today: '2026-10-19', weekday: 1, minute: 19 * 60 });
  });

  it('counts midnight as minute 0 and falls back to India time for an unknown zone', () => {
    expect(localClock(new Date('2026-10-18T18:30:00.000Z'), 'Asia/Kolkata')).toEqual({ today: '2026-10-19', weekday: 1, minute: 0 });
    expect(localClock(new Date('2026-10-18T18:30:00.000Z'), 'Mars/Olympus').minute).toBe(0);
  });
});

describe('instantAt', () => {
  it('turns the outlet’s local time into the moment every TV agrees on', () => {
    // 21:00 in India is 15:30 UTC; the small hours fall on the day before in UTC.
    expect(instantAt('2026-11-16T21:00', 'Asia/Kolkata')).toBe(Date.parse('2026-11-16T15:30:00.000Z'));
    expect(instantAt('2026-11-16T02:00', 'Asia/Kolkata')).toBe(Date.parse('2026-11-15T20:30:00.000Z'));
    expect(instantAt('2026-11-16T21:00', 'UTC')).toBe(Date.parse('2026-11-16T21:00:00.000Z'));
  });

  it('agrees with localClock both ways, across a daylight-saving change, and falls back to India time', () => {
    // London moves to summer time at 01:00 UTC on 29 March 2026.
    expect(instantAt('2026-03-29T12:00', 'Europe/London')).toBe(Date.parse('2026-03-29T11:00:00.000Z'));
    expect(instantAt('2026-03-28T12:00', 'Europe/London')).toBe(Date.parse('2026-03-28T12:00:00.000Z'));
    expect(localClock(new Date(instantAt('2026-11-16T09:45', 'Asia/Kolkata')), 'Asia/Kolkata')).toEqual({ today: '2026-11-16', weekday: 1, minute: 585 });
    expect(instantAt('2026-11-16T21:00', 'Mars/Olympus')).toBe(Date.parse('2026-11-16T15:30:00.000Z'));
  });
});
