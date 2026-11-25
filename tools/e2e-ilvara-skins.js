/* E2E v2.32.2: облики Ильвары. Скриншоты /workspace/shots-ilvara/ (444×986) */
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path');
const { serve } = require('./serve.js');
const outDir = '/workspace/shots-ilvara'; fs.mkdirSync(outDir, { recursive: true });
let ok = 0, bad = 0;
const check = (n, c, x) => { if (c) { ok++; console.log('  ✓', n, x || ''); } else { bad++; console.log('  ✗', n, JSON.stringify(x || '')); } };
(async () => {
  const srv = await serve(0); const url = 'http://127.0.0.1:' + srv.address().port + '/';
  const exe = ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find((p) => fs.existsSync(p));
  const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 444, height: 986 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ru-RU' });
  const page = await ctx.newPage(); const errors = [], failed = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('response', (r) => { if (r.status() >= 400) failed.push(r.status() + ' ' + r.url()); });
  const ev = (f, a) => page.evaluate(f, a);
  const shot = (n) => page.screenshot({ path: path.join(outDir, n + '.jpg'), type: 'jpeg', quality: 80, scale: 'css' });
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__RPG && __RPG.UI && __RPG.E && __RPG.D);
  await ev(async () => {
    const { UI, S, E } = __RPG; const p = S.newProfile('Ильвара', '🩸');
    const s = E.newSlot({ name: 'Арата', race: 'o_street', uniq: 'phoenix', prof1: 'smith', prof2: 'miner', now: Date.now() });
    s.hero.level = 28; E.recruit(s, 'gen1');
    p.slots[0] = s; p.active = 0; UI.p = p; UI.buildNav(); UI.go('game');
  });
  await page.waitForTimeout(400);
  const tabs = () => ev(() => [...document.querySelectorAll('.skintab')].map((e) => ({ t: (e.textContent || '').replace(/\s+/g, ' ').trim(), lock: e.classList.contains('lock') })));
  const open = async () => { await ev(() => { __RPG.UI.closeModal && __RPG.UI.closeModal(); __RPG.UI.sub.crewId = 'gen1'; __RPG.UI.crewModal(); }); await page.waitForSelector('[data-act="skinView"]', { timeout: 8000 }); await page.locator('[data-act="skinView"]').first().click(); await page.waitForSelector('.skinv-im', { timeout: 8000 }); await page.waitForTimeout(300); };
  await ev(() => { __RPG.UI.sub.crewId = 'gen1'; __RPG.UI.crewModal(); });
  await page.waitForSelector('[data-act="skinView"]', { timeout: 8000 });
  check('кнопка на карточке Ильвары', true); await shot('00-card');
  await open(); let t = await tabs();
  check('5 обликов, открыт только первый', t.length === 5 && !t[0].lock && t.slice(1).every((x) => x.lock), t);
  check('картинка генерала', /gen1_skin_general/.test(await ev(() => document.querySelector('.skinv-im').getAttribute('src'))));
  await shot('01-locked');
  await ev(() => { const s = __RPG.UI.slot(); s.rom.gen1.seen = [0, 1, 2]; s.story = s.story || {}; s.story.flags = s.story.flags || {}; s.story.flags.heart_gen1 = 1; });
  await open(); t = await tabs();
  check('всё открыто после сцен и финала', t.every((x) => !x.lock), t);
  const ids = ['general', 'battle', 'home', 'evening', 'wedding'];
  for (let i = 0; i < ids.length; i++) {
    await ev((id) => __RPG.E.setSkin(__RPG.UI.slot(), 'gen1', id), ids[i]); await open();
    const src = await ev(() => document.querySelector('.skinv-im').getAttribute('src'));
    const nat = await ev(() => new Promise((r) => { const im = document.querySelector('.skinv-im'); if (im.complete) r(im.naturalWidth); else im.onload = () => r(im.naturalWidth); }));
    check('облик ' + ids[i], src.includes('gen1_skin_' + ids[i]) && nat > 0, src);
    await shot('0' + (i + 2) + '-' + ids[i]);
  }
  await ev(() => { const s = __RPG.UI.slot(); delete s.story.flags.heart_gen1; s.rom.gen1.seen = [0]; });
  await open(); t = await tabs();
  check('частично: открыты генерал и боевой', !t[0].lock && !t[1].lock && t[2].lock && t[4].lock, t);
  check('Рейна: облики на месте', await ev(() => __RPG.E.skinsOf('tk_reina').length === 8));
  check('без ошибок страницы', !errors.length, errors);
  check('без 404', !failed.length, failed);
  console.log('ИТОГ', ok, '✓', bad, '✗'); await browser.close(); srv.close(); process.exit(bad ? 1 : 0);
})();
