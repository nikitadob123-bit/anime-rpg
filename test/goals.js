/* v2.25 «Цели»: ежедневные задания, серия входов, достижения, Дозор (AFK), мощь отряда, миграция v9→v10. */
const assert = require('assert');
const RPG = require('../js/data-core.js'); require('../js/data-stats.js');
['data-maou', 'data-maou2', 'data-prof', 'data-world', 'data-world2', 'data-crew', 'data-theme', 'data-story', 'data-story2', 'data-story3', 'data-romance', 'portrait', 'engine', 'stats', 'gear', 'combat', 'crew', 'save', 'artifact', 'dungeons-sp', 'pets', 'allies', 'data-craft-icons', 'craft', 'goals'].forEach((f) => require('../js/' + f + '.js'));
const { D, E, S } = RPG;
let pass = 0, fail = 0; const t = (n, f) => { try { f(); pass++; } catch (e) { fail++; console.log('  ✗', n, '\n     ', e.message); } };
const N0 = new Date(2026, 9, 22, 12, 0, 0).getTime(), DAY = 86400e3, H = 3600e3;
const mk = () => { const s = E.newSlot({ name: 'Цель', race: 'o_street', uniq: 'phoenix', prof1: 'smith', prof2: 'miner', now: N0 }); s.hero.level = 30; return s; };
console.log('Цели');
t('новый слот: поля daily/ach/afk; 3 разных задания в день, набор меняется по дням и стабилен в течение дня', () => {
  const s = mk(); assert(s.daily && s.ach && s.afk); const a = E.dailyList(s, N0).map((q) => q.id); assert.strictEqual(new Set(a).size, 3);
  assert.deepStrictEqual(E.dailyList(s, N0 + 3 * H).map((q) => q.id), a); let diff = false; for (let i = 1; i < 6; i++) if (E.dailyList(s, N0 + i * DAY).map((q) => q.id).join() !== a.join()) diff = true; assert(diff);
});
t('задание: прогресс по приросту счётчиков с начала дня, награда один раз, нельзя до выполнения', () => {
  const s = mk(); s.stats.kills = 500; s.stats.runs = 9; s.stats.wins = 3; const L = E.dailyList(s, N0 + DAY); assert(L.every((q) => q.have === 0));
  const q = L[0], st = D.DAILY_POOL.find((x) => x.id === q.id).st; assert(E.dailyClaim(s, q.id, N0 + DAY).err);
  s.stats[st] += q.need; const g = s.gold; const r = E.dailyClaim(s, q.id, N0 + DAY); assert(!r.err && s.gold === g + r.gold && r.gold > 0); assert(E.dailyClaim(s, q.id, N0 + DAY).err);
  assert(E.dailyBonusClaim(s, N0 + DAY).err, 'сундук — только после всех');
  E.dailyList(s, N0 + DAY).forEach((x) => { s.stats[D.DAILY_POOL.find((p) => p.id === x.id).st] += x.need; if (!x.claimed) assert(!E.dailyClaim(s, x.id, N0 + DAY).err); });
  const sig = s.mats.asc_sigil || 0; assert(!E.dailyBonusClaim(s, N0 + DAY).err); assert.strictEqual(s.mats.asc_sigil, sig + 1); assert(E.dailyBonusClaim(s, N0 + DAY).err);
  assert(E.dailyList(s, N0 + 2 * DAY).every((x) => !x.claimed) && !s.daily.bonus, 'новый день — новые задания');
});
t('серия входов: раз в день, растёт подряд, сбрасывается при пропуске, 7-й день — яйцо', () => {
  const s = mk(); for (let i = 0; i < 7; i++) { assert(E.loginReady(s, N0 + i * DAY)); const r = E.loginClaim(s, N0 + i * DAY); assert.strictEqual(r.streak, i + 1); assert(E.loginClaim(s, N0 + i * DAY + H).err); }
  assert(Object.values(s.eggs).reduce((a, b) => a + b, 0) >= 1); assert.strictEqual(E.loginClaim(s, N0 + 9 * DAY).streak, 1);
  assert(E.streakReward(s, 7).gold > E.streakReward(s, 1).gold);
});
t('достижения: ≥40, награда один раз и только по порогу; ступени растут', () => {
  const s = mk(); assert(D.ACH.length >= 40); assert(E.achClaim(s, 'kills_0').err); s.stats.kills = 100; assert.strictEqual(E.achReady(s) >= 1, true);
  const g = s.gold, r = E.achClaim(s, 'kills_0'); assert(!r.err && s.gold === g + 500); assert(E.achClaim(s, 'kills_0').err); assert(E.achClaim(s, 'kills_1').err);
  assert(D.ACH_MAP.kills_3.rw.gold > D.ACH_MAP.kills_0.rw.gold); assert(E.achList(s).find((x) => x.a.id === 'level_1').done);
});
t('Дозор: от 10 мин, потолок 12 ч, сбор обнуляет таймер; золото растёт с уровнем', () => {
  const s = mk(); assert(E.afkClaim(s, N0 + 5 * 60e3).err); const p = E.afkPreview(s, N0 + 30 * H); assert(p.full && Math.abs(p.h - 12) < 1e-9);
  const g = s.gold, r = E.afkClaim(s, N0 + 30 * H); assert(!r.err && s.gold === g + r.gold && r.gold > 0 && Object.keys(r.mats).length); assert(E.afkClaim(s, N0 + 30 * H + 60e3).err);
  const s2 = mk(); s2.hero.level = 90; assert(E.afkPreview(s2, N0 + 5 * H).gold > E.afkPreview(mk(), N0 + 5 * H).gold);
});
t('мощь отряда ≥ мощи героя и растёт с отрядом; не меняет сам бой', () => {
  const s = mk(); const p0 = E.teamPower(s); assert.strictEqual(p0, E.power(s)); E.recruit(s, 'gen1'); s.party = ['gen1']; assert(E.teamPower(s) > p0);
});
t('миграция v9→v10: старый слот получает поля, остальное цело', () => {
  assert.strictEqual(S.VERSION, 10); const s = mk(); delete s.daily; delete s.ach; delete s.afk; s.gold = 4321;
  const out = S.migrations[9]({ v: 9, slots: [s, null] }); assert.strictEqual(out.v, 10); const m = out.slots[0];
  assert(m.daily && m.daily.q.length === 3 && Array.isArray(m.ach.claimed) && m.afk.t > 0 && m.gold === 4321 && out.slots[1] === null);
  const bad = mk(); bad.daily = 'x'; bad.ach = { claimed: 5 }; bad.afk = {}; E.goalsEnsure(bad); assert(bad.daily.q.length === 3 && Array.isArray(bad.ach.claimed) && bad.afk.t > 0);
});
console.log(`\nЦели: ${pass} ✓, ${fail} ✗`); process.exit(fail ? 1 : 0);
