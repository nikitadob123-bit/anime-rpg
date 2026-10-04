/* E2E сюжета на 300 глав: профиль → Король → пролог → (прогресс до конца главы 3) → вкладка «Сюжет» → главы 4–10 в VN-плеере
   (ворота вылазок, фоны, выборы) → переход к арке 2 («скоро») → перезагрузка и сохранение прогресса. Запуск: node tools/e2e-story.js [baseUrl] */
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
  const page = await ctx.newPage(); const errors = [], failed = [], reqs = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('response', (r) => { if (r.status() >= 400) failed.push(r.status() + ' ' + r.url()); });
  page.on('request', (r) => reqs.push(r.url()));
  const shot = (n) => page.screenshot({ path: path.join(outDir, 'story-' + n + '.jpg'), type: 'jpeg', quality: 70, scale: 'css' });
  const click = async (sel, o) => { const l = page.locator(sel).first(); await l.waitFor({ state: 'visible', timeout: 6000 }); await l.click(o); await page.waitForTimeout(60); };
  const act = (a, extra) => click(`[data-act="${a}"]${extra || ''}`);
  const ev = (f, a) => page.evaluate(f, a);
  const slot = () => ev(() => JSON.parse(JSON.stringify(__RPG.UI.slot())));
  async function playStory(maxSteps) {
    let guard = maxSteps || 600, choices = 0;
    while (guard-- > 0 && await page.locator('#story').count()) {
      if (await page.locator('.schoice.on .choice').count()) { choices++; await click('.schoice.on .choice'); await page.waitForTimeout(150); continue; }
      const sk = page.locator('#sSkip'); if (await sk.count() && !(await sk.evaluate((e) => e.classList.contains('on')))) await sk.click().catch(() => {});
      await page.waitForTimeout(100);
      if (await page.locator('#dlg').count()) await page.locator('#dlg').click({ force: true, timeout: 800 }).catch(() => {});
    }
    return { done: guard > 0, choices };
  }

  await page.goto(url, { waitUntil: 'load' }); await page.waitForTimeout(900);
  console.log('E2E-story', url);
  check('заголовок', (await page.title()).includes('Нимб Мира'));
  await act('newProfile'); await page.fill('#npNick', 'Сюжет'); await act('npAv', '[data-i="3"]'); await act('npCreate');
  await act('newHero', '[data-i="0"]'); await page.fill('#crName', 'Арата'); await act('crNext');
  await act('crRaceSet', '[data-id="o_street"]'); await act('crNext'); await act('crUniq', '[data-id="shadowdance"]'); await act('crNext'); await act('crNext');
  await act('crProf', '[data-id="smith"]'); await act('crProf', '[data-id="miner"]'); await act('crNext'); await act('crFinish');
  await click('#cfOk'); await page.waitForSelector('#story', { timeout: 6000 });
  let r = await playStory(900); check('пролог и глава 1 (первая сцена) проиграны', r.done);
  await page.waitForTimeout(400); if (await page.locator('#modal.on').count()) await ev(() => __RPG.UI.closeModal());
  check('арка 1 подгружена (главы 4–10 в D.CHAPTERS)', await ev(() => !!(__RPG.D.CHAPTERS[4] && __RPG.D.CHAPTERS[10] && __RPG.D.CHAPTERS[10]._ok)));
  check('загружался js/story/arc01.js', reqs.some((u) => /js\/story\/arc01\.js/.test(u)));

  // Быстро перематываем легаси-главы 1–3 (их проходит test/run.js и e2e.js), как у игрока, дочитавшего старый сюжет
  await ev(() => { const { UI, story: ST, E } = __RPG; const s = UI.slot(); s.story.flags.prologue_done = 1; s.story.flags.spared_fiora = 1;
    [].concat(ST.sceneIds(1), ST.sceneIds(2), ST.sceneIds(3), ST.auxIds(3)).forEach((id) => E.finishScene(s, id)); ['mill', 'cathedral', 'spire'].forEach((d) => { s.prog.cleared[d] = 1; }); s.hero.level = 28; UI.save(true); UI.refresh(); });
  let sl = await slot();
  check('текущая глава — 4', await ev(() => __RPG.story.current(__RPG.UI.slot())) === 4, '');

  // Главная: карточка сюжета ведёт в главу 4
  await act('tab', '[data-t="city"]'); await page.waitForTimeout(200);
  check('на главной кнопка «Продолжить историю»', await page.locator('#btnStory').count() === 1);

  // Вкладка «Сюжет»
  await act('tab', '[data-t="story"]'); await page.waitForTimeout(500);
  check('вкладка «Сюжет»: 30 арок', await page.locator('.arcbox').count() === 30);
  check('вкладка «Сюжет»: прогресс «3 из 300»', (await page.locator('.content').innerText()).includes('Пройдено глав: 3 из 300'));
  check('арка 1 раскрыта, 10 глав', await page.locator('.chrow').count() === 10);
  check('главы 1–3 пройдены, глава 4 текущая', await ev(() => [...document.querySelectorAll('.chrow')].map((e) => e.classList.contains('done') ? 'd' : e.classList.contains('cur') ? 'c' : e.classList.contains('lockd') ? 'l' : 's').join('')) === 'dddcllllll');
  check('у глав есть рекомендуемый уровень', (await page.locator('.chrow').nth(3).innerText()).includes('рек. ур. 16'));
  check('загружался outline.js', reqs.some((u) => /js\/story\/outline\.js/.test(u)));
  await shot('01-tab-arc1');
  await ev(() => document.querySelectorAll('.arcrow')[1].click()); await page.waitForTimeout(250);
  check('арка 2 раскрывается; главы «скоро»', await page.locator('.chrow.soon').count() === 10);
  await shot('02-tab-arc2');
  await ev(() => document.querySelectorAll('.arcrow')[0].click()); await page.waitForTimeout(150);

  // Проходим главы 4–10: сцены → вылазка (имитация победы) → сцены
  const bgsSeen = new Set(); const choicesTotal = { n: 0 };
  async function playChapterScenes() {
    for (let guard = 0; guard < 8; guard++) {
      await act('tab', '[data-t="city"]'); await page.waitForTimeout(150);
      if (!(await page.locator('#btnStory').count())) break;
      await click('#btnStory'); await page.waitForSelector('#story', { timeout: 4000 });
      await page.waitForTimeout(200);
      bgsSeen.add(await ev(() => (document.querySelector('#story') || {}).dataset ? document.querySelector('#story').dataset.bg : ''));
      const res = await playStory(900); choicesTotal.n += res.choices;
      if (!res.done) return false;
      await page.waitForTimeout(200); if (await page.locator('#modal.on').count()) await ev(() => __RPG.UI.closeModal());
    }
    return true;
  }
  for (let n = 4; n <= 10; n++) {
    const c = await ev(() => __RPG.story.current(__RPG.UI.slot()));
    check('глава ' + n + ' текущая', c === n, 'current=' + c);
    const ok1 = await playChapterScenes();
    check('глава ' + n + ': сцены проиграны без зависаний', ok1);
    sl = await slot();
    const dun = await ev((k) => (__RPG.D.CHAPTERS[k].battle || {}).dun || '', n);
    if (dun) {
      check('глава ' + n + ': вылазка «' + dun + '» открыта после сцены-ворот', await ev((d) => __RPG.E.dungeonUnlocked(__RPG.UI.slot(), d), dun));
      await act('tab', '[data-t="dun"]'); await page.waitForTimeout(250);
      check('глава ' + n + ': подземелье в списке вылазок', await ev((d) => !!document.querySelector('[data-act="dunOpen"][data-id="' + d + '"]'), dun));
      if (n === 4) await shot('03-dun-stairs');
      check('глава ' + n + ': финальная сцена закрыта до боя', !(await ev((k) => __RPG.story.done(__RPG.UI.slot(), k), n)));
      // победа над боссом: тот же эффект, что finishBattle (бои отдельно покрыты node-тестами), затем автопросмотр сцены после боя
      await ev((d) => { const s = __RPG.UI.slot(); s.prog.cleared[d] = 1; __RPG.UI.save(true); }, dun);
      if (await ev((d) => !!__RPG.D.PRE_BOSS[d], dun)) {                           // сцена перед боссом (в игре идёт внутри вылазки)
        await ev((d) => { __RPG.UI._pre = __RPG.UI.playScene(__RPG.D.PRE_BOSS[d]); }, dun); await page.waitForSelector('#story', { timeout: 4000 }); const rp = await playStory(400); check('глава ' + n + ': сцена перед боссом проиграна', rp.done);
      }
      for (const en of await ev((k) => Object.keys(__RPG.D.CHAPTERS[k].duels || {}), n)) {   // дуэль после победы над врагом: выбор «пощадить / убить»
        await ev((e) => { __RPG.UI._duel = __RPG.UI.playScene(__RPG.D.DUEL_SCENE[e], true); }, en); await page.waitForSelector('#story', { timeout: 4000 }); const rd = await playStory(300); choicesTotal.n += rd.choices; check('глава ' + n + ': дуэль «' + en + '» проиграна', rd.done);
      }
      await ev(() => { __RPG.UI._auto = __RPG.UI.autoStory(); }); await page.waitForSelector('#story', { timeout: 4000 }).catch(() => {});
      const r2 = await playStory(900); choicesTotal.n += r2.choices; check('глава ' + n + ': сцена после боя проиграна', r2.done);
      await page.waitForTimeout(200);
    }
    check('глава ' + n + ' пройдена', await ev((k) => __RPG.story.done(__RPG.UI.slot(), k), n));
  }
  sl = await slot();
  check('сыграно 10 глав; текущая — 11', await ev(() => __RPG.story.current(__RPG.UI.slot())) === 11 && sl.story.flags.ch10_done === 1);
  check('в VN встречались новые фоны глав', [...bgsSeen].some((b) => ['stairs', 'gate_hall', 'gallery', 'mist_bell', 'cradle_door'].includes(b)), [...bgsSeen].join(','));
  check('выборы в главах сработали (≥1 пойман в цикле)', choicesTotal.n >= 1, String(choicesTotal.n));
  check('сохранены решения: флаги ключевых выборов', Object.keys(sl.story.flags).filter((k) => /^(knights_|form_|gallery_|bell_|promise_|held_|warden_|spared_oldrik|killed_oldrik)/.test(k)).length >= 5);
  check('романтика/лояльность изменились (Ильвара ≥ 20)', sl.rom && sl.rom.gen1 && sl.rom.gen1.aff >= 20, sl.rom && sl.rom.gen1 && String(sl.rom.gen1.aff));

  // Главная после арки 1: «Глава 11 ещё пишется»
  await act('tab', '[data-t="city"]'); await page.waitForTimeout(250);
  const cityTxt = await page.locator('.content').innerText();
  check('главная: «Глава 11» ещё пишется + кнопка к сюжету', cityTxt.includes('Глава 11') && cityTxt.includes('ещё пишется'));
  await shot('04-city-after-arc1');
  await act('tab', '[data-t="story"]'); await page.waitForTimeout(400);
  check('вкладка «Сюжет»: пройдено 10 из 300; арка 1 «пройдена»', (await page.locator('.content').innerText()).includes('Пройдено глав: 10 из 300') && (await page.locator('.arcbox').first().innerText()).includes('пройдена'));
  await act('storyCur'); await page.waitForTimeout(300);
  check('«К текущей» раскрывает арку 2, глава 11 «скоро»', await page.locator('.chrow.soon').count() >= 1);
  await shot('05-tab-arc2-current');
  // перечитывание главы
  await ev(() => document.querySelectorAll('.arcrow')[0].click()); await page.waitForTimeout(200);
  await act('replayCh', '[data-n="5"]'); await page.waitForSelector('#story', { timeout: 4000 });
  const rr = await playStory(900); check('перечитывание главы 5 работает', rr.done);
  sl = await slot(); check('перечитывание не меняет прогресс', await ev(() => __RPG.story.doneCount(__RPG.UI.slot())) === 10);

  // Сохранение: перезагрузка страницы, профиль и слот на месте
  await ev(() => __RPG.UI.save(true)); await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(900);
  await ev(() => { const el = document.querySelector('[data-act="pickProfile"]'); if (el) el.click(); }); await page.waitForTimeout(400);
  await ev(() => { const el = document.querySelector('[data-act="playSlot"]'); if (el) el.click(); }); await page.waitForTimeout(1200);
  check('после перезагрузки прогресс сюжета сохранён (10 глав)', await ev(() => __RPG.UI.slot() && __RPG.story.doneCount(__RPG.UI.slot())) === 10);

  const bg = await ev(() => { const el = document.createElement('div'); el.className = 'vbg bg-gate_hall'; document.body.appendChild(el); const b = getComputedStyle(el).backgroundImage; el.remove(); return b; });
  check('CSS-фон новых глав подключён (gradient)', /gradient/.test(bg), bg.slice(0, 40));
  const bad404 = failed.filter((u) => !/favicon/.test(u));
  check('нет 404/ошибок сети', bad404.length === 0, bad404.join(' | '));
  check('нет ошибок консоли', errors.length === 0, errors.slice(0, 3).join(' | '));
  check('нет внешних запросов', reqs.every((u) => u.startsWith(url) || u.startsWith('data:') || u.startsWith('blob:')));

  console.log(`\nE2E-story: ${ok} ✓  ${bad ? bad + ' ✗' : ''}`);
  await browser.close(); if (srv) srv.close(); process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
