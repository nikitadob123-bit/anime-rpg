/* Service worker: офлайн-режим. Ядро — в прекеше; CG и нейтральные портреты берутся из assets/vn/manifest.json, остальные настроения кэшируются при первом показе. */
const VERSION = 'arpg-v2.2.0';
const CORE = `${VERSION}-core`, RUNTIME = `${VERSION}-rt`;
const ASSETS = [
  './', 'index.html', 'manifest.json', 'css/style.css', 'css/vn.css',
  'js/data-core.js', 'js/data-stats.js', 'js/data-maou.js', 'js/data-prof.js', 'js/data-world.js', 'js/data-world2.js', 'js/data-crew.js', 'js/data-theme.js', 'js/data-story.js', 'js/data-story2.js', 'js/data-story3.js', 'js/data-romance.js',
  'js/portrait.js', 'js/engine.js', 'js/stats.js', 'js/combat.js', 'js/crew.js', 'js/save.js', 'js/audio.js', 'js/fx.js', 'js/ui.js', 'js/ui-vn.js', 'js/ui-game.js', 'js/ui-hero.js', 'js/ui-crew.js', 'js/ui-play.js', 'js/main.js',
  'js/story/cast.js', 'js/story/core.js', 'js/story/enemies.js', 'js/story/ui-story.js', 'js/story/outline.js', 'js/story/arc01.js',   // арки 3+ подгружаются при входе в арку и кэшируются при показе (в прекэше только арки 1–2)
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-192.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-32.png',
  'assets/vn/manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CORE);
    await c.addAll(ASSETS);
    // арт: CG и все нейтральные портреты — сразу; остальные настроения — по мере показа
    try {
      const m = await (await fetch('assets/vn/manifest.json', { cache: 'no-cache' })).json();
      await Promise.all((m.pre || []).map((f) => c.add('assets/vn/' + f).catch(() => {})));
    } catch (err) { /* арт подтянется при первом показе */ }
    await self.skipWaiting();
  })());
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
      if (res && res.ok && (/\/assets\/vn\//.test(url.pathname) || /\/js\/story\/arc\d+\.js$/.test(url.pathname))) { const cp = res.clone(); caches.open(RUNTIME).then((c) => c.put(req, cp)); }
      return res;
    }).catch(() => (req.mode === 'navigate' ? caches.match('index.html') : Response.error()));
  }));
});
