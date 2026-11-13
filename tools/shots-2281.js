/* Снимки шапки v2.28.1. node tools/shots-2281.js [url] → /workspace/shots-2281/ */
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { serve } = require('./serve.js');
const outDir = process.env.SHOTS || '/workspace/shots-2281'; fs.mkdirSync(outDir, { recursive: true });
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
    await page.screenshot({ path: raw, clip }); execFileSync('python3', ['-c', `from PIL import Image\nim=Image.open(${JSON.stringify(raw)}).convert('RGB')\nim.save(${JSON.stringify(out)},quality=86)`]); fs.unlinkSync(raw); console.log('  📷', out); };
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
  await page.waitForTimeout(500);
  const info = await page.evaluate(() => {
    const b = document.querySelector('.sovereign-avatar'); const img = b && b.querySelector('.por, .svgpor, img'); const crown = b && b.querySelector('span');
    const br = b.getBoundingClientRect(), ir = img.getBoundingClientRect(), cs = getComputedStyle(img);
    return { hasBtn: !!b, hasCrownEl: !!(crown && getComputedStyle(crown).display !== 'none'),
      btn: { w: Math.round(br.width), h: Math.round(br.height), r: getComputedStyle(b).borderRadius },
      img: { w: Math.round(ir.width), h: Math.round(ir.height), l: Math.round(ir.left - br.left), t: Math.round(ir.top - br.top), r: cs.borderRadius, fit: cs.objectFit, pos: cs.objectPosition } };
  });
  check('кнопка-аватар есть', info.hasBtn);
  check('корона убрана', !info.hasCrownEl);
  const bord = Math.max(0, Math.round((info.btn.w - info.img.w) / 2));
  check('портрет заполняет квадрат (с учётом рамки 1px)', info.img.w === info.btn.w - 2 * bord && info.img.h === info.btn.h - 2 * bord && bord <= 2, JSON.stringify(info));
  check('портрет без смещения', info.img.l === bord && info.img.t === bord);
  check('не кружок', !/50%/.test(info.img.r) && !/999/.test(info.img.r), info.img.r);
  check('object-fit: cover', info.img.fit === 'cover', info.img.fit);
  await shot('header', { x: 0, y: 0, width: 444, height: 160 });
  await shot('header-camp', { x: 0, y: 0, width: 444, height: 986 });
  await page.evaluate(() => { __RPG.UI.act.tab({ dataset: { t: 'dun' } }); }); await page.waitForTimeout(600);
  await shot('dungeons', { x: 0, y: 0, width: 444, height: 986 });
  check('нет ошибок консоли', errors.length === 0, errors.slice(0, 3).join(' | '));
  console.log(`\n${ok} ✓, ${bad} ✗`); await browser.close(); if (srv) srv.close(); process.exit(bad ? 1 : 0);
})();
