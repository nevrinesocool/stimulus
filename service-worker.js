// STIMULUS — app-shell cache. Makes the static UI open fast / offline.
// Workout data lives in Supabase and still needs the network.
// Bump CACHE_VERSION on every deploy; old caches are deleted on activate.

const CACHE_VERSION = "v31";
const CACHE_NAME = `stimulus-shell-${CACHE_VERSION}`;

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
    caches.open(CACHE_NAME).then(async (cache) => {
      // One by one: a single missing icon used to make addAll reject and kill the install.
      await Promise.all(SHELL_FILES.map((f) => cache.add(f).catch(() => {})));
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Clone synchronously, before the page starts reading the body.
function putInCache(key, res) {
  if (!res || !(res.ok || res.type === "opaque")) return;
  const copy = res.clone();
  caches.open(CACHE_NAME).then((c) => c.put(key, copy)).catch(() => {});
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (url.origin !== self.location.origin) return; // never touch third-party requests (CDN, Supabase)

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => { if (res.ok) putInCache("./index.html", res); return res; })
        .catch(() => caches.match("./index.html").then((c) => c || caches.match("./")).then((c) => c || Response.error()))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const net = fetch(req).then((res) => { putInCache(req, res); return res; }).catch(() => cached || Response.error());
      return cached || net;
    })
  );
});
