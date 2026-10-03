/* Симулятор баланса: автобой по всем подземельям для каждого класса. node tools/sim.js [runs] [--fast]
   Считает шанс победы вылазки, время (в боях/ходах), уровень, золото, предметы; сводка в sim-report.json */
const RPG = require('../js/data-core.js'); require('../js/data-prof.js'); require('../js/data-world.js'); require('../js/engine.js'); require('../js/combat.js'); require('../js/data-story.js');
const D = RPG.D, E = RPG.E, C = RPG.C;
const N = +process.argv[2] || 12;
const UNIQ = { warrior: 'echoblade', mage: 'phoenix', rogue: 'shadowdance', healer: 'dawnsong', shield: 'ironwill' };
const PROFS = { warrior: ['smith', 'miner'], mage: ['ench', 'herb'], rogue: ['leath', 'hunt'], healer: ['alch', 'herb'], shield: ['smith', 'miner'] };

function autoSpend(slot) {
  const h = slot.hero; const prio = {
    warrior: ['wA1', 'wC1', 'wB1', 'wB3', 'wA2', 'wC2', 'wB2', 'wA3', 'wB4', 'wA4', 'wC3', 'wB5', 'wA5', 'wC4', 'wB6', 'wC5'],
    mage: ['mC1', 'mA1', 'mB1', 'mB3', 'mB2', 'mA2', 'mC2', 'mC5', 'mA3', 'mB4', 'mC3', 'mC4', 'mA4', 'mB5', 'mA5', 'mB6', 'mC6'],
    rogue: ['rA1', 'rB1', 'rC1', 'rA2', 'rB2', 'rC4', 'rA3', 'rC2', 'rB4', 'rB3', 'rC3', 'rA4', 'rB5', 'rC5', 'rA5', 'rB6', 'rC6'],
    healer: ['hA1', 'hC1', 'hA3', 'hA2', 'hB1', 'hA4', 'hC2', 'hB3', 'hC3', 'hB2', 'hA5', 'hC4', 'hB4', 'hA6', 'hB5', 'hC5'],
    shield: ['sA1', 'sC1', 'sB1', 'sA2', 'sA3', 'sC2', 'sB2', 'sC3', 'sB3', 'sA4', 'sA5', 'sC4', 'sB4', 'sB5', 'sA6', 'sC5']
  }[h.cls];
  let guard = 200; while ((E.sp(h) > 0) && guard--) { let ok = false; for (const id of prio) { if (!E.canLearn(h, id)) { E.learn(h, id); ok = true; break; } } if (!ok) { for (const n of D.TREES[h.cls].nodes) if (!E.canLearn(h, n.id)) { E.learn(h, n.id); ok = true; break; } } if (!ok) break; }
  const un = D.UNIQ[h.uniq].nodes; guard = 100; while (E.up(h) > 0 && guard--) { let ok = false; for (const n of un) if (!E.canLearn(h, n.id)) { E.learn(h, n.id); ok = true; break; } if (!ok) break; }
}
function autoEquip(slot) {
  ['weapon', 'head', 'body', 'boots', 'ring', 'amulet'].forEach(sl => {
    let best = slot.eq[sl], bs = best ? E.itemScore(best) : -1;
    slot.inv.forEach(it => { if (it.sl === sl && E.canUse(slot.hero, it) && E.itemScore(it) > bs) { best = it; bs = E.itemScore(it); } });
    if (best && slot.eq[sl] !== best) E.equip(slot, best.id);
  });
}
function shopping(slot) {
  // как играющий человек: сначала зелья, затем лучшая экипировка из лавки по бюджету, затем улучшения
  const need = Math.max(3, Math.floor(slot.hero.level / 3) + 3);
  ['pot_hp2', 'pot_hp1'].forEach(id => { while ((slot.cons[id] || 0) < need && slot.gold > E.consBuy(id) + 200) E.buyCons(slot, id, 1); });
  if (slot.hero.level >= 10) while ((slot.cons.pot_mp1 || 0) < 2 && slot.gold > 250) E.buyCons(slot, 'pot_mp1', 1);
  const stock = E.shopStock(slot);
  ['weapon', 'head', 'body', 'boots', 'ring', 'amulet'].forEach(sl => {
    const cur = slot.eq[sl]; let bi = -1, bs = cur ? E.itemScore(cur) * 1.05 : 0;
    stock.forEach((it, i) => { if (it.sl === sl && E.canUse(slot.hero, it) && E.itemScore(it) > bs && E.buyPrice(it) <= slot.gold - 100) { bi = i; bs = E.itemScore(it); } });
    if (bi >= 0) { E.buyShopItem(slot, bi); autoEquip(slot); }
  });
}
function sellRest(slot) { slot.inv.filter(it => slot.eq[it.sl] !== it).forEach(it => { if (E.itemScore(it) < (slot.eq[it.sl] ? E.itemScore(slot.eq[it.sl]) : 0) * 1.0 || true) E.sell(slot, it.id); }); }
function playRun(slot, did, tier, stat) {
  if (E.startRun(slot, did, tier)) return 'x';
  const run = slot.run; let result = 'win';
  while (run.node < run.nodes.length) {
    const node = run.nodes[run.node];
    if (node.t === 'ev') { const ch = node.ev === 'shrine' ? (run.hp < E.derive(slot).maxHp * 0.6 ? 'heal' : 'bless') : null; C.resolveEvent(slot, ch); continue; }
    const B = C.startNodeBattle(slot, { auto: true }); let guard = 600;
    while (!B.over && guard--) { C.next(B); }
    const rep = C.finishBattle(slot, B); stat.battles++; stat.turns += B.round;
    if (rep.lvUp) autoSpend(slot);
    if (B.over === 'lose') { result = 'lose'; break; }
    autoEquip(slot);
  }
  E.claimRun(slot, result);
  return result;
}
function simClass(cls, seed) {
  const slot = E.newSlot({ name: 'Sim' + cls + seed, cls, race: 'human', portrait: 'human_m_1', uniq: UNIQ[cls], prof1: PROFS[cls][0], prof2: PROFS[cls][1] });
  slot.story.flags.prologue_done = true; slot.party = ['kairen', 'tika']; slot.shopSeed = seed;
  const log = []; const stat = { battles: 0, turns: 0, wins: 0, losses: 0 };
  let rounds = 0, stuck = 0;
  while (rounds++ < 160 && slot.hero.level < D.LEVEL_CAP) {
    // лучший доступный контент не выше уровня героя (+1)
    if (slot.prog.cleared.spire && !slot.story.done.includes('ch2_f')) slot.story.done.push('ch2_f');
    let best = null; const cands = [];
    D.DUNGEONS.forEach(d => { for (let t = 0; t < 4; t++) { if (!E.dungeonUnlocked(slot, d.id) || !E.tierUnlocked(slot, d.id, t)) continue; cands.push({ did: d.id, t, rec: d.lv + D.TIERS[t].lv + 1, fresh: !slot.prog.cleared[d.id] && t === 0 }); } });
    const lim = slot.hero.level + 1 - Math.min(stuck, 3);
    const fresh = cands.find(c => c.fresh && c.rec <= lim + 1);
    best = fresh || cands.filter(c => c.rec <= lim).sort((a, b) => b.rec - a.rec)[0] || cands.sort((a, b) => a.rec - b.rec)[0];
    if (!best) best = { did: 'mill', t: 0, rec: 0 }; if (!E.dungeonUnlocked(slot, best.did)) break;
    shopping(slot);
    const r = playRun(slot, best.did, best.t, stat);
    autoSpend(slot); autoEquip(slot); sellRest(slot);
    log.push({ did: best.did, tier: best.t, r, lv: slot.hero.level, gold: slot.gold, rec: best.rec });
    if (r === 'win') { stat.wins++; stuck = 0; } else { stat.losses++; stuck++; }
    if (stat.losses > 60) break;
  }
  return { slot, log, stat };
}
if (process.argv.includes('--log')) { for (const cls of D.CLASS_IDS) { const { log, stat, slot } = simClass(cls, 1); console.log(cls, stat); console.log(log.map(l => l.did + '/' + l.tier + (l.r === 'win' ? '+' : '-') + 'L' + l.lv + ' ' + l.gold + 'g').join(' | ')); } process.exit(0); }
const rep = {};
console.log('Симуляция баланса: автобой (игрок + Кайрен + Тика), ' + N + ' прогонов на класс; контент выбирается по уровню героя\n');
const avg = (a) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
for (const cls of D.CLASS_IDS) {
  const byTier = [[], [], [], []], first = {}, lvls = [], runs = [], gold = [], reachT = {}; let battles = 0, turns = 0; 
  for (let s = 1; s <= N; s++) {
    const { slot, log, stat } = simClass(cls, s);
    lvls.push(slot.hero.level); runs.push(stat.wins + stat.losses); battles += stat.battles; turns += stat.turns; gold.push(slot.stats.goldEarned);
    log.forEach((l, i) => { byTier[l.tier].push(l.r === 'win' ? 1 : 0); const key = l.did; if (l.tier === 0 && l.r === 'win') { (first[key] = first[key] || []).push({ run: i + 1, lv: l.lv }); } });
    const lv30 = log.findIndex(l => l.lv >= 30); if (lv30 >= 0) (reachT.l30 = reachT.l30 || []).push(lv30 + 1);
  }
  const wr = byTier.map(a => a.length ? +(avg(a)).toFixed(2) : null);
  const fc = {}; for (const k in first) fc[k] = { runs: +avg(first[k].map(x => x.run)).toFixed(1), lv: +avg(first[k].map(x => x.lv)).toFixed(1) };
  rep[cls] = { avgLevel: +avg(lvls).toFixed(1), winRateByTier: wr, runsPerGame: +avg(runs).toFixed(1), actionsPerBattle: +(turns / battles).toFixed(1), gold: Math.round(avg(gold)), firstClear: fc, runsToL30: reachT.l30 ? +avg(reachT.l30).toFixed(0) : null, reachedL30: (reachT.l30 || []).length + '/' + N };
  const r = rep[cls];
  console.log(D.CLASSES[cls].n.padEnd(10), 'ур.' + r.avgLevel, '| победы по сложности [обыч/герои/кошм/бездна]:', wr.map(x => x == null ? '—' : Math.round(x * 100) + '%').join(' / '), '| вылазок', r.runsPerGame, '| действий/бой', r.actionsPerBattle, '| золото', r.gold, '| до 30 ур.:', r.runsToL30 || '—', '(' + r.reachedL30 + ')');
  console.log('   первое прохождение (вылазка №, ур.):', Object.keys(fc).map(k => k + ' ' + fc[k].runs + '/' + fc[k].lv).join('; '));
}
require('fs').writeFileSync(__dirname + '/../docs/sim-report.json', JSON.stringify(rep, null, 1));
