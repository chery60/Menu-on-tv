import { describe, expect, it } from 'vitest';
import { counterAt, ORDER_S, QUEUE_CYCLE_S, QUEUE_POOL, QUEUE_SLOTS, queueAt, WALK_LOOPS, walkerAt } from './crowd';

const times = (from: number, to: number, step: number): number[] => Array.from({ length: Math.floor((to - from) / step) + 1 }, (_, i) => from + i * step);
const distance = (p: { x: number; z: number }) => Math.hypot(p.x, p.z);

describe('queueAt', () => {
  it('keeps three guests standing in the line, the front one ordering, while an order is taken', () => {
    // Arrange
    const t = 10 * QUEUE_CYCLE_S + 1;

    // Act
    const standing = queueAt(t).filter((guest) => !guest.walking);

    // Assert
    expect(standing).toHaveLength(3);
    QUEUE_SLOTS.forEach((slot) => expect(standing.some((guest) => Math.abs(guest.x - slot.x) < 1e-9 && Math.abs(guest.z - slot.z) < 1e-9)).toBe(true));
    expect(standing.filter((guest) => guest.ordering)).toHaveLength(1);
  });

  it('sends the front guest away with a cup once the order is taken', () => {
    const front = queueAt(10 * QUEUE_CYCLE_S + 1).find((guest) => guest.ordering);
    const later = queueAt(10 * QUEUE_CYCLE_S + ORDER_S + 1).find((guest) => guest.id === front?.id);

    expect(later).toMatchObject({ walking: true, holding: true, ordering: false });
  });

  it('never gives two guests on the plaza the same body from the pool', () => {
    for (const t of times(0, 400, 0.25)) {
      const pools = queueAt(t).map((guest) => guest.pool);
      expect(new Set(pools).size).toBe(pools.length);
      expect(pools.every((pool) => pool >= 0 && pool < QUEUE_POOL)).toBe(true);
    }
  });

  it('only shows or hides a guest at the far edge of the plaza, where the fog is', () => {
    const step = 0.05;
    for (const t of times(step, 120, step)) {
      const before = new Set(queueAt(t - step).map((guest) => guest.id));
      const now = queueAt(t);
      const after = new Set(now.map((guest) => guest.id));
      for (const guest of now) if (!before.has(guest.id)) expect(distance(guest)).toBeGreaterThan(15);
      for (const guest of queueAt(t - step)) if (!after.has(guest.id)) expect(distance(guest)).toBeGreaterThan(15);
    }
  });

  it('is a function of time alone', () => {
    expect(queueAt(123.4)).toEqual(queueAt(123.4));
  });

  it('faces a walking guest the way they move', () => {
    const t = 50;
    const guest = queueAt(t).find((g) => g.walking && distance(g) > 6);
    const next = queueAt(t + 0.05).find((g) => g.id === guest?.id);
    expect(guest && next).toBeTruthy();
    if (!guest || !next) return;
    const moved = Math.atan2(next.x - guest.x, next.z - guest.z);
    expect(Math.abs(Math.atan2(Math.sin(moved - guest.heading), Math.cos(moved - guest.heading)))).toBeLessThan(0.2);
  });
});

describe('walkerAt', () => {
  it('keeps every walker clear of the café, the TV and the queue', () => {
    for (const loop of WALK_LOOPS) for (const t of times(0, 120, 0.5)) expect(distance(walkerAt(loop, t))).toBeGreaterThan(7);
  });

  it('faces a walker the way they move', () => {
    for (const loop of WALK_LOOPS) {
      const a = walkerAt(loop, 10);
      const b = walkerAt(loop, 10.02);
      const moved = Math.atan2(b.x - a.x, b.z - a.z);
      expect(Math.abs(Math.atan2(Math.sin(moved - a.heading), Math.cos(moved - a.heading)))).toBeLessThan(0.05);
    }
  });
});

describe('counterAt', () => {
  it('takes the order, then hands it over as the guest turns to leave', () => {
    expect(counterAt(QUEUE_CYCLE_S * 3 + 1)).toBe('taking');
    expect(counterAt(QUEUE_CYCLE_S * 3 + ORDER_S - 0.2)).toBe('handing');
    expect(counterAt(QUEUE_CYCLE_S * 3 + ORDER_S + 1.5)).toBe('waiting');
  });
});
