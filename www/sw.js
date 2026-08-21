// Service Worker do PWA Inventário Valgroup MG10.
// Só é registrado fora do Capacitor (ver DOMContentLoaded em index.html) —
// dentro da WebView Android os assets já vêm empacotados no APK.
//
// Incremente CACHE_VERSION a cada deploy: isso invalida o cache antigo
// automaticamente (activate abaixo apaga qualquer cache com nome diferente).
const CACHE_VERSION = 'invmg10-v3';
const CACHE_NAME = `app-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;

// Precache: app shell + biblioteca vendorizada de barcode/QR, pra funcionar
// offline (sinal fraco no galpão) desde a segunda visita. O OCR agora é só
// Cloud Vision (precisa de internet de qualquer forma, nada pra precachear).
const APP_SHELL = [
  './',
  'index.html',
  'manifest.json',
  'img/logo.png',
  'img/icons/icon-192.png',
  'img/icons/icon-512.png',
  'img/icons/icon-512-maskable.png',
  'img/icons/apple-touch-icon.png',
  'vendor/zxing/zxing-library.min.js',
  'vendor/zxing/zxing-browser.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((nomes) =>
      Promise.all(
        nomes
          .filter((nome) => nome !== CACHE_NAME && nome !== RUNTIME_CACHE)
          .map((nome) => caches.delete(nome))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Dados de inventário: nunca servir versão desatualizada do cache.
  // Se offline, deixa o próprio tratamento de erro do app (fetch/CapacitorHttp)
  // lidar com a falha — sem interferência do SW.
  if (url.hostname === 'api.github.com') {
    event.respondWith(fetch(request).catch(() => caches.match(request)));
    return;
  }

  // O documento principal (index.html/navegação) muda a cada deploy durante
  // o desenvolvimento — network-first, com o cache só como fallback pra
  // funcionar offline. Sem isso, stale-while-revalidate sempre mostraria a
  // versão de ANTES do deploy mais recente na primeira visita depois dele.
  const ehDocumentoPrincipal = request.mode === 'navigate'
    || url.pathname.endsWith('/index.html')
    || url.pathname.endsWith('/');
  if (ehDocumentoPrincipal) {
    event.respondWith(
      fetch(request)
        .then((resposta) => {
          const clone = resposta.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return resposta;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // App shell (precache) + CDNs externos (ExcelJS, JSZip, Google Fonts):
  // stale-while-revalidate — serve do cache na hora se existir, atualiza em
  // segundo plano. Respostas "opaque" (cross-origin sem CORS, como as CDNs)
  // têm status 0 e .ok=false mesmo quando a requisição deu certo, então são
  // cacheadas também.
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((resposta) => {
          if (resposta.ok || resposta.type === 'opaque') {
            const clone = resposta.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
          }
          return resposta;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
