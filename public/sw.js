const CACHE = 'diet-tracker-shell-v2';
const ASSETS = ['/', '/manifest.webmanifest', '/icon.svg', '/chat-bg.svg'];

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
