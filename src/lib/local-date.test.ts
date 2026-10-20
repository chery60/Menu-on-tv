import { describe, expect, it } from 'vitest';
import { localClock, localDate } from './local-date';

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
