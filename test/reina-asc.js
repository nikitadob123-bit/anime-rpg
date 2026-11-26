/* v2.33.0 «Ранги Рейны»: логика рангов, потолка, жертвы героя, совместимость и баланс. */
const assert = require('assert');
const B = require('../tools/reina-balance.js');
const RPG = globalThis.RPG, { E, D, C } = RPG;
let pass = 0, fail = 0; const t = (n, f) => { try { f(); pass++; } catch (e) { fail++; console.log('  ✗', n, '\n     ', e.message); } };
const mk = () => { const s = E.newSlot({ name: 'Арата', race: 'human', uniq: 'phoenix', prof1: 'smith' }); s.hero.level = 60; E.recruit(s, 'tk_reina'); s.gold = 1e8; s.mats.asc_sigil = 999; return s; };
console.log('Ранги Рейны');
t('старое сохранение без reinaAsc: ранг 0, потолок 100, ничего не ломается', () => { const s = mk(); delete s.reinaAsc; const r = E.reinaAsc(s); assert.deepStrictEqual(r, { rank: 0, capBreak: 0 }); assert.strictEqual(E.reinaMaxCap(s), 100); C.unitFromCrew(s, 'tk_reina', 1); });
t('потолок по рангу: ранг 0 → до ур. 10; опыт выше не копится', () => { const s = mk(), st = s.crew.tk_reina; st.lv = 1; st.xp = 0; s.reinaAsc = { rank: 0, capBreak: 0 }; assert.strictEqual(E.crewCap(s, 'tk_reina'), 10); E.crewAddXp(s, 'tk_reina', 1e9); assert.strictEqual(st.lv, 10); });
t('ранги по порядку: ранг N требует ур. 10·N, тратит золото и знаки', () => {
  const s = mk(), st = s.crew.tk_reina; st.lv = 9; s.reinaAsc = { rank: 0, capBreak: 0 };
  assert.strictEqual(E.reinaRankWhy(s), 'Нужен ур. 10'); st.lv = 10; const g = s.gold, m = s.mats.asc_sigil;
  assert.strictEqual(E.reinaRankUp(s), ''); assert.strictEqual(E.reinaAsc(s).rank, 1); assert.strictEqual(s.gold, g - 5000); assert.strictEqual(s.mats.asc_sigil, m - 1);
  assert.strictEqual(E.reinaRankWhy(s), 'Нужен ур. 20'); assert.strictEqual(E.crewCap(s, 'tk_reina'), 20);
});
t('10 рангов — максимум; потолок 100 на ранге 9 и 10', () => { const s = mk(), st = s.crew.tk_reina; s.reinaAsc = { rank: 0, capBreak: 0 }; for (let n = 1; n <= 10; n++) { st.lv = 10 * n; assert.strictEqual(E.reinaRankUp(s), '', 'ранг ' + n); } assert.strictEqual(E.reinaAsc(s).rank, 10); assert.strictEqual(E.reinaRankUp(s), 'Все ранги взяты'); assert.strictEqual(E.crewCap(s, 'tk_reina'), 100); });
t('ранг усиливает статы (×1,3 за ранг)', () => { const s = mk(); s.crew.tk_reina.lv = 50; s.reinaAsc = { rank: 0 }; const a = C.unitFromCrew(s, 'tk_reina', 1); s.reinaAsc = { rank: 5 }; const b = C.unitFromCrew(s, 'tk_reina', 1); assert(Math.abs(b.atk / a.atk - Math.pow(1.3, 5)) < 0.02, b.atk / a.atk); });
t('звёзды возвышения у Рейны заменены рангами; у других — как раньше', () => { const s = mk(); s.crew.tk_reina.lv = 99; assert(/ранги/.test(E.crewAscendWhy(s, 'tk_reina'))); E.recruit(s, 'gen1'); assert(!/ранги/.test(E.crewAscendWhy(s, 'gen1') || '')); });
t('потолок других не изменился', () => { const s = mk(); E.recruit(s, 'gen1'); assert.strictEqual(E.crewCap(s, 'gen1'), Math.min(D.LEVEL_CAP, s.hero.level + 2)); });
t('«Разорвать предел»: требования, −10 ур. героя, потолок 150, один раз', () => {
  const s = mk(), st = s.crew.tk_reina; s.reinaAsc = { rank: 9, capBreak: 0 }; st.lv = 100;
  assert.strictEqual(E.reinaBreakWhy(s), 'Нужен ранг 10'); s.reinaAsc.rank = 10; st.lv = 99; assert.strictEqual(E.reinaBreakWhy(s), 'Рейне нужен ур. 100'); st.lv = 100;
  s.hero.level = 19; assert(/Герою нужен/.test(E.reinaBreakWhy(s))); s.hero.level = 57; s.hero.xp = 123;
  assert.strictEqual(E.reinaBreak(s), ''); assert.strictEqual(s.hero.level, 47); assert.strictEqual(s.hero.xp, 0); assert.strictEqual(E.crewCap(s, 'tk_reina'), 150);
  assert.strictEqual(E.reinaBreak(s), 'Предел уже разорван'); assert.strictEqual(s.hero.level, 47);
  E.crewAddXp(s, 'tk_reina', 1e12); assert.strictEqual(st.lv, 150);
});
t('сохранение переживает JSON и загрузку', () => { const s = mk(); s.reinaAsc = { rank: 4, capBreak: 0 }; const s2 = JSON.parse(JSON.stringify(s)); assert.strictEqual(E.reinaAsc(s2).rank, 4); });
t('баланс: Рейна ур. 100 р10 сильнее союзников Мировых артефактов на максимуме', () => { const R = B.check(); assert(R.r100.pow > Math.max(...R.allies.map((a) => a.pow))); });
console.log(`  ${pass} ✓, ${fail} ✗`); if (fail) process.exit(1);
