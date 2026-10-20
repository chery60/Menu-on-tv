import { HL } from './kernel.mjs';
/**
 * Flyers: a till on the counter, and beside it a holder of five combo flyers
 * leaning back where nobody looks. The flyer under the pointer stands up and
 * lifts out; the ones in front lean forward and the ones behind lean back,
 * staggered outwards from it on the 700ms lift curve. The read-out numbers the
 * flyer. The slider is the stagger, in ms.
 *
 * The pattern: discrete items, as in the package's Riffle. Tweens, a stagger
 * by distance, and a hit test on static bands along the resting top edges.
 */
const {
  Cam, clamp, facing, fillet, fit, hull, open, poly, proj, prism, rad, rings, ringAt, rrect, run, seg,
  tdone, tset, tval, tween, disposer, flatDot, mk, place, pointer, put, register, solid,
} = HL;

const N = 5, W = 34, H = 46, G = 7.5, REST = -14, BACK = -24, FWD = 18, LIFT = 12;
const X0 = -4, X1 = W + 4, Y0 = -7, Y1 = (N - 1) * G + 7, WH = 11, WR = 5, WT = 2;

/** A run of points ordered left to right on screen. */
const LR = (pts) => (pts[0][0] <= pts[pts.length - 1][0] ? pts : pts.slice().reverse());

/** The holder, which never moves: `far` is painted before the flyers, `near` after them. */
function holder(P, front, outer, inner) {
  const far = [
    [poly(hull(ringAt(P, outer, 0).concat(ringAt(P, outer, WH)))), 'sil'],
    [poly(ringAt(P, inner, WH)), 'nf'],
  ];
  const iF = LR(ringAt(P, run(inner, front), WH)), oT = LR(ringAt(P, run(outer, front), WH)), oB = LR(ringAt(P, run(outer, front), 0));
  const near = [
    [poly([...iF, oT[oT.length - 1], ...oB.slice().reverse(), oT[0]]), 'fo'],
    [open(oT), 'nf lo'],
    [open(iF), 'nf'],
    [open([oT[0], ...oB, oT[oT.length - 1]]), 'nf sil'],
  ];
  return { far, near };
}

/** The till beside it: a drawer base, a key deck dotted with keys, and the display at its back. */
function till(P, front, C, g) {
  const [b0, b1] = rings(-66, -6, -16, 40, 5, 1.6), [d0, d1] = rings(-62, -2, -32, 36, 3, 1.2), [s0, s1] = rings(-28, 6, -21, 30, 2, 0.9);
  put(solid(g), prism(P, front, b0, b1, 0, 12));
  mk('path', { d: seg(P(-60, 40, 6), P(-22, 40, 6)), class: 'nf lo' }, g);
  put(solid(g), prism(P, front, d0, d1, 12, 17));
  for (let k = 0; k < 12; k++) place(flatDot(g, C, 1.25, 'dot off'), P(-56 + (k % 3) * 9, 4 + Math.floor(k / 3) * 8.5, 17));
  put(solid(g), prism(P, front, s0, s1, 12, 32));
}

const SHAPE = fillet([[0, 0], [W, 0], [W, H], [0, H]], [1.4, 1.4, 2.4, 2.4]);

