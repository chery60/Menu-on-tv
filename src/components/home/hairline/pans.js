import { HL } from './kernel.mjs';
/**
 * Pans: four steel pans on a counter, each holding a heap of food sized to
 * what is left in it, and one already bare. The pan under the pointer lifts
 * off the counter, its neighbours a little after it, so the bare one shows
 * its floor when it is asked for. The read-out names the pan and the portions
 * left in it. The slider is the lift, in world units.
 *
 * The pattern: one of many. Tweens, a stagger by distance with a falloff, and
 * a hit test on the rest centres along the row, which never move.
 */
const {
  Cam, clamp, facing, fit, hull, open, poly, proj, prism, rings, ringAt, rrect, run,
  tween, tset, tval, tdone, disposer, mk, pointer, put, register, solid,
} = HL;

const N = 4, PW = 30, PD = 46, PITCH = 37, WH = 13, WT = 1.8, STAG = 50;
const LEFT = [6, 3, 0, 5], FALL = [1, 0.3, 0.1, 0];
const X1 = (N - 1) * PITCH + PW, LIP = 8, CH = 10;

/** A run of points ordered left to right on screen. */
const LR = (pts) => (pts[0][0] <= pts[pts.length - 1][0] ? pts : pts.slice().reverse());

/** Pan i standing at height z0: the far half, the heap and the near half, each a list of [d, class]. */
function pan(P, front, i, z0) {
  const x0 = i * PITCH, top = z0 + WH;
  const outer = rrect(x0, 0, x0 + PW, PD, 4, 6), inner = rrect(x0 + WT, WT, x0 + PW - WT, PD - WT, 4 - WT, 6);
  const far = [
    [poly(hull(ringAt(P, outer, z0).concat(ringAt(P, outer, top)))), 'sil'],
    [poly(ringAt(P, inner, top)), 'nf'],
    [open(ringAt(P, run(inner, (q) => !front(q)), z0 + 2)), 'nf lo'],
  ];
  // A heap is a solid whose top is smaller than its foot: two rings, a hull and one crease.
  let heap = null;
  if (LEFT[i] > 0) {
    const z1 = z0 + 2, z2 = z1 + 3 + LEFT[i] * 2.2;
    const foot = rrect(x0 + 4, 4, x0 + PW - 4, PD - 4, 5, 6), cap = rrect(x0 + 8, 9, x0 + PW - 8, PD - 9, 3, 6);
    const crease = rrect(x0 + 9.2, 10.2, x0 + PW - 9.2, PD - 10.2, 1.8, 6);
    heap = { sil: poly(hull(ringAt(P, foot, z1).concat(ringAt(P, cap, z2)))), crease: open(ringAt(P, run(crease, front), z2)) };
  }
  const iF = LR(ringAt(P, run(inner, front), top)), oT = LR(ringAt(P, run(outer, front), top)), oB = LR(ringAt(P, run(outer, front), z0));
  const near = [
    [poly([...iF, oT[oT.length - 1], ...oB.slice().reverse(), oT[0]]), 'fo'],
    [open(oT), 'nf lo'],
    [open(iF), 'nf'],
    [open([oT[0], ...oB, oT[oT.length - 1]]), 'nf sil'],
  ];
  return { far, heap, near };
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let lift = value, act = -1;

  // Fitted with a pan at its highest and its heap on top, so nothing leaves the frame at the far end.
  const C = Cam(45, 0.5, 1.9);
  const zMax = 30 + 2 + 3 + 6 * 2.2;
  fit(C, [[-LIP, -LIP, -CH], [X1 + LIP, PD + LIP, -CH], [X1 + LIP, -LIP, -CH], [-LIP, PD + LIP, -CH], [0, 0, zMax], [X1, 0, zMax], [0, PD, zMax]], 200, 170);
  const P = proj(C), front = facing(C);

  // The counter, and a dashed footprint where each pan stands: guides, painted before the pans.
  const g = mk('g', {}, svg);
  const [cr, ci] = rings(-LIP, -LIP, X1 + LIP, PD + LIP, 6, 2);
  put(solid(g), prism(P, front, cr, ci, -CH, 0));
  for (let i = 0; i < N; i++) mk('path', { d: poly(ringAt(P, rrect(i * PITCH, 0, i * PITCH + PW, PD, 4, 6), 0)), class: 'nf dash' }, g);

  const pans = [];
  for (let i = 0; i < N; i++) {
    // Along x from the far end, so a nearer pan always covers a farther one.
    const grp = mk('g', {}, g), q = pan(P, front, i, 0);
    const far = q.far.map(([d, cls]) => mk('path', { d, class: cls }, grp));
    const heap = q.heap ? solid(grp) : null;
    const near = q.near.map(([d, cls]) => mk('path', { d, class: cls }, grp));
    pans.push({ i, far, heap, near, rim: [far[1], near[2]], z: tween(0), drawn: NaN });
  }

  function draw(p, dz) {
    if (dz === p.drawn) return;
    p.drawn = dz;
    const q = pan(P, front, p.i, dz);
    q.far.forEach(([d], k) => p.far[k].setAttribute('d', d));
    if (p.heap) put(p.heap, q.heap);
    q.near.forEach(([d], k) => p.near[k].setAttribute('d', d));
  }

  const B = register(stage, (_dt, now) => {
    let moving = false;
    for (const p of pans) {
      draw(p, tval(p.z, now));
      if (!tdone(p.z, now)) moving = true;
    }
    return moving;
  });
  bag.add(B.unregister);

  // Rest centres along the row, and the row's box at rest: neither moves when a pan lifts.
  const centres = pans.map((p) => P(p.i * PITCH + PW / 2, PD / 2, WH)[0]);
  const pts = ringAt(P, cr, -CH).concat(ringAt(P, cr, 0), ...pans.map((p) => ringAt(P, rrect(p.i * PITCH, 0, p.i * PITCH + PW, PD, 4, 6), WH + 16)));
  const ys = pts.map((p) => p[1]), xs = pts.map((p) => p[0]);
  const box = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  function hit([x, y]) {
    if (x < box[0] || x > box[2] || y < box[1] || y > box[3]) return -1;
    let best = 0;
    centres.forEach((c, i) => { if (Math.abs(c - x) < Math.abs(centres[best] - x)) best = i; });
    return best;
  }

  /** Lifts pan a and, less, its neighbours (-1 sets them all down); the bare pan's rim is the mark at rest. */
  function apply(a) {
    const now = performance.now(), from = a >= 0 ? a : act;
    act = a;
    for (const p of pans) {
      const d = a < 0 ? 3 : clamp(Math.abs(p.i - a), 0, 3);
      tset(p.z, lift * FALL[d], now, Math.abs(p.i - from) * STAG);
      p.rim.forEach((el) => el.classList.toggle('hi', a < 0 ? LEFT[p.i] === 0 : p.i === a));
    }
    read.textContent = a < 0 ? 'rest' : `pan ${a + 1} · ${LEFT[a]}`;
    B.wake();
  }
  apply(-1);

  bag.add(pointer(stage, {
    move: (p) => { const a = hit(p); if (a !== act) apply(a); },
    leave: () => { if (act !== -1) apply(-1); },
  }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { lift = v; if (act >= 0) apply(act); },
    destroy: bag.dispose,
  };
}

export const figure = ({
  name: 'pans',
  means: 'Four steel pans on a counter, one already bare: the pan under the pointer lifts, and its neighbours after it.',
  rules: [1, 2, 3, 5],
  range: [12, 20, 30],
  tour: [[125, 137], [225, 187], [275, 212], null],
  mount,
});
