/* v2.33.0 «Ранги Рейны»: особый путь развития Рейны Мисимы (tk_reina).
   — Свой потолок уровня 100 (не зависит от уровня героя); «Разорвать предел» поднимает его до 150 ценой 10 уровней героя.
   — Каждые 10 уровней — «Возвышение ранга» (10 рангов, по порядку): ранг N требует ур. 10·N; опыт выше ур. 10·(ранг+1) не копится, пока ранг не поднят.
   — Каждый ранг умножает её статы на ×1,3 (на ранге 10 — ×13,8). Обычные звёзды возвышения ей не нужны (купленные раньше остаются в силе).
   Всё хранится в slot.reinaAsc = { rank, capBreak } — добавляется при обращении, старые сохранения грузятся как ранг 0. */
(function () {
  const RPG = globalThis.RPG, D = RPG.D, E = RPG.E, C = RPG.C;
  const clamp = E.clamp;
  const ID = 'tk_reina';
  D.REINA_ASC = {
    id: ID,
    max: 10,            // число рангов
    step: 10,           // ранг каждые 10 уровней
    k: 1.3,             // множитель статов за ранг
    cap: 100,           // потолок уровня
    capBreak: 150,      // потолок после «Разорвать предел»
    heroCost: 10,       // жертва: уровни героя
    heroMin: 20,        // минимальный уровень героя для жертвы (после — не ниже 10)
    names: ['Без ранга', 'Ученица Мисимы', 'Боец Железного Кулака', 'Мастер ринга', 'Грозовая наследница', 'Пурпурная молния',
      'Клинок Короля', 'Буря Мисима', 'Пробуждённая кровь', 'Гроза миров', 'Правая рука Короля Демонов'],
    // цена ранга N: золото 5000·N², знаки возвышения N
    cost: (n) => ({ gold: 5000 * n * n, sig: n, lv: 10 * n })
  };
  const A = D.REINA_ASC;
  E.isReina = (id) => id === ID;
  E.reinaAsc = function (s) {
    if (!s) return { rank: 0, capBreak: 0 };
    let r = s.reinaAsc;
    if (!r || typeof r !== 'object' || Array.isArray(r)) r = s.reinaAsc = { rank: 0, capBreak: 0 };
    r.rank = clamp(r.rank | 0, 0, A.max); r.capBreak = r.capBreak ? 1 : 0;
    return r;
  };
  E.reinaRankK = (rank) => Math.pow(A.k, clamp(rank | 0, 0, A.max));
  E.reinaMaxCap = (s) => (E.reinaAsc(s).capBreak ? A.capBreak : A.cap);
  // текущий потолок с учётом рангов: до ранга 10 — ур. 10·(ранг+1)
  E.reinaGate = (s) => { const r = E.reinaAsc(s); return r.rank >= A.max ? E.reinaMaxCap(s) : Math.min(E.reinaMaxCap(s), A.step * (r.rank + 1)); };

  const _cap = E.crewCap;
  E.crewCap = function (slot, id) {
    if (id === ID && slot && slot.crew && slot.crew[ID]) return Math.max(E.reinaGate(slot), 1);
    return _cap(slot, id);
  };
  // звёзды для мастерства и поддержки: ранги засчитываются как звёзды (по одной за 2 ранга)
  const _stars = E.crewStars;
  if (_stars) E.crewStars = function (slot, id) {
    const b = _stars(slot, id); if (id !== ID) return b;
    return clamp(b + Math.ceil(E.reinaAsc(slot).rank / 2), 0, D.CREW_STAR_MAX || 5);
  };
  const _caw = E.crewAscendWhy;
  E.crewAscendWhy = function (slot, id) { if (id === ID && slot.crew && slot.crew[id]) return 'У Рейны свой путь — ранги'; return _caw(slot, id); };

  E.reinaRankWhy = function (s) {
    const st = s && s.crew && s.crew[ID]; if (!st) return 'Рейны нет в Свите';
    const r = E.reinaAsc(s); if (r.rank >= A.max) return 'Все ранги взяты';
    const c = A.cost(r.rank + 1);
    if ((st.lv | 0) < c.lv) return 'Нужен ур. ' + c.lv;
    if ((s.gold || 0) < c.gold) return 'Не хватает золота';
    if (((s.mats && s.mats.asc_sigil) || 0) < c.sig) return 'Нужно знаков: ' + c.sig;
    return '';
  };
  E.reinaRankUp = function (s) {
    const w = E.reinaRankWhy(s); if (w) return w;
    const r = E.reinaAsc(s), c = A.cost(r.rank + 1);
    s.gold -= c.gold; s.mats.asc_sigil -= c.sig; r.rank++; s.rev = (s.rev || 0) + 1;
    return '';
  };
  E.reinaBreakWhy = function (s) {
    const st = s && s.crew && s.crew[ID]; if (!st) return 'Рейны нет в Свите';
    const r = E.reinaAsc(s); if (r.capBreak) return 'Предел уже разорван';
    if (r.rank < A.max) return 'Нужен ранг ' + A.max;
    if ((st.lv | 0) < A.cap) return 'Рейне нужен ур. ' + A.cap;
    if ((s.hero.level | 0) < A.heroMin) return 'Герою нужен ур. ' + A.heroMin + '+';
    return '';
  };
  // жертва: герой теряет 10 уровней (опыт текущего уровня обнуляется; изученные узлы и вложенные очки остаются,
  // новые очки снова пойдут, когда уровень догонит вложенное). Рейна получает потолок 150.
  E.reinaBreak = function (s) {
    const w = E.reinaBreakWhy(s); if (w) return w;
    const h = s.hero; h.level = Math.max(1, (h.level | 0) - A.heroCost); h.xp = 0;
    E.reinaAsc(s).capBreak = 1; s.rev = (s.rev || 0) + 1;
    return '';
  };

  // бой: множитель ранга поверх всего остального (верность, звёзды, узы)
  const _ufc = C.unitFromCrew;
  C.unitFromCrew = function (slot, id, hpFrac) {
    const u = _ufc(slot, id, hpFrac); if (id !== ID) return u;
    const k = E.reinaRankK(E.reinaAsc(slot).rank); if (k === 1) return u;
    const f = u.hp / Math.max(1, u.maxHp);
    ['maxHp', 'atk', 'mag', 'hpow', 'def', 'res'].forEach((x) => { u[x] = Math.round(u[x] * k); });
    u.hp = Math.round(u.maxHp * f); u.reinaRank = E.reinaAsc(slot).rank;
    return u;
  };
  E.crewPower = (u) => Math.round(u.maxHp / 8 + Math.max(u.atk, u.mag, u.hpow) + u.def / 2 + u.res / 3);

  if (typeof module !== 'undefined') module.exports = RPG;
})();
