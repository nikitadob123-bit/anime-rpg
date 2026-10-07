/* Характеристики и субстаты: 8 основных статов, ручное распределение очков, субстаты (крит, пробитие, блок, вампиризм…), сопротивления и бонусы стихий.
   Переопределяет E.collect / E.derive из engine.js (с учётом источников бонусов для подсказок). Чистая логика без DOM. */
(function () {
  const RPG = globalThis.RPG, D = RPG.D, E = RPG.E;
  const clamp = E.clamp;

  // ───── Значения по умолчанию для новых статов у всех классов (Мудрость ≈ среднее Интеллекта и Воли) ─────
  Object.keys(D.CLASSES).forEach((id) => {
    const c = D.CLASSES[id], b = c.base, g = c.gr;
    if (b.wis == null) b.wis = Math.round(((b.int || 5) + (b.spi || 5)) / 2); if (g.wis == null) g.wis = +(((g.int || 0.5) + (g.spi || 0.5)) / 2).toFixed(2);
    if (b.luk == null) b.luk = 5; if (g.luk == null) g.luk = 0.45; if (b.cha == null) b.cha = 5; if (g.cha == null) g.cha = 0.4;
  });
  if (D.CLASSES.maou) { const b = D.CLASSES.maou.base, g = D.CLASSES.maou.gr; b.wis = 9; b.luk = 8; b.cha = 9; g.wis = 1.3; g.luk = 1.0; g.cha = 1.2; }
  // экипировка: новые аффиксы
  D.AFFIX.push({ k: 'wis', f: 0.12, n: 'Прозрения' }, { k: 'luk', f: 0.12, n: 'Фортуны' }, { k: 'cha', f: 0.12, n: 'Величия' },
    { k: 'pen', pct: [0.5, 0.1], n: 'Пробоя' }, { k: 'acc', pct: [1, 0.15], n: 'Меткости' }, { k: 'critDmg', pct: [0.03, 0.006], n: 'Жестокости' }, { k: 'res_fire', pct: [2, 0.3], n: 'Огнеупорности' },
    { k: 'res_ice', pct: [2, 0.3], n: 'Морозостойкости' }, { k: 'res_bolt', pct: [2, 0.3], n: 'Заземления' }, { k: 'res_dark', pct: [2, 0.3], n: 'Светлой ночи' }, { k: 'res_light', pct: [2, 0.3], n: 'Тени' });

  // ───── Субстаты: base + Σ coef·стат + бонусы (mod) → cap. val для крит-урона хранится в % (150 = ×1.5) ─────
  D.SUB_GROUPS = [['off', '⚔️ Наступление'], ['def', '🛡️ Защита'], ['res', '💧 Ресурсы и темп'], ['util', '🎒 Прочее']];
  const SUB = (id, n, grp, unit, base, coef, mod, cap, d, o) => Object.assign({ id, n, grp, unit, base, coef, mod, cap, d }, o || {});
  D.SUBS = [
    SUB('crit', 'Шанс крита', 'off', '%', 5, { luk: 0.30, agi: 0.10 }, 'crit', [0, 80], 'Шанс нанести критический удар. Крит усиливает урон на «Урон крита».'),
    SUB('critDmg', 'Урон крита', 'off', '%', 150, { luk: 0.25, str: 0.05 }, 'critDmg', [150, 600], 'Во сколько раз крит усиливает удар (150% = ×1.5).', { modScale: 100 }),
    SUB('acc', 'Меткость', 'off', '%', 0, { agi: 0.25, luk: 0.05 }, 'acc', [0, 100], 'Вычитается из уклонения цели: чем выше меткость, тем реже враги уворачиваются.'),
    SUB('pen', 'Бронепробитие', 'off', '%', 0, { str: 0.12 }, 'pen', [0, 70], 'Процент брони цели, игнорируемый физическими ударами.'),
    SUB('penMag', 'Пробитие сопротивления', 'off', '%', 0, { int: 0.12 }, 'penMag', [0, 70], 'Процент магического сопротивления цели, игнорируемый заклинаниями.'),
    SUB('dbl', 'Двойной удар', 'off', '%', 0, { agi: 0.08, luk: 0.08 }, 'dbl', [0, 60], 'Шанс, что удар по цели повторится с 50% силы.'),
    SUB('bossDmg', 'Урон по боссам', 'off', '%', 0, { spi: 0.15 }, 'bossDmg', [0, 400], 'Дополнительный урон по боссам и мини-боссам.'),
    SUB('lifesteal', 'Вампиризм', 'off', '%', 0, {}, 'lifesteal', [0, 60], 'Доля нанесённого урона, возвращаемая здоровьем.'),
    SUB('castSpd', 'Скорость каста', 'off', '%', 0, { wis: 0.2, int: 0.05 }, 'castSpd', [0, 60], 'После навыка (не простой атаки) шкала хода заполняется на столько процентов — вы ходите быстрее.'),
    SUB('eva', 'Уклонение', 'def', '%', 0, { agi: 0.2, luk: 0.05 }, 'eva', [0, 60], 'Шанс полностью избежать удара. Снижается меткостью атакующего.'),
    SUB('blockCh', 'Шанс блока', 'def', '%', 0, { vit: 0.12, str: 0.03 }, 'blockCh', [0, 60], 'Шанс заблокировать физический удар.'),
    SUB('blockPow', 'Сила блока', 'def', '%', 30, { vit: 0.1 }, 'blockPow', [0, 85], 'Какую долю урона поглощает блок.'),
    SUB('tenac', 'Стойкость', 'def', '%', 0, { vit: 0.15, spi: 0.2 }, 'tenac', [0, 70], 'Снижает урон от критов и периодический урон (яд, огонь, кровотечение).'),
    SUB('statRes', 'Сопротивление статусам', 'def', '%', 0, { spi: 0.45, vit: 0.05 }, 'statRes', [0, 85], 'Шанс сопротивляться оглушению, заморозке, подчинению и ослаблениям.'),
    SUB('counter', 'Контратака', 'def', '%', 0, { agi: 0.05, str: 0.03 }, 'counter', [0, 60], 'Шанс ответить на физический удар.'),
    SUB('thorns', 'Шипы', 'def', '%', 0, {}, 'thorns', [0, 200], 'Часть физического урона, возвращаемая атакующему.'),
    SUB('hpRegen', 'Регенерация здоровья', 'res', '% за ход', 0, { vit: 0.01 }, 'hpRegen', [0, 15], 'Процент максимума здоровья, восстанавливаемый в начале вашего хода.'),
    SUB('mpRegen', 'Регенерация энергии', 'res', 'за ход', 0, { wis: 0.06 }, 'mpRegen', [0, 60], 'Дополнительная энергия за ход (к базовым +2).'),
    SUB('init', 'Инициатива', 'res', '%', 0, { agi: 0.1, cha: 0.1 }, 'init', [0, 60], 'Шкала хода в начале боя заполнена на столько процентов.'),
    SUB('cdr', 'Снижение перезарядки', 'res', '%', 0, { wis: 0.25 }, 'cdr', [0, 50], 'Каждый ход перезарядки навыков с таким шансом идёт на 1 ход быстрее.'),
    SUB('manaEff', 'Эффективность энергии', 'res', '%', 0, { wis: 0.2, int: 0.1 }, 'manaEff', [0, 50], 'Снижает энергию, которую тратят навыки.'),
    SUB('heal', 'Сила лечения', 'res', '%', 0, { wis: 0.3, spi: 0.1 }, 'heal', [0, 400], 'Множитель любого вашего лечения и щитов от исцеления.'),
    SUB('xp', 'Бонус опыта', 'util', '%', 0, { wis: 0.2 }, 'xp', [0, 300], 'Дополнительный опыт за победы.'),
    SUB('gold', 'Бонус золота', 'util', '%', 0, { cha: 0.3 }, 'gold', [0, 400], 'Дополнительное золото из боёв и событий.'),
    SUB('drop', 'Удача добычи', 'util', '%', 0, { luk: 0.3, cha: 0.1 }, 'drop', [0, 400], 'Шанс выпадения материалов и качество предметов.'),
    SUB('crew', 'Аура Свиты', 'util', '%', 0, { cha: 0.4 }, 'crew', [0, 400], 'Усиление здоровья и силы всех подчинённых в бою.')
  ];
  D.SUB_BY = {}; D.SUBS.forEach((s) => { D.SUB_BY[s.id] = s; });

  const SRC = { race: 'Происхождение', cls: 'Перки Короля', tree: 'Ветки Силы', echo: 'Эхо Нимба', prof: 'Профессии', gear: 'Снаряжение', ench: 'Зачарования', buff: 'Баффы и еда', bond: 'Свита (связи)', extra: 'Прочее', alloc: 'Ваши очки', base: 'Основа' };
  D.SRC_N = SRC;

  // ───── Сбор статов и модификаторов (с учётом источников) ─────
  function addMods(into, m, k, by, src) { if (!m) return; for (const key in m) { const v = m[key] * (k || 1); into[key] = (into[key] || 0) + v; if (by) { const b = by[key] || (by[key] = {}); b[src] = (b[src] || 0) + v; } } }
  E.collect = function (slot, ctx) {
    ctx = ctx || {};
    const h = slot.hero, race = D.RACES[h.race], cls = D.CLASSES[h.cls];
    const mods = {}, stats = {}, flat = {}, skb = {}, by = {}, sby = {};
    const sAdd = (k, v, src) => { stats[k] += v; const b = sby[k] || (sby[k] = {}); b[src] = (b[src] || 0) + v; };
    D.STATS.forEach((s) => { stats[s] = 0; sAdd(s, cls.base[s] + Math.floor(cls.gr[s] * (h.level - 1)), 'base'); if (race.st && race.st[s]) sAdd(s, race.st[s], 'race'); if (h.alloc && h.alloc[s]) sAdd(s, h.alloc[s], 'alloc'); });
    addMods(mods, race.m, 1, by, 'race'); cls.perks.forEach((p) => addMods(mods, p.m, 1, by, 'cls'));
    const fz = E.fused(h);
    const tn = (nodes, spent, src) => nodes.forEach((n) => { const r = spent[n.id] || 0; if (!r || fz[n.id]) return; addMods(mods, n.e.m, r, by, src); if (n.e.st) for (const k in n.e.st) if (stats[k] != null) sAdd(k, n.e.st[k] * r, src); if (n.e.sk) for (const k in n.e.sk) { const key = k === '$' ? 'u_' + h.uniq : k; skb[key] = (skb[key] || 0) + n.e.sk[k] * r; } });
    tn(D.TREES[h.cls].nodes, h.spent, 'tree'); if (h.uniq) tn(D.UNIQ[h.uniq].nodes, h.uspent, 'echo');
    [h.prof1, h.prof2].forEach((pid) => { if (!pid) return; const lv = E.profLv(slot, pid); const pf = D.PROFS[pid]; for (const th in pf.perks) if (lv >= +th && (pid === h.prof1 || +th <= D.PROF_SUB_CAP)) addMods(mods, pf.perks[th].m, 1, by, 'prof'); });
    const gearK = 1 + (mods.gear || 0) / 100;
    for (const sl in slot.eq) {
      const it = slot.eq[sl]; if (!it) continue; const upk = 1 + 0.09 * (it.up || 0);
      for (const k in it.st) { const v = it.st[k]; if (D.STATS.includes(k)) sAdd(k, v * upk * gearK, 'gear'); else if (D.FLAT[k]) flat[k] = (flat[k] || 0) + v * upk * gearK; else addMods(mods, { [k]: v }, 1, by, 'gear'); }
      if (it.en) { const en = D.ENCHANTS.find((e) => e.id === it.en); if (en) addMods(mods, en.m, 1, by, 'ench'); }
    }
    const foodK = 1 + (mods.food || 0) / 100;
    (slot.buffs || []).forEach((b) => { addMods(mods, b.m, b.food ? foodK : 1, by, 'buff'); });
    if (E.bondMods && !ctx.noBond) { const before = Object.assign({}, mods); E.bondMods(slot, mods); for (const k in mods) { const dv = mods[k] - (before[k] || 0); if (dv) { const b = by[k] || (by[k] = {}); b.bond = (b.bond || 0) + dv; } } }
    if (ctx.extraMods) addMods(mods, ctx.extraMods, 1, by, 'extra');
    if (mods.allStat) D.STATS.forEach((s) => { const add = stats[s] * mods.allStat / 100; sAdd(s, add, 'tree'); });
    return { mods, stats, flat, skb, by, sby };
  };

  // ───── Производные значения ─────
  const sumCoef = (coef, s) => { let v = 0; for (const k in coef) v += coef[k] * s[k]; return v; };
  E.subValue = function (def, s, m) {
    const raw = def.base + sumCoef(def.coef, s) + (m[def.mod] || 0) * (def.modScale || 1);
    return clamp(raw, def.cap[0], def.cap[1]);
  };
  E.derive = function (slot, ctx) {
    const h = slot.hero, c = E.collect(slot, ctx), m = c.mods, s = c.stats, f = c.flat, L = h.level;
    // масштабируемые пассивки: зависят от статов/уровня, раскладываются в обычные моды
    if (m.dmgPerWil) m.dmg = (m.dmg || 0) + m.dmgPerWil * s.spi / 25;
    if (m.dmgPerInt) m.dmg = (m.dmg || 0) + m.dmgPerInt * s.int / 25;
    if (m.dmgPerStr) m.dmg = (m.dmg || 0) + m.dmgPerStr * s.str / 25;
    if (m.dmgPerLv) m.dmg = (m.dmg || 0) + m.dmgPerLv * L / 20;
    if (m.hpPerLv) m.hp = (m.hp || 0) + m.hpPerLv * L / 20;
    if (m.critPerLuk) m.crit = (m.crit || 0) + m.critPerLuk * s.luk / 25;
    const pc = (k) => 1 + (m[k] || 0) / 100;
    const d = { lv: L, mods: m, skb: c.skb, by: c.by, sby: c.sby };
    D.STATS.forEach((k) => { d[k] = Math.round(s[k]); });
    d.maxHp = Math.round((40 + s.vit * 8 + L * 10 + (f.hp || 0)) * pc('hp'));
    d.maxMp = Math.round((20 + s.int * 2 + s.spi * 1.5 + s.wis * 2 + (f.mp || 0)) * pc('mp'));
    d.atk = Math.round((s.str * 2 + s.agi * 0.5 + (f.atk || 0)) * pc('atk'));
    d.mag = Math.round((s.int * 2.2 + s.wis * 0.4 + s.spi * 0.2 + (f.mag || 0)) * pc('mag'));
    d.def = Math.round((s.vit * 1.0 + s.str * 0.3 + (f.def || 0)) * pc('def'));
    d.res = Math.round((s.spi * 0.8 + s.wis * 0.2 + s.int * 0.4 + (f.res || 0)) * pc('res'));
    d.spd = Math.round((10 + s.agi * 0.5) * pc('spd') * 10) / 10;
    // субстаты
    const sub = d.sub = {}; D.SUBS.forEach((def) => { sub[def.id] = E.subValue(def, s, m); });
    // значения, которые читает остальной код через mods
    ['xp', 'gold', 'drop', 'crew', 'hpRegen', 'mpRegen', 'counter', 'thorns', 'lifesteal'].forEach((k) => { m[k] = sub[k]; });
    d.hpow = Math.round((s.spi * 1.0 + s.wis * 1.0 + s.int * 0.5 + L * 2 + (f.mag || 0) * 0.25) * (1 + sub.heal / 100));
    d.crit = sub.crit; d.critDmg = sub.critDmg / 100; d.eva = sub.eva;
    { const cd = D.SUBS.find((x) => x.id === 'crit'); d.critRaw = cd ? cd.base + sumCoef(cd.coef, s) + (m.crit || 0) : d.crit; }   // шанс крита без предела (для «Тени за спиной»)
    // стихии: сопротивления и бонусы урона
    sub.resEl = {}; sub.dmgEl = {};
    D.ELEM_IDS.concat(['phys']).forEach((e) => { sub.resEl[e] = clamp((m['res_' + e] || 0) + s.spi * 0.04 + (e === 'phys' ? s.vit * 0.05 : 0), -50, 75); sub.dmgEl[e] = m['dmg_' + e] || 0; });
    return d;
  };

  // ───── Подробности для интерфейса: разбивка источников ─────
  E.srcName = (k) => SRC[k] || k;
  E.subRows = function (slot) {
    const d = E.derive(slot), c = E.collect(slot), m = c.mods, s = c.stats, rows = [];
    D.SUBS.forEach((def) => {
      const parts = []; if (def.base) parts.push({ n: 'Основа', v: def.base });
      for (const k in def.coef) { const v = def.coef[k] * s[k]; if (v) parts.push({ n: D.STAT_N[k] + ' ' + Math.round(s[k]) + ' × ' + def.coef[k], v }); }
      const by = c.by[def.mod] || {}; for (const src in by) if (by[src]) parts.push({ n: SRC[src] || src, v: by[src] * (def.modScale || 1) });
      const formula = def.n + ' = ' + [def.base ? def.base : null].concat(Object.keys(def.coef).map((k) => def.coef[k] + '×' + D.STAT_N[k])).filter((x) => x != null).join(' + ') + ' + бонусы' + (def.cap[1] < 1e3 ? ' (макс. ' + def.cap[1] + ')' : '');
      rows.push({ id: def.id, n: def.n, grp: def.grp, unit: def.unit, v: d.sub[def.id], parts, formula, d: def.d, cap: def.cap, raw: parts.reduce((a, p) => a + p.v, 0) });
    });
    return rows;
  };
  E.elemRows = function (slot) {
    const d = E.derive(slot), c = E.collect(slot), s = c.stats, out = [];
    D.ELEM_IDS.concat(['phys']).forEach((e) => {
      const rp = [], dp = []; const by = c.by['res_' + e] || {}, byd = c.by['dmg_' + e] || {};
      if (s.spi) rp.push({ n: 'Воля ' + Math.round(s.spi) + ' × 0.04', v: s.spi * 0.04 }); if (e === 'phys') rp.push({ n: 'Выносливость ' + Math.round(s.vit) + ' × 0.05', v: s.vit * 0.05 });
      for (const src in by) rp.push({ n: SRC[src] || src, v: by[src] }); for (const src in byd) dp.push({ n: SRC[src] || src, v: byd[src] });
      out.push({ id: e, n: e === 'phys' ? 'Физика' : D.ELEMS[e].n, ic: e === 'phys' ? '⚔️' : D.ELEMS[e].ic, res: d.sub.resEl[e], dmg: d.sub.dmgEl[e], resParts: rp, dmgParts: dp, formula: 'Сопротивление = 0.04×Воля' + (e === 'phys' ? ' + 0.05×Выносливость' : '') + ' + бонусы (макс. 75%)' });
    });
    return out;
  };

  // ───── Очки характеристик: 5 за уровень, ручное распределение ─────
  E.statTotal = (h) => Math.max(0, (h.level - 1) * D.STAT_PER_LEVEL);
  E.statSpent = (h) => Object.values(h.alloc || {}).reduce((a, b) => a + b, 0);
  E.statFree = (h) => Math.max(0, E.statTotal(h) - E.statSpent(h));
  // draft: {стат: добавка}; применяется целиком или не применяется (кнопки +/− в UI работают с черновиком)
  E.statCommit = function (slot, draft) {
    const h = slot.hero; h.alloc = h.alloc || {}; let n = 0; for (const k in draft) { if (!D.STATS.includes(k)) return 0; if (!(draft[k] >= 0) || draft[k] !== Math.floor(draft[k])) return 0; n += draft[k]; }
    if (n < 1 || n > E.statFree(h)) return 0;
    for (const k in draft) if (draft[k]) h.alloc[k] = (h.alloc[k] || 0) + draft[k];
    slot.rev = (slot.rev || 0) + 1; return n;
  };
  E.statRespecCost = (h) => Math.round(40 * h.level * (1 + h.level / 25));
  E.statRespec = function (slot) { const h = slot.hero; if (!E.statSpent(h)) return false; const c = E.statRespecCost(h); if (slot.gold < c) return false; slot.gold -= c; h.alloc = {}; slot.rev = (slot.rev || 0) + 1; return true; };

  // очки навыков: 2 за уровень + 1 за каждые 5 уровней (до ур. 100 → 218)
  E.sp = (h) => Math.max(0, (h.level - 1) * E.TREE_POINTS_PER_LEVEL + Math.floor(h.level / 5) - E.spentPoints(h));

  const _new = E.newSlot; E.newSlot = function (o) { const s = _new(o); s.hero.alloc = {}; return s; };

  // человекочитаемое число: 1 234 / 12.3K / 4.5M / 1.2B (для больших значений урона и опыта)
  E.fmtBig = (v) => { if (v !== v) return '0'; if (v === Infinity || v === -Infinity) return v > 0 ? '∞' : '-∞'; const a = Math.abs(v); if (a < 1e4) return String(Math.round(v)); const u = [[1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K']]; for (const [k, s] of u) if (a >= k) return (Math.round(v / k * 10) / 10) + s; return String(Math.round(v)); };
  if (typeof module !== 'undefined') module.exports = RPG;
})();
