/* E2E v2.31.3: обновление с 2.31.1-подобного SW на новый при сбое части ассетов (Playwright route.abort).
   Сохранение в localStorage должно пережить обновление. */
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path');
const { serve } = require('./serve.js');

const OLD_SW = `const VERSION = 'arpg-v2.31.1';
const CORE = VERSION + '-core', RUNTIME = VERSION + '-rt';
const ASSETS = ['./', 'index.html', 'manifest.json', 'css/style.css', 'js/update.js', 'js/main.js'];
self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CORE);
    await c.addAll(ASSETS);
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
  if (/\\/mail\\//.test(url.pathname)) return;
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => {
    if (hit) return hit;
    return fetch(req).then((res) => res).catch(() => (req.mode === 'navigate' ? caches.match('index.html') : Response.error()));
  }));
});
`;

const OLD_UPDATE = `/* old 2.31.1 updater */
(function () {
  const RPG = globalThis.RPG, UI = RPG.UI;
  RPG.VERSION = '2.31.1';
  const U = RPG.UPD = { latest: null, status: '', busy: false };
  const cmp = (a, b) => { const x = String(a).split('.').map(Number), y = String(b).split('.').map(Number); for (let i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0); } return 0; };
  U.cmp = cmp;
  const paint = () => { const el = document.getElementById('updStat'); if (el) el.innerHTML = U.html(); const b = document.getElementById('updBtn'); if (b) b.disabled = U.busy; };
  const set = (s) => { U.status = s; paint(); };
  U.html = () => 'Версия: <b>' + RPG.VERSION + '</b>' + (U.latest ? ' · последняя: <b>' + U.latest + '</b>' : '') + (U.status ? '<br><span class="' + (/последняя|готово/i.test(U.status) ? 'ok' : /Ошибка|нет сети/i.test(U.status) ? 'dnz' : 'gold') + '">' + U.status + '</span>' : '');
  U.check = async function () {
    set('Проверяю…');
    try {
      const t = await (await fetch('sw.js?v=' + Date.now(), { cache: 'no-store' })).text();
      const m = /arpg-v(\\d+\\.\\d+\\.\\d+)/.exec(t); if (!m) throw new Error('нет версии');
      U.latest = m[1]; const newer = cmp(U.latest, RPG.VERSION) > 0; set(newer ? 'Доступно обновление' : 'У вас последняя версия'); return newer;
    } catch (e) { set('Не удалось проверить — нет сети?'); return null; }
  };
  U.update = async function () {
    if (U.busy) return; U.busy = true;
    try {
      if (UI.p) UI.save(true);
      set('Обновляю…');
      const sw = navigator.serviceWorker, reg = sw && await sw.getRegistration();
      let reloaded = false; const go = () => { if (reloaded) return; reloaded = true; if (UI.p) UI.save(true); const u = new URL(location.href); u.searchParams.set('u', Date.now()); location.replace(u.toString()); };
      if (sw) sw.addEventListener('controllerchange', go, { once: true });
      if (reg) {
        try { await reg.update(); } catch (e) {}
        const w = reg.waiting || reg.installing;
        if (w) { if (w.state !== 'installed') await new Promise((r) => { const f = () => { if (w.state === 'installed' || w.state === 'activated' || w.state === 'redundant') { w.removeEventListener('statechange', f); r(); } }; w.addEventListener('statechange', f); setTimeout(r, 15000); }); (reg.waiting || w).postMessage('SKIP_WAITING'); }
      }
      if (self.caches) { const ks = await caches.keys(); await Promise.all(ks.filter((k) => !(RPG.UPD.latest && k.startsWith('arpg-v' + RPG.UPD.latest))).map((k) => caches.delete(k))); }
      setTimeout(go, reg && reg.waiting ? 4000 : 1200);
    } catch (e) { U.busy = false; set('Ошибка обновления: ' + e.message); }
  };
  UI.act.updCheck = () => U.check();
  UI.act.updGo = async () => { if (U.latest == null) { const n = await U.check(); if (n === false && !confirm('У вас последняя версия. Всё равно перезагрузить игру с очисткой кэша файлов? Сохранения не пострадают.')) return; } U.update(); };
  UI.updCard = () => '<div class="card col gap updcard"><b>🔄 Обновление игры</b><div class="small" id="updStat">' + U.html() + '</div><div class="row gap wrap"><button class="btn small" id="updBtn" data-act="updGo"' + (U.busy ? ' disabled' : '') + '>🔄 Обновить игру</button><button class="btn ghost small" data-act="updCheck">Проверить</button></div><div class="small dim">Сначала игра сохраняется; сохранения не удаляются — обновляются только файлы игры.</div></div>';
  U.banner = function () {
    if (document.getElementById('updBan')) return;
    const b = document.createElement('button'); b.id = 'updBan'; b.className = 'updban'; b.innerHTML = '🔄 Доступно обновление — <b>Обновить</b>';
    b.onclick = () => { b.remove(); U.update(); }; document.body.appendChild(b); setTimeout(() => b.remove(), 20000);
  };
})();
`;

let ok = 0, bad = 0;
const check = (n, c, x) => { if (c) { ok++; console.log('  ✓', n, x || ''); } else { bad++; console.log('  ✗', n, x || ''); } };

