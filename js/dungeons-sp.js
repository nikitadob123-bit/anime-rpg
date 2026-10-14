/* v2.18: особые подземелья по образцу Подземелья Артефактов — «Подземелье Золота» (ур. 10→100) и «Подземелье Материалов» (ур. 10→300).
   Этапы по порядку, страж в конце, открытие с ур. 10, без лимитов попыток (как у Артефактов). Боевой уровень — сжатая шкала (кап героя 100). Логика без DOM. */
(function () {
  const RPG = globalThis.RPG, D = RPG.D, E = RPG.E, C = RPG.C;
  const SRC = ['wood', 'mines', 'swamp', 'spire', 'chapel', 'ossuary', 'crater', 'tempest', 'sunken', 'garden', 'citadel', 'abyss', 'nowhere'];
  const mkStages = (sp, pfx, name, ic, col, urs, lvOf, srcs, d) => urs.map((ur, i) => {
    const B = D.DUN[srcs[i]] || D.DUNGEONS[0];
    return { id: pfx + (i + 1), i, sp, n: name + ' · этап ' + (i + 1), ic, lv: lvOf(ur), ur, floors: 2, bio: B.bio, col, src: srcs[i], d: d + ' Этап ' + (i + 1) + ' из ' + urs.length + ' (ур. ' + ur + ').',
      pool: B.pool.slice(), mini: B.mini, boss: B.boss, ev: ['chest', 'rest', 'shrine'], need: i ? pfx + i : null, hidden: 1, mul: 1 + i * 0.04 };
  });
  D.SP_DUNS = {
    gold: { id: 'gold', n: 'Подземелье Золота', ic: '💰', col: '#6a5418', unlock: 10, d: 'Сокровищница павшего королевства: стражи стерегут сундуки, враги роняют в полтора раза больше золота.',
      stages: mkStages('gold', 'gold', 'Подземелье Золота', '💰', '#6a5418', [10, 20, 30, 40, 50, 60, 70, 80, 90, 100], (ur) => ur, ['mill', 'wood', 'swamp', 'cathedral', 'ossuary', 'crater', 'tempest', 'sunken', 'citadel', 'nowhere'], 'Залы, где монеты сыплются со сводов.') },
    mats: { id: 'mats', n: 'Подземелье Материалов', ic: '⛏️', col: '#2a5a4a', unlock: 10, d: 'Жилы, кладовые и алтари: материалы для ремесла, кузни и чар. Чем глубже, тем выше качество; божественные — только на последних этапах.',
      stages: mkStages('mats', 'matd', 'Подземелье Материалов', '⛏️', '#2a5a4a', [10, 30, 55, 80, 110, 140, 170, 210, 250, 300], (ur) => Math.round(10 + (ur - 10) * (120 / 290)), ['mill', 'mines', 'spire', 'ossuary', 'crater', 'sunken', 'garden', 'citadel', 'abyss', 'nowhere'], 'Шахты и склады старше мира.') }
  };
  D.SP_IDS = Object.keys(D.SP_DUNS);
  D.SP_IDS.forEach((k) => D.SP_DUNS[k].stages.forEach((d) => { D.DUNGEONS.push(d); D.DUN[d.id] = d; }));

  // ───── Награды ─────
  // Золото: страж этапа i — 600·1.6^i (600 … ~41 000), плюс удвоенное золото врагов в каждом бою
  D.GOLD_STAGE = D.SP_DUNS.gold.stages.map((d, i) => Math.round(450 * Math.pow(1.6, i) / 10) * 10);
  D.GOLD_KILL_K = 1.5;
  // Материалы: качество 0…7 (Обычный … Божественный), пулы — материалы ремесла/кузни/чар
  D.MAT_POOL = [['ore_cu', 'herb_g', 'hide', 'cloth'], ['ore_fe', 'ing_cu', 'herb_b', 'fang', 'leather'], ['ore_ms', 'gem_ae', 'ing_fe', 'herb_r', 'silk', 'dust'], ['ing_ms', 'gem_fr', 'herb_s', 'ess', 'ess_l'], ['star_ore'], ['phoenix_f'], ['myth_blood'], ['nimbus_shard']];   // высшие материалы объявляет craft.js (грузится позже) — фильтр при броске
  // [мин. качество, макс. качество, бросков] по этапам; Божественное (7) — только два последних этапа
  D.MAT_STAGE = [[0, 1, 3], [0, 2, 3], [1, 3, 4], [1, 3, 4], [2, 4, 4], [2, 5, 5], [3, 5, 5], [3, 6, 5], [4, 7, 6], [4, 7, 6]];
  D.MAT_DIVINE_STAGES = [8, 9];
  E.matStageRoll = function (i, rng) {
    const [lo, hi, n] = D.MAT_STAGE[i], out = {};
    for (let k = 0; k < n; k++) {
      const w = []; for (let q = lo; q <= hi; q++) w.push(q === 7 ? 0.6 : Math.pow(1.8, hi - q));   // выше качество — реже
      let u = rng() * w.reduce((a, b) => a + b, 0), q = lo; for (let j = 0; j < w.length; j++) { if (u < w[j]) { q = lo + j; break; } u -= w[j]; }
      const pool = D.MAT_POOL[q].filter((id) => D.MATS[id]); if (!pool.length) continue; const id = pool[Math.floor(rng() * pool.length) % pool.length];
      const qty = q >= 6 ? 1 : q >= 4 ? 1 + Math.floor(rng() * 2) : 2 + Math.floor(rng() * (3 + i));
      out[id] = (out[id] || 0) + qty;
    }
    return out;
  };

  // ───── Открытие и бои ─────
  E.spStage = (did) => { const d = D.DUN[did]; return d && d.sp ? d : null; };
  E.spStageOpen = function (s, sp, i) { const S = D.SP_DUNS[sp], d = S && S.stages[i]; if (!d || !s || !s.hero || s.hero.level < S.unlock) return false; return i === 0 || !!(s.prog && s.prog.cleared[S.stages[i - 1].id]); };
  const _unl = E.dungeonUnlocked; E.dungeonUnlocked = function (slot, did) { const d = E.spStage(did); return d ? E.spStageOpen(slot, d.sp, d.i) : _unl(slot, did); };
  const _tier = E.tierUnlocked; E.tierUnlocked = (slot, did, t) => (E.spStage(did) ? t === 0 : _tier(slot, did, t));
  const _ne = C.nodeEnemies;
  C.nodeEnemies = function (run, node, idx) {
    const d = E.spStage(run.did); if (!d) return _ne(run, node, idx);
    const lv0 = E.dungeonLv(d, 0, node.f), bump = node.t === 'mini' ? 1 : node.t === 'boss' ? 2 : 0;
    return node.e.map((eid, i) => { const u = C.unitFromEnemy(eid, Math.min(140, lv0 + bump + (node.elite && i === 0 ? 1 : 0)), 0, !!(node.elite && i === 0), 'e' + i);
      ['maxHp', 'atk', 'mag', 'hpow', 'def', 'res'].forEach((k) => { u[k] = Math.round(u[k] * d.mul); }); u.hp = u.maxHp; return u; });
  };
  const _fin = C.finishBattle;
  C.finishBattle = function (slot, B) {
    const run = slot.run, node = run && run.nodes[run.node], d = run && E.spStage(run.did);
    const rep = _fin(slot, B); if (!d || B.over !== 'win') return rep;
    if (d.sp === 'gold' && rep.gold) { const extra = Math.round(rep.gold * (D.GOLD_KILL_K - 1)); run.bag.gold += extra; rep.gold += extra; }
    if (node && node.t === 'boss') {
      slot.spProg = slot.spProg || {}; slot.spProg[d.id] = (slot.spProg[d.id] || 0) + 1;
      const rng = E.rng((run.seed * 17 + 3 + slot.spProg[d.id] * 131) >>> 0);
      if (d.sp === 'gold') { const g = D.GOLD_STAGE[d.i]; run.bag.gold += g; rep.spGold = g; }
      else { const m = E.matStageRoll(d.i, rng); for (const k in m) run.bag.mats[k] = (run.bag.mats[k] || 0) + m[k]; rep.spMats = m; }
    }
    return rep;
  };
  if (typeof module !== 'undefined') module.exports = RPG;
})();
