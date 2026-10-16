/* v2.19 «Питомцы»: лестница редкостей, состав, драконы, статы ≈ снаряжению, навыки/пассивы, звёзды/корм/узы, яйца и инкубатор, выпадение, миграция, почта. node test/pets.js */
const assert = require('assert');
const RPG = require('../js/data-core.js'); require('../js/data-stats.js');
['data-maou', 'data-maou2', 'data-prof', 'data-world', 'data-world2', 'data-crew', 'data-theme', 'data-story', 'data-story2', 'data-story3', 'data-romance', 'portrait', 'engine', 'stats', 'gear', 'combat', 'crew', 'save', 'artifact', 'dungeons-sp', 'pets', 'data-craft-icons', 'craft', 'mail'].forEach((f) => require('../js/' + f + '.js'));
const { D, E, C, S, M } = RPG;
let pass = 0, fail = 0; const t = (n, f) => { try { f(); pass++; } catch (e) { fail++; console.log('  ✗', n, '\n     ', e.message); } };
const mk = (L) => { const s = E.newSlot({ name: 'Пит', race: 'o_street', uniq: 'phoenix', prof1: 'smith', prof2: 'miner' }); s.hero.level = L || 50; s.story.flags.prologue_done = 1; return s; };
const N0 = 1e12;

