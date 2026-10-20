import { HL } from './kernel.mjs';
/**
 * Queue: four guests in a line at a counter, and the shop's printed board on a
 * post above it, small. The guest under the pointer leans out of the line to
 * read it, the ones beside them a little, and their sightline to the board
 * goes from dashed to solid. The read-out says how far that guest stands from
 * the board. The slider is the lean, in world units.
 *
 * The pattern: one of many. Tweens, a stagger by distance with a falloff, and
 * a hit test on the rest centres along the line, which never move.
 */
const {
  Cam, clamp, facing, fillet, fit, hull, open, poly, proj, prism, rings, ringAt, rrect, run, seg,
  tween, tset, tval, tdone, disposer, mk, pointer, put, register, solid,
} = HL;

const N = 4, QX = 38, QY = 36, STEP = 22, BODY = 6.4, FOOT = 4.4, NECK = 21, HEAD = 4.4, S = 1.62, STAG = 50;
const CW = 76, CD = 20, CZ = 26, BX = 60, BY = 9, BW = 24, BZ0 = 50, BZ1 = 66, BT = 1.2;
const FALL = [1, 0.32, 0.1, 0], FLOOR = [-10, -10, 92, QY + (N - 1) * STEP + 14];

/** The board, upright in the plane y = BY and facing the queue: its back, its face and three printed rows. */
function board(P) {
  const shape = fillet([[BX - BW / 2, BZ0], [BX + BW / 2, BZ0], [BX + BW / 2, BZ1], [BX - BW / 2, BZ1]], [1.6, 1.6, 1.6, 1.6]);
  const at = (y) => (p) => P(p[0], y, p[1]);
  const rows = [61, 57, 53].map((z, k) => seg(P(BX - 9, BY, z), P(BX + 9 - k * 3, BY, z))).join('');
  return { back: poly(shape.map(at(BY - BT))), face: poly(shape.map(at(BY))), rows };
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let lean = value, act = -1;

  // Fitted to the floor, the board's top and a guest leaning out as far as the slider goes.
  const C = Cam(45, 0.5, S);
  fit(C, [[FLOOR[0], FLOOR[1], -4], [FLOOR[2], FLOOR[3], -4], [FLOOR[2], FLOOR[1], -4], [FLOOR[0], FLOOR[3], -4], [BX - BW / 2, BY, BZ1], [BX + BW / 2, BY, BZ1], [QX + 22 + BODY, QY, 32]], 200, 166);
  const P = proj(C), front = facing(C);
  const g = mk('g', {}, svg);

  // Back to front: the floor, the counter, the post and board, then the guests from the counter outwards.
  const [fr, fi] = rings(...FLOOR, 8, 2);
  put(solid(g), prism(P, front, fr, fi, -4, 0));
  const [cr, ci] = rings(0, 0, CW, CD, 5, 1.6);
  put(solid(g), prism(P, front, cr, ci, 0, CZ));
  const [pr, pi] = rings(BX - 1, BY - 2.2, BX + 1, BY - 0.2, 1, 0.4);
  put(solid(g), prism(P, front, pr, pi, CZ, BZ0));
  const b = board(P);
  mk('path', { d: b.back, class: 'lo' }, g);
  const face = mk('path', { d: b.face, class: 'sil hi' }, g);
  mk('path', { d: b.rows, class: 'nf lo' }, g);

  const guests = [];
  for (let k = 0; k < N; k++) {
    const grp = mk('g', {}, g);
    const sight = mk('path', { class: 'nf dash' }, grp);
    // A guest: a coat that widens to the shoulders, and a round head (a sphere seen from anywhere is a circle).
    const body = solid(grp), head = mk('ellipse', { rx: HEAD * S, ry: HEAD * S, class: 'sil' }, grp);
    guests.push({ k, cy: QY + k * STEP, sight, body, head, x: tween(0), drawn: NaN });
  }

  function draw(q, dx) {
    if (dx === q.drawn) return;
    q.drawn = dx;
    const cx = QX + dx, foot = rrect(cx - FOOT, q.cy - FOOT, cx + FOOT, q.cy + FOOT, FOOT, 4);
    const [sr, si] = rings(cx - BODY, q.cy - BODY, cx + BODY, q.cy + BODY, BODY, 1.3);
    put(q.body, { sil: poly(hull(ringAt(P, foot, 0).concat(ringAt(P, sr, NECK)))), crease: open(ringAt(P, run(si, front), NECK)) });
    const [hx, hy] = P(cx, q.cy, NECK + 1.2 + HEAD);
    q.head.setAttribute('cx', hx);
    q.head.setAttribute('cy', hy);
    q.sight.setAttribute('d', seg(P(cx, q.cy, 30), P(BX, BY, (BZ0 + BZ1) / 2)));
  }

  const B = register(stage, (_dt, now) => {
    let moving = false;
    for (const q of guests) {
      draw(q, tval(q.x, now));
      if (!tdone(q.x, now)) moving = true;
    }
    return moving;
  });
  bag.add(B.unregister);

  // Rest centres along the line, and the line's box at rest: neither moves when a guest leans out.
  const centres = guests.map((q) => P(QX, q.cy, 16)[0]);
  const pts = guests.flatMap((q) => [P(QX - BODY, q.cy - BODY, 0), P(QX + BODY + 22, q.cy + BODY, 0), P(QX - BODY, q.cy - BODY, 34), P(QX + BODY, q.cy + BODY, 34)]);
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const box = [Math.min(...xs) - 6, Math.min(...ys), Math.max(...xs) + 6, Math.max(...ys)];
  function hit([x, y]) {
    if (x < box[0] || x > box[2] || y < box[1] || y > box[3]) return -1;
    let best = 0;
    centres.forEach((c, i) => { if (Math.abs(c - x) < Math.abs(centres[best] - x)) best = i; });
    return best;
  }

  /** Leans guest a out of the line, and less, the ones beside them (-1 stands everyone back in line). */
  function apply(a) {
    const now = performance.now(), from = a >= 0 ? a : act;
    act = a;
    for (const q of guests) {
      const d = a < 0 ? 3 : clamp(Math.abs(q.k - a), 0, 3);
      tset(q.x, lean * FALL[d], now, Math.abs(q.k - from) * STAG);
      q.sight.classList.toggle('dash', q.k !== a);
      q.sight.classList.toggle('hi', q.k === a);
    }
    face.classList.toggle('hi', a < 0);
    read.textContent = a < 0 ? 'rest' : `${a + 2} m`;
    B.wake();
  }
  apply(-1);

  bag.add(pointer(stage, {
    move: (p) => { const a = hit(p); if (a !== act) apply(a); },
    leave: () => { if (act !== -1) apply(-1); },
  }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { lean = v; if (act >= 0) apply(act); },
    destroy: bag.dispose,
  };
}

export const figure = ({
  name: 'queue',
  means: 'A queue at a counter under a small printed board: the guest under the pointer leans out of the line to read it.',
  rules: [1, 2, 3, 4],
  range: [8, 14, 22],
  tour: [[140, 169], [191, 143], [216, 131], null],
  mount,
});
