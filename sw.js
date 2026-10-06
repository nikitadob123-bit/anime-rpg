/* Service worker: офлайн-режим. Ядро — в прекеше; CG и нейтральные портреты берутся из assets/vn/manifest.json, остальные настроения кэшируются при первом показе. */
const VERSION = 'arpg-v2.9.0';
const CORE = `${VERSION}-core`, RUNTIME = `${VERSION}-rt`;
const ASSETS = [
  './', 'index.html', 'manifest.json', 'css/style.css', 'css/vn.css', 'css/demon.css', 'css/mail.css', 'fonts/ruslan.woff2', 'fonts/philosopher.woff2',
  'js/data-core.js', 'js/data-stats.js', 'js/data-maou.js', 'js/data-maou2.js', 'js/data-prof.js', 'js/data-world.js', 'js/data-world2.js', 'js/data-crew.js', 'js/data-theme.js', 'js/data-story.js', 'js/data-story2.js', 'js/data-story3.js', 'js/data-romance.js',
  'js/portrait.js', 'js/engine.js', 'js/stats.js', 'js/combat.js', 'js/crew.js', 'js/save.js', 'js/mail.js', 'js/audio.js', 'js/fx.js', 'js/ui.js', 'js/ui-vn.js', 'js/ui-game.js', 'js/ui-hero.js', 'js/ui-crew.js', 'js/ui-skills.js', 'js/ui-play.js', 'js/ui-mail.js', 'js/main.js',
  'js/story/cast.js', 'js/story/core.js', 'js/story/enemies.js', 'js/story/ui-story.js', 'js/story/outline.js', 'js/story/arc01.js',
  'js/story/arc02.js', 'js/story/arc03.js', 'js/story/arc04.js', 'js/story/arc05.js', 'js/story/arc06.js', 'js/story/arc07.js', 'js/story/arc08.js', 'js/story/arc09.js', 'js/story/arc10.js', 'js/story/arc11.js', 'js/story/arc12.js', 'js/story/arc13.js', 'js/story/arc14.js', 'js/story/arc15.js', 'js/story/arc16.js', 'js/story/arc17.js', 'js/story/arc18.js', 'js/story/arc19.js', 'js/story/arc20.js', 'js/story/arc21.js', 'js/story/arc22.js', 'js/story/arc23.js', 'js/story/arc24.js', 'js/story/arc25.js', 'js/story/arc26.js', 'js/story/arc27.js', 'js/story/arc28.js', 'js/story/arc29.js', 'js/story/arc30.js',   // все 30 арок в прекэше: офлайн работает на всех 300 главах
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-192.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-32.png',
  'assets/ui/banner.webp', 'assets/ui/tile_shop.webp', 'assets/ui/tile_forge.webp', 'assets/ui/tile_fire.webp', 'assets/ui/tile_altar.webp', 'assets/ui/hero_bg.webp', 'assets/ui/vn_cathedral.webp', 'assets/ui/vn_cathedral_night.webp', 'assets/ui/vn_ruins.webp',
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
  if (/\/mail\//.test(url.pathname)) return;   // почта: всегда из сети, без кэша (офлайн — игра покажет уже полученные письма)
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => {
    if (hit) return hit;
    return fetch(req).then((res) => {
      if (res && res.ok && (/\/assets\/vn\//.test(url.pathname) || /\/js\/story\/arc\d+\.js$/.test(url.pathname))) { const cp = res.clone(); caches.open(RUNTIME).then((c) => c.put(req, cp)); }
      return res;
    }).catch(() => (req.mode === 'navigate' ? caches.match('index.html') : Response.error()));
  }));
});
