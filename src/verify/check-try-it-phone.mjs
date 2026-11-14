#!/usr/bin/env node
// Usage: node src/verify/check-try-it-phone.mjs http://localhost:4340
// QA's checks for docs/prd/mt-98-try-it-on-phones.md ("How we'll know it works" 1 to 7, the Design
// section and its Rules), run in headless Chrome over the DevTools protocol. No dependencies.
// Chrome comes from CHROME_PATH, or the default macOS install. Lighthouse itself is not run: CLS is
// read from the browser's own layout-shift entries.
// XFAIL lines are known product failures, reported to the builder; they don't fail the run until fixed.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const base = (process.argv[2] ?? '').replace(/\/+$/, '');
if (!base) {
  console.error('usage: node src/verify/check-try-it-phone.mjs <base-url>');
  process.exit(2);
}
const CHROME = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DEBUG_PORT = 9341;
const PHONES = [375, 390, 430]; // Design: checked at 375 by 667, and at 390 and 430 widths.
const PHONE_HEIGHT = 667;
const KEYBOARD_HEIGHT = 360; // PRD: a keyboard-sized window of about 375 by 360 px when a field has focus.
const DESIGN_TV_HEIGHT_AT_375 = 193; // Design: "about 193px tall at 375px".
const TV_WITHIN_MS = 1000; // PRD: the name changes on the TV within a second.
const PX = 0.5; // sub-pixel tolerance

// Labels the section's fields carry (builder in src/content/site-content.ts).
const CAFE = '#try-cafe';
const dishName = (n) => `#your-menu input[aria-label="Dish ${n}"]`;
const dishPrice = (n) => `#your-menu input[aria-label="Price in rupees, dish ${n}"]`;
// The home page's sections in order (page.tsx before MT-98); the PRD keeps that order.
const HOME_ORDER = ['hero-title', 'statement', 'problems-title', 'plan-title', 'demo-title', 'steps-title', 'madefor-title', 'rules-title', 'try-title', 'faq-title', 'early-title'];

let failed = 0;
const check = (ok, label, detail = '') => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${!ok && detail ? ` :: ${detail}` : ''}`);
};
// A known product failure: printed and kept, not counted. Once it passes, the mark has to go.
const xfail = (ok, label, detail = '') => {
  if (ok) failed++;
  console.log(ok ? `FAIL now passes, drop the xfail mark: ${label}` : `XFAIL ${label} :: ${detail}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- Chrome and the DevTools protocol ----
async function launch() {
  const profile = mkdtempSync(join(tmpdir(), 'mtv-qa-chrome-'));
  const args = ['--headless=new', `--remote-debugging-port=${DEBUG_PORT}`, `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--window-size=1280,800', 'about:blank'];
  const proc = spawn(CHROME, args, { stdio: 'ignore' });
  for (let i = 0; i < 100; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/new?about:blank`, { method: 'PUT' });
      if (res.ok) return { proc, profile, target: await res.json() };
    } catch {}
    await sleep(100);
  }
  proc.kill();
  rmSync(profile, { recursive: true, force: true });
  throw new Error(`Chrome did not open its debugging port (${CHROME})`);
}

function connect(url) {
  const ws = new WebSocket(url);
  let id = 0;
  const pending = new Map();
  const waiters = [];
  ws.onmessage = ({ data }) => {
    const msg = JSON.parse(data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
    } else if (msg.method) {
      for (const w of waiters.filter((w) => w.method === msg.method)) {
        waiters.splice(waiters.indexOf(w), 1);
        w.resolve(msg.params);
      }
    }
  };
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      pending.set(++id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  const once = (method) => new Promise((resolve) => waiters.push({ method, resolve }));
  return new Promise((resolve, reject) => {
    ws.onopen = () => resolve({ send, once, close: () => ws.close() });
    ws.onerror = () => reject(new Error('could not connect to Chrome'));
  });
}

let cdp;
async function js(expression) {
  const r = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
  return r.result.value;
}
const viewport = (width, height) => cdp.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 1000 });
const q = (sel) => JSON.stringify(sel);

