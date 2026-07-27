const CACHE_NAME = "lajeosa-cache-v9"; // muda sempre que fizeres deploy
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
  self.skipWaiting(); // força a ativação imediata
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
  clients.claim(); // força a atualização da PWA
});

// Intercepta pedidos e responde com cache quando possível
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});

