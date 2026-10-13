/* Тесты «Мастерской творца» v2.15: открытие (Кузнец + Зачарователь), качество материалов → редкость (по слабейшему, ≤ 7),
   бюджет и лимиты линий, баланс относительно случайных вещей, защита от подмены (перепроверка при загрузке), траты материалов, загрузка PNG.
   Запуск: node test/craft.js */
const fs = require('fs'), path = require('path'), assert = require('assert');
const RPG = require('../js/data-core.js');
['data-stats', 'data-maou', 'data-maou2', 'data-prof', 'data-world', 'data-world2', 'data-crew', 'data-theme', 'data-story', 'data-story2', 'data-story3', 'data-romance', 'portrait', 'engine', 'stats', 'gear', 'combat', 'crew', 'save', 'data-craft-icons', 'craft', 'mail'].forEach((f) => require('../js/' + f + '.js'));
const { D, E, C, S } = RPG;
let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); pass++; } catch (e) { fail++; console.log('  ✗', name, '\n     ', e.message); } };
const mk = (p1, p2, lv) => { const s = E.newSlot({ name: 'Мастер', race: 'o_street', uniq: 'phoenix', prof1: p1 || 'smith', prof2: p2 || 'ench', cls: 'warrior' }); s.hero.level = lv || 50; s.gold = 1e6; return s; };
const MQ = (q) => Object.keys(D.MATS).filter((id) => E.matQ(id) === q);
const m3 = (q) => [MQ(q)[0], MQ(q)[0], MQ(q)[0]];
const give = (s, mats) => mats.forEach((id) => E.addMat(s, id, 1));
const spec = (o) => Object.assign({ base: 'sword', mats: m3(7), nm: 'Мой меч', a: {}, fx: {}, sk: [], ic: E.craftIcons('sword', 7)[0].id }, o);

console.log('Ремесло творца: открытие и материалы');
t('открывается только с ОБЕИМИ профессиями Кузнец + Зачарователь (в любом порядке)', () => {
  assert(E.craftUnlocked(mk('smith', 'ench'))); assert(E.craftUnlocked(mk('ench', 'smith')));
  assert(!E.craftUnlocked(mk('smith', 'miner'))); assert(!E.craftUnlocked(mk('ench', 'alch'))); assert(!E.craftUnlocked(mk('cook', 'herb')));
  assert(/Зачарователь/.test(E.craftLockWhy(mk('smith', 'miner'))));
  const s = mk('smith', 'miner'); give(s, m3(3)); const r = E.craftCustom(s, spec({ mats: m3(3) })); assert(r.err && !r.item); assert.strictEqual(s.mats[m3(3)[0]], 3, 'материалы не тронуты');
});
t('у каждого материала качество 0…7; есть материалы всех 8 ступеней; новые 4…7 падают только с мини-боссов/боссов с нужного уровня', () => {
  Object.keys(D.MATS).forEach((id) => { const q = E.matQ(id); assert(Number.isInteger(q) && q >= 0 && q <= 7, id); });
  for (let q = 0; q <= 7; q++) assert(MQ(q).length >= 1, 'нет материала качества ' + q);
  const s = mk(); const ctx = { mods: {}, tier: D.TIERS[0] }; let got = {};
  const roll = (role, lv, n) => { got = {}; for (let i = 0; i < n; i++) { const o = E.rollLoot(E.rng(i + 1), s, { eid: 'slime', lv, role, elite: false }, ctx); for (const k in o.mats) got[k] = (got[k] || 0) + o.mats[k]; } return got; };
  roll('boss', 70, 400); assert(got.nimbus_shard > 0 && got.star_ore > 0, 'босс 70 даёт божественные и эпические');
  roll('mini', 70, 400); assert(!got.nimbus_shard, 'божественные — только боссы'); assert(got.myth_blood > 0);
  roll('boss', 20, 400); assert(got.star_ore > 0 && !got.phoenix_f && !got.myth_blood && !got.nimbus_shard, 'ур. 20 — только эпические');
  roll('brute', 70, 400); assert(!got.star_ore && !got.nimbus_shard, 'обычные враги не дают');
});
t('редкость = СРЕДНЕЕ качество 3 материалов, вниз, никогда выше 7; ровно 3 материала', () => {
  assert.strictEqual(E.craftRarity([MQ(7)[0], MQ(7)[0], MQ(2)[0]]), 5);   // 16/3 = 5.33 → 5
  assert.strictEqual(E.craftRarity([MQ(5)[0], MQ(6)[0], MQ(7)[0]]), 6);
  assert.strictEqual(E.craftRarity([MQ(7)[0], MQ(7)[0], MQ(6)[0]]), 6);   // 20/3 = 6.67 → 6
  assert.strictEqual(E.craftRarity([MQ(0)[0], MQ(0)[0], MQ(2)[0]]), 0);
  assert.strictEqual(E.craftRarity(m3(7)), 7); assert.strictEqual(E.craftRarity(m3(0)), 0);
  assert.strictEqual(E.craftRarity([MQ(7)[0], MQ(7)[0]]), -1); assert.strictEqual(E.craftRarity(['nope', MQ(7)[0], MQ(7)[0]]), -1);
  D.MATS.__hack = { n: 'x', ic: 'x', v: 1, q: 99 }; assert.strictEqual(E.craftRarity(['__hack', '__hack', '__hack']), 7, 'даже с подменённым качеством — максимум 7'); delete D.MATS.__hack;
  for (let r = 0; r <= 7; r++) assert(E.craftRules(r).r <= 7); assert.strictEqual(E.craftRules(10).r, 7);
});