// Page-side helpers. Offsets are from the top of the Try it section, so the scroll scenes higher up
// (sized by the window's height) can't pass for a jump in this section.
const HELPERS = `window.__qa = (() => {
  const sec = () => document.getElementById('your-menu');
  const tv = () => sec().querySelector('.mtv-tv-screen');
  const box = (el) => { const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height }; };
  const sticky = () => { for (let n = tv(); n && n !== sec(); n = n.parentElement) if (getComputedStyle(n).position === 'sticky') return n; return null; };
  const barBottom = () => { const nav = document.querySelector('header.mtv-nav'); if (!nav) return 0; const p = getComputedStyle(nav).position; const b = nav.getBoundingClientRect().bottom; return (p === 'sticky' || p === 'fixed') && b > 0 ? b : 0; };
  const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  // The site scrolls smoothly: wait until the page stops moving.
  const settle = async () => { let last = -1, still = 0; for (let i = 0; i < 400 && still < 5; i++) { await frame(); if (scrollY === last) still++; else { still = 0; last = scrollY; } } };
  const measure = (el) => {
    const s = box(sec()), f = el ? box(el) : null, t = box(tv()), h = innerHeight, bar = barBottom();
    const hit = f ? document.elementFromPoint((f.left + f.right) / 2, (f.top + f.bottom) / 2) : null;
    return { h, bar, tv: t, section: s, field: f, active: !!el && document.activeElement === el,
      label: el ? el.getAttribute('aria-label') || el.id : null,
      tvInView: t.top >= bar - ${PX} && t.bottom <= h + ${PX} && t.left >= -${PX} && t.right <= innerWidth + ${PX},
      fieldInView: !!f && f.top >= t.bottom - ${PX} && f.bottom <= h + ${PX} && !!hit && (hit === el || el.contains(hit)),
      offsets: [...sec().querySelectorAll('input')].map((i) => Math.round((box(i).top - s.top) * 10) / 10) };
  };
  return {
    box, sticky, frame, settle, measure,
    at: (sel) => measure(document.querySelector(sel)),
    focused: () => { const a = document.activeElement; return { inSection: sec().contains(a), isInput: a.tagName === 'INPUT', ...measure(a) }; },
    refocus: async () => { const a = document.activeElement; a.blur(); a.focus(); await settle(); },
    tvText: () => tv().textContent,
    hydrated: () => { const el = document.querySelector('${CAFE}'); return !!el && Object.keys(el).some((k) => k.startsWith('__reactFiber')); },
    reveal: async (sel, block) => { document.querySelector(sel).scrollIntoView({ block, behavior: 'instant' }); await settle(); },
    overflow: () => {
      const wide = [];
      for (const el of sec().querySelectorAll('*')) {
        if (el.closest('.mtv-tv-screen') && !el.classList.contains('mtv-tv-screen')) continue; // the TV clips its own content
        const r = el.getBoundingClientRect();
        if (r.width && r.right > innerWidth + ${PX}) wide.push((el.className || el.tagName) + ' right ' + Math.round(r.right));
      }
      return { scrollWidth: document.scrollingElement.scrollWidth, innerWidth, wide: wide.slice(0, 5) };
    },
  };
})(); true`;

async function open(width, height, { reducedMotion = false } = {}) {
  await viewport(width, height);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: reducedMotion ? 'reduce' : 'no-preference' }] });
  const loaded = cdp.once('Page.loadEventFired');
  await cdp.send('Page.navigate', { url: `${base}/` });
  await loaded;
  await cdp.send('Page.bringToFront'); // a background tab never hydrates
  await js(HELPERS);
  for (let i = 0; i < 100 && !(await js('__qa.hydrated()')); i++) await sleep(100);
  check(await js('__qa.hydrated()'), `${width}px Try it form hydrates`);
}

async function tap(sel) {
  const f = (await js(`__qa.at(${q(sel)})`)).field;
  const x = (f.left + f.right) / 2, y = (f.top + f.bottom) / 2;
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  await js('__qa.settle()');
}

async function nextKey() {
  await cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  await js('__qa.settle()');
}

