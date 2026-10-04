/* Симулятор баланса: Король Демонов с тремя билдами (Мантра Силы / Тьма и Разрушение / Власть и Свита), Свита в отряде, автобой по всем подземельям.
   node tools/sim.js [runs] [--log]   Сводка → docs/sim-report.json */
const RPG = require('../js/data-core.js');
['data-maou', 'data-prof', 'data-world', 'data-crew', 'data-theme', 'data-story', 'data-story2', 'data-story3', 'data-romance', 'engine', 'combat', 'crew'].forEach((f) => require('../js/' + f + '.js'));
const D = RPG.D, E = RPG.E, C = RPG.C;
const N = +process.argv[2] || 12;
const T = D.TREES.maou;
if (process.env.TUNE) Object.assign(C.TUNE, JSON.parse(process.env.TUNE));
// билды: порядок приоритета веток (индексы: 0 корень, 1 плоть, 2 тьма, 3 энтропия, 4 власть, 5 проклятия) и «ключевые» узлы
const BUILDS = {
  mantra: { n: 'Мантра Силы (Плоть+Корень)', br: [1, 0, 5, 2, 3, 4], key: ['P14', 'P15'], uniq: 'ironwill', crew: ['gen1', 'grak', 'gen4'] },
  dark: { n: 'Тьма и Разрушение', br: [2, 0, 3, 1, 5, 4], key: [], uniq: 'phoenix', crew: ['gen1', 'gen2', 'gen4'] },
  dominion: { n: 'Власть и Подчинение', br: [4, 0, 5, 3, 2, 1], key: [], uniq: 'dawnsong', crew: ['gen1', 'gen4', 'gen2'] }
};
const CREW_AT = [[1, 'gen1'], [1, 'grak'], [4, 'gen4'], [6, 'gen2'], [9, 'gen3'], [12, 'gen5'], [16, 'gen7'], [20, 'gen6']];

