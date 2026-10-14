/* v2.18: раскладка конструктора ремесла на телефонах (444×986, 360×780): кнопки прижаты к низу, шапка не перекрывает текст, на всех вкладках.
   node tools/cfm-shots.js [baseUrl] [prefix] → $SHOTS (по умолчанию /workspace/shots-v218) */
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { serve } = require('./serve.js');
const outDir = process.env.SHOTS || '/workspace/shots-v218'; fs.mkdirSync(outDir, { recursive: true });
let ok = 0, bad = 0; const check = (n, c, x) => { if (c) ok++; else { bad++; console.log('  ✗', n, x || ''); } };
(async () => {
  let srv = null, url = process.argv[2]; const PFX = process.argv[3] || 'craft';
  if (!url || url === '-') { srv = await serve(0); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
  const exe = ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find((p) => fs.existsSync(p));
  const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
  for (const [W, H] of [[444, 986], [360, 780]]) {
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, locale: 'ru-RU' });
    const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
    await page.route(/\/mail\/inbox\.json/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"letters":[]}' }));
    await page.goto(url + '?nosw=' + Date.now(), { waitUntil: 'load' }); await page.waitForTimeout(1000);
    await page.evaluate(() => { const { UI, S, E, story: ST } = __RPG; const p = S.newProfile('Творец', '🛠️'); const s = E.newSlot({ name: 'Кайрон', race: 'o_street', uniq: 'shadowdance', prof1: 'smith', prof2: 'ench', now: Date.now() }); s.hero.profLocked = true; s.tut = { guide: 1, bt: 1 };
      p.slots[0] = s; ['prologue'].concat(ST.sceneIds(1), ST.sceneIds(2), ST.sceneIds(3), ST.auxIds(3)).forEach((id) => E.finishScene(s, id)); s.story.flags.prologue_done = 1; s.hero.level = 70; s.gold = 200000; s.profs.smith.lv = 14; s.profs.ench.lv = 8; Object.assign(s.mats, { gem_fr: 3, ore_fe: 3 }); S.save(p); UI.p = p; p.active = 0; UI.enterGame(); });
    await page.waitForTimeout(1200); await page.evaluate(() => { __RPG.UI.closeModal(); __RPG.UI.tab = 'prof'; __RPG.UI.refresh(); });
    await page.waitForTimeout(300); await page.locator('[data-act="cfOpen"]').first().click(); await page.waitForTimeout(200);
    for (let i = 0; i < 3; i++) { await page.locator('.cmt:not([disabled])').first().click(); await page.waitForTimeout(100); }
    await page.locator('[data-act="cfNext"]').click(); await page.waitForTimeout(300);
    for (const k of ['base', 'stats', 'fx', 'sk', 'ic']) {
      await page.locator(`[data-act="cfTab"][data-k="${k}"]`).click(); await page.waitForTimeout(250);
      await page.evaluate(() => { const sc = document.querySelector('.cfscroll') || document.querySelector('.mbox'); sc.scrollTop = 220; }); await page.waitForTimeout(150);
      const g = await page.evaluate(() => { const box = document.querySelector('.mbox').getBoundingClientRect(), go = document.querySelector('.cfgo').getBoundingClientRect(), hd = (document.querySelector('.cfhead') || document.querySelector('.cfprev')).getBoundingClientRect();
        const sc = document.querySelector('.cfscroll'); const hit = (x, y) => { const e = document.elementFromPoint(x, y); return e ? (e.closest('.cfgo') ? 'go' : e.closest('.cfhead,.cfprev') ? 'head' : 'body') : 'none'; };
        // текст тела не должен быть виден под кнопками/шапкой: видимая область прокрутки заканчивается у кнопок и начинается под шапкой
        const sr = sc ? sc.getBoundingClientRect() : null;
        return { goBottom: Math.round(box.bottom - go.bottom), overlapGo: sr ? Math.round(sr.bottom - go.top) : 999, overlapHead: sr ? Math.round(hd.bottom - sr.top) : 999, mid: hit(box.left + box.width / 2, box.top + box.height * 0.6) }; });
      check(`${W}×${H} ${k}: кнопки у низа листа`, g.goBottom <= 2, JSON.stringify(g)); check(`${W}×${H} ${k}: тело не заходит под кнопки`, g.overlapGo <= 1, JSON.stringify(g));
      check(`${W}×${H} ${k}: шапка не перекрывает тело`, g.overlapHead <= 1, JSON.stringify(g)); check(`${W}×${H} ${k}: середина листа — контент`, g.mid === 'body', JSON.stringify(g));
      if (W === 444 && (k === 'base' || k === 'stats') || W === 360 && k === 'stats') { const raw = path.join(outDir, '.r.png'), out = path.join(outDir, `${PFX}-${W}-${k}.jpg`); await page.screenshot({ path: raw }); execFileSync('python3', ['-c', `from PIL import Image\nImage.open('${raw}').convert('RGB').save('${out}',quality=82)`]); fs.unlinkSync(raw); console.log('  📷', out); }
    }
    check(`${W}: без ошибок`, !errors.length, errors.join('|')); await ctx.close();
  }
  console.log(`Конструктор: ${ok} ✓, ${bad} ✗`); await browser.close(); if (srv) srv.close(); process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
