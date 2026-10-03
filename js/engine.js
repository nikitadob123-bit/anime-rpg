/* Движок: персонаж, характеристики, древа, предметы, лут, профессии, магазин, вылазки. Чистая логика без DOM. */
(function () {
  const RPG = globalThis.RPG || (globalThis.RPG = {});
  const D = RPG.D;
  const E = RPG.E = {};

  // ───── ГСЧ ─────
  E.rng = function (seed) {
    let a = (seed >>> 0) || 1;
    const r = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    r.int = (lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
    r.pick = (arr) => arr[Math.floor(r() * arr.length)];
    r.chance = (p) => r() < p;
    r.weighted = (ws) => { let t = 0; ws.forEach(w => t += w); let x = r() * t; for (let i = 0; i < ws.length; i++) { x -= ws[i]; if (x < 0) return i; } return ws.length - 1; };
    r.seed = () => a;
    return r;
  };
  E.hash = (s) => { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  E.clamp = clamp;

  // ───── Новый персонаж/слот ─────
  E.TREE_POINTS_PER_LEVEL = 1;
  E.newSlot = function (o) {
    const cls = D.CLASSES[o.cls];
    const hero = { name: String(o.name || 'Герой').slice(0, 16), sex: o.sex || 'm', race: o.race, cls: o.cls, portrait: o.portrait, uniq: o.uniq, prof1: o.prof1 || null, prof2: o.prof2 || null, profLocked: !!(o.prof1), level: 1, xp: 0, spent: {}, uspent: {}, bossPts: 0 };
    const slot = {
      hero, gold: 60, uid: 1, inv: [], mats: {}, cons: { pot_hp1: 3, pot_mp1: 1 }, eq: {}, profs: {}, story: { flags: {}, done: [], cur: 'prologue', log: [] }, prog: { cleared: {}, best: {}, boss: {} },
      run: null, party: [], stats: { kills: 0, runs: 0, wins: 0, deaths: 0, crafted: 0, gathered: 0, goldEarned: 0 }, tut: {}, buffs: [], created: o.now || 0, played: 0, rev: 0
    };
    if (o.prof1) slot.profs[o.prof1] = { lv: 1, xp: 0 };
    if (o.prof2) slot.profs[o.prof2] = { lv: 1, xp: 0 };
    const w = D.BASES[cls.weapons[0]];
    const it = E.genItem(E.rng(E.hash(o.name + o.cls)), { il: 1, rarity: 0, base: cls.weapons[0] });
    it.id = slot.uid++; slot.eq.weapon = it;
    return slot;
  };

  // ───── Навыки и древа ─────
  E.spentPoints = (h) => Object.values(h.spent).reduce((a, b) => a + b, 0);
  E.sp = (h) => Math.max(0, (h.level - 1) * E.TREE_POINTS_PER_LEVEL - E.spentPoints(h));
  E.uSpent = (h) => Object.values(h.uspent).reduce((a, b) => a + b, 0);
  E.uTotal = (h) => Math.floor(h.level / 3) + (h.bossPts || 0);
  E.up = (h) => Math.max(0, E.uTotal(h) - E.uSpent(h));
  E.nodeOf = (h, id) => { const t = D.TREES[h.cls]; let n = t.nodes.find(x => x.id === id); if (n) return { n, u: false }; if (h.uniq) { n = D.UNIQ[h.uniq].nodes.find(x => x.id === id); if (n) return { n, u: true }; } return null; };
  E.canLearn = function (h, id) {
    const f = E.nodeOf(h, id); if (!f) return 'Нет такого узла';
    const { n, u } = f; const store = u ? h.uspent : h.spent; const r = store[id] || 0;
    if (r >= n.max) return 'Максимальный ранг';
    if (u ? E.up(h) < 1 : E.sp(h) < 1) return u ? 'Нет искр Лиры' : 'Нет очков навыков';
    if (h.level < n.lv) return 'Нужен уровень ' + n.lv;
    for (const q of n.req) if (!(store[q] > 0)) { const rn = (u ? D.UNIQ[h.uniq].nodes : D.TREES[h.cls].nodes).find(x => x.id === q); return 'Нужно: ' + (rn ? rn.n : q); }
    return '';
  };
  E.learn = function (h, id) { const why = E.canLearn(h, id); if (why) return why; const { u } = E.nodeOf(h, id); const store = u ? h.uspent : h.spent; store[id] = (store[id] || 0) + 1; return ''; };
  E.respecCost = (h) => Math.round(30 * h.level * (1 + h.level / 10));
  E.respec = function (slot, which) { const h = slot.hero; const c = E.respecCost(h); if (slot.gold < c) return false; slot.gold -= c; if (which === 'u') h.uspent = {}; else h.spent = {}; return true; };
  E.skillsOf = function (h) {
    const ids = D.CLASSES[h.cls].start.slice();
    D.TREES[h.cls].nodes.forEach(n => { if (n.e.unlock && h.spent[n.id] > 0) ids.push(n.e.unlock); });
    if (h.uniq) ids.push('u_' + h.uniq);
    return ids;
  };

  // ───── Моды и характеристики ─────
  function addMods(into, m, k) { if (!m) return; for (const key in m) into[key] = (into[key] || 0) + m[key] * (k || 1); }
  E.profLv = (slot, pid) => (slot.profs[pid] ? slot.profs[pid].lv : 0);
  E.profCap = (h, pid) => pid === h.prof1 ? D.PROF_MAIN_CAP : pid === h.prof2 ? D.PROF_SUB_CAP : 0;
  E.collect = function (slot, ctx) {
    ctx = ctx || {};
    const h = slot.hero, race = D.RACES[h.race], cls = D.CLASSES[h.cls];
    const mods = {}, stats = {}, flat = {}, skb = {};
    D.STATS.forEach(s => stats[s] = cls.base[s] + Math.floor(cls.gr[s] * (h.level - 1)) + ((race.st && race.st[s]) || 0));
    addMods(mods, race.m); cls.perks.forEach(p => addMods(mods, p.m));
    const tn = (nodes, spent) => nodes.forEach(n => { const r = spent[n.id] || 0; if (!r) return; addMods(mods, n.e.m, r); addMods(stats, n.e.st, r); if (n.e.sk) for (const k in n.e.sk) { const key = k === '$' ? 'u_' + h.uniq : k; skb[key] = (skb[key] || 0) + n.e.sk[k] * r; } });
    tn(D.TREES[h.cls].nodes, h.spent); if (h.uniq) tn(D.UNIQ[h.uniq].nodes, h.uspent);
    [h.prof1, h.prof2].forEach(pid => { if (!pid) return; const lv = E.profLv(slot, pid); const pf = D.PROFS[pid]; for (const th in pf.perks) if (lv >= +th && (pid === h.prof1 || +th <= D.PROF_SUB_CAP)) addMods(mods, pf.perks[th].m); });
    // экипировка (бонус кузнеца множит плоские характеристики)
    const gearK = 1 + (mods.gear || 0) / 100;
    for (const sl in slot.eq) { const it = slot.eq[sl]; if (!it) continue; const upk = 1 + 0.09 * (it.up || 0);
      for (const k in it.st) { const v = it.st[k]; if (D.STATS.includes(k)) stats[k] += v * upk * gearK; else if (D.FLAT[k]) flat[k] = (flat[k] || 0) + v * upk * gearK; else mods[k] = (mods[k] || 0) + v; }
      if (it.en) { const en = D.ENCHANTS.find(e => e.id === it.en); if (en) addMods(mods, en.m); } }
    // баффы вылазки (еда/эликсиры)
    const foodK = 1 + (mods.food || 0) / 100;
    (slot.buffs || []).forEach(b => { const k = b.food ? foodK : 1; addMods(mods, b.m, k); });
    (ctx.extraMods ? [ctx.extraMods] : []).forEach(m => addMods(mods, m));
    return { mods, stats, flat, skb };
  };
  E.derive = function (slot, ctx) {
    const h = slot.hero, c = E.collect(slot, ctx), m = c.mods, s = c.stats, f = c.flat, L = h.level;
    const pc = (k) => 1 + (m[k] || 0) / 100;
    const d = { lv: L, mods: m, skb: c.skb };
    D.STATS.forEach(k => d[k] = Math.round(s[k]));
    d.maxHp = Math.round((40 + s.vit * 8 + L * 10 + (f.hp || 0)) * pc('hp'));
    d.maxMp = Math.round((20 + s.int * 2 + s.spi * 3 + (f.mp || 0)) * pc('mp'));
    d.atk = Math.round((s.str * 2 + s.agi * 0.5 + (f.atk || 0)) * pc('atk'));
    d.mag = Math.round((s.int * 2.2 + s.spi * 0.6 + (f.mag || 0)) * pc('mag'));
    d.hpow = Math.round((s.spi * 2 + s.int * 0.5 + L * 2 + (f.mag || 0) * 0.25) * pc('heal'));
    d.def = Math.round((s.vit * 1.0 + s.str * 0.3 + (f.def || 0)) * pc('def'));
    d.res = Math.round((s.spi * 1.0 + s.int * 0.4 + (f.res || 0)) * pc('res'));
    d.spd = Math.round((10 + s.agi * 0.5) * pc('spd') * 10) / 10;
    d.crit = clamp(5 + s.agi * 0.25 + (m.crit || 0), 0, 75);
    d.critDmg = 1.5 + (m.critDmg || 0);
    d.eva = clamp(s.agi * 0.2 + (m.eva || 0), 0, 45);
    return d;
  };
  E.power = (slot) => { const d = E.derive(slot); return Math.round(d.maxHp / 8 + Math.max(d.atk, d.mag, d.hpow) + d.def / 2 + d.res / 3); };

  // ───── Опыт ─────
  E.addXp = function (slot, xp) {
    const h = slot.hero; let gained = 0;
    if (h.level >= D.LEVEL_CAP) return 0;
    h.xp += xp;
    while (h.level < D.LEVEL_CAP && h.xp >= D.xpNeed(h.level)) { h.xp -= D.xpNeed(h.level); h.level++; gained++; }
    if (h.level >= D.LEVEL_CAP) h.xp = 0;
    return gained;
  };

  // ───── Предметы ─────
  const SUF = {}; D.AFFIX.forEach(a => SUF[a.k] = a.n);
  E.genItem = function (rng, o) {
    const base = o.base || rng.pick(D.BASE_IDS), B = D.BASES[base], il = Math.max(1, Math.round(o.il || 1)), ri = o.rarity || 0, R = D.RARITY[ri];
    const p = 5 + il * 2.4, st = {};
    for (const k in B.p) { let v = B.p[k] * p * R.mul * (0.95 + rng() * 0.1); st[k] = D.STATS.includes(k) ? Math.max(1, Math.round(v)) : Math.max(1, Math.round(v)); }
    const pool = D.AFFIX.slice(); const names = [];
    for (let i = 0; i < R.aff; i++) {
      const a = pool.splice(rng.int(0, pool.length - 1), 1)[0]; let v;
      if (a.pct) v = Math.round((a.pct[0] + il * a.pct[1]) * R.mul * (0.85 + rng() * 0.3) * 10) / 10; else v = Math.max(1, Math.round(a.f * p * R.mul * (0.85 + rng() * 0.3)));
      st[a.k] = (st[a.k] || 0) + v; names.push(a.n);
    }
    let nm = o.nm || B.n; if (!o.nm) { if (ri === 4) nm = B.n + ' «' + D.LEGEND_NAMES[rng.int(0, D.LEGEND_NAMES.length - 1)] + '»'; else if (names.length) nm = B.n + ' ' + names[0]; }
    else if (names.length && ri > 0) nm = o.nm + ' ' + names[0];
    return { id: 0, k: base, r: ri, il, nm, st, up: 0, en: null, sl: B.slot };
  };
  E.itemValue = (it) => Math.round((8 + it.il * 6) * Math.pow(D.RARITY[it.r].mul, 3.2) * (1 + (it.up || 0) * 0.5) * (it.en ? 1.3 : 1));
  E.sellPrice = (it) => Math.max(1, Math.round(E.itemValue(it) * 0.35));
  E.buyPrice = (it) => Math.round(E.itemValue(it) * 2.2);
  E.canUse = (h, it) => { const B = D.BASES[it.k]; return !B.wt || D.CLASSES[h.cls].weapons.includes(B.wt); };
  E.itemScore = function (it) { let s = 0; for (const k in it.st) s += it.st[k] * ({ atk: 1, mag: 1, def: 1, res: 0.8, hp: 0.3, mp: 0.3, crit: 3, eva: 3, spd: 3, dmg: 4 }[k] || 2); return s * (1 + 0.09 * (it.up || 0)); };
  E.addItem = function (slot, it) { it.id = slot.uid++; slot.inv.push(it); return it; };
  E.equip = function (slot, id) {
    const i = slot.inv.findIndex(x => x.id === id); if (i < 0) return 'Нет предмета'; const it = slot.inv[i];
    if (!E.canUse(slot.hero, it)) return 'Ваш класс не может носить это оружие';
    const sl = it.sl; const old = slot.eq[sl]; slot.inv.splice(i, 1); if (old) slot.inv.push(old); slot.eq[sl] = it; return '';
  };
  E.unequip = function (slot, sl) { const it = slot.eq[sl]; if (!it) return; delete slot.eq[sl]; slot.inv.push(it); };
  E.sell = function (slot, id) { const i = slot.inv.findIndex(x => x.id === id); if (i < 0) return 0; const g = E.sellPrice(slot.inv[i]); slot.inv.splice(i, 1); slot.gold += g; return g; };
  E.sellJunk = function (slot, maxRarity) { let g = 0; slot.inv.filter(x => x.r <= maxRarity && !x.lock).forEach(x => { g += E.sell(slot, x.id); }); return g; };
  E.UP_BASE_CAP = 3;
  E.upCap = (slot) => { const h = slot.hero; const sm = h.prof1 === 'smith' || h.prof2 === 'smith'; return sm ? 6 : E.UP_BASE_CAP; };
  E.upCost = function (slot, it) {
    const h = slot.hero, n = (it.up || 0) + 1; const disc = (h.prof1 === 'smith' || h.prof2 === 'smith') ? 0.75 : 1;
    const mat = it.il < 8 ? 'ing_cu' : it.il < 14 ? 'ing_fe' : 'ing_ms';
    return { gold: Math.round(20 * Math.pow(n, 1.6) * (1 + it.il / 6) * disc), mats: { [mat]: n * 2 } };
  };
  E.canAfford = (slot, cost) => slot.gold >= (cost.gold || 0) && Object.keys(cost.mats || {}).every(k => (slot.mats[k] || 0) >= cost.mats[k]);
  E.pay = (slot, cost) => { slot.gold -= cost.gold || 0; for (const k in (cost.mats || {})) slot.mats[k] -= cost.mats[k]; };
  E.upgrade = function (slot, it) {
    if ((it.up || 0) >= E.upCap(slot)) return 'Максимальное улучшение';
    const c = E.upCost(slot, it); if (!E.canAfford(slot, c)) return 'Не хватает ресурсов';
    E.pay(slot, c); it.up = (it.up || 0) + 1; return '';
  };
  E.findItem = (slot, id) => slot.inv.find(x => x.id === id) || Object.values(slot.eq).find(x => x && x.id === id);

  // ───── Материалы / расходники ─────
  E.addMat = (slot, id, n) => { if (n > 0) slot.mats[id] = (slot.mats[id] || 0) + n; };
  E.addCons = (slot, id, n) => { slot.cons[id] = (slot.cons[id] || 0) + n; };
  E.matBuy = (id) => Math.round(D.MATS[id].v * 3);
  E.matSell = (id) => Math.max(1, Math.round(D.MATS[id].v * 0.6));
  E.consBuy = (id) => Math.round(D.CONS[id].v * 1.8);
  E.consSell = (id) => Math.max(1, Math.round(D.CONS[id].v * 0.4));
  E.SHOP_MATS = ['ore_cu', 'herb_g', 'hide', 'fish_s', 'meat', 'spice', 'prov', 'cloth', 'dust'];
  E.SHOP_CONS = ['pot_hp1', 'pot_hp2', 'pot_mp1', 'antidote', 'bomb_fire'];
  E.clearedCount = (slot) => D.DUNGEONS.filter(d => slot.prog.cleared[d.id]).length;
  E.shopTier = (slot) => Math.min(5, E.clearedCount(slot));
  E.shopStock = function (slot) {
    const tier = E.shopTier(slot), il = [1, 4, 8, 12, 16, 20][tier], h = slot.hero;
    const rng = E.rng(E.hash('shop' + tier + h.name + (slot.shopSeed || 0)));
    const out = []; const bases = D.BASE_IDS.filter(k => { const B = D.BASES[k]; return !B.wt || D.CLASSES[h.cls].weapons.includes(B.wt); });
    bases.forEach(k => { const r = rng() < 0.3 ? 2 : rng() < 0.55 ? 1 : 0; const it = E.genItem(rng, { base: k, il, rarity: r }); it.id = -(out.length + 1); out.push(it); });
    return out;
  };
  E.buyShopItem = function (slot, idx) { const it = E.shopStock(slot)[idx]; if (!it) return 'Нет товара'; const p = E.buyPrice(it) * (1 - Math.min(30, (E.collect(slot).mods.discount || 0)) / 100); if (slot.gold < p) return 'Не хватает золота'; slot.gold -= Math.round(p); const cp = JSON.parse(JSON.stringify(it)); E.addItem(slot, cp); return ''; };
  E.buyMat = function (slot, id, n) { const p = E.matBuy(id) * n; if (slot.gold < p) return false; slot.gold -= p; E.addMat(slot, id, n); return true; };
  E.buyCons = function (slot, id, n) { const p = E.consBuy(id) * n; if (slot.gold < p) return false; slot.gold -= p; E.addCons(slot, id, n); return true; };
  E.sellMat = function (slot, id, n) { n = Math.min(n, slot.mats[id] || 0); if (n <= 0) return 0; slot.mats[id] -= n; const g = E.matSell(id) * n; slot.gold += g; return g; };

  // ───── Профессии ─────
  E.setProfessions = function (slot, main, sub) {
    const h = slot.hero; if (h.profLocked) return 'Профессии уже выбраны навсегда';
    if (!D.PROFS[main] || !D.PROFS[sub] || main === sub) return 'Выберите две разные профессии';
    h.prof1 = main; h.prof2 = sub; h.profLocked = true; slot.profs[main] = { lv: 1, xp: 0 }; slot.profs[sub] = { lv: 1, xp: 0 }; return '';
  };
  E.profXp = function (slot, pid, xp) {
    const h = slot.hero; const cap = E.profCap(h, pid); if (!cap) return 0; const p = slot.profs[pid]; if (!p) return 0;
    if (pid === h.prof2) xp = Math.max(1, Math.round(xp * 0.8)); let up = 0;
    if (p.lv >= cap) return 0; p.xp += xp;
    while (p.lv < cap && p.xp >= D.profXpNeed(p.lv)) { p.xp -= D.profXpNeed(p.lv); p.lv++; up++; }
    if (p.lv >= cap) p.xp = 0; return up;
  };
  E.recipeAvail = function (slot, r) { const lv = E.profLv(slot, r.prof); return E.profCap(slot.hero, r.prof) > 0 && lv >= r.lv; };
  E.craft = function (slot, rid, rng) {
    D.buildRecipes(); const r = D.RECIPES.find(x => x.id === rid); if (!r) return { err: 'Нет рецепта' };
    const h = slot.hero; if (!E.profCap(h, r.prof)) return { err: 'Это не ваша профессия' };
    if (!E.recipeAvail(slot, r)) return { err: 'Нужен уровень ' + r.lv };
    const cost = { gold: r.gold, mats: r.mats }; if (!E.canAfford(slot, cost)) return { err: 'Не хватает материалов или золота' };
    E.pay(slot, cost); rng = rng || E.rng(E.hash('craft' + slot.uid + slot.stats.crafted + slot.gold));
    const lv = E.profLv(slot, r.prof), out = { recipe: r };
    if (r.out.kind === 'mat') { E.addMat(slot, r.out.id, r.out.q); out.mat = r.out.id; out.q = r.out.q; }
    else if (r.out.kind === 'cons') { const bonus = r.prof === 'alch' && rng() < 0.12 + lv * 0.01 ? 1 : 0; E.addCons(slot, r.out.id, r.out.q + bonus); out.cons = r.out.id; out.q = r.out.q + bonus; }
    else {
      const m = E.collect(slot).mods; const bonus = (m.craft || 0) / 100;
      const w = [60 - lv * 1.6, 30 + lv * 0.4, 8 + lv * 1.0 + bonus * 50, 1.8 + lv * 0.35, 0.2 + lv * 0.08].map(x => Math.max(0.05, x));
      let ri = Math.max(r.out.rmin || 0, rng.weighted(w)); if (ri === 0 && r.lv > 1) ri = 1;
      const it = E.genItem(rng, { base: r.out.base, il: r.out.il, rarity: ri, nm: r.n.charAt(0).toUpperCase() + r.n.slice(1) });
      E.addItem(slot, it); out.item = it;
    }
    slot.stats.crafted++; out.lvUp = E.profXp(slot, r.prof, r.xp); return out;
  };
  E.enchant = function (slot, itemId, eid) {
    const h = slot.hero; const pid = h.prof1 === 'ench' ? 'ench' : h.prof2 === 'ench' ? 'ench' : null; if (!pid) return 'Нужна профессия Зачарователя';
    const en = D.ENCHANTS.find(e => e.id === eid); const it = E.findItem(slot, itemId); if (!en || !it) return 'Нет цели';
    if (E.profLv(slot, 'ench') < en.lv) return 'Нужен уровень ' + en.lv;
    const c = { gold: en.gold, mats: en.mats }; if (!E.canAfford(slot, c)) return 'Не хватает материалов или золота';
    E.pay(slot, c); it.en = eid; E.profXp(slot, 'ench', 10 + en.lv * 2); return '';
  };
  E.gatherAreas = (slot, pid) => D.PROFS[pid].areas.filter(a => E.profLv(slot, pid) >= a.lv);
  E.gather = function (slot, pid, areaIdx, rng) {
    const h = slot.hero; if (!E.profCap(h, pid) || D.PROFS[pid].t !== 'gather') return { err: 'Это не ваша рабочая профессия' };
    const areas = E.gatherAreas(slot, pid), a = areas[areaIdx]; if (!a) return { err: 'Место недоступно' };
    if ((slot.mats.prov || 0) < 1) return { err: 'Нужен «Провиант» (покупается в лавке)' };
    slot.mats.prov--; rng = rng || E.rng(E.hash('gat' + slot.stats.gathered + slot.gold + slot.uid));
    const m = E.collect(slot).mods, gk = 1 + (m.gather || 0) / 100; const got = {};
    for (let i = 0; i < 3; i++) { const dr = a.drops[rng.weighted(a.drops.map(d => d[3]))]; let q = rng.int(dr[1], dr[2]); if (!q && rng() < 0.4) q = 1; q = Math.round(q * gk + (rng() < (q * gk) % 1 ? 0 : 0)); if (q > 0) { E.addMat(slot, dr[0], q); got[dr[0]] = (got[dr[0]] || 0) + q; } }
    slot.stats.gathered++; return { got, lvUp: E.profXp(slot, pid, 8 + a.lv) };
  };

  // ───── Лут ─────
  E.rollRarity = function (rng, luck, min) {
    const w = [62, 26, 9, 2.6, 0.4].map((x, i) => i ? x * Math.pow(luck, i) : x);
    let r = rng.weighted(w); return Math.max(r, min || 0);
  };
  E.rollLoot = function (rng, slot, enemy, ctx) {
    const m = ctx.mods, dropK = (1 + (m.drop || 0) / 100) * ctx.tier.loot, role = enemy.role;
    const out = { gold: 0, mats: {}, items: [] };
    const gk = 1 + (m.gold || 0) / 100;
    out.gold = Math.round((3 + 1.3 * enemy.lv) * D.ROLES[role].g * gk * (0.85 + rng() * 0.3) * (1 + (ctx.tier.mul - 1) * 0.5));
    (D.ENEMIES[enemy.eid].loot || []).forEach(l => { if (rng() < Math.min(1, l[1] * dropK)) { const q = rng.int(l[2], l[3]); out.mats[l[0]] = (out.mats[l[0]] || 0) + q; } });
    const boss = role === 'boss', mini = role === 'mini', elite = enemy.elite;
    const p = boss ? 1 : mini ? 0.85 : elite ? 0.3 : 0.07;
    const n = boss ? 2 : 1;
    for (let i = 0; i < n; i++) if (rng() < Math.min(1, p * dropK)) {
      const rar = E.rollRarity(rng, dropK * (boss ? 2.5 : mini ? 1.8 : elite ? 1.4 : 1), boss ? 2 : mini ? 1 : 0);
      const cls = D.CLASSES[slot.hero.cls]; let base = rng.pick(D.BASE_IDS);
      if (D.BASES[base].wt && !cls.weapons.includes(D.BASES[base].wt) && rng() < 0.8) base = rng.pick(cls.weapons);
      out.items.push(E.genItem(rng, { base, il: Math.max(1, enemy.lv + (boss ? 1 : 0)), rarity: rar }));
    }
    return out;
  };

  // ───── Вылазки ─────
  E.dungeonUnlocked = function (slot, did) {
    const d = D.DUN[did]; if (!d) return false;
    if (d.need === 'ch1') return !!slot.story.flags.prologue_done;
    return !!slot.prog.cleared[d.need];
  };
  E.tierUnlocked = (slot, did, t) => t === 0 || !!(slot.prog.cleared[did] && slot.prog.cleared[did] >= t);  // cleared[did] = макс. пройденный тир + 1
  E.dungeonLv = (d, tier, floor) => d.lv + D.TIERS[tier].lv + floor;
  E.genRun = function (slot, did, tier, seed) {
    const d = D.DUN[did], rng = E.rng(seed), nodes = [];
    for (let f = 0; f < d.floors; f++) {
      const last = f === d.floors - 1, evs = d.ev;
      const grp = () => { const n = f === 0 && d.id === 'mill' ? rng.int(1, 2) : rng.int(2, 3); const a = []; for (let i = 0; i < n; i++) a.push(rng.pick(d.pool)); return a; };
      nodes.push({ t: 'b', f, e: grp() });
      if (last) { nodes.push({ t: 'ev', f, ev: 'rest' }); nodes.push({ t: 'mini', f, e: [d.mini] }); nodes.push({ t: 'ev', f, ev: rng.pick(evs.filter(x => x !== 'rest')) }); nodes.push({ t: 'boss', f, e: [d.boss] }); }
      else { nodes.push({ t: 'b', f, e: grp() }); nodes.push({ t: 'ev', f, ev: rng.pick(evs) }); const el = grp(); nodes.push({ t: 'b', f, e: el, elite: 1 }); }
    }
    return { did, tier, seed, node: 0, nodes, bag: { gold: 0, mats: {}, items: [], xp: 0 }, hp: null, mp: null, kills: 0, log: [], ev: {} };
  };
  E.startRun = function (slot, did, tier) {
    if (slot.run) return 'Вылазка уже идёт';
    if (!E.dungeonUnlocked(slot, did)) return 'Подземелье закрыто';
    if (!E.tierUnlocked(slot, did, tier)) return 'Сложность закрыта';
    slot.stats.runs++; slot.rev++;
    slot.run = E.genRun(slot, did, tier, (E.hash(slot.hero.name) + slot.stats.runs * 7919 + slot.uid * 31) >>> 0);
    const d = E.derive(slot); slot.run.hp = d.maxHp; slot.run.mp = d.maxMp; slot.run.comp = {};
    return '';
  };
  E.useConsOutside = function (slot, id) {
    const c = D.CONS[id]; if (!c || !(slot.cons[id] > 0)) return 'Нет предмета';
    if (c.buff) { if (slot.run) return 'Еду и эликсиры нужно принять до вылазки'; if ((slot.buffs || []).find(b => b.id === id)) return 'Уже действует'; slot.cons[id]--; slot.buffs = slot.buffs || []; slot.buffs.push({ id, m: c.buff, food: id.startsWith('food_') }); return ''; }
    if (!slot.run) return 'Зелья используются в вылазке'; const d = E.derive(slot); const pk = 1 + (d.mods.potion || 0) / 100;
    if (c.heal) slot.run.hp = Math.min(d.maxHp, Math.round(slot.run.hp + d.maxHp * c.heal * pk)); if (c.mp) slot.run.mp = Math.min(d.maxMp, Math.round(slot.run.mp + d.maxMp * c.mp * pk));
    slot.cons[id]--; return '';
  };
  E.claimRun = function (slot, outcome) {
    const run = slot.run; if (!run) return null; const b = run.bag; const res = { gold: 0, mats: {}, items: [], outcome };
    const keep = outcome === 'win' || outcome === 'flee' ? 1 : 0.5;
    res.gold = Math.round(b.gold * keep); slot.gold += res.gold; slot.stats.goldEarned += res.gold;
    for (const k in b.mats) { const q = Math.round(b.mats[k] * keep); if (q > 0) { E.addMat(slot, k, q); res.mats[k] = q; } }
    b.items.forEach((it, i) => { if (keep === 1 || i % 2 === 0) { E.addItem(slot, it); res.items.push(it); } });
    slot.buffs = []; slot.run = null; slot.rev++; return res;
  };
  if (typeof module !== 'undefined') module.exports = RPG;
})();
