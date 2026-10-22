/* v2.26 «Испытания»: Башня, Арена, Тренировочный зал, миграция v10→v11. */
const assert = require('assert');
const RPG = require('../js/data-core.js'); require('../js/data-stats.js');
['data-maou', 'data-maou2', 'data-prof', 'data-world', 'data-world2', 'data-crew', 'data-theme', 'data-story', 'data-story2', 'data-story3', 'data-romance', 'portrait', 'engine', 'stats', 'gear', 'combat', 'crew', 'save', 'artifact', 'dungeons-sp', 'pets', 'allies', 'data-craft-icons', 'craft', 'goals', 'challenge'].forEach((f) => require('../js/' + f + '.js'));
const { D, E, C, S } = RPG;
let pass = 0, fail = 0; const t = (n, f) => { try { f(); pass++; } catch (e) { fail++; console.log('  ✗', n, '\n     ', e.message); } };
const N0 = new Date(2026, 9, 21, 12).getTime(), DAY = 86400e3;   // среда
const mk = (L) => { const s = E.newSlot({ name: 'Исп', race: 'o_street', uniq: 'phoenix', prof1: 'smith', prof2: 'miner', now: N0 }); s.hero.level = L || 60; const r = E.rng(3); ['sword', 'head_h', 'body_h', 'boots_h'].forEach((b) => { const it = E.genItem(r, { base: b, il: s.hero.level, rarity: 4 }); E.addItem(s, it); E.equip(s, it.id); }); return s; };
const auto = (B) => { let n = 0; while (!B.over && n++ < 5000) { const u = C.next(B); if (u) C.act(B, u, C.choose(B, u)); } if (!B.over) B.over = 'lose'; return B; };
console.log('Испытания');
t('Башня: 100 этажей, враги сильнее с этажом, страж каждые 10 и элита каждые 5', () => {
  assert.strictEqual(D.TOWER_MAX, 100); assert.strictEqual(E.towerKind(10), 'boss'); assert.strictEqual(E.towerKind(5), 'mini'); assert.strictEqual(E.towerKind(7), 'fight');
  const hp = (f) => E.towerFoes(f).reduce((a, u) => a + u.maxHp, 0); assert(hp(50) > hp(10) && hp(100) > hp(50)); assert(E.towerLv(100) > E.towerLv(1));
  for (let f = 1; f <= 100; f++) { const fs = E.towerFoes(f); assert(fs.length >= 2 && fs.every((u) => u.side === 'e' && u.maxHp > 0), 'f' + f); }
});
t('Башня: награда только за первое прохождение; каждые 5 — материалы, каждые 10 — Знаки и яйцо; опыт не начисляется', () => {
  const s = mk(80); const xp = s.hero.xp; assert(E.towerReward(5).mats && !E.towerReward(4).mats); assert(E.towerReward(10).sig === 1 && E.towerReward(10).egg >= 0); assert(E.towerReward(100).title);
  let wins = 0; for (let i = 0; i < 12; i++) { const B = auto(E.towerBattle(s, { auto: true })); const g = s.gold, r = E.towerFinish(s, B); if (r.result === 'win') { wins++; assert(s.gold > g); } }
  assert(wins >= 5 && s.tower.best >= 5, 'best ' + s.tower.best); assert.strictEqual(s.hero.xp, xp);
  const B = E.towerBattle(s, { auto: true }); B.over = 'win'; B.tower = 1; const g = s.gold; E.towerFinish(s, B); assert.strictEqual(s.gold, g, 'повтор — без награды');
  s.run = {}; assert(E.towerBattle(s).err); delete s.run; s.run = null;
});
t('Арена: 3 соперника (слабее/равный/сильнее), сила растёт, рейтинг ±, лимит боёв в день', () => {
  const s = mk(); const a = E.arenaEnsure(s, N0); assert.strictEqual(a.rivals.length, 3); assert.strictEqual(a.rating, 1000);
  const p = a.rivals.map((rv) => E.arenaPower(s, rv)); assert(p[2] > p[0], p.join());
  const B = E.arenaBattle(s, 1, { auto: true }, N0); assert(B.foes.length >= 2 && B.foes.every((u) => u.side === 'e')); auto(B); const r = E.arenaFinish(s, B);
  assert(r.result === 'win' ? s.arena.rating === 1020 : s.arena.rating === 992);
  const b2 = E.arenaBattle(s, 0, {}, N0); b2.over = 'lose'; E.arenaFinish(s, b2); b2.over = 'win';
  s.arena.n = D.ARENA_DAY; assert(E.arenaBattle(s, 0, {}, N0).err); E.arenaEnsure(s, N0 + DAY); assert.strictEqual(s.arena.n, 0);
});
t('Арена: в понедельник рейтинг сбрасывается, награда лиги прошлой недели выдаётся один раз', () => {
  const s = mk(); E.arenaEnsure(s, N0); s.arena.rating = 1300; s.arena.w = 9; E.arenaEnsure(s, N0 + 6 * DAY);
  assert.strictEqual(s.arena.rating, 1000); assert(s.arena.pend && s.arena.pend.tier === 2); const g = s.gold, r = E.arenaClaimWeek(s); assert(!r.err && s.gold > g); assert(E.arenaClaimWeek(s).err);
  assert.strictEqual(E.arenaTier(1700), 4); assert.strictEqual(E.arenaTier(999), 0);
});
t('Зал: энергия тратится и восстанавливается (+1/30 мин, до 20), +1 к характеристике, предел min(30, ур/3)', () => {
  const s = mk(60); s.gold = 1e7; const st0 = E.collect(s).stats.str; assert.strictEqual(s.train.en, 20);
  assert.strictEqual(E.train(s, 'str', N0), ''); assert.strictEqual(s.train.en, 18); assert.strictEqual(E.collect(s).stats.str, st0 + 1);
  for (let i = 0; i < 9; i++) E.train(s, 'str', N0); assert.strictEqual(s.train.en, 0); assert(E.trainWhy(s, 'str', N0).includes('энерг'));
  E.trainEnsure(s, N0 + 60 * 60e3); assert.strictEqual(s.train.en, 2); E.trainEnsure(s, N0 + 30 * 3600e3); assert.strictEqual(s.train.en, 20);
  s.train.pts.str = E.trainCap(s); assert.strictEqual(E.trainCap(s), 20); assert(E.trainWhy(s, 'str', N0 + 30 * 3600e3).includes('Предел'));
  const s2 = mk(300); assert.strictEqual(E.trainCap(s2), 30); assert(E.trainGold(s, 'agi') < E.trainGold(s, 'str'));
});
t('миграция v10→v11 и новые слоты', () => {
  assert(S.VERSION >= 11); const s = mk(); delete s.tower; delete s.arena; delete s.train; s.gold = 1234;
  const out = S.migrations[10]({ v: 10, slots: [s, null] }); const m = out.slots[0]; assert.strictEqual(out.v, 11);
  assert(m.tower.best === 0 && m.arena.rating === 1000 && m.train.en === 20 && m.gold === 1234 && out.slots[1] === null);
});
console.log(`\nИспытания: ${pass} ✓, ${fail} ✗`); process.exit(fail ? 1 : 0);
