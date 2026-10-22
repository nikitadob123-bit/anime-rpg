/* E2E + снимки v2.26 «Испытания»: Башня, Арена, Зал, эффекты боя, громкость эффектов. node tools/ig3-shots.js [url] → /workspace/shots-ig3/ */
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { serve } = require('./serve.js');
const outDir = process.env.SHOTS || '/workspace/shots-ig3'; fs.mkdirSync(outDir, { recursive: true });
let ok = 0, bad = 0; const check = (n, c, x) => { if (c) { ok++; console.log('  ✓', n, x || ''); } else { bad++; console.log('  ✗', n, x || ''); } };
(async () => {
  let srv = null, url = process.argv[2];
  if (!url) { srv = await serve(0); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
  const exe = process.env.CHROME_PATH || ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find((p) => fs.existsSync(p));
  const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 444, height: 986 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, locale: 'ru-RU', timezoneId: 'Europe/Minsk' });
  const page = await ctx.newPage(); const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|ERR_/.test(m.text())) errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  const shot = async (n) => { const raw = path.join(outDir, '.raw-' + n + '.png'), out = path.join(outDir, 'ig3-' + n + '.jpg'); await page.screenshot({ path: raw });
    execFileSync('python3', ['-c', `from PIL import Image\nim=Image.open(${JSON.stringify(raw)}).convert('RGB')\nim.save(${JSON.stringify(out)},quality=82)`]); fs.unlinkSync(raw); console.log('  📷', out, Math.round(fs.statSync(out).size / 1024) + ' КБ'); };
  const ev = (f, a) => page.evaluate(f, a);
  await page.route(/\/mail\/inbox\.json/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ letters: [] }) }));
  await page.goto(url, { waitUntil: 'load' }); await page.waitForTimeout(1200);
  await ev(() => {
    const { S, E, story: ST } = __RPG;
    const p = S.newProfile('Рыбак', '🎣'); const s = E.newSlot({ name: 'Кайрон', race: 'o_street', uniq: 'shadowdance', prof1: 'fish', prof2: 'smith', now: Date.now() }); s.hero.profLocked = true; s.tut = { guide: 1, bt: 1 };
    p.slots[0] = s; ['prologue'].concat(ST.sceneIds(1)).forEach((id) => E.finishScene(s, id)); s.story.flags.prologue_done = 1; s.hero.level = 45; s.gold = 300000;
    E.addMat(s, 'ing_cu', 20); E.addMat(s, 'leather', 20); s.tower.best = 35; s.ach.claimed = ['kills_1', 'wins_1']; s.afk.t = Date.now();
    S.save(p); __RPG.UI.p = p; p.active = 0; __RPG.UI.enterGame();
  });
  await page.waitForTimeout(1500); await ev(() => __RPG.UI.closeModal());
  await ev(() => { __RPG.UI.tab = 'city'; __RPG.UI.refresh(); }); await page.waitForTimeout(400);
  check('Лагерь: карточка «Жизнь в Лагере» (4 кнопки + событие)', await page.locator('.lifecard .chb').count() === 4 && await page.locator('.evbanner').count() === 1);
  check('день/ночь: класс фазы на хабе', await page.locator('.hub[class*="ph-"]').count() === 1);
  await shot('0-hub'); await ev(() => document.querySelector('.lifecard').scrollIntoView({ block: 'center' })); await page.waitForTimeout(300); await shot('1-life');
  await page.locator('[data-act="eventOpen"]').click(); await page.waitForTimeout(300); check('события недели (4)', await page.locator('.mbox .card').count() === 4); await shot('2-events'); await ev(() => __RPG.UI.closeModal());
  await page.locator('[data-act="fishOpen"]').click(); await page.waitForTimeout(300); check('рыбалка: Рыбак — основная', /основная/.test(await page.locator('.ptier').innerText()));
  let caught = 0;
  for (let i = 0; i < 6; i++) { await page.locator('#fishBtn').click(); await page.waitForTimeout(150);
    // ждём попадания поплавка в зону
    for (let k = 0; k < 80; k++) { const inz = await ev(() => { const z = document.querySelector('.fz').getBoundingClientRect(), n = document.querySelector('.fn').getBoundingClientRect(), c = n.left + n.width / 2; return c > z.left + z.width * 0.3 && c < z.right - z.width * 0.3; }); if (inz) break; await page.waitForTimeout(16); }
    if (i === 0) await shot('3-fish-bar');
    await page.locator('#fishBtn').click(); await page.waitForTimeout(250); if (/Улов|улов/.test(await page.locator('#fishRes').innerText())) caught++; }
  check('рыбалка: поймано ≥4 из 6', caught >= 4, caught); await shot('4-fish-result');
  const fx = await ev(() => { const s = __RPG.UI.slot(); return s.life.fish.total; }); check('улов записан', fx > 0, fx);
  await page.locator('[data-act="fishClose"]').click(); await page.waitForTimeout(200);
  await page.locator('[data-act="farmOpen"]').click(); await page.waitForTimeout(300);
  check('ферма: редкие травы закрыты без Травника', await page.locator('[data-act="farmPlant"][data-c="herb_r"]:disabled').count() >= 2);
  await page.locator('[data-act="farmPlant"][data-i="0"][data-c="herb_g"]').click(); await page.waitForTimeout(300);
  await ev(() => { const s = __RPG.UI.slot(); s.life.plots[0].end = Date.now() - 1; }); await ev(() => __RPG.UI.act.farmOpen()); await page.waitForTimeout(200); await shot('5-farm');
  await page.locator('[data-act="farmHarvest"]').click(); await page.waitForTimeout(300); check('урожай собран', await ev(() => (__RPG.UI.slot().mats.herb_g | 0) > 0)); await ev(() => __RPG.UI.closeModal());
  await page.locator('[data-act="houseOpen"]').click(); await page.waitForTimeout(300); check('дом: скидка Кузнецу', /мастеру/.test(await page.locator('.mbox').innerText()));
  await page.locator('[data-act="houseUp"][data-id="garden"]').click(); await page.waitForTimeout(300); check('Сад улучшен → 3 грядки', await ev(() => __RPG.UI.slot().life.plots.length === 3)); await shot('6-house'); await ev(() => __RPG.UI.closeModal());
  await page.locator('[data-act="mkOpen"]').click(); await page.waitForTimeout(300); check('торговец: 6 товаров', await page.locator('.mkrow [data-act="mkBuy"]').count() === 6);
  const g0 = await ev(() => __RPG.UI.slot().gold); await page.locator('[data-act="mkBuy"]').first().click(); await page.waitForTimeout(300); check('покупка у торговца', await ev(() => __RPG.UI.slot().gold) < g0); await shot('7-merchant'); await ev(() => __RPG.UI.closeModal());
  await ev(() => { __RPG.UI.tab = 'hero'; __RPG.UI.refresh(); }); await page.waitForTimeout(400); check('герой: титул', await page.locator('.htitle').count() === 1);
  await page.locator('[data-act="cosOpen"]').click(); await page.waitForTimeout(300); await page.locator('[data-act="cosTitle"][data-id="slayer"]').click(); await page.waitForTimeout(200);
  await page.locator('[data-act="cosFrame"][data-id="void"]').click(); await page.waitForTimeout(200); await shot('8-cosmetics'); await ev(() => __RPG.UI.closeModal()); await page.waitForTimeout(300);
  check('титул выбран', /Гроза чудовищ/.test(await page.locator('.htitle').innerText())); check('рамка «Пустота»', /9b6bff/i.test(await ev(() => document.querySelector('.herocard').getAttribute('style') || '')));
  await shot('9-hero');
  check('нет ошибок консоли', errors.length === 0, errors.slice(0, 3).join(' | '));
  console.log(`\n${ok} ✓, ${bad} ✗`); await browser.close(); if (srv) srv.close(); process.exit(bad ? 1 : 0);
})();
