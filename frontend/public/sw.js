// Minimal service worker — just enough to satisfy PWA installability
// requirements and give a basic offline fallback. Deliberately NOT caching
// API calls or Socket.io traffic (this is a real-time collaboration app;
// stale cached data would be actively misleading). Only the app shell
// (static assets Next.js already fingerprints) is cached.
const CACHE_NAME = 'syncspace-shell-v1';
const SHELL_ASSETS = ['/', '/dashboard'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS).catch(() => {})),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle same-origin GET navigation/static requests. Everything
  // else (API calls to the Render backend, Socket.io websockets, POST/PUT,
  // cross-origin) passes straight through untouched.
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match('/'))),
  );
});
