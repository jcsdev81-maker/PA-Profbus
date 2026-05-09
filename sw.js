/* PA·Trace BR — Service Worker v0.1
   Estratégia: network-first com fallback de cache. Funciona offline depois da
   primeira visita online. */

const CACHE = 'patracebr-v0.1';
const BASE = self.registration.scope;

const ASSETS = [
  BASE,
  BASE + 'index.html',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(() => Promise.resolve())
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // CDNs (pdf.js, pdf-lib, fontes) — passam direto
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    fetch(e.request)
      .then(response => {
        if (response && response.status === 200 && response.type !== 'opaque') {
          const clone = response.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(e.request).then(cached =>
          cached || new Response(
            '<h2>Offline</h2><p>Abra o app online uma vez antes de usar offline.</p>',
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          )
        )
      )
  );
});
