// ============================================================================
// STIMULUS — app-shell cache. This only makes the static UI (HTML/CSS/JS,
// manifest, icons) load instantly and open even with no connection. It is
// NOT full offline support: all workout data, settings, and auth live in
// Supabase and are fetched over the network, so logging or viewing a
// workout still requires connectivity even though the screen itself opens.
//
// Bump CACHE_VERSION whenever you ship a change to index.html or any other
// cached file. The old cache is deleted on activate, so stale application
// code is never served indefinitely.
//
// Renamed from "ledger-shell" during the Stimulus rebrand — this only ever
// held static shell files, never user data, so the old cache is simply
// deleted on the next activate like any other version bump.
// ============================================================================

const CACHE_VERSION = "v17";
const CACHE_NAME = `stimulus-shell-${CACHE_VERSION}`;

// Paths are relative to this file's own location so the app works correctly
// whether it's deployed at a domain root or under a GitHub Pages subpath.
const SHELL_FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-512-maskable.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // never intercept third-party requests

  // Navigations: network-first so updates surface promptly when online,
  // falling back to the cached shell when offline.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          caches.open(CACHE_NAME).then((cache) => cache.put("./index.html", res.clone()));
          return res;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Static shell assets: cache-first, refreshing the cache in the background.
  event.respondWith(
    caches.match(req).then((cached) => {
      const networkFetch = fetch(req)
        .then((res) => {
          if (res && res.ok) {
            caches.open(CACHE_NAME).then((cache) => cache.put(req, res.clone()));
          }
          return res;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});
