const CACHE = 'hunger-games-shell-v3';
const ASSETS = ['/hungergames/', '/hungergames/manifest.webmanifest', '/hungergames/icon.svg', '/hungergames/icons/icon-192.png', '/hungergames/icons/icon-512.png', '/hungergames/icons/icon-512-maskable.png', '/hungergames/chat-bg.svg'];

function shouldCacheRequest(method, url) {
  if (method !== 'GET') return false;

  const parsed = new URL(url);
  if (parsed.origin !== self.location.origin) return false;
  if (parsed.pathname.startsWith('/api/')) return false;

  return true;
}

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (!shouldCacheRequest(event.request.method, event.request.url)) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          if (event.request.url.startsWith(self.location.origin)) {
            caches.open(CACHE).then((cache) => cache.put(event.request, copy)).catch(() => {});
          }
          return response;
        })
        .catch(() => caches.match('/'));
    })
  );
});
