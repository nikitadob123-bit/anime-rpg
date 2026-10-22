/* v2.17 «Артефакты»: данные, статы (полы по редкости), выпадение (этапы, уникальность Мировых), спутницы, Свита, миграция. node test/artifact.js */
const assert = require('assert');
const RPG = require('../js/data-core.js'); require('../js/data-stats.js');
['data-maou', 'data-maou2', 'data-prof', 'data-world', 'data-world2', 'data-crew', 'data-theme', 'data-story', 'data-story2', 'data-story3', 'data-romance', 'portrait', 'engine', 'stats', 'gear', 'combat', 'crew', 'save', 'artifact', 'dungeons-sp', 'pets', 'allies', 'data-craft-icons', 'craft', 'goals', 'challenge'].forEach((f) => require('../js/' + f + '.js'));
const { D, E, C, S } = RPG;
let pass = 0, fail = 0; const t = (n, f) => { try { f(); pass++; } catch (e) { fail++; console.log('  ✗', n, '\n     ', e.message); } };
const mk = (L) => { const s = E.newSlot({ name: 'Арт', race: 'o_street', uniq: 'phoenix', prof1: 'smith', prof2: 'miner' }); s.hero.level = L || 30; s.story.flags.prologue_done = 1; return s; };
const main = (a, st) => Math.max(st.atk || 0, st.mag || 0);