t('9 редкостей с названиями и цветами; наполнены до Божественного, выше — пусто', () => {
  assert.deepStrictEqual(D.PET_RAR.map((r) => r.n), ['Обычный', 'Необычный', 'Редкий', 'Эпический', 'Легендарный', 'Божественный', 'Концептуальный', 'Исток', 'До существования']);
  D.PET_RAR.forEach((r, i) => { assert(/^#/.test(r.c) && r.g, r.id); assert.strictEqual(r.open, i <= 5); assert.strictEqual(E.petsOf(i).length > 0, i <= 5, r.id); });
});
t('состав: по 8 питомцев на редкость 0…5 (48), ≥4 дракона среди Легендарных и ≥3 разных стихий среди Божественных, божественный дракон-заглушка, драконы только Легендарные+', () => {
  for (let r = 0; r <= 5; r++) assert.strictEqual(E.petsOf(r).length, 8, 'r' + r); assert.strictEqual(D.PETS.length, 48); assert.strictEqual(new Set(D.PET_IDS).size, 48);
  assert(E.petsOf(4).filter((p) => p.dragon).length >= 4); { const dv = E.petsOf(5).filter((p) => p.dragon); assert(dv.length >= 3 && new Set(dv.map((p) => p.el)).size === dv.length); } for (let r = 0; r < 4; r++) assert(!E.petsOf(r).some((p) => p.dragon));
  ['stray_cat','field_dog','jelly_slime','red_fox','river_otter','night_owl','storm_hawk','frost_wolf','crystal_slime','ember_dragon','glacier_dragon','phoenix_fledgling','nimbus_kitsune','astral_kirin','uncommon_a','uncommon_b','uncommon_c','divine_dragon'].forEach((id) => assert(D.PET[id], id));
  { const roles = new Set(D.PETS.map((p) => p.foc)); assert(roles.size === 4); assert(new Set(D.PETS.map((p) => p.el)).size >= 9); } assert(D.PET.divine_dragon && D.PET.divine_dragon.dragon && D.PETS.every((p) => !p.ph));
  const fs = require('fs'), path = require('path'); ['uncommon_a', 'uncommon_b', 'uncommon_c', 'divine_dragon'].forEach((id) => { assert.strictEqual(D.PET[id].r, id === 'divine_dragon' ? 5 : 1); ['assets/pets/' + id + '.webp', 'assets/pets/t/' + id + '.webp'].forEach((f) => assert(fs.existsSync(path.join(__dirname, '..', f)), f)); });
  D.PETS.forEach((p) => { if (p.dragon || /дракон/i.test(p.n)) assert(p.r >= 4, p.id); assert(p.n && p.lore && p.pas.length && p.sk.length && D.ELEMS[p.el], p.id); assert.strictEqual(p.art, 'assets/pets/' + p.id + '.webp'); assert.strictEqual(p.thumb, 'assets/pets/t/' + p.id + '.webp'); p.sk.forEach((k) => assert(D.SKILLS[k] && D.SKILLS[k].fx.length)); });
  assert(D.PET.divine_dragon.r === 5 && /дракон/i.test(D.PET.divine_dragon.n));
});
t('перки растут с редкостью: больше навыков/пассивов у старших', () => {
  const avg = (r, f) => E.petsOf(r).reduce((a, p) => a + f(p), 0) / E.petsOf(r).length; assert(avg(5, (p) => p.sk.length) > avg(0, (p) => p.sk.length)); assert(avg(5, (p) => p.pas.length) > avg(0, (p) => p.pas.length));
});
t('статы ≈ снаряжению той же редкости (ур. питомца → уровень вещи) и растут с редкостью, уровнем, звёздами, узами', () => {
  const sw = (il, r) => E.genItem(E.rng(7), { base: 'sword', il, rarity: r }).st.atk;
  assert(Math.abs(E.petStats('storm_hawk', 50, 0, 0).atk - sw(100, 4)) / sw(100, 4) < 0.05); assert(Math.abs(E.petStats('stray_cat', 50, 0, 0).atk - sw(100, 0)) / sw(100, 0) < 0.05);
  const m = (id) => { const s = E.petStats(id, 50, 0, 0); return Math.max(s.atk || 0, s.mag || 0, s.def || 0); }; assert(m('stray_cat') < m('night_owl') && m('night_owl') < m('storm_hawk') && m('storm_hawk') < m('ember_dragon') && m('ember_dragon') < m('nimbus_kitsune'));
  assert(E.petStats('stray_cat', 50, 0, 0).atk > E.petStats('stray_cat', 1, 0, 0).atk * 5); assert(E.petStats('stray_cat', 10, 5, 0).atk > E.petStats('stray_cat', 10, 0, 0).atk); assert(E.petStats('stray_cat', 10, 0, 5).atk > E.petStats('stray_cat', 10, 0, 0).atk);
});
t('экипировка добавляет статы и навыки героя (по уровню), нельзя во время вылазки', () => {
  const s = mk(50); E.petGain(s, 'ember_dragon'); const a0 = E.derive(s).atk || 0; assert.strictEqual(E.petEquip(s, 'ember_dragon'), ''); assert(E.petSkills(s).length === 1);
  const d = E.derive(s); assert(d.atk > a0, 'atk'); const u = C.unitFromSlot(s); assert(u.sk.includes('pk_ember_dragon_1')); assert(!u.sk.includes('pk_ember_dragon_2'));
  s.pets.ember_dragon.lv = 20; assert(E.petSkills(s).length === 2); E.petEquip(s, null); assert(E.derive(s).atk === a0);
  s.run = {}; assert(E.petEquip(s, 'ember_dragon')); assert(E.petEquip(mk(), 'stray_cat'));
});
t('пассивы открываются узами; звёзды за дубликаты, на максимуме — корм; Божественного нет в сохранении без находки', () => {
  const s = mk(); assert(E.petGain(s, 'red_fox').isNew); for (let i = 1; i <= 5; i++) assert.strictEqual(E.petGain(s, 'red_fox').star, i); const c = E.petGain(s, 'red_fox'); assert(c.conv && s.petFood === 30);
  assert.strictEqual(E.petPasUnlocked(D.PET.red_fox, 0).length, 1); assert.strictEqual(E.petPasUnlocked(D.PET.red_fox, 1).length, 2); assert(!s.pets.divine_dragon);
});
t('корм: уровни, предел = уровень героя, узы растут; золото за корм', () => {
  const s = mk(5); E.petGain(s, 'stray_cat'); s.petFood = 200; const r = E.petFeed(s, 'stray_cat', 100); assert(r.up >= 1 && s.pets.stray_cat.lv <= 5 && s.pets.stray_cat.bxp === r.used); assert(E.petFeed(s, 'stray_cat', 1).err);
  const s2 = mk(); s2.gold = 1000; assert.strictEqual(E.foodBuy(s2, 5), ''); assert.strictEqual(s2.petFood, 5); assert.strictEqual(s2.gold, 1000 - 5 * D.PET_FOOD_PRICE); assert(E.foodBuy(s2, 1000));
  assert.strictEqual(E.petBondLv(0), 0); assert.strictEqual(E.petBondLv(D.PET_BOND_AT[3]), 3);
});
t('инкубатор: яйцо → таймер → питомец той же редкости; ускорение за золото; одно яйцо за раз; лавка только Обычное…Редкое', () => {
  const s = mk(); s.gold = 1e6; assert(E.eggBuy(s, 4)); assert(E.eggBuy(s, 5)); assert.strictEqual(E.eggBuy(s, 1), ''); assert.strictEqual(s.eggs[1], 1);
  assert.strictEqual(E.hatchStart(s, 1, N0), ''); assert(E.hatchStart(s, 1, N0)); assert(E.hatchClaim(s, N0 + 1000).err); assert(E.hatchRush(s, N0) > 0);
  const r = E.hatchClaim(s, N0 + D.EGG_MIN[1] * 60000); assert(r.isNew && D.PET[r.id].r === 1 && !s.hatch);
  E.eggAdd(s, 0, 1); E.hatchStart(s, 0, N0); const g0 = s.gold; assert.strictEqual(E.hatchSpeedUp(s, N0), ''); assert(s.gold < g0); assert(!E.hatchClaim(s, N0).err);
  assert(!E.eggAdd(s, 6, 1), 'яйца Концептуального пока нет');
});
t('выпадение яиц: потолок редкости по подземелью; Божественные — только поздние этапы Артефактов/Материалов; шанс/распределение', () => {
  const dun = (id) => D.DUN[id];
  assert.strictEqual(E.eggCeil(dun('mill')), 0); assert(E.eggCeil(dun('wood')) === 0 && E.eggCeil(dun('nowhere')) >= 3 && E.eggCeil(dun('nowhere')) <= 4);
  for (const d of D.DUNGEONS.filter((x) => !x.hidden)) assert(E.eggCeil(d) <= 4, d.id);
  assert.strictEqual(E.eggCeil(dun('artd8')), 4); assert.strictEqual(E.eggCeil(dun('artd9')), 5); assert.strictEqual(E.eggCeil(dun('artd10')), 5); assert.strictEqual(E.eggCeil(dun('matd9')), 5); assert(E.eggCeil(dun('matd3')) < 5 && E.eggCeil(dun('gold10')) <= 4);
  const cnt = [0, 0, 0, 0, 0, 0]; let got = 0; for (let i = 0; i < 4000; i++) { const r = E.rollEgg(dun('artd10'), E.rng(i + 1)); if (r >= 0) { got++; cnt[r]++; assert(r <= 5); } }
  assert(got > 700 && got < 1600, 'шанс ' + got); assert(cnt[5] > 0 && cnt[5] < cnt[4], JSON.stringify(cnt)); for (let i = 0; i < 2000; i++) assert(E.rollEgg(dun('mines'), E.rng(i)) <= 0);
});
t('победа над боссом: корм всегда, яйцо по шансу, узы питомца; в сумке/сохранении', () => {
  let eggs = 0, bond = 0; for (let k = 0; k < 60; k++) { const sl = mk(100); E.petGain(sl, 'stray_cat'); E.petEquip(sl, 'stray_cat'); sl.stats.runs = k; sl.prog.cleared = {}; for (let i = 1; i <= 9; i++) sl.prog.cleared['artd' + i] = 1;
    assert(!E.startRun(sl, 'artd10', 0)); sl.run.node = sl.run.nodes.findIndex((n) => n.t === 'boss'); const B = C.startNodeBattle(sl); B.foes.forEach((f) => { f.alive = false; f.hp = 0; }); B.over = 'win'; const rep = C.finishBattle(sl, B);
    assert(rep.pet && rep.pet.food >= 1 && sl.petFood >= rep.pet.food); if (rep.pet.egg != null) eggs++; if (rep.pet.bond) bond++; assert.strictEqual(sl.pets.stray_cat.bxp, rep.pet.bond); }
  assert(eggs >= 5 && eggs < 45, 'яиц ' + eggs); assert.strictEqual(bond, 60);
});
t('миграция v7 → v8: старые слоты получают поля питомцев; новые слоты их имеют; версия сохранения 8', () => {
  assert.strictEqual(S.VERSION, 8); const p = S.newProfile('М', '🦉'); p.slots[0] = mk(); const old = JSON.parse(JSON.stringify(p)); old.v = 7; const sl = old.slots[0]; delete sl.pets; delete sl.petEq; delete sl.petFood; delete sl.eggs; delete sl.hatch; delete sl.petProg; sl.gold = 777;
  const m = S.migrate(old); assert.strictEqual(m.v, 8); const s = m.slots[0]; assert(s.pets && s.petEq === null && s.petFood === 0 && s.eggs && s.hatch === null && s.petProg && s.gold === 777 && S.validate(m));
  const g = mk(); E.petGain(g, 'frost_wolf'); E.petEquip(g, 'frost_wolf'); const bad = JSON.parse(JSON.stringify(g)); bad.pets.ghost = { lv: 3 }; bad.petEq = 'ghost'; E.petEnsure(bad); assert(!bad.pets.ghost && bad.petEq === null);
});
t('почта: подарок-питомец (проверка id, показ, выдача: новый → +звезда), tools/mail.js --pet', () => {
  assert.deepStrictEqual(M.giftErrors({ pets: ['stray_cat'] }), []); assert.strictEqual(M.giftErrors({ pets: ['nope'] }).length, 1); assert(M.hasGifts({ pets: ['stray_cat'] }));
  const gl = M.giftList({ pets: ['stray_cat'] })[0]; assert.strictEqual(gl.n, 'Уличная кошка'); assert(/Питомец/.test(gl.r) && /stray_cat/.test(gl.img));
  const s = mk(); let g = M.apply(s, { pets: ['stray_cat'] }, 'p1'); assert(g.pets[0].isNew && s.pets.stray_cat); g = M.apply(s, { pets: ['stray_cat'] }, 'p2'); assert.strictEqual(s.pets.stray_cat.star, 1);
  const fs = require('fs'), path = require('path'), os = require('os'), { execFileSync } = require('child_process'); const f = path.join(os.tmpdir(), 'inbox-p-' + process.pid + '.json'); fs.writeFileSync(f, '{"letters":[]}');
  const run = (a) => execFileSync('node', [path.join(__dirname, '../tools/mail.js')].concat(a), { env: Object.assign({}, process.env, { MAIL_FILE: f }), encoding: 'utf8', stdio: 'pipe' });
  run(['add', '--title', 'П', '--pet', 'stray_cat', '--id', 'pet-x', '--to', 'nm-ab2cd3']); assert.deepStrictEqual(JSON.parse(fs.readFileSync(f, 'utf8')).letters[0].gifts, { pets: ['stray_cat'] }); assert.throws(() => run(['add', '--title', 'x', '--pet', 'nope'])); fs.unlinkSync(f);
});
t('баланс расширенного состава: средняя сила растёт с редкостью; все ключи пассивов известны игре; у новых питомцев нет арта — только путь assets/pets/<id>.webp', () => {
  const tot = (id) => { const x = E.petStats(id, 50, 0, 0); return (x.atk || 0) + (x.mag || 0) + (x.def || 0); }, mean = (r) => E.petsOf(r).reduce((a, p) => a + tot(p.id), 0) / E.petsOf(r).length;
  for (let r = 1; r <= 5; r++) assert(mean(r) > mean(r - 1), 'r' + r);
  D.PETS.forEach((p) => { p.pas.forEach((x) => Object.keys(x.m).forEach((k) => assert(D.GEAR_LBL[k] || D.MODN[k] || D.STAT_N[k], p.id + ':' + k))); assert(p.pas.length >= (p.r >= 5 ? 3 : p.r === 0 ? 1 : 2) || p.r === 4 || p.r === 1 || p.r === 3, p.id); assert(/^assets\/pets\/[a-z_]+\.webp$/.test(p.art)); });
});
console.log(`\nПитомцы: ${pass} ✓, ${fail} ✗`); if (fail) process.exit(1);
