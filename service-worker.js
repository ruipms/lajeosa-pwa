const CACHE_NAME = "lajeosa-cache-alterar noticias"; // muda sempre que fizeres deploy

const FILES_TO_CACHE = [
  "index.html",
  "noticias.html",
  "eventos.html",
  "pontos.html",
  "historia.html",
  "contactos.html",
  "meteorologia.html",
  "assets/brasao.png"
];

// Instala o service worker e guarda os ficheiros em cache
self.addEventListener("install", event => {
  self.skipWaiting(); // ativa imediatamente
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(FILES_TO_CACHE);
    })
  );
});

// Ativa o novo service worker e limpa caches antigas
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key); // apaga cache antiga
          }
        })
      );
    })
  );
  clients.claim(); // força atualização da PWA
});

// Estratégia network-first para HTML
self.addEventListener("fetch", event => {
  const request = event.request;

  // Se for HTML → network-first
  if (request.headers.get("accept").includes("text/html")) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Atualiza cache com versão nova
          const cloned = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, cloned));
          return response;
        })
        .catch(() => caches.match(request)) // offline → usa cache
    );
    return;
  }

  // Para imagens, CSS, JS → cache-first
  event.respondWith(
    caches.match(request).then(response => {
      return response || fetch(request);
    })
  );
});
