/* E2E + снимки «Мастерской творца» v2.15 (тестовый сейв: Кузнец + Зачарователь, ур. 70, материалы всех качеств):
   вкладка «Ремесло» (открыто) → выбор 3 материалов (смешанные → Мифический без загрузки; 3 божественных → Божественный + загрузка) →
   конструктор (имя с HTML — очищается, очки до нуля, свойства ✦✸☀, 2 навыка, иконки только своей группы ≤ редкости, загрузка PNG) →
   создание (материалы потрачены) → карточка «Создано игроком» → перезагрузка (вещь цела, не «исправлена»).
   node tools/craft-shots.js [baseUrl] → v2150-*.jpg (540×1200) и v2150-sheet.jpg в $SHOTS или /workspace/shots/ */
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
  const PFX = 'v2160-';
  const shot = async (n) => { const raw = path.join(outDir, '.raw-' + n + '.png'), out = path.join(outDir, PFX + n + '.jpg'); await page.screenshot({ path: raw });
    execFileSync('python3', ['-c', `from PIL import Image\nim=Image.open(${JSON.stringify(raw)}).convert('RGB')\nh=min(1200,im.height)\nim.resize((round(im.width*h/im.height),h),Image.LANCZOS).save(${JSON.stringify(out)},quality=84)`]); fs.unlinkSync(raw); console.log('  📷', out); };
  const ev = (f, a) => page.evaluate(f, a);
  const tap = async (sel) => { await page.locator(sel).first().click(); await page.waitForTimeout(160); };
  await page.route(/\/mail\/inbox\.json/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ letters: [] }) }));
  // «пользовательская» PNG для загрузки
  const png = path.join(require('os').tmpdir(), 'craft-upload.png');
  execFileSync('python3', ['-c', `from PIL import Image\na=Image.open(${JSON.stringify(path.join(__dirname, '../assets/gear/eden_light_256.webp'))}).convert('RGBA').resize((900,900))\nc=Image.new('RGBA',(1400,900),(0,0,0,0));c.paste(a,(250,0),a);c.save(${JSON.stringify(png)})`]);

  await page.goto(url, { waitUntil: 'load' }); await page.waitForTimeout(1200);
  await ev(() => {
    const { UI, S, E, story: ST } = __RPG;
    const p = S.newProfile('Творец', '🛠️'); const s = E.newSlot({ name: 'Кайрон', race: 'o_street', uniq: 'shadowdance', prof1: 'smith', prof2: 'ench', now: Date.now() }); s.hero.profLocked = true; s.tut = { guide: 1, bt: 1 };
    p.slots[0] = s; ['prologue'].concat(ST.sceneIds(1), ST.sceneIds(2), ST.sceneIds(3), ST.auxIds(3)).forEach((id) => E.finishScene(s, id)); s.story.flags.prologue_done = 1; ['mill', 'cathedral', 'spire', 'wood'].forEach((d) => { s.prog.cleared[d] = 1; s.prog.boss[d] = true; });
    s.hero.level = 70; s.gold = 200000; s.profs.smith.lv = 14; s.profs.ench.lv = 8;
    Object.assign(s.mats, { nimbus_shard: 3, myth_blood: 2, phoenix_f: 2, star_ore: 4, gem_fr: 3, ing_ms: 5, ess_l: 2, dust: 6, ing_fe: 4, leather: 3, ore_cu: 6, herb_g: 4 });
    S.save(p); UI.p = p; p.active = 0; UI.enterGame();
  });
  await page.waitForTimeout(1500); await ev(() => __RPG.UI.closeModal && __RPG.UI.closeModal());
  await ev(() => { __RPG.UI.tab = 'prof'; __RPG.UI.refresh(); window.scrollTo(0, 0); }); await page.waitForTimeout(400);
  check('вкладка «Ремесло»: Мастерская творца открыта (Кузнец + Зачарователь)', await page.locator('.craftcard.on [data-act="cfOpen"]').count() === 1);
  await ev(() => { const c = document.querySelector('.craftcard'); c && c.scrollIntoView({ block: 'center' }); }); await page.waitForTimeout(200); await shot('unlock');
  await tap('[data-act="cfOpen"]');
  // смешанные: 🩸 + 💫💫 → Мифический, без загрузки
  await tap('.cmt[data-id="myth_blood"]'); await tap('.cmt[data-id="nimbus_shard"]'); await tap('.cmt[data-id="nimbus_shard"]');
  let sum = await page.locator('.cfsum').textContent();
  check('🩸 + 💫 + 💫 → среднее 6.67 → Мифический, своей иконки нет (нужны 3 божественных)', /Мифический/.test(sum) && !/можно загрузить/.test(sum), sum.slice(0, 60));
  check('показан расчёт среднего: (6 + 7 + 7) / 3 = 6.67 → 6', /6 \+ 7 \+ 7\) \/ 3 = 6\.67 → 6/.test(sum), sum.replace(/\s+/g, ' ').slice(0, 120));
  await tap('.cslot[data-i="0"]'); await tap('.cmt[data-id="star_ore"]');
  sum = await page.locator('.cfsum').textContent();
  check('среднее: 💫 + 💫 + 🌠 = (7+7+4)/3 = 6 → Мифический (Эпический материал не тянет вниз до 4)', /Мифический/.test(sum) && /= 6\.00 → 6/.test(sum), sum.replace(/\s+/g, ' ').slice(0, 120));
  await shot('avg');
  await tap('.cslot[data-i="2"]'); await tap('.cmt[data-id="nimbus_shard"]');
  sum = await page.locator('.cfsum').textContent();
  check('3 божественных → «Божественный», бюджет 52, можно загрузить PNG', /Божественный/.test(sum) && /Бюджет 52/.test(sum) && /можно загрузить/.test(sum), sum.slice(0, 80));
  check('4-й материал не выбрать', await page.locator('.cmt:not([disabled])').count() === 0);
  await shot('mats');
  await tap('[data-act="cfNext"]');
  await page.locator('#cfName').fill('<Рассвет> Творца'); await page.waitForTimeout(150);
  check('имя очищено от < > в превью', (await page.locator('.cfprev .rn').textContent()).trim() === 'Рассвет Творца', await page.locator('.cfprev .rn').textContent());
  await tap('[data-act="cfTab"][data-k="stats"]');
  for (const k of ['luk', 'vit', 'agi', 'dmg', 'crit', 'critDmg']) for (let i = 0; i < 10; i++) { const b = page.locator(`[data-act="cfPt"][data-k="${k}"][data-d="1"]`); if (await b.isDisabled()) break; await b.click(); }
  const pts = await page.locator('.cfpts').textContent();
  check('очки распределены до нуля: 52/52, «+» заблокирован', /52\s*\/\s*52/.test(pts) && await page.locator('[data-act="cfPt"][data-d="1"]:not([disabled])').count() === 0, pts.replace(/\s+/g, ' '));
  await ev(() => { const b = document.querySelector('#modal .mbox'); b.scrollTop = 0; }); await shot('stats');
  await tap('[data-act="cfTab"][data-k="fx"]'); await tap('[data-act="cfFx"][data-id="brand"]'); await tap('[data-act="cfFx"][data-id="exec"]'); await tap('[data-act="cfFx"][data-id="verdict"]');
  check('свойства: ✦ + ✸ + ☀ выбраны', await page.locator('.cfopt.on').count() === 3);
  await ev(() => { const b = document.querySelector('#modal .mbox'); b.scrollTop = 0; }); await shot('fx');
  await tap('[data-act="cfTab"][data-k="sk"]'); await tap('[data-act="cfSk"][data-id="u_thunder"]'); await tap('[data-act="cfSk"][data-id="u_frostheart"]');
  check('навыки: 2 из 2, третий недоступен', await page.locator('.cfopt.on').count() === 2 && await page.locator('[data-act="cfSk"]:not(.on):not([disabled])').count() === 0);
  await ev(() => { const b = document.querySelector('#modal .mbox'); b.scrollTop = 0; }); await shot('skills');
  await tap('[data-act="cfTab"][data-k="ic"]');
  const icn = await ev(() => ({ ui: document.querySelectorAll('.cfic').length, want: __RPG.E.craftIcons('sword', 7).length, ring: __RPG.E.craftIcons('ring', 7).map((x) => x.id) }));
  check('иконки: только мечи ≤ Божественного', icn.ui === icn.want && icn.want > 0, JSON.stringify({ ui: icn.ui, want: icn.want }));
  await page.locator('.cfic').nth(icn.ui - 2).click(); await page.waitForTimeout(200);
  await page.waitForTimeout(500);
  const ld = await ev(async () => { const th = [...document.querySelectorAll('.cfic img')].map((i) => i.complete && i.naturalWidth); const big = await new Promise((res) => { const i = new Image(); i.onload = () => res(i.naturalWidth); i.onerror = () => res(0); i.src = __RPG.D.CRAFT_ICON_DIR + __RPG.D.CRAFT_ICONS[5].f; }); return { th: th.filter((w) => w === 128).length, n: th.length, big }; });
  check('превью 128 в сетке загрузились, полноразмерная 512 грузится', ld.th === ld.n && ld.big === 512, JSON.stringify(ld));
  await ev(() => { const b = document.querySelector('#modal .mbox'); b.scrollTop = 0; }); await shot('icons');
  await page.setInputFiles('#cfFile', png); await page.waitForTimeout(1200);
  const up = await ev(() => ({ img: !!(__RPG.UI.cf.img), len: (__RPG.UI.cf.img || '').length + (__RPG.UI.cf.img2 || '').length, prev: !!document.querySelector('.cfprev .cuimg img'), w: __RPG.UI.cf.hdW, h: __RPG.UI.cf.hdH, hd: __RPG.UI.cf.hd ? __RPG.UI.cf.hd.size : 0, type: __RPG.UI.cf.hd && __RPG.UI.cf.hd.type }));
  check('загрузка PNG 1400×900: HD 1024×658 (без растяжения), превью 128 в сейв ≤ 60 КБ, видно в превью', up.img && up.len <= 60 * 1024 && up.prev && up.w === 1024 && up.h === 658 && up.hd > 0, JSON.stringify(up));
  await ev(() => { const u = document.querySelector('.cfup'); u && u.scrollIntoView({ block: 'end' }); }); await page.waitForTimeout(200); await shot('upload');
  await tap('[data-act="cfMake"]'); await page.waitForTimeout(600);
  const made = await ev(() => { const s = __RPG.UI.slot(), it = s.inv.find((x) => x.cu); return it && { r: it.r, nm: it.nm, mats: s.mats.nimbus_shard || 0, sk: it.cu.sk, img: !!it.cu.img, fx: it.fx }; });
  check('создано: Божественный, материалы потрачены, свойства/навыки/картинка', made && made.r === 7 && made.mats === 0 && made.sk.length === 2 && made.img && made.fx.length === 3, JSON.stringify(made));
  const card = await page.locator('#modal').textContent();
  check('карточка: «Создано игроком», навыки предмета, своя иконка', /Создано игроком/.test(card) && /Навыки предмета/.test(card) && await page.locator('#modal .itemhead .cuimg img').count() === 1);
  const idb = await ev(async () => { const it = __RPG.UI.slot().inv.find((x) => x.cu); const b = await __RPG.UI.craftIDB.get(it.cu.imgKey); await new Promise((r) => setTimeout(r, 400)); const im = document.querySelector('#modal .itemhead img[data-ck]'); return { key: it.cu.imgKey, size: b ? b.size : 0, type: b && b.type, hyd: im && im.dataset.hd, src: im && im.src.slice(0, 5) }; });
  check('HD в IndexedDB по ключу из сейва, карточка показывает HD', idb.size > 0 && /^ci_/.test(idb.key) && idb.hyd === '1' && idb.src === 'blob:', JSON.stringify(idb));
  await shot('item');
  await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(1500);
  const after = await ev(async () => { const { S, UI } = __RPG; const ids = S.listIds(); const p = S.load(ids[ids.length - 1]).p; const s = p && p.slots[0]; const it = s && s.inv.find((x) => x.cu); const b = it && await UI.craftIDB.get(it.cu.imgKey); return it && { r: it.r, fixed: !!it.cu.fixed, img: !!it.cu.img, hd: b ? b.size : 0 }; });
  check('после перезагрузки: вещь цела, не «исправлена», HD на месте', after && after.r === 7 && !after.fixed && after.img && after.hd > 0, JSON.stringify(after));
  // смена профессии
  await ev(() => { const { UI, S } = __RPG; const ids = S.listIds(); UI.p = S.load(ids[ids.length - 1]).p; UI.p.active = 0; UI.enterGame(); }); await page.waitForTimeout(1200); await ev(() => __RPG.UI.closeModal());
  await ev(() => { __RPG.UI.tab = 'prof'; __RPG.UI.refresh(); }); await page.waitForTimeout(300);
  await tap('[data-act="pcOpen"]'); await page.waitForTimeout(200);
  check('смена профессии: список основной и доп. профессий', await page.locator('[data-act="pcPick"][data-w="main"]').count() === 8 && await page.locator('[data-act="pcPick"][data-w="sub"]').count() === 8);
  await shot('reprof');
  await tap('[data-act="pcPick"][data-w="main"][data-id="alch"]');
  const cfTxt = await page.locator('#modal').textContent();
  check('подтверждение показывает цену 50 000 🪙', /50\s000/.test(cfTxt) && /Алхимик/.test(cfTxt), cfTxt.replace(/\s+/g, ' ').slice(0, 140));
  await shot('reprof-confirm');
  const g0 = await ev(() => __RPG.UI.slot().gold); await tap('#cfOk'); await page.waitForTimeout(300);
  const pc1 = await ev(() => { const s = __RPG.UI.slot(); return { p: [s.hero.prof1, s.hero.prof2], gold: s.gold, smith: s.profs.smith.lv, craft: __RPG.E.craftUnlocked(s) }; });
  check('сменено: Алхимик основной, −50 000, Кузнец сохранён (ур. 14), мастерская закрыта', pc1.p[0] === 'alch' && g0 - pc1.gold === 50000 && pc1.smith === 14 && !pc1.craft, JSON.stringify(pc1));
  await tap('[data-act="pcOpen"]'); await tap('[data-act="pcPick"][data-w="main"][data-id="smith"]'); await tap('#cfOk'); await page.waitForTimeout(300);
  const pc2 = await ev(() => { const s = __RPG.UI.slot(); return { p: [s.hero.prof1, s.hero.prof2], lv: __RPG.E.profLv(s, 'smith'), craft: __RPG.E.craftUnlocked(s) }; });
  check('возврат к Кузнецу: ур. 14 восстановлен, мастерская снова открыта', pc2.p[0] === 'smith' && pc2.lv === 14 && pc2.craft, JSON.stringify(pc2));
  const sheet = ['unlock', 'avg', 'mats', 'icons', 'upload', 'item', 'reprof', 'reprof-confirm'].map((n) => path.join(outDir, PFX + n + '.jpg'));
  execFileSync('python3', ['-c', `import sys\nfrom PIL import Image\nfs=sys.argv[2:];W,H,C=270,600,4\nR=(len(fs)+C-1)//C\nsh=Image.new('RGB',(C*W,R*H),(16,19,28))\nfor i,f in enumerate(fs):\n  im=Image.open(f).convert('RGB').resize((W,H),Image.LANCZOS);sh.paste(im,((i%C)*W,(i//C)*H))\nsh.save(sys.argv[1],quality=86)`, path.join(outDir, PFX + 'sheet.jpg')].concat(sheet));
  console.log('  📷', path.join(outDir, PFX + 'sheet.jpg'));
  check('нет ошибок JS', !errors.length, errors.slice(0, 3).join(' | '));
  await browser.close(); if (srv) srv.close();
  console.log(`\nCraft-e2e: ${ok} ✓, ${bad} ✗`); process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
