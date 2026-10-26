// Offline copy of the app. vite.config.ts fills in this build's files, so every deploy
// changes this file, the browser installs it again and the old copy is dropped.
const CACHE = 'studiu-__BUILD__'
const FILES = __FILES__

self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())))
self.addEventListener('activate', e => e.waitUntil(caches.keys()
  .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  .then(() => self.clients.claim())))

// The page comes from the network when there is one, so a deploy shows up on the next visit.
// Everything else has a hash in its name and never changes, so the cached copy is enough.
self.addEventListener('fetch', e => {
  const r = e.request
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return
  e.respondWith(r.mode === 'navigate'
    ? fetch(r).catch(() => caches.match('/'))
    : caches.match(r, { ignoreVary: true }).then(hit => hit || fetch(r))) // servers that send Vary: Origin would make every lookup miss
})
