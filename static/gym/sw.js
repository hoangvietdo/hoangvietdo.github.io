// Offline support: caches the app on install and serves it from the cache.
// Bump VERSION whenever any file changes; the new version activates the next time the
// app is opened fresh.

const VERSION = 'gymtrack-v7';
const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './js/app.js',
  './js/dom.js',
  './js/format.js',
  './js/model.js',
  './js/store.js',
  './js/views/cardio.js',
  './js/views/exercise.js',
  './js/views/history.js',
  './js/views/progress.js',
  './js/views/settings.js',
  './js/views/today.js',
  './js/views/workout.js',
  './js/engine/analytics.js',
  './js/engine/calendar.js',
  './js/engine/cardio.js',
  './js/engine/exercises.js',
  './js/engine/muscles.js',
  './js/engine/planner.js',
  './js/engine/progression.js',
  './js/engine/readiness.js',
  './js/engine/recommender.js',
  './js/engine/recovery.js',
  './js/engine/sets.js',
  './js/engine/settings.js',
  './js/engine/workout-analysis.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll(FILES.map((file) => new Request(file, { cache: 'reload' })))),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('gymtrack-') && key !== VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((cached) => cached ?? fetch(request)),
  );
});
