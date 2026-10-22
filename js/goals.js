/* v2.25 «Цели»: ежедневные задания и серия входов, достижения, награды «Дозора» (AFK), мощь отряда.
   Только добавляет: прогресс считается по уже существующим счётчикам slot.stats, механики и баланс не меняются. */
(function () {
  const RPG = globalThis.RPG, D = RPG.D, E = RPG.E, C = RPG.C, S = RPG.S;
  const H = 3600e3, DAY = 86400e3;
  // день по местному времени игрока
  E.dayKey = (now) => { const t = now == null ? Date.now() : now, off = new Date(t).getTimezoneOffset() * 60e3; return Math.floor((t - off) / DAY); };
  const L = (s) => Math.max(1, (s.hero && s.hero.level) | 0);

  // ───── Ежедневные задания: 3 в день из пула, считаются по приросту счётчиков ─────
  D.DAILY_POOL = [
    { id: 'kills', st: 'kills', n: 'Победить врагов', ic: '⚔️', need: (l) => 20 + Math.min(40, l >> 1) },
    { id: 'runs', st: 'runs', n: 'Завершить вылазки', ic: '🗺️', need: () => 2 },
    { id: 'wins', st: 'wins', n: 'Одолеть босса', ic: '👑', need: () => 1 },
    { id: 'craft', st: 'crafted', n: 'Создать предметы', ic: '⚒️', need: () => 3 },
    { id: 'gather', st: 'gathered', n: 'Добыть материалы', ic: '⛏️', need: () => 6 },
    { id: 'gold', st: 'goldEarned', n: 'Заработать золото', ic: '🪙', need: (l) => 300 + 40 * l }];
  D.DAILY_N = 3;
  E.dailyReward = (s) => ({ gold: 150 + 25 * L(s), food: 5 });
  E.dailyBonus = (s) => ({ gold: 400 + 60 * L(s), sig: 1 });
  // серия входов: 7-дневный цикл, 7-й день — яйцо
  E.streakReward = (s, day) => { const n = ((day - 1) % 7) + 1; return { gold: (80 + 20 * L(s)) * n, food: n >= 3 ? 5 * n : 0, sig: n === 7 ? 2 : n >= 5 ? 1 : 0, egg: n === 7 ? Math.min(3, 1 + Math.floor(L(s) / 40)) : -1 }; };
  const pick = (day) => { const ids = D.DAILY_POOL.map((q) => q.id), r = E.rng(day * 31 + 7), out = []; while (out.length < D.DAILY_N) { const i = Math.floor(r() * ids.length); out.push(ids.splice(i, 1)[0]); } return out; };
  E.goalsEnsure = function (s, now) {
    if (!s) return s; now = now == null ? Date.now() : now; s.stats = s.stats || {};
    if (!s.daily || typeof s.daily !== 'object') s.daily = { day: -1, q: [], base: {}, need: {}, claimed: [], bonus: false, streak: 0, lastLogin: -1, loginDay: -1 };
    if (!s.ach || typeof s.ach !== 'object') s.ach = { claimed: [] };
    if (!Array.isArray(s.ach.claimed)) s.ach.claimed = [];
    if (!s.afk || typeof s.afk !== 'object') s.afk = { t: now };
    if (!(s.afk.t > 0)) s.afk.t = now;
    const day = E.dayKey(now), d = s.daily;
    if (d.day !== day) { d.day = day; d.q = pick(day); d.base = {}; d.need = {}; d.q.forEach((id) => { const q = D.DAILY_POOL.find((x) => x.id === id); d.base[id] = s.stats[q.st] || 0; d.need[id] = q.need(L(s)); }); d.claimed = []; d.bonus = false; }
    return s;
  };
  E.dailyList = function (s, now) { E.goalsEnsure(s, now); const d = s.daily; return d.q.map((id) => { const q = D.DAILY_POOL.find((x) => x.id === id), have = Math.max(0, (s.stats[q.st] || 0) - (d.base[id] || 0)), need = d.need[id]; return { id, n: q.n, ic: q.ic, have: Math.min(have, need), need, done: have >= need, claimed: d.claimed.includes(id) }; }); };
  const give = (s, r) => { if (r.gold) s.gold += r.gold; if (r.food) { E.petEnsure && E.petEnsure(s); s.petFood = (s.petFood || 0) + r.food; } if (r.sig) E.addMat(s, 'asc_sigil', r.sig); if (r.egg >= 0 && E.eggAdd) E.eggAdd(s, r.egg, 1); if (r.mats) for (const m in r.mats) E.addMat(s, m, r.mats[m]); s.rev = (s.rev || 0) + 1; return r; };
  E.dailyClaim = function (s, id, now) { const q = E.dailyList(s, now).find((x) => x.id === id); if (!q) return { err: 'Нет такого задания' }; if (q.claimed) return { err: 'Уже получено' }; if (!q.done) return { err: 'Задание ещё не выполнено' }; s.daily.claimed.push(id); return give(s, E.dailyReward(s)); };
  E.dailyBonusClaim = function (s, now) { const l = E.dailyList(s, now); if (s.daily.bonus) return { err: 'Уже получено' }; if (!l.every((q) => q.claimed)) return { err: 'Сначала получите награды всех заданий' }; s.daily.bonus = true; return give(s, E.dailyBonus(s)); };
  E.loginReady = (s, now) => { E.goalsEnsure(s, now); return s.daily.loginDay !== E.dayKey(now); };
  E.loginClaim = function (s, now) {
    E.goalsEnsure(s, now); const d = s.daily, day = E.dayKey(now); if (d.loginDay === day) return { err: 'Сегодня уже получено' };
    d.streak = d.loginDay === day - 1 ? d.streak + 1 : 1; d.loginDay = day; const r = E.streakReward(s, d.streak); give(s, r); return Object.assign({ streak: d.streak }, r);
  };

  // ───── Достижения: пороги по накопленному прогрессу, награда один раз ─────
  const cnt = (o) => (o ? Object.keys(o).length : 0);
  D.ACH_FAM = [
    { id: 'kills', n: 'Гроза чудовищ', ic: '⚔️', d: 'Врагов повержено', v: (s) => s.stats.kills || 0, at: [100, 1000, 5000, 20000] },
    { id: 'runs', n: 'Странник', ic: '🗺️', d: 'Вылазок завершено', v: (s) => s.stats.runs || 0, at: [10, 50, 200, 1000] },
    { id: 'wins', n: 'Убийца боссов', ic: '👑', d: 'Боссов повержено', v: (s) => s.stats.wins || 0, at: [5, 25, 100, 400] },
    { id: 'craft', n: 'Мастер-ремесленник', ic: '⚒️', d: 'Предметов создано', v: (s) => s.stats.crafted || 0, at: [10, 100, 500] },
    { id: 'gather', n: 'Собиратель', ic: '⛏️', d: 'Материалов добыто', v: (s) => s.stats.gathered || 0, at: [50, 500, 3000] },
    { id: 'gold', n: 'Казна Короля', ic: '🪙', d: 'Золота заработано', v: (s) => s.stats.goldEarned || 0, at: [1e4, 1e5, 1e6, 1e7] },
    { id: 'level', n: 'Восхождение', ic: '⭐', d: 'Уровень героя', v: (s) => L(s), at: [10, 25, 50, 100, 200] },
    { id: 'story', n: 'Летописец', ic: '📜', d: 'Сцен истории пройдено', v: (s) => ((s.story && s.story.done) || []).length, at: [10, 50, 150, 300] },
    { id: 'crew', n: 'Двор Короля', ic: '👥', d: 'Членов Свиты', v: (s) => cnt(s.crew), at: [3, 8, 15] },
    { id: 'pets', n: 'Хозяин зверинца', ic: '🐾', d: 'Питомцев в коллекции', v: (s) => cnt(s.pets), at: [1, 10, 30, 60, 100] },
    { id: 'arts', n: 'Хранитель реликвий', ic: '🏺', d: 'Артефактов найдено', v: (s) => cnt(s.arts), at: [1, 5, 15, 30] },
    { id: 'power', n: 'Сила престола', ic: '💪', d: 'Мощь героя', v: (s) => E.power(s), at: [500, 2000, 8000, 30000] }];
  D.ACH = []; D.ACH_FAM.forEach((f) => f.at.forEach((need, i) => D.ACH.push({ id: f.id + '_' + i, fam: f.id, tier: i, n: f.n + ' ' + ['I', 'II', 'III', 'IV', 'V'][i], ic: f.ic, d: f.d + ': ' + need.toLocaleString('ru-RU'), need, rw: { gold: Math.round(500 * Math.pow(4, i)), sig: i >= 1 ? i : 0, food: 10 * (i + 1) } })));
  D.ACH_MAP = {}; D.ACH.forEach((a) => { D.ACH_MAP[a.id] = a; });
  E.achVal = (s, a) => D.ACH_FAM.find((f) => f.id === a.fam).v(s);
  E.achList = function (s) { E.goalsEnsure(s); return D.ACH.map((a) => { const v = E.achVal(s, a); return { a, v, done: v >= a.need, claimed: s.ach.claimed.includes(a.id) }; }); };
  E.achReady = (s) => E.achList(s).filter((x) => x.done && !x.claimed).length;
  E.achClaim = function (s, id) { const a = D.ACH_MAP[id]; if (!a) return { err: 'Нет такого достижения' }; E.goalsEnsure(s); if (s.ach.claimed.includes(id)) return { err: 'Уже получено' }; if (E.achVal(s, a) < a.need) return { err: 'Ещё не выполнено' }; s.ach.claimed.push(id); return give(s, Object.assign({}, a.rw)); };

  // ───── «Дозор»: пока вас нет, Свита собирает добычу (до 12 ч, от 10 мин) ─────
  D.AFK_MAX_H = 12; D.AFK_MIN_MIN = 10;
  D.AFK_MATS = ['ore_cu', 'herb_g', 'hide', 'fish_s', 'meat', 'cloth', 'dust'];
  E.afkRate = (s) => ({ gold: 40 + 15 * L(s), food: 1 });     // за час
  E.afkPreview = function (s, now) {
    E.goalsEnsure(s, now); now = now == null ? Date.now() : now; const ms = Math.max(0, Math.min(D.AFK_MAX_H * H, now - s.afk.t)), h = ms / H, r = E.afkRate(s);
    const mats = {}; const nm = Math.floor(h * 2); for (let i = 0; i < nm; i++) { const m = D.AFK_MATS[(Math.floor(s.afk.t / 1000) + i * 3) % D.AFK_MATS.length]; mats[m] = (mats[m] || 0) + 1; }
    return { ms, h, ok: ms >= D.AFK_MIN_MIN * 60e3, full: ms >= D.AFK_MAX_H * H, gold: Math.floor(r.gold * h), food: Math.floor(r.food * h), mats };
  };
  E.afkClaim = function (s, now) { now = now == null ? Date.now() : now; const p = E.afkPreview(s, now); if (!p.ok) return { err: 'Дозор ещё не собрал добычу' }; s.afk.t = now; give(s, { gold: p.gold, food: p.food, mats: p.mats }); return p; };

  // ───── Мощь отряда: герой + члены отряда (по той же формуле, что E.power) ─────
  E.unitPower = (u) => Math.round(u.maxHp / 8 + Math.max(u.atk, u.mag, u.hpow || 0) + u.def / 2 + u.res / 3);
  E.teamPower = function (s) { let p = E.power(s); (s.party || []).forEach((id) => { if (s.crew && s.crew[id]) try { p += E.unitPower(C.unitFromCrew(s, id, 1)); } catch (e) { /* ignore */ } }); return p; };

  // ───── Новые слоты и миграция v9 → v10 ─────
  const _ns = E.newSlot; E.newSlot = function (o) { const s = _ns(o); E.goalsEnsure(s, o && o.now); return s; };
  E.migrateGoalsSlot = (s) => (s ? E.goalsEnsure(s) : s);
  if (S && S.migrations) { S.VERSION = 10; S.migrations[9] = function (p) { p.slots = (p.slots || []).map((s) => (s ? E.migrateGoalsSlot(s) : s)); p.v = 10; return p; }; }
  if (typeof module !== 'undefined') module.exports = RPG;
})();
