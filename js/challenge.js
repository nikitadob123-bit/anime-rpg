/* v2.26 «Испытания»: Башня испытаний (100 этажей), Арена против копий отрядов (недельный рейтинг), Тренировочный зал (энергия).
   Только добавляет: бои идут на существующем движке, опыт и обычная добыча вылазок не начисляются; награды — свои. */
(function () {
  const RPG = globalThis.RPG, D = RPG.D, E = RPG.E, C = RPG.C, S = RPG.S;
  const clamp = E.clamp, H = 3600e3;
  const L = (s) => Math.max(1, (s.hero && s.hero.level) | 0);
  const give = (s, r) => { if (r.gold) s.gold += r.gold; if (r.sig) E.addMat(s, 'asc_sigil', r.sig); if (r.egg >= 0 && r.egg != null && E.eggAdd) E.eggAdd(s, r.egg, 1); if (r.mats) for (const m in r.mats) E.addMat(s, m, r.mats[m]); s.rev = (s.rev || 0) + 1; return r; };
  const party = (s) => { const P = C.unitFromSlot(s), out = [P]; (s.party || []).forEach((id) => { if (s.crew[id] && out.length < 4) out.push(C.unitFromCrew(s, id, 1)); }); return out; };
  const mkB = (s, foes, seed, o) => { const p = party(s), B = C.create(p, foes, E.rng(seed >>> 0), Object.assign({ cons: s.cons, cmd: !!s.cmd, noFlee: true }, o || {})); B.cons = s.cons; const m = p[0].mods; B.potionK = 1 + (m.potion || 0) / 100; B.bombK = 1 + (m.bomb || 0) / 100; return B; };
  E.challengeWhy = (s) => (s.run ? 'Сначала завершите вылазку' : '');

  // ═════ Башня испытаний ═════
  D.TOWER_MAX = 100;
  const SRC = () => D.DUNGEONS.filter((d) => !d.sp && !d.hidden);
  E.towerLv = (f) => Math.min(140, 2 + Math.round(f * 0.95));
  E.towerMul = (f) => 1 + 0.006 * f;
  E.towerSrc = (f) => { const lv = E.towerLv(f), xs = SRC(); let b = xs[0]; xs.forEach((d) => { if (d.lv <= lv) b = d; }); return b; };
  E.towerKind = (f) => (f % 10 === 0 ? 'boss' : f % 5 === 0 ? 'mini' : 'fight');
  E.towerFoes = function (f) {
    const d = E.towerSrc(f), k = E.towerKind(f), r = E.rng(f * 7919 + 13), lv = E.towerLv(f), m = E.towerMul(f), pool = d.pool;
    const ids = k === 'boss' ? [d.boss, pool[f % pool.length]] : k === 'mini' ? [d.mini, pool[f % pool.length]] : [0, 1, 2].slice(0, 2 + (f % 3 === 0 ? 1 : 0)).map(() => pool[Math.floor(r() * pool.length) % pool.length]);
    return ids.map((eid, i) => { const u = C.unitFromEnemy(eid, lv + (k !== 'fight' && i === 0 ? 2 : 0), 0, k === 'fight' && i === 0 && f % 4 === 0, 'e' + i); ['maxHp', 'atk', 'mag', 'hpow', 'def', 'res'].forEach((x) => { u[x] = Math.round(u[x] * m); }); u.hp = u.maxHp; return u; });
  };
  E.towerReward = function (f) {
    const r = { gold: 100 + 40 * f };
    if (f % 5 === 0) r.mats = E.matStageRoll(Math.min(9, Math.floor((f - 1) / 10)), E.rng(f * 131 + 7));
    if (f % 10 === 0) { r.gold += 600 * f; r.sig = f / 10; r.egg = Math.min(5, Math.floor(f / 20)); }
    if (f === D.TOWER_MAX) { r.mats = Object.assign({}, r.mats, { nimbus_shard: 3 }); r.title = 'Покоритель Башни'; }
    return r;
  };
  E.towerEnsure = (s) => { if (!s.tower || typeof s.tower !== 'object') s.tower = { best: 0, tries: 0 }; s.tower.best = clamp(s.tower.best | 0, 0, D.TOWER_MAX); return s.tower; };
  E.towerNext = (s) => Math.min(D.TOWER_MAX, E.towerEnsure(s).best + 1);
  E.towerBattle = function (s, o) { const w = E.challengeWhy(s); if (w) return { err: w }; const t = E.towerEnsure(s); if (t.best >= D.TOWER_MAX) return { err: 'Башня покорена' }; const f = t.best + 1; t.tries++; const B = mkB(s, E.towerFoes(f), f * 977 + t.tries * 31, o); B.node = { t: E.towerKind(f) === 'fight' ? 'fight' : E.towerKind(f), e: [] }; B.tower = f; return B; };
  E.towerFinish = function (s, B) {
    const t = E.towerEnsure(s), f = B.tower, rep = { result: B.over, floor: f };
    if (B.over === 'win' && f === t.best + 1) { t.best = f; rep.rw = give(s, E.towerReward(f)); if (rep.rw.title) t.title = rep.rw.title; }
    return rep;
  };

  // ═════ Арена: копии отрядов, недельный рейтинг ═════
  D.ARENA_DAY = 10; D.ARENA_BASE = 1000; D.ARENA_K = 1.6;   // копии воюют проще героя (базовые навыки) — компенсация мощи
  D.ARENA_TIERS = [['Бронза', 0, '🥉'], ['Серебро', 1100, '🥈'], ['Золото', 1250, '🥇'], ['Платина', 1450, '💠'], ['Алмаз', 1700, '💎']];
  D.ARENA_NAMES = ['Рейн Пепельный', 'Ая Лунная', 'Кассиан', 'Мира Шип', 'Торвальд', 'Сэйра из Бездны', 'Лорен Грозовой', 'Ингрид', 'Вальтер Чёрный', 'Нэя', 'Орин Златоглазый', 'Эльза Морозная', 'Дарк', 'Юки', 'Фенрис', 'Лиара'];
  D.ARENA_DIFF = [{ n: 'Слабее', dl: -3, k: 0.85, pts: 12, g: 1 }, { n: 'Равный', dl: 0, k: 1, pts: 20, g: 1.5 }, { n: 'Сильнее', dl: 3, k: 1.15, pts: 30, g: 2 }];
  E.weekKey = (now) => Math.floor((E.dayKey(now) + 3) / 7);   // неделя с понедельника
  E.arenaTier = (r) => { let i = 0; D.ARENA_TIERS.forEach((t, j) => { if (r >= t[1]) i = j; }); return i; };
  E.arenaWeekly = (s, tier) => ({ gold: (300 + 60 * L(s)) * (tier + 1), sig: tier, egg: tier >= 2 ? Math.min(4, tier) : -1 });
  E.arenaEnsure = function (s, now) {
    now = now == null ? Date.now() : now; let a = s.arena; if (!a || typeof a !== 'object') a = s.arena = { wk: E.weekKey(now), rating: D.ARENA_BASE, best: D.ARENA_BASE, w: 0, l: 0, day: -1, n: 0, rivals: [], seed: 1, pend: null };
    const wk = E.weekKey(now); if (a.wk !== wk) { if (a.w + a.l > 0) { const t = E.arenaTier(a.rating); a.pend = { tier: t, rw: E.arenaWeekly(s, t), rating: a.rating }; } a.wk = wk; a.rating = D.ARENA_BASE; a.best = D.ARENA_BASE; a.w = 0; a.l = 0; a.rivals = []; }
    const day = E.dayKey(now); if (a.day !== day) { a.day = day; a.n = 0; }
    if (!a.rivals || a.rivals.length !== 3) E.arenaRoll(s);
    return a;
  };
  E.arenaRoll = function (s) {
    const a = s.arena; a.seed = ((a.seed | 0) * 1103515245 + 12345) >>> 0; const r = E.rng(a.seed + L(s));
    a.rivals = D.ARENA_DIFF.map((df, i) => ({ i, n: D.ARENA_NAMES[Math.floor(r() * D.ARENA_NAMES.length) % D.ARENA_NAMES.length], cls: D.CLASS_IDS[Math.floor(r() * D.CLASS_IDS.length) % D.CLASS_IDS.length], comp: D.COMP_IDS.filter(() => r() < 0.67).slice(0, 2), dl: df.dl, seed: Math.floor(r() * 1e9) }));
    a.rivals.forEach((x) => { if (!x.comp.length) x.comp = [D.COMP_IDS[x.seed % D.COMP_IDS.length]]; });
    return a.rivals;
  };
  E.arenaLv = (s, rv) => clamp(L(s) + (rv.dl | 0), 1, 300);
  E.arenaK = (s) => clamp(1 + (s.arena.rating - D.ARENA_BASE) / 2500, 0.85, 1.35);
  E.arenaFoes = function (s, rv) {
    const df = D.ARENA_DIFF[rv.i], lv = E.arenaLv(s, rv), fs = C.fakeSlot(rv.cls, lv, 'human'), d = E.derive(fs);
    const cap = C.baseUnit({ id: 'e0', side: 'e', name: rv.n, cls: rv.cls, lv, ic: D.CLASSES[rv.cls].ic, ai: true, tags: ['human'] }, d); cap.sk = D.CLASSES[rv.cls].start.slice(); cap.rcMax = D.CLASSES[rv.cls].rc.max;
    const out = [cap].concat(rv.comp.map((cid, j) => { const u = C.unitFromComp(cid, Math.max(1, lv - 2), 1); u.id = 'e' + (j + 1); u.side = 'e'; u.ai = true; u.name = (D.COMPANIONS[cid].n || u.name) + ' (копия)'; return u; }));
    // копия отряда: суммарная мощь ≈ мощи вашего отряда × сложность × рейтинг
    const raw = out.reduce((p, u) => p + E.unitPower(u), 0), k = Math.max(0.2, E.teamPower(s) * D.ARENA_K * df.k * E.arenaK(s) / Math.max(1, raw));
    out.forEach((u) => { ['maxHp', 'atk', 'mag', 'hpow', 'def', 'res'].forEach((x) => { u[x] = Math.round(u[x] * k); }); u.hp = u.maxHp; u.mp = u.maxMp; u.arena = true; u.weak = u.weak || []; u.resist = u.resist || []; u.sub = u.sub || { statRes: 0, resEl: {} }; });
    return out;
  };
  E.arenaPower = (s, rv) => E.arenaFoes(s, rv).reduce((p, u) => p + E.unitPower(u), 0);
  E.arenaBattle = function (s, i, o, now) { const w = E.challengeWhy(s); if (w) return { err: w }; const a = E.arenaEnsure(s, now); if (a.n >= D.ARENA_DAY) return { err: 'Бои на сегодня закончились' }; const rv = a.rivals[i]; if (!rv) return { err: 'Нет соперника' }; a.n++; const B = mkB(s, E.arenaFoes(s, rv), rv.seed, o); B.node = { t: 'fight', e: [] }; B.arena = rv; return B; };
  E.arenaFinish = function (s, B) {
    const a = s.arena, rv = B.arena, df = D.ARENA_DIFF[rv.i], rep = { result: B.over, rv };
    if (B.over === 'win') { a.w++; a.rating += df.pts; a.best = Math.max(a.best, a.rating); rep.pts = df.pts; rep.rw = give(s, { gold: Math.round((20 + 8 * L(s)) * df.g) }); }
    else { a.l++; rep.pts = -Math.min(8, a.rating); a.rating += rep.pts; }
    E.arenaRoll(s); return rep;
  };
  E.arenaClaimWeek = function (s) { const a = E.arenaEnsure(s); if (!a.pend) return { err: 'Нет недельной награды' }; const p = a.pend; a.pend = null; give(s, p.rw); return p; };

  // ═════ Тренировочный зал ═════
  D.TRAIN_EN_MAX = 20; D.TRAIN_REGEN_MIN = 30; D.TRAIN_EN_COST = 2; D.TRAIN_STATS = ['str', 'agi', 'vit', 'int', 'spi', 'wis', 'luk', 'cha'];
  E.trainCap = (s) => Math.min(30, Math.floor(L(s) / 3));   // небольшая надбавка: не больше +30 к одной характеристике
  E.trainEnsure = function (s, now) {
    now = now == null ? Date.now() : now; let t = s.train; if (!t || typeof t !== 'object') t = s.train = { en: D.TRAIN_EN_MAX, t: now, pts: {} };
    t.pts = t.pts || {}; if (!(t.t > 0)) t.t = now; const step = D.TRAIN_REGEN_MIN * 60e3;
    if (t.en >= D.TRAIN_EN_MAX) t.t = now; else { const k = Math.floor((now - t.t) / step); if (k > 0) { t.en = Math.min(D.TRAIN_EN_MAX, t.en + k); t.t = t.en >= D.TRAIN_EN_MAX ? now : t.t + k * step; } }
    return t;
  };
  E.trainNextIn = (s, now) => { const t = E.trainEnsure(s, now); return t.en >= D.TRAIN_EN_MAX ? 0 : D.TRAIN_REGEN_MIN * 60e3 - ((now == null ? Date.now() : now) - t.t); };
  E.trainGold = (s, k) => Math.round(80 * Math.pow(1.15, ((s.train && s.train.pts && s.train.pts[k]) | 0)));
  E.trainWhy = function (s, k, now) { if (!D.TRAIN_STATS.includes(k)) return 'Нет такой характеристики'; const t = E.trainEnsure(s, now); if ((t.pts[k] | 0) >= E.trainCap(s)) return 'Предел тренировки для вашего уровня'; if (t.en < D.TRAIN_EN_COST) return 'Не хватает энергии'; if (s.gold < E.trainGold(s, k)) return 'Не хватает золота'; return ''; };
  E.train = function (s, k, now) { const w = E.trainWhy(s, k, now); if (w) return w; const t = s.train, g = E.trainGold(s, k); if (t.en >= D.TRAIN_EN_MAX) t.t = now == null ? Date.now() : now; t.en -= D.TRAIN_EN_COST; s.gold -= g; t.pts[k] = (t.pts[k] | 0) + 1; s.rev = (s.rev || 0) + 1; return ''; };
  const _collect = E.collect;
  E.collect = function (slot, ctx) {
    const c = _collect(slot, ctx), t = slot && slot.train; if (!t || !t.pts) return c;
    for (const k in t.pts) { const v = Math.min(t.pts[k] | 0, 30); if (!v || !D.STATS.includes(k)) continue; c.stats[k] += v; if (c.sby) { const b = c.sby[k] || (c.sby[k] = {}); b.train = (b.train || 0) + v; } }
    return c;
  };
  if (D.SRC_N) D.SRC_N.train = 'Тренировка';
  const _sn = E.srcName; if (_sn) E.srcName = (k) => (k === 'train' ? 'Тренировка' : _sn(k));

  // ───── Слоты и миграция v10 → v11 ─────
  E.challengeEnsure = (s, now) => { if (!s) return s; E.towerEnsure(s); E.trainEnsure(s, now); if (E.dayKey) E.arenaEnsure(s, now); return s; };
  const _ns = E.newSlot; E.newSlot = function (o) { const s = _ns(o); E.challengeEnsure(s, o && o.now); return s; };
  if (S && S.migrations) { S.VERSION = 11; S.migrations[10] = function (p) { p.slots = (p.slots || []).map((s) => (s ? E.challengeEnsure(s) : s)); p.v = 11; return p; }; }
  if (typeof module !== 'undefined') module.exports = RPG;
})();
