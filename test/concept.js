/* Тесты Концептуальных клинков v2.12 (шесть новых + общие правила). Запуск: npm test */
const fs = require('fs'), path = require('path'), assert = require('assert');
const RPG = require('../js/data-core.js');
['data-stats', 'data-maou', 'data-maou2', 'data-prof', 'data-world', 'data-world2', 'data-crew', 'data-theme', 'data-story', 'data-story2', 'data-story3', 'data-romance', 'portrait', 'engine', 'stats', 'gear', 'combat', 'crew', 'save', 'mail'].forEach((f) => require('../js/' + f + '.js'));
const { D, E, C, M } = RPG;
let pass = 0, fail = 0; const failed = [];
const t = (name, fn) => { try { fn(); pass++; } catch (e) { fail++; failed.push(name + ': ' + e.message); console.log('  ✗', name, '\n     ', e.message); } };
const mk = (cls) => E.newSlot({ name: 'Тест', race: 'o_street', uniq: 'phoenix', prof1: 'smith', prof2: 'miner', cls });
const np = (B, only) => { for (let i = 0; i < 400; i++) { const u = C.next(B); if (u && (!only || u === only)) return u; if (B.over) return null; if (u && only) C.act(B, u, { t: 'guard' }); } throw new Error('нет хода игрока'); };
const NEW = ['abyss_dark', 'hell_heart', 'first_flame', 'boundless_source', 'chronos', 'end_of_all'], ALL = ['eden_light'].concat(NEW);
const SK = { abyss_dark: 'x_abyss', hell_heart: 'x_hell', first_flame: 'x_flame', boundless_source: 'x_source', chronos: 'x_chronos', end_of_all: 'x_entropy' };
const slotWith = (id) => { const s = mk('warrior'); s.hero.level = 40; const it = E.addItem(s, E.makeUnique(id)); assert.strictEqual(E.equip(s, it.id), ''); return { s, it }; };
// бой 1×1: герой с мечом против нейтрального врага (без стихий, без уклонения, медленный)
const bat = (id, o) => {
  o = o || {}; const { s } = slotWith(id); const P = C.unitFromSlot(s); const e = C.unitFromEnemy(o.eid || 'slime', 40, 0, false, 'e0');
  e.weak = []; e.resist = []; e.el = o.el === undefined ? null : o.el; e.eva = 0; e.spd = 0.01; if (o.boss) e.role = 'boss'; e.lv = o.boss ? 20 : e.lv;
  const B = C.create([P], [e], E.rng(o.seed || 5), {}); P.gauge = 99.9; e.gauge = 0; P.mods.hpRegen = 0; P.st = []; P.eva = 0; e.hp = e.maxHp = o.ehp || 1e7; return { B, P, e, s };
};
const fixR = (B, v) => { const w = B.rng.weighted; B.rng = () => v; B.rng.weighted = w; };
const stOf = (u, id) => u.st.find((x) => x.id === id);
const skill = (B, P, id) => { np(B, P); P.mp = P.maxMp = 999; assert.strictEqual(C.canUse(B, P, id), ''); C.act(B, P, { t: 'skill', id, tid: 'e0' }); };

