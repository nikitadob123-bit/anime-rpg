/* Снимки «До существования» v2.14 (тестовый сейв, НЕ лента; клинок доставлен письмом в сейве, второй — отклонён): карточка (верх, пассивки и навыки,
   системная логика), бой с обоими навыками (Отрицание — по кнопке), выбор «Возможности существования», подземелья с «⚫ Существование отрицается»,
   справка редкостей → v2140-*.jpg (540×1200), лист v2140-sheet.jpg. node tools/prex-shots.js [baseUrl] → $SHOTS или /workspace/shots/ */
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
  const PFX = 'v2140-';
  const shot = async (n) => { const raw = path.join(outDir, '.raw-' + n + '.png'), out = path.join(outDir, PFX + n + '.jpg'); await page.screenshot({ path: raw });
    execFileSync('python3', ['-c', `from PIL import Image\nim=Image.open(${JSON.stringify(raw)}).convert('RGB')\nh=min(1200,im.height)\nim.resize((round(im.width*h/im.height),h),Image.LANCZOS).save(${JSON.stringify(out)},quality=84)`]); fs.unlinkSync(raw); console.log('  📷', out); };
  const ev = (f, a) => page.evaluate(f, a);
  await page.route(/\/mail\/inbox\.json/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ letters: [] }) }));

  await page.goto(url, { waitUntil: 'load' }); await page.waitForTimeout(1200);
  const mail = await ev(() => {
    const { UI, S, E, M, story: ST } = __RPG;
    const p = S.newProfile('До существования', '⚪'); const s = E.newSlot({ name: 'Кайрон', race: 'o_street', uniq: 'shadowdance', prof1: 'smith', prof2: 'miner', now: Date.now() }); s.hero.profLocked = true; s.tut = { guide: 1, bt: 1 };
    p.slots[0] = s; ['prologue'].concat(ST.sceneIds(1), ST.sceneIds(2), ST.sceneIds(3), ST.auxIds(3)).forEach((id) => E.finishScene(s, id)); s.story.flags.prologue_done = 1; ['mill', 'cathedral', 'spire', 'wood'].forEach((d) => { s.prog.cleared[d] = 1; s.prog.boss[d] = true; }); s.hero.level = 70; s.gold = 5000;
    M.ensure(s); M.deliver(s, M.parseFeed({ letters: [{ id: 'px-1', title: 'До существования', from: 'Администрация', to: [M.code(s)], gifts: { unique: 'null_possibility' } }, { id: 'px-2', title: 'Ещё один?', from: 'Администрация', to: [M.code(s)], gifts: { unique: 'null_possibility' } }] }).letters);
    const r1 = M.claim(s, 'px-1'), r2 = M.claim(s, 'px-2');
    const it = s.inv.find((x) => x.uq === 'null_possibility'); E.equip(s, it.id);
    const now = Date.now(); s.denied = [
      { id: 'wood|0|8#0#oak_guardian', k: 'wood|0|8', i: 0, eid: 'oak_guardian', n: 'Старый Хранитель', did: 'wood', tier: 0, node: 8, f: 1, role: 'boss', at: now - 5e6 },
      { id: 'mill|1|2#1#rat', k: 'mill|1|2', i: 1, eid: 'rat', n: 'Подвальная крыса', did: 'mill', tier: 1, node: 2, f: 1, role: 'swarm', at: now - 3e6 }];
    S.save(p); UI.p = p; p.active = 0; UI.enterGame();
    return { n: E.slotItems(s).filter((x) => x.uq === 'null_possibility').length, refused: (r2.got.refused || []).length };
  });
  await page.waitForTimeout(1500); await ev(() => __RPG.UI.closeModal && __RPG.UI.closeModal());
  check('клинок получен письмом; второй экземпляр отклонён', mail.n === 1 && mail.refused === 1, JSON.stringify(mail));
  await ev(() => { __RPG.UI.tab = 'hero'; __RPG.UI.refresh(); }); await page.waitForTimeout(400);
  check('слот героя: рамка До существования', await page.locator('.eqs.r10 img.uqi.p10').count() === 1);
  const iid = await ev(() => __RPG.E.slotItems(__RPG.UI.slot()).find((x) => x.uq === 'null_possibility').id);
  await ev((iid) => __RPG.UI.itemModal(iid), iid); await page.waitForTimeout(700);
  const txt = await page.locator('#modal').textContent();
  check('карточка: арт, 4 пассивки, 2 навыка, отрицаемые ×2, системная логика (5), +0/15, без продажи', await page.locator('#modal .uqart.r10 img').count() === 1 && await page.locator('#modal .cxbox.px .cxrow').count() === 4 && await page.locator('#modal .cxbox.pxk .cxsk').count() === 2 && await page.locator('#modal .cxbox.pd .cxrow').count() === 2 && await page.locator('#modal .cxbox.pc .cxrow').count() === 5 && await page.locator('#modal [data-act="sellOne"]').count() === 0 && /\+0\/15/.test(txt));
  check('статы: +10000 атаки, +100% крит/пробитие/вампиризм, +300% урон крита, макс. HP +100%, сопротивление всему урону +100%', ['+10000', 'Сопротивление всему урону', 'Максимальное здоровье', '+300%'].every((x) => txt.includes(x)));
  check('арт загрузился', await ev(() => { const i = document.querySelector('#modal .uqart img'); return i && i.complete && i.naturalWidth > 0; }));
  await shot('card');
  await ev(() => { const m = document.querySelector('#modal .cxbox.px'); if (m) m.scrollIntoView({ block: 'start' }); }); await page.waitForTimeout(250); await shot('props');
  await ev(() => { const m = document.querySelector('#modal .cxbox.pd'); if (m) m.scrollIntoView({ block: 'start' }); }); await page.waitForTimeout(250); await shot('system');
  await ev(() => __RPG.UI.closeModal()); await page.waitForTimeout(150);
  await ev(() => { __RPG.UI.modal(__RPG.UI.rarInfoHtml(), { cls: 'tall' }); }); await page.waitForTimeout(300);
  check('справка: «До существования» открыто (клинок есть)', await ev(() => { const r = [...document.querySelectorAll('#modal .rinfo')]; return r[10] && !r[10].classList.contains('lockd') && /Нулевой Возможности/.test(r[10].textContent); }));
  await ev(() => { const r = [...document.querySelectorAll('#modal .rinfo')][10]; r && r.scrollIntoView({ block: 'center' }); }); await page.waitForTimeout(200); await shot('rarity');
  await ev(() => __RPG.UI.closeModal());
  // подземелья: «⚫ Существование отрицается»
  await ev(() => { __RPG.UI.tab = 'dun'; __RPG.UI.refresh(); }); await page.waitForTimeout(400);
  const dz = await ev(() => [...document.querySelectorAll('.dcard .dnz')].map((e) => e.closest('.dcard').dataset.id + ':' + e.textContent));
  check('подземелья: метка «⚫ Существование отрицается» без таймера', dz.length === 2 && dz.every((x) => /⚫ Существование отрицается/.test(x) && !/\d\d:\d\d/.test(x)), JSON.stringify(dz));
  await ev(() => { const e = document.querySelector('.dcard[data-id="wood"]'); e && e.scrollIntoView({ block: 'center' }); }); await page.waitForTimeout(200); await shot('dungeons');
  // бой: обе кнопки навыков; Отрицание по кнопке; Возможность — выбор
  await ev(() => { __RPG.UI.p.seenIntro = __RPG.UI.p.seenIntro || {}; __RPG.UI.p.seenIntro.mill = 1; __RPG.UI.p.settings.auto = false; window.scrollTo(0, 0); });
  await page.locator('[data-act="dunOpen"][data-id="mill"]').click(); await page.waitForTimeout(300); await page.locator('[data-act="prepTier"][data-i="0"]').click(); await page.waitForTimeout(200); await page.locator('[data-act="dunGo"]').click(); await page.waitForTimeout(600);
  await ev(() => { const r = __RPG.UI.slot().run; const i = r.nodes.findIndex((n) => n.t === 'b' && n.e && n.e.length >= 2); r.node = Math.max(0, i); __RPG.UI.closeModal(); __RPG.UI.act.runNext(); });
  await page.waitForSelector('#battle', { timeout: 6000 });
  await page.waitForSelector('[data-act="bSkill"][data-id="x_deny"]', { timeout: 15000 }).catch(() => {});
  const btns = await ev(() => ['x_deny', 'x_restore'].map((id) => { const b = document.querySelector(`[data-act="bSkill"][data-id="${id}"]`); return b ? (b.classList.contains('pxs') ? 'px' : '') + (b.classList.contains('off') ? 'off' : 'on') + ':' + b.querySelector('small').textContent : 'none'; }));
  check('бой: обе кнопки навыков (рамка До существования), 💧100, доступны', btns.every((x) => /^pxon:💧100/.test(x)), JSON.stringify(btns));
  await ev(() => { document.querySelectorAll('.tip,.tuthint,.coach').forEach((e) => e.remove()); const g = document.querySelector('.skgrid'); if (g) g.scrollTop = g.scrollHeight; }); await page.waitForTimeout(150); await shot('battle');
  const n0 = await ev(() => ({ foes: __RPG.UI.B.foes.length, den: __RPG.C.deniedList(__RPG.UI.slot()).length, sel: __RPG.UI.B.sel }));
  await page.locator('[data-act="bSkill"][data-id="x_deny"]').click(); await page.waitForTimeout(1600);
  const n1 = await ev(() => ({ foes: __RPG.UI.B.foes.length, den: __RPG.C.deniedList(__RPG.UI.slot()).length, dom: document.querySelectorAll('#foes .unit').length }));
  check('Отрицание существования: враг исчез с поля, запись в сохранении', n1.foes === n0.foes - 1 && n1.den === n0.den + 1 && n1.dom === n1.foes, JSON.stringify([n0, n1]));
  await page.waitForSelector('[data-act="bSkill"][data-id="x_restore"]:not(.off)', { timeout: 15000 }).catch(() => {});
  await ev(() => { const B = __RPG.UI.B; B.party[0].mp = Math.max(B.party[0].mp, 100); }); await page.waitForTimeout(100);
  await page.locator('[data-act="bSkill"][data-id="x_restore"]').click(); await page.waitForTimeout(500);
  const pick = await ev(() => [...document.querySelectorAll('#modal [data-act="restoreChosen"]')].map((e) => e.textContent));
  check('выбор «Возможности существования»: 3 сущности (имя, подземелье, этап), своя помечена «вернётся в этот бой»', pick.length === 3 && pick.some((x) => /вернётся в этот бой/.test(x)) && pick.some((x) => /Старый Хранитель/.test(x) && /этап 9/.test(x)), JSON.stringify(pick));
  await shot('restore');
  await page.locator('#modal [data-act="restoreChosen"]', { hasText: 'вернётся в этот бой' }).click(); await page.waitForTimeout(1500);
  const n2 = await ev(() => { const B = __RPG.UI.B; return { foes: B.foes.length, den: __RPG.C.deniedList(__RPG.UI.slot()).length, full: B.foes.every((f) => f.hp === f.maxHp) }; });
  check('возвращён прямо в бой с полным HP; запись снята', n2.foes === n0.foes && n2.den === n0.den && n2.full, JSON.stringify(n2));
  await ev(() => { const g = document.querySelector('.skgrid'); if (g) g.scrollTop = g.scrollHeight; }); await page.waitForTimeout(300); await shot('restored');
  const sheet = ['card', 'props', 'system', 'rarity', 'battle', 'restore', 'dungeons', 'restored'].map((n) => path.join(outDir, PFX + n + '.jpg'));
  execFileSync('python3', ['-c', `import sys\nfrom PIL import Image\nfs=sys.argv[2:];W,H,C=270,600,4\nR=(len(fs)+C-1)//C\nsh=Image.new('RGB',(C*W,R*H),(16,19,28))\nfor i,f in enumerate(fs):\n  im=Image.open(f).convert('RGB').resize((W,H),Image.LANCZOS);sh.paste(im,((i%C)*W,(i//C)*H))\nsh.save(sys.argv[1],quality=84)`, path.join(outDir, PFX + 'sheet.jpg')].concat(sheet));
  console.log('  📷', path.join(outDir, PFX + 'sheet.jpg'));
  check('нет ошибок JS', !errors.length, errors.slice(0, 3).join(' | '));
  await browser.close(); if (srv) srv.close();
  console.log(`\nPrex-shots: ${ok} ✓, ${bad} ✗`); process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