function autoSpend(slot, B) {
  const h = slot.hero; let guard = 300;
  const order = [];
  B.key.forEach((id) => order.push(id));
  while (E.sp(h) > 0 && guard--) {
    let done = false;
    for (const id of B.key) { if (!E.canLearn(h, id)) { E.learn(h, id); done = true; break; } else if (!(h.spent[id] > 0)) { // пробуем открыть предусловия ключа
      const n = T.nodes.find((x) => x.id === id); const chain = []; const need = (q) => { const x = T.nodes.find((y) => y.id === q); x.req.forEach(need); chain.push(x.id); }; n.req.forEach(need);
      const nxt = chain.find((c) => !(h.spent[c] > 0) && !E.canLearn(h, c)); if (nxt) { E.learn(h, nxt); done = true; break; } } }
    if (done) continue;
    for (const bi of B.br) { const cand = T.nodes.filter((n) => n.br === bi && !E.canLearn(h, n.id) && !n.fuse).sort((a, b) => a.t - b.t || (h.spent[a.id] || 0) - (h.spent[b.id] || 0))[0]; if (cand) { E.learn(h, cand.id); done = true; break; } }
    if (!done) for (const n of T.nodes) if (!E.canLearn(h, n.id)) { E.learn(h, n.id); done = true; break; }
    if (!done) break;
  }
  const un = D.UNIQ[h.uniq].nodes; guard = 100; while (E.up(h) > 0 && guard--) { let ok = false; for (const n of un) if (!E.canLearn(h, n.id)) { E.learn(h, n.id); ok = true; break; } if (!ok) break; }
}
function crewManage(slot, B) {
  CREW_AT.forEach(([lv, id]) => { if (slot.hero.level >= lv && !slot.crew[id]) E.recruit(slot, id); });
  const ids = E.recruited(slot).filter((i) => !E.onMission(slot, i));
  E.setParty(slot, B.crew.filter((i) => ids.includes(i)).concat(ids).filter((x, i, a) => a.indexOf(x) === i));
  // экипировка Свиты — лучшее из сумки
  slot.party.forEach((id) => { [['weapon', 'weapon'], ['armor', 'body'], ['trinket', 'ring']].forEach(([key, sl]) => { let best = null, bs = slot.crew[id].eq[key] ? E.itemScore(slot.crew[id].eq[key]) : 0; slot.inv.forEach((it) => { if (E.crewSlotOk(key, it) && E.canUse({ cls: D.CREW[id].arch, level: 99 }, it) && E.itemScore(it) > bs) { best = it; bs = E.itemScore(it); } }); if (best) E.crewEquip(slot, id, key, best.id); }); });
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
function playRun(slot, did, tier, stat, bld) {
  if (E.startRun(slot, did, tier)) return 'x';
  const run = slot.run; let result = 'win';
  while (run.node < run.nodes.length) {
    const node = run.nodes[run.node];
    if (node.t === 'ev') { const ch = node.ev === 'shrine' ? (run.hp < E.derive(slot).maxHp * 0.6 ? 'heal' : 'bless') : null; C.resolveEvent(slot, ch); continue; }
    const B = C.startNodeBattle(slot, { auto: true }); let guard = 600;
    while (!B.over && guard--) { C.next(B); }
    const rep = C.finishBattle(slot, B); stat.battles++; stat.turns += B.round;
    if (rep.lvUp) autoSpend(slot, bld);
    if (B.over === 'lose') { result = 'lose'; break; }
    autoEquip(slot);
  }
  E.claimRun(slot, result);
  return result;
}
function simBuild(bk, seed) {
  const B = BUILDS[bk];
  const slot = E.newSlot({ name: 'Sim' + bk + seed, race: 'o_orphan', uniq: B.uniq, prof1: 'smith', prof2: 'miner' });
  slot.story.flags.prologue_done = true; slot.shopSeed = seed;
  const log = []; const stat = { battles: 0, turns: 0, wins: 0, losses: 0 };
  let rounds = 0, stuck = 0;
  while (rounds++ < 160 && slot.hero.level < D.LEVEL_CAP) {
    if (slot.prog.cleared.spire && !slot.story.done.includes('ch3_d')) slot.story.done.push('ch3_d');
    crewManage(slot, B);
    let best = null; const cands = [];
    D.DUNGEONS.forEach((d) => { for (let t = 0; t < 4; t++) { if (!E.dungeonUnlocked(slot, d.id) || !E.tierUnlocked(slot, d.id, t)) continue; cands.push({ did: d.id, t, rec: d.lv + D.TIERS[t].lv + 1, fresh: !slot.prog.cleared[d.id] && t === 0 }); } });
    const lim = slot.hero.level + 1 - Math.min(stuck, 3);
    const fresh = cands.find((c) => c.fresh && c.rec <= lim + 1);
    best = fresh || cands.filter((c) => c.rec <= lim).sort((a, b) => b.rec - a.rec)[0] || cands.sort((a, b) => a.rec - b.rec)[0];
    if (!best) best = { did: 'mill', t: 0, rec: 0 }; if (!E.dungeonUnlocked(slot, best.did)) break;
    shopping(slot);
    const r = playRun(slot, best.did, best.t, stat, B);
    autoSpend(slot, B); autoEquip(slot); sellRest(slot);
    log.push({ did: best.did, tier: best.t, r, lv: slot.hero.level, gold: slot.gold, rec: best.rec });
    if (r === 'win') { stat.wins++; stuck = 0; } else { stat.losses++; stuck++; }
    if (stat.losses > 60) break;
  }
  return { slot, log, stat };
}

const avg = (a) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
if (process.argv.includes('--log')) { for (const bk of Object.keys(BUILDS)) { const { log, stat, slot } = simBuild(bk, 1); console.log(bk, stat, 'ур.', slot.hero.level); console.log(log.map((l) => l.did + '/' + l.tier + (l.r === 'win' ? '+' : '-') + 'L' + l.lv).join(' ')); } process.exit(0); }
const rep = {};
console.log('Симуляция баланса: автобой (Король Демонов + Свита до 3), ' + N + ' прогонов на билд; контент выбирается по уровню героя\n');
for (const bk of Object.keys(BUILDS)) {
  const byTier = [[], [], [], []], first = {}, lvls = [], runs = [], gold = [], reachT = {}; let battles = 0, turns = 0, crewLv = [];
  for (let s = 1; s <= N; s++) {
    const { slot, log, stat } = simBuild(bk, s);
    lvls.push(slot.hero.level); runs.push(stat.wins + stat.losses); battles += stat.battles; turns += stat.turns; gold.push(slot.stats.goldEarned);
    crewLv.push(avg(slot.party.map((i) => slot.crew[i].lv)));
    log.forEach((l, i) => { byTier[l.tier].push(l.r === 'win' ? 1 : 0); if (l.tier === 0 && l.r === 'win') (first[l.did] = first[l.did] || []).push({ run: i + 1, lv: l.lv }); });
    const lv30 = log.findIndex((l) => l.lv >= 30); if (lv30 >= 0) (reachT.l30 = reachT.l30 || []).push(lv30 + 1);
  }
  const wr = byTier.map((a) => a.length ? +(avg(a)).toFixed(2) : null);
  const fc = {}; for (const k in first) fc[k] = { runs: +avg(first[k].map((x) => x.run)).toFixed(1), lv: +avg(first[k].map((x) => x.lv)).toFixed(1) };
  rep[bk] = { build: BUILDS[bk].n, avgLevel: +avg(lvls).toFixed(1), winRateByTier: wr, runsPerGame: +avg(runs).toFixed(1), actionsPerBattle: +(turns / Math.max(1, battles)).toFixed(1), gold: Math.round(avg(gold)), crewAvgLevel: +avg(crewLv).toFixed(1), firstClear: fc, runsToL30: reachT.l30 ? +avg(reachT.l30).toFixed(1) : null };
  const r = rep[bk];
  console.log(BUILDS[bk].n.padEnd(30), 'ур.' + r.avgLevel, '| победы по сложности [обыч/герои/кошм/бездна]:', wr.map((x) => x == null ? '—' : Math.round(x * 100) + '%').join(' / '), '| вылазок:', r.runsPerGame, '| ходов/бой:', r.actionsPerBattle, '| ур.Свиты:', r.crewAvgLevel, '| до 30 ур.:', r.runsToL30 || '—');
  console.log('   первое прохождение (вылазка №, ур.):', Object.keys(fc).map((k) => k + ' ' + fc[k].runs + '/' + fc[k].lv).join('; '));
}
require('fs').mkdirSync(__dirname + '/../docs', { recursive: true });
require('fs').writeFileSync(__dirname + '/../docs/sim-report.json', JSON.stringify(rep, null, 1));
