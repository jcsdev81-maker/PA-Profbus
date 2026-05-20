// PA·Trace BR — Service Worker
// ──────────────────────────────────────────────────────────────────────
// CACHE_VERSION DEVE seguir junto com APP_VERSION/CACHE_VERSION do
// index.html a cada release. Bumpar invalida o cache antigo no activate.
// sw.js, manifest.json e icon.svg ficam na MESMA pasta do index.html.
// ──────────────────────────────────────────────────────────────────────
const CACHE_VERSION = 'patrace-v0.2.0';

// App shell — cache-first.
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
];

// CDNs — stale-while-revalidate (mantém o app utilizável offline mesmo
// quando o navegador não está mais conectado).
const CDN_HOSTS = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdnjs.cloudflare.com',
  'unpkg.com',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_VERSION)
      .then(c => c.addAll(SHELL).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch { return; }

  // CDNs (pdf.js, pdf-lib, fontkit, Google Fonts) — stale-while-revalidate.
  if (CDN_HOSTS.includes(url.hostname)) {
    e.respondWith(
      caches.open(CACHE_VERSION).then(cache =>
        cache.match(req).then(cached => {
          const network = fetch(req).then(res => {
            if (res && res.status === 200) cache.put(req, res.clone());
            return res;
          }).catch(() => cached);
          return cached || network;
        })
      )
    );
    return;
  }

  // App shell e demais GETs do mesmo domínio — cache-first.
  e.respondWith(
    caches.match(req).then(cached =>
      cached || fetch(req).then(res => {
        if (res && res.status === 200 && url.origin === self.location.origin) {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() =>
        caches.match('./index.html').then(idx =>
          idx || new Response('Offline — verifique sua conexão.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          })
        )
      )
    )
  );
});