async function waitForTv(texts, ms) {
  const start = Date.now();
  while (Date.now() - start <= ms) {
    const shown = await js('__qa.tvText()');
    if (texts.every((t) => shown.includes(t))) return Date.now() - start;
    await sleep(50);
  }
  return null;
}

const same = (a, b) => a.offsets.length === b.offsets.length && a.offsets.every((v, i) => Math.abs(v - b.offsets[i]) <= 1) && Math.abs(a.tv.height - b.tv.height) <= 1;
const hiddenAt = (m) => `${m.label} at ${Math.round(m.field.top)}-${Math.round(m.field.bottom)}px, TV ${Math.round(m.tv.top)}-${Math.round(m.tv.bottom)}px`;

// "How we'll know" 1 to 4: tap a field, the keyboard comes up, type. Returns where the field ended up.
async function typeIn(width, sel, label, text) {
  await viewport(width, PHONE_HEIGHT);
  await js(`__qa.reveal(${q(sel)}, 'center')`);
  const before = await js(`__qa.at(${q(sel)})`);
  check(before.fieldInView, `${width}px ${label}: the field can be tapped, not under the TV`, hiddenAt(before));
  await tap(sel);
  const focused = await js(`__qa.at(${q(sel)})`);
  check(focused.active, `${width}px ${label}: tapping focuses it`);
  check(same(before, focused), `${width}px ${label}: nothing jumps on focus`, `${before.offsets} -> ${focused.offsets}`);

  // The keyboard opens. The section's layout must not move; the browser then brings the focused
  // field back into view itself (its own focus scroll stands in for the keyboard's).
  await viewport(width, KEYBOARD_HEIGHT);
  await js('__qa.settle()');
  const opened = await js(`__qa.at(${q(sel)})`);
  check(same(focused, opened), `${width}px ${label}: nothing jumps when the keyboard opens`, `${focused.offsets} -> ${opened.offsets}`);
  if (!opened.fieldInView) await js('__qa.refocus()');

  const shownBefore = (await js('__qa.tvText()')).includes(text);
  await js(`document.querySelector(${q(sel)}).select()`);
  await cdp.send('Input.insertText', { text });
  const took = shownBefore ? null : await waitForTv([text], TV_WITHIN_MS);

  const m = await js(`__qa.at(${q(sel)})`);
  check(m.tvInView, `${width}x${KEYBOARD_HEIGHT} ${label}: the whole TV screen is in view, below the site bar`, `tv ${JSON.stringify(m.tv)}, bar ${m.bar}, window ${m.h}`);
  check(m.tv.bottom <= m.section.bottom + PX, `${width}px ${label}: the TV stays inside the section`);
  const o = await js('__qa.overflow()');
  check(o.scrollWidth <= o.innerWidth && o.wide.length === 0, `${width}x${KEYBOARD_HEIGHT} ${label}: no horizontal scroll with the field focused`, JSON.stringify(o));

  // The keyboard closes and the field loses focus.
  await js('document.activeElement.blur(); __qa.settle()');
  const blurred = await js(`__qa.at(${q(sel)})`);
  check(same(m, blurred) && Math.abs(m.tv.top - blurred.tv.top) <= 1, `${width}px ${label}: nothing jumps on blur`, `${m.offsets} -> ${blurred.offsets}`);
  await viewport(width, PHONE_HEIGHT);
  await js('__qa.settle()');
  const closed = await js(`__qa.at(${q(sel)})`);
  check(same(blurred, closed), `${width}px ${label}: nothing jumps when the keyboard closes`, `${blurred.offsets} -> ${closed.offsets}`);
  return { shownBefore, took, m };
}

const tvCheck = (width, label, text, r) =>
  check(!r.shownBefore && r.took !== null, `${width}px ${label}: the TV shows "${text}" within a second`, r.shownBefore ? 'already on the TV before typing' : 'not on the TV in time');

