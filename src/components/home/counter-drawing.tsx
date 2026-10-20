import type { CSSProperties } from 'react';

/** Draw order: each stroke waits `--i` beats before it traces itself (home.css, `.mtv-draw`). */
const at = (beat: number): CSSProperties => ({ '--i': beat }) as CSSProperties;

const SLATS = Array.from({ length: 28 }, (_, index) => 180 + index * 30);
const TILE_ROWS = [312, 338, 364];
const TILE_COLUMNS = Array.from({ length: 20 }, (_, index) => 150 + index * 46);

/**
 * The hero's drawing: a café counter in front view, in ink lines, with the TV on the wall above it.
 * The TV's outline is drawn here; the live screen is laid over it in HTML (hero.tsx), at the same spot.
 * 1200 by 600 units, so the TV sits at 31.67% from the left, 11.67% from the top, 36.67% by 41.33%.
 */
export function CounterDrawing({ readFrom }: { readonly readFrom: string }) {
  return (
    <svg className="mtv-draw mtv-hero-svg" viewBox="0 0 1200 600" aria-hidden="true" focusable="false">
      {/* Ceiling, floor and the wall tiles behind the counter */}
      <g className="mtv-ink-faint">
        <line x1="20" y1="20" x2="1180" y2="20" pathLength={1} style={at(0)} />
        {TILE_ROWS.map((y, row) => (
          <line key={y} x1="140" y1={y} x2="1060" y2={y} pathLength={1} style={at(1 + row)} />
        ))}
        {TILE_COLUMNS.map((x, column) => (
          <line key={x} x1={x + (column % 2 ? 23 : 0)} y1="312" x2={x + (column % 2 ? 23 : 0)} y2="338" pathLength={1} style={at(3)} />
        ))}
      </g>
      <line className="mtv-ink" x1="20" y1="560" x2="1180" y2="560" pathLength={1} style={at(0)} />

      {/* The TV's mount and outline. The live screen covers the outline once it switches on. */}
      <g className="mtv-ink">
        <line x1="540" y1="20" x2="540" y2="70" pathLength={1} style={at(2)} />
        <line x1="660" y1="20" x2="660" y2="70" pathLength={1} style={at(2)} />
        <rect x="380" y="70" width="440" height="248" rx="4" pathLength={1} style={at(3)} />
        <rect x="392" y="82" width="416" height="224" pathLength={1} style={at(4)} className="mtv-ink-faint" />
      </g>

      {/* Pendant lamps */}
      <g className="mtv-ink">
        <line x1="240" y1="20" x2="240" y2="118" pathLength={1} style={at(1)} />
        <path d="M206 152 Q240 104 274 152 Z" pathLength={1} style={at(2)} />
        <line x1="960" y1="20" x2="960" y2="118" pathLength={1} style={at(1)} />
        <path d="M926 152 Q960 104 994 152 Z" pathLength={1} style={at(2)} />
      </g>
      <g className="mtv-lamp-light">
        <path d="M212 156 L176 390 M268 156 L304 390" />
        <path d="M932 156 L896 390 M988 156 L1024 390" />
      </g>

      {/* The counter: top, body and slatted front */}
      <g className="mtv-ink">
        <rect x="130" y="392" width="940" height="16" pathLength={1} style={at(2)} />
        <rect x="150" y="408" width="900" height="152" pathLength={1} style={at(3)} />
        <line x1="150" y1="546" x2="1050" y2="546" pathLength={1} style={at(4)} />
      </g>
      <g className="mtv-ink-faint">
        {SLATS.map((x) => (
          <line key={x} x1={x} y1="422" x2={x} y2="536" pathLength={1} style={at(4)} />
        ))}
      </g>

      {/* Chai urn with its steam, and a stack of cups */}
      <g className="mtv-ink">
        <rect x="200" y="300" width="60" height="84" rx="6" pathLength={1} style={at(4)} />
        <path d="M200 302 Q230 272 260 302" pathLength={1} style={at(5)} />
        <circle cx="230" cy="281" r="5" pathLength={1} style={at(5)} />
        <path d="M260 352 h18 v12" pathLength={1} style={at(5)} />
        <rect x="194" y="384" width="72" height="8" pathLength={1} style={at(5)} />
        <path d="M290 392 l4 -20 h26 l4 20 M294 372 l3 -16 h20 l3 16" pathLength={1} style={at(6)} />
      </g>
      <g className="mtv-steam">
        <path d="M218 262 q-8 -12 0 -24 t0 -24" pathLength={1} style={at(7)} />
        <path d="M232 258 q-8 -12 0 -24 t0 -24" pathLength={1} style={at(7)} />
        <path d="M246 262 q-8 -12 0 -24 t0 -24" pathLength={1} style={at(7)} />
      </g>

      {/* Pastry case: glass, a shelf, and what's in it */}
      <g className="mtv-ink">
        <rect x="560" y="318" width="260" height="74" pathLength={1} style={at(4)} />
        <line x1="560" y1="354" x2="820" y2="354" pathLength={1} style={at(5)} />
        <path d="M585 354 a12 12 0 0 1 24 0 M620 354 a12 12 0 0 1 24 0 M655 354 a12 12 0 0 1 24 0" pathLength={1} style={at(6)} />
        <path d="M712 354 l10 -22 l10 22 M748 354 l10 -22 l10 22 M784 354 l10 -22 l10 22" pathLength={1} style={at(6)} />
        <path d="M580 392 q14 -22 28 0 M620 392 q14 -22 28 0 M660 392 q14 -22 28 0 M700 392 q14 -22 28 0 M740 392 q14 -22 28 0 M780 392 q14 -22 28 0" pathLength={1} style={at(7)} />
      </g>

      {/* The till */}
      <g className="mtv-ink">
        <rect x="890" y="356" width="110" height="36" pathLength={1} style={at(5)} />
        <path d="M904 356 l10 -34 h52 l10 34" pathLength={1} style={at(5)} />
        <rect x="922" y="328" width="36" height="16" pathLength={1} style={at(6)} />
      </g>

      {/* A plant by the counter */}
      <g className="mtv-ink">
        <path d="M1088 500 h64 l-8 60 h-48 z" pathLength={1} style={at(5)} />
        <path d="M1120 500 q-30 -40 -14 -96 M1120 500 q6 -60 30 -84 M1120 500 q-4 -50 -44 -70 M1120 500 q20 -30 52 -40" pathLength={1} style={at(6)} />
      </g>

      {/* A guest in the queue, and what they can read from there */}
      <g className="mtv-ink">
        <circle cx="70" cy="330" r="16" pathLength={1} style={at(5)} />
        <path d="M40 560 L46 404 Q50 360 70 356 Q90 360 94 404 L100 560" pathLength={1} style={at(6)} />
      </g>
      <g className="mtv-sight">
        <line x1="86" y1="326" x2="380" y2="196" />
      </g>
      <g className="mtv-annot">
        <circle cx="86" cy="326" r="3" />
        <text x="118" y="262">{readFrom}</text>
      </g>
    </svg>
  );
}
