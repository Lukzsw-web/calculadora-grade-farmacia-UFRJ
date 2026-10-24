/* Planejador Acadêmico — service worker.
 * Código (HTML/JS/CSS/JSON): rede primeiro, com limite de tempo, e cache como reserva offline.
 *   Assim uma correção publicada chega ao usuário na próxima abertura, sem ficar preso numa versão antiga.
 * Fontes e ícones (não mudam): cache primeiro.
 * Aumente CACHE_VERSION a cada publicação para descartar caches antigos.
 */
'use strict';

const CACHE_VERSION = 'v1.8.3';
const CACHE_NAME = `planejador-farmacia-${CACHE_VERSION}`;
const NETWORK_TIMEOUT_MS = 3500;

const APP_SHELL = [
  './index.html',
  './styles.css',
  './tailwind.css',
  './app.js',
  './i18n.js',
  './disciplinas.js',
  './manifest.json',
  './fonts/inter-regular.woff2',
  './fonts/inter-bold.woff2',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Um arquivo ausente não pode impedir a instalação inteira (addAll falharia por completo).
    await Promise.all(APP_SHELL.map(async url => {
      try {
        const response = await fetch(url, { cache: 'reload' });
        if (response && response.ok) await cache.put(url, response);
      } catch (_) { /* segue sem esse arquivo */ }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(key => key.startsWith('planejador-farmacia-') && key !== CACHE_NAME)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

function fetchWithTimeout(request, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    fetch(request).then(
      response => { clearTimeout(timer); resolve(response); },
      error => { clearTimeout(timer); reject(error); }
    );
  });
}

async function networkFirst(request, cacheKey) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetchWithTimeout(request, NETWORK_TIMEOUT_MS);
    if (response && response.ok) cache.put(cacheKey || request, response.clone()).catch(() => {});
    return response;
  } catch (_) {
    const cached = (await cache.match(cacheKey || request, { ignoreSearch: true }))
      || (await caches.match(request, { ignoreSearch: true }));
    if (cached) return cached;
    throw _;
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request, { ignoreSearch: true });
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone()).catch(() => {});
  }
  return response;
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, './index.html').catch(async () =>
      (await caches.match('./index.html'))
      || new Response('O Planejador Acadêmico ainda não foi armazenado para uso offline. Abra-o uma vez enquanto estiver conectado.', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      })));
    return;
  }

  const isStatic = /\.(woff2?|ttf|png|jpg|jpeg|svg|ico|webp)$/i.test(url.pathname);
  event.respondWith((isStatic ? cacheFirst(request) : networkFirst(request))
    .catch(() => new Response('', { status: 504, statusText: 'Offline' })));
});
