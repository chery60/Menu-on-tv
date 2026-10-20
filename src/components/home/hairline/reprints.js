import { HL } from './kernel.mjs';
/**
 * Reprints: five printed price sheets in a crooked pile, one reprint for every
 * price that changed; the newest carries a sticker over a price all the same.
 * The pointer's height picks a sheet and the sheets above it lift away,
 * staggered out from the one picked. Each sheet's print number is dotted in
 * its corner, and the row that changed on it prints a shade darker. The slider
 * is the lift, in world units.
 *
 * The pattern: pick from a stack. Tweens, a stagger by distance, and a hit test
 * on bands of the pile's rest box, which never moves.
 */
const {
  Cam, clamp, facing, fit, prism, proj, rad, rings, ringAt, seg,
  tween, tset, tval, tdone, disposer, flatDot, mk, place, pointer, put, register, solid,
} = HL;

const N = 5, W = 112, H = 80, T = 1.4, G = 4.4, PULL = 5, SPREAD = 4, STAG = 45;
const ANG = [-11, 6, -5, 9, -2], OFF = [[-10, 7], [9, -6], [-5, -10], [10, 6], [0, 0]];
const ROWS = [27, 38, 49, 60, 71], FRESH = [3, 0, 4, 1, 2], STICKER = 2;

/** A point on sheet i, in its own (u, v): turned about its centre and moved, so the pile is crooked. */
function local(i, u, v) {
  const s = Math.sin(rad(ANG[i])), c = Math.cos(rad(ANG[i])), du = u - W / 2, dv = v - H / 2;
  return [W / 2 + OFF[i][0] + du * c - dv * s, H / 2 + OFF[i][1] + du * s + dv * c];
}

/** A ring of samples carried onto sheet i, normals turned with it. */
function onSheet(i, ring) {
  const s = Math.sin(rad(ANG[i])), c = Math.cos(rad(ANG[i]));
  return ring.map((q) => {
    const [u, v] = local(i, q.u, q.v);
    return { u, v, nu: q.nu * c - q.nv * s, nv: q.nu * s + q.nv * c };
  });
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let lift = value, act = -1;

  // Fitted to the pile with the top sheet at its highest, so nothing leaves the frame at the far end.
  const C = Cam(45, 0.5, 1.84);
  const zMax = (N - 1) * G + T + PULL + 44 + SPREAD * (N - 2);
  fit(C, [[-16, -16, 0], [W + 16, H + 16, 0], [W + 16, -16, 0], [-16, H + 16, 0], [-16, -16, zMax], [W + 16, -16, zMax], [-16, H + 16, zMax]], 200, 168);
  const P = proj(C), front = facing(C);

  const g = mk('g', {}, svg), sheets = [];
  const [r0, r1] = rings(0, 0, W, H, 4, 1.4), [s0, s1] = rings(84, ROWS[STICKER] - 6, 106, ROWS[STICKER] + 5, 1.6, 0.7);
  for (let i = 0; i < N; i++) {
    // Bottom to top, so a higher sheet always covers a lower one.
    const grp = mk('g', {}, g), el = solid(grp);
    const head = mk('path', { class: 'nf' }, grp), rows = mk('path', { class: 'nf lo' }, grp), fresh = mk('path', { class: 'nf' }, grp);
    const dots = [];
    for (let k = 0; k <= i; k++) dots.push(flatDot(grp, C, 1.05, 'dot off'));
    const top = i === N - 1;
    const sticker = top ? solid(grp) : null, mark = top ? mk('path', { class: 'nf' }, grp) : null;
    sheets.push({ i, ring: onSheet(i, r0), inner: onSheet(i, r1), el, head, rows, fresh, dots, sticker, mark, z: tween(0), drawn: NaN });
  }
  const sRing = onSheet(N - 1, s0), sInner = onSheet(N - 1, s1);

  function draw(sh, dz) {
    if (dz === sh.drawn) return;
    sh.drawn = dz;
    const z0 = sh.i * G + dz, z1 = z0 + T, w = (u, v) => P(...local(sh.i, u, v), z1);
    put(sh.el, prism(P, front, sh.ring, sh.inner, z0, z1));
    sh.head.setAttribute('d', seg(w(10, 14), w(52, 14)));
    const row = (v, k) => seg(w(10, v), w(40 + ((k * 13) % 17), v)) + seg(w(86, v), w(102, v));
    sh.rows.setAttribute('d', ROWS.map((v, k) => (k === FRESH[sh.i] ? '' : row(v, k))).join(''));
    sh.fresh.setAttribute('d', row(ROWS[FRESH[sh.i]], FRESH[sh.i]));
    sh.dots.forEach((el, k) => place(el, w(W - 9 - k * 3.4, 8)));
    if (sh.sticker) {
      put(sh.sticker, prism(P, front, sRing, sInner, z1, z1 + 0.9));
      const m = (u, v) => P(...local(sh.i, u, v), z1 + 0.9);
      sh.mark.setAttribute('d', seg(m(88, ROWS[STICKER]), m(101, ROWS[STICKER])));
    }
  }

  const B = register(stage, (_dt, now) => {
    let moving = false;
    for (const sh of sheets) {
      draw(sh, tval(sh.z, now));
      if (!tdone(sh.z, now)) moving = true;
    }
    return moving;
  });
  bag.add(B.unregister);

  // The pile's box at rest, cut into one band per sheet: higher on screen picks a higher sheet.
  const pts = sheets.flatMap((sh) => ringAt(P, sh.ring, sh.i * G).concat(ringAt(P, sh.ring, sh.i * G + T)));
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const box = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  function hit([x, y]) {
    if (x < box[0] || x > box[2] || y < box[1] || y > box[3]) return -1;
    return clamp(N - 1 - Math.floor(((y - box[1]) / (box[3] - box[1])) * N), 0, N - 1);
  }

  /** Picks sheet a (-1 lays the pile back down); the sheets above it lift as one, slightly fanned. */
  function apply(a) {
    const now = performance.now(), from = a >= 0 ? a : act;
    act = a;
    for (const sh of sheets) {
      const i = sh.i, to = a < 0 || i < a ? 0 : i === a ? PULL : PULL + lift + (i - a - 1) * SPREAD;
      tset(sh.z, to, now, Math.abs(i - from) * STAG);
      sh.el.sil.classList.toggle('hi', i === a);
      sh.dots.forEach((d) => d.classList.toggle('m', i === a));
    }
    sheets[N - 1].sticker.sil.classList.toggle('hi', a < 0);
    read.textContent = a < 0 ? 'rest' : `print ${a + 1}`;
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
  name: 'reprints',
  means: 'A crooked pile of reprinted price sheets: the pointer picks one and the sheets above it lift away.',
  rules: [1, 2, 5, 6],
  range: [22, 32, 44],
  tour: [[200, 160], [200, 215], [200, 250], null],
  mount,
});
