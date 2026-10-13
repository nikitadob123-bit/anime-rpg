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
  const PFX = 'v2150-';
  const shot = async (n) => { const raw = path.join(outDir, '.raw-' + n + '.png'), out = path.join(outDir, PFX + n + '.jpg'); await page.screenshot({ path: raw });
    execFileSync('python3', ['-c', `from PIL import Image\nim=Image.open(${JSON.stringify(raw)}).convert('RGB')\nh=min(1200,im.height)\nim.resize((round(im.width*h/im.height),h),Image.LANCZOS).save(${JSON.stringify(out)},quality=84)`]); fs.unlinkSync(raw); console.log('  📷', out); };
  const ev = (f, a) => page.evaluate(f, a);
  const tap = async (sel) => { await page.locator(sel).first().click(); await page.waitForTimeout(160); };
  await page.route(/\/mail\/inbox\.json/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ letters: [] }) }));
  // «пользовательская» PNG для загрузки
  const png = path.join(require('os').tmpdir(), 'craft-upload.png');
  execFileSync('python3', ['-c', `from PIL import Image\nImage.open(${JSON.stringify(path.join(__dirname, '../assets/gear/eden_light_256.webp'))}).convert('RGBA').save(${JSON.stringify(png)})`]);

  await page.goto(url, { waitUntil: 'load' }); await page.waitForTimeout(1200);
  await ev(() => {
    const { UI, S, E, story: ST } = __RPG;
    const p = S.newProfile('Творец', '🛠️'); const s = E.newSlot({ name: 'Кайрон', race: 'o_street', uniq: 'shadowdance', prof1: 'smith', prof2: 'ench', now: Date.now() }); s.hero.profLocked = true; s.tut = { guide: 1, bt: 1 };
    p.slots[0] = s; ['prologue'].concat(ST.sceneIds(1), ST.sceneIds(2), ST.sceneIds(3), ST.auxIds(3)).forEach((id) => E.finishScene(s, id)); s.story.flags.prologue_done = 1; ['mill', 'cathedral', 'spire', 'wood'].forEach((d) => { s.prog.cleared[d] = 1; s.prog.boss[d] = true; });
    s.hero.level = 70; s.gold = 50000; s.profs.smith.lv = 14; s.profs.ench.lv = 8;
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
  check('смешанные материалы → редкость по слабейшему (Мифический), своей иконки нет', /Мифический/.test(sum) && !/можно загрузить/.test(sum), sum.slice(0, 60));
  await tap('.cslot[data-i="0"]'); await tap('.cmt[data-id="nimbus_shard"]');
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
  const atlas = await ev(() => new Promise((res) => { const i = new Image(); i.onload = () => res(i.naturalWidth); i.onerror = () => res(0); i.src = __RPG.D.CRAFT_ICON_ATLAS; }));
  check('атлас иконок загрузился', atlas === 2560, String(atlas));
  await ev(() => { const b = document.querySelector('#modal .mbox'); b.scrollTop = 0; }); await shot('icons');
  await page.setInputFiles('#cfFile', png); await page.waitForTimeout(1200);
  const up = await ev(() => ({ img: !!(__RPG.UI.cf.img), len: (__RPG.UI.cf.img || '').length + (__RPG.UI.cf.img2 || '').length, prev: !!document.querySelector('.cfprev .cuimg img') }));
  check('загрузка PNG: уменьшена (128+256), ≤ 60 КБ, видна в превью', up.img && up.len <= 60 * 1024 && up.prev, JSON.stringify(up));
  await ev(() => { const u = document.querySelector('.cfup'); u && u.scrollIntoView({ block: 'end' }); }); await page.waitForTimeout(200); await shot('upload');
  await tap('[data-act="cfMake"]'); await page.waitForTimeout(600);
  const made = await ev(() => { const s = __RPG.UI.slot(), it = s.inv.find((x) => x.cu); return it && { r: it.r, nm: it.nm, mats: s.mats.nimbus_shard || 0, sk: it.cu.sk, img: !!it.cu.img, fx: it.fx }; });
  check('создано: Божественный, материалы потрачены, свойства/навыки/картинка', made && made.r === 7 && made.mats === 0 && made.sk.length === 2 && made.img && made.fx.length === 3, JSON.stringify(made));
  const card = await page.locator('#modal').textContent();
  check('карточка: «Создано игроком», навыки предмета, своя иконка', /Создано игроком/.test(card) && /Навыки предмета/.test(card) && await page.locator('#modal .itemhead .cuimg img').count() === 1);
  await shot('item');
  await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(1500);
  const after = await ev(() => { const { S, UI } = __RPG; const ids = S.listIds(); const p = S.load(ids[ids.length - 1]).p; const s = p && p.slots[0]; const it = s && s.inv.find((x) => x.cu); return it && { r: it.r, fixed: !!it.cu.fixed, img: !!it.cu.img }; });
  check('после перезагрузки: вещь цела, не «исправлена»', after && after.r === 7 && !after.fixed && after.img, JSON.stringify(after));
  const sheet = ['unlock', 'mats', 'stats', 'fx', 'skills', 'icons', 'upload', 'item'].map((n) => path.join(outDir, PFX + n + '.jpg'));
  execFileSync('python3', ['-c', `import sys\nfrom PIL import Image\nfs=sys.argv[2:];W,H,C=270,600,4\nR=(len(fs)+C-1)//C\nsh=Image.new('RGB',(C*W,R*H),(16,19,28))\nfor i,f in enumerate(fs):\n  im=Image.open(f).convert('RGB').resize((W,H),Image.LANCZOS);sh.paste(im,((i%C)*W,(i//C)*H))\nsh.save(sys.argv[1],quality=86)`, path.join(outDir, PFX + 'sheet.jpg')].concat(sheet));
  console.log('  📷', path.join(outDir, PFX + 'sheet.jpg'));
  check('нет ошибок JS', !errors.length, errors.slice(0, 3).join(' | '));
  await browser.close(); if (srv) srv.close();
  console.log(`\nCraft-e2e: ${ok} ✓, ${bad} ✗`); process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
