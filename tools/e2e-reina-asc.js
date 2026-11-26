/* E2E v2.33.0: ранги Рейны и «Разорвать предел». Скриншоты /workspace/shots-reina-asc/ (444×986) */
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path');
const { serve } = require('./serve.js');
const outDir = '/workspace/shots-reina-asc'; fs.mkdirSync(outDir, { recursive: true });
let ok = 0, bad = 0;
const check = (n, c, x) => { if (c) { ok++; console.log('  ✓', n, x != null ? JSON.stringify(x) : ''); } else { bad++; console.log('  ✗', n, JSON.stringify(x || '')); } };
(async () => {
  const srv = await serve(0); const url = 'http://127.0.0.1:' + srv.address().port + '/';
  const exe = ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find((p) => fs.existsSync(p));
  const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 444, height: 986 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ru-RU' });
  const page = await ctx.newPage(); const errors = [], failed = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('response', (r) => { if (r.status() >= 400) failed.push(r.status() + ' ' + r.url()); });
  const ev = (f, a) => page.evaluate(f, a);
  const shot = (n) => page.screenshot({ path: path.join(outDir, n + '.jpg'), type: 'jpeg', quality: 82, scale: 'css' });
  const open = async () => { await ev(() => { const U = __RPG.UI; U.closeModal && U.closeModal(); U.sub.crewId = 'tk_reina'; U.crewModal(); }); await page.waitForSelector('.reasc', { timeout: 8000 }); await page.waitForTimeout(250); };
  const toBlock = () => ev(() => { const el = document.querySelector('.reasc'); el && el.scrollIntoView({ block: 'center' }); });
  const st = () => ev(() => { const s = __RPG.UI.slot(), r = __RPG.E.reinaAsc(s); return { rank: r.rank, capBreak: r.capBreak, lv: s.crew.tk_reina.lv, hero: s.hero.level, cap: __RPG.E.crewCap(s, 'tk_reina'), atk: __RPG.C.unitFromCrew(s, 'tk_reina', 1).atk }; });
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__RPG && __RPG.UI && __RPG.E && __RPG.D && __RPG.E.reinaAsc);
  await ev(() => {
    const { UI, S, E } = __RPG; const p = S.newProfile('Рейна', '⚡');
    const s = E.newSlot({ name: 'Арата', race: 'o_street', uniq: 'phoenix', prof1: 'smith', prof2: 'miner', now: Date.now() });
    s.hero.level = 60; E.recruit(s, 'tk_reina'); s.crew.tk_reina.lv = 1; s.crew.tk_reina.xp = 0; s.crew.tk_reina.loy = 100;
    s.gold = 5e6; s.mats.asc_sigil = 80;
    p.slots[0] = s; p.active = 0; UI.p = p; UI.buildNav(); UI.go('game');
  });
  await page.waitForTimeout(400);
  await open(); await toBlock();
  let x = await st();
  check('старт: ранг 0, потолок 10', x.rank === 0 && x.cap === 10, x);
  check('блок рангов вместо звёзд', await ev(() => !!document.querySelector('.reasc') && !/Возвышение ★/.test(document.querySelector('.crewx').textContent)));
  await shot('00-rank0');
  // выдать опыт: упирается в ур. 10
  await ev(() => __RPG.E.crewAddXp(__RPG.UI.slot(), 'tk_reina', 1e9)); await open(); await toBlock();
  x = await st(); check('опыт упёрся в ур. 10', x.lv === 10, x);
  check('кнопка ранга активна', await ev(() => !document.querySelector('[data-act="reinaRank"]').disabled));
  await shot('01-ready');
  const atk0 = x.atk;
  await page.locator('[data-act="reinaRank"]').click(); await page.waitForTimeout(400); await open(); await toBlock();
  x = await st(); check('клик: ранг 1, потолок 20, сила ×1,3', x.rank === 1 && x.cap === 20 && Math.abs(x.atk / atk0 - 1.3) < 0.03, x);
  check('текст «Ранг 1/10»', await ev(() => /Ранг 1\/10/.test(document.querySelector('.reasc').textContent)));
  await shot('02-rank1');
  // разорвать предел недоступен
  check('«Разорвать предел» закрыт до ранга 10', await ev(() => document.querySelector('[data-act="reinaBreak"]').disabled));
  // докачать до 100 рангами через кнопку
  for (let n = 2; n <= 10; n++) { await ev(() => __RPG.E.crewAddXp(__RPG.UI.slot(), 'tk_reina', 1e12)); await open(); await page.locator('[data-act="reinaRank"]').click(); await page.waitForTimeout(150); }
  await ev(() => __RPG.E.crewAddXp(__RPG.UI.slot(), 'tk_reina', 1e12)); await open(); await toBlock();
  x = await st(); check('ранг 10, ур. 100, потолок 100', x.rank === 10 && x.lv === 100 && x.cap === 100, x);
  check('«Разорвать предел» активен', await ev(() => !document.querySelector('[data-act="reinaBreak"]').disabled));
  await shot('03-rank10');
  await page.locator('[data-act="reinaBreak"]').click(); await page.waitForSelector('#cfOk', { timeout: 5000 }); await page.waitForTimeout(250);
  check('диалог с предупреждением', await ev(() => /10 уровней вашего героя/.test(document.querySelector('.mtext').textContent) && /60 → ур\. 50/.test(document.querySelector('.mtext').textContent)));
  await shot('04-confirm');
  await page.locator('#cfOk').click(); await page.waitForTimeout(400);
  x = await st(); check('герой −10 ур., потолок 150', x.hero === 50 && x.cap === 150 && x.capBreak === 1, x);
  await ev(() => __RPG.E.crewAddXp(__RPG.UI.slot(), 'tk_reina', 1e13)); await open(); await toBlock();
  x = await st(); check('Рейна растёт до 150', x.lv === 150, x);
  check('текст «потолок 150»', await ev(() => /Предел разорван/.test(document.querySelector('.reasc').textContent)));
  await shot('05-break150');
  // сохранение и перезагрузка
  await ev(() => __RPG.UI.save(true)); await page.waitForTimeout(300);
  // карточка другого — без блока
  await ev(() => { const s = __RPG.UI.slot(); __RPG.E.recruit(s, 'gen1'); const U = __RPG.UI; U.closeModal(); U.sub.crewId = 'gen1'; U.crewModal(); }); await page.waitForTimeout(250);
  check('у Ильвары обычное возвышение', await ev(() => !document.querySelector('.reasc') && /Возвышение/.test(document.querySelector('.crewx').textContent)));
  const w = await ev(() => document.documentElement.scrollWidth); check('нет горизонтальной прокрутки', w <= 444, w);
  check('без ошибок страницы', !errors.length, errors);
  check('без 404', !failed.length, failed);
  console.log('ИТОГ', ok, '✓', bad, '✗'); await browser.close(); srv.close(); process.exit(bad ? 1 : 0);
})();
