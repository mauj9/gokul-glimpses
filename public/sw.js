/*
 * Gokul Glimpses service worker.
 *
 * Deliberately conservative: this is an auth-gated app, so we NEVER cache HTML
 * pages, API routes, server actions, or media — caching those could serve one
 * user's content to another or show stale/authed pages. We only:
 *   - serve an offline fallback page when a navigation fails (offline), and
 *   - cache-first the immutable hashed build assets + icons.
 * Everything else passes straight through to the network.
 */
const CACHE = "gg-static-v1";
const OFFLINE_URL = "/offline";
const PRECACHE = [
  OFFLINE_URL,
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Never intercept non-GET (server actions, uploads, sign-out POSTs).
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Ignore cross-origin (Supabase, Cloudflare R2 media, Google OAuth).
  if (url.origin !== self.location.origin) return;

  // Full-page navigations: always go to the network so auth/redirects work;
  // only fall back to the offline page when the network is unavailable.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL)),
    );
    return;
  }

  // Immutable, non-sensitive assets: cache-first.
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/")
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((cache) => cache.put(request, copy));
            }
            return res;
          }),
      ),
    );
    return;
  }

  // Everything else: straight to the network (no caching).
});
