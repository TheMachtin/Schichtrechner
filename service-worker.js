const CACHE = 'takt-1.3.0';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png'
];

self.addEventListener('install', (event) => {
  // Bewusst ohne skipWaiting: die neue Fassung wartet, bis die Seite grünes
  // Licht gibt. Sonst würde mitten in der Schicht umgeschaltet, während die
  // laufende Seite noch mit dem alten Code arbeitet.
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
});

self.addEventListener('message', (event) => {
  if(event.data && event.data.type === 'jetztWechseln') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Für die Seite selbst zuerst das Netz fragen, damit eine neue Version sofort
// ankommt; ohne Empfang (Werkshalle) kommt sie aus dem Cache. Bilder und
// sonstige Dateien zuerst aus dem Cache, die ändern sich kaum.
self.addEventListener('fetch', (event) => {
  if(event.request.method !== 'GET') return;

  const istSeite = event.request.mode === 'navigate' ||
                   event.request.destination === 'document';

  if(istSeite){
    event.respondWith(
      fetch(event.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(cache => cache.put(event.request, copy));
        return res;
      }).catch(() => caches.match(event.request).then(c => c || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if(cached) return cached;
      return fetch(event.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(cache => cache.put(event.request, copy));
        return res;
      }).catch(() => cached);
    })
  );
});
