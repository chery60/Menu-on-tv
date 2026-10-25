#!/usr/bin/env node
// Usage: node src/verify/check-built-site.mjs http://localhost:4328
// Checks built HTML against docs/site-search-pages.md "Done when" 2 to 6. No dependencies.
const base = (process.argv[2] ?? '').replace(/\/+$/, '');
if (!base) {
  console.error('usage: node src/verify/check-built-site.mjs <base-url>');
  process.exit(2);
}

const NEW = ['/how-to-show-menu-on-tv', '/free-digital-menu-board', '/digital-menu-board-for-cafes', '/digital-menu-board-vs-printed-menu'];
const PAGES = ['/', '/how-it-works', '/pricing', '/demo', ...NEW];
// Pages that show a FAQ (design Done when 3). The guide has none.
const FAQ_PAGES = ['/', '/pricing', '/free-digital-menu-board', '/digital-menu-board-for-cafes', '/digital-menu-board-vs-printed-menu'];

let failed = 0;
const check = (ok, label, detail = '') => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${!ok && detail ? ` :: ${detail}` : ''}`);
};

const decode = (s) =>
  s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const strip = (s) => decode(s.replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();

function metaContent(html, attr, key) {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const k = tag.match(new RegExp(`\\b${attr}=["']([^"']*)["']`, 'i'));
    if (k && k[1] === key) {
      const c = tag.match(/\bcontent=["']([^"']*)["']/i);
      return c ? decode(c[1]) : '';
    }
  }
  return null;
}

function jsonLdNodes(html) {
  const nodes = [];
  for (const m of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(decode(m[1]));
      nodes.push(...(data['@graph'] ?? [data]));
    } catch {
      nodes.push({ __invalid: true });
    }
  }
  return nodes;
}

async function get(path, headers = {}) {
  const res = await fetch(base + path, { headers, redirect: 'manual' });
  return res;
}

for (const path of PAGES) {
  let html = '';
  try {
    const res = await get(path, { accept: 'text/html' });
    check(res.status === 200, `${path} status 200`, `got ${res.status}`);
    html = await res.text();
  } catch (e) {
    check(false, `${path} fetch`, String(e));
    continue;
  }

  const h1 = (html.match(/<h1\b/gi) ?? []).length;
  check(h1 === 1, `${path} exactly one <h1>`, `found ${h1}`);

  const canonical = html.match(/<link\b[^>]*rel=["']canonical["'][^>]*>/i)?.[0].match(/href=["']([^"']*)["']/i)?.[1];
  // Origin comes from the build's siteConfig.url, not the base URL, so compare the path only.
  const canonicalPath = canonical ? new URL(canonical, base).pathname : null;
  check(canonicalPath === path, `${path} canonical path`, `got ${canonical}`);

  for (const key of ['og:title', 'og:description', 'og:image']) {
    const v = metaContent(html, 'property', key);
    check(!!v, `${path} ${key}`, `got ${v}`);
  }
  check(metaContent(html, 'name', 'twitter:card') === 'summary_large_image', `${path} twitter:card summary_large_image`, `got ${metaContent(html, 'name', 'twitter:card')}`);
  const title = decode(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? '');
  check(title.length > 0 && title.length <= 60, `${path} <title> <= 60`, `${title.length}: ${title}`);
  const desc = metaContent(html, 'name', 'description') ?? '';
  check(desc.length > 0 && desc.length <= 160, `${path} description <= 160`, `${desc.length}`);

  const nodes = jsonLdNodes(html);
  check(!nodes.some((n) => n.__invalid), `${path} JSON-LD parses`);
  const crumbs = nodes.filter((n) => n['@type'] === 'BreadcrumbList');
  if (path !== '/') {
    check(crumbs.length === 1 && crumbs[0].itemListElement?.length === 2, `${path} BreadcrumbList with 2 items`, `found ${crumbs.length}`);
  }

  const faqNodes = nodes.filter((n) => n['@type'] === 'FAQPage');
  const summaries = [...html.matchAll(/<summary\b[^>]*>([\s\S]*?)<\/summary>/gi)].map((m) => strip(m[1]));
  if (FAQ_PAGES.includes(path)) {
    check(faqNodes.length === 1, `${path} one FAQPage`, `found ${faqNodes.length}`);
    const qs = (faqNodes[0]?.mainEntity ?? []).map((q) => q.name);
    // /pricing shows the home FAQ; home may have <summary> outside the FAQ (made-for accordion), so require the FAQ questions to appear as an in-order subsequence.
    let i = 0;
    for (const s of summaries) if (s === qs[i]) i++;
    check(qs.length > 0 && i === qs.length, `${path} FAQPage questions equal visible <summary> texts in order`, `schema ${JSON.stringify(qs)} vs summaries ${JSON.stringify(summaries)}`);
  } else {
    check(faqNodes.length === 0, `${path} no FAQPage`, `found ${faqNodes.length}`);
  }
}

// Share image: 1200 x 630 PNG, read from IHDR.
try {
  const res = await get('/opengraph-image');
  const buf = Buffer.from(await res.arrayBuffer());
  const isPng = buf.length > 24 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  check(res.status === 200 && isPng, '/opengraph-image is a PNG', `status ${res.status}, type ${res.headers.get('content-type')}`);
  if (isPng) {
    const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
    check(w === 1200 && h === 630, '/opengraph-image is 1200x630', `${w}x${h}`);
  }
} catch (e) {
  check(false, '/opengraph-image fetch', String(e));
}

// Markdown negotiation on every page (design Done when 5: new pages; others share /index.md too).
const indexMd = await (await get('/index.md')).text().catch(() => '');
for (const path of NEW) {
  const res = await get(path, { accept: 'text/markdown' });
  const body = await res.text();
  const ct = res.headers.get('content-type') ?? '';
  check(res.status === 200 && /markdown/i.test(ct), `${path} Accept: text/markdown returns markdown`, `status ${res.status}, type ${ct}`);
  check(body.length > 0 && body === indexMd, `${path} markdown body equals /index.md`);
}

// /index.md has every guide H1 and FAQ question; /llms.txt links every new page.
const llms = await (await get('/llms.txt')).text().catch(() => '');
for (const path of ['/how-it-works', '/pricing', ...NEW]) {
  check(llms.includes(`${path})`) || llms.includes(`${path}\n`), `/llms.txt links ${path}`);
}
for (const path of NEW) {
  const html = await (await get(path, { accept: 'text/html' })).text();
  const h1 = strip(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? '');
  check(h1.length > 0 && indexMd.includes(h1), `/index.md contains H1 of ${path}`, h1);
  for (const q of [...html.matchAll(/<summary\b[^>]*>([\s\S]*?)<\/summary>/gi)].map((m) => strip(m[1]))) {
    check(indexMd.includes(q), `/index.md contains FAQ question "${q}"`);
  }
}

// Footer Guides column: four links on every page; header still three cells.
for (const path of PAGES) {
  const html = await (await get(path, { accept: 'text/html' })).text();
  const missing = NEW.filter((p) => !html.includes(`href="${p}"`));
  check(missing.length === 0, `${path} footer links all four guides`, missing.join(', '));
}

console.log(failed ? `\n${failed} check(s) FAILED` : '\nall checks passed');
process.exit(failed ? 1 : 0);
