/* Снимки артов коллабы 444×986 → /workspace/shots-tekken/art/ */
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path');
const { serve } = require('./serve.js');
const outDir = process.env.TK_SHOTS || '/workspace/shots-tekken/art';
fs.mkdirSync(outDir, { recursive: true });

(async () => {
  const srv = await serve(0);
  const url = 'http://127.0.0.1:' + srv.address().port + '/';
  const exe = process.env.CHROME_PATH || ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find((p) => fs.existsSync(p));
  const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 444, height: 986 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ru-RU', timezoneId: 'Europe/Berlin' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const shot = (n) => page.screenshot({ path: path.join(outDir, n + '.jpg'), type: 'jpeg', quality: 86, scale: 'css' });
  const ev = (f, a) => page.evaluate(f, a);
  const click = async (sel) => { const l = page.locator(sel).first(); await l.waitFor({ state: 'visible', timeout: 8000 }); await l.click(); await page.waitForTimeout(80); };

  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__RPG && __RPG.UI && __RPG.D && __RPG.D.TK_ART_HAVE && __RPG.D.TK_ART_HAVE.length > 0);
  const have = await ev(() => __RPG.D.TK_ART_HAVE.slice());
  console.log('art', have.length, have.includes('banner'), have.includes('tk_paul'));

  await ev(async () => {
    const { UI, S, E, D } = __RPG;
    const p = S.newProfile('Арты', '👊');
    const s = E.newSlot({ name: 'Арата', race: 'o_street', uniq: 'phoenix', prof1: 'smith', prof2: 'miner', now: Date.now() });
    s.hero.level = 28; s.gold = 50000; s.tk.tokens = 2000; s.tk.stage = 11; s.tk.best = 11; s.tut = Object.assign(s.tut || {}, { bt: 1 });
    s.tk.story = D.TK_CH.filter((c) => !c.ending).map((c) => c.id);
    ['tk_jin', 'tk_nina'].forEach((id) => { try { E.recruit(s, id); s.party = s.party || []; if (!s.party.includes(id) && s.party.length < 3) s.party.push(id); } catch (e) {} });
    p.slots[0] = s; p.active = 0; p.settings.tutorial = false; UI.p = p; UI.buildNav();
    if (__RPG.story && __RPG.story.loadOutline) await __RPG.story.loadOutline();
    UI.go('game');
  });
  await page.waitForTimeout(500);
  const bannerArt = await ev(() => !!document.querySelector('.tkbanner.hasart'));
  console.log('banner hasart', bannerArt);
  await shot('01-camp-banner');

  await ev(() => { __RPG.UI.tab = 'dun'; __RPG.UI.renderGame(); });
  await page.waitForTimeout(200);
  await shot('02-expedition-banner');

  await ev(() => __RPG.UI.tkOpen('tour'));
  await page.waitForTimeout(250);
  await shot('03-tournament');

  await ev(() => __RPG.UI.tkOpen('shop'));
  await page.waitForTimeout(250);
  await shot('04-shop');

  // сюжет: сцена с ареной и бойцом
  await ev(() => { __RPG.UI.closeModal && __RPG.UI.closeModal(); });
  await ev(() => {
    const { UI, D } = __RPG;
    for (const k in D.TK_SPEAKERS) {
      const src = D.TK_SPEAKERS[k], sp = Object.assign({}, src);
      if (!D.SPEAKERS[k]) D.SPEAKERS[k] = sp;
    }
    UI.playLines(D.TK_SCENES.tk02_paul.lines, { bg: 'tk_arena', replay: true, title: D.TK_SCENES.tk02_paul.t });
  });
  await page.waitForSelector('#story', { timeout: 8000 });
  // дождаться реплики Пола
  for (let i = 0; i < 8; i++) {
    await page.waitForTimeout(400);
    await page.locator('#dlg').click({ force: true }).catch(() => {});
    const sp = await ev(() => (document.getElementById('spk') || {}).textContent || '');
    if (/Пол/.test(sp)) break;
  }
  await page.waitForTimeout(600);
  await shot('05-story-arena');

  await ev(() => { const l = document.getElementById('layer'); if (l) { l.classList.remove('on'); l.innerHTML = ''; } });

  // бой с Полом
  await ev(() => { __RPG.UI.p.settings.auto = false; __RPG.UI.p.settings.battleSpeed = 2; __RPG.UI.tkOpen('tour'); });
  await page.waitForTimeout(200);
  // stage is 11 (all done) — temporarily set stage 0 to fight Paul
  await ev(() => { __RPG.UI.slot().tk.stage = 0; __RPG.UI.tkOpen('tour'); });
  await page.waitForTimeout(200);
  await click('[data-act="tkFight"][data-k="tour"][data-id="paul"]');
  await page.waitForSelector('#battle', { timeout: 8000 });
  await page.waitForTimeout(500);
  const hasSpr = await ev(() => !!document.querySelector('.tkspr'));
  console.log('battle tkspr', hasSpr);
  await shot('06-battle-paul');
  await ev(() => {
    const l = document.getElementById('layer');
    if (l) { l.classList.remove('on'); l.innerHTML = ''; }
    __RPG.UI.B = null;
    __RPG.UI.closeModal && __RPG.UI.closeModal();
    __RPG.UI.tab = 'crew';
    __RPG.UI.renderGame();
  });
  await page.waitForTimeout(400);
  await shot('07-crew-jin-nina');
  // открыть карточку Дзина
  const jin = page.locator('[data-act="crewOpen"][data-id="tk_jin"]');
  if (await jin.count()) { await jin.first().click(); await page.waitForTimeout(300); await shot('08-crew-jin-card'); }

  const missing = await ev(() => {
    const bad = [];
    document.querySelectorAll('img[src*="img/tekken/"]').forEach((img) => { if (!img.naturalWidth) bad.push(img.src); });
    return bad;
  });
  console.log('broken imgs', missing);
  console.log('errors', errors);
  console.log('shots', outDir);
  await browser.close(); srv.close();
  if (!bannerArt || !hasSpr || missing.length) process.exit(1);
})().catch((e) => { console.error(e); process.exit(1); });
