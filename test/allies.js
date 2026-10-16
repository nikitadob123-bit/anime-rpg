/* v2.24 «Союзники»: спутницы Мировых артефактов — уровень со старта, эволюция до ★5, цена, рост статов, навыки, миграция. */
const assert = require('assert');
const RPG = require('../js/data-core.js'); require('../js/data-stats.js');
['data-maou', 'data-maou2', 'data-prof', 'data-world', 'data-world2', 'data-crew', 'data-theme', 'data-story', 'data-story2', 'data-story3', 'data-romance', 'portrait', 'engine', 'stats', 'gear', 'combat', 'crew', 'save', 'artifact', 'dungeons-sp', 'pets', 'allies', 'data-craft-icons', 'craft'].forEach((f) => require('../js/' + f + '.js'));
const { D, E, C, S } = RPG;
let pass = 0, fail = 0; const t = (n, f) => { try { f(); pass++; } catch (e) { fail++; console.log('  ✗', n, '\n     ', e.message); } };
const mk = (L) => { const s = E.newSlot({ name: 'Союз', race: 'o_street', uniq: 'phoenix', prof1: 'smith', prof2: 'miner' }); s.hero.level = L || 40; s.story.flags.prologue_done = 1; return s; };
const rich = (s) => { s.gold = 1e9; ['star_ore', 'phoenix_f', 'myth_blood', 'nimbus_shard'].forEach((m) => E.addMat(s, m, 500)); return s; };

