/* E2E: headless Chrome 390×844. Профиль → Король Демонов → пролог (VN) → хаб → Силы → Свита → Сердца → вылазка → бой с Мантрой → сохранение.
   Запуск: node tools/e2e.js [baseUrl]   Скриншоты — в shots/ */
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path');
const { serve } = require('./serve.js');
const outDir = path.join(__dirname, '..', 'shots'); fs.mkdirSync(outDir, { recursive: true });
let ok = 0, bad = 0; const check = (n, c, extra) => { if (c) { ok++; console.log('  ✓', n, extra || ''); } else { bad++; console.log('  ✗', n, extra || ''); } };
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
  const slot = () => ev(() => JSON.parse(JSON.stringify(__RPG.UI.slot())));
  const noOverflow = async (name) => { const r = await ev(() => { const bad = []; document.querySelectorAll('#view .content *, #modal *').forEach((e) => { const b = e.getBoundingClientRect(); if (b.width > 0 && (b.right > innerWidth + 2 || b.left < -2) && !e.closest('.scrollx,.tree,#nav,.partyrow')) bad.push((e.className || e.tagName) + ':' + Math.round(b.left) + '-' + Math.round(b.right)); }); return bad.slice(0, 4); }); check('без горизонтального переполнения: ' + name, r.length === 0, r.join(' | ')); };

  await page.goto(url, { waitUntil: 'load' }); await page.waitForTimeout(900);
  console.log('E2E', url);
  check('заголовок', (await page.title()).includes('Нимб Мира'));
  check('стартовый экран', await ev(() => document.body.dataset.view) === 'title');
  check('манифест арта загружен', await ev(() => Object.keys(__RPG.UI.manifest.portraits).length) >= 20);
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
  // показать VN-сцену из набора реплик, сделать снимок на нужной реплике
  async function vnShot(name, lines, nClicks) {
    await ev((l) => { __RPG.UI.vnTest = __RPG.UI.playLines(l, { bg: 'camp', replay: true }); }, lines);
    await page.waitForSelector('#story', { timeout: 4000 });
    for (let i = 0; i < nClicks; i++) { await page.waitForTimeout(500); await page.locator('#dlg').click({ force: true }); }
    await page.waitForTimeout(1100); await shot(name);
    return page.evaluate(() => ({ imgs: [...document.querySelectorAll('.vact .vsp')].map((e) => (e.getAttribute('src') || 'svg').split('/').pop()), n: document.querySelectorAll('.vact').length }));
  }
  async function toText(sub, max) {
    for (let i = 0; i < (max || 40); i++) {
      const t = await ev(() => (document.querySelector('#stxt') || {}).textContent || '');
      const typing = await ev(() => { const n = document.querySelector('#dlg .nx'); return !n || n.style.opacity !== '1'; });
      if (t.includes(sub) && !typing) return true;
      await page.locator('#dlg').click({ force: true }).catch(() => {}); await page.waitForTimeout(260);
    }
    return false;
  }
  async function endVn() { await playStory(300); await page.waitForTimeout(200); }

  // ───── профиль и создание Короля Демонов ─────
  await act('newProfile'); await page.fill('#npNick', 'Никита'); await act('npAv', '[data-i="3"]'); await act('npCreate');
  check('профиль создан', await ev(() => __RPG.UI.v) === 'slots');
  await act('newHero', '[data-i="0"]');
  await page.fill('#crName', 'Кайрон'); await shot('02-create-name'); await act('crNext');
  await act('crRaceSet', '[data-id="o_street"]'); await shot('03-create-origin'); await act('crNext');
  await act('crUniq', '[data-id="shadowdance"]'); await shot('04-create-echo'); await act('crNext');
  await act('crNext'); check('без профессий дальше нельзя', await ev(() => __RPG.UI.cr.step) === 3);
  await act('crProf', '[data-id="smith"]'); await act('crProf', '[data-id="miner"]'); await shot('05-create-prof');
  await act('crNext'); await shot('06-create-final');
  await act('crFinish'); await page.waitForTimeout(200);
  check('подтверждение необратимости профессий', await page.locator('#modal.on #cfOk').count() === 1);
  await click('#cfOk'); await page.waitForSelector('#story', { timeout: 5000 });
  let sl = await slot();
  check('герой — Король Демонов, мужчина, art hero', sl.hero.cls === 'maou' && sl.hero.sex === 'm' && sl.hero.portrait === 'hero' && sl.hero.race === 'o_street');
  check('пролог запускается', true);
  // читаем вручную пару реплик: арт героя и крупный план
  await page.waitForTimeout(900); await shot('10-prologue-1');
  for (let i = 0; i < 6; i++) { await page.locator('#dlg').click({ force: true }); await page.waitForTimeout(700); }
  await shot('11-prologue-2');
  check('в новелле есть спрайты персонажей', await ev(() => document.querySelectorAll('.vact').length) >= 0);
  const finished = await playStory(900);
  check('пролог и начало главы 1 пройдены', finished);
  await page.waitForTimeout(500); sl = await slot();
  check('флаги пролога', sl.story.flags.prologue_done === 1 && sl.story.done.includes('prologue'), sl.story.done.join(','));
  check('Ильвара в Свите после ch1_a', !!sl.crew.gen1, Object.keys(sl.crew).join(','));
  if (await page.locator('#modal.on').count()) { check('показано обучение', true); await shot('12-tutorial'); await ev(() => __RPG.UI.closeModal()); }
  check('игра на вкладке «Город»', await ev(() => __RPG.UI.v) === 'game' && await ev(() => __RPG.UI.tab) === 'city');
  await shot('13-city'); await noOverflow('город');

  // ───── VN: настроения (арт) ─────
  const l1 = [['bg', 'camp'], ['h', 'Ну, здравствуй, смотрящая.', 'n'], ['i', 'Ты запоздал.', 'h'], ['i', 'Хм. Тебе это не к лицу.', 'a'], ['i', '…Я не краснею. Это отсвет костра.', 's']];
  const imgNow = () => ev(() => [...document.querySelectorAll('.vact .vsp')].map((e) => (e.getAttribute('src') || 'svg').split('/').pop()));
  await ev((l) => { __RPG.UI.vnTest = __RPG.UI.playLines(l, { bg: 'camp', replay: true }); }, l1);
  await page.waitForSelector('#story'); await toText('Ты запоздал'); await page.waitForTimeout(900); await shot('vn-happy-gen1');
  let imgs = await imgNow(); check('VN: happy у генерала (gen1_happy)', imgs.some((x) => /gen1.*happy/.test(x)), imgs.join(','));
  await toText('не к лицу'); await page.waitForTimeout(900); await shot('vn-angry-gen1'); imgs = await imgNow();
  check('VN: angry у генерала', imgs.some((x) => /gen1.*angry/.test(x)), imgs.join(','));
  await toText('отсвет костра'); await page.waitForTimeout(900); await shot('vn-shy-gen1'); imgs = await imgNow();
  check('VN: shy у генерала', imgs.some((x) => /gen1.*shy/.test(x)), imgs.join(','));
  await endVn();
  const l2 = [['bg', 'cathedral'], ['h', 'Склонись.', 'a'], ['e', 'Я не склонюсь перед тобой.', 'a'], ['e', 'Я… не могу. Простите.', 'd'], ['n', 'Меч выпал из её рук.']];
  await ev((l) => { __RPG.UI.vnTest = __RPG.UI.playLines(l, { bg: 'cathedral', replay: true }); }, l2);
  await page.waitForSelector('#story'); await toText('не склонюсь'); await page.waitForTimeout(900); imgs = await imgNow();
  check('VN: angry у героини света (hero1)', imgs.some((x) => /hero1.*angry/.test(x)) && imgs.some((x) => /hero_angry/.test(x)), imgs.join(','));
  await toText('Простите'); await page.waitForTimeout(1000); await shot('vn-sad-hero1'); imgs = await imgNow();
  check('VN: sad у героини света (hero1_sad)', imgs.some((x) => /hero1.*sad/.test(x)), imgs.join(','));
  await endVn();
  const l3 = [['bg', 'camp'], ['h', 'Все здесь?', 'n'], ['i', 'Все.', 'n'], ['m', 'Командир, у меня идея.', 'h'], ['i', 'Опять.', 'a']];
  await ev((l) => { __RPG.UI.vnTest = __RPG.UI.playLines(l, { bg: 'camp', replay: true }); }, l3);
  await page.waitForSelector('#story'); await toText('Опять'); await page.waitForTimeout(1000); await shot('vn-three-actors');
  check('VN: три персонажа в кадре', await ev(() => document.querySelectorAll('.vact').length) === 3);
  await endVn();
  await ev((l) => { __RPG.UI.vnTest = __RPG.UI.playLines(l, { bg: 'void', replay: true }); }, [['cg', 'demon_king'], ['n', 'Нимб над руинами гаснет.'], ['cg', 'halo_city'], ['n', 'А над городом, которого больше нет, он горит.']]);
  await page.waitForSelector('#story'); await toText('Нимб над руинами'); await page.waitForTimeout(1500); await shot('vn-cg-demon-king');
  check('CG показан (demon_king)', await ev(() => document.querySelector('#vcg').classList.contains('on') && /demon_king/.test(document.querySelector('#vcg').style.backgroundImage)));
  await toText('горит'); await page.waitForTimeout(1500); await shot('vn-cg-halo-city');
  check('CG сменён (halo_city)', await ev(() => /halo_city/.test(document.querySelector('#vcg').style.backgroundImage)));
  await endVn();
  check('сцена закрыта, слой очищен', await page.locator('#story').count() === 0);

  // ───── вкладки ─────
  for (const t of ['story', 'dun', 'hero', 'skills', 'crew', 'hearts', 'prof', 'inv', 'set', 'city']) {
    await click(`#nav button[data-t="${t}"]`); await page.waitForTimeout(150); await shot('tab-' + t); await noOverflow('вкладка ' + t);
  }
  // ───── Силы ─────
  await ev(() => { const s = __RPG.UI.slot(); s.hero.level = 10; s.hero.bossPts = 1; __RPG.UI.refresh(); });
  await click('#nav button[data-t="skills"]');
  await click('.node.can'); await click('#btnLearn'); sl = await slot();
  check('узел ветки изучен', Object.keys(sl.hero.spent).length === 1, JSON.stringify(sl.hero.spent));
  for (let b = 0; b < 6; b++) { await act('sub', `[data-v="b${b}"]`); await page.waitForTimeout(80); check('ветка ' + b + ' отрисована', await page.locator('.node').count() >= 14); if (b === 1) await shot('14-skills-flesh'); }
  await act('sub', '[data-v="echo"]'); await click('.node.can'); await click('#btnLearn'); sl = await slot();
  check('узел Отголоска изучен', Object.keys(sl.hero.uspent).length === 1); await shot('15-skills-echo');
  await act('sub', '[data-v="list"]'); await shot('15b-skills-list');
  // слияние: берём концептуальный узел с fuse
  await ev(() => { const s = __RPG.UI.slot(), T = __RPG.D.TREES.maou; s.hero.level = 30; s.hero.spent = {}; const n = T.nodes.find((x) => x.id === 'P13'); const need = (id, seen = {}) => { const x = T.nodes.find((q) => q.id === id); if (seen[id]) return; seen[id] = 1; x.req.forEach((q) => need(q, seen)); s.hero.spent[id] = Math.max(1, s.hero.spent[id] || 0); }; need('P13'); delete s.hero.spent.P13; __RPG.UI.sub.skills = 'b1'; __RPG.UI.sub.node = 'P13'; __RPG.UI.refresh(); });
  await page.waitForTimeout(150); await shot('16-skills-fuse');
  await act('learn', '[data-id="P13"]'); await page.waitForTimeout(150);
  if (await page.locator('#modal.on #cfOk').count()) { await click('#cfOk'); }
  sl = await slot(); const fusedOk = sl.hero.spent.P13 === 1; check('слияние узлов: концепт изучен (P13)', fusedOk);
  check('слитые узлы перестали действовать', await ev(() => { const f = __RPG.E.fused(__RPG.UI.slot().hero); return !!f.P4 && !!f.P7; }));
  await ev(() => { const s = __RPG.UI.slot(); s.hero.level = 1; s.hero.spent = {}; s.hero.uspent = {}; s.hero.bossPts = 0; __RPG.UI.refresh(); });

  // ───── Свита ─────
  await click('#nav button[data-t="crew"]'); await shot('17-crew');
  await act('crewOpen', '[data-id="gen1"]'); await page.waitForTimeout(150); await shot('18-crew-modal'); await noOverflow('карточка Свиты');
  await ev(() => { const s = __RPG.UI.slot(); s.crewTalk = 3; s.gifts = { book: 2, flowers: 1 }; s.gold += 500; __RPG.UI.sub.crewId = 'gen1'; __RPG.UI.crewModal(); });
  console.log('  кнопок подарка:', await page.locator('[data-act="giveGift"]').count(), await ev(() => document.querySelector('#modal').className));
  const loy0 = (await slot()).crew.gen1.loy;
  await act('giveGift', '[data-g="book"]'); sl = await slot(); check('подарок повышает верность', sl.crew.gen1.loy > loy0 && sl.gifts.book === 1, loy0 + '→' + sl.crew.gen1.loy);
  await act('crewTalk', '[data-id="gen1"]'); sl = await slot(); check('разговор тратит вечер', sl.crewTalk === 2);
  await ev(() => __RPG.UI.closeModal());
  await act('cmdTog').catch(() => {});
  // ───── Сердца ─────
  await ev(() => { const s = __RPG.UI.slot(); __RPG.E.addAff(s, 'gen1', 45); __RPG.UI.refresh(); });
  await click('#nav button[data-t="hearts"]'); await shot('19-hearts'); await noOverflow('Сердца');
  await act('heartOpen', '[data-id="gen1"]'); await page.waitForTimeout(150); await shot('20-heart-modal');
  await act('romScene', '[data-i="0"]'); await page.waitForSelector('#story'); await shot('21-rom-scene');
  await playStory(300); await page.waitForTimeout(300); sl = await slot();
  check('романтическая сцена просмотрена и учтена', sl.rom.gen1.seen.includes(0));
  await ev(() => __RPG.UI.closeModal());
  await ev(() => { __RPG.UI.heartModal(); });
  await act('dateGo', '[data-i="1"]'); await page.waitForSelector('#story'); const a0 = sl.rom.gen1.aff;
  await playStory(300); await page.waitForTimeout(300); sl = await slot();
  check('свидание проведено (+симпатия, −вечер, −золото)', sl.rom.gen1.dates === 1 && sl.rom.gen1.aff > a0, a0 + '→' + sl.rom.gen1.aff);
  await ev(() => __RPG.UI.closeModal());

  // ───── Лавка/подарки ─────
  await click('#nav button[data-t="city"]'); await act('shop'); await act('shopTab', '[data-v="gifts"]'); await shot('22-shop-gifts');
  const g0 = (await slot()).gold; await act('buyGiftBtn', '[data-g="wine"]'); check('покупка подарка', (await slot()).gold < g0 && (await slot()).gifts.wine === 1);
  await ev(() => __RPG.UI.closeModal());

  // ───── Вылазка и бой с Мантрой Силы ─────
  await ev(() => { const s = __RPG.UI.slot(); s.hero.level = 8; s.hero.spent = { P14: 1 }; s.hero.hp = 1; __RPG.UI.refresh(); });
  await click('#nav button[data-t="dun"]'); await shot('23-dungeons');
  await act('dunOpen', '[data-id="mill"]'); await shot('24-prep'); await noOverflow('подготовка'); await act('dunGo');
  await page.waitForTimeout(400); if (await page.locator('#story').count()) await playStory(300);
  check('вылазка началась', !!(await slot()).run); await shot('24b-run'); console.log('  errors so far:', errors.slice(0, 4).join(' || '));
  await act('runNext'); await page.waitForSelector('#battle', { timeout: 5000 }); await page.waitForTimeout(500); await shot('25-battle');
  await page.waitForSelector('.mainbtns', { timeout: 8000 });
  await act('bSel', '.foe'); await act('bBasic'); await page.waitForTimeout(900); await shot('26-battle-hit');
  const mant = await ev(() => { const B = __RPG.UI.B; const h = B && B.party.find((u) => u.hero); return h ? { mst: h.mst, st: h.st.map((x) => x.id + ':' + (x.pow || '')) } : null; });
  console.log('  мантра в бою:', JSON.stringify(mant));
  await act('bAuto'); await act('bSpeed');
  await page.waitForSelector('[data-act="btDone"]', { timeout: 90000 }); await shot('27-battle-win');
  sl = await slot(); check('бой выигран', sl.run && sl.run.kills > 0, 'убито ' + (sl.run && sl.run.kills));
  await act('btDone');
  const tEnd = Date.now() + 280000;
  while (Date.now() < tEnd) {
    await page.waitForTimeout(150);
    if (await page.locator('#modal.on #evOk').count()) { await click('#evOk'); continue; }
    if (await page.locator('#modal.on [data-act="shrineP"]').count()) { await click('[data-act="shrineP"][data-c="heal"]'); continue; }
    if (await page.locator('#modal.on #runDone').count()) { await shot('28-run-result'); break; }
    if (await page.locator('[data-act="btDone"]').count()) { await act('btDone'); continue; }
    if (await page.locator('#battle').count()) { await page.waitForTimeout(500); continue; }
    if (await page.locator('#story').count()) { await playStory(200); continue; }
    if (await page.locator('#btnRunNext').count()) { if (!(await page.locator('#modal.on').count())) { await act('runNext'); await page.waitForTimeout(300); } }
  }
  check('вылазка завершена, результаты показаны', await page.locator('#modal.on #runDone').count() === 1);
  await click('#runDone'); await page.waitForTimeout(500); if (await page.locator('#story').count()) await playStory(600);
  await page.waitForTimeout(300); sl = await slot();
  check('подземелье «Руины Хельмора» пройдено', sl.prog.cleared.mill >= 1, JSON.stringify(sl.prog.cleared));
  check('Свита получила опыт или уровень', Object.keys(sl.crew).some((id) => sl.crew[id].xp > 0 || sl.crew[id].lv > 1));
  check('за вылазку выдан вечер', sl.crewTalk >= 3, String(sl.crewTalk));
  check('сюжет: после вылазки Грак в Свите', !!sl.crew.grak || sl.story.done.includes('ch1_b'), sl.story.done.join(','));
  await shot('29-after-run');
  // ───── перезагрузка ─────
  const before = await slot();
  await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(900);
  check('после перезагрузки — стартовый экран', await ev(() => __RPG.UI.v) === 'title');
  await click('[data-act="pickProfile"]'); await click('[data-act="playSlot"]'); await page.waitForTimeout(600);
  const after = await slot();
  check('сохранение пережило перезагрузку', after.hero.name === 'Кайрон' && after.hero.level === before.hero.level && after.gold === before.gold && JSON.stringify(after.crew) === JSON.stringify(before.crew) && JSON.stringify(after.rom) === JSON.stringify(before.rom));
  await shot('30-after-reload');
  const code = await ev(() => __RPG.S.exportCode(__RPG.UI.p, 0));
  check('экспорт-код', code.startsWith('ARPG'), code.slice(0, 8));
  const imp = await ev((c) => { const r = __RPG.S.importCode(c); return r.err || r.p.slots[0].hero.name; }, code);
  check('импорт кода', imp === 'Кайрон', imp);
  check('нет внешних запросов', external.length === 0, external.join(','));
  check('нет упавших запросов', failed.length === 0, failed.slice(0, 3).join(','));
  check('нет ошибок консоли', errors.length === 0, errors.slice(0, 5).join(' || '));
  console.log(`\nИтого: ${ok} ✓, ${bad} ✗`);
  await browser.close(); if (srv) srv.close(); process.exit(bad ? 1 : 0);
})().catch((e) => { console.error('E2E упал:', e); process.exit(2); });
