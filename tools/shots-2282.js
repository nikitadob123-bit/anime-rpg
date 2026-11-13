/* Снимки артов подземелий v2.28.2. node tools/shots-2282.js [url] → /workspace/shots-2282/ */
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { serve } = require('./serve.js');
const outDir = process.env.SHOTS || '/workspace/shots-2282'; fs.mkdirSync(outDir, { recursive: true });
let ok = 0, bad = 0; const check = (n, c, x) => { if (c) { ok++; console.log('  ✓', n, x || ''); } else { bad++; console.log('  ✗', n, x || ''); } };
(async () => {
  let srv = null, url = process.argv[2];
  if (!url) { srv = await serve(0); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
  const exe = process.env.CHROME_PATH || ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find((p) => fs.existsSync(p));
  const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 444, height: 986 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ru-RU', timezoneId: 'Europe/Berlin' });
  const page = await ctx.newPage(); const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|ERR_/.test(m.text())) errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  const shot = async (n, clip) => { const raw = path.join(outDir, '.raw-' + n + '.png'), out = path.join(outDir, n + '.jpg');
    await page.screenshot({ path: raw, ...(clip ? { clip } : {}) }); execFileSync('python3', ['-c', `from PIL import Image\nim=Image.open(${JSON.stringify(raw)}).convert('RGB')\nim.save(${JSON.stringify(out)},quality=86)`]); fs.unlinkSync(raw); console.log('  📷', out); };
  await page.route(/\/mail\/inbox\.json/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ letters: [] }) }));
  await page.goto(url, { waitUntil: 'load' }); await page.waitForTimeout(1200);
  await page.evaluate(() => {
    const { S, E, story: ST } = __RPG;
    const p = S.newProfile('Арата', '👑'); const s = E.newSlot({ name: 'Арата', race: 'o_street', uniq: 'shadowdance', prof1: 'fish', prof2: 'smith', now: Date.now() });
    s.hero.profLocked = true; s.tut = { guide: 1, bt: 1 }; p.slots[0] = s;
    ['prologue'].concat(ST.sceneIds(1)).forEach((id) => E.finishScene(s, id)); s.story.flags.prologue_done = 1; s.hero.level = 40; s.gold = 18801;
    S.save(p); __RPG.UI.p = p; p.active = 0; __RPG.UI.enterGame();
  });
  await page.waitForTimeout(1500);
  await page.evaluate(() => { __RPG.UI.closeModal(); document.querySelectorAll('.toast').forEach((t) => t.remove()); __RPG.UI.tab = 'city'; __RPG.UI.refresh(); });
  await page.waitForTimeout(600);
  const city = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('.chcard .chb .chicon img')].map((im) => ({ src: im.getAttribute('src'), w: im.naturalWidth, h: im.clientWidth, ok: im.complete && im.naturalWidth > 0 }));
    return { n: btns.length, btns, have: (__RPG.D.DUN_ART_HAVE || []).slice() };
  });
  check('3 кнопки испытаний с артом', city.n === 3 && city.btns.every((b) => b.ok), JSON.stringify(city));
  await page.evaluate(() => document.querySelector('.chcard') && document.querySelector('.chcard').scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(300);
  await shot('camp-challenges');
  await page.evaluate(() => { __RPG.UI.act.tab({ dataset: { t: 'dun' } }); });
  await page.waitForTimeout(800);
  const dun = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('.dcard.artdun, .dcard.spdun')].map((el) => {
      const img = el.querySelector('.dic img'); const r = el.getBoundingClientRect();
      return { cls: el.className, has: !!(img && img.complete && img.naturalWidth > 0), src: img && img.getAttribute('src'), iw: img && img.naturalWidth, box: img && Math.round(img.getBoundingClientRect().width) };
    });
    return cards;
  });
  check('3 особых подземелья с артом', dun.length === 3 && dun.every((d) => d.has && d.iw >= 256), JSON.stringify(dun));
  await shot('expeditions');
  await page.evaluate(() => { const el = document.querySelector('.dcard.artdun'); if (el) el.scrollIntoView({ block: 'start' }); });
  await page.waitForTimeout(200);
  await shot('special-cards', { x: 0, y: 70, width: 444, height: 520 });
  check('нет ошибок консоли', errors.length === 0, errors.slice(0, 3).join(' | '));
  console.log(`\n${ok} ✓, ${bad} ✗`); await browser.close(); if (srv) srv.close(); process.exit(bad ? 1 : 0);
})();