console.log('Ремесло творца: правила, бюджет, баланс');
t('лимиты по редкости совпадают со случайными вещами: макс. линий характеристик/аффиксов, типы свойств (u/m/d); навыки 0/1/2', () => {
  for (let r = 0; r <= 7; r++) { const R = E.craftRules(r), Rr = D.RARITY[r]; assert.strictEqual(R.attr, Rr.attr[1]); assert.strictEqual(R.aff, Rr.aff[1]); assert.deepStrictEqual(R.fx, Rr.fx); }
  assert.deepStrictEqual([0, 1, 2, 3, 4, 5, 6, 7].map((r) => E.craftRules(r).sk), [0, 0, 0, 0, 1, 1, 1, 2]);
  assert.deepStrictEqual([0, 1, 2, 3, 4, 5, 6, 7].map((r) => E.craftRules(r).budget), [8, 10, 17, 18, 28, 40, 45, 52]);
});
t('проверка отклоняет: бюджет, >10 очков на линию, лишние линии, линии основы, чужие свойства, лишние навыки, иконку выше редкости', () => {
  const ok = E.craftCheck(spec({ a: { luk: 10, vit: 10, dmg: 10, crit: 10, pen: 10, acc: 2 }, fx: { u: 'brand', m: 'exec', d: 'rebirth' }, sk: ['u_phoenix', 'u_thunder'] }));
  assert.deepStrictEqual(ok.err, []); assert.strictEqual(ok.spent, 52);
  assert(E.craftCheck(spec({ a: { luk: 10, vit: 10, dmg: 10, crit: 10, pen: 10, acc: 3 } })).err.some((e) => /бюджет/.test(e)));
  assert(E.craftCheck(spec({ a: { luk: 11 } })).err.some((e) => /больше 10/.test(e)));
  assert(E.craftCheck(spec({ a: { spi: 1, vit: 1, luk: 1, agi: 1, int: 1 } })).err.some((e) => /характеристик больше/.test(e)));
  assert(E.craftCheck(spec({ a: { atk: 5 } })).err.some((e) => /основе/.test(e)), 'атака — основа меча, не линия');
  assert(E.craftCheck(spec({ mats: m3(5), fx: { m: 'exec' } })).err.length, 'мифическое свойство у легендарной вещи');
  assert(E.craftCheck(spec({ fx: { u: 'exec' } })).err.length, 'мифическое на месте уникального');
  assert(E.craftCheck(spec({ sk: ['u_phoenix', 'u_thunder', 'u_venom'] })).err.some((e) => /навыков больше/.test(e)));
  assert(E.craftCheck(spec({ sk: ['x_eden'] })).err.some((e) => /навык/.test(e)), 'навык Концептуального клинка не в пуле');
  assert(E.craftCheck(spec({ mats: m3(4), sk: ['u_phoenix', 'u_thunder'] })).err.length);
  const hi = E.craftIcons('sword', 7).find((x) => x.r === 7); assert(E.craftCheck(spec({ mats: m3(2), ic: hi.id })).err.some((e) => /иконка/.test(e)));
  const ring = E.craftIcons('ring', 7)[0]; assert(E.craftCheck(spec({ ic: ring.id })).err.some((e) => /иконка/.test(e)), 'иконка кольца для меча');
});
t('значения: 10 очков = максимальный бросок случайной вещи (×1.15), линии с потолком не выходят за потолок', () => {
  const il = 60, r = 7;
  assert.strictEqual(E.craftAttrVal('str', il, r, 10), Math.round(D.GEAR_ATTR_K * (5 + il * 2.4) * D.RARITY[r].am * 1.15));
  const c = D.GEAR_AFF_BY.crit; assert(E.craftAffVal('crit', 100, 7, 10) <= c.cap);
  assert(E.craftAffVal('dmg', il, r, 5) < E.craftAffVal('dmg', il, r, 10));
});
// лучшая возможная раскладка (жадно по оценке) против случайных вещей той же и следующей редкости
const bestItem = (base, il, r) => {
  const R = E.craftRules(r), B = D.BASES[base], sc = (k) => E.itemScore({ k: base, st: { [k]: E.craftLineVal(k, il, r, 10) }, up: 0 });
  const at = D.STATS.filter((k) => B.p[k] == null).sort((a, b) => sc(b) - sc(a)).slice(0, R.attr), af = D.GEAR_AFF.map((a) => a.k).filter((k) => B.p[k] == null).sort((a, b) => sc(b) - sc(a)).slice(0, R.aff);
  const a = {}; let left = R.budget; at.concat(af).sort((x, y) => sc(y) - sc(x)).forEach((k) => { const p = Math.min(10, left); if (p > 0) { a[k] = p; left -= p; } });
  const fx = {}, used = new Set(Object.keys(a)); R.fx.forEach((tt) => { const f = D.GEAR_FX.filter((x) => x.t === tt && !used.has(x.k)).sort((x, y) => E.itemScore({ k: base, st: { [y.k]: E.craftFxVal(y, il, r) }, up: 0 }) - E.itemScore({ k: base, st: { [x.k]: E.craftFxVal(x, il, r) }, up: 0 }))[0]; fx[tt] = f.id; used.add(f.k); });
  const c = E.craftCheck({ base, mats: m3(r), a, fx, sk: [] }); assert.deepStrictEqual(c.err, []); return E.craftBuild(c.spec, il, 'x');
};
const med = (base, il, r) => { const a = []; for (let i = 0; i < 160; i++) a.push(E.itemScore(E.genItem(E.rng(i * 31 + r * 977 + il), { base, il, rarity: r }))); a.sort((x, y) => x - y); return a[80]; };
t('баланс: лучшая своя вещь ≥ медианы случайной той же редкости и < медианы следующей (все 17 основ, ур. 15/45/80)', () => {
  const bad = [];
  D.CRAFT_BASES.forEach((base) => [15, 45, 80].forEach((il) => { for (let r = 0; r <= 7; r++) { const x = E.itemScore(bestItem(base, il, r)); if (x < med(base, il, r) * 0.98) bad.push(`${base} ${il} r${r}: ${Math.round(x)} < мед. ${Math.round(med(base, il, r))}`); if (r < 7 && x >= med(base, il, r + 1)) bad.push(`${base} ${il} r${r}: ${Math.round(x)} ≥ мед. r${r + 1} ${Math.round(med(base, il, r + 1))}`); } }));
  assert.deepStrictEqual(bad, []);
});