async function homeOrder(width) {
  const order = await js(`[...document.querySelectorAll('section')].filter((s) => !s.parentElement.closest('section')).map((s) => ({
    id: s.getAttribute('aria-labelledby') ?? (s.className.includes('statement') ? 'statement' : s.className), top: s.getBoundingClientRect().top + scrollY }))`);
  check(JSON.stringify(order.map((s) => s.id)) === JSON.stringify(HOME_ORDER), `${width}px home sections in their order, Try it between the rules and the FAQ`, order.map((s) => s.id).join(', '));
  const tops = order.map((s) => s.top);
  check(tops.every((t, i) => i === 0 || t >= tops[i - 1]), `${width}px home sections show in that order down the page`, tops.map(Math.round).join(', '));
}

async function phone(width) {
  await open(width, PHONE_HEIGHT);
  await homeOrder(width);
  const o = await js('__qa.overflow()');
  check(o.scrollWidth <= o.innerWidth && o.wide.length === 0, `${width}x${PHONE_HEIGHT} no horizontal scroll`, JSON.stringify(o));

  // Design: the TV above the fields, sticky, a 16:9 screen; copy, fields and the button stay.
  await js(`__qa.reveal('#your-menu', 'start')`);
  const layout = await js(`(() => {
    const s = document.getElementById('your-menu'), q = (x) => s.querySelector(x), b = (x) => q(x) && __qa.box(q(x));
    return { tv: b('.mtv-tv-screen'), cafe: b('${CAFE}'), title: b('#try-title'), cta: b('a[href="#early-access"]'), sticky: !!__qa.sticky(),
      dishes: s.querySelectorAll('input[aria-label^="Dish "]').length, lead: !!q('.mtv-lead'), add: !!q('.mtv-try-add'), privacy: !!q('#try-privacy') };
  })()`);
  check(layout.tv.bottom <= layout.cafe.top + PX, `${width}px the TV sits above the fields`, `tv bottom ${layout.tv.bottom}, café field top ${layout.cafe.top}`);
  check(layout.sticky, `${width}px the TV is pinned with position: sticky`);
  check(Math.abs(layout.tv.width / layout.tv.height - 16 / 9) < 0.02, `${width}px the TV screen is 16:9`, `${layout.tv.width}x${layout.tv.height}`);
  check(layout.title.top < layout.cafe.top && layout.cafe.top < layout.cta.top && layout.lead && layout.add && layout.privacy && layout.dishes === 4,
    `${width}px title, lead, café name, the four sample dishes, add button, privacy note and early-access button are all there`, JSON.stringify(layout));
  if (width === 375) {
    xfail(Math.abs(layout.tv.height - DESIGN_TV_HEIGHT_AT_375) <= DESIGN_TV_HEIGHT_AT_375 * 0.1, '375px the TV is about 193px tall (Design, within 10%)', `measured ${layout.tv.height.toFixed(1)}px`);
  }

  // "How we'll know" 1 to 3. The Design: "leaves room for the field below it".
  const hidden = [];
  const run = async (sel, label, text) => {
    const r = await typeIn(width, sel, label, text);
    if (!r.m.fieldInView) hidden.push(hiddenAt(r.m));
    return r;
  };
  tvCheck(width, 'café name', 'Chai Point', await run(CAFE, 'café name', 'Chai Point'));
  tvCheck(width, 'third dish name', 'Bun maska', await run(dishName(3), 'third dish name', 'Bun maska'));
  tvCheck(width, 'third dish price', '149', await run(dishPrice(3), 'third dish price', '149'));

  await viewport(width, PHONE_HEIGHT);
  await js(`__qa.reveal('#your-menu .mtv-try-add', 'center')`);
  await tap('#your-menu .mtv-try-add');
  const count = await js(`document.querySelectorAll('#your-menu input[aria-label^="Dish "]').length`);
  check(count === 5, `${width}px "Add a dish" adds a fifth dish`, `${count} dishes`);
  const added = await run(dishName(count), 'added dish name', 'Kulhad chai');
  // The TV leaves out a dish with no price yet, so typing a new dish's name changes nothing on it.
  xfail(!added.shownBefore && added.took !== null, `${width}px added dish name: the TV shows "Kulhad chai" as it is typed, before it has a price`, 'the TV changes only once the price is typed');
  await run(dishPrice(count), 'added dish price', '239');
  check((await waitForTv(['Kulhad chai', '239'], TV_WITHIN_MS)) !== null, `${width}px added dish: the TV shows "Kulhad chai" at 239 once both are typed`);

  xfail(hidden.length === 0, `${width}x${KEYBOARD_HEIGHT} with the keyboard up, each field typed in is in view below the TV`, `under the TV: ${hidden.join('; ')}`);

  // A phone keyboard's "next" key: the browser scrolls each field into view on its own.
  await viewport(width, PHONE_HEIGHT);
  await js(`__qa.reveal('${CAFE}', 'center')`);
  await tap(CAFE);
  await viewport(width, KEYBOARD_HEIGHT);
  await js('__qa.refocus()');
  const nextHidden = [];
  let tvAlways = true;
  for (let i = 0; i < 60; i++) {
    await nextKey();
    const f = await js('__qa.focused()');
    if (!f.inSection) break;
    if (!f.isInput) continue;
    tvAlways &&= f.tvInView;
    if (!f.fieldInView) nextHidden.push(hiddenAt(f));
  }
  check(tvAlways, `${width}x${KEYBOARD_HEIGHT} "next" through every field: the whole TV stays in view`);
  xfail(nextHidden.length === 0, `${width}x${KEYBOARD_HEIGHT} "next" through every field: each field lands in view below the TV`, `under the TV: ${nextHidden.join('; ')}`);
  await js('document.activeElement.blur(); true');

  // Design: a paper ground under the pinned TV, so the fields scroll beneath it cleanly.
  await viewport(width, PHONE_HEIGHT);
  await js(`__qa.reveal(${q(dishName(2))}, 'center')`);
  const ground = await js(`(async () => {
    const band = __qa.box(__qa.sticky()), row = document.querySelector(${q(dishName(2))}).closest('li');
    window.scrollBy({ top: __qa.box(row).top - (band.top + band.height / 2), behavior: 'instant' });
    await __qa.settle();
    const b = __qa.box(__qa.sticky()), form = document.querySelector('#your-menu form'), f = __qa.box(form), leaks = [];
    for (const y of [b.top + 2, b.top + b.height / 2, b.bottom - 2])
      for (let x = Math.max(f.left, 0) + 1; x < Math.min(f.right, innerWidth); x += 8) {
        const hit = document.elementFromPoint(x, y);
        if (hit && form.contains(hit)) leaks.push(Math.round(x) + ',' + Math.round(y));
      }
    const cs = getComputedStyle(__qa.sticky());
    return { band: b, leaks: leaks.slice(0, 5), bg: cs.backgroundColor, rule: cs.borderBottomWidth + ' ' + cs.borderBottomStyle, shadow: cs.boxShadow };
  })()`);
  check(ground.leaks.length === 0, `${width}px fields scrolled under the pinned TV don't show through it`, JSON.stringify(ground));
  const opaque = ground.bg !== 'transparent' && !/rgba\(.*,\s*0(\.\d+)?\)$/.test(ground.bg);
  check(opaque && (parseFloat(ground.rule) > 0 || ground.shadow !== 'none'), `${width}px the pinned TV has a paper ground and a rule under it`, JSON.stringify(ground));

  // Design: past the section, the TV scrolls away as usual.
  const past = await js(`(async () => { const s = document.getElementById('your-menu'); window.scrollTo({ top: s.getBoundingClientRect().bottom + scrollY + 50, behavior: 'instant' }); await __qa.settle(); return { tv: __qa.box(s.querySelector('.mtv-tv-screen')), section: __qa.box(s) }; })()`);
  check(past.tv.bottom <= 0, `${width}px past the section, the TV has scrolled away with it`, JSON.stringify(past));
}