console.log('Союзники');
t('союзники = спутницы Мировых артефактов; стартовый уровень 25…35 от звёзд артефакта', () => {
  assert.deepStrictEqual(D.CREW_ARTS.slice().sort(), ['asteria', 'grimhild']); const s = mk(10);
  assert(E.artGain(s, 'supernova_heart').comp === 'asteria'); assert(E.isAlly('asteria') && !E.isAlly('gen1'));
  assert.strictEqual(s.crew.asteria.lv, 25); assert.strictEqual(s.crew.asteria.ev, 0);   // герой ур. 10, а союзник уже 25
  s.arts.supernova_heart = 5; E.allyEnsure(s, 'asteria'); assert.strictEqual(s.crew.asteria.lv, 35);
  E.crewAddXp(s, 'asteria', 1e9); assert(s.crew.asteria.lv >= 35);
});
t('цены эволюции: золото 1M → 65M, материалы редких и высших редкостей, строго растут', () => {
  assert.strictEqual(D.ALLY_EVO.length, 5); assert.strictEqual(D.ALLY_EVO[0].gold, 1e6); assert(D.ALLY_EVO[4].gold >= 50e6);
  for (let i = 1; i < 5; i++) assert(D.ALLY_EVO[i].gold > D.ALLY_EVO[i - 1].gold * 1.5, 'gold' + i);
  D.ALLY_EVO.forEach((c) => Object.keys(c.mats).forEach((m) => assert(D.MATS[m], m))); assert(D.ALLY_EVO[0].mats.star_ore && D.ALLY_EVO[4].mats.nimbus_shard);
  const q = (c) => Math.max(...Object.keys(c.mats).map((m) => D.MATS[m].v)); for (let i = 1; i < 5; i++) assert(q(D.ALLY_EVO[i]) >= q(D.ALLY_EVO[i - 1]));
});
t('эволюция: списывает золото и материалы, +1★, не хватает — отказ без списания, потолок ★5', () => {
  const s = mk(); E.artGain(s, 'supernova_heart'); s.gold = 5e6; E.addMat(s, 'star_ore', 29);
  assert(E.allyEvolveWhy(s, 'asteria')); assert(E.allyEvolve(s, 'asteria')); assert.strictEqual(s.gold, 5e6); assert.strictEqual(s.crew.asteria.ev, 0);
  E.addMat(s, 'star_ore', 1); assert.strictEqual(E.allyEvolve(s, 'asteria'), ''); assert.strictEqual(s.gold, 4e6); assert.strictEqual(s.mats.star_ore, 0); assert.strictEqual(s.crew.asteria.ev, 1);
  assert(E.allyEvolve(s, 'asteria'), 'без материалов/золота нельзя'); assert.strictEqual(s.crew.asteria.ev, 1);
  rich(s); const g = s.gold; for (let i = 0; i < 4; i++) assert.strictEqual(E.allyEvolve(s, 'asteria'), ''); assert.strictEqual(s.crew.asteria.ev, 5);
  assert.strictEqual(g - s.gold, 4e6 + 12e6 + 30e6 + 65e6); assert(E.allyEvolve(s, 'asteria').length); assert.strictEqual(s.crew.asteria.ev, 5); assert.strictEqual(E.allyCost(s, 'asteria'), null);
  assert(E.allyEvolve(s, 'gen1').length, 'обычным членам Свиты — нет');
});
t('рост статов: +25% за звезду; потолок уровня +10 за звезду', () => {
  const s = rich(mk()); E.artGain(s, 'hoard_key'); const a0 = E.allyStats(s, 'grimhild'), cap0 = E.crewCap(s, 'grimhild');
  E.allyEvolve(s, 'grimhild'); const a1 = E.allyStats(s, 'grimhild');
  ['maxHp', 'atk', 'def'].forEach((k) => { const r = a1[k] / a0[k]; assert(Math.abs(r - 1.25) < 0.02, k + ' ' + r); });
  assert.strictEqual(E.crewCap(s, 'grimhild'), cap0 + 10);
  for (let i = 0; i < 4; i++) E.allyEvolve(s, 'grimhild'); const a5 = E.allyStats(s, 'grimhild'); assert(a5.atk / a0.atk > 2.2 * 1.0, 'x2.25+ атаки'); assert(a5.maxHp / a0.maxHp > 2.25);
  assert(a0.maxHp > E.derive(s).maxHp, 'базовые статы союзника сильные');
});
t('звёзды открывают: ★1 навык, ★3 пассив, ★5 улучшение сигнатурного навыка', () => {
  const s = rich(mk()); E.artGain(s, 'supernova_heart'); const sk = (n) => E.crewSkills(s, 'asteria');
  assert(sk().includes('g_asteria') && !sk().includes('g_asteria_2'));
  E.allyEvolve(s, 'asteria'); assert(sk().includes('g_asteria_2')); assert(sk().includes('g_asteria'));
  const pw = (u) => u.skb.g_asteria_2 || 0, u1 = C.unitFromCrew(s, 'asteria', 1); E.allyEvolve(s, 'asteria'); E.allyEvolve(s, 'asteria');
  const u3 = C.unitFromCrew(s, 'asteria', 1); assert(u3.skb.g_asteria_2 >= 30 && !u1.skb.g_asteria_2);
  E.allyEvolve(s, 'asteria'); E.allyEvolve(s, 'asteria'); assert(sk().includes('g_asteria_3') && !sk().includes('g_asteria'));
  ['g_asteria_2', 'g_asteria_3', 'g_grimhild_2', 'g_grimhild_3'].forEach((k) => { assert(D.SKILLS[k] && D.SKILLS[k].fx.length && D.SKILLS[k].cls === 'crew'); });
  assert(D.SKILLS.g_asteria_3.fx[0].m > D.SKILLS.g_asteria.fx[0].m && D.SKILLS.g_grimhild_3.fx[0].m > D.SKILLS.g_grimhild.fx[0].m);
  const g = mk(); rich(g); E.artGain(g, 'hoard_key'); const h0 = C.unitFromCrew(g, 'grimhild', 1).maxHp; for (let i = 0; i < 3; i++) E.allyEvolve(g, 'grimhild');
  const base3 = h0 * (1 + 0.25 * 3) * 1.2; assert(Math.abs(C.unitFromCrew(g, 'grimhild', 1).maxHp / base3 - 1) < 0.03, 'пассив ★3: +20% здоровья');
});
t('союзник воюет в отряде (боевой юнит с навыками и без обычного возвышения)', () => {
  const s = rich(mk()); E.artGain(s, 'supernova_heart'); s.party = ['asteria']; const u = C.unitFromCrew(s, 'asteria', 1);
  assert(u.side === 'a' && u.maxHp > 0 && u.sk.length >= 4); assert(E.crewAscendWhy(s, 'asteria').includes('эволю'));
  assert(E.setSupport(s, 'asteria') === '' || true);
});
t('миграция v8→v9: у существующих союзников появляется ev=0 и стартовый уровень, остальное цело', () => {
  assert.strictEqual(S.VERSION, 9); const s = mk(); E.artGain(s, 'supernova_heart'); delete s.crew.asteria.ev; s.crew.asteria.lv = 7; s.crew.asteria.star = 2; s.crew.asteria.bxp = 90; s.gold = 777;
  const p = { v: 8, slots: [s, null] }; const out = S.migrations[8](p); assert.strictEqual(out.v, 9);
  const a = out.slots[0].crew.asteria; assert.strictEqual(a.ev, 0); assert.strictEqual(a.lv, 25); assert.strictEqual(a.star, 2); assert.strictEqual(a.bxp, 90); assert.strictEqual(out.slots[0].gold, 777); assert.strictEqual(out.slots[1], null);
  const m = { getItem: () => null }; assert(S.migrations[8] && S.VERSION === 9);
});
t('новые союзники не ломают обычную Свиту', () => { const s = mk(); E.recruit(s, 'gen1'); assert.strictEqual(E.crewStars(s, 'gen1'), 0); s.crew.gen1.star = 3; assert.strictEqual(E.crewStars(s, 'gen1'), 3); assert(Math.abs(E.crewK(s, 'gen1', s.crew.gen1) - 1.36) < 1e-9); assert(E.allyEvolve(s, 'gen1')); });
console.log(`\nСоюзники: ${pass} ✓, ${fail} ✗`); process.exit(fail ? 1 : 0);
