/* v2.10.0: скриншоты редкостей снаряжения и проверка вёрстки (переполнение, ошибки консоли).
   node tools/gear-shots.js [url] [префикс=v2100] [WxH@DPR=444x986@2.75] ; SHOTS=папка (по умолчанию /workspace/shots) */
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path');
const { serve } = require('./serve.js');
const tag = process.argv[3] || 'v2100', spec = process.argv[4] || '444x986@2.75';
const [VW, VH] = spec.split('@')[0].split('x').map(Number), DPR = +(spec.split('@')[1] || 2);
const out = process.env.SHOTS || '/workspace/shots'; fs.mkdirSync(out, { recursive: true });
let ok = 0, bad = 0; const check = (n, c, x) => { c ? ok++ : bad++; console.log(c ? '  ✓' : '  ✗', n, c ? '' : (x || '')); };
(async () => {
  let srv = null, url = process.argv[2]; if (!url) { srv = await serve(0); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
  const exe = process.env.CHROME_PATH || ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find((p) => fs.existsSync(p));
  const b = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: DPR, isMobile: true, hasTouch: true, serviceWorkers: 'block', locale: 'ru-RU' });
  const page = await ctx.newPage(); const errs = [];
  page.on('console', (m) => m.type() === 'error' && errs.push(m.text())); page.on('pageerror', (e) => errs.push(e.message));
  await page.route('**/mail/inbox.json*', (r) => r.fulfill({ contentType: 'application/json', body: '{"letters":[]}' }));
  const ev = (f, a) => page.evaluate(f, a);
  // снимок в полном разрешении устройства, затем уменьшение до ≤1200 px по высоте (python3 + Pillow; без него — в CSS-пикселях)
  const { execFileSync } = require('child_process');
  const shot = async (name, wait) => {
    await page.waitForTimeout(wait || 500); const f = path.join(out, `${tag}-${name}.jpg`), raw = f + '.png';
    await page.screenshot({ path: raw, scale: 'device' });
    try { execFileSync('python3', ['-c', 'import sys;from PIL import Image;im=Image.open(sys.argv[1]).convert("RGB");k=min(1,1200/im.height);im=im.resize((round(im.width*k),round(im.height*k)),Image.LANCZOS);im.save(sys.argv[2],quality=86)', raw, f]); }
    catch (e) { await page.screenshot({ path: f, type: 'jpeg', quality: 84, scale: 'css' }); }
    fs.unlinkSync(raw); console.log('  ·', f);
  };
  const over = async (name) => { const r = await ev(() => { const W = innerWidth, bad = []; if (document.documentElement.scrollWidth > W + 1) bad.push('doc'); document.querySelectorAll('#view .content *, #modal *').forEach((e) => { const q = e.getBoundingClientRect(); if (q.width > 0 && (q.right > W + 2 || q.left < -2)) bad.push((e.className || e.tagName) + ' ' + Math.round(q.right)); }); return bad.slice(0, 4); }); check('без переполнения: ' + name, !r.length, JSON.stringify(r)); };
  await page.goto(url, { waitUntil: 'load' }); await page.waitForTimeout(1200);
  await ev(() => {
    const { S, E, D, UI } = __RPG; const p = S.newProfile('Витрина', '🦉'); p.settings.tutorial = false; p.settings.sound = false; p.settings.music = false;
    const s = E.newSlot({ name: 'Арата', race: 'o_street', uniq: 'shadowdance', prof1: 'smith', prof2: 'miner' });
    s.story.done = ['prologue', 'ch1_a']; s.story.flags.prologue_done = 1; s.hero.level = 62; s.gold = 250000; s.tut.guide = 1;
    E.addMat(s, 'ing_ms', 200);
    const mk = (base, r, il, seed) => { const it = E.genItem(E.rng(seed), { base, il, rarity: r }); return E.addItem(s, it); };
    const eq = [['dagger', 7, 64, 11], ['head_l', 5, 60, 12], ['body_l', 6, 61, 13], ['boots_l', 4, 58, 14], ['ring', 3, 57, 15], ['amulet', 2, 55, 16]];
    s.eq = {}; eq.forEach(([b, r, il, sd]) => { const it = mk(b, r, il, sd); E.equip(s, it.id); });
    [['dagger', 2, 60, 21], ['dagger', 0, 60, 22], ['ring', 1, 58, 23], ['ring', 5, 62, 24], ['body_l', 4, 60, 25], ['head_h', 3, 59, 26], ['boots_c', 0, 55, 27], ['amulet', 6, 63, 28], ['staff', 1, 50, 29], ['sword', 7, 65, 30]].forEach(([b, r, il, sd]) => mk(b, r, il, sd));
    s.eq.weapon.up = 4; s.eq.body.up = 2; s.inv.find((x) => x.r === 2 && x.k === 'dagger').up = 1;
    p.slots[0] = s; p.active = 0; S.save(p); UI.p = p; UI.tab = 'hero'; UI.v = 'game'; UI.render();
  });
  await page.waitForTimeout(800);
  check('вкладка Герой открыта', await ev(() => !!document.querySelector('.gearcard')));
  check('слоты снаряжения с редкостями r2…r7', await ev(() => ['r2', 'r3', 'r4', 'r5', 'r6', 'r7'].every((c) => document.querySelector('.eqs.' + c))));
  await ev(() => document.querySelector('.gearcard').scrollIntoView({ block: 'start' })); await page.waitForTimeout(200);
  await shot('hero-gear'); await over('герой: снаряжение');
  // инвентарь
  await ev(() => { __RPG.UI.tab = 'inv'; __RPG.UI.sub.inv = 'gear'; __RPG.UI.render(); }); await page.waitForTimeout(400);
  check('сумка: бейджи редкостей', await ev(() => document.querySelectorAll('.item .rbadge').length >= 10));
  await shot('inventory'); await over('сумка');
  // карточка Редкого (сравнение с надетым кинжалом)
  await ev(() => { const s = __RPG.UI.slot(); __RPG.UI.itemModal(s.inv.find((x) => x.r === 2 && x.k === 'dagger').id); });
  check('карточка Редкого: сравнение с +/−', await ev(() => document.querySelector('#modal .rbadge.r2') && document.querySelectorAll('#modal .diffrow em.ok, #modal .diffrow em.bad').length >= 3));
  await shot('item-rare'); await over('карточка: Редкий');
  // карточка Божественного (надето)
  await ev(() => { const s = __RPG.UI.slot(); __RPG.UI.itemModal(s.eq.weapon.id); });
  check('карточка Божественного: 3 особых свойства с описанием', await ev(() => document.querySelector('#modal .rbadge.r7') && document.querySelectorAll('#modal .fxdesc').length === 3));
  await shot('item-divine'); await over('карточка: Божественный');
  // справка о редкостях
  await ev(() => __RPG.UI.act.rarInfo());
  check('справка: 11 редкостей, 3 закрыты', await ev(() => document.querySelectorAll('#modal .rinfo').length === 11 && document.querySelectorAll('#modal .rinfo.lockd').length === 3 && document.querySelector('#modal').textContent.includes('ещё не открыто')));
  await shot('rarity-info'); await over('справка о редкостях');
  await ev(() => { const l = document.querySelector('#modal .mlist'); l.scrollTop = l.scrollHeight; }); await shot('rarity-info-2');
  // кузница, лавка, почтовый подарок, крафт-тост
  await ev(() => __RPG.UI.forgeModal()); check('кузница: предел по редкости', await ev(() => /\+4\/10/.test(document.querySelector('#modal').textContent))); await shot('forge'); await over('кузница');
  await ev(() => { __RPG.UI.sub.shop = 'gear'; __RPG.UI.shopModal(); }); await shot('shop'); await over('лавка');
  await ev(() => __RPG.UI.closeModal());
  console.log('errs', JSON.stringify(errs.slice(0, 5))); check('нет ошибок консоли', errs.length === 0, JSON.stringify(errs.slice(0, 3)));
  console.log(`gear-shots ${spec}: ${ok} ✓, ${bad} ✗`); await b.close(); if (srv) srv.close(); process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
