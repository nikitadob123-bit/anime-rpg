/* E2E + снимки Регресс боёв v2.26: вылазка, бой главы сюжета, особые подземелья (Золото/Материалы/Артефакты), участие питомца и союзника. node tools/regress-battle.js [url] */
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { serve } = require('./serve.js');
const outDir = process.env.SHOTS || '/workspace/shots-reg'; fs.mkdirSync(outDir, { recursive: true });
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
  const shot = async (n) => { const raw = path.join(outDir, '.raw-' + n + '.png'), out = path.join(outDir, 'reg-' + n + '.jpg'); await page.screenshot({ path: raw });
    execFileSync('python3', ['-c', `from PIL import Image\nim=Image.open(${JSON.stringify(raw)}).convert('RGB')\nim.save(${JSON.stringify(out)},quality=82)`]); fs.unlinkSync(raw); console.log('  📷', out, Math.round(fs.statSync(out).size / 1024) + ' КБ'); };
  const ev = (f, a) => page.evaluate(f, a);
  await page.route(/\/mail\/inbox\.json/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ letters: [] }) }));
  await page.goto(url, { waitUntil: 'load' }); await page.waitForTimeout(1200);
  await ev(() => {
    const { UI, S, E, D, story: ST } = __RPG;
    const p = S.newProfile('Регресс', '⚔️'); const s = E.newSlot({ name: 'Кайрон', race: 'o_street', uniq: 'shadowdance', prof1: 'smith', prof2: 'miner', now: Date.now() }); s.hero.profLocked = true; s.tut = { guide: 1, bt: 1 };
    p.slots[0] = s; ['prologue'].concat(ST.sceneIds(1), ST.sceneIds(2)).forEach((id) => E.finishScene(s, id)); s.story.flags.prologue_done = 1;
    s.hero.level = 40; const rng = E.rng(9); ['sword', 'head_h', 'body_h', 'boots_h', 'ring', 'amulet'].forEach((b) => { try { const it = E.genItem(rng, { base: b, il: 40, rarity: 5 }); E.addItem(s, it); E.equip(s, it.id); } catch (e) { } });
    E.petGain(s, 'ember_dragon'); E.petEquip(s, 'ember_dragon'); E.artGain(s, 'supernova_heart'); E.recruit(s, 'gen1'); s.party = ['gen1', 'asteria'];
    p.settings.auto = true; p.settings.battleSpeed = 3; p.settings.tutorial = false; S.save(p); UI.p = p; p.active = 0; UI.enterGame();
  });
  await page.waitForTimeout(1500); await ev(() => __RPG.UI.closeModal && __RPG.UI.closeModal());
  async function drive(maxMs) {
    const t0 = Date.now(); const seen = { party: new Set(), battles: 0, ended: false };
    while (Date.now() - t0 < maxMs) {
      if (await page.locator('#story').count()) { const sk = page.locator('#sSkip'); if (await sk.count()) await sk.click().catch(() => {}); if (await page.locator('.schoice.on .choice').count()) await page.locator('.schoice.on .choice').first().click().catch(() => {}); if (await page.locator('#dlg').count()) await page.locator('#dlg').click({ force: true, timeout: 500 }).catch(() => {}); await page.waitForTimeout(120); continue; }
      if (await page.locator('#modal.on').count()) { seen.bt = 0;
        const sel = ['#btnBtDone', '#runDone', '[data-act="evOk"]', '[data-act="shrineP"]', '[data-act="allyChosen"]', '[data-act="restoreChosen"]'];
        let hit = false; for (const q of sel) { if (await page.locator('#modal.on ' + q).count()) { if (q === '#btnBtDone') seen.battles++; if (q === '#runDone') seen.ended = true; await page.locator('#modal.on ' + q).first().click().catch(() => {}); hit = true; break; } }
        if (!hit) await ev(() => __RPG.UI.closeModal());
        await page.waitForTimeout(250); if (seen.ended) return seen; continue;
      }
      if (await page.locator('#battle').count()) { if (Date.now() - (seen.bt || (seen.bt = Date.now())) > 60000 && !seen.dbg) { seen.dbg = 1; console.log('STUCK', JSON.stringify(await ev(() => { const B = __RPG.UI.B; return B && { over: B.over, cur: B.cur && B.cur.id, units: B.units.map((u) => [u.id, u.side, u.alive, u.hp, u.role, u.name]), round: B.round }; }))); } const names = await ev(() => [(document.querySelector('#party') || {}).innerText || '']); names.forEach((n) => seen.party.add(n)); await page.waitForTimeout(250); continue; }
      if (await page.locator('#btnRunNext').count()) { await page.locator('#btnRunNext').click().catch(() => {}); await page.waitForTimeout(300); continue; }
      if (!(await ev(() => !!__RPG.UI.slot().run))) return seen;
      await ev(() => { __RPG.UI.tab = 'dun'; __RPG.UI.render(); }); await page.waitForTimeout(300);
    }
    return seen;
  }
  const snap = () => ev(() => { const s = __RPG.UI.slot(); return { xp: s.hero.xp + s.hero.level * 1e9, gold: s.gold, mats: Object.values(s.mats).reduce((a, b) => a + b, 0), runs: s.stats.runs, kills: s.stats.kills, wins: s.stats.wins, bond: s.pets.ember_dragon.bxp, food: s.petFood, eggs: Object.values(s.eggs).reduce((a, b) => a + b, 0), arts: Object.keys(s.arts).length, artDrops: s.artProg.drops, cleared: JSON.stringify(s.prog.cleared), alyXp: s.crew.asteria.xp + s.crew.asteria.lv * 1e9, genXp: s.crew.gen1.xp + s.crew.gen1.lv * 1e9 }; });
  async function runDun(label, did, force) {
    await ev(([d, f]) => { const { UI, E } = __RPG; const s = UI.slot(); s.run = null; s.hero.hpCur = null; if (f) { const o = E.dungeonUnlocked; E.dungeonUnlocked = (sl, x) => (x === d ? true : o(sl, x)); } UI.closeModal(); UI.tab = 'dun'; UI.render(); UI.prep = { did: d, tier: 0, buffs: {} }; UI.prepModal(); }, [did, !!force]);
    await page.waitForTimeout(300); const a = await snap(); await shot(label + '-0-prep');
    await page.locator('#btnDunGo').click(); await page.waitForTimeout(500);
    const started = await ev(() => !!__RPG.UI.slot().run); check(label + ': вылазка начата', started);
    let shotB = false; const t0 = Date.now(); const r = await (async () => { const d0 = drive(240000); return d0; })(); if (!shotB) {}
    const b = await snap(); const pj = [...r.party];
    check(label + ': бои пройдены и вылазка завершена', r.ended && r.battles >= 1, 'battles=' + r.battles);
    check(label + ': опыт героя начислен', b.xp > a.xp); check(label + ': добыча (золото) получена', b.gold > a.gold, (b.gold - a.gold) + '');
    check(label + ': счётчики вылазок/побед/убийств', b.runs === a.runs + 1 && b.kills > a.kills);
    check(label + ': союзница Астерия и Ильвара в отряде боя', pj.some((n) => /Астерия/.test(n)) && pj.some((n) => /Ильвар/.test(n)), pj.join(','));
    check(label + ': Свита и союзник получили опыт', b.alyXp > a.alyXp && b.genXp > a.genXp);
    check(label + ': питомец — узы растут на победе над боссом', b.bond > a.bond || b.wins === a.wins, `bond ${a.bond}→${b.bond}, wins ${a.wins}→${b.wins}`);
    check(label + ': вернулись в город, вылазки нет', await ev(() => !__RPG.UI.slot().run));
    await shot(label + '-1-after'); return { a, b };
  }
  // питомец в бою: статы героя с питомцем выше
  check('питомец даёт статы герою в бою', await ev(() => { const { E, C, UI } = __RPG; const s = UI.slot(), u1 = C.unitFromSlot(s), eq = s.petEq; s.petEq = null; const u0 = C.unitFromSlot(s); s.petEq = eq; return u1.atk + u1.maxHp > u0.atk + u0.maxHp; }));
  await runDun('1-expedition', 'mill');
  const chDun = await ev(() => (__RPG.D.CHAPTERS[4].battle || {}).dun || '');
  check('глава 4: подземелье главы найдено', !!chDun, chDun);
  if (chDun) { await runDun('2-story-ch4', chDun, true); check('глава 4: подземелье отмечено пройденным', await ev((d) => !!__RPG.UI.slot().prog.cleared[d], chDun)); }
  { const { a, b } = await runDun('3-gold', 'gold1'); check('Подземелье Золота: этап 1 пройден', JSON.parse(b.cleared).gold1 >= 1); }
  { const { a, b } = await runDun('4-mats', 'matd1'); check('Подземелье Материалов: материалы получены', b.mats > a.mats); }
  { const { a, b } = await runDun('5-artd', 'artd1'); check('Подземелье Артефактов: этап пройден (артефакт/знаки по шансу)', JSON.parse(b.cleared).artd1 >= 1, `arts ${a.arts}→${b.arts}`); }
  check('нет ошибок JS', errors.length === 0, errors.slice(0, 3).join(' | '));
  await browser.close(); if (srv) srv.close(); console.log(`\nregress-battle: ${ok} ✓, ${bad} ✗`); process.exit(bad ? 1 : 0);
})();
