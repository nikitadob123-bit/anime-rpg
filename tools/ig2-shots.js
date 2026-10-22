/* E2E + снимки v2.26 «Испытания»: Башня, Арена, Зал, эффекты боя, громкость эффектов. node tools/ig2-shots.js [url] → /workspace/shots-ig2/ */
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { serve } = require('./serve.js');
const outDir = process.env.SHOTS || '/workspace/shots-ig2'; fs.mkdirSync(outDir, { recursive: true });
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
  const shot = async (n) => { const raw = path.join(outDir, '.raw-' + n + '.png'), out = path.join(outDir, 'ig2-' + n + '.jpg'); await page.screenshot({ path: raw });
    execFileSync('python3', ['-c', `from PIL import Image\nim=Image.open(${JSON.stringify(raw)}).convert('RGB')\nim.save(${JSON.stringify(out)},quality=82)`]); fs.unlinkSync(raw); console.log('  📷', out, Math.round(fs.statSync(out).size / 1024) + ' КБ'); };
  const ev = (f, a) => page.evaluate(f, a);
  await page.route(/\/mail\/inbox\.json/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ letters: [] }) }));
  await page.goto(url, { waitUntil: 'load' }); await page.waitForTimeout(1200);
  await ev(() => {
    const { UI, S, E, D, story: ST } = __RPG;
    const p = S.newProfile('Артефакт', '🏺'); const s = E.newSlot({ name: 'Кайрон', race: 'o_street', uniq: 'shadowdance', prof1: 'smith', prof2: 'miner', now: Date.now() }); s.hero.profLocked = true; s.tut = { guide: 1, bt: 1 };
    p.slots[0] = s; ['prologue'].concat(ST.sceneIds(1), ST.sceneIds(2)).forEach((id) => E.finishScene(s, id)); s.story.flags.prologue_done = 1; ['mill', 'wood'].forEach((d) => { s.prog.cleared[d] = 1; s.prog.boss[d] = true; });
    s.hero.level = 100; ['stray_cat','red_fox','storm_hawk','ember_dragon','ember_dragon','nimbus_kitsune','uncommon_a','uncommon_b','uncommon_c','divine_dragon'].forEach((id) => E.petGain(s, id)); s.petFood = 60; s.pets.divine_dragon.lv = 40; s.eggs = { 0: 2, 2: 1, 4: 1, 6: 1, 7: 1 }; s.hatch = { r: 3, end: Date.now() + 25 * 60000 }; s.pets.ember_dragon.lv = 32; s.pets.ember_dragon.bxp = 30; s.petEq = 'ember_dragon'; D.PET_IDS.forEach((id) => { if (!s.pets[id]) E.petGain(s, id); }); ['field_dog','jelly_slime','river_otter','night_owl','frost_wolf','crystal_slime','glacier_dragon','phoenix_fledgling','astral_kirin'].forEach((id) => E.petGain(s, id)); s.gold = 500000; s.mats.asc_sigil = 30;
    const rng = E.rng(5); ['sword', 'head_h', 'body_h'].forEach((b) => { const it = E.genItem(rng, { base: b, il: 100, rarity: 7 }); E.addItem(s, it); E.equip(s, it.id); });
    ['lantern', 'lucky_coin', 'moon_fang', 'moon_fang', 'first_banner', 'dragon_eye', 'dawn_lance', 'halo_shard', 'supernova_heart', 'hoard_key'].forEach((id) => E.artGain(s, id));
    s.artEq = 'supernova_heart'; ['gen1', 'gen6', 'grak'].forEach((id) => E.recruit(s, id)); s.party = ['gen1', 'gen6', 'asteria'];
    for (let i = 1; i <= 9; i++) s.prog.cleared['artd' + i] = 1; s.artProg.best = 9;
    s.crew.grimhild.lv = 60; s.crew.grimhild.star = 2; s.crew.grimhild.skl = 1; s.crew.grimhild.bxp = 260; s.support = 'grimhild'; s.gold = 5e6; E.addMat(s, 'star_ore', 70); E.addMat(s, 'phoenix_f', 25); E.petGain(s, 'preexist_dragon_void');
    s.stats.kills = 140; s.stats.wins = 7; s.afk.t = Date.now() - 7 * 3600e3; s.daily.loginDay = E.dayKey() - 1; s.daily.streak = 2; const L0 = E.dailyList(s); s.stats[__RPG.D.DAILY_POOL.find((x) => x.id === L0[0].id).st] += L0[0].need; s.tower.best = 9; p.settings.auto = true; p.settings.battleSpeed = 2; S.save(p); UI.p = p; p.active = 0; UI.enterGame();
  });
  await page.waitForTimeout(1500); await ev(() => __RPG.UI.closeModal && __RPG.UI.closeModal());
  await ev(() => { __RPG.UI.tab = 'city'; __RPG.UI.refresh(); }); await page.waitForTimeout(400);
  check('Лагерь: карточка «Испытания» (3 кнопки)', await page.locator('.chcard .chb').count() === 3);
  await ev(() => document.querySelector('.chcard').scrollIntoView({ block: 'center' })); await page.waitForTimeout(300); await shot('1-challenges');
  await ev(() => { window.__ko = 0; window.__sk = 0; window.__cb = 0; new MutationObserver(() => { if (document.querySelector('.kobanner.on')) window.__ko = 1; if (document.querySelector('.skbanner.on')) window.__sk = 1; if (document.querySelector('.combo.on')) window.__cb = 1; }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] }); });
  await page.locator('[data-act="towerOpen"]').click(); await page.waitForTimeout(400); check('Башня открыта: этаж 10 (страж)', await page.locator('.tfl.cur.boss').count() === 1); await shot('2-tower');
  await page.locator('[data-act="towerFight"]').click(); await page.waitForTimeout(1600); check('бой Башни идёт', await page.locator('#battle').count() === 1); await shot('3-tower-battle');
  for (let i = 0; i < 120 && await page.locator('#battle').count(); i++) { if (await ev(() => !!document.querySelector('.kobanner.on')) && !(await ev(() => window.__koShot))) { await shot('4-boss-slowmo'); await ev(() => { window.__koShot = 1; }); } await page.waitForTimeout(250); }
  check('этаж 10 покорён, рекорд 10', await ev(() => __RPG.UI.slot().tower.best === 10), String(await ev(() => __RPG.UI.slot().tower.best)));
  check('баннер навыка показан', await ev(() => window.__sk === 1)); check('замедление на добивании стража', await ev(() => window.__ko === 1));
  await shot('5-tower-after');
  await ev(() => { __RPG.UI.closeModal(); __RPG.UI.arenaModal(); }); await page.waitForTimeout(400); check('Арена: 3 соперника', await page.locator('.arv').count() === 3); await shot('6-arena');
  const r0 = await ev(() => __RPG.UI.slot().arena.rating); await page.locator('.arv.d0 [data-act="arenaFight"]').click(); await page.waitForTimeout(1500); await shot('7-arena-battle');
  for (let i = 0; i < 160 && await page.locator('#battle').count(); i++) await page.waitForTimeout(250);
  check('счётчик комбо (≥3 ударов подряд) за бои', await ev(() => window.__cb === 1));
  check('рейтинг арены изменился', await ev((r) => __RPG.UI.slot().arena.rating !== r && __RPG.UI.slot().arena.n === 1, r0)); await shot('8-arena-after');
  await ev(() => { __RPG.UI.closeModal(); __RPG.UI.trainModal(); }); await page.waitForTimeout(300);
  await page.locator('[data-act="trainDo"][data-k="str"]').click(); await page.waitForTimeout(300);
  check('тренировка: +1 Сила, −2 энергии', await ev(() => { const t = __RPG.UI.slot().train; return t.pts.str === 1 && t.en === 18; })); await shot('9-train');
  await ev(() => { __RPG.UI.closeModal(); __RPG.UI.tab = 'set'; __RPG.UI.refresh(); }); await page.waitForTimeout(400);
  check('настройки: ползунок громкости эффектов', await page.locator('#sfxR').count() === 1);
  await page.locator('#sfxR').fill('0.3'); await page.waitForTimeout(200); check('громкость эффектов применена', await ev(() => Math.abs(__RPG.A.sfx - 0.3) < 1e-6 && __RPG.UI.p.settings.sfxVol === 0.3));
  await ev(() => document.querySelector('#sfxR').scrollIntoView({ block: 'center' })); await page.waitForTimeout(200); await shot('10-settings');
  check('нет ошибок JS', errors.length === 0, errors.join(' | '));
  await browser.close(); if (srv) srv.close(); console.log(`\nig2-shots: ${ok} ✓, ${bad} ✗`); process.exit(bad ? 1 : 0);
})();
