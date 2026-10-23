/* E2E + снимки v2.26 «Испытания»: Башня, Арена, Зал, эффекты боя, громкость эффектов. node tools/fx-shots.js [url] → /workspace/shots-fix1/ */
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { serve } = require('./serve.js');
const outDir = process.env.SHOTS || '/workspace/shots-fix1'; fs.mkdirSync(outDir, { recursive: true });
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
  const shot = async (n) => { const raw = path.join(outDir, '.raw-' + n + '.png'), out = path.join(outDir, 'fx-' + n + '.jpg'); await page.screenshot({ path: raw });
    execFileSync('python3', ['-c', `from PIL import Image\nim=Image.open(${JSON.stringify(raw)}).convert('RGB')\nim.save(${JSON.stringify(out)},quality=82)`]); fs.unlinkSync(raw); console.log('  📷', out, Math.round(fs.statSync(out).size / 1024) + ' КБ'); };
  const ev = (f, a) => page.evaluate(f, a);
  await page.route(/\/mail\/inbox\.json/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ letters: [] }) }));
  await page.goto(url, { waitUntil: 'load' }); await page.waitForTimeout(1200);
  await ev((fr) => {
    const { S, E, story: ST } = __RPG;
    const p = S.newProfile('Арата', '🎣'); const s = E.newSlot({ name: 'Арата', race: 'o_street', uniq: 'shadowdance', prof1: 'fish', prof2: 'smith', now: Date.now() }); s.hero.profLocked = true; s.tut = { guide: 1, bt: 1 };
    p.slots[0] = s; ['prologue'].concat(ST.sceneIds(1)).forEach((id) => E.finishScene(s, id)); s.story.flags.prologue_done = 1; s.hero.level = 12; s.gold = 300000;
    E.petGain(s, 'divine_dragon'); s.tower.best = 35; s.arena.best = 1800; s.ach.claimed = Array.from({ length: 30 }, (_, i) => 'x' + i).concat(['kills_1', 'wins_1']); s.life.fish.total = 60; s.afk.t = Date.now() - 5 * 3600e3; E.setFrame(s, fr); E.setTitle(s, 'slayer'); E.addMat(s, 'fish_gold', 3);
    S.save(p); __RPG.UI.p = p; p.active = 0; __RPG.UI.enterGame();
  }, process.env.FRAME || 'dragon');
  await page.waitForTimeout(1500); await ev(() => { __RPG.UI.closeModal(); document.querySelectorAll('.toast').forEach((t) => t.remove()); });
  const tab = async (t) => { await ev((t) => { __RPG.UI.tab = t; __RPG.UI.refresh(); }, t); await page.waitForTimeout(400); await ev(() => document.querySelectorAll('.toast').forEach((t) => t.remove())); };
  const sel = (q) => ev((q) => { const e = document.querySelector(q); if (e) e.scrollIntoView({ block: 'start' }); return !!e; }, q);
  await tab('hero'); await sel('.herocard'); await shot('hero'); await sel('.stcard'); await shot('hero-stats');
  if (!process.env.ONLYHERO) {
    for (const k of ['gear', 'pets', 'bonus']) { await ev((k) => { const b = document.querySelector(`.hsecs [data-k="${k}"]`); if (b) b.click(); }, k); await page.waitForTimeout(300); await shot('hero-' + k); }
    await tab('city'); await sel('.dailycard'); await shot('city-daily'); await sel('.chcard'); await shot('city-ch'); await sel('.lifecard'); await shot('city-life');
    for (const a of ['achOpen', 'towerOpen', 'arenaOpen', 'trainOpen', 'eventOpen', 'fishOpen', 'farmOpen', 'houseOpen', 'mkOpen']) { await ev((a) => __RPG.UI.act[a](document.body), a); await page.waitForTimeout(350); await shot('m-' + a); await ev(() => __RPG.UI.closeModal()); }
    await tab('hero'); await ev(() => __RPG.UI.act.cosOpen()); await page.waitForTimeout(300); await shot('m-cos');
  }
  console.log('errors', errors); await browser.close(); if (srv) srv.close();
})();
