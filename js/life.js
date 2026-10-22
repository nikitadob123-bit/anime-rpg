/* v2.27 «Жизнь в Лагере»: события по календарю, ферма, дом, рыбалка (мини-игра), торговец с ценами дня, день/ночь, титулы и рамки.
   Привязка к профессиям (существующим, ничего в них не меняется): рыбалка — Рыбак, ферма — Травник, дом — дешевле Кузнецу/Кожевнику.
   Правило доступа: пробовать может каждый (35% отдачи, без редкой добычи); профессия как основная — 100% (+2%/ур.) и редкая добыча;
   как дополнительная — 75% (+2%/ур.), редкая добыча вдвое реже. Опыт профессии начисляется только её владельцу (обычным E.profXp). */
(function () {
  const RPG = globalThis.RPG, D = RPG.D, E = RPG.E, S = RPG.S;
  const clamp = E.clamp, H = 3600e3, DAY = 86400e3;
  const L = (s) => Math.max(1, (s.hero && s.hero.level) | 0);
  const give = (s, r) => { if (r.gold) s.gold += r.gold; if (r.mats) for (const m in r.mats) E.addMat(s, m, r.mats[m]); s.rev = (s.rev || 0) + 1; return r; };

  // ───── Профессии: доступ и отдача ─────
  E.profTier = (s, pid) => (s.hero.prof1 === pid ? 'main' : s.hero.prof2 === pid ? 'sub' : 'none');
  E.profEff = function (s, pid) {
    const t = E.profTier(s, pid), lv = t === 'none' ? 0 : ((s.profs && s.profs[pid] && s.profs[pid].lv) | 0);
    return { tier: t, lv, k: t === 'main' ? 1 + 0.02 * lv : t === 'sub' ? 0.75 + 0.02 * lv : 0.35, rare: t === 'main' ? 1 : t === 'sub' ? 0.5 : 0 };
  };
  D.PROF_TIER_N = { main: 'основная профессия', sub: 'дополнительная профессия', none: 'без профессии' };

  // ───── События: по календарю, неделя за неделей ─────
  D.EVENTS = [
    { id: 'fish', n: 'Неделя большого клёва', ic: '🎣', d: 'Рыба клюёт охотнее: +50% улова, редкая рыба вдвое чаще.', fish: 1.5, rare: 2 },
    { id: 'harvest', n: 'Праздник урожая', ic: '🌾', d: 'Грядки растут на 30% быстрее и дают +50% урожая.', farm: 1.5, grow: 0.7 },
    { id: 'fair', n: 'Лунная ярмарка', ic: '🏮', d: 'Торговец уступает 20%, а скупает материалы на 20% дороже.', buy: 0.8, sell: 1.2 },
    { id: 'stars', n: 'Ночь звездопада', ic: '🌠', d: 'Дозор и Башня приносят +25% золота, ночью у пруда ловится звёздная рыба.', gold: 1.25, star: 1 }];
  E.eventOf = (now) => D.EVENTS[((E.weekKey(now) % D.EVENTS.length) + D.EVENTS.length) % D.EVENTS.length];
  E.eventLeft = (now) => { const t = now == null ? Date.now() : now, wk = E.weekKey(t); let x = t; while (E.weekKey(x) === wk) x += H; return x - t; };
  // ───── День и ночь (местное время) ─────
  E.dayPhase = (now) => { const h = new Date(now == null ? Date.now() : now).getHours(); return h >= 5 && h < 9 ? 'dawn' : h >= 9 && h < 18 ? 'day' : h >= 18 && h < 22 ? 'dusk' : 'night'; };
  D.PHASE_N = { dawn: '🌅 Рассвет', day: '☀️ День', dusk: '🌇 Закат', night: '🌙 Ночь' };
  D.PHASE_TXT = { dawn: 'Туман над руинами, у пруда клюёт с первыми лучами.', day: 'Лагерь шумит: торговец разложил товар, на грядках жужжат пчёлы.', dusk: 'Костры зажигаются один за другим. Свита собирается у огня.', night: 'Над Хельмором звёзды. Ночью редкая рыба выходит к поверхности (+25%).' };

  // ───── Новые материалы (только добавление) ─────
  Object.assign(D.MATS, {
    fish_gold: { n: 'Золотой карп', ic: '🐠', v: 120, q: 3, d: 'Редкий улов Рыбака. Ценится у торговца.' },
    fish_star: { n: 'Звёздная рыба', ic: '🌟', v: 260, q: 4, d: 'Светится в темноте. Ловится ночью в Ночь звездопада.' },
    seed_g: { n: 'Семена лугоцвета', ic: '🌱', v: 2, q: 0, d: 'Для грядки.' } });

  // ───── Рыбалка: мини-игра «поймай момент» ─────
  D.FISH_CASTS = 10;
  E.lifeEnsure = function (s, now) {
    now = now == null ? Date.now() : now; const day = E.dayKey(now);
    if (!s.life || typeof s.life !== 'object') s.life = {};
    const l = s.life; if (!l.fish || typeof l.fish !== 'object') l.fish = { day, used: 0, total: 0, rare: 0, best: 0 };
    if (l.fish.day !== day) { l.fish.day = day; l.fish.used = 0; }
    if (!Array.isArray(l.plots)) l.plots = []; if (!l.house || typeof l.house !== 'object') l.house = { garden: 0, pond: 0, bed: 0, work: 0 };
    if (!l.mk || typeof l.mk !== 'object') l.mk = { day: -1, bought: {} }; if (l.mk.day !== day) { l.mk.day = day; l.mk.bought = {}; }
    if (!l.cos || typeof l.cos !== 'object') l.cos = { title: null, frame: null };
    while (l.plots.length < E.plotCount(s)) l.plots.push(null);
    return l;
  };
  E.fishCasts = (s) => D.FISH_CASTS + 2 * (((s.life && s.life.house && s.life.house.pond) | 0));
  // ширина «зелёной зоны» (0…1) — шире у Рыбака
  E.fishZone = (s) => { const e = E.profEff(s, 'fish'); return e.tier === 'main' ? 0.26 + 0.004 * e.lv : e.tier === 'sub' ? 0.2 + 0.004 * e.lv : 0.14; };
  // q — точность попадания 0…1 (1 — в центр зоны), 0 — промах
  E.fishCatch = function (s, q, rng, now) {
    const l = E.lifeEnsure(s, now); if (l.fish.used >= E.fishCasts(s)) return { err: 'Рыба на сегодня ушла — приходите завтра' };
    l.fish.used++; rng = rng || Math.random; const e = E.profEff(s, 'fish'), ev = E.eventOf(now), night = E.dayPhase(now) === 'night';
    if (!(q > 0)) return { miss: true, used: l.fish.used };
    const perfect = q >= 0.8, k = e.k * (ev.fish || 1) * (1 + 0.04 * (l.house.work | 0)), mats = {};
    const rc = e.rare * (perfect ? 0.22 : 0.08) * (ev.rare || 1) * (night ? 1.25 : 1);
    let id; const u = rng();
    if (ev.star && night && e.rare && u < rc * 0.5) id = 'fish_star'; else if (u < rc) id = 'fish_gold'; else id = L(s) >= 40 && rng() < 0.35 + 0.3 * q ? 'fish_i' : L(s) >= 15 && rng() < 0.5 + 0.3 * q ? 'fish_m' : 'fish_s';
    const n = Math.max(1, Math.round((1 + q * 2) * k * (id === 'fish_gold' || id === 'fish_star' ? 0.5 : 1))); mats[id] = n;
    give(s, { mats }); l.fish.total += n; if (id === 'fish_gold' || id === 'fish_star') l.fish.rare++; l.fish.best = Math.max(l.fish.best, Math.round(q * 100));
    const up = e.tier !== 'none' ? E.profXp(s, 'fish', Math.round(6 + 10 * q)) : 0; s.stats.gathered = (s.stats.gathered || 0) + 1;
    return { id, n, perfect, q, rare: id === 'fish_gold' || id === 'fish_star', up, used: l.fish.used, tier: e.tier };
  };

  // ───── Ферма (Травник) ─────
  D.CROPS = [
    { id: 'herb_g', min: 30, seed: 40, base: 4, need: null },
    { id: 'herb_b', min: 60, seed: 120, base: 3, need: null },
    { id: 'herb_r', min: 180, seed: 400, base: 3, need: 'herb' },
    { id: 'herb_s', min: 480, seed: 1500, base: 2, need: 'herb' }];
  E.plotCount = (s) => 2 + (((s.life && s.life.house && s.life.house.garden) | 0));
  E.cropMin = (s, c, now) => Math.round(c.min * (E.eventOf(now).grow || 1) * (E.profTier(s, 'herb') === 'main' ? 0.8 : 1));
  E.plant = function (s, i, cid, now) {
    now = now == null ? Date.now() : now; const l = E.lifeEnsure(s, now), c = D.CROPS.find((x) => x.id === cid); if (!c) return 'Нет такого растения';
    if (i < 0 || i >= l.plots.length) return 'Нет такой грядки'; if (l.plots[i]) return 'Грядка занята';
    if (c.need && E.profTier(s, c.need) === 'none') return 'Это растение умеет выращивать только Травник';
    if (s.gold < c.seed) return 'Не хватает золота на семена'; s.gold -= c.seed; l.plots[i] = { c: cid, t: now, end: now + E.cropMin(s, c, now) * 60e3 }; s.rev++; return '';
  };
  E.harvest = function (s, i, now) {
    now = now == null ? Date.now() : now; const l = E.lifeEnsure(s, now), p = l.plots[i]; if (!p) return { err: 'Грядка пуста' }; if (now < p.end) return { err: 'Ещё не созрело' };
    const c = D.CROPS.find((x) => x.id === p.c), e = E.profEff(s, 'herb'), k = e.k * (E.eventOf(now).farm || 1) * (1 + 0.04 * (l.house.work | 0));
    const n = Math.max(1, Math.round(c.base * k * (1 + 0.3 * D.CROPS.indexOf(c)))), mats = { [c.id]: n };
    if (e.rare && Math.random() < 0.15 * e.rare) mats.dust = (mats.dust || 0) + 1;
    l.plots[i] = null; give(s, { mats }); const up = e.tier !== 'none' ? E.profXp(s, 'herb', 8 + 6 * D.CROPS.indexOf(c)) : 0; s.stats.gathered = (s.stats.gathered || 0) + 1;
    return { mats, up, tier: e.tier };
  };

  // ───── Дом: комнаты с пассивными бонусами для жизни в Лагере ─────
  D.ROOMS = {
    garden: { n: 'Сад', ic: '🌳', max: 3, d: '+1 грядка за уровень' },
    pond: { n: 'Пруд', ic: '🎣', max: 3, d: '+2 заброса удочки в день за уровень' },
    bed: { n: 'Покои', ic: '🛏️', max: 3, d: '+2 ч к сбору Дозора за уровень (до 18 ч)' },
    work: { n: 'Мастерская', ic: '🛠️', max: 3, d: '+4% к улову и урожаю за уровень' } };
  E.roomCost = (s, id) => { const lv = ((E.lifeEnsure(s).house[id]) | 0) + 1, disc = ['smith', 'leath'].some((p) => E.profTier(s, p) !== 'none') ? 0.8 : 1; return { gold: Math.round(5000 * Math.pow(4, lv - 1) * disc), mats: lv === 1 ? { ing_cu: 5, leather: 3 } : lv === 2 ? { ing_fe: 8, leather: 6 } : { ing_ms: 6, silk: 6 }, disc: disc < 1 }; };
  E.roomUpWhy = function (s, id) { const r = D.ROOMS[id]; if (!r) return 'Нет такой комнаты'; const l = E.lifeEnsure(s); if ((l.house[id] | 0) >= r.max) return 'Комната обустроена полностью'; const c = E.roomCost(s, id); if (s.gold < c.gold) return 'Не хватает золота'; for (const m in c.mats) if (((s.mats || {})[m] || 0) < c.mats[m]) return 'Не хватает: ' + D.MATS[m].n; return ''; };
  E.roomUp = function (s, id) { const w = E.roomUpWhy(s, id); if (w) return w; const c = E.roomCost(s, id); s.gold -= c.gold; for (const m in c.mats) s.mats[m] -= c.mats[m]; s.life.house[id]++; E.lifeEnsure(s); s.rev++; return ''; };
  E.houseLv = (s) => { const h = E.lifeEnsure(s).house; return Object.keys(D.ROOMS).reduce((a, k) => a + (h[k] | 0), 0); };
  // Покои удлиняют Дозор; Ночь звездопада — +25% его золота
  const _afkP = E.afkPreview;
  if (_afkP) E.afkPreview = function (s, now) {
    const bed = (s.life && s.life.house && s.life.house.bed) | 0, max0 = D.AFK_MAX_H; D.AFK_MAX_H = max0 + 2 * bed;
    try { const p = _afkP(s, now); const ev = E.eventOf(now); if (ev.gold) p.gold = Math.floor(p.gold * ev.gold); p.maxH = D.AFK_MAX_H; return p; } finally { D.AFK_MAX_H = max0; }
  };
  const _tr = E.towerReward; if (_tr) E.towerReward = function (f, now) { const r = _tr(f), ev = E.eventOf(now); if (ev.gold && r.gold) r.gold = Math.round(r.gold * ev.gold); return r; };

  // ───── Торговец: цены дня ─────
  D.MK_POOL = ['ore_fe', 'ore_ms', 'gem_ae', 'gem_fr', 'herb_r', 'herb_s', 'silk', 'leather', 'ess', 'ess_l', 'dust', 'fish_i', 'fang'];
  E.mkDay = function (s, now) {
    const day = E.dayKey(now), r = E.rng(day * 4099 + 17), pool = D.MK_POOL.filter((m) => D.MATS[m]), ev = E.eventOf(now), out = [];
    while (out.length < 6 && pool.length) { const id = pool.splice(Math.floor(r() * pool.length) % pool.length, 1)[0], f = Math.round((0.6 + r() * 1.0) * 100) / 100, v = D.MATS[id].v;
      out.push({ id, f, buy: Math.max(1, Math.round(v * 3 * f * (ev.buy || 1))), sell: Math.max(1, Math.round(v * f * (ev.sell || 1))), stock: id === 'star_ore' ? 3 : 10, trend: f > 1.15 ? 'up' : f < 0.85 ? 'down' : 'flat' }); }
    return out;
  };
  E.mkBuy = function (s, id, n, now) { n = Math.max(1, n | 0); const l = E.lifeEnsure(s, now), it = E.mkDay(s, now).find((x) => x.id === id); if (!it) return 'Сегодня не продаётся'; if ((l.mk.bought[id] | 0) + n > it.stock) return 'Запас на сегодня кончился'; if (s.gold < it.buy * n) return 'Не хватает золота'; s.gold -= it.buy * n; l.mk.bought[id] = (l.mk.bought[id] | 0) + n; E.addMat(s, id, n); s.rev++; return ''; };
  E.mkSell = function (s, id, n, now) { n = Math.max(1, n | 0); const it = E.mkDay(s, now).find((x) => x.id === id) || (id === 'fish_gold' || id === 'fish_star' ? { sell: Math.round(D.MATS[id].v * (E.eventOf(now).sell || 1)) } : null); if (!it) return 'Сегодня торговец это не скупает'; if (((s.mats || {})[id] || 0) < n) return 'Нет столько'; s.mats[id] -= n; s.gold += it.sell * n; s.rev++; return ''; };

  // ───── Титулы и рамки ─────
  const achN = (s) => (s.ach && s.ach.claimed ? s.ach.claimed.length : 0), famDone = (s, f, t) => !!(s.ach && s.ach.claimed && s.ach.claimed.includes(f + '_' + t));
  D.TITLES = [
    { id: 'king', n: 'Король Демонов', ok: () => true },
    { id: 'slayer', n: 'Гроза чудовищ', ok: (s) => famDone(s, 'kills', 1) },
    { id: 'bossbane', n: 'Убийца боссов', ok: (s) => famDone(s, 'wins', 1) },
    { id: 'rich', n: 'Златой Король', ok: (s) => famDone(s, 'gold', 2) },
    { id: 'chron', n: 'Летописец', ok: (s) => famDone(s, 'story', 1) },
    { id: 'beast', n: 'Хозяин зверинца', ok: (s) => famDone(s, 'pets', 1) },
    { id: 'tower50', n: 'Восходящий к небу', ok: (s) => ((s.tower && s.tower.best) | 0) >= 50 },
    { id: 'tower', n: 'Покоритель Башни', ok: (s) => ((s.tower && s.tower.best) | 0) >= 100 },
    { id: 'arena', n: 'Чемпион арены', ok: (s) => ((s.arena && s.arena.best) | 0) >= 1450 },
    { id: 'angler', n: 'Морской волк', ok: (s) => ((s.life && s.life.fish && s.life.fish.rare) | 0) >= 10 },
    { id: 'farmer', n: 'Добрый хозяин', ok: (s) => E.houseLv(s) >= 6 }];
  D.FRAMES = [
    { id: 'rar', n: 'По редкости снаряжения', c: null, ok: () => true },
    { id: 'gold', n: 'Золотая', c: '#ffd36b', ok: (s) => achN(s) >= 10 },
    { id: 'void', n: 'Пустота', c: '#9b6bff', ok: (s) => ((s.tower && s.tower.best) | 0) >= 30 },
    { id: 'blood', n: 'Кровавая', c: '#ff4d6d', ok: (s) => ((s.arena && s.arena.best) | 0) >= 1250 },
    { id: 'sea', n: 'Морская', c: '#4dd8ff', ok: (s) => ((s.life && s.life.fish && s.life.fish.total) | 0) >= 50 },
    { id: 'dragon', n: 'Драконья', c: '#ff9a3c', ok: (s) => Object.keys(s.pets || {}).some((id) => D.PET[id] && D.PET[id].dragon) },
    { id: 'star', n: 'Звёздная', c: '#e8f4ff', ok: (s) => achN(s) >= 30 }];
  E.titlesOf = (s) => D.TITLES.filter((t) => t.ok(s)); E.framesOf = (s) => D.FRAMES.filter((f) => f.ok(s));
  E.setTitle = function (s, id) { const t = D.TITLES.find((x) => x.id === id); if (!t || !t.ok(s)) return 'Титул ещё не открыт'; E.lifeEnsure(s).cos.title = id; s.rev++; return ''; };
  E.setFrame = function (s, id) { const f = D.FRAMES.find((x) => x.id === id); if (!f || !f.ok(s)) return 'Рамка ещё не открыта'; E.lifeEnsure(s).cos.frame = id === 'rar' ? null : id; s.rev++; return ''; };
  E.titleName = (s) => { const id = s.life && s.life.cos && s.life.cos.title, t = id && D.TITLES.find((x) => x.id === id); return t ? t.n : 'Король Демонов'; };

  // ───── Слоты и миграция v11 → v12 ─────
  const _ns = E.newSlot; E.newSlot = function (o) { const s = _ns(o); E.lifeEnsure(s, o && o.now); return s; };
  if (S && S.migrations) { S.VERSION = 12; S.migrations[11] = function (p) { p.slots = (p.slots || []).map((s) => { if (s) E.lifeEnsure(s); return s; }); p.v = 12; return p; }; }
  if (typeof module !== 'undefined') module.exports = RPG;
})();
