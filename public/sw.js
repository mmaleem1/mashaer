/* eslint-env serviceworker */
/**
 * Mashaer service worker — app-shell caching only.
 *
 * The deliberate limits here matter more than what it caches:
 *
 *  0. NO LIVE DATA, whichever origin it comes from. `/api/*` is served by this
 *     same origin but brokers exactly the same live feeds and key status as the
 *     remote sources below, so it is excluded explicitly — see `isLiveData`.
 *
 *  1. SAME-ORIGIN GET ONLY. Every cross-origin request — Google 3D Tiles,
 *     Cesium ion, OpenSky, adsb.lol, AISStream, Nominatim, the font CDNs — is
 *     passed straight through untouched. Two reasons: those responses are LIVE
 *     DATA and a stale aircraft position served from a cache is a wrong answer,
 *     not a fast one; and opaque cross-origin responses cannot be inspected, so
 *     caching them silently stores failures as if they were content.
 *
 *  2. NETWORK-FIRST FOR THE DOCUMENT. The cached copy exists to render the
 *     shell when the network is gone, never to pin an old deploy.
 *
 *  3. CACHE-FIRST ONLY FOR HASHED BUILD OUTPUT. Vite fingerprints everything
 *     under /assets/, so those URLs are immutable by construction and safe to
 *     serve from cache forever. Nothing else gets that treatment.
 *
 *  4. NO skipWaiting(). A new worker takes over on the next load, not mid-
 *     session: swapping it under a running page can pair a new document with
 *     already-fetched chunks from the previous build.
 *
 * What this does NOT give you: an offline globe. The terrain, imagery and every
 * data layer are remote, so with no network the app shell loads and the globe
 * stays empty. Caching the shell is an instant-start improvement, not an
 * offline mode, and nothing in the UI should claim otherwise.
 */

// Bump this to invalidate every cache this worker owns. `activate` deletes any
// cache whose name does not start with the current VERSION, so a bump is the
// purge. v1 → v2: v1 cached `/api/*` responses; those entries must not survive.
const VERSION = 'mashaer-v2';
const SHELL_CACHE = `${VERSION}-shell`;
const ASSET_CACHE = `${VERSION}-assets`;

/**
 * Stable, unhashed paths worth having before the first offline load. The
 * bundled JS and CSS are NOT here: Vite hashes their filenames, so they cannot
 * be named ahead of time and are picked up by the runtime asset cache instead.
 */
const SHELL_URLS = [
  '/',
  '/style.css',
  '/logo.svg',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    // addAll() is all-or-nothing: one 404 would abort the whole install and
    // leave the worker permanently un-installed. Each URL is fetched on its
    // own so a missing optional file costs only that file.
    await Promise.all(SHELL_URLS.map(async (url) => {
      try {
        const response = await fetch(url, { cache: 'reload' });
        if (response.ok) await cache.put(url, response);
      } catch {
        /* offline at install time — the runtime handlers will fill this in */
      }
    }));
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((key) => !key.startsWith(VERSION)).map((key) => caches.delete(key)),
    );
    await self.clients.claim();
  })());
});

/**
 * Immutable build output: Vite emits /assets/<name>-<hash>.<ext>, so the URL
 * changes whenever the bytes do.
 * @param {URL} url
 * @returns {boolean}
 */
function isHashedAsset(url) {
  return url.pathname.startsWith('/assets/');
}

/**
 * Same-origin endpoints that broker live data and secrets server-side —
 * `/api/setup/status`, `/api/google/nearby-places`, the Realtime session mint,
 * every proxied feed. These are the SAME live-data responses the cross-origin
 * rule above refuses to cache, arriving through our own origin instead, and
 * they must be treated identically: a cached key-status or a cached place
 * lookup is a wrong answer served quickly.
 *
 * Verified rather than assumed: an earlier revision of this worker had no such
 * guard, and a single page load put /api/setup/status and
 * /api/google/nearby-places into the shell cache.
 * @param {URL} url
 * @returns {boolean}
 */
function isLiveData(url) {
  return url.pathname === '/api' || url.pathname.startsWith('/api/');
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isLiveData(url)) return;

  // Range requests (Cesium's glTF/3D-tile reads, audio seeking) must reach the
  // network: a cached 200 cannot answer a 206, and returning one breaks the
  // media element rather than slowing it down.
  if (request.headers.has('range')) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(request);
        const cache = await caches.open(SHELL_CACHE);
        cache.put('/', fresh.clone());
        return fresh;
      } catch {
        const cached = await caches.match('/', { cacheName: SHELL_CACHE });
        return cached || Response.error();
      }
    })());
    return;
  }

  if (isHashedAsset(url)) {
    event.respondWith((async () => {
      const cached = await caches.match(request, { cacheName: ASSET_CACHE });
      if (cached) return cached;
      const fresh = await fetch(request);
      if (fresh.ok) {
        const cache = await caches.open(ASSET_CACHE);
        cache.put(request, fresh.clone());
      }
      return fresh;
    })());
    return;
  }

  // Everything else same-origin (the unhashed shell files, icons, models):
  // network-first, falling back to whatever was stored at install.
  event.respondWith((async () => {
    try {
      const fresh = await fetch(request);
      if (fresh.ok) {
        const cache = await caches.open(SHELL_CACHE);
        cache.put(request, fresh.clone());
      }
      return fresh;
    } catch {
      const cached = await caches.match(request, { cacheName: SHELL_CACHE });
      if (cached) return cached;
      throw new Error(`offline and uncached: ${url.pathname}`);
    }
  })());
});
