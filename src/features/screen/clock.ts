/**
 * Corrects a TV's clock from the heartbeat. The wall-clock loop keeps screens in sync only if their
 * clocks agree, and cheap TVs often run minutes off.
 */

/** Ignore samples whose round trip took longer than this: the server time could be anywhere in it. */
export const MAX_TRUSTED_ROUND_TRIP_MS = 5_000;
/** Don't move the loop for differences smaller than this; it would only add jitter. */
export const CLOCK_TOLERANCE_MS = 250;

export interface ClockSample {
  /** The TV's clock when the heartbeat left. */
  readonly sentAt: number;
  /** The server's clock when it answered. */
  readonly serverNow: number;
  /** The TV's clock when the answer arrived. */
  readonly receivedAt: number;
}

/** Cristian's algorithm: assume the server read its clock halfway through the round trip. */
export function estimateClockOffset({ sentAt, serverNow, receivedAt }: ClockSample): number {
  return serverNow - (sentAt + receivedAt) / 2;
}

/** The offset to use next: unchanged for slow or tiny samples, otherwise the new estimate. */
export function nextClockOffset(current: number, sample: ClockSample): number {
  const roundTrip = sample.receivedAt - sample.sentAt;
  if (roundTrip < 0 || roundTrip > MAX_TRUSTED_ROUND_TRIP_MS) return current;
  const estimate = Math.round(estimateClockOffset(sample));
  return Math.abs(estimate - current) < CLOCK_TOLERANCE_MS ? current : estimate;
}
