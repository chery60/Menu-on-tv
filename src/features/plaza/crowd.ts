/**
 * Where everyone on the demo plaza is at time `t` (seconds). Pure and deterministic, like the screen
 * loop: the scene asks every frame and draws what it is told. World units are metres; the café's
 * counter faces +z, and a heading of 0 faces +z.
 */

export interface Point {
  readonly x: number;
  readonly z: number;
}

export interface Pose extends Point {
  /** Yaw in radians; 0 faces +z. */
  readonly heading: number;
  readonly walking: boolean;
}

export interface QueueGuest extends Pose {
  /** Which guest this is, counting from the first; the same guest keeps it from arrival to exit. */
  readonly id: number;
  /** Which of the scene's QUEUE_POOL bodies draws this guest. */
  readonly pool: number;
  /** At the front, giving their order. */
  readonly ordering: boolean;
  /** Carrying their order away. */
  readonly holding: boolean;
}

/** One order every cycle: taken for ORDER_S, then the line steps up for the rest. */
export const QUEUE_CYCLE_S = 8;
export const ORDER_S = 5;
export const STEP_S = QUEUE_CYCLE_S - ORDER_S;
export const WALK_SPEED = 1.25;
/** Bodies the scene keeps for queue guests: enough for everyone walking in, waiting and walking off at once. */
export const QUEUE_POOL = 8;

/** The line, front first, facing the counter. */
export const QUEUE_SLOTS: readonly Point[] = [
  { x: 0.6, z: 2.75 },
  { x: 0.6, z: 3.6 },
  { x: 0.6, z: 4.45 },
];
const FACING_COUNTER = Math.PI;

/** In from the right-hand edge of the plaza to the back of the line, and away to the left with the order. */
const ENTRY: readonly Point[] = [{ x: 18, z: 9.5 }, { x: 4.2, z: 6.6 }, QUEUE_SLOTS[2]];
const EXIT: readonly Point[] = [QUEUE_SLOTS[0], { x: -0.9, z: 5.8 }, { x: -18, z: 10.5 }];

function pathLength(points: readonly Point[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) total += Math.hypot(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z);
  return total;
}

/** The point `d` metres along a path, facing along it. */
function along(points: readonly Point[], d: number): Pose {
  let left = d;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    const length = Math.hypot(b.x - a.x, b.z - a.z);
    if (left <= length || i === points.length - 1) {
      const k = Math.min(1, Math.max(0, left / length));
      return { x: a.x + (b.x - a.x) * k, z: a.z + (b.z - a.z) * k, heading: Math.atan2(b.x - a.x, b.z - a.z), walking: true };
    }
    left -= length;
  }
  return { ...points[0], heading: 0, walking: false };
}

const smooth = (k: number): number => k * k * (3 - 2 * k);
const IN_LENGTH = pathLength(ENTRY);
const OUT_LENGTH = pathLength(EXIT);

/** Guest j reaches the back of the line as cycle j - 2 starts, is at the front for cycle j, and leaves ORDER_S into it. */
function guestAt(j: number, t: number): QueueGuest | null {
  const arrive = (j - 2) * QUEUE_CYCLE_S;
  const leave = j * QUEUE_CYCLE_S + ORDER_S;
  const who = { id: j, pool: ((j % QUEUE_POOL) + QUEUE_POOL) % QUEUE_POOL };
  if (t < arrive) {
    const d = IN_LENGTH - (arrive - t) * WALK_SPEED;
    return d < 0 ? null : { ...along(ENTRY, d), ...who, ordering: false, holding: false };
  }
  if (t >= leave) {
    const d = (t - leave) * WALK_SPEED;
    return d > OUT_LENGTH ? null : { ...along(EXIT, d), ...who, ordering: false, holding: true };
  }
  const cycle = Math.floor(t / QUEUE_CYCLE_S);
  const slot = Math.min(2, Math.max(0, j - cycle));
  const into = t - cycle * QUEUE_CYCLE_S - ORDER_S;
  if (into < 0 || slot === 0) return { ...QUEUE_SLOTS[slot], heading: FACING_COUNTER, walking: false, ...who, ordering: slot === 0, holding: false };
  // Stepping up one place, over the rest of the cycle.
  const k = smooth(Math.min(1, into / STEP_S));
  const from = QUEUE_SLOTS[slot];
  const to = QUEUE_SLOTS[slot - 1];
  return { x: from.x + (to.x - from.x) * k, z: from.z + (to.z - from.z) * k, heading: FACING_COUNTER, walking: k < 1, ...who, ordering: false, holding: false };
}

/** Everyone in or around the queue at time t: walking in, waiting, ordering, or walking off with an order. */
export function queueAt(t: number): readonly QueueGuest[] {
  const first = Math.ceil((t - ORDER_S - OUT_LENGTH / WALK_SPEED) / QUEUE_CYCLE_S);
  const last = Math.floor((t + IN_LENGTH / WALK_SPEED) / QUEUE_CYCLE_S) + 2;
  const guests: QueueGuest[] = [];
  for (let j = first; j <= last; j += 1) {
    const guest = guestAt(j, t);
    if (guest) guests.push(guest);
  }
  return guests;
}

/** What the person at the counter is doing for the guest at the front. */
export function counterAt(t: number): 'taking' | 'handing' | 'waiting' {
  const into = ((t % QUEUE_CYCLE_S) + QUEUE_CYCLE_S) % QUEUE_CYCLE_S;
  if (into < ORDER_S - 0.8) return 'taking';
  if (into < ORDER_S + 0.4) return 'handing';
  return 'waiting';
}

/** A walk round the plaza: an ellipse about the café, far enough out to miss it, the TV and the queue. */
export interface WalkLoop {
  readonly rx: number;
  readonly rz: number;
  /** Metres a second. */
  readonly speed: number;
  /** Where on the loop they start, in radians. */
  readonly phase: number;
  readonly clockwise: boolean;
}

export const WALK_LOOPS: readonly WalkLoop[] = [
  { rx: 9, rz: 8, speed: 1.2, phase: 0.3, clockwise: false },
  { rx: 9.5, rz: 8.5, speed: 1.05, phase: 2.6, clockwise: true },
  { rx: 11, rz: 9.5, speed: 1.3, phase: 4.4, clockwise: false },
  { rx: 11.5, rz: 10, speed: 1.15, phase: 1.2, clockwise: true },
  { rx: 13, rz: 11, speed: 1.25, phase: 3.3, clockwise: false },
  { rx: 13.5, rz: 11.5, speed: 1.0, phase: 5.5, clockwise: true },
  { rx: 15, rz: 12.5, speed: 1.35, phase: 0.9, clockwise: false },
  { rx: 8.5, rz: 10.5, speed: 1.1, phase: 3.9, clockwise: true },
  { rx: 12, rz: 13, speed: 1.2, phase: 5.0, clockwise: false },
];

export function walkerAt(loop: WalkLoop, t: number): Pose {
  const direction = loop.clockwise ? -1 : 1;
  const angle = loop.phase + (direction * loop.speed * t) / ((loop.rx + loop.rz) / 2);
  const dx = -loop.rx * Math.sin(angle) * direction;
  const dz = loop.rz * Math.cos(angle) * direction;
  return { x: loop.rx * Math.cos(angle), z: loop.rz * Math.sin(angle), heading: Math.atan2(dx, dz), walking: true };
}
