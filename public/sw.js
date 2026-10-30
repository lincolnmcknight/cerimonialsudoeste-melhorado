// Cerimonial Sudoeste — service worker
// Páginas: rede primeiro, com cópia de segurança para abrir sem internet.
// Arquivos estáticos (JS, CSS, imagens, fontes): cache primeiro.
// Chamadas ao banco (Supabase) e à API nunca passam pelo cache.
const VERSAO = "sudoeste-v2";
const PAGINAS = `${VERSAO}-paginas`;
const ESTATICOS = `${VERSAO}-estaticos`;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(PAGINAS).then((c) => c.addAll(["/", "/manifest.json", "/favicon.png"]).catch(() => {})),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSAO)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  const ehFonte = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (url.origin !== self.location.origin && !ehFonte) return; // Supabase etc.
  if (url.pathname.startsWith("/api/")) return;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copia = res.clone();
          caches.open(PAGINAS).then((c) => c.put(req, copia)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("/"))),
    );
    return;
  }

  const estatico = ehFonte || /\.(?:js|css|png|jpg|jpeg|svg|webp|ico|woff2?)$/.test(url.pathname);
  if (!estatico) return;

  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok || res.type === "opaque") {
            const copia = res.clone();
            caches.open(ESTATICOS).then((c) => c.put(req, copia)).catch(() => {});
          }
          return res;
        }),
    ),
  );
});
