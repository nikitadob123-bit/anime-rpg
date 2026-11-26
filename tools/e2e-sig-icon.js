/* E2E v2.33.1: иконка Знаков возвышения вместо 🔱. Скриншоты /workspace/shots-reina-asc/v2331/ (444×986) */
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path');
const { serve } = require('./serve.js');
const outDir = '/workspace/shots-reina-asc/v2331'; fs.mkdirSync(outDir, { recursive: true });
let ok = 0, bad = 0;
const check = (n, c, x) => { if (c) { ok++; console.log('  ✓', n, x != null ? JSON.stringify(x) : ''); } else { bad++; console.log('  ✗', n, JSON.stringify(x || '')); } };
(async () => {
  const srv = await serve(0); const url = 'http://127.0.0.1:' + srv.address().port + '/';
  const exe = ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find((p) => fs.existsSync(p));
  const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 444, height: 986 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ru-RU' });
  const page = await ctx.newPage(); const errors = [], failed = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('response', (r) => { if (r.status() >= 400) failed.push(r.status() + ' ' + r.url()); });
  const ev = (f, a) => page.evaluate(f, a);
  const shot = (n) => page.screenshot({ path: path.join(outDir, n + '.jpg'), type: 'jpeg', quality: 85, scale: 'css' });
  // в области: сколько иконок знака (загруженных), нет ли эмодзи 🔱 рядом со словом «Знак»/ценой
  const probe = (sel) => ev((sel) => { const root = document.querySelector(sel); if (!root) return { none: 1 }; const ims = [...root.querySelectorAll('img[src*="sig_asc"]')]; return { n: ims.length, loaded: ims.every((i) => i.complete && i.naturalWidth > 0), emoji: (root.textContent.match(/🔱/g) || []).length, h: ims[0] ? Math.round(ims[0].getBoundingClientRect().height) : 0 }; }, sel);
  const settle = () => page.waitForTimeout(450);
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__RPG && __RPG.UI && __RPG.E && __RPG.UI.sigIc);
  await ev(() => {
    const { UI, S, E } = __RPG; const p = S.newProfile('Знаки', '⚡');
    const s = E.newSlot({ name: 'Арата', race: 'o_street', uniq: 'phoenix', prof1: 'smith', prof2: 'miner', now: Date.now() });
    s.hero.level = 60; E.recruit(s, 'tk_reina'); E.recruit(s, 'gen1'); s.crew.tk_reina.lv = 10; s.crew.gen1.lv = 30;
    s.gold = 5e6; s.mats.asc_sigil = 42; E.addMat(s, 'ore_cu', 5);
    p.slots[0] = s; p.active = 0; UI.p = p; UI.buildNav(); UI.go('game');
  });
  await settle();
  // 1. блок рангов Рейны
  await ev(() => { const U = __RPG.UI; U.sub.crewId = 'tk_reina'; U.crewModal(); document.querySelector('.reasc').scrollIntoView({ block: 'center' }); }); await settle();
  let x = await probe('.reasc'); check('ранги Рейны: иконка вместо 🔱', x.n >= 1 && x.loaded && !x.emoji, x); await shot('01-reina-rank');
  // 2. возвышение и мастерство обычного члена Свиты
  await ev(() => { const U = __RPG.UI; U.closeModal(); U.sub.crewId = 'gen1'; U.crewModal(); document.querySelector('.crewx').scrollIntoView({ block: 'center' }); }); await settle();
  x = await probe('.crewx'); check('возвышение/мастерство: иконки на кнопках', x.n >= 2 && x.loaded && !x.emoji, x); await shot('02-crew-asc');
  // 3. вкладка Свиты — счётчик знаков
  await ev(() => { const U = __RPG.UI; U.closeModal(); U.tab = 'crew'; U.renderGame(); const c = document.querySelector('.crewx'); c && c.scrollIntoView({ block: 'start' }); }); await settle();
  x = await probe('.content'); check('Свита: счётчик знаков', x.n >= 1 && !x.emoji, x); await shot('03-crew-tab');
  // 4. сумка — материалы
  await ev(() => { const U = __RPG.UI; U.tab = 'inv'; U.sub.inv = 'mats'; U.renderGame(); }); await settle();
  x = await probe('.matgrid'); check('сумка: материал картинкой', x.n === 1 && x.loaded, x); await shot('04-inv-mats');
  // 5. лавка — продажа
  await ev(() => { const U = __RPG.UI; U.sub.shop = 'sell'; U.shopModal(); }); await settle();
  x = await probe('.mbox'); check('лавка/продажа: картинка', x.n === 1 && x.loaded, x); await shot('05-shop-sell');
  // 6. почта: письмо с Знаками
  await ev(() => { const { UI, M } = __RPG; UI.closeModal(); const s = UI.slot(); M.deliver(s, [{ id: 'e2e-sig', from: 'Рейна', title: 'Знаки для рангов', body: 'Проверка иконки.', gifts: { mats: { asc_sigil: 10 }, gold: 1000 } }], Date.now()); UI.tab = 'mail'; UI.renderGame(); }); await settle();
  x = await probe('.content'); check('почта: превью в списке', x.n >= 1 && !x.emoji, x); await shot('06-mail-list');
  await ev(() => __RPG.UI.mailOpen('e2e-sig')); await settle();
  x = await probe('.mbox'); check('почта: подарок картинкой', x.n >= 1 && x.loaded && !x.emoji, x); await shot('07-mail-letter');
  // 7. ежедневные награды (cur_sig → та же иконка)
  await ev(() => { const { UI } = __RPG; UI.closeModal(); UI.modal(`<h3>Награды</h3><div class="mtext">${UI.rwText({ gold: 500, sig: 2 })}</div>`); }); await settle();
  x = await probe('.mbox'); check('награды целей: иконка знака', x.n === 1 && x.loaded && !x.emoji, x); await shot('08-goal-reward');
  check('без ошибок страницы', !errors.length, errors);
  check('без 404', !failed.length, failed);
  console.log('ИТОГ', ok, '✓', bad, '✗'); await browser.close(); srv.close(); process.exit(bad ? 1 : 0);
})();