(async () => {
  const tmp = fs.mkdtempSync('/tmp/sw-upd-');
  const root = path.join(__dirname, '..');
  fs.cpSync(root, tmp, { recursive: true, filter: (f) => !/\/(\.git|shots|node_modules)(\/|$)/.test(f.slice(root.length)) });
  const newSw = fs.readFileSync(path.join(tmp, 'sw.js'), 'utf8');
  const newUpd = fs.readFileSync(path.join(tmp, 'js/update.js'), 'utf8');
  const nv = require('../package.json').version;
  check('исходные файлы — ' + nv, newSw.includes("VERSION = 'arpg-v" + nv + "'") && newUpd.includes("RPG.VERSION = '" + nv + "'"));

  fs.writeFileSync(path.join(tmp, 'sw.js'), OLD_SW);
  fs.writeFileSync(path.join(tmp, 'js/update.js'), OLD_UPDATE);

  const srv = await serve(0, tmp), url = 'http://127.0.0.1:' + srv.address().port + '/';
  const exe = process.env.CHROME_PATH || ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find((p) => fs.existsSync(p));
  const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 444, height: 986 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, locale: 'ru-RU', timezoneId: 'Europe/Minsk' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|ERR_/.test(m.text())) errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  const ev = (f, a) => page.evaluate(f, a);

  await page.route(/\/mail\/inbox\.json/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ letters: [] }) }));
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  await ev(() => {
    const { UI, S, E, D, story: ST } = __RPG;
    const p = S.newProfile('Обновление', '🔄');
    const s = E.newSlot({ name: 'Кайрон', race: 'o_street', uniq: 'shadowdance', prof1: 'smith', prof2: 'miner', now: Date.now() });
    s.hero.profLocked = true; s.tut = { guide: 1, bt: 1 };
    p.slots[0] = s;
    ['prologue'].concat(ST.sceneIds(1), ST.sceneIds(2)).forEach((id) => E.finishScene(s, id));
    s.story.flags.prologue_done = 1;
    s.hero.level = 12; s.gold = 777;
    S.save(p); UI.p = p; p.active = 0; UI.enterGame();
  });
  await page.waitForTimeout(800);
  await ev(() => __RPG.UI.closeModal && __RPG.UI.closeModal());
  await page.waitForFunction(() => navigator.serviceWorker.controller, null, { timeout: 60000 }).catch(() => {});
  const oldScript = await ev(() => (navigator.serviceWorker.controller && navigator.serviceWorker.controller.scriptURL) || '');
  check('старый SW управляет страницей', /sw\.js/.test(oldScript) && await ev(() => !!(window.RPG && RPG.VERSION === '2.31.1')));
  const gold0 = await ev(() => { const s = __RPG.UI.slot(); s.gold = 123456; return s.gold; });

  // Публикуем новую версию и обрываем часть картинок (как на слабой сети).
  fs.writeFileSync(path.join(tmp, 'sw.js'), newSw);
  fs.writeFileSync(path.join(tmp, 'js/update.js'), newUpd);
  let aborted = 0;
  await ctx.route(/\.(?:webp|png)(?:\?|$)/i, (route) => {
    const u = route.request().url();
    if (/\/(?:img\/tekken\/(?:tk_reina|bg_)|assets\/(?:vn|gear|bg)\/)/.test(u)) {
      aborted++;
      return route.abort();
    }
    return route.continue();
  });

  await ev(() => { __RPG.UI.tab = 'set'; __RPG.UI.refresh(); });
  await page.waitForTimeout(400);
  await page.locator('[data-act="updCheck"]').click();
  await page.waitForFunction((nv) => {
    const t = (document.getElementById('updStat') || {}).textContent || '';
    return t.includes(nv) && /Доступно обновление/.test(t);
  }, nv, { timeout: 15000 }).catch(() => {});
  check('карточка видит ' + nv, await ev((nv) => {
    const t = (document.getElementById('updStat') || {}).textContent || '';
    return t.includes('2.31.1') && t.includes(nv) && /Доступно обновление/.test(t);
  }, nv));

  const nav = page.waitForURL(/[?&]u=\d+/, { timeout: 90000 });
  await page.locator('#updBtn').click();
  await nav;
  await page.waitForLoadState('load');
  await page.waitForTimeout(2500);
  await page.waitForFunction(() => window.__RPG && (window.RPG && RPG.VERSION), null, { timeout: 30000 }).catch(() => {});

  const ver = await ev(() => (window.RPG && RPG.VERSION) || (__RPG && __RPG.VERSION) || '');
  check('после обновления RPG.VERSION = ' + nv, ver === nv, ver);
  const ks = await ev(() => caches.keys());
  check('кэши новой версии есть', ks.some((k) => k.startsWith('arpg-v' + nv)), ks.join(','));
  const saveOk = await ev(() => {
    const raw = JSON.stringify(Object.keys(localStorage).map((k) => localStorage.getItem(k)));
    return localStorage.length > 0 && raw.includes('123456');
  });
  check('сохранение цело (золото 123456 в localStorage)', saveOk, gold0);
  const idbOk = await ev(async () => {
    if (!indexedDB || !indexedDB.databases) return true;
    const dbs = await indexedDB.databases();
    return Array.isArray(dbs);
  }).catch(() => true);
  check('IndexedDB не удаляли', idbOk);
  check('часть ассетов оборвана во время установки', aborted > 0, 'abort=' + aborted);
  check('нет ошибок JS', errors.length === 0, errors.join(' | '));

  await browser.close(); srv.close(); fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`\ne2e-sw-update: ${ok} ✓, ${bad} ✗`);
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