console.log('Концептуальные клинки: общие правила');
const SPEC = { abyss_dark: ['Тьма Бездны', 1030, 16, 3], hell_heart: ['Сердце Преисподней', 1080, 18, 4], first_flame: ['Пламя Первого Пожара', 890, 14, 3], boundless_source: ['Безбрежный Исток', 850, 14, 3], chronos: ['Хронос', 1020, 20, 4], end_of_all: ['Конец Всего', 1250, 24, 5] };
NEW.forEach((id) => t(`${id}: Концептуальный, ур.47, фиксированные статы, замок, навык ${SPEC[id][2]} маны / ${SPEC[id][3]} хода, арт`, () => {
  const it = E.makeUnique(id), U = D.UNIQUE_ITEMS[id]; assert.strictEqual(it.r, 8); assert.strictEqual(it.il, 47); assert.strictEqual(it.nm, SPEC[id][0]); assert.strictEqual(it.st.atk, SPEC[id][1]); assert(it.lock && it.uq === id && it.sl === 'weapon' && it.up === 0);
  assert.deepStrictEqual(E.makeUnique(id), E.makeUnique(id)); assert(U.up && U.lore && U.sp.length === 3 && U.cx.length >= 3);
  const sk = D.SKILLS[SK[id]]; assert.strictEqual(sk.mp, SPEC[id][2]); assert.strictEqual(sk.cd, SPEC[id][3]); assert(sk.concept && sk.img);
  ['128', '256', 'art'].forEach((k) => { const f = path.join(__dirname, '../assets/gear/' + id + '_' + k + '.webp'); assert(fs.existsSync(f), f); assert(fs.readFileSync(path.join(__dirname, '../sw.js'), 'utf8').includes("'assets/gear/" + id + '_' + k + ".webp'")); });
}));
NEW.forEach((id) => t(`${id}: свойства и навык действуют только пока надет (герой и Свита)`, () => {
  const { s } = slotWith(id); const U = D.UNIQUE_ITEMS[id]; let d = E.derive(s); const ks = U.cx.concat(U.sp).filter((x) => x.k).map((x) => x.k); assert(ks.length >= 3);
  ks.forEach((k) => assert(d.mods[k] > 0, k)); assert(C.unitFromSlot(s).sk.includes(SK[id]));
  E.unequip(s, 'weapon'); d = E.derive(s); ks.forEach((k) => assert(!d.mods[k], k)); assert(!C.unitFromSlot(s).sk.includes(SK[id]));
  const cid = Object.keys(D.CREW)[0]; s.crew = s.crew || {}; s.crew[cid] = s.crew[cid] || { lv: 30, loy: 60, eq: {} }; s.crew[cid].eq = { weapon: E.makeUnique(id) }; const cu = C.unitFromCrew(s, cid); assert(cu.sk.includes(SK[id])); ks.forEach((k) => assert(cu.mods[k] > 0, 'Свита ' + k));
}));
t('все 7 Концептуальных: не выпадают, не продаются, не куются, не генерируются', () => {
  const rng = E.rng(91); for (let i = 0; i < 20000; i++) assert(E.rollRarity(rng, 50, 0, 99, { boss: true }) <= 7);
  for (let i = 0; i < 2000; i++) { const it = E.genItem(rng, { base: 'sword', il: 60, rarity: 8 }); assert(it.r <= 7 && !it.uq); }
  const s = mk('warrior'); for (let k = 0; k < 6; k++) { s.shopSeed = k; E.shopStock(s).forEach((it) => assert(!it.uq && it.r <= 7)); }
  const en = C.unitFromEnemy('slime', 60, 5, true, 'e0'); en.role = 'boss'; for (let i = 0; i < 300; i++) E.rollLoot(E.rng(i), s, en, { mods: { drop: 400 }, tier: D.TIERS[5] }).items.forEach((it) => assert(!it.uq));
  const src = ['engine', 'gear', 'combat', 'crew', 'stats'].map((f) => fs.readFileSync(path.join(__dirname, '../js/' + f + '.js'), 'utf8')).join('\n'); assert.strictEqual((src.match(/makeUnique\(/g) || []).length, 0);
  ALL.forEach((id) => { const { s: s2, it } = slotWith(id); E.unequip(s2, 'weapon'); const g0 = s2.gold; assert.strictEqual(E.sell(s2, it.id), 0); assert.strictEqual(s2.gold, g0); assert(s2.inv.includes(it)); });
  assert.deepStrictEqual(D.UNIQUE_IDS, ALL);
});
t('почта: подарок {unique} выдаёт каждый из 7 клинков один раз', () => {
  ALL.forEach((id) => { assert.deepStrictEqual(M.giftErrors({ unique: id }), []); const s = mk('warrior'); M.ensure && M.ensure(s); M.deliver(s, M.parseFeed({ letters: [{ id: 'g-' + id, title: 'Дар', body: 'x', from: 'Администрация', gifts: { unique: id } }] }).letters, Date.parse('2026-10-06'));
    assert(M.claim(s, 'g-' + id, Date.parse('2026-10-06')).ok); assert.strictEqual(s.inv.filter((x) => x.uq === id).length, 1); assert(!M.claim(s, 'g-' + id, Date.parse('2026-10-06')).ok); assert.strictEqual(s.inv.filter((x) => x.uq).length, 1); });
});
t('tools/mail.js ids перечисляет все 7 id; docs/MAIL.md тоже', () => {
  const out = require('child_process').execFileSync('node', [path.join(__dirname, '../tools/mail.js'), 'ids'], { encoding: 'utf8' }); const doc = fs.readFileSync(path.join(__dirname, '../docs/MAIL.md'), 'utf8');
  ALL.forEach((id) => { assert(out.includes(id), id); assert(doc.includes('`' + id + '`'), 'doc ' + id); });
});
t('концептуальный урон (тег concept): «Сопротивление концептуальному урону» режет все концептуальные навыки', () => {
  Object.values(SK).concat('x_eden').forEach((id) => assert(D.SKILLS[id].concept, id));
  const { B, P, e } = bat('eden_light'); e.mods.conceptRes = 30; const h0 = e.hp; C._cHurt(B, P, e, 1000, 'arcane'); assert.strictEqual(h0 - e.hp, 700);
  const { B: B2, P: P2, e: e2 } = bat('eden_light'); P2.hp = 2000; e2.mods.conceptRes = 30; skill(B2, P2, 'x_eden'); assert.strictEqual(1e7 - e2.hp, 980, 'Свет Эдема 1400 × 0.7');
  const { s } = slotWith('end_of_all'); assert.strictEqual(E.derive(s).mods.conceptRes, 30);
});

console.log('Тьма Бездны');
t('Тень за спиной: +20% шанса крита по цели с HP > 50%, избыток сверх 80% → урон крита 1:2', () => {
  const { B, P, e } = bat('abyss_dark'); P.crit = 70; P.critDmg = 2; fixR(B, 0.85); const eff = { k: 'dmg', s: 'atk', m: 1 }, sk = { id: 'basic' };
  let r = C._dmgCalc(B, P, e, eff, sk, 0); assert(!r.crit, '85 ≥ 80: шанс не больше предела');
  fixR(B, 0.79); r = C._dmgCalc(B, P, e, eff, sk, 0); assert(r.crit, '70+20 = 90 → 80');
  const P0 = Object.assign({}, P, { mods: Object.assign({}, P.mods, { abyssBack: 0 }) }); P0.crit = 100; const r0 = C._dmgCalc(B, P0, e, eff, sk, 0); assert(r0.crit);
  assert(Math.abs(r.v / r0.v - (1 + (2 + 0.2 - 1) * 1) / (1 + (2 - 1))) < 0.02, 'избыток 10% → +20% урона крита: ' + (r.v / r0.v));
  e.hp = e.maxHp * 0.4; r = C._dmgCalc(B, P, e, eff, sk, 0); assert(!r.crit, 'HP цели ≤ 50% — без бонуса (70 < 79)');
});
t('Покров Бездны: урон от критических атак по владельцу −60%', () => {
  const { B, P, e } = bat('abyss_dark'); fixR(B, 0); const eff = { k: 'dmg', s: 'atk', m: 1 }; const a = C._dmgCalc(B, e, P, eff, { id: 'basic' }, 0); P.mods.critTaken = 0; const b = C._dmgCalc(B, e, P, eff, { id: 'basic' }, 0);
  assert(a.crit && b.crit); assert(Math.abs(a.v / b.v - 0.4) < 0.01);
});
t('Угасание Света: враги Света −30% урона; после светового урона +20% ко всему урону на 1 ход', () => {
  const { B, P, e } = bat('abyss_dark', { el: 'light' }); P.hp = P.maxHp = 1e7; C._hurt(B, P, 1000, 'light', e); assert.strictEqual(1e7 - P.hp, 700); assert(stOf(P, 'abyssDusk'));
  assert.strictEqual(D.ST.abyssDusk.dealt, 0.2); const { B: B2, P: P2, e: e2 } = bat('abyss_dark', { el: 'fire' }); P2.hp = P2.maxHp = 1e7; C._hurt(B2, P2, 1000, 'fire', e2); assert.strictEqual(1e7 - P2.hp, 1000); assert(!stOf(P2, 'abyssDusk'));
});
t('навык «Тьма Бездны»: 60% макс. HP + 40% потерянного HP цели мимо брони; добивание 20% макс. HP при HP < 25%', () => {
  let { B, P, e } = bat('abyss_dark'); e.def = 1e6; e.hp = 9e6; skill(B, P, 'x_abyss'); P.maxHp; const exp = Math.round(P.maxHp * 0.6 + 1e6 * 0.4); assert.strictEqual(9e6 - e.hp, exp);
  ({ B, P, e } = bat('abyss_dark', { ehp: 1e5 })); e.hp = 2e4; skill(B, P, 'x_abyss'); const first = Math.round(P.maxHp * 0.6 + 8e4 * 0.4); assert.strictEqual(e.alive ? 2e4 - e.hp : 2e4, Math.min(2e4, first + 2e4)); assert.strictEqual(P.cds.x_abyss, 3);
  ({ B, P, e } = bat('abyss_dark', { boss: true })); e.hp = 1e6; skill(B, P, 'x_abyss'); assert.strictEqual(1e6 - e.hp, Math.round(P.maxHp * 0.6 + P.maxHp * 2) + Math.round(1e7 * 0.06), 'босс: часть от потерянного ≤ 200% HP владельца, добивание 6%');
});

console.log('Сердце Преисподней');
t('Демоническая плоть: вампиризм лечит на 50% больше', () => {
  const { B, P, e } = bat('hell_heart'); P.hp = 1; P.maxHp = 1e7; P.mods.lifesteal = 10; fixR(B, 0.5); np(B, P); C.act(B, P, { t: 'basic', tid: 'e0' }); const dealt = 1e7 - e.hp; assert(Math.abs((P.hp - 1) - dealt * 0.15) <= 2, (P.hp - 1) + ' vs ' + dealt);
});
t('Кровавый договор (+30% при HP<50%) и Цена силы (+6% урона, +4% пробития за каждые 10% потерь, макс. 5)', () => {
  const { P } = bat('hell_heart'); P.hp = P.maxHp; assert.strictEqual(C._cxBonus(P), 0); P.hp = P.maxHp * 0.65; assert(Math.abs(C._cxBonus(P) - 0.18) < 1e-9);
  P.hp = P.maxHp * 0.45; assert(Math.abs(C._cxBonus(P) - (0.3 + 0.3)) < 1e-9, '5 эффектов + договор'); P.hp = 1; assert(Math.abs(C._cxBonus(P) - 0.6) < 1e-9, 'не больше 5');
  const { B, e } = bat('hell_heart'); const eff = { k: 'dmg', s: 'atk', m: 1 }; e.def = 5000; fixR(B, 0.99); P.hp = P.maxHp; const a = C._dmgCalc(B, P, e, eff, { id: 'basic' }, 0).v; P.hp = P.maxHp * 0.51; const P2 = P; const b = C._dmgCalc(B, P2, e, eff, { id: 'basic' }, 0).v; assert(b > a * 1.3, 'урон и пробитие растут');
});
t('Отрицание смерти: раз за бой смертельный урон → 1 HP и щит 35% макс. HP', () => {
  const { B, P, e } = bat('hell_heart'); P.reviveUsed = true; P.slUsed = true; C._hurt(B, P, P.hp + 999, 'phys', e); assert(P.alive); assert.strictEqual(P.hp, 1); assert.strictEqual(Math.round(stOf(P, 'shield').pow), Math.round(P.maxHp * 0.35));
  P.st = []; C._hurt(B, P, 999999, 'phys', e); assert(!P.alive || P.mods.reviveOnce, 'второй раз — смерть');
});
t('Пир Падших: убийство → +25% макс. HP и +20% маны', () => {
  const { B, P, e } = bat('hell_heart', { ehp: 10 }); P.hp = 10; P.mp = 0; C._hurt(B, e, 999, 'phys', P); assert(!e.alive); assert.strictEqual(P.hp, 10 + Math.round(P.maxHp * 0.25)); assert.strictEqual(P.mp, Math.round(P.maxMp * 0.2));
});
t('навык «Сердце Преисподней»: −15% текущего HP, урон 110% недостающего + 50% макс. HP, снижение не больше 50%, возврат HP при убийстве', () => {
  let { B, P, e } = bat('hell_heart'); P.maxHp = 1e4; P.hp = 8000; np(B, P); P.mp = 999; P.hp = 8000; C.act(B, P, { t: 'skill', id: 'x_hell', tid: 'e0' });
  assert.strictEqual(P.hp, 6800); const exp = Math.round((3200 * 1.1 + 5000) * (1 + 0.18)); assert.strictEqual(1e7 - e.hp, exp);
  ({ B, P, e } = bat('hell_heart')); e.mods.taken = -90; e.resist = ['dark']; P.maxHp = 1e4; np(B, P); P.mp = 999; P.hp = 1e4; C.act(B, P, { t: 'skill', id: 'x_hell', tid: 'e0' }); assert.strictEqual(1e7 - e.hp, Math.round((1500 * 1.1 + 5000) * 1.06 * 0.5), 'не меньше 50%');
  ({ B, P, e } = bat('hell_heart', { ehp: 100 })); P.maxHp = 1e4; np(B, P); P.mp = 999; P.hp = 1e4; C.act(B, P, { t: 'skill', id: 'x_hell', tid: 'e0' }); assert(!e.alive); assert(P.hp >= 1e4 - 1, 'HP вернулось: ' + P.hp); assert.strictEqual(P.cds.x_hell, 4);
});

console.log('Пламя Первого Пожара');
t('Раскалённая сталь: атака → Горение 3 хода, 5% силы атаки за ход; тикает в начале хода цели', () => {
  const { B, P, e } = bat('first_flame'); fixR(B, 0.99); np(B, P); C.act(B, P, { t: 'basic', tid: 'e0' }); const b = stOf(e, 'fburn'); assert(b); assert.strictEqual(b.dur, 3); assert(Math.abs(b.pow - P.atk * 0.05) < 1e-6); assert.strictEqual(D.ST.fburn.k, 'dot');
});
t('Неугасимое Пламя: Горение и Первичное Горение не снимаются очищением; обычное — снимается', () => {
  const { B, P, e } = bat('first_flame'); C.addSt(B, P, e, 'fburn', 3, 10); C.addSt(B, P, e, 'primal', 3, 10); C.addSt(B, P, e, 'burn', 3, 10); C.addSt(B, P, e, 'weak', 3);
  const cl = { id: 'tc', n: 'c', tgt: 'self', fx: [{ k: 'cleanse' }] }; B.cur = e; D.ESK.__tc = cl; C.act(B, e, { t: 'enemy', id: '__tc' }); delete D.ESK.__tc;
  assert(stOf(e, 'fburn') && stOf(e, 'primal')); assert(!stOf(e, 'burn') && !stOf(e, 'weak'));
});
t('Воспламенение: считается только Горение этого оружия — обычное Горение (не от меча) не повторяется', () => {
  const x = bat('first_flame'); x.P.mods.flameSteel = 0; C.addSt(x.B, { id: 'z', side: 'a' }, x.e, 'burn', 3, 1000); fixR(x.B, 0); np(x.B, x.P); x.P.crit = 80; const h1 = x.e.hp; C.act(x.B, x.P, { t: 'basic', tid: 'e0' }); const withBurn = h1 - x.e.hp;
  const y = bat('first_flame'); y.P.mods.flameSteel = 0; fixR(y.B, 0); np(y.B, y.P); y.P.crit = 80; const h2 = y.e.hp; C.act(y.B, y.P, { t: 'basic', tid: 'e0' }); assert.strictEqual(withBurn, h2 - y.e.hp);
});
t('Воспламенение: крит мгновенно наносит весь оставшийся урон Горения ещё раз, эффект остаётся', () => {
  const { B, P, e } = bat('first_flame'); P.mods.flameSteel = 0; C.addSt(B, P, e, 'primal', 3, 1000); fixR(B, 0.99); np(B, P); const h0 = e.hp; C.act(B, P, { t: 'basic', tid: 'e0' }); const noCrit = h0 - e.hp;
  const x = bat('first_flame'); x.P.mods.flameSteel = 0; C.addSt(x.B, x.P, x.e, 'primal', 3, 1000); fixR(x.B, 0); np(x.B, x.P); x.P.crit = 80; const h1 = x.e.hp; C.act(x.B, x.P, { t: 'basic', tid: 'e0' }); assert(h1 - x.e.hp >= 3000, 'крит + 3000 Горения'); assert(stOf(x.e, 'primal')); assert(noCrit < h1 - x.e.hp);
});
t('Жар битвы: после каждой атаки +5% урона, максимум +25%', () => {
  const { B, P } = bat('first_flame'); for (let i = 0; i < 7; i++) { np(B, P); C.act(B, P, { t: 'basic', tid: 'e0' }); if (i === 0) assert.strictEqual(P.heat, 1); } assert.strictEqual(P.heat, 5); assert(Math.abs(C._cxBonus(P) - 0.25) < 1e-9);
});
t('навык «Первый Пожар»: огонь 65% макс. HP + Первичное Горение 8% макс. HP цели (боссы — 2%)', () => {
  let { B, P, e } = bat('first_flame'); skill(B, P, 'x_flame'); assert.strictEqual(1e7 - e.hp, Math.round(P.maxHp * 0.65 * (1 + C._cxBonus(P) - 0.05))); const p = stOf(e, 'primal'); assert.strictEqual(p.dur, 3); assert(Math.abs(p.pow - 1e7 * 0.08) < 1);
  ({ B, P, e } = bat('first_flame', { boss: true })); skill(B, P, 'x_flame'); assert(Math.abs(stOf(e, 'primal').pow - e.maxHp * 0.02) < 1); assert.strictEqual(P.cds.x_flame, 3);
});

console.log('Безбрежный Исток');
t('Текучая форма: периодический урон по владельцу −55%; Восстановление потока: +6% макс. HP в начале хода', () => {
  const { B, P, e } = bat('boundless_source'); P.sub.tenac = 0; P.hp = 1000; P.maxHp = 1e5; C.addSt(B, e, P, 'poison', 3, 1000); P._formUsed = true; if (!stOf(P, 'poison')) P.st.push({ id: 'poison', dur: 3, pow: 1000, src: 'e0' });
  stOf(P, 'poison').pow = 1000; np(B, P); assert.strictEqual(P.hp, 1000 + 6000 - 450);
});
t('Вода принимает любую форму: первый дебафф врага за ход с шансом 50% исчезает', () => {
  const { B, P, e } = bat('boundless_source'); fixR(B, 0.1); C.addSt(B, e, P, 'weak', 2); assert(!stOf(P, 'weak')); C.addSt(B, e, P, 'vuln', 2); assert(stOf(P, 'vuln'), 'только первый');
  const x = bat('boundless_source'); fixR(x.B, 0.9); C.addSt(x.B, x.e, x.P, 'weak', 2); assert(stOf(x.P, 'weak'), 'не повезло (50%)');
});
t('Обратное течение: избыточное лечение → щит, не больше 50% макс. HP; пока есть щит — весь урон +25%', () => {
  const { B, P } = bat('boundless_source'); P.hp = P.maxHp - 100; C._heal(B, P, P, 300, true, true); assert.strictEqual(P.hp, P.maxHp); assert.strictEqual(Math.round(stOf(P, 'shield').pow), 200);
  C._heal(B, P, P, P.maxHp * 5, true, true); assert.strictEqual(Math.round(stOf(P, 'shield').pow), Math.round(P.maxHp * 0.5));
  assert.strictEqual(P.mods.srcTide, 25); assert(Math.abs(C._cxBonus(P) - 0.25) < 1e-9, 'со щитом +25%'); stOf(P, 'shield').pow = 0; assert.strictEqual(C._cxBonus(P), 0, 'без щита — нет');
  const x = bat('boundless_source'); const eff = { k: 'dmg', s: 'atk', m: 1 }; fixR(x.B, 0.99); const a = C._dmgCalc(x.B, x.P, x.e, eff, { id: 'basic' }, 0).v; C.addSt(x.B, x.P, x.P, 'shield', 3, 100); const b = C._dmgCalc(x.B, x.P, x.e, eff, { id: 'basic' }, 0).v;
  const m0 = 1 + x.P.mods.dmg / 100; assert(Math.abs(b / a - (m0 + 0.25) / m0) < 0.01, 'урон атаки ×' + (b / a));
});
t('навык «Безбрежный Исток»: снимает до 3 дебаффов, 45% макс. HP +15% за каждый, лечит 35%', () => {
  const { B, P, e } = bat('boundless_source'); np(B, P); P.mp = 999; P.st = P.st.filter((x) => x.id !== 'shield'); ['weak', 'vuln', 'mark', 'chill'].forEach((id) => P.st.push({ id, dur: 3, pow: 0, src: 'e0' })); P.hp = 100;
  C.act(B, P, { t: 'skill', id: 'x_source', tid: 'e0' }); assert.strictEqual(P.st.filter((x) => ['weak', 'vuln', 'mark', 'chill'].includes(x.id)).length, 1);
  assert.strictEqual(1e7 - e.hp, Math.round(P.maxHp * 0.45 * 1.45)); assert(P.hp >= 100 + Math.round(P.maxHp * 0.35)); assert.strictEqual(P.cds.x_source, 3);
});

t('Безбрежный Исток v2.12.1: Весь урон +62%, урон крита +155%, бронепробитие +38%, получаемый урон −45%; тексты совпадают', () => {
  const U = D.UNIQUE_ITEMS.boundless_source; assert.strictEqual(U.st.dmg, 62); assert.strictEqual(U.st.critDmg, 1.55); assert.strictEqual(U.st.pen, 38); assert.strictEqual(U.st.taken, -45);
  assert(/−45%/.test(U.sp[2].d) && /6%/.test(U.sp[1].d) && U.sp[1].v === 6 && /50%/.test(U.cx[1].d) && /\+25%/.test(U.cx[1].d) && U.cx[1].v === 50 && U.cx[1].v2 === 25);
  assert(/слабее основных Концептуальных мечей, но значительно сильнее в выживаемости/.test(U.note));
});
console.log('Хронос');
t('Вне мгновения: дебаффы на владельце −1 ход (мин. 1); Предвидение: уклонение +25%; контроль: сопротивление 70%', () => {
  const { B, P, e } = bat('chronos'); C.addSt(B, e, P, 'weak', 3); assert.strictEqual(stOf(P, 'weak').dur, 2); C.addSt(B, e, P, 'vuln', 1); assert.strictEqual(stOf(P, 'vuln').dur, 1);
  const { s } = slotWith('chronos'); const d = E.derive(s); E.unequip(s, 'weapon'); assert(d.eva - E.derive(s).eva >= 24.9); assert.strictEqual(d.mods.ccRes, 70);
  const x = bat('chronos'); fixR(x.B, 0.6); x.P.sub.statRes = 0; require('assert')(true); const D2 = { k: 'st', id: 'stun', dur: 1 };
  x.B.cur = x.e; D.ESK.__st = { id: '__st', n: 's', tgt: 'foe', fx: [D2] }; C.act(x.B, x.e, { t: 'enemy', id: '__st', tid: 'p' }); assert(!stOf(x.P, 'stun'), '0.6×100 < 70 → сопротивление');
  fixR(x.B, 0.75); x.B.cur = x.e; C.act(x.B, x.e, { t: 'enemy', id: '__st', tid: 'p' }); delete D.ESK.__st; assert(stOf(x.P, 'stun'), '75 ≥ 70');
});
t('Украденная секунда: после каждого третьего действия шкала хода +50%', () => {
  const { B, P } = bat('chronos'); const g = []; for (let i = 0; i < 3; i++) { np(B, P); const before = P.gauge; C.act(B, P, { t: 'guard' }); g.push(P.gauge - before); } assert.deepStrictEqual(g.map((x) => Math.round(x)), [0, 0, 50]);
});
t('То, чего ещё не произошло: при HP < 30% (раз за бой) HP и мана откатываются к началу предыдущего хода', () => {
  const { B, P, e } = bat('chronos'); P.hp = P.maxHp; np(B, P); P.mp = 33; const snap = P._snapCur; C.act(B, P, { t: 'guard' }); P.mp = 1; C._hurt(B, P, P.hp - 5, 'phys', e);
  assert.strictEqual(P.hp, snap.hp); assert(P.rewUsed); C._hurt(B, P, P.hp - 5, 'phys', e); assert.strictEqual(P.hp, 5, 'второй раз — нет');
  const x = bat('chronos'); x.P.reviveUsed = true; x.P.hp = x.P.maxHp; C._hurt(x.B, x.P, x.P.hp * 5, 'phys', x.e); assert(x.P.alive, 'смертельный удар тоже откатывается');
});
t('навык «Разрыв Хроноса»: 65% текущего HP мимо брони/уклонения, цель пропускает ход, владелец +50% шкалы; боссы −40% шкалы', () => {
  let { B, P, e } = bat('chronos'); e.eva = 100; e.def = 1e6; P.hp = 3000; np(B, P); P.mp = 999; P.hp = 3000; const g0 = P.gauge; C.act(B, P, { t: 'skill', id: 'x_chronos', tid: 'e0' }); assert.strictEqual(1e7 - e.hp, 1950); assert(stOf(e, 'chronoStop')); assert(P.gauge - g0 >= 50);
  e.gauge = 200; const u = C.next(B); assert(!stOf(e, 'chronoStop')); assert(e.turns >= 1);
  ({ B, P, e } = bat('chronos', { boss: true })); e.gauge = 30; skill(B, P, 'x_chronos'); assert(!stOf(e, 'chronoStop')); assert(e.gauge <= 30 - 40 + 1); assert.strictEqual(P.cds.x_chronos, 4);
});

console.log('Конец Всего — Клинок Энтропии');
t('Неизбежность распада: 30% защиты цели игнорируется после бронепробития', () => {
  const { B, P, e } = bat('end_of_all'); e.def = 3000; fixR(B, 0.99); const eff = { k: 'dmg', s: 'atk', m: 1 }; const a = C._dmgCalc(B, P, e, eff, { id: 'basic' }, 0).v; P.mods.entIgnore = 0; const b = C._dmgCalc(B, P, e, eff, { id: 'basic' }, 0).v; assert(a > b * 1.05);
});
t('Энтропия всегда возрастает: +1 Распад за удар (макс. 6), −5%/ур. урона, лечения и защиты цели, не снимается', () => {
  const { B, P, e } = bat('end_of_all'); for (let i = 0; i < 8; i++) C._hurt(B, e, 10, 'phys', P); assert.strictEqual(stOf(e, 'decay').pow, 6);
  const eff = { k: 'dmg', s: 'atk', m: 1 }; fixR(B, 0.99); P.def = 0; const a = C._dmgCalc(B, e, P, eff, { id: 'basic' }, 0).v; const sv = e.st; e.st = []; const b = C._dmgCalc(B, e, P, eff, { id: 'basic' }, 0).v; e.st = sv; assert(Math.abs(a / b - 0.7) < 0.02, 'урон цели −30%: ' + a / b);
  e.st = e.st.filter((x) => x.id === 'decay'); e.maxHp = 1e7; e.hp = 1e6; P.mods.entIrrev = 0; const h = C._heal(B, e, e, 1000, true, true); assert.strictEqual(h, 700, 'лечение −30%');
  e.st.push({ id: 'weak', dur: 2, pow: 0 }); B.cur = e; D.ESK.__c = { id: '__c', n: 'c', tgt: 'self', fx: [{ k: 'cleanse' }] }; C.act(B, e, { t: 'enemy', id: '__c' }); delete D.ESK.__c; assert(stOf(e, 'decay') && !stOf(e, 'weak'));
  assert.strictEqual(D.ST.decay.def, -0.05);
});
t('Тепловая смерть: на 6 уровне — 2 хода, лечение −80%, щиты −80%, мана −50%, +35% урона владельца', () => {
  const { B, P, e } = bat('end_of_all'); for (let i = 0; i < 5; i++) C._hurt(B, e, 1, 'phys', P); C.addSt(B, e, e, 'shield', 5, 1000); e.st = e.st.filter((x) => x.id !== 'shield'); C._hurt(B, e, 1, 'phys', P);
  const hd = stOf(e, 'heatDeath'); assert(hd && hd.dur === 2); const h0 = e.hp; C._hurt(B, e, 1000, 'phys', P); assert.strictEqual(h0 - e.hp, 1350, '+35%');
  const sh = stOf(e, 'shield'); if (sh) sh.pow = 0; C.addSt(B, e, e, 'shield', 3, 1000); assert.strictEqual(Math.round(stOf(e, 'shield').pow), 200, 'новые щиты −80%');
  P.mods.entIrrev = 0; e.hp = 1e5; e.maxHp = 1e7; assert.strictEqual(C._heal(B, e, e, 1000, true, true), Math.round(1000 * 0.7 * 0.2));
  const mpGain = (hd) => { const x = bat('end_of_all'); np(x.B, x.P); if (hd) x.P.st.push({ id: 'heatDeath', dur: 2, pow: 0 }); x.P.mp = 0; x.P.mods.mpRegen = 0; C.act(x.B, x.P, { t: 'basic', tid: 'e0' }); return x.P.mp; };
  assert.strictEqual(mpGain(false) - mpGain(true), 1, 'восстановление маны за ход 2 → 1');
});
t('Закон необратимости: 20% лечения противника → потеря макс. HP (боссы 5%), до конца боя', () => {
  const { B, P, e } = bat('end_of_all'); e.st = []; e.maxHp = 1e5; e.hp = 5e4; assert.strictEqual(C._heal(B, e, e, 1000, true, true), 1000); assert.strictEqual(e.maxHp, 1e5 - 200);
  const x = bat('end_of_all', { boss: true }); x.e.maxHp = 1e5; x.e.hp = 5e4; C._heal(x.B, x.e, x.e, 1000, true, true); assert.strictEqual(x.e.maxHp, 1e5 - 50);
  const fresh = C.unitFromEnemy('slime', 40, 0, false, 'e0'); assert(fresh.maxHp < 1e5 && !fresh.lostMax, 'новый бой — без потерь');
});
t('навык «Вселенская Энтропия»: 80% макс. HP + 20% потерянного, мимо брони/уклонения, 50% снижения; +3 Распада; на 6 — Коллапс 20% (боссы 8%)', () => {
  let { B, P, e } = bat('end_of_all'); e.eva = 100; e.def = 1e6; e.mods.taken = -40; e.hp = 5e6; skill(B, P, 'x_entropy'); assert.strictEqual(5e6 - e.hp, Math.round((P.maxHp * 0.8 + 5e6 * 0.2) * 0.8)); assert.strictEqual(stOf(e, 'decay').pow, 4, '1 за удар + 3');
  ({ B, P, e } = bat('end_of_all')); e.st.push({ id: 'decay', dur: 99, pow: 6 }); skill(B, P, 'x_entropy'); const first = Math.round(P.maxHp * 0.8); assert.strictEqual(1e7 - e.hp, first + Math.round((1e7 - first) * 0.2), 'Коллапс 20% текущего');
  ({ B, P, e } = bat('end_of_all', { boss: true })); e.st.push({ id: 'decay', dur: 99, pow: 6 }); skill(B, P, 'x_entropy'); const f2 = Math.round(P.maxHp * 0.8); assert.strictEqual(1e7 - e.hp, f2 + Math.round((1e7 - f2) * 0.08), 'боссы 8%'); assert.strictEqual(P.cds.x_entropy, 5);
});

console.log('Баланс: вода ≈ огонь, вода — самая живучая по получаемому урону');
t('concept-duel: Исток в пределах ±10% от Пламени по ходам до победы (4 босса), оба медленнее Эдема; --tank: у Истока меньше всех урона за ход врага и живучесть выше Пламени', () => {
  const run = (a) => { const o = require('child_process').execFileSync('node', [path.join(__dirname, '../tools/concept-duel.js')].concat(a, ['--json']), { encoding: 'utf8' }).trim().split('\n'); return JSON.parse(o[o.length - 1]); };
  [['ember_titan', '47'], ['frost_queen', '47'], ['void_sovereign', '47'], ['ember_titan', '52']].forEach(([b, l]) => {
    const r = run(['40', b, l]), w = r.boundless_source.turnsToWin, f = r.first_flame.turnsToWin, e = r.eden_light.turnsToWin;
    assert(Math.abs(w / f - 1) <= 0.1, `${b} ${l}: вода ${w} / огонь ${f}`); assert(w > e && f > e, `${b}: слабее Эдема (${e})`); assert(r.end_of_all.turnsToWin < Math.min(w, f, e));
  });
  ['55', '60'].forEach((l) => { const r = run(['40', 'void_sovereign', l, '--tank']), w = r.boundless_source;
    Object.keys(r).filter((k) => k !== 'boundless_source').forEach((k) => assert(w.takenPerEnemyTurn < r[k].takenPerEnemyTurn, `${l}: урон за ход ${w.takenPerEnemyTurn} < ${k} ${r[k].takenPerEnemyTurn}`));
    assert(w.turns > r.first_flame.turns * 1.2 && w.turns >= r.eden_light.turns, `${l}: живучесть ${w.turns} vs огонь ${r.first_flame.turns}, Эдем ${r.eden_light.turns}`); });
});

console.log(`\nКонцептуальные: ${pass} ✓, ${fail} ✗`);
if (fail) { console.log(failed.join('\n')); process.exit(1); }
