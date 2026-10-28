/* E2E + снимки v2.26 «Испытания»: Башня, Арена, Зал, эффекты боя, громкость эффектов. node tools/fx-shots.js [url] → /workspace/shots-fix1/ */
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { serve } = require('./serve.js');
const outDir = process.env.SHOTS || '/workspace/shots-ui28/' + (process.env.PH || 'after'); fs.mkdirSync(outDir, { recursive: true });
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
  const shot = async (n) => { const raw = path.join(outDir, '.raw-' + n + '.png'), out = path.join(outDir, '' + n + '.jpg'); await page.screenshot({ path: raw });
    execFileSync('python3', ['-c', `from PIL import Image\nim=Image.open(${JSON.stringify(raw)}).convert('RGB')\nim.save(${JSON.stringify(out)},quality=82)`]); fs.unlinkSync(raw); console.log('  📷', out, Math.round(fs.statSync(out).size / 1024) + ' КБ'); };
  const ev = (f, a) => page.evaluate(f, a);
  await page.route(/\/mail\/inbox\.json/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ letters: [] }) }));
  await page.goto(url, { waitUntil: 'load' }); await page.waitForTimeout(1200);
  await ev(() => {
    const { S, E, story: ST } = __RPG;
    const p = S.newProfile('Арата', '👑'); const s = E.newSlot({ name: 'Арата', race: 'o_street', uniq: 'shadowdance', prof1: 'fish', prof2: 'smith', now: Date.now() }); s.hero.profLocked = true; s.tut = { guide: 1, bt: 1 };
    p.slots[0] = s; ['prologue'].concat(ST.sceneIds(1)).forEach((id) => E.finishScene(s, id)); s.story.flags.prologue_done = 1; s.hero.level = 40; s.gold = 300000;
    ['mill', 'wood'].forEach((d) => { s.prog.cleared[d] = 1; s.prog.boss[d] = true; });
    const rng = E.rng(5); [['sword', 7], ['head_h', 5], ['body_h', 8], ['boots_h', 3]].forEach(([b, r]) => { const it = E.genItem(rng, { base: b, il: 40, rarity: r }); E.addItem(s, it); E.equip(s, it.id); });
    ['stray_cat', 'ember_dragon', 'divine_dragon', 'preexist_dragon_void'].forEach((id) => E.petGain(s, id)); ['supernova_heart', 'lantern'].forEach((id) => E.artGain(s, id)); s.artEq = 'supernova_heart'; ['gen1', 'gen6'].forEach((id) => E.recruit(s, id));
    s.afk.t = Date.now() - 5 * 3600e3; E.setFrame && E.setFrame(s, 'gold');
    S.save(p); __RPG.UI.p = p; p.active = 0; __RPG.UI.enterGame();
  });
  await page.waitForTimeout(1500); await ev(() => { __RPG.UI.closeModal(); });
  const clr = () => ev(() => document.querySelectorAll('.toast').forEach((t) => t.remove()));
  const tab = async (t) => { await ev((t) => { __RPG.UI.act.tab({ dataset: { t } }); }, t); await page.waitForTimeout(700); await clr(); };
  for (const t of ['city', 'story', 'dun', 'hero', 'skills', 'crew', 'hearts', 'prof', 'inv', 'set']) { await tab(t); await shot('tab-' + t); }
  await tab('city'); await ev(() => { const c = document.querySelector('.content'); c.scrollTop = 600; }); await page.waitForTimeout(300); await shot('tab-city-2');
  await tab('hero'); await ev(() => { const b = document.querySelector('.hsecs [data-k="pets"]'); b && b.click(); }); await page.waitForTimeout(300); await shot('hero-pets');
  for (const a of ['towerOpen', 'achOpen', 'mkOpen']) { await ev((a) => __RPG.UI.act[a](document.body), a); await page.waitForTimeout(500); await clr(); await shot('m-' + a); await ev(() => __RPG.UI.closeModal()); }
  await tab('city'); await ev(() => __RPG.UI.act.arenaOpen()); await page.waitForTimeout(300); await ev(() => document.querySelector('[data-act="arenaFight"]').click()); await page.waitForTimeout(2500); await clr(); await shot('battle');
  console.log('errors', errors); await browser.close(); if (srv) srv.close(); process.exit(0);
})();
