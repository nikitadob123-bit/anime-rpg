/* Снимки «Свет Эдема» (тестовый сейв, НЕ лента): карточка предмета, слот героя, бой с навыком, код игрока в Почте.
   v2.12: + шесть Концептуальных клинков (карточки) и бой с Распадом/Горением → v2120-*.jpg, лист v2120-sheet.jpg.
   node tools/eden-shots.js [baseUrl] → $SHOTS или /workspace/shots/v2110-*.jpg, v2120-*.jpg (≤1200 px). */
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
  let PFX = 'v2110-'; const made = [];
  const shot = async (n) => { const raw = path.join(outDir, '.raw-' + n + '.png'), out = path.join(outDir, PFX + n + '.jpg'); made.push(out); await page.screenshot({ path: raw });
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
  // ───── v2.12: шесть новых Концептуальных клинков ─────
  PFX = 'v2120-'; const NEW = ['abyss_dark', 'hell_heart', 'first_flame', 'boundless_source', 'chronos', 'end_of_all'];
  await page.goto(url, { waitUntil: 'load' }); await page.waitForTimeout(1200);
  await ev(async (NEW) => {
    const { UI, S, E, M, story: ST } = __RPG;
    const p = S.newProfile('Клинки', '🗡️'); const s = E.newSlot({ name: 'Кайрон', race: 'o_street', uniq: 'shadowdance', prof1: 'smith', prof2: 'miner', now: Date.now() }); s.hero.profLocked = true; s.tut = { guide: 1, bt: 1 };
    p.slots[0] = s; ['prologue'].concat(ST.sceneIds(1), ST.sceneIds(2), ST.sceneIds(3), ST.auxIds(3)).forEach((id) => E.finishScene(s, id)); s.story.flags.prologue_done = 1; ['mill', 'cathedral', 'spire'].forEach((d) => { s.prog.cleared[d] = 1; }); s.hero.level = 40; s.gold = 5000;
    M.ensure(s); M.deliver(s, M.parseFeed({ letters: [{ id: 'cx-a', title: 'Клинки I', from: 'Администрация', to: [M.code(s)], gifts: { unique: NEW.slice(0, 3) } }, { id: 'cx-b', title: 'Клинки II', from: 'Администрация', to: [M.code(s)], gifts: { unique: NEW.slice(3) } }] }).letters); M.claim(s, 'cx-a'); M.claim(s, 'cx-b');
    const it = s.inv.find((x) => x.uq === 'end_of_all'); E.equip(s, it.id); S.save(p); UI.p = p; p.active = 0; UI.enterGame();
  }, NEW);
  await page.waitForTimeout(1500); await ev(() => __RPG.UI.closeModal && __RPG.UI.closeModal());
  check('все 6 клинков получены письмами', await ev((NEW) => NEW.every((id) => __RPG.E.slotItems(__RPG.UI.slot()).filter((x) => x.uq === id).length === 1), NEW));
  for (const uq of NEW) {
    const iid = await ev((uq) => __RPG.E.slotItems(__RPG.UI.slot()).find((x) => x.uq === uq).id, uq);
    await ev((iid) => __RPG.UI.itemModal(iid), iid); await page.waitForTimeout(600);
    const nm = await ev((uq) => __RPG.D.UNIQUE_ITEMS[uq].nm, uq);
    check(uq + ': арт, особые и ✧ свойства, навык, без продажи', await page.locator('#modal .uqart img').count() === 1 && await page.locator('#modal .cxbox.sp .cxrow').count() === 3 && await page.locator('#modal .cxrow').count() >= 6 && await page.locator('#modal .cxsk').count() === 1 && await page.locator('#modal [data-act="sellOne"]').count() === 0 && (await page.locator('#modal').textContent()).includes(nm));
    check(uq + ': арт загрузился', await ev(() => { const i = document.querySelector('#modal .uqart img'); return i && i.complete && i.naturalWidth > 0; }));
    if (await ev((uq) => !!__RPG.D.UNIQUE_ITEMS[uq].note, uq)) check(uq + ': примечание', (await page.locator('#modal .uqnote').count()) === 1);
    await shot('card-' + uq);
    await ev(() => { const m = document.querySelector('#modal .cxbox'); if (m) m.scrollIntoView({ block: 'start' }); }); await page.waitForTimeout(250); await shot('props-' + uq);
    await ev(() => __RPG.UI.closeModal()); await page.waitForTimeout(150);
  }
  await ev(() => { __RPG.UI.tab = 'dun'; __RPG.UI.refresh(); }); await page.waitForTimeout(300);
  await ev(() => { __RPG.UI.p.seenIntro = __RPG.UI.p.seenIntro || {}; __RPG.UI.p.seenIntro.mill = 1; __RPG.UI.p.settings.auto = false; });
  await page.locator('[data-act="dunOpen"][data-id="mill"]').click(); await page.waitForTimeout(300); await page.locator('[data-act="dunGo"]').click(); await page.waitForTimeout(600);
  await ev(() => { const r = __RPG.UI.slot().run; const i = r.nodes.findIndex((n) => n.t !== 'ev' && n.e && n.e.length >= 2); r.node = Math.max(0, i >= 0 ? i : r.nodes.findIndex((n) => n.t !== 'ev')); __RPG.UI.closeModal(); __RPG.UI.act.runNext(); });
  await page.waitForSelector('#battle', { timeout: 6000 });
  await page.waitForSelector('[data-act="bSkill"][data-id="x_entropy"]', { timeout: 15000 }).catch(() => {});
  check('навык «Вселенская Энтропия» в панели боя', await page.locator('[data-act="bSkill"][data-id="x_entropy"].cxs img').count() === 1);
  // тестовый сейв: на втором враге показываем Горение/Первичное Горение/Застывшее время (как от Пламени и Хроноса у спутника)
  await ev(() => { const B = __RPG.UI.B; B.foes.forEach((f) => { f.maxHp = f.hp = f.maxHp * 40; }); const f2 = B.foes[1] || B.foes[0]; const C = __RPG.C, P = B.party[0]; C.addSt(B, { id: 'p', side: 'a' }, f2, 'fburn', 3, 40); C.addSt(B, { id: 'p', side: 'a' }, f2, 'primal', 3, 300); C.addSt(B, { id: 'p', side: 'a' }, f2, 'chronoStop', 1); });
  await ev(() => document.querySelectorAll('.tip,.tuthint,.coach').forEach((e) => e.remove()));
  await page.locator('[data-act="bSkill"][data-id="x_entropy"]').click().catch(() => {}); await page.waitForTimeout(250);
  if (await page.locator('.foe').count()) await page.locator('.foe').first().click().catch(() => {});
  await page.waitForFunction(() => { const B = __RPG.UI.B; return B && B.foes.some((f) => f.st.some((s) => s.id === 'decay')); }, null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1200);
  check('Распад на враге (иконка с уровнем и подсказкой)', await page.locator('.si[title^="Распад"]').count() >= 1, await ev(() => (document.querySelector('.si[title^="Распад"]') || {}).title));
  check('Горение / Первичное Горение видны', await page.locator('.si[title^="Горение"]').count() >= 1 && await page.locator('.si[title^="Первичное Горение"]').count() >= 1);
  await ev(() => document.querySelectorAll('.tip,.tuthint,.coach').forEach((e) => e.remove())); await shot('battle-statuses');
  const sheetFiles = made.filter((f) => f.includes('v2120-card-')).concat(made.filter((f) => f.includes('v2120-props-end_of_all') || f.includes('v2120-battle')));
  execFileSync('python3', ['-c', `import sys\nfrom PIL import Image\nfs=sys.argv[2:];W,H,C=270,600,4\nR=(len(fs)+C-1)//C\nsh=Image.new('RGB',(C*W,R*H),(16,19,28))\nfor i,f in enumerate(fs):\n  im=Image.open(f).convert('RGB').resize((W,H),Image.LANCZOS);sh.paste(im,((i%C)*W,(i//C)*H))\nsh.save(sys.argv[1],quality=84)`, path.join(outDir, 'v2120-sheet.jpg')].concat(sheetFiles));
  console.log('  📷', path.join(outDir, 'v2120-sheet.jpg'));
  check('нет ошибок JS', !errors.length, errors.slice(0, 3).join(' | '));
  await browser.close(); if (srv) srv.close();
  console.log(`\nEden-shots: ${ok} ✓, ${bad} ✗`); process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
