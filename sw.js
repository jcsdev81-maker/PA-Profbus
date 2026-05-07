/*  BIO·PROFIBUS — Service Worker v2.2
    Coloque este arquivo na MESMA PASTA do index.html no GitHub.
    Versão 2.2: network-first, cache-bust automático, suporte a subdirectórios */

const CACHE = 'bio-profibus-v2.2';

// Detectar base path automaticamente (suporte a GitHub Pages com subdiretório)
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

  // CDN requests (PDF.js, fontes) — nunca interceptar, sempre online
  if (url.origin !== self.location.origin) return;

  // Estratégia Network-First: sempre tenta buscar versão nova do servidor
  // Garante que o GitHub Pages serve sempre o HTML mais recente
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
            '<h2>Offline</h2><p>Abra o app online uma vez primeiro para usar offline.</p>',
            { headers: { 'Content-Type': 'text/html' } }
          )
        )
      )
  );
});