async function computer(width) {
  await open(width, 800);
  if (width === 1280) await homeOrder(width);
  await js(`__qa.reveal('#your-menu', 'start')`);
  const m = await js(`(() => {
    const s = document.getElementById('your-menu');
    return { form: __qa.box(s.querySelector('form')), tv: __qa.box(s.querySelector('.mtv-try-tv')), sw: document.scrollingElement.scrollWidth, w: innerWidth };
  })()`);
  check(m.tv.left >= m.form.right - PX && m.tv.top < m.form.bottom && m.form.top < m.tv.bottom, `${width}px the TV stays beside the form`, JSON.stringify(m));
  check(m.sw <= m.w, `${width}px no horizontal scroll`, `${m.sw} > ${m.w}`);
}

async function breakpoint() {
  // Design: "Under 1000px" the TV moves above the fields and pins; "From 1000px" no change.
  await open(999, 800);
  await js(`__qa.reveal('#your-menu', 'start')`);
  const m = await js(`({ tv: __qa.box(document.querySelector('#your-menu .mtv-tv-screen')), cafe: __qa.box(document.querySelector('${CAFE}')), sticky: !!__qa.sticky() })`);
  check(m.tv.bottom <= m.cafe.top + PX, '999px the TV sits above the fields', JSON.stringify(m));
  check(m.sticky, '999px the TV is pinned with position: sticky');
}

