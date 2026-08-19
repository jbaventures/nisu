/* Nisu service worker v13.
   Pages (navigations): network-first — users always get the newest version
   when online; the cache only answers when offline.
   Assets (icons, manifest): cache-first for speed.
   The cache name no longer needs bumping for app updates. */
const CACHE = "nisu-v15";
const SHELL = ["/app/", "/nisu-avatar.svg", "/manifest.webmanifest"];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;

  // Pages: try the network first, fall back to cache when offline.
  if (e.request.mode === "navigate"){
    e.respondWith(
      fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      }).catch(() =>
        caches.match(e.request).then(hit => hit || caches.match("/app/"))
      )
    );
    return;
  }

  // Assets: cache-first, refresh in the background on miss.
  e.respondWith(
    caches.match(e.request).then(hit =>
      hit ||
      fetch(e.request).then(res => {
        if (res.ok && new URL(e.request.url).origin === location.origin){
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      })
    )
  );
});
