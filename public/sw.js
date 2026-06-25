// Floky Service Worker — Cache-first para assets estáticos, network-first para datos
const CACHE_NAME = 'floky-v1.1.0';

// Assets a pre-cachear en la instalación
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/images/icon.png',
  '/images/favicon.png',
];

// Rutas de la app que siempre deben funcionar offline
const APP_ROUTES = ['/health', '/study', '/home', '/settings'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Pre-cachear assets críticos — ignorar errores individuales para no bloquear el SW
      return Promise.allSettled(
        PRECACHE_URLS.map((url) => cache.add(url).catch(() => {}))
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar peticiones a APIs externas (Groq, Nightscout, Dexcom, etc.)
  if (
    url.origin !== self.location.origin ||
    request.method !== 'GET' ||
    url.pathname.startsWith('/api/')
  ) {
    return;
  }

  // Navegación a rutas de la app → network-first, fallback a /
  if (request.mode === 'navigate' || APP_ROUTES.some((r) => url.pathname.startsWith(r))) {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match('/') || caches.match('/index.html'))
    );
    return;
  }

  // Assets estáticos (JS, CSS, imágenes, fuentes) → cache-first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        // Solo cachear respuestas válidas
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return response;
      }).catch(() => cached);
    })
  );
});
