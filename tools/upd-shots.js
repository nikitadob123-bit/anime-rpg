/* E2E v2.18.2 «🔄 Обновить игру»: локальная копия, версия поднимается на лету → кнопка обновляет SW, чистит старые кэши, перезагружает; сохранение цело.
   node tools/upd-shots.js → /workspace/shots-v218/settings-update.jpg */
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { serve } = require('./serve.js');
const outDir = process.env.SHOTS || '/workspace/shots-v218'; fs.mkdirSync(outDir, { recursive: true });
let ok = 0, bad = 0; const check = (n, c, x) => { if (c) { ok++; console.log('  ✓', n, x || ''); } else { bad++; console.log('  ✗', n, x || ''); } };
(async () => {
  const tmp = fs.mkdtempSync('/tmp/upd-'); const root = path.join(__dirname, '..'); fs.cpSync(root, tmp, { recursive: true, filter: (f) => !/\/(\.git|shots|node_modules)(\/|$)/.test(f.slice(root.length)) });
  const srv = await serve(0, tmp), url = 'http://127.0.0.1:' + srv.address().port + '/';
  const exe = process.env.CHROME_PATH || ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find((p) => fs.existsSync(p));
  const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 444, height: 986 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, locale: 'ru-RU', timezoneId: 'Europe/Minsk' });
  const page = await ctx.newPage(); const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|ERR_/.test(m.text())) errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  const shot = async (n) => { const raw = path.join(outDir, '.raw-' + n + '.png'), out = path.join(outDir, n + '.jpg'); await page.screenshot({ path: raw });
    execFileSync('python3', ['-c', `from PIL import Image\nim=Image.open(${JSON.stringify(raw)}).convert('RGB')\nim.save(${JSON.stringify(out)},quality=82)`]); fs.unlinkSync(raw); console.log('  📷', out, Math.round(fs.statSync(out).size / 1024) + ' КБ'); };
  const ev = (f, a) => page.evaluate(f, a);
  await page.route(/\/mail\/inbox\.json/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ letters: [] }) }));
  await page.goto(url, { waitUntil: 'load' }); await page.waitForTimeout(1200);
  await ev(() => {
    const { UI, S, E, D, story: ST } = __RPG;
    const p = S.newProfile('Артефакт', '🏺'); const s = E.newSlot({ name: 'Кайрон', race: 'o_street', uniq: 'shadowdance', prof1: 'smith', prof2: 'miner', now: Date.now() }); s.hero.profLocked = true; s.tut = { guide: 1, bt: 1 };
    p.slots[0] = s; ['prologue'].concat(ST.sceneIds(1), ST.sceneIds(2)).forEach((id) => E.finishScene(s, id)); s.story.flags.prologue_done = 1; ['mill', 'wood'].forEach((d) => { s.prog.cleared[d] = 1; s.prog.boss[d] = true; });
    s.hero.level = 100; s.gold = 500000; s.mats.asc_sigil = 30;
    const rng = E.rng(5); ['sword', 'head_h', 'body_h'].forEach((b) => { const it = E.genItem(rng, { base: b, il: 100, rarity: 7 }); E.addItem(s, it); E.equip(s, it.id); });
    ['lantern', 'lucky_coin', 'moon_fang', 'moon_fang', 'first_banner', 'dragon_eye', 'dawn_lance', 'halo_shard', 'supernova_heart', 'hoard_key'].forEach((id) => E.artGain(s, id));
    s.artEq = 'supernova_heart'; ['gen1', 'gen6', 'grak'].forEach((id) => E.recruit(s, id)); s.party = ['gen1', 'gen6', 'asteria'];
    for (let i = 1; i <= 9; i++) s.prog.cleared['artd' + i] = 1; s.artProg.best = 9;
    s.crew.grimhild.lv = 60; s.crew.grimhild.star = 2; s.crew.grimhild.skl = 1; s.crew.grimhild.bxp = 260; s.support = 'grimhild';
    S.save(p); UI.p = p; p.active = 0; UI.enterGame();
  });
  await page.waitForTimeout(1500); await ev(() => __RPG.UI.closeModal && __RPG.UI.closeModal());
  await page.waitForFunction(() => navigator.serviceWorker.controller, null, { timeout: 60000 }).catch(() => {});
  check('SW управляет страницей', await ev(() => !!navigator.serviceWorker.controller));
  await ev(() => { __RPG.UI.tab = 'set'; __RPG.UI.refresh(); }); await page.waitForTimeout(400);
  await page.waitForFunction(() => /последняя версия|Доступно/.test((document.getElementById('updStat') || {}).textContent || ''), null, { timeout: 10000 }).catch(() => {});
  const v = require('../package.json').version;
  check('версия и «У вас последняя версия»', await ev((v) => { const t = document.getElementById('updStat').textContent; return t.includes(v) && /У вас последняя версия/.test(t); }, v));
  await ev(() => document.querySelector('.updcard').scrollIntoView({ block: 'center' })); await page.waitForTimeout(300); await shot('settings-update');
  // имитация выхода новой версии
  const nv = v.replace(/\d+$/, (x) => +x + 1);
  for (const f of ['sw.js', 'js/update.js']) { const p = path.join(tmp, f); fs.writeFileSync(p, fs.readFileSync(p, 'utf8').split(v).join(nv)); }
  const gold0 = await ev(() => { const s = __RPG.UI.slot(); s.gold = 123456; return s.gold; });   // несохранённое изменение — кнопка должна сохранить
  await page.locator('[data-act="updCheck"]').click(); await page.waitForTimeout(800);
  check('видна новая версия', await ev((nv) => document.getElementById('updStat').textContent.includes(nv) && /Доступно обновление/.test(document.getElementById('updStat').textContent), nv));
  const nav = page.waitForURL(/[?&]u=\d+/, { timeout: 90000 });
  await page.locator('#updBtn').click(); await page.waitForTimeout(200);
  check('статус «Обновляю…»', await ev(() => /Обновляю/.test(document.getElementById('updStat').textContent)).catch(() => true));
  await nav; await page.waitForLoadState('load'); await page.waitForTimeout(2500);
  check('после перезагрузки RPG.VERSION = ' + nv, await ev(() => __RPG.VERSION) === nv);
  const ks = await ev(() => caches.keys()); check('остались только кэши новой версии', ks.length > 0 && ks.every((k) => k.startsWith('arpg-v' + nv)), ks.join(','));
  const g = await ev(() => { const { S } = __RPG; const ps = S.list ? S.list() : null; return localStorage.length > 0 && JSON.stringify(Object.keys(localStorage).map((k) => localStorage.getItem(k))).includes('123456'); });
  check('сохранение цело (золото 123456 в localStorage)', g, gold0);
  check('нет ошибок JS', errors.length === 0, errors.join(' | '));
  await browser.close(); srv.close(); fs.rmSync(tmp, { recursive: true, force: true }); console.log(`\nОбновление: ${ok} ✓, ${bad} ✗`); process.exit(bad ? 1 : 0);
})();
