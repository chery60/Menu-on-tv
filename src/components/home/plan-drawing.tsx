import { planStory } from '@/content/site-content';

/** Where each flag sits on the plan, in drawing units (1000 by 640). */
export const FLAG_SPOTS = {
  far: { x: 720, y: 312 },
  stale: { x: 836, y: 222 },
  flyer: { x: 555, y: 343 },
} as const;

/** The step at which each problem gets fixed. */
export const FIXED_AT = { far: 2, flyer: 2, stale: 3 } as const;

const TABLES = [
  { x: 200, y: 170 },
  { x: 340, y: 170 },
  { x: 200, y: 310 },
  { x: 340, y: 310 },
];
const QUEUE = [
  { x: 486, y: 418 },
  { x: 452, y: 452 },
  { x: 418, y: 486 },
  { x: 384, y: 520 },
];
const CHAIR = 36;

/**
 * A small café in plan, the way an architect draws it: walls, then the kitchen and counter, then the
 * tables and the queue. Layers are drawn by the reader's scroll (`--scene-p`, home.css); later steps
 * add the printed board's sight lines, then the TV over the counter, then a second TV and the phone.
 */
export function PlanDrawing({ step }: { readonly step: number }) {
  const { rooms } = planStory;
  const on = (from: number) => (step >= from ? 'is-on' : undefined);

  return (
    <svg className="mtv-plan-svg" viewBox="0 0 1000 640" aria-hidden="true" focusable="false">
      {/* Walls, with the door's swing */}
      <g className="l-walls">
        <path className="mtv-wall" d="M250 580 H920 V60 H80 V580 H170" pathLength={1} />
        <path className="mtv-ink" d="M170 580 V500 A80 80 0 0 1 250 580" pathLength={1} />
      </g>

      {/* Kitchen and counter */}
      <g className="l-rooms">
        <path className="mtv-wall-thin" d="M600 60 V240 H660 M740 240 H920" pathLength={1} />
        <path className="mtv-ink" d="M540 262 H900 V292 H570 V430 H540 Z" pathLength={1} />
        <rect className="mtv-ink" x="640" y="84" width="80" height="40" pathLength={1} />
        <rect className="mtv-ink" x="790" y="80" width="110" height="56" pathLength={1} />
        <path className="mtv-ink" d="M816 108 m-12 0 a12 12 0 1 0 24 0 a12 12 0 1 0 -24 0 M874 108 m-12 0 a12 12 0 1 0 24 0 a12 12 0 1 0 -24 0" pathLength={1} />
        <rect className="mtv-ink" x="860" y="160" width="46" height="66" pathLength={1} />
        <rect className="mtv-ink" x="680" y="266" width="120" height="22" pathLength={1} />
        <path className="mtv-ink-faint" d="M720 266 v22 M760 266 v22" pathLength={1} />
        <rect className="mtv-ink" x="544" y="330" width="22" height="26" pathLength={1} />
      </g>

      {/* Tables and chairs */}
      <g className="l-furniture">
        {TABLES.map((table) => (
          <g key={`${table.x}-${table.y}`}>
            <circle className="mtv-ink" cx={table.x} cy={table.y} r="24" pathLength={1} />
            <path
              className="mtv-ink-faint"
              d={`M${table.x - 7} ${table.y - CHAIR - 5} h14 v10 h-14 z M${table.x - 7} ${table.y + CHAIR - 5} h14 v10 h-14 z M${table.x - CHAIR - 5} ${table.y - 7} h10 v14 h-10 z M${table.x + CHAIR - 5} ${table.y - 7} h10 v14 h-10 z`}
              pathLength={1}
            />
          </g>
        ))}
      </g>

      {/* Dimensions along the top and left, as on a real plan */}
      <g className="l-dims">
        <path className="mtv-dim" d="M80 34 H920 M80 26 v16 M920 26 v16 M54 60 V580 M46 60 h16 M46 580 h16" pathLength={1} />
        <text className="mtv-plan-text" x="500" y="24" textAnchor="middle">
          12 m
        </text>
        <text className="mtv-plan-text" x="40" y="324" textAnchor="middle" transform="rotate(-90 40 324)">
          7.5 m
        </text>
      </g>

      {/* Room labels */}
      <g className="l-labels">
        <text className="mtv-plan-text" x="210" y="616" textAnchor="middle">
          {rooms.door}
        </text>
        <text className="mtv-plan-text" x="760" y="210" textAnchor="middle">
          {rooms.kitchen}
        </text>
        <text className="mtv-plan-text" x="270" y="246" textAnchor="middle">
          {rooms.seating}
        </text>
        <text className="mtv-plan-text" x="740" y="318" textAnchor="middle">
          {rooms.counter}
        </text>
      </g>

      {/* The queue */}
      <g className="l-queue">
        <path className="mtv-dash" d="M500 404 L360 548" />
        {QUEUE.map((guest) => (
          <circle key={guest.x} className="mtv-guest" cx={guest.x} cy={guest.y} r="10" />
        ))}
        <text className="mtv-plan-text" x="330" y="476" textAnchor="end">
          {rooms.queue}
        </text>
      </g>

      {/* The printed board on the kitchen wall, and what the queue can see of it */}
      <g className={`l-board ${on(1) ?? ''}`}>
        <line className="mtv-board" x1="776" y1="236" x2="896" y2="236" />
        <text className="mtv-plan-text" x="836" y="258" textAnchor="middle">
          {rooms.board}
        </text>
        {QUEUE.map((guest) => (
          <line key={guest.x} className="mtv-sight-bad" x1={guest.x} y1={guest.y} x2="836" y2="238" />
        ))}
      </g>

      {/* The TV over the counter, facing the queue */}
      <g className={`l-tv ${on(2) ?? ''}`}>
        {QUEUE.map((guest) => (
          <line key={guest.x} className="mtv-sight-good" x1={guest.x} y1={guest.y} x2="512" y2="344" />
        ))}
        <rect className="mtv-tv-glow" x="492" y="290" width="40" height="108" rx="20" />
        <rect className="mtv-tv-plan" x="504" y="300" width="14" height="88" />
        <text className="mtv-plan-text mtv-plan-text-tv" x="492" y="282" textAnchor="end">
          {rooms.tv}
        </text>
        <text className="mtv-plan-text mtv-plan-text-good" x="430" y="398" textAnchor="end">
          3 m
        </text>
      </g>

      {/* A second TV by the tables, and the owner's phone that keeps both right */}
      <g className={`l-phone ${on(3) ?? ''}`}>
        <rect className="mtv-tv-glow" x="80" y="390" width="34" height="100" rx="17" />
        <rect className="mtv-tv-plan" x="86" y="400" width="12" height="80" />
        <rect className="mtv-phone-plan" x="752" y="244" width="14" height="22" rx="3" />
        <path className="mtv-signal" d="M752 250 Q640 300 522 336 M752 250 Q420 330 100 438" />
      </g>
    </svg>
  );
}