async function reducedMotion() {
  // "How we'll know" 6: with reduced motion, nothing animates as the TV pins. The TV frame and its
  // wrappers only: the screen player animates its own slides.
  await open(375, PHONE_HEIGHT, { reducedMotion: true });
  await js(`__qa.reveal('#your-menu', 'start')`);
  const moving = await js(`(async () => {
    const tv = document.querySelector('#your-menu .mtv-tv-screen'), seen = new Set();
    const chain = () => { const out = []; for (let n = tv; n && n.id !== 'your-menu'; n = n.parentElement) out.push(n); return out; };
    for (let i = 0; i < 12; i++) {
      window.scrollBy({ top: 40, behavior: 'instant' });
      await __qa.frame();
      for (const el of chain()) {
        const cs = getComputedStyle(el);
        if (cs.transitionDuration.split(',').some((d) => parseFloat(d) >= 0.01)) seen.add(el.className + ' transition ' + cs.transitionProperty + ' ' + cs.transitionDuration);
        if (cs.animationName !== 'none') seen.add(el.className + ' animation ' + cs.animationName);
        for (const a of el.getAnimations()) if (a.playState === 'running') seen.add(el.className + ' running ' + (a.animationName ?? a.transitionProperty ?? 'animation'));
      }
    }
    return [...seen];
  })()`);
  check(moving.length === 0, '375px reduced motion: the TV pins with no transition or animation', moving.join('; '));
}

async function layoutShift() {
  // "How we'll know" 7: no new layout shift from this section; CLS under 0.1 at phone width.
  await open(375, PHONE_HEIGHT);
  const cls = await js(`(async () => {
    const entries = [];
    new PerformanceObserver((l) => entries.push(...l.getEntries())).observe({ type: 'layout-shift', buffered: true });
    const s = document.getElementById('your-menu'), end = s.getBoundingClientRect().bottom + scrollY;
    for (let y = 0; y < end; y += 300) { window.scrollTo({ top: y, behavior: 'instant' }); await __qa.frame(); }
    await new Promise((r) => setTimeout(r, 500));
    const counted = entries.filter((e) => !e.hadRecentInput);
    const fromTry = counted.filter((e) => e.sources.some((src) => src.node && s.contains(src.node)));
    return { total: counted.reduce((a, e) => a + e.value, 0), fromTry: fromTry.reduce((a, e) => a + e.value, 0) };
  })()`);
  check(cls.fromTry < 0.001, '375px no layout shift from the Try it section', cls.fromTry.toFixed(4));
  check(cls.total < 0.1, '375px home page CLS stays under 0.1', cls.total.toFixed(4));
}

const { proc, profile, target } = await launch();
try {
  cdp = await connect(target.webSocketDebuggerUrl);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await layoutShift();
  for (const width of PHONES) await phone(width);
  await breakpoint();
  for (const width of [1000, 1280]) await computer(width);
  await reducedMotion();
} catch (e) {
  check(false, 'run', e.stack ?? String(e));
} finally {
  cdp?.close();
  proc.kill();
  await sleep(200);
  rmSync(profile, { recursive: true, force: true });
}

console.log(failed ? `\n${failed} check(s) FAILED` : '\nall checks passed');
process.exit(failed ? 1 : 0);
