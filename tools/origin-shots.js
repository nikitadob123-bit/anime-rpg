/* Снимки клинков Истока v2.13 (тестовый сейв, НЕ лента; клинки доставлены письмами в сейве): карточки (верх + свойства), блок «Общие свойства редкости Исток»,
   справка редкостей, бой с Причинной Меткой и Расщеплением, список подземелий и вылазка со стёртыми врагами → v2130-*.jpg (540×1200), лист v2130-sheet.jpg.
   node tools/origin-shots.js [baseUrl] → $SHOTS или /workspace/shots/ */
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
  let PFX = 'v2130-'; const made = [];
  const shot = async (n) => { const raw = path.join(outDir, '.raw-' + n + '.png'), out = path.join(outDir, PFX + n + '.jpg'); made.push(out); await page.screenshot({ path: raw });
    execFileSync('python3', ['-c', `from PIL import Image\nim=Image.open(${JSON.stringify(raw)}).convert('RGB')\nh=min(1200,im.height)\nim.resize((round(im.width*h/im.height),h),Image.LANCZOS).save(${JSON.stringify(out)},quality=84)`]); fs.unlinkSync(raw); console.log('  📷', out); };
  const ev = (f, a) => page.evaluate(f, a);
  await page.route(/\/mail\/inbox\.json/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ letters: [] }) }));

  const OX = ['prime_cause', 'zero_law', 'first_division'];
  const boot = async (extra) => {
    await page.goto(url, { waitUntil: 'load' }); await page.waitForTimeout(1200);
    await ev(async ([OX, extra]) => {
      const { UI, S, E, M, story: ST } = __RPG;
      const p = S.newProfile('Исток', '🌌'); const s = E.newSlot({ name: 'Кайрон', race: 'o_street', uniq: 'shadowdance', prof1: 'smith', prof2: 'miner', now: Date.now() }); s.hero.profLocked = true; s.tut = { guide: 1, bt: 1 };
      p.slots[0] = s; ['prologue'].concat(ST.sceneIds(1), ST.sceneIds(2), ST.sceneIds(3), ST.auxIds(3)).forEach((id) => E.finishScene(s, id)); s.story.flags.prologue_done = 1; ['mill', 'cathedral', 'spire'].forEach((d) => { s.prog.cleared[d] = 1; s.prog.boss[d] = true; }); s.hero.level = 55; s.gold = 5000;
      M.ensure(s); M.deliver(s, M.parseFeed({ letters: [{ id: 'ox-1', title: 'Исток', from: 'Администрация', to: [M.code(s)], gifts: { unique: OX } }] }).letters); M.claim(s, 'ox-1');
      const it = s.inv.find((x) => x.uq === 'first_division'); E.equip(s, it.id);
      if (extra === 'erased') { const now = Date.now(); s.erased = [{ k: 'mill|0|0', i: 0, eid: 'x', at: now - 200000, until: now + 400000 }, { k: 'mill|0|0', i: 1, eid: 'x', at: now - 200000, until: now + 400000 }, { k: 'mill|0|0', i: 2, eid: 'x', at: now - 200000, until: now + 400000 }, { k: 'mill|0|1', i: 0, eid: 'x', at: now - 60000, until: now + 540000 }, { k: 'cathedral|0|3', i: 1, eid: 'x', at: now - 500000, until: now + 100000 }]; }
      S.save(p); UI.p = p; p.active = 0; UI.enterGame();
    }, [OX, extra || '']);
    await page.waitForTimeout(1500); await ev(() => __RPG.UI.closeModal && __RPG.UI.closeModal());
  };
  await boot();
  check('все 3 клинка Истока получены письмом', await ev((OX) => OX.every((id) => __RPG.E.slotItems(__RPG.UI.slot()).filter((x) => x.uq === id).length === 1), OX));
  await ev(() => { __RPG.UI.tab = 'hero'; __RPG.UI.refresh(); }); await page.waitForTimeout(400);
  check('слот героя: рамка Истока', await page.locator('.eqs.r9 img.uqi.o9').count() === 1);
  for (const uq of OX) {
    const iid = await ev((uq) => __RPG.E.slotItems(__RPG.UI.slot()).find((x) => x.uq === uq).id, uq);
    await ev((iid) => __RPG.UI.itemModal(iid), iid); await page.waitForTimeout(700);
    const txt = await page.locator('#modal').textContent();
    check(uq + ': арт, ◆ особые, ✶ свойства Истока, общие свойства (5), навык, +0/13, без продажи', await page.locator('#modal .uqart.r9 img').count() === 1 && await page.locator('#modal .cxbox.sp .cxrow').count() === 3 && await page.locator('#modal .cxbox.ox .cxrow').count() >= 3 && await page.locator('#modal .cxbox.oc .cxrow').count() === 5 && await page.locator('#modal .cxsk').count() === 1 && await page.locator('#modal [data-act="sellOne"]').count() === 0 && /\+0\/13/.test(txt));
    check(uq + ': арт загрузился', await ev(() => { const i = document.querySelector('#modal .uqart img'); return i && i.complete && i.naturalWidth > 0; }));
    await shot('card-' + uq);
    await ev(() => { const m = document.querySelector('#modal .cxbox.sp'); if (m) m.scrollIntoView({ block: 'start' }); }); await page.waitForTimeout(250); await shot('props-' + uq);
    if (uq === 'first_division') { await ev(() => { const m = document.querySelector('#modal .cxbox.oc'); if (m) m.scrollIntoView({ block: 'start' }); }); await page.waitForTimeout(250); await shot('common'); }
    await ev(() => __RPG.UI.closeModal()); await page.waitForTimeout(150);
  }
  await ev(() => { __RPG.UI.modal(__RPG.UI.rarInfoHtml(), { cls: 'tall' }); }); await page.waitForTimeout(300);
  check('справка: Исток открыт, До существования закрыт', await ev(() => { const r = [...document.querySelectorAll('#modal .rinfo')]; return r[9] && !r[9].classList.contains('lockd') && /Первого Разделения/.test(r[9].textContent) && r[10].classList.contains('lockd'); }));
  await ev(() => { const r = [...document.querySelectorAll('#modal .rinfo')][9]; r && r.scrollIntoView({ block: 'center' }); }); await page.waitForTimeout(200); await shot('rarity');
  await ev(() => __RPG.UI.closeModal());
  // бой: Клинок Первого Разделения (Расщепление после 4 ударов); Причинная Метка на втором враге — как от Клинка Первопричины у спутника (тестовый сейв)
  await ev(() => { __RPG.UI.tab = 'dun'; __RPG.UI.refresh(); }); await page.waitForTimeout(300);
  await ev(() => { __RPG.UI.p.seenIntro = __RPG.UI.p.seenIntro || {}; __RPG.UI.p.seenIntro.mill = 1; __RPG.UI.p.settings.auto = false; });
  await page.locator('[data-act="dunOpen"][data-id="mill"]').click(); await page.waitForTimeout(300); await page.locator('[data-act="dunGo"]').click(); await page.waitForTimeout(600);
  await ev(() => { const r = __RPG.UI.slot().run; const i = r.nodes.findIndex((n) => n.t !== 'ev' && n.e && n.e.length >= 2); r.node = Math.max(0, i >= 0 ? i : r.nodes.findIndex((n) => n.t !== 'ev')); __RPG.UI.closeModal(); __RPG.UI.act.runNext(); });
  await page.waitForSelector('#battle', { timeout: 6000 });
  await page.waitForSelector('[data-act="bSkill"][data-id="x_division"]', { timeout: 15000 }).catch(() => {});
  check('навык «Первое Разделение» в панели боя (рамка Истока)', await page.locator('[data-act="bSkill"][data-id="x_division"].oxs img').count() === 1);
  await ev(() => { const B = __RPG.UI.B; B.foes.forEach((f) => { f.maxHp = f.hp = f.maxHp * 1e5; }); const f2 = B.foes[1] || B.foes[0]; __RPG.C.addSt(B, { id: 'p2', side: 'a', mods: { origin: 1 } }, f2, 'causeMark', 99, 3); B.opts.auto = true; if (B.pending) { const p = B.pending; B.pending = null; p.res(__RPG.C.choose(B, p.u)); } });
  await page.waitForFunction(() => { const B = __RPG.UI.B; return B && B.foes.some((f) => f.st.some((s) => s.id === 'split')); }, null, { timeout: 30000 }).catch(() => {});
  await ev(() => { const B = __RPG.UI.B; if (B) B.opts.auto = false; }); await page.waitForTimeout(700);
  check('Расщепление на враге (после 4 ударов)', await page.locator('.si[title^="Расщепление"]').count() >= 1);
  check('Причинная Метка с уровнем', await page.locator('.si[title^="Причинная Метка 3"], .si[title^="Причинная Метка 4"]').count() >= 1, await ev(() => (document.querySelector('.si[title^="Причинная"]') || {}).title));
  await ev(() => document.querySelectorAll('.tip,.tuthint,.coach').forEach((e) => e.remove())); await shot('battle');
  // список подземелий и вылазка со стёртыми врагами (тестовый сейв с записями slot.erased)
  await boot('erased');
  await ev(() => { __RPG.UI.tab = 'dun'; __RPG.UI.refresh(); }); await page.waitForTimeout(500);
  const badge = await ev(() => { const e = document.querySelector('.dcard[data-id="mill"] .erz'); return e && e.textContent; });
  check('подземелье: «Стёрт из существования · MM:SS»', /Стёрт из существования · \d\d:\d\d/.test(badge || ''), badge);
  await page.waitForTimeout(1100); const badge2 = await ev(() => { const e = document.querySelector('.dcard[data-id="mill"] .erz'); return e && e.textContent; }); check('таймер идёт', badge2 !== badge, badge2);
  await shot('dungeons');
  await ev(() => { __RPG.UI.p.seenIntro.mill = 1; }); await page.locator('[data-act="dunOpen"][data-id="mill"]').click(); await page.waitForTimeout(300); await page.locator('[data-act="prepTier"][data-i="0"]').click(); await page.waitForTimeout(200); await page.locator('[data-act="dunGo"]').click(); await page.waitForTimeout(600); await ev(() => __RPG.UI.closeModal());
  await page.waitForTimeout(300);
  const gone = await ev(() => { const s = __RPG.UI.slot(); return s.run.nodes[0].e.length <= 3 ? document.querySelectorAll('.nd.gone').length : -1; });
  check('вылазка: стёртый этап помечен 🌌', gone >= 1, String(gone)); await shot('run-track');
  const before = await ev(() => { const s = __RPG.UI.slot(); return { node: s.run.node, xp: s.hero.xp, bag: JSON.stringify(s.run.bag), all: __RPG.C.nodeErased(s, s.run, 0) }; });
  await page.locator('#btnRunNext').click(); await page.waitForTimeout(900);
  const after = await ev(() => { const s = __RPG.UI.slot(); return { node: s.run.node, xp: s.hero.xp, bag: JSON.stringify(s.run.bag) }; });
  if (before.all) check('стёртый этап очищен сам, без наград', after.node === before.node + 1 && after.xp === before.xp && after.bag === before.bag, JSON.stringify([before.node, after.node]));
  const sheetFiles = OX.map((u) => path.join(outDir, PFX + 'card-' + u + '.jpg')).concat(OX.map((u) => path.join(outDir, PFX + 'props-' + u + '.jpg')), ['common', 'battle', 'dungeons', 'run-track'].map((n) => path.join(outDir, PFX + n + '.jpg')));
  execFileSync('python3', ['-c', `import sys\nfrom PIL import Image\nfs=sys.argv[2:];W,H,C=270,600,4\nR=(len(fs)+C-1)//C\nsh=Image.new('RGB',(C*W,R*H),(16,19,28))\nfor i,f in enumerate(fs):\n  im=Image.open(f).convert('RGB').resize((W,H),Image.LANCZOS);sh.paste(im,((i%C)*W,(i//C)*H))\nsh.save(sys.argv[1],quality=84)`, path.join(outDir, 'v2130-sheet.jpg')].concat(sheetFiles));
  console.log('  📷', path.join(outDir, 'v2130-sheet.jpg'));
  check('нет ошибок JS', !errors.length, errors.slice(0, 3).join(' | '));
  await browser.close(); if (srv) srv.close();
  console.log(`\nOrigin-shots: ${ok} ✓, ${bad} ✗`); process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
