/* v2.27 «Жизнь в Лагере»: профессии и доступ, рыбалка, ферма, дом, торговец, события, титулы, миграция v11→v12. */
const assert = require('assert');
const RPG = require('../js/data-core.js'); require('../js/data-stats.js');
['data-maou', 'data-maou2', 'data-prof', 'data-world', 'data-world2', 'data-crew', 'data-theme', 'data-story', 'data-story2', 'data-story3', 'data-romance', 'portrait', 'engine', 'stats', 'gear', 'combat', 'crew', 'save', 'artifact', 'dungeons-sp', 'pets', 'allies', 'data-craft-icons', 'craft', 'goals', 'challenge', 'life'].forEach((f) => require('../js/' + f + '.js'));
const { D, E, S } = RPG;
let pass = 0, fail = 0; const t = (n, f) => { try { f(); pass++; } catch (e) { fail++; console.log('  ✗', n, '\n     ', e.message); } };
const N0 = new Date(2026, 9, 21, 12).getTime(), DAY = 864e5;
const mk = (p1, p2) => { const s = E.newSlot({ name: 'Ж', race: 'o_street', uniq: 'phoenix', prof1: p1, prof2: p2, now: N0 }); s.hero.level = 50; s.gold = 1e7; return s; };
const r0 = () => 0.99;
console.log('Жизнь в Лагере');
t('профессии: основная 100%+, доп. 75%+, без профессии 35% и без редкой добычи', () => {
  const a = mk('fish', 'herb'), b = mk('herb', 'fish'), c = mk('smith', 'miner');
  assert.strictEqual(E.profEff(a, 'fish').tier, 'main'); assert.strictEqual(E.profEff(b, 'fish').tier, 'sub'); assert.strictEqual(E.profEff(c, 'fish').tier, 'none');
  assert(E.profEff(a, 'fish').k > E.profEff(b, 'fish').k && E.profEff(b, 'fish').k > E.profEff(c, 'fish').k); assert.strictEqual(E.profEff(c, 'fish').rare, 0);
  assert(E.fishZone(a) > E.fishZone(b) && E.fishZone(b) > E.fishZone(c));
});
t('существующие профессии не изменены (их бонусы и стоимость смены)', () => { assert.strictEqual(D.PROF_CHANGE_COST, 50000); assert.strictEqual(Object.keys(D.PROFS).length, 9); });
t('рыбалка: лимит забросов в день, промах, редкий улов только у Рыбака, опыт профессии', () => {
  const a = mk('fish', 'herb'), c = mk('smith', 'miner');
  for (let i = 0; i < 200; i++) { c.life.fish.used = 0; const r = E.fishCatch(c, 1, Math.random, N0); assert(!r.rare); }
  let rare = 0; for (let i = 0; i < 300; i++) { a.life.fish.used = 0; if (E.fishCatch(a, 1, Math.random, N0).rare) rare++; } assert(rare > 5, 'rare ' + rare);
  assert(a.profs.fish.lv > 1 || a.profs.fish.xp > 0);
  const s = mk('fish', 'herb'); for (let i = 0; i < E.fishCasts(s); i++) E.fishCatch(s, 0.5, r0, N0); assert(E.fishCatch(s, 0.5, r0, N0).err);
  assert(E.fishCatch(mk('fish', 'herb'), 0, r0, N0).miss); s.life.fish.day = -1; assert(!E.fishCatch(s, 0.5, r0, N0 + DAY).err);
});
t('ферма: рост во времени, редкие травы только Травнику, урожай больше у Травника', () => {
  const h = mk('herb', 'fish'), c = mk('smith', 'miner');
  assert(E.plant(c, 0, 'herb_r', N0)); assert.strictEqual(E.plant(h, 0, 'herb_r', N0), '');
  assert(E.harvest(h, 0, N0 + 60e3).err); const r = E.harvest(h, 0, N0 + 5 * 3600e3); assert(r.mats.herb_r > 0);
  E.plant(c, 0, 'herb_g', N0); E.plant(h, 1, 'herb_g', N0); const rc = E.harvest(c, 0, N0 + DAY), rh = E.harvest(h, 1, N0 + DAY); assert(rh.mats.herb_g > rc.mats.herb_g);
});
t('дом: стоимость, лимит, бонусы (грядки, забросы, Дозор), скидка Кузнецу', () => {
  const s = mk('smith', 'miner'), o = mk('fish', 'herb'); assert(E.roomCost(s, 'garden').gold < E.roomCost(o, 'garden').gold);
  s.mats = Object.assign(s.mats || {}, { ing_cu: 99, leather: 99, ing_fe: 99, ing_ms: 99, silk: 99 });
  const g = s.gold; for (let i = 0; i < 3; i++) assert.strictEqual(E.roomUp(s, 'garden'), ''); assert(E.roomUp(s, 'garden')); assert(s.gold < g); assert.strictEqual(E.lifeEnsure(s).plots.length, 5);
  E.roomUp(s, 'pond'); assert.strictEqual(E.fishCasts(s), D.FISH_CASTS + 2);
  s.afk.t = N0; const p0 = E.afkPreview(s, N0 + 20 * 3600e3).h; E.roomUp(s, 'bed'); const p1 = E.afkPreview(s, N0 + 20 * 3600e3).h; assert(p1 > p0); assert.strictEqual(D.AFK_MAX_H, 12);
});
t('торговец: 6 товаров, цены меняются по дням, лимит запаса, купить/продать', () => {
  const s = mk('smith', 'miner'), a = E.mkDay(s, N0), b = E.mkDay(s, N0 + DAY); assert.strictEqual(a.length, 6); assert.notStrictEqual(JSON.stringify(a), JSON.stringify(b));
  assert(a.every((x) => x.f >= 0.6 && x.f <= 1.6 && x.buy > x.sell)); const it = a[0];
  for (let i = 0; i < it.stock; i++) assert.strictEqual(E.mkBuy(s, it.id, 1, N0), ''); assert(E.mkBuy(s, it.id, 1, N0)); const g = s.gold; assert.strictEqual(E.mkSell(s, it.id, 1, N0), ''); assert(s.gold > g);
  assert(!a.some((x) => x.id === 'star_ore'));
});
t('события сменяются по неделям и все 4 встречаются', () => { const ids = new Set(); for (let w = 0; w < 8; w++) ids.add(E.eventOf(N0 + w * 7 * DAY).id); assert.strictEqual(ids.size, 4); assert(E.eventLeft(N0) <= 7 * DAY); });
t('день/ночь по местному времени', () => { assert.strictEqual(E.dayPhase(new Date(2026, 1, 1, 2).getTime()), 'night'); assert.strictEqual(E.dayPhase(new Date(2026, 1, 1, 12).getTime()), 'day'); });
t('титулы и рамки: закрытые нельзя выбрать, открытые — можно', () => {
  const s = mk('smith', 'miner'); assert(E.setTitle(s, 'tower')); assert.strictEqual(E.setTitle(s, 'king'), ''); s.tower.best = 100; assert.strictEqual(E.setTitle(s, 'tower'), ''); assert.strictEqual(E.titleName(s), 'Покоритель Башни');
  assert(E.setFrame(s, 'void') === ''); assert(E.setFrame(s, 'star')); assert.strictEqual(s.life.cos.frame, 'void');
});
t('миграция v11 → v12', () => {
  assert(S.VERSION >= 12); const s = mk('smith', 'miner'); delete s.life; const p = S.migrations[11]({ v: 11, slots: [s, null] }); assert.strictEqual(p.v, 12); assert(p.slots[0].life.fish && p.slots[0].life.house);
});
console.log(`  ${pass} ✓, ${fail} ✗`); if (fail) process.exit(1);