console.log('Ремесло творца: создание и траты');
t('создание: материалы и золото тратятся только при успехе; предмет «Создано игроком», редкость по материалам, ур. = ур. героя', () => {
  const s = mk(); const mats = [MQ(6)[0], MQ(7)[0], MQ(7)[0]]; give(s, mats); const g0 = s.gold, n0 = s.inv.length;
  const bad = E.craftCustom(s, spec({ mats, a: { luk: 99 } })); assert(bad.err); assert.strictEqual(s.gold, g0); assert.strictEqual(s.mats[MQ(7)[0]], 2); assert.strictEqual(s.inv.length, n0);
  const r = E.craftCustom(s, spec({ mats, a: { luk: 10, dmg: 10 }, fx: { u: 'brand', m: 'exec' }, sk: ['u_frostheart'], ic: E.craftIcons('sword', 6)[0].id }));
  assert(!r.err, r.err); const it = r.item; assert.strictEqual(it.r, 6); assert.strictEqual(it.il, 50); assert(it.cu && it.cu.by === 'Мастер');
  assert(!s.mats[MQ(7)[0]] && !s.mats[MQ(6)[0]], 'материалы потрачены'); assert.strictEqual(s.gold, g0 - E.craftGold(6)); assert.strictEqual(s.inv.length, n0 + 1);
  assert.deepStrictEqual(it.fx, ['brand', 'exec']); assert(it.st.atk > 0 && it.st.luk > 0 && it.st.dmg > 0 && it.st.bossDmg > 0 && it.st.execute > 0);
  const r2 = E.craftCustom(s, spec({ mats })); assert(/материал/.test(r2.err), 'без материалов — отказ');
});
t('совместимость: надевается, даёт статы и навык в бою, улучшается и продаётся как обычная вещь', () => {
  const s = mk(); give(s, m3(7)); const it = E.craftCustom(s, spec({ a: { luk: 10 }, sk: ['u_thunder'] })).item;
  const d0 = E.derive(s); assert.strictEqual(E.equip(s, it.id), ''); const d1 = E.derive(s); assert(d1.atk > d0.atk);
  const P = C.unitFromSlot(s); assert(P.sk.includes('u_thunder'), 'навык вещи в бою');
  const uc = E.upCost(s, it); for (const k in uc.mats) E.addMat(s, k, uc.mats[k]); assert.strictEqual(E.upgrade(s, it), ''); assert.strictEqual(it.up, 1);
  E.unequip ? E.unequip(s, 'weapon') : null; const g = E.sellPrice(it); assert(g > 0);
});
t('один и тот же материал можно взять 3 раза только если его ≥ 3', () => {
  const s = mk(); E.addMat(s, MQ(5)[0], 2); assert(/материал/.test(E.craftCustom(s, spec({ mats: m3(5), ic: E.craftIcons('sword', 5)[0].id })).err)); E.addMat(s, MQ(5)[0], 1); assert(E.craftCustom(s, spec({ mats: m3(5), ic: E.craftIcons('sword', 5)[0].id })).item);
});
t('нельзя во время вылазки', () => { const s = mk(); give(s, m3(1)); s.run = { x: 1 }; assert(/вылазк/.test(E.craftCustom(s, spec({ mats: m3(1), ic: E.craftIcons('sword', 1)[0].id })).err)); });

