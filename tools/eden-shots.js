/* Снимки «Свет Эдема» (тестовый сейв, НЕ лента): карточка предмета, слот героя, бой с навыком, код игрока в Почте.
   node tools/eden-shots.js [baseUrl] → $SHOTS или /workspace/shots/v2110-*.jpg (≤1200 px). */
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { serve } = require('./serve.js');
const outDir = process.env.SHOTS || '/workspace/shots'; fs.mkdirSync(outDir, { recursive: true });
let ok = 0, bad = 0; const check = (n, c, x) => { if (c) { ok++; console.log('  ✓', n, x || ''); } else { bad++; console.log('  ✗', n, x || ''); } };
(async () => {
  let srv = null, url = process.argv[2];
  if (!url) { srv = await serve(0); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
  const exe = process.env.CHROME_PATH || ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find((p) => fs.existsSync(p));
  const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 444, height: 986 }, deviceScaleFactor: 2.75, isMobile: true, hasTouch: true, locale: 'ru-RU', timezoneId: 'Europe/Minsk' });
  const page = await ctx.newPage(); const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|ERR_/.test(m.text())) errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  const shot = async (n) => { const raw = path.join(outDir, '.raw-' + n + '.png'), out = path.join(outDir, 'v2110-' + n + '.jpg'); await page.screenshot({ path: raw });
    execFileSync('python3', ['-c', `from PIL import Image\nim=Image.open(${JSON.stringify(raw)}).convert('RGB')\nh=min(1200,im.height)\nim.resize((round(im.width*h/im.height),h),Image.LANCZOS).save(${JSON.stringify(out)},quality=84)`]); fs.unlinkSync(raw); console.log('  📷', out); };
  const ev = (f, a) => page.evaluate(f, a);
  await page.route(/\/mail\/inbox\.json/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ letters: [] }) }));
  await page.goto(url, { waitUntil: 'load' }); await page.waitForTimeout(1200);
  await ev(async () => {
    const { UI, S, E, M, story: ST } = __RPG;
    const p = S.newProfile('Эдем', '🐉'); const s = E.newSlot({ name: 'Кайрон', race: 'o_street', uniq: 'shadowdance', prof1: 'smith', prof2: 'miner', now: Date.now() }); s.hero.profLocked = true; s.tut = { guide: 1, bt: 1 };
    p.slots[0] = s; ['prologue'].concat(ST.sceneIds(1), ST.sceneIds(2), ST.sceneIds(3), ST.auxIds(3)).forEach((id) => E.finishScene(s, id)); s.story.flags.prologue_done = 1; ['mill', 'cathedral', 'spire'].forEach((d) => { s.prog.cleared[d] = 1; }); s.hero.level = 40; s.gold = 5000;
    M.ensure(s); M.deliver(s, M.parseFeed({ letters: [{ id: 'eden-test', title: 'Свет Эдема', from: 'Администрация', to: [M.code(s)], gifts: { unique: 'eden_light' } }] }).letters); M.claim(s, 'eden-test');
    const it = s.inv.find((x) => x.uq === 'eden_light'); E.equip(s, it.id); S.save(p); UI.p = p; p.active = 0; UI.enterGame();
  });
  await page.waitForTimeout(1500); await ev(() => __RPG.UI.closeModal && __RPG.UI.closeModal());
  const id = await ev(() => __RPG.UI.slot().eq.weapon.id);
  check('меч надет', await ev(() => __RPG.UI.slot().eq.weapon.uq === 'eden_light'));
  await ev(() => { __RPG.UI.tab = 'hero'; __RPG.UI.refresh(); }); await page.waitForTimeout(400);
  await ev(() => { const g = document.querySelector('.gearcard'); if (g) g.scrollIntoView({ block: 'center' }); }); await page.waitForTimeout(300);
  check('слот героя: картинка меча', await page.locator('.eqs.r8 img.uqi').count() === 1); await shot('hero-slot');
  await ev((id) => __RPG.UI.itemModal(id), id); await page.waitForTimeout(700);
  check('карточка: арт, ✧ свойства, навык', await page.locator('#modal .uqart img').count() === 1 && await page.locator('#modal .cxrow').count() === 3 && await page.locator('#modal .cxsk').count() === 1);
  check('карточка: нет кнопки продажи', await page.locator('#modal [data-act="sellOne"]').count() === 0);
  check('арт загрузился', await ev(() => { const i = document.querySelector('#modal .uqart img'); return i && i.complete && i.naturalWidth > 0; }));
  await shot('item-card');
  await ev(() => { const m = document.querySelector('#modal .cxbox'); if (m) m.scrollIntoView({ block: 'start' }); }); await page.waitForTimeout(300); await shot('item-card-props');
  await ev(() => { __RPG.UI.modal(__RPG.UI.rarInfoHtml(), { cls: 'tall' }); }); await page.waitForTimeout(300);
  check('справка: Концептуальный открыт', await ev(() => { const r = [...document.querySelectorAll('#modal .rinfo')][8]; return r && !r.classList.contains('lockd') && /Свет Эдема/.test(r.textContent); }));
  await ev(() => { const r = [...document.querySelectorAll('#modal .rinfo')][8]; r && r.scrollIntoView({ block: 'center' }); }); await page.waitForTimeout(200); await shot('rarity');
  await ev(() => __RPG.UI.closeModal());
  // Почта: код игрока
  await ev(() => { __RPG.UI.tab = 'mail'; __RPG.UI.refresh(); }); await page.waitForTimeout(400);
  const code = await ev(() => __RPG.M.code(__RPG.UI.slot()));
  check('код игрока во вкладке Почта', (await page.locator('#pcodeMail').textContent()) === code, code);
  await ev(() => { const e = document.querySelector('#pcodeMail'); e && e.scrollIntoView({ block: 'center' }); }); await page.waitForTimeout(200); await shot('mail-code');
  await ev(() => { __RPG.UI.tab = 'set'; __RPG.UI.refresh(); }); await page.waitForTimeout(300);
  check('код игрока в Меню', (await page.locator('#pcodeSet').textContent()) === code);
  // Бой
  await ev(() => { __RPG.UI.tab = 'dun'; __RPG.UI.refresh(); }); await page.waitForTimeout(300);
  await ev(() => { __RPG.UI.p.seenIntro = __RPG.UI.p.seenIntro || {}; __RPG.UI.p.seenIntro.mill = 1; __RPG.UI.p.settings.auto = false; });
  await page.locator('[data-act="dunOpen"][data-id="mill"]').click(); await page.waitForTimeout(300); await page.locator('[data-act="dunGo"]').click(); await page.waitForTimeout(600);
  await ev(() => { const r = __RPG.UI.slot().run; const i = r.nodes.findIndex((n) => n.t !== 'ev'); r.node = Math.max(0, i); __RPG.UI.closeModal(); __RPG.UI.act.runNext(); });
  await page.waitForSelector('#battle', { timeout: 6000 });
  await page.waitForSelector('[data-act="bSkill"][data-id="x_eden"]', { timeout: 15000 }).catch(() => {});
  check('навык «Свет Эдема» в панели боя', await page.locator('[data-act="bSkill"][data-id="x_eden"].cxs img').count() === 1);
  await page.waitForTimeout(400); await ev(() => document.querySelectorAll('.tip,.tuthint,.coach').forEach((e) => e.remove())); await shot('battle-skill');
  const foeHp0 = await ev(() => { const B = __RPG.UI.B || null; return B ? null : null; });
  await page.locator('[data-act="bSkill"][data-id="x_eden"]').click().catch(() => {}); await page.waitForTimeout(250);
  if (await page.locator('.foe').count()) await page.locator('.foe').first().click().catch(() => {});
  await page.waitForTimeout(900); await shot('battle-cast');
  check('нет ошибок JS', !errors.length, errors.slice(0, 3).join(' | '));
  await browser.close(); if (srv) srv.close();
  console.log(`\nEden-shots: ${ok} ✓, ${bad} ✗`); process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
