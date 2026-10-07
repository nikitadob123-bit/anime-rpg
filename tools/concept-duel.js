/* Дуэль Концептуальных клинков: один и тот же билд (воин ур. 47, обычная экипировка ур. 46), меняется только меч; соло против босса.
   node tools/concept-duel.js [runs=40] [boss=void_sovereign] [lv=55] → ходы героя до победы, доля побед, остаток HP */
const RPG = require('../js/data-core.js');
require('../js/data-stats.js');
['data-maou', 'data-maou2', 'data-prof', 'data-world', 'data-world2', 'data-crew', 'data-theme', 'data-story', 'data-story2', 'data-story3', 'data-romance', 'portrait', 'engine', 'stats', 'gear', 'combat', 'crew', 'save'].forEach((f) => require('../js/' + f + '.js'));
const D = RPG.D, E = RPG.E, C = RPG.C;
const N = +process.argv[2] || 40, BOSS = process.argv[3] || 'void_sovereign', LV = +process.argv[4] || 55;
const ORDER = ['boundless_source', 'first_flame', 'eden_light', 'abyss_dark', 'hell_heart', 'chronos', 'end_of_all'];
function hero(id) {
  const s = E.newSlot({ name: 'Дуэлянт', race: 'o_street', uniq: 'phoenix', prof1: 'smith', prof2: 'miner' }); s.hero.level = 47;
  const fs = C.fakeSlot('warrior', 47); ['head', 'body', 'boots'].forEach((k) => { s.eq[k] = fs.eq[k]; });
  const it = E.addItem(s, E.makeUnique(id)); E.equip(s, it.id); return s;
}
function duel(id, seed) {
  const s = hero(id), P = C.unitFromSlot(s); const e = C.unitFromEnemy(BOSS, LV, 0, false, 'e0');
  const B = C.create([P], [e], E.rng(seed), { auto: true, noFlee: true }); let g = 0;
  while (!B.over && g++ < 3000) { const u = C.next(B); if (u) C.act(B, u, C.choose(B, u)); }
  return { win: B.over === 'win', turns: P.turns, hp: P.alive ? P.hp / P.maxHp : 0 };
}
const out = {};
ORDER.forEach((id) => { let w = 0, t = 0, h = 0, tw = 0; for (let i = 0; i < N; i++) { const r = duel(id, 1000 + i * 7919); if (r.win) { w++; tw += r.turns; } t += r.turns; h += r.hp; } out[id] = { n: D.UNIQUE_ITEMS[id].nm, win: w / N, turnsToWin: w ? +(tw / w).toFixed(1) : null, hpLeft: +(h / N).toFixed(2) }; });
console.log(`Босс ${BOSS} ур.${LV}, ${N} боёв на клинок:`);
ORDER.forEach((id) => { const o = out[id]; console.log(`  ${o.n.padEnd(22)} победы ${(o.win * 100).toFixed(0).padStart(3)}%  ходов до победы ${String(o.turnsToWin).padStart(5)}  HP в конце ${o.hpLeft}`); });
if (process.argv.includes('--json')) console.log(JSON.stringify(out));
