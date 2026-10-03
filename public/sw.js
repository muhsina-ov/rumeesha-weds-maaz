// InviteStory Service Worker - Instant Asset Caching Engine
const CACHE_NAME = 'invitestory-v5';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/main.js',
  '/assets/doors/3.avif',
  '/assets/doors/1.avif',
  '/assets/doors/1.webp'
];

// Install Event: Cache Core Shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event: Cleanup Old Caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Cache-First for static assets, bypass media & HTTP Range streaming
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = event.request.url;

  // CRITICAL FOR MOBILE SAFARI & CHROME:
  // Never intercept Range or media requests with Service Worker!
  // Audio & video streaming require native HTTP 206 Partial Content support from origin server.
  if (
    event.request.headers.has('range') ||
    event.request.destination === 'audio' ||
    event.request.destination === 'video' ||
    url.includes('/assets/bgm.') ||
    url.endsWith('.mp3') ||
    url.endsWith('.m4a') ||
    url.endsWith('.mp4')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          (url.endsWith('.css') || url.endsWith('.js') || url.endsWith('.avif') || url.endsWith('.webp'))
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      });
    })
  );
});
