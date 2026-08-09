const CACHE_NAME = 'grade-farma-v4';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json'
];
const RUNTIME_CACHE = 'grade-farma-runtime-v4';
const TAILWIND_CDN = 'https://cdn.tailwindcss.com';

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys
        .filter(key => key !== CACHE_NAME && key !== RUNTIME_CACHE)
        .map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Para páginas HTML, tenta a versão online primeiro para que atualizações
  // publicadas no GitHub Pages apareçam sem depender de limpar o cache.
  if (url.origin === self.location.origin &&
      (request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === '/')) {
    event.respondWith(
      fetch(request).then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return response;
      }).catch(() => caches.match(request).then(cached => cached || caches.match('./index.html')))
    );
    return;
  }

  // Cache-first para os demais arquivos da própria aplicação.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(RUNTIME_CACHE).then(cache => cache.put(request, copy));
          }
          return response;
        });
      })
    );
    return;
  }

  // O Tailwind CDN é mantido em cache para permitir que a interface continue
  // carregando quando o aplicativo já tiver sido aberto ao menos uma vez online.
  if (request.url === TAILWIND_CDN) {
    event.respondWith(
      caches.match(request).then(cached => {
        return cached || fetch(request, { mode: 'no-cors' }).then(response => {
          const copy = response.clone();
          caches.open(RUNTIME_CACHE).then(cache => cache.put(request, copy));
          return response;
        });
      })
    );
  }
});
