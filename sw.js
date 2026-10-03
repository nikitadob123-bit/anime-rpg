/* Service worker: офлайн-режим. Ядро и все портреты (≈370 КБ) — в прекеше. */
const VERSION = 'arpg-v1.0.1';
const CORE = `${VERSION}-core`, RUNTIME = `${VERSION}-rt`;
const RACES = ['human', 'elf', 'dwarf', 'beast', 'demon'];
const NPC = ['kairen', 'tika', 'irel', 'eydran', 'mara', 'brum'], MOODS = ['n', 'h', 's', 'x'];
const ASSETS = [
  './', 'index.html', 'manifest.json', 'css/style.css',
  'js/data-core.js', 'js/data-prof.js', 'js/data-world.js', 'js/data-story.js', 'js/portrait.js', 'js/engine.js', 'js/combat.js', 'js/save.js', 'js/audio.js', 'js/fx.js', 'js/ui.js', 'js/ui-game.js', 'js/ui-play.js', 'js/main.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-192.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-32.png'
].concat(NPC.flatMap((n) => MOODS.map((m) => `assets/portraits/npc_${n}_${m}.webp`)))
  .concat(RACES.flatMap((r) => ['m', 'f'].flatMap((x) => [1, 2, 3].map((i) => `assets/portraits/${r}_${x}_${i}.webp`))));

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CORE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', (e) => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('fetch', (e) => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url); if (url.origin !== location.origin) return;
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => {
    if (hit) return hit;
    return fetch(req).then((res) => {
      if (res && res.ok && /\/assets\/portraits\//.test(url.pathname)) { const cp = res.clone(); caches.open(RUNTIME).then((c) => c.put(req, cp)); }
      return res;
    }).catch(() => (req.mode === 'navigate' ? caches.match('index.html') : Response.error()));
  }));
});
