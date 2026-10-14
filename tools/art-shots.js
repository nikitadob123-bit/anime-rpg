/* E2E + снимки v2.17 «Артефакты»: слот артефакта (Герой), коллекция, карточка артефакта, Подземелье Артефактов (этапы, предупреждение), Свита.
   node tools/art-shots.js [baseUrl] → art-*.jpg (444×986) в $SHOTS или /workspace/shots-art/ */
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { serve } = require('./serve.js');
const outDir = process.env.SHOTS || '/workspace/shots-art'; fs.mkdirSync(outDir, { recursive: true });
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
  const shot = async (n) => { const raw = path.join(outDir, '.raw-' + n + '.png'), out = path.join(outDir, 'art-' + n + '.jpg'); await page.screenshot({ path: raw });
    execFileSync('python3', ['-c', `from PIL import Image\nim=Image.open(${JSON.stringify(raw)}).convert('RGB')\nim.save(${JSON.stringify(out)},quality=82)`]); fs.unlinkSync(raw); console.log('  📷', out, Math.round(fs.statSync(out).size / 1024) + ' КБ'); };
  const ev = (f, a) => page.evaluate(f, a);
  await page.route(/\/mail\/inbox\.json/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ letters: [] }) }));
  await page.goto(url, { waitUntil: 'load' }); await page.waitForTimeout(1200);
  await ev(() => {
    const { UI, S, E, D, story: ST } = __RPG;
    const p = S.newProfile('Артефакт', '🏺'); const s = E.newSlot({ name: 'Кайрон', race: 'o_street', uniq: 'shadowdance', prof1: 'smith', prof2: 'miner', now: Date.now() }); s.hero.profLocked = true; s.tut = { guide: 1, bt: 1 };
    p.slots[0] = s; ['prologue'].concat(ST.sceneIds(1), ST.sceneIds(2)).forEach((id) => E.finishScene(s, id)); s.story.flags.prologue_done = 1; ['mill', 'wood'].forEach((d) => { s.prog.cleared[d] = 1; s.prog.boss[d] = true; });
    s.hero.level = 100; s.gold = 500000; s.mats.asc_sigil = 30;
    const rng = E.rng(5); ['sword', 'head_h', 'body_h'].forEach((b) => { const it = E.genItem(rng, { base: b, il: 100, rarity: 7 }); E.addItem(s, it); E.equip(s, it.id); });
    ['lantern', 'lucky_coin', 'moon_fang', 'moon_fang', 'first_banner', 'dragon_eye', 'dawn_lance', 'halo_shard', 'supernova_heart', 'hoard_key'].forEach((id) => E.artGain(s, id));
    s.artEq = 'supernova_heart'; ['gen1', 'gen6', 'grak'].forEach((id) => E.recruit(s, id)); s.party = ['gen1', 'gen6', 'asteria'];
    for (let i = 1; i <= 9; i++) s.prog.cleared['artd' + i] = 1; s.artProg.best = 9;
    s.crew.grimhild.lv = 60; s.crew.grimhild.star = 2; s.crew.grimhild.skl = 1; s.crew.grimhild.bxp = 260; s.support = 'grimhild';
    S.save(p); UI.p = p; p.active = 0; UI.enterGame();
  });
  await page.waitForTimeout(1500); await ev(() => __RPG.UI.closeModal && __RPG.UI.closeModal());
  // 1. Герой: слот артефакта
  await ev(() => { __RPG.UI.tab = 'hero'; __RPG.UI.refresh(); }); await page.waitForTimeout(500);
  const card = page.locator('.artcard'); check('карточка артефакта на вкладке «Герой»', await card.count() === 1);
  await card.scrollIntoViewIfNeeded(); await ev(() => { const c = document.querySelector('.gearcard'); if (c) c.scrollIntoView({ block: 'start' }); }); await page.waitForTimeout(400); await shot('1-hero-slot');
  // 2. карточка Мирового артефакта
  await page.locator('.artslot.on').click(); await page.waitForTimeout(500); check('модалка артефакта', await page.locator('.amodal').count() === 1); await shot('2-artifact');
  // 3. коллекция
  await ev(() => __RPG.UI.artListModal()); await page.waitForTimeout(400); check('коллекция: 29 ячеек', await page.locator('.alist .aitem').count() === 29); await shot('3-collection');
  // 4. Подземелье Артефактов
  await ev(() => { __RPG.UI.closeModal(); __RPG.UI.tab = 'dun'; __RPG.UI.refresh(); window.scrollTo(0, 0); }); await page.waitForTimeout(400);
  check('карточка подземелья', await page.locator('.artdun').count() === 1);
  await page.locator('.artdun').click(); await page.waitForTimeout(400); check('10 этапов', await page.locator('.astage').count() === 10);
  await ev(() => { const l = document.querySelector('.alist'); if (l) l.scrollTop = l.scrollHeight; }); await page.waitForTimeout(300); await shot('4-dungeon-stages');
  await page.locator('.astage').nth(9).click(); await page.waitForTimeout(400); check('подготовка этапа 10 с предупреждением о Божественном снаряжении', await page.locator('.artprep .awarn').count() === 1); await shot('5-stage10-prep');
  // 6. Свита: Гримхильда
  await ev(() => { __RPG.UI.closeModal(); __RPG.UI.tab = 'crew'; __RPG.UI.refresh(); __RPG.UI.sub.crewId = 'grimhild'; __RPG.UI.crewModal(); }); await page.waitForTimeout(600);
  check('расширенная карточка Свиты', await page.locator('.crewx').count() >= 1); await shot('6-crew-grimhild');
  check('без ошибок JS', errors.length === 0, errors.join(' | '));
  console.log(`\nСнимки артефактов: ${ok} ✓, ${bad} ✗`); await browser.close(); if (srv) srv.close(); process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
