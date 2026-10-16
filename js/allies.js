/* v2.24 «Союзники»: спутницы Мировых артефактов — отдельный класс. Свой уровень со старта (25–35 от силы артефакта),
   мощные базовые статы, эволюция до 5 звёзд (+25% за звезду) за золото и редкие материалы; навык/пассив на ★1/★3/★5. */
(function () {
  const RPG = globalThis.RPG, D = RPG.D, E = RPG.E, C = RPG.C, S = RPG.S;
  const SK = D.SKILLS, clamp = E.clamp;
  D.ALLY_STAR_MAX = 5;
  D.ALLY_STAR_K = 0.25;             // +25% к статам за звезду
  D.ALLY_BASE_LV = 25;              // стартовый уровень; +2 за каждую звезду артефакта (0…5) → 25…35
  D.ALLY_BASE_K = 1.5;              // базовый множитель статов (+0,1 за звезду артефакта): компенсирует снаряжение низкой редкости
  // цена эволюции: золото круто растёт; ранние звёзды — редкие материалы, поздние — материалы высших редкостей
  D.ALLY_EVO = [
    { gold: 1e6, mats: { star_ore: 30 } },
    { gold: 4e6, mats: { star_ore: 60, phoenix_f: 20 } },
    { gold: 12e6, mats: { phoenix_f: 40, myth_blood: 15 } },
    { gold: 30e6, mats: { myth_blood: 35, nimbus_shard: 10 } },
    { gold: 65e6, mats: { myth_blood: 60, nimbus_shard: 30 } }];
  const sg = (id, o) => { o.id = id; o.cls = 'crew'; SK[id] = o; };
  sg('g_asteria_2', { n: 'Звёздопад', ic: '☄️', mp: 16, cd: 2, tgt: 'foes', d: 'Эволюция ★1: звёздный дождь — 120% магии по всем, «Уязвимость».', fx: [{ k: 'dmg', s: 'mag', m: 1.2, el: 'arcane' }, { k: 'st', id: 'vuln', p: 1, dur: 2 }] });
  sg('g_asteria_3', { n: 'Сингулярность', ic: '⚫', mp: 26, cd: 3, tgt: 'foes', d: 'Эволюция ★5: улучшенный «Горизонт событий» — пустота 260% по всем, «Уязвимость», 55% оглушить.', fx: [{ k: 'dmg', s: 'mag', m: 2.6, el: 'arcane' }, { k: 'st', id: 'vuln', p: 1, dur: 3 }, { k: 'st', id: 'stun', p: 0.55, dur: 1 }] });
  sg('g_grimhild_2', { n: 'Звон золота', ic: '💰', mp: 12, cd: 2, tgt: 'foe', d: 'Эволюция ★1: град монет — удар 230%, кровотечение.', fx: [{ k: 'dmg', s: 'atk', m: 2.3 }, { k: 'st', id: 'bleed', p: 1, dur: 3 }] });
  sg('g_grimhild_3', { n: 'Бездонный удар', ic: '🔨', mp: 22, cd: 3, tgt: 'foe', d: 'Эволюция ★5: улучшенная «Расколотая сокровищница» — удар 480%, 75% оглушить, кровотечение.', fx: [{ k: 'dmg', s: 'atk', m: 4.8 }, { k: 'st', id: 'stun', p: 0.75, dur: 1 }, { k: 'st', id: 'bleed', p: 1, dur: 4 }] });
  // что открывает каждая звезда (текст для интерфейса)
  D.ALLY_PERKS = {
    asteria: { 1: 'Навык «Звёздопад»', 3: 'Пассив «Гравитационный колодец»: +30 к силе всех навыков, +15% сопротивления', 5: '«Горизонт событий» → «Сингулярность»' },
    grimhild: { 1: 'Навык «Звон золота»', 3: 'Пассив «Хозяйка сокровищницы»: +20% здоровья/защиты, +10% атаки', 5: '«Расколотая сокровищница» → «Бездонный удар»' } };
  const UPG = { g_asteria: 'g_asteria_3', g_grimhild: 'g_grimhild_3' }, EV1 = { asteria: 'g_asteria_2', grimhild: 'g_grimhild_2' };

  E.isAlly = (id) => !!(D.CREW[id] && D.CREW[id].t === 'art');
  E.allyIds = (slot) => D.CREW_ARTS.filter((id) => slot.crew && slot.crew[id]);
  E.allyArtId = (id) => { const a = D.ARTIFACTS.find((x) => x.comp === id); return a && a.id; };
  E.allyArtStar = (slot, id) => { const a = E.allyArtId(id); return a && slot.arts && slot.arts[a] != null ? clamp(slot.arts[a] | 0, 0, 5) : 0; };
  E.allyFloor = (slot, id) => (E.isAlly(id) && slot.crew && slot.crew[id] ? D.ALLY_BASE_LV + 2 * E.allyArtStar(slot, id) : 0);
  E.allyEv = (slot, id) => { const st = slot.crew && slot.crew[id]; return E.isAlly(id) && st ? clamp(st.ev | 0, 0, D.ALLY_STAR_MAX) : 0; };
  E.crewStars = (slot, id) => (E.isAlly(id) ? E.allyEv(slot, id) : ((slot.crew[id] && slot.crew[id].star) | 0));
  // нормализует союзника: поле ev, уровень не ниже стартового
  E.allyEnsure = function (slot, id) {
    const st = slot.crew && slot.crew[id]; if (!st || !E.isAlly(id)) return st;
    st.ev = clamp(st.ev | 0, 0, D.ALLY_STAR_MAX); const f = E.allyFloor(slot, id); if (st.lv < f) { st.lv = f; st.xp = 0; } return st;
  };
  E.allyBaseK = (slot, id) => D.ALLY_BASE_K + 0.1 * E.allyArtStar(slot, id);
  E.crewK = (slot, id, st) => (E.isAlly(id) ? E.allyBaseK(slot, id) * (1 + D.ALLY_STAR_K * E.allyEv(slot, id)) : 1 + 0.12 * ((st && st.star) | 0));
  E.allyStats = function (slot, id) { const u = C.unitFromCrew(slot, id, 1); return { lv: u.lv, maxHp: u.maxHp, atk: u.atk, mag: u.mag, def: u.def, res: u.res }; };
  E.allyCost = (slot, id) => { const n = E.allyEv(slot, id); return n >= D.ALLY_STAR_MAX ? null : D.ALLY_EVO[n]; };
  E.allyEvolveWhy = function (slot, id) {
    if (!E.isAlly(id) || !slot.crew[id]) return 'Нет такого союзника';
    const c = E.allyCost(slot, id); if (!c) return 'Максимум звёзд';
    if (slot.gold < c.gold) return 'Не хватает золота';
    for (const m in c.mats) if (((slot.mats || {})[m] || 0) < c.mats[m]) return 'Не хватает: ' + D.MATS[m].n;
    return '';
  };
  E.allyEvolve = function (slot, id) {
    const w = E.allyEvolveWhy(slot, id); if (w) return w; const c = E.allyCost(slot, id), st = E.allyEnsure(slot, id);
    slot.gold -= c.gold; for (const m in c.mats) slot.mats[m] -= c.mats[m]; st.ev++; slot.rev++; return '';
  };
  // навыки: ★1 — новый навык, ★5 — улучшение сигнатурного
  const _cs = E.crewSkills;
  E.crewSkills = function (slot, id) {
    const out = _cs(slot, id); if (!E.isAlly(id)) return out; const ev = E.allyEv(slot, id);
    if (ev >= 5) out.forEach((k, i) => { if (UPG[k]) out[i] = UPG[k]; });
    if (ev >= 1 && EV1[id] && !out.includes(EV1[id])) out.push(EV1[id]);
    return out;
  };
  // бой: ★3 — пассив; уровень не ниже стартового
  const _ufc = C.unitFromCrew;
  C.unitFromCrew = function (slot, id, hpFrac) {
    if (E.isAlly(id)) E.allyEnsure(slot, id);
    const u = _ufc(slot, id, hpFrac); if (!E.isAlly(id) || E.allyEv(slot, id) < 3) return u;
    if (id === 'asteria') { u.skb = Object.assign({}, u.skb); u.sk.forEach((k) => { u.skb[k] = (u.skb[k] || 0) + 30; }); u.res = Math.round(u.res * 1.15); }
    else { const f = u.hp / Math.max(1, u.maxHp); ['maxHp', 'def', 'res'].forEach((x) => { u[x] = Math.round(u[x] * 1.2); }); u.atk = Math.round(u.atk * 1.1); u.hpow = Math.round(u.hpow * 1.1); u.hp = Math.round(u.maxHp * f); }
    return u;
  };
  // у союзников — эволюция, а не возвышение за знаки
  const _caw = E.crewAscendWhy; E.crewAscendWhy = function (slot, id) { return E.isAlly(id) && slot.crew[id] ? 'Союзники развиваются эволюцией (карточка «Союзники»)' : _caw(slot, id); };
  // появление и рост артефакта поднимают стартовый уровень
  const _rec = E.recruit; E.recruit = function (slot, id) { const r = _rec(slot, id); if (r) E.allyEnsure(slot, id); return r; };
  const _ag = E.artGain; E.artGain = function (s, id) { const r = _ag(s, id); if (r) E.allyIds(s).forEach((x) => E.allyEnsure(s, x)); return r; };

  // ───── Миграция v8 → v9: у существующих союзников появляются ev и стартовый уровень ─────
  E.migrateAllySlot = function (s) { if (!s) return s; E.allyIds(s).forEach((id) => E.allyEnsure(s, id)); return s; };
  if (S && S.migrations) {
    S.VERSION = 9;
    S.migrations[8] = function (p) { p.slots = (p.slots || []).map((s) => (s ? E.migrateAllySlot(s) : s)); p.v = 9; return p; };
  }
  if (typeof module !== 'undefined') module.exports = RPG;
})();