t('3 артефакта на каждую редкость Обычный…Божественный и 5 Мировых; у всех имя, лор, пассив, навык', () => {
  for (let r = 0; r < 8; r++) assert.strictEqual(D.ARTIFACTS.filter((a) => a.r === r).length, 3, 'r' + r);
  assert.strictEqual(D.ART_WORLD_IDS.length, 5); assert.strictEqual(D.ART_RAR[8].n, 'Мировой');
  D.ARTIFACTS.forEach((a) => { assert(a.n && a.lore && a.pas.length && a.sk.length, a.id); a.sk.forEach((k) => assert(D.SKILLS[k] && D.SKILLS[k].fx.length, k)); assert(/^assets\/artifacts\/icons\/t\//.test(a.icon128)); });
  D.ART_RAR.slice(0, 8).forEach((r, i) => assert.strictEqual(r.n, D.RARITY[i].n));
});
t('пол статов: Обычный ≥ Мифического оружия ур. 80; Божественный ≈ Концептуальный; Мировой — до уровня Истока', () => {
  const myth = E.genItem(E.rng(1), { base: 'sword', il: 80, rarity: 6 }).st.atk, mythArmor = E.genItem(E.rng(1), { base: 'body_h', il: 80, rarity: 6 }).st.def;
  const concept = D.UNIQUE_ITEMS.eden_light.st.atk, origin = Math.min(...['prime_cause', 'zero_law', 'first_division'].filter((id) => D.UNIQUE_ITEMS[id]).map((id) => D.UNIQUE_ITEMS[id].st.atk));
  D.ARTIFACTS.forEach((a) => { const st = E.artStats(a.id, 0);
    if (a.foc === 'def') assert(st.def >= mythArmor * 0.95, a.id + ' def ' + st.def); else assert(main(a, st) >= (a.foc === 'hyb' ? myth * 0.6 : myth * 0.98), a.id + ' ' + main(a, st));
    if (a.r === 7 && a.foc !== 'def' && a.foc !== 'hyb') assert(main(a, st) >= concept * 0.95, a.id);
  });
  const worldMax = Math.max(...D.ART_WORLD_IDS.map((id) => main(D.ART[id], E.artStats(id, 0))));
  assert(worldMax >= origin * 0.95, 'Мировой ' + worldMax + ' vs Исток ' + origin);
  for (let r = 1; r <= 8; r++) assert(D.ART_RAR[r].k > D.ART_RAR[r - 1].k);
  assert(E.artStats('lantern', 5).atk > E.artStats('lantern', 0).atk);
});
t('надетый артефакт повышает характеристики героя, даёт моды и навыки в бою', () => {
  const s = mk(60), d0 = E.derive(s); E.artGain(s, 'dawn_lance'); assert.strictEqual(E.artEquip(s, 'dawn_lance'), '');
  const d1 = E.derive(s); assert(d1.atk > d0.atk + 400 && d1.maxHp > d0.maxHp); assert(d1.mods.dmg_light >= 25);
  const u = C.unitFromSlot(s); assert(u.sk.includes('ak_lance'));
  assert.strictEqual(E.artEquip(s, 'halo_shard'), 'Нет такого артефакта');
});
t('выпадение: Божественные и Мировые — только на двух последних этапах', () => {
  const s = mk(100), N = D.ART_STAGES.length;
  for (let i = 0; i < N; i++) { const rng = E.rng(1000 + i); for (let k = 0; k < 3000; k++) { const id = E.rollArtifact(s, i, rng); if (!id) continue; const r = D.ART[id].r; if (i < N - 2) assert(r < 7, 'этап ' + (i + 1) + ': ' + id); } }
  D.ART_DROP.forEach((row, i) => { if (i < N - 2) assert(!row[7] && !row[8], 'строка ' + i); else assert(row[7] > 0 && row[8] > 0); assert(row.reduce((a, b) => a + b, 0) < 100); });
  assert.deepStrictEqual(D.ART_DIVINE_STAGES, [N - 2, N - 1]);
  // редкие — реже: шанс не растёт с редкостью на последнем этапе
  const last = D.ART_DROP[N - 1].filter(Boolean); for (let j = 1; j < last.length; j++) assert(last[j] <= last[j - 1]);
});
t('Мировые уникальны: повтор отклоняется, уже полученные исключены из выпадения', () => {
  const s = mk(100); const r1 = E.artGain(s, 'first_clock'); assert(r1.isNew); const r2 = E.artGain(s, 'first_clock'); assert(r2.refused); assert.strictEqual(s.arts.first_clock, 0);
  D.ART_WORLD_IDS.forEach((id) => E.artGain(s, id));
  const rng = E.rng(9); for (let k = 0; k < 5000; k++) { const id = E.rollArtifact(s, D.ART_STAGES.length - 1, rng); assert(!id || !D.ART[id].world, id); }
  assert(!E.artDropTable(s, D.ART_STAGES.length - 1).some((x) => x.r === 8));
});
t('дубликаты обычных артефактов → звёзды (до 5), затем знаки и золото', () => {
  const s = mk(); E.artGain(s, 'ember'); for (let i = 1; i <= 5; i++) assert.strictEqual(E.artGain(s, 'ember').star, i);
  const g = s.gold, r = E.artGain(s, 'ember'); assert(r.conv && s.gold > g && s.mats.asc_sigil > 0); assert.strictEqual(s.arts.ember, 5);
});
t('Мировые артефакты-спутницы: «Сердце Сверхновой» → Астерия, «Ключ Сокровищницы» → Гримхильда', () => {
  const s = mk(80); const r = E.artGain(s, 'supernova_heart'); assert.strictEqual(r.comp, 'asteria'); assert(s.crew.asteria); E.artGain(s, 'hoard_key'); assert(s.crew.grimhild);
  assert(!s.rom.asteria, 'без романтики'); const u = C.unitFromCrew(s, 'grimhild'); assert(u.maxHp > 0 && u.atk > 0);
  assert.strictEqual(D.ARTIFACTS.filter((a) => a.comp).length, 2);
});
t('Подземелье Артефактов: с ур. 30, этапы по порядку, ур. до 300, скрыто из общего списка', () => {
  const s = mk(29); assert(!E.dungeonUnlocked(s, 'artd1')); s.hero.level = 30; assert(E.dungeonUnlocked(s, 'artd1')); assert(!E.dungeonUnlocked(s, 'artd2'));
  s.prog.cleared.artd1 = 1; assert(E.dungeonUnlocked(s, 'artd2'));
  assert.strictEqual(D.ART_STAGES[0].ur, 30); assert.strictEqual(D.ART_STAGES[D.ART_STAGES.length - 1].ur, 300); assert(D.ART_STAGES.every((d) => d.hidden && !E.dungeonVisible(s, d.id)));
  for (let i = 1; i < D.ART_STAGES.length; i++) assert(D.ART_STAGES[i].lv > D.ART_STAGES[i - 1].lv);
  assert.strictEqual(E.startRun(s, 'artd1', 0), ''); const foes = C.nodeEnemies(s.run, s.run.nodes[0]); assert(foes.length && foes[0].lv >= 30);
});
t('победа над стражем этапа: прохождение, знаки возвышения и бросок артефакта', () => {
  const s = mk(100); s.prog.cleared = {}; for (let i = 1; i <= 9; i++) s.prog.cleared['artd' + i] = 1;
  let got = 0; for (let k = 0; k < 40; k++) { const sl = JSON.parse(JSON.stringify(s)); sl.stats.runs = k; E.startRun(sl, 'artd10', 0); sl.run.node = sl.run.nodes.findIndex((n) => n.t === 'boss');
    const B = C.startNodeBattle(sl); B.foes.forEach((f) => { f.alive = false; f.hp = 0; }); B.over = 'win'; const rep = C.finishBattle(sl, B); assert(rep.art && rep.artSig > 0 && sl.prog.cleared.artd10); if (!rep.art.none) got++; }
  assert(got >= 1 && got < 40, 'выпало ' + got + '/40');
});
t('Свита: возвышение, мастерство, узы, экспедиции, поддержка', () => {
  const s = mk(60); E.recruit(s, 'gen1'); E.recruit(s, 'grak'); s.party = ['gen1']; const st = s.crew.grak; st.lv = 20; s.gold = 1e6; s.mats.asc_sigil = 50;
  const cap0 = E.crewCap(s, 'grak'), u0 = C.unitFromCrew(s, 'grak');
  assert.strictEqual(E.crewAscend(s, 'grak'), ''); assert.strictEqual(st.star, 1); assert.strictEqual(E.crewCap(s, 'grak'), cap0 + 10); assert(C.unitFromCrew(s, 'grak').atk > u0.atk);
  assert.strictEqual(E.crewSkillUp(s, 'grak'), ''); assert.strictEqual(E.crewSkillUp(s, 'grak'), ''); assert.strictEqual(E.crewSkillUp(s, 'grak'), 'Нужна звезда возвышения'); assert(Object.values(C.unitFromCrew(s, 'grak').skb).every((v) => v >= 10));
  const b0 = E.collect(s).mods.atk || 0; E.addBond(s, 'grak', 100); assert(E.bondLv(st) >= 3); assert((E.collect(s).mods.atk || 0) > b0);
  assert.strictEqual(E.setSupport(s, 'gen1'), 'Уже в отряде'); assert.strictEqual(E.setSupport(s, 'grak'), ''); assert(C.unitFromSlot(s).sk.includes('sup_warrior'));
  E.setParty(s, ['gen1', 'grak']); assert.strictEqual(s.support, null);
  s.party = []; s.prog.cleared.mill = 1; const di = E.MISSION_DUR.findIndex((m) => m.sig); assert(di >= 3); assert.strictEqual(E.sendMission(s, 'grak', 'mill', di, 0), '');
  const sig0 = s.mats.asc_sigil; s.crew.grak.lv = 99; let r; for (let k = 0; k < 1; k++) r = E.collectMission(s, 0, Date.now() + 1e9); assert(r); if (r.ok) assert(s.mats.asc_sigil > sig0);
  assert(E.MISSION_DUR.some((m) => m.min >= 480));
});
t('миграция v6 → v7: старые слоты получают артефакты/Свиту без потерь', () => {
  const s = mk(40); E.recruit(s, 'grak'); delete s.arts; delete s.artEq; delete s.artProg; delete s.support; delete s.crew.grak.star; delete s.crew.grak.skl; delete s.crew.grak.bxp;
  const p = { v: 6, id: 'p1', nick: 'X', settings: S.defaultSettings(), slots: [s, null, null], active: 0, seenIntro: {} };
  const m = S.migrate(JSON.parse(JSON.stringify(p))); assert.strictEqual(m.v, S.VERSION); assert(S.VERSION >= 7); const sl = m.slots[0];
  assert.deepStrictEqual(sl.arts, {}); assert.strictEqual(sl.artEq, null); assert.strictEqual(sl.support, null); assert.strictEqual(sl.crew.grak.star, 0); assert.strictEqual(sl.crew.grak.lv, s.crew.grak.lv);
  assert(E.derive(sl).maxHp > 0);
  // сохранение/загрузка с надетым артефактом
  E.artGain(sl, 'lantern'); sl.artEq = 'lantern'; const back = S.migrate(JSON.parse(JSON.stringify(m))); assert.strictEqual(back.slots[0].artEq, 'lantern');
});
t('иконки 512/128 есть для всех артефактов и превью — в прекэше sw.js', () => { const fs = require('fs'), path = require('path'), sw = fs.readFileSync(path.join(__dirname, '../sw.js'), 'utf8'); D.ARTIFACTS.forEach((a) => { assert(fs.existsSync(path.join(__dirname, '..', a.icon)), a.icon); assert(fs.existsSync(path.join(__dirname, '..', a.icon128)), a.icon128); assert(sw.includes("'" + a.id + "'"), 'sw ' + a.id); }); });
console.log(`Артефакты: ${pass} ✓, ${fail} ✗`); if (fail) process.exit(1);
