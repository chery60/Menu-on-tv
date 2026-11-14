const FALLBACK_TIME_ZONE = 'Asia/Kolkata';

/** The calendar day at `now` in a time zone, as YYYY-MM-DD. "Sold out today" ends when this changes. */
export function localDate(now: Date, timeZone: string): string {
  const format = (zone: string) => new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  try {
    return format(timeZone);
  } catch {
    return format(FALLBACK_TIME_ZONE);
  }
}

/** The outlet's own day, weekday (0 is Sunday) and minute of the day (0 to 1439): what dayparts and "sold out today" go by. */
export interface LocalClock {
  readonly today: string;
  readonly weekday: number;
  readonly minute: number;
}

const WEEKDAYS: Readonly<Record<string, number>> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

const MINUTE_MS = 60_000;

/**
 * The moment a local time (YYYY-MM-DDTHH:mm) in a time zone falls on, as epoch milliseconds: how a TV knows
 * when a promo ends with no network. Read twice so a daylight-saving change between the guess and the answer lands right.
 */
export function instantAt(localTime: string, timeZone: string): number {
  const asUtc = Date.parse(`${localTime}:00Z`);
  const offset = (at: number): number => {
    const clock = localClock(new Date(at), timeZone);
    const wall = Date.parse(`${clock.today}T00:00:00Z`) + clock.minute * MINUTE_MS;
    return wall - (at - (((at % MINUTE_MS) + MINUTE_MS) % MINUTE_MS));
  };
  return asUtc - offset(asUtc - offset(asUtc));
}

export function localClock(now: Date, timeZone: string): LocalClock {
  const parts = (zone: string) => new Intl.DateTimeFormat('en-US', { timeZone: zone, weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(now);
  let found: Intl.DateTimeFormatPart[];
  try {
    found = parts(timeZone);
  } catch {
    found = parts(FALLBACK_TIME_ZONE);
  }
  const part = (type: Intl.DateTimeFormatPartTypes): string => found.find((entry) => entry.type === type)?.value ?? '0';
  return { today: localDate(now, timeZone), weekday: WEEKDAYS[part('weekday')] ?? 0, minute: (Number(part('hour')) % 24) * 60 + Number(part('minute')) };
}
