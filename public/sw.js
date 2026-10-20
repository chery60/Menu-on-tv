/*
 * MenuOnTV screen service worker (scope /s/). Keeps a TV playing when the internet drops:
 * - Pages, screen bundles and the player's script and styles (fixed names): network first, last good copy
 *   when offline or when the server answers with an error.
 * - Fonts, Next.js static assets and dish photos (never change once made): cache first.
 * - Server-sent events and heartbeats always go to the network.
 */
const CACHE = 'menutelly-screen-v2';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('menutelly-screen-') && key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

// The page tells us what it loaded before this worker took control, so the first visit is cached too.
self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || data.type !== 'cache' || !Array.isArray(data.urls)) return;
  const urls = data.urls.filter((url) => typeof url === 'string' && new URL(url, self.location.origin).origin === self.location.origin);
  event.waitUntil(caches.open(CACHE).then((cache) => Promise.all(urls.map((url) => cache.add(url).catch(() => undefined)))));
});

const isStatic = (url) => ['/_next/static/', '/api/photos/', '/fonts/'].some((prefix) => url.pathname.startsWith(prefix));
const isFresh = (url) => url.pathname.startsWith('/player/') || (url.pathname.startsWith('/api/s/') && url.pathname.endsWith('/bundle'));

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    // Cache only full answers; a 304 means the TV already has this version.
    if (response.ok && response.status === 200) await cache.put(request.url, response.clone());
    // A server error shouldn't blank the screen: play the last good copy if there is one.
    if (response.status >= 500) return (await cache.match(request.url)) ?? response;
    return response;
  } catch (error) {
    const cached = await cache.match(request.url);
    if (cached) return cached;
    throw error;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request.url);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) await cache.put(request.url, response.clone());
  return response;
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isStatic(url)) return event.respondWith(cacheFirst(request));
  if (request.mode === 'navigate' || isFresh(url)) return event.respondWith(networkFirst(request));
});
