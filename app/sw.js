/* Guarda o app no aparelho para funcionar sem internet.
   Ao mudar qualquer arquivo do app, aumente o número da VERSAO. */
const VERSAO = 'tier2-v2';
const ARQUIVOS = [
  './', './index.html', './style.css', './dados.js', './regras.js', './app.js',
  './vendor/xlsx.full.min.js', './manifest.json',
  './icones/icone.svg', './icones/icone-192.png', './icones/icone-512.png', './icones/icone-maskable-512.png', './icones/apple-touch-icon.png',
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSAO).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// Abre na hora com a cópia guardada (internet da escola é instável)
// e, se houver internet, busca a versão nova em segundo plano.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((guardado) => {
      const daRede = fetch(e.request).then((r) => {
        if (r && r.ok) { const copia = r.clone(); caches.open(VERSAO).then((c) => c.put(e.request, copia)); }
        return r;
      }).catch(() => guardado || caches.match('./index.html'));
      return guardado || daRede;
    })
  );
});
