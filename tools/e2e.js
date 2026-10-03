/* E2E: headless Chrome 390×844. Весь путь: профиль → создание (все 5 классов) → пролог → хаб → подземелье → бой → лут → перезагрузка.
   Запуск: node tools/e2e.js [baseUrl]   Скриншоты — в shots/ */
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path');
const { serve } = require('./serve.js');
const outDir = path.join(__dirname, '..', 'shots'); fs.mkdirSync(outDir, { recursive: true });
let ok = 0, bad = 0; const check = (n, c, extra) => { if (c) { ok++; console.log('  ✓', n, extra || ''); } else { bad++; console.log('  ✗', n, extra || ''); } };
const CLASSES = ['warrior', 'mage', 'rogue', 'healer', 'shield'], RN = { warrior: 'Воин', mage: 'Маг', rogue: 'Вор', healer: 'Целитель', shield: 'Щитоносец' };
(async () => {
  let srv = null, url = process.argv[2];
  if (!url) { srv = await serve(0); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
  const exe = process.env.CHROME_PATH || ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find((p) => fs.existsSync(p));
  const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ru-RU', timezoneId: 'Europe/Minsk' });
  const page = await ctx.newPage(); const errors = [], failed = [], external = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('response', (r) => { if (r.status() >= 400) failed.push(r.status() + ' ' + r.url()); });
  page.on('requestfailed', (r) => failed.push(r.url()));
  page.on('request', (r) => { if (!r.url().startsWith(url) && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) external.push(r.url()); });
  const shot = (n) => page.screenshot({ path: path.join(outDir, n + '.jpg'), type: 'jpeg', quality: 72, scale: 'css' });
  const click = async (sel, o) => { const l = page.locator(sel).first(); await l.waitFor({ state: 'visible', timeout: 5000 }); await l.click(o); await page.waitForTimeout(60); };
  const act = (a, extra) => click(`[data-act="${a}"]${extra || ''}`);
  const ev = (f, a) => page.evaluate(f, a);
  const slot = () => ev(() => { const U = __RPG.UI; return JSON.parse(JSON.stringify(U.slot())); });
  const noOverflow = async (name) => { const r = await ev(() => { const bad = []; document.querySelectorAll('#view *, #modal *').forEach((e) => { const b = e.getBoundingClientRect(); if (b.width > 0 && (b.right > innerWidth + 2 || b.left < -2) && !e.closest('.fchips,.turnstrip,.actor,.sbg,.sbg2,.hub,.bg,.lira,.sil,.herocard,.flt')) bad.push(e.className + ':' + Math.round(b.right)); }); return bad.slice(0, 5); }); check('нет горизонтального переполнения: ' + name, r.length === 0, r.join(' | ')); };

  await page.goto(url, { waitUntil: 'load' }); await page.waitForTimeout(800);
  console.log('E2E', url);
  check('заголовок', (await page.title()).includes('Лира Пепла'));
  check('стартовый экран', await ev(() => document.body.dataset.view) === 'title');
  await shot('01-title');

  async function playStory(maxSteps) {
    let guard = maxSteps || 400;
    while (guard-- > 0 && await page.locator('#story').count()) {
      if (await page.locator('.schoice.on .choice').count()) { await click('.schoice.on .choice'); await page.waitForTimeout(150); continue; }
      const sk = page.locator('#sSkip'); if (await sk.count() && !(await sk.evaluate((e) => e.classList.contains('on')))) await sk.click().catch(() => {});
      await page.waitForTimeout(120);
      if (await page.locator('#dlg').count()) await page.locator('#dlg').click({ force: true, timeout: 800 }).catch(() => {});
    }
    return guard > 0;
  }
  async function createProfile(nick) {
    await act('newProfile'); await page.fill('#npNick', nick); await act('npAv', '[data-i="3"]'); await act('npCreate');
    check('профиль создан: ' + nick, await ev(() => __RPG.UI.v) === 'slots');
  }
  async function createHero(cls, i, name) {
    await act('newHero', `[data-i="${i}"]`);
    await page.fill('#crName', name); await act('crSex', '[data-v="f"]');
    if (cls === 'warrior') { await shot('02-create-name'); }
    await act('crNext'); // раса
    const race = ['human', 'elf', 'dwarf', 'beast', 'demon'][CLASSES.indexOf(cls)];
    await act('crRaceSet', `[data-id="${race}"]`); if (cls === 'warrior') await shot('03-create-race'); await act('crNext');
    await act('crClassSet', `[data-id="${cls}"]`); if (cls === 'warrior') await shot('04-create-class'); await act('crNext');
    await act('crPor', `[data-id="${race}_f_2"]`); if (cls === 'warrior') await shot('05-create-look'); await act('crNext');
    const uq = ['phoenix', 'shadowdance', 'frostheart', 'thunder', 'ironwill'][CLASSES.indexOf(cls)];
    await act('crUniq', `[data-id="${uq}"]`); if (cls === 'warrior') await shot('06-create-echo'); await act('crNext');
    // профессии: без выбора — Далее должно отказать
    await act('crNext'); check('без профессий дальше нельзя (' + cls + ')', await ev(() => __RPG.UI.cr.step) === 5);
    const pr = [['smith', 'miner'], ['alch', 'herb'], ['leath', 'hunt'], ['cook', 'fish'], ['ench', 'miner']][CLASSES.indexOf(cls)];
    await act('crProf', `[data-id="${pr[0]}"]`); await act('crProf', `[data-id="${pr[1]}"]`); if (cls === 'warrior') await shot('07-create-prof');
    await act('crNext'); if (cls === 'warrior') await shot('08-create-final');
    await act('crFinish'); await page.waitForTimeout(200);
    check('подтверждение необратимости профессий', await page.locator('#modal.on #cfOk').count() === 1);
    if (cls === 'warrior') await shot('09-confirm');
    await click('#cfOk');
    await page.waitForSelector('#story', { timeout: 5000 });
    check('пролог запускается: ' + cls, true);
  }

  // ───── Воин: полный путь ─────
  await createProfile('Никита');
  await createHero('warrior', 0, 'Рэйн');
  await page.waitForTimeout(700); await shot('10-prologue-1');
  // руками прочитаем несколько реплик
  for (let i = 0; i < 4; i++) { await page.locator('#dlg').click({ force: true }); await page.waitForTimeout(250); }
  await shot('11-prologue-2');
  const finished = await playStory(600);
  check('пролог и глава 1 (начало) пройдены', finished);
  await page.waitForTimeout(500);
  let sl = await slot();
  check('флаги пролога', sl.story.flags.prologue_done === 1 && sl.story.done.includes('prologue'), JSON.stringify(sl.story.done));
  check('игра на вкладке «Город»', await ev(() => __RPG.UI.v) === 'game' && await ev(() => __RPG.UI.tab) === 'city');
  if (await page.locator('#modal.on').count()) { check('показано обучение', true); await shot('12-tutorial'); await page.evaluate(() => __RPG.UI.closeModal()); }
  await shot('13-city'); await noOverflow('город');
  // вкладки
  for (const t of ['story', 'dun', 'hero', 'skills', 'prof', 'inv', 'set', 'city']) {
    await click(`#nav button[data-t="${t}"]`); await page.waitForTimeout(150); await shot('tab-' + t); await noOverflow('вкладка ' + t);
  }
  // навыки: уровень 1 → очков нет; повысим, изучим узел
  await ev(() => { const s = __RPG.UI.slot(); s.hero.level = 6; s.hero.bossPts = 1; __RPG.UI.refresh(); });
  await click('#nav button[data-t="skills"]');
  await click('.node.can'); await click('#btnLearn'); sl = await slot();
  check('узел древа изучен', Object.keys(sl.hero.spent).length === 1, JSON.stringify(sl.hero.spent));
  await shot('14-skills-class');
  await act('sub', '[data-v="echo"]'); await click('.node.can'); await click('#btnLearn'); sl = await slot();
  check('узел Эха изучен', Object.keys(sl.hero.uspent).length === 1, JSON.stringify(sl.hero.uspent)); await shot('15-skills-echo');
  await ev(() => { const s = __RPG.UI.slot(); s.hero.level = 1; s.hero.spent = {}; s.hero.uspent = {}; s.hero.bossPts = 0; __RPG.UI.refresh(); });

  // профессия: крафт
  await click('#nav button[data-t="prof"]');
  await ev(() => { const s = __RPG.UI.slot(); __RPG.E.addMat(s, 'ore_cu', 20); s.gold += 500; __RPG.UI.refresh(); });
  await act('craft', '[data-id="smith_smelt_cu"], [data-id="smelt_cu"]').catch(() => {}); await shot('16-prof');
  const profInfo = await ev(() => ({ g: __RPG.UI.slot().stats.crafted, m: __RPG.UI.slot().mats }));
  check('крафт работает', profInfo.g >= 1, JSON.stringify(profInfo));
  // магазин, покупка
  await click('#nav button[data-t="city"]'); await act('shop'); await page.waitForTimeout(150); await shot('17-shop');
  await act('shopTab', '[data-v="cons"]'); const g0 = (await slot()).gold; await act('buyCons', '[data-id="pot_hp1"]'); check('покупка зелья', (await slot()).gold < g0);
  await ev(() => __RPG.UI.closeModal());

  // ───── Подземелье и бой ─────
  await click('#nav button[data-t="dun"]'); await shot('18-dungeons');
  await act('dunOpen', '[data-id="mill"]'); await shot('19-prep'); await act('dunGo');
  await page.waitForTimeout(400);
  if (await page.locator('#story').count()) { await playStory(200); }
  await page.waitForTimeout(300); await shot('20-run');
  check('вылазка началась', !!(await slot()).run);
  await act('runNext'); await page.waitForSelector('#battle', { timeout: 5000 }); await page.waitForTimeout(500);
  await shot('21-battle');
  // руками: атака по врагу
  await page.waitForSelector('.mainbtns', { timeout: 8000 });
  await act('bSel', '.foe'); await act('bBasic'); await page.waitForTimeout(700); await shot('22-battle-hit');
  // включить авто и ускорение
  await act('bAuto'); await act('bSpeed');
  await page.waitForSelector('#btBtnDone, [data-act="btDone"]', { timeout: 60000 }); await shot('23-battle-win');
  sl = await slot();
  check('бой выигран, опыт/золото в добыче', sl.run && sl.run.bag.xp > 0 && sl.run.kills > 0, JSON.stringify({ xp: sl.run && sl.run.bag.xp, k: sl.run && sl.run.kills }));
  await act('btDone');
  // проходим вылазку целиком в авто-режиме
  const tEnd = Date.now() + 280000;
  while (Date.now() < tEnd) {
    await page.waitForTimeout(150);
    if (await page.locator('#modal.on #evOk').count()) { await click('#evOk'); continue; }
    if (await page.locator('#modal.on [data-act="shrineP"]').count()) { await click('[data-act="shrineP"][data-c="heal"]'); continue; }
    if (await page.locator('#modal.on #runDone').count()) { await shot('24-run-result'); break; }
    if (await page.locator('[data-act="btDone"]').count()) { await act('btDone'); continue; }
    if (await page.locator('#battle').count()) { await page.waitForTimeout(500); continue; }
    if (await page.locator('#btnRunNext').count()) {
      if (await page.locator('.mbox').count() === 0 || !(await page.locator('#modal.on').count())) { await act('runNext'); await page.waitForTimeout(300); }
    } else if (await page.locator('#story').count()) await playStory(100);
  }
  check('вылазка завершена, результаты показаны', await page.locator('#modal.on #runDone').count() === 1);
  const invBefore = (await slot()).inv.length;
  await click('#runDone'); await page.waitForTimeout(500);
  if (await page.locator('#story').count()) { await playStory(500); }
  await page.waitForTimeout(300);
  sl = await slot();
  check('подземелье «Подвалы» пройдено', sl.prog.cleared.mill >= 1, JSON.stringify(sl.prog));
  check('лут получен', sl.inv.length >= invBefore && sl.stats.kills > 0, 'предметов ' + sl.inv.length + ', убито ' + sl.stats.kills);
  check('уровень вырос', sl.hero.level >= 2, 'ур. ' + sl.hero.level);
  check('сюжет: глава 1 продолжена', sl.story.done.includes('ch1_b') || sl.story.done.includes('ch1_a'), sl.story.done.join(','));
  await shot('25-after-run');
  // инвентарь
  await click('#nav button[data-t="inv"]'); const itm = page.locator('.item[data-act="itemOpen"]').first(); if (await itm.count()) { await itm.click(); await page.waitForTimeout(150); await shot('26-item'); await page.evaluate(() => __RPG.UI.closeModal()); }
  // перезагрузка
  const before = await slot();
  await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(800);
  check('после перезагрузки — стартовый экран', await ev(() => __RPG.UI.v) === 'title');
  await click('[data-act="pickProfile"]'); await click('[data-act="playSlot"]'); await page.waitForTimeout(500);
  const after = await slot();
  check('сохранение пережило перезагрузку', after.hero.name === 'Рэйн' && after.hero.level === before.hero.level && after.gold === before.gold && JSON.stringify(after.prog) === JSON.stringify(before.prog), `ур.${after.hero.level} золото ${after.gold}`);
  await shot('27-after-reload');
  // экспорт / импорт
  const code = await ev(() => __RPG.S.exportCode(__RPG.UI.p, 0));
  check('экспорт-код', code.startsWith('ARPG3.'), code.slice(0, 20));
  const imp = await ev((c) => { const r = __RPG.S.importCode(c); return r.err || r.p.slots[0].hero.name; }, code);
  check('импорт кода', imp === 'Рэйн', imp);
  const badCode = await ev(() => __RPG.S.importCode('ARPG3.zzz.AAAA').err);
  check('битый код отклонён', !!badCode, badCode);

  // ───── Остальные классы: создание → пролог → город → бой ─────
  for (let ci = 1; ci < CLASSES.length; ci++) {
    const cls = CLASSES[ci];
    await ev(() => { __RPG.UI.save(true); __RPG.UI.p = null; __RPG.UI.go('title'); });
    await createProfile('Игрок' + ci); await createHero(cls, 0, 'Герой' + ci);
    await playStory(600); await page.waitForTimeout(400);
    if (await page.locator('#modal.on').count()) await page.evaluate(() => __RPG.UI.closeModal());
    sl = await slot(); check(`${RN[cls]}: пролог пройден, класс верный`, sl.story.flags.prologue_done === 1 && sl.hero.cls === cls);
    await shot('cls-' + cls + '-city');
    // быстрый бой в авто
    await click('#nav button[data-t="dun"]'); await act('dunOpen', '[data-id="mill"]'); await act('dunGo'); await page.waitForTimeout(300);
    if (await page.locator('#story').count()) await playStory(200);
    await act('runNext'); await page.waitForSelector('#battle'); await page.waitForSelector('.mainbtns', { timeout: 8000 });
    await shot('cls-' + cls + '-battle');
    // применим навык, если доступен
    const used = await ev(() => { const b = document.querySelector('.skgrid .sk:not(.off)'); if (b) { b.click(); return true; } return false; });
    await page.waitForTimeout(300); if (await page.locator('#modal.on [data-act="allyChosen"]').count()) await act('allyChosen');
    await page.waitForTimeout(900); await act('bAuto').catch(() => {}); await act('bSpeed').catch(() => {});
    await page.waitForSelector('[data-act="btDone"]', { timeout: 90000 });
    await shot('cls-' + cls + '-win');
    sl = await slot(); check(`${RN[cls]}: бой завершён`, sl.run.kills > 0 || sl.stats.deaths > 0, 'навык: ' + used + ', убито ' + sl.run.kills);
    await act('btDone'); await page.waitForTimeout(200);
  }
  check('нет внешних запросов', external.length === 0, external.join(','));
  check('нет упавших запросов', failed.length === 0, failed.slice(0, 3).join(','));
  check('нет ошибок консоли', errors.length === 0, errors.slice(0, 5).join(' || '));
  console.log(`\nИтого: ${ok} ✓, ${bad} ✗`);
  await browser.close(); if (srv) srv.close(); process.exit(bad ? 1 : 0);
})().catch((e) => { console.error('E2E упал:', e); process.exit(2); });
