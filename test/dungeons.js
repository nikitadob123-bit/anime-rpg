/* v2.18 «Подземелье Золота» / «Подземелье Материалов»: открытие, порядок этапов, рост наград и уровней, выдача наград стража. node test/dungeons.js */
const assert = require('assert');
const RPG = require('../js/data-core.js'); require('../js/data-stats.js');
['data-maou', 'data-maou2', 'data-prof', 'data-world', 'data-world2', 'data-crew', 'data-theme', 'data-story', 'data-story2', 'data-story3', 'data-romance', 'portrait', 'engine', 'stats', 'gear', 'combat', 'crew', 'save', 'artifact', 'dungeons-sp', 'pets', 'allies', 'data-craft-icons', 'craft', 'goals', 'challenge'].forEach((f) => require('../js/' + f + '.js'));
const { D, E, C } = RPG;
let pass = 0, fail = 0; const t = (n, f) => { try { f(); pass++; } catch (e) { fail++; console.log('  ✗', n, '\n     ', e.message); } };
const mk = (L) => { const s = E.newSlot({ name: 'Зол', race: 'o_street', uniq: 'phoenix', prof1: 'smith', prof2: 'miner' }); s.hero.level = L; s.story.flags.prologue_done = 1; return s; };
const G = D.SP_DUNS.gold.stages, M = D.SP_DUNS.mats.stages;
const winBoss = (s, d) => { assert(!E.startRun(s, d.id, 0)); s.run.node = s.run.nodes.length - 1; const B = C.startNodeBattle(s); B.foes.forEach((f) => { f.alive = false; f.hp = 0; }); B.over = 'win'; return C.finishBattle(s, B); };

t('по 10 этапов; Золото ур. 10→100, Материалы ур. 10→300 (боевой уровень как у Подземелья Артефактов, финал 130)', () => {
  assert.strictEqual(G.length, 10); assert.strictEqual(M.length, 10);
  assert.strictEqual(G[0].ur, 10); assert.strictEqual(G[9].ur, 100); assert.strictEqual(M[0].ur, 10); assert.strictEqual(M[9].ur, 300); assert.strictEqual(M[9].lv, 130);
  [G, M].forEach((L) => L.forEach((d, i) => { assert(d.hidden && D.DUN[d.id]); if (i) { assert(d.ur > L[i - 1].ur && d.lv > L[i - 1].lv && d.mul > L[i - 1].mul, d.id); } }));
});
t('открытие: закрыто до 10 ур.; этапы строго по порядку', () => {
  const s9 = mk(9); assert(!E.spStageOpen(s9, 'gold', 0)); assert(!E.dungeonUnlocked(s9, G[0].id)); assert(E.startRun(s9, M[0].id, 0));
  const s = mk(10); assert(E.spStageOpen(s, 'gold', 0) && E.spStageOpen(s, 'mats', 0)); assert(!E.spStageOpen(s, 'gold', 1)); assert(!E.dungeonUnlocked(s, G[1].id));
  s.prog.cleared[G[0].id] = 1; assert(E.spStageOpen(s, 'gold', 1)); assert(!E.spStageOpen(s, 'gold', 2)); assert(!E.spStageOpen(s, 'mats', 1));
});
t('золото стража строго растёт (сильное масштабирование ≥×30), враги дают больше монет', () => {
  D.GOLD_STAGE.forEach((g, i) => { if (i) assert(g > D.GOLD_STAGE[i - 1] * 1.4); }); assert(D.GOLD_STAGE[9] >= D.GOLD_STAGE[0] * 30); assert(D.GOLD_KILL_K > 1);
  assert(D.GOLD_STAGE[9] < 50000, 'не дороже смены профессии');
});
t('качество материалов растёт по этапам; божественные (q7) только на 2 последних', () => {
  D.MAT_STAGE.forEach((m, i) => { if (i) { assert(m[0] >= D.MAT_STAGE[i - 1][0] && m[1] >= D.MAT_STAGE[i - 1][1]); } assert.strictEqual(m[1] === 7, i >= 8, 'stage ' + i); });
  assert.deepStrictEqual(D.MAT_DIVINE_STAGES, [8, 9]);
  const q = (id) => D.MAT_POOL.findIndex((p) => p.includes(id)); D.MAT_POOL.flat().forEach((id) => assert(D.MATS[id], id));
  for (let i = 0; i < 10; i++) for (let k = 0; k < 30; k++) { const r = E.matStageRoll(i, E.rng(i * 100 + k)); assert(Object.keys(r).length); for (const id in r) { assert(q(id) >= D.MAT_STAGE[i][0] && q(id) <= D.MAT_STAGE[i][1]); if (q(id) === 7) assert(i >= 8); } }
});
t('победа над стражем: золото / материалы в сумку, этап пройден, следующий открыт', () => {
  const s = mk(10), rep = winBoss(s, G[0]); assert.strictEqual(rep.spGold, D.GOLD_STAGE[0]); assert(s.run.bag.gold >= D.GOLD_STAGE[0]); assert(s.prog.cleared[G[0].id]); assert(E.spStageOpen(s, 'gold', 1));
  const g0 = s.gold; E.claimRun(s, 'win'); assert(s.gold - g0 >= D.GOLD_STAGE[0]);
  const s2 = mk(10), r2 = winBoss(s2, M[0]); assert(r2.spMats && Object.keys(r2.spMats).length); for (const k in r2.spMats) assert(s2.run.bag.mats[k] >= r2.spMats[k]);
});
console.log(`\nПодземелья Золота/Материалов: ${pass} ✓, ${fail} ✗`); if (fail) process.exit(1);