console.log('Ремесло творца: защита сохранения, имя, иконки, загрузка PNG');
const IMG = 'data:image/webp;base64,' + 'A'.repeat(4000);
t('подмена в сохранении: статы пересобираются из рецепта, лишнее режется, редкость не поднимается выше материалов', () => {
  const s = mk(); give(s, m3(7)); const it = E.craftCustom(s, spec({ a: { luk: 10, dmg: 10 }, fx: { u: 'brand' } })).item; { const uc = E.upCost(s, it); for (const k in uc.mats) E.addMat(s, k, uc.mats[k]); } assert.strictEqual(E.upgrade(s, it), ''); const ok = JSON.parse(JSON.stringify(it));
  const p = { v: S.VERSION, slots: [s] }; const tam = JSON.parse(JSON.stringify(p)), x = tam.slots[0].inv.find((q) => q.id === it.id);
  x.st.atk = 999999; x.st.dmg = 900; x.st.reviveOnce = 1; x.r = 10; x.cu.a.luk = 500; x.cu.a.crit = 10; x.cu.a.pen = 10; x.cu.a.spd = 10; x.cu.a.eva = 10; x.cu.a.acc = 10; x.cu.a.lifesteal = 10; x.cu.sk = ['x_deny', 'u_phoenix', 'u_thunder', 'u_venom']; x.cu.fx = { u: 'brand', d: 'rebirth', x: 'verdict' };
  const m = S.migrate(tam), y = m.slots[0].inv.find((q) => q.id === it.id);
  assert.strictEqual(y.r, 7); assert.strictEqual(y.st.atk, ok.st.atk); assert(y.st.dmg <= ok.st.dmg + 1e-9 || y.cu.a.dmg <= 10); assert(!('reviveOnce' in y.st) || y.cu.fx.d === 'rebirth');
  assert(Object.values(y.cu.a).reduce((a, b) => a + b, 0) <= E.craftRules(7).budget); assert(Object.values(y.cu.a).every((v) => v <= 10));
  assert(Object.keys(y.cu.a).length <= E.craftRules(7).attr + E.craftRules(7).aff); assert(y.cu.sk.length <= 2 && !y.cu.sk.includes('x_deny')); assert(!y.cu.fx.x);
  assert.strictEqual(y.cu.fixed, 1); assert.strictEqual(y.up, 1, 'улучшение сохранено'); assert.strictEqual(y.id, it.id);
  const lo = JSON.parse(JSON.stringify(p)); const z = lo.slots[0].inv.find((q) => q.id === it.id); z.cu.mats = m3(2); const w = S.migrate(lo).slots[0].inv.find((q) => q.id === it.id); assert.strictEqual(w.r, 2, 'материалы подменены на редкие → вещь становится редкой');
  const clean = S.migrate(JSON.parse(JSON.stringify(p))).slots[0].inv.find((q) => q.id === it.id); assert.deepStrictEqual(clean.st, ok.st); assert(!clean.cu.fixed, 'честная вещь не помечается');
});
t('имя: без HTML/управляющих символов, до 28 знаков, пустое → имя основы', () => {
  assert.strictEqual(E.craftName('<img src=x onerror=alert(1)>Меч', 'sword').includes('<'), false);
  assert.strictEqual(E.craftName('a'.repeat(100), 'sword').length, 28); assert.strictEqual(E.craftName('   ', 'ring'), D.BASES.ring.n);
  assert.strictEqual(E.craftName('Клинок  "Рассвета"\n', 'sword'), 'Клинок Рассвета');
});
t('200 иконок, все группы основ; в выборе только своя группа и редкость ≤ вещи', () => {
  assert.strictEqual(D.CRAFT_ICONS.length, 200); const g = {}; D.CRAFT_ICONS.forEach((ic) => { g[ic.g] = (g[ic.g] || 0) + 1; assert(ic.r >= 0 && ic.r <= 7); });
  D.CRAFT_BASES.forEach((b) => { for (let r = 0; r <= 7; r++) { const l = E.craftIcons(b, r); assert(l.length >= 1, b + ' r' + r); assert(l.every((x) => x.r <= r && x.g === E.craftIconGroup(b))); } });
  const dir = path.join(__dirname, '../assets/craft/icons'); let tot = 0;
  D.CRAFT_ICONS.forEach((ic) => { assert(fs.existsSync(path.join(dir, ic.f)), ic.f); assert(fs.existsSync(path.join(dir, 't', ic.f)), 't/' + ic.f); tot += fs.statSync(path.join(dir, ic.f)).size + fs.statSync(path.join(dir, 't', ic.f)).size; });
  assert(tot < 12 * 1024 * 1024, 'всего ' + tot); assert(!fs.existsSync(path.join(__dirname, '../assets/craft/icons.webp')), 'старый атлас удалён');
});
t('своя PNG: только Божественный из 3 божественных материалов; формат и размер data URL проверяются; иначе — иконка из атласа', () => {
  assert(E.craftCanUpload(7, m3(7))); assert(!E.craftCanUpload(7, [MQ(7)[0], MQ(7)[0], MQ(6)[0]])); assert(!E.craftCanUpload(6, m3(7)));
  assert.deepStrictEqual(E.craftCheck(spec({ img: IMG, img2: IMG })).err, []);
  assert(E.craftCheck(spec({ mats: m3(6), ic: E.craftIcons('sword', 6)[0].id, img: IMG })).err.some((e) => /только Божественный/.test(e)));
  assert(E.craftCheck(spec({ img: 'data:image/svg+xml;base64,AAAA' })).err.some((e) => /картинка/.test(e)), 'svg — нет');
  assert(E.craftCheck(spec({ img: 'javascript:alert(1)' })).err.length);
  assert(E.craftCheck(spec({ img: 'data:image/png;base64,' + 'A'.repeat(D.CRAFT_IMG_MAX) })).err.some((e) => /картинка/.test(e)), 'слишком большая');
  const s = mk(); give(s, m3(7)); const it = E.craftCustom(s, spec({ img: IMG, img2: IMG })).item; assert.strictEqual(it.cu.img, IMG);
  const p = JSON.parse(JSON.stringify({ v: S.VERSION, slots: [s] })); const x = p.slots[0].inv.find((q) => q.id === it.id); x.cu.img = 'data:text/html;base64,PHNjcmlwdD4='; x.cu.img2 = undefined;
  const y = S.migrate(p).slots[0].inv.find((q) => q.id === it.id); assert(!y.cu.img, 'плохая картинка удалена → иконка атласа'); assert(Number.isInteger(y.cu.ic));
  const s2 = mk(); give(s2, [MQ(7)[0], MQ(7)[0], MQ(6)[0]]); assert(E.craftCustom(s2, spec({ mats: [MQ(7)[0], MQ(7)[0], MQ(6)[0]], ic: E.craftIcons('sword', 6)[0].id, img: IMG })).err);
});
t('подключение: index.html и sw.js содержат craft.js, ui-craft.js, атлас иконок и css', () => {
  const ix = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8'), sw = fs.readFileSync(path.join(__dirname, '../sw.js'), 'utf8');
  ['js/data-craft-icons.js', 'js/craft.js', 'js/ui-craft.js', 'css/craft.css'].forEach((f) => { assert(ix.includes(f), 'index: ' + f); assert(sw.includes("'" + f + "'"), 'sw: ' + f); });
  assert(!sw.includes("icons.webp'"), 'атласа нет'); assert(/assets\/craft\/icons\/t\//.test(sw), 'превью 128 в прекэше'); assert(/\\\/assets\\\/craft\\\/icons\\\//.test(sw), '512 — в кэше выполнения');
});
console.log('Ремесло творца: цены, смена профессий, HD-картинка');
t('цена создания: 120·2^r для 0…6, 35 840 для Божественного (×3 и ×7 от v2.15)', () => {
  assert.deepStrictEqual([0, 1, 2, 3, 4, 5, 6, 7].map(E.craftGold), [120, 240, 480, 960, 1920, 3840, 7680, 35840]);
  for (let r = 0; r < 7; r++) assert.strictEqual(E.craftGold(r), 3 * 40 * 2 ** r); assert.strictEqual(E.craftGold(7), 7 * 40 * 2 ** 7);
});
t('смена профессии: 50 000 🪙 за смену, основная и/или доп., прогресс старой хранится и возвращается', () => {
  const s = mk('smith', 'miner'); s.gold = 120000; s.profs.smith = { lv: 17, xp: 33 }; s.profs.miner = { lv: 9, xp: 5 };
  assert.strictEqual(E.profChange(s, 'sub', 'ench'), ''); assert.strictEqual(s.gold, 70000); assert.deepStrictEqual([s.hero.prof1, s.hero.prof2], ['smith', 'ench']);
  assert(E.craftUnlocked(s), 'Кузнец + Зачарователь → мастерская'); assert.deepStrictEqual(s.profs.miner, { lv: 9, xp: 5 }, 'шахтёр сохранён'); assert.deepStrictEqual(s.profs.ench, { lv: 1, xp: 0 });
  s.profs.ench.lv = 4; assert.strictEqual(E.profChange(s, 'sub', 'miner'), ''); assert.strictEqual(E.profLv(s, 'miner'), 9, 'вернулся с ур. 9'); assert.deepStrictEqual(s.profs.ench, { lv: 4, xp: 0 }, 'зачарователь сохранён');
  assert(/50000/.test(E.profChange(s, 'main', 'alch')), 'не хватает золота'); assert.deepStrictEqual([s.hero.prof1, s.hero.prof2], ['smith', 'miner']);
  s.gold = 50000; assert.strictEqual(E.profChange(s, 'main', 'miner'), '', 'доп. → основная = обмен'); assert.deepStrictEqual([s.hero.prof1, s.hero.prof2], ['miner', 'smith']); assert.strictEqual(s.gold, 0);
  assert.strictEqual(E.profLv(s, 'smith'), 10, 'ур. 17 ограничен потолком доп. профессии'); assert.strictEqual(s.profs.smith.lv, 17, 'сохранённый уровень не потерян');
  s.gold = 1e6; assert(E.profChange(s, 'main', 'miner')); assert(E.profChange(s, 'main', 'nope')); s.run = { x: 1 }; assert(/вылазк/.test(E.profChange(s, 'main', 'cook'))); assert.strictEqual(s.gold, 1e6);
});
t('HD-картинка: в сейве только ключ IndexedDB (ci_…) и превью 128; ключ проверяется; без права загрузки — отклоняется', () => {
  const K = 'ci_abc123def'; assert(E.craftKeyOk(K)); ['ci_', 'x_abcdefg', 'ci_ABC<>12', 123, null].forEach((k) => assert(!E.craftKeyOk(k)));
  assert.deepStrictEqual(E.craftCheck(spec({ img: IMG, imgKey: K })).err, []);
  assert(E.craftCheck(spec({ img: IMG, imgKey: 'bad key' })).err.length);
  const s = mk(); give(s, m3(7)); const it = E.craftCustom(s, spec({ img: IMG, imgKey: K })).item; assert.strictEqual(it.cu.imgKey, K);
  const p = JSON.parse(JSON.stringify({ v: S.VERSION, slots: [s] })); p.slots[0].inv.find((q) => q.id === it.id).cu.imgKey = '../../etc'; const y = S.migrate(p).slots[0].inv.find((q) => q.id === it.id); assert(!y.cu.imgKey && y.cu.fixed);
  assert(D.CRAFT_UP_MAX >= 15 * 1024 * 1024 && D.CRAFT_HD_PX === 1024);
});
console.log(`Ремесло творца: ${pass} ✓, ${fail} ✗`);
process.exit(fail ? 1 : 0);