/** Flyer i leaning th degrees (negative leans back) and lifted: its back, face, header, the combo's box and two rows. */
function pose(P, i, th, lift) {
  const yb = i * G, s = Math.sin(rad(th)), c = Math.cos(rad(th));
  const w = (u, v) => P(u, yb + v * s, v * c + lift);
  const wb = (u, v) => P(u, yb + v * s - 1.2 * c, v * c + 1.2 * s + lift);
  const box = fillet([[5, 12], [W - 5, 12], [W - 5, 26], [5, 26]], [2, 2, 2, 2]);
  return {
    back: poly(SHAPE.map((p) => wb(p[0], p[1]))),
    face: poly(SHAPE.map((p) => w(p[0], p[1]))),
    head: seg(w(5, H - 7), w(W - 5, H - 7)),
    box: poly(box.map((p) => w(p[0], p[1]))),
    rows: seg(w(5, 33), w(W - 9, 33)) + seg(w(5, 37), w(W - 13, 37)),
  };
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let stag = value;

  // The camera is fitted to the till and the holder with a flyer lifted, so nothing leaves the frame in any pose.
  const C = Cam(45, 0.5, 2.5);
  fit(C, [[-66, -6, 0], [X1, Y1, 0], [-66, 40, 0], [X1, Y0, 0], [0, Y0, H + LIFT], [W, Y0, H + LIFT], [-28, 6, 32]], 200, 168);
  const P = proj(C), front = facing(C);
  const outer = rrect(X0, Y0, X1, Y1, WR, 6), inner = rrect(X0 + WT, Y0 + WT, X1 - WT, Y1 - WT, WR - WT, 6);

  const g = mk('g', {}, svg);
  till(P, front, C, g);
  const paths = holder(P, front, outer, inner);
  for (const [d, cls] of paths.far) mk('path', { d, class: cls }, g);

  const flyers = [];
  for (let i = 0; i < N; i++) {
    const grp = mk('g', {}, g);
    const back = mk('path', { class: 'lo' }, grp), face = mk('path', { class: 'sil' }, grp);
    const head = mk('path', { class: 'nf' }, grp), box = mk('path', { class: 'nf lo' }, grp), rows = mk('path', { class: 'nf lo' }, grp);
    flyers.push({ n: N - i, back, face, head, box, rows, a: tween(REST), z: tween(0) });
  }
  for (const [d, cls] of paths.near) mk('path', { d, class: cls }, g);

  // Hit bands: oblique strips along the RESTING top edges. They never move, and nothing draws them.
  const top = (i) => P(W / 2, i * G + H * Math.sin(rad(REST)), H * Math.cos(rad(REST)));
  const c0 = top(0), c1 = top(1), d = [c1[0] - c0[0], c1[1] - c0[1]];
  const px0 = P(0, 0, 0), px1 = P(1, 0, 0), ex = [px1[0] - px0[0], px1[1] - px0[1]];
  const HALF = W / 2 + 6, det = d[0] * ex[1] - d[1] * ex[0];
  function hit([x, y]) {
    const qx = x - c0[0], qy = y - c0[1];
    const s = (qx * ex[1] - qy * ex[0]) / det, r = (d[0] * qy - d[1] * qx) / det;
    if (Math.abs(r) > HALF || s < -0.5 || s > N + 1) return -1;
    return clamp(Math.round(s), 0, N - 1);
  }

  function draw(i, th, lift) {
    const f = flyers[i], q = pose(P, i, th, lift);
    for (const k of ['back', 'face', 'head', 'box', 'rows']) f[k].setAttribute('d', q[k]);
  }

  const B = register(stage, (_dt, now) => {
    let moving = false;
    flyers.forEach((f, i) => { draw(i, tval(f.a, now), tval(f.z, now)); if (!tdone(f.a, now) || !tdone(f.z, now)) moving = true; });
    return moving;
  });
  bag.add(B.unregister);

  let act = -1;
  /** Pulls flyer a (-1 puts them all back). The front flyer's combo box is the mark at rest. */
  function setActive(a) {
    const now = performance.now(), from = a >= 0 ? a : act;
    act = a;
    flyers.forEach((f, i) => {
      const delay = Math.abs(i - from) * stag;
      const th = a < 0 ? REST : i < a ? BACK : i > a ? FWD : 0;
      tset(f.a, th, now, delay); tset(f.z, a === i ? LIFT : 0, now, delay);
      f.face.classList.toggle('hi', i === a);
      const mark = a < 0 && i === N - 1;
      f.box.classList.toggle('hi', mark);
      f.box.classList.toggle('lo', !mark);
    });
    read.textContent = a < 0 ? 'rest' : `flyer ${flyers[a].n}`;
    B.wake();
  }
  setActive(-1);

  bag.add(pointer(stage, {
    move: (p) => { const a = hit(p); if (a !== act) setActive(a); },
    leave: () => { if (act !== -1) setActive(-1); },
  }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { stag = v; },
    destroy: bag.dispose,
  };
}

export const figure = ({
  name: 'flyers',
  means: 'A till, and beside it a holder of combo flyers nobody looks at: the flyer under the pointer stands up.',
  rules: [1, 2, 8, 10],
  range: [0, 40, 90],
  tour: [[251, 136], [277, 123], [304, 109], null],
  mount,
});
