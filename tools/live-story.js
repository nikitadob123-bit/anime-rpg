/* Проверка вкладки «Сюжет» на опубликованной версии (мобильная эмуляция 400×880): список 30 арок, ленивая подгрузка арок 2–30
   (в т. ч. офлайн из кэша SW) и сцена VN. Скриншоты — в /workspace/shots/ (или SHOTS=папка). node tools/live-story.js [url] */
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path');
const url = process.argv[2] || 'https://nikitadob123-bit.github.io/anime-rpg/';
const out = process.env.SHOTS || '/workspace/shots'; fs.mkdirSync(out, { recursive: true });
let ok = 0, bad = 0; const check = (n, c, x) => { c ? ok++ : bad++; console.log(c ? '  ✓' : '  ✗', n, x || ''); };
(async () => {
  const exe = process.env.CHROME_PATH || ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find((p) => fs.existsSync(p));
  const b = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 400, height: 880 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ru-RU', timezoneId: 'Europe/Minsk' });
  const page = await ctx.newPage(); const errs = [], bad404 = [];
  page.on('console', (m) => m.type() === 'error' && errs.push(m.text())); page.on('pageerror', (e) => errs.push(e.message)); page.on('response', (r) => { if (r.status() >= 400) bad404.push(r.status() + ' ' + r.url()); });
  const ev = (f, a) => page.evaluate(f, a);
  const navSel = async (sel) => { const m = /data-t="(\w+)"/.exec(sel); if (!m) return sel; const l = page.locator(sel).first(); if (await l.count() && /\bnavx\b/.test((await l.getAttribute('class')) || '')) { await page.locator('#nav [data-act="navMore"]').click(); await page.waitForTimeout(300); return `#modal [data-act="tab"][data-t="${m[1]}"]`; } return sel; };   // v2.7.0: редкие вкладки — в меню «Ещё»
  const click = async (sel) => { sel = await navSel(sel); const l = page.locator(sel).first(); await l.waitFor({ state: 'visible', timeout: 8000 }); await l.click(); await page.waitForTimeout(80); };
  const act = (a, x) => click(`[data-act="${a}"]${x || ''}`);
  await page.goto(url, { waitUntil: 'load' }); await page.evaluate(() => navigator.serviceWorker.ready); await page.waitForTimeout(3500);
  const sw = await ev(async () => { const ks = await caches.keys(); const c = await caches.open(ks.find((k) => k.endsWith('core'))); return { v: ks.find((k) => k.endsWith('core')), arcs: (await c.keys()).filter((r) => /story\/arc\d+\.js/.test(r.url)).length }; });
  check('SW: кэш ядра содержит все 30 арок', sw.arcs === 30, JSON.stringify(sw));
  // профиль и герой
  await act('newProfile'); await page.fill('#npNick', 'Проверка'); await act('npAv', '[data-i="3"]'); await act('npCreate');
  await act('newHero', '[data-i="0"]'); await page.fill('#crName', 'Арата'); await act('crNext');
  await act('crRaceSet', '[data-id="o_street"]'); await act('crNext'); await act('crUniq', '[data-id="shadowdance"]'); await act('crNext'); await act('crNext');
  await act('crProf', '[data-id="smith"]'); await act('crProf', '[data-id="miner"]'); await act('crNext'); await act('crFinish');
  await click('#cfOk'); await page.waitForSelector('#story', { timeout: 8000 });
  for (let g = 0; g < 400 && await page.locator('#story').count(); g++) { const sk = page.locator('#sSkip'); if (await sk.count()) await sk.click().catch(() => {}); if (await page.locator('.schoice.on .choice').count()) await page.locator('.schoice.on .choice').first().click().catch(() => {}); await page.waitForTimeout(80); await page.locator('#dlg').click({ force: true, timeout: 500 }).catch(() => {}); }
  await page.waitForTimeout(300); if (await page.locator('#modal.on').count()) await ev(() => __RPG.UI.closeModal());
  await ev(() => { const { UI, story: ST, E } = __RPG; const s = UI.slot(); s.story.flags.prologue_done = 1; [].concat(ST.sceneIds(1), ST.sceneIds(2), ST.sceneIds(3), ST.auxIds(3)).forEach((id) => E.finishScene(s, id)); ['mill', 'cathedral', 'spire'].forEach((d) => { s.prog.cleared[d] = 1; }); s.hero.level = 28; UI.save(true); UI.refresh(); });
  // вкладка «Сюжет»
  await act('tab', '[data-t="story"]'); await page.waitForTimeout(600);
  check('вкладка «Сюжет»: 30 арок в списке', await page.locator('.arcbox').count() === 30);
  check('прогресс «Пройдено глав: 3 из 300»', (await page.locator('.content').innerText()).includes('Пройдено глав: 3 из 300'));
  const noOv = await ev(() => document.documentElement.scrollWidth <= window.innerWidth + 1); check('нет горизонтального переполнения (400 px)', noOv);
  await ev(() => document.querySelectorAll('.arcrow')[0].click()); await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(out, 'story-tab-arcs.jpg'), type: 'jpeg', quality: 78, scale: 'css' });
  await ev(() => document.querySelector('.arcbox').scrollIntoView());
  // все арки подгружаются и ставят главы
  const r = await ev(async () => { const ST = __RPG.story; await ST.loadOutline(); const res = []; for (let k = 1; k <= 30; k++) { const ok = await ST.loadArc(k); res.push(ok ? 1 : 0); } return { res, ready: __RPG.D.OUTLINE.arcs.filter((a) => a.ready === 10).length, chapters: Object.keys(__RPG.D.CHAPTERS).filter((n) => __RPG.D.CHAPTERS[n]._ok).length }; });
  check('все 30 арок загружаются (300 глав установлены)', r.res.every((x) => x === 1) && r.chapters === 300 && r.ready === 30, JSON.stringify({ chapters: r.chapters, ready: r.ready }));
  // арка 2 раскрывается; глава 11 закрыта до прохождения предыдущих
  await ev(() => document.querySelectorAll('.arcrow')[1].click()); await page.waitForTimeout(250);
  check('арка 2: 10 глав, без «скоро»', await page.locator('.chrow').count() === 10 && await page.locator('.chrow.soon').count() === 0);
  // офлайн: перезагрузка, арка 30 из кэша
  await ev(() => __RPG.UI.save(true)); await ctx.setOffline(true); await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(1200);
  await ev(() => { const el = document.querySelector('[data-act="pickProfile"]'); if (el) el.click(); }); await page.waitForTimeout(300);
  await ev(() => { const el = document.querySelector('[data-act="playSlot"]'); if (el) el.click(); }); await page.waitForTimeout(1200);
  const off = await ev(async () => { const ST = __RPG.story; try { await ST.loadOutline(); } catch (e) { /* ignore */ } const a = await ST.loadArc(30), b = await ST.loadArc(17); return { a, b, ch300: !!(__RPG.D.CHAPTERS[300] && __RPG.D.CHAPTERS[300]._ok), ch170: !!(__RPG.D.CHAPTERS[170] && __RPG.D.CHAPTERS[170]._ok) }; });
  check('офлайн: арки 17 и 30 загружаются из кэша SW', off.a && off.b && off.ch300 && off.ch170, JSON.stringify(off));
  await ctx.setOffline(false);
  // сцена VN: глава 4, три актёра
  await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(1200);
  await ev(() => { const el = document.querySelector('[data-act="pickProfile"]'); if (el) el.click(); }); await page.waitForTimeout(300);
  await ev(() => { const el = document.querySelector('[data-act="playSlot"]'); if (el) el.click(); }); await page.waitForTimeout(1200);
  await ev(() => { const L = [['bg', 'camp'], ['i', 'Государь, мы у цели.', 'n'], ['m', 'Скучно! Но красиво.', 'h'], ['h', 'Тише. Слушайте.', 'n'], ['x', 'Вероятность успеха — восемьдесят процентов.', 'n'], ['i', 'Тогда идём.', 'n']]; __RPG.UI.vnTest = __RPG.UI.playLines(L, { bg: 'camp', replay: true }); });
  await page.waitForSelector('#story', { timeout: 6000 });
  for (let i = 0; i < 4; i++) { await page.locator('#dlg').click({ force: true, timeout: 800 }).catch(() => {}); await page.waitForTimeout(700); }
  await page.waitForTimeout(900);
  const actors = await page.locator('.vact').count(); check('VN: 3 актёра в кадре', actors === 3, String(actors));
  await page.screenshot({ path: path.join(out, 'story-vn-scene.jpg'), type: 'jpeg', quality: 80, scale: 'css' });
  check('нет ошибок консоли', errs.length === 0, errs.slice(0, 3).join(' | ')); check('нет 404', bad404.length === 0, bad404.slice(0, 3).join(' | '));
  console.log(`\nlive-story: ${ok} ✓, ${bad} ✗`); await b.close(); process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
