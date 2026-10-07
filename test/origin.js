/* Тесты клинков редкости «Исток» v2.13 (три клинка + пять общих свойств редкости + стирание). Запуск: npm test */
const fs = require('fs'), path = require('path'), assert = require('assert');
const RPG = require('../js/data-core.js');
['data-stats', 'data-maou', 'data-maou2', 'data-prof', 'data-world', 'data-world2', 'data-crew', 'data-theme', 'data-story', 'data-story2', 'data-story3', 'data-romance', 'portrait', 'engine', 'stats', 'gear', 'combat', 'crew', 'save', 'mail'].forEach((f) => require('../js/' + f + '.js'));
const { D, E, C, M } = RPG;
let pass = 0, fail = 0; const failed = [];
const t = (name, fn) => { try { fn(); pass++; } catch (e) { fail++; failed.push(name + ': ' + e.message); console.log('  ✗', name, '\n     ', e.message); } };
const mk = () => E.newSlot({ name: 'Тест', race: 'o_street', uniq: 'phoenix', prof1: 'smith', prof2: 'miner', cls: 'warrior' });
const np = (B, only) => { for (let i = 0; i < 400; i++) { const u = C.next(B); if (u && (!only || u === only)) return u; if (B.over) return null; if (u && only) C.act(B, u, { t: 'guard' }); } throw new Error('нет хода игрока'); };
const OX = ['prime_cause', 'zero_law', 'first_division'];
const SK = { prime_cause: 'x_prime', zero_law: 'x_zero', first_division: 'x_division' };
const slotWith = (id) => { const s = mk(); s.hero.level = 55; const it = E.addItem(s, E.makeUnique(id)); assert.strictEqual(E.equip(s, it.id), ''); return { s, it }; };
// бой 1×1 против нейтрального врага; o.boss — роль босса (ур. 20 — без лимита урона за удар)
const bat = (id, o) => {
  o = o || {}; const { s } = slotWith(id); const P = C.unitFromSlot(s); const e = C.unitFromEnemy(o.eid || 'slime', 40, 0, false, 'e0');
  e.weak = []; e.resist = []; e.el = null; e.eva = 0; e.spd = 0.01; if (o.boss) e.role = 'boss'; e.lv = o.boss ? 20 : e.lv; e.sub = { statRes: 0, resEl: {} };
  const B = C.create([P], [e], E.rng(o.seed || 5), {}); P.gauge = 99.9; e.gauge = 0; P.mods.hpRegen = 0; P.st = []; P.eva = 0; e.hp = e.maxHp = o.ehp || 1e7; return { B, P, e, s };
};
const fixR = (B, v) => { const w = B.rng.weighted; B.rng = () => v; B.rng.weighted = w; };
const stOf = (u, id) => u.st.find((x) => x.id === id);
const skill = (B, P, id) => { np(B, P); P.mp = P.maxMp = 999; assert.strictEqual(C.canUse(B, P, id), ''); C.act(B, P, { t: 'skill', id, tid: 'e0' }); };
// юнит без Истока (враг/герой с концептуальным мечом) для перекрёстных проверок
const plain = (side, id) => { const u = C.unitFromEnemy('slime', 40, 0, false, id || (side === 'a' ? 'q' : 'e9')); u.side = side; u.mods = {}; u.weak = []; u.resist = []; u.el = null; u.eva = 0; u.hp = u.maxHp = 1e6; u.def = 0; u.sub = { statRes: 0, resEl: {} }; return u; };

console.log('Исток: данные, недоступность, почта');
const SPEC = { prime_cause: ['Клинок Первопричины', 1650, 24, 4], zero_law: ['Клинок Нулевого Закона', 1580, 26, 5], first_division: ['Клинок Первого Разделения', 1780, 28, 5] };
OX.forEach((id) => t(`${id}: Исток (r 9), ур. 55, +0/13 у кузнеца, замок, навык ${SPEC[id][2]} маны / ${SPEC[id][3]} хода, арт и SW`, () => {
  const it = E.makeUnique(id), U = D.UNIQUE_ITEMS[id]; assert.strictEqual(it.r, 9); assert.strictEqual(it.il, 55); assert.strictEqual(it.nm, SPEC[id][0]); assert.strictEqual(it.st.atk, SPEC[id][1]); assert(it.lock && it.uq === id && it.sl === 'weapon');
  assert.strictEqual(D.RARITY[9].n, 'Исток'); const { s } = slotWith(id); assert.strictEqual(E.upCap(s, it), 13); assert(U.sp.length === 3 && U.cx.length >= 3 && U.lore && U.sub);
  const sk = D.SKILLS[SK[id]]; assert.strictEqual(sk.mp, SPEC[id][2]); assert.strictEqual(sk.cd, SPEC[id][3]); assert(sk.origin && !sk.concept && sk.img);
  ['128', '256', 'art'].forEach((k) => { const f = path.join(__dirname, '../assets/gear/' + id + '_' + k + '.webp'); assert(fs.existsSync(f), f); assert(fs.readFileSync(path.join(__dirname, '../sw.js'), 'utf8').includes("'assets/gear/" + id + '_' + k + ".webp'")); });
}));
t('Исток и выше не выпадают, не продаются, не куются, не генерируются; makeUnique — только почта', () => {
  const rng = E.rng(13); for (let i = 0; i < 20000; i++) assert(E.rollRarity(rng, 60, 0, 99, { boss: true }) <= 7);
  for (let i = 0; i < 1000; i++) { const it = E.genItem(rng, { base: 'sword', il: 60, rarity: 9 }); assert(it.r <= 7 && !it.uq); }
  const s = mk(); for (let k = 0; k < 6; k++) { s.shopSeed = k; E.shopStock(s).forEach((it) => assert(!it.uq && it.r <= 7)); }
  const src = ['engine', 'gear', 'combat', 'crew', 'stats'].map((f) => fs.readFileSync(path.join(__dirname, '../js/' + f + '.js'), 'utf8')).join('\n'); assert.strictEqual((src.match(/makeUnique\(/g) || []).length, 0);
  OX.forEach((id) => { const { s: s2, it } = slotWith(id); E.unequip(s2, 'weapon'); const g0 = s2.gold; assert.strictEqual(E.sell(s2, it.id), 0); assert.strictEqual(s2.gold, g0); assert(s2.inv.includes(it)); });
  assert.strictEqual(M.giftErrors({ gear: [{ base: 'sword', rarity: 9 }] }).length, 1, '--gear sword:9 запрещён');
});
t('почта: {unique} выдаёт каждый клинок Истока один раз; tools/mail.js ids и docs/MAIL.md знают все 3 id', () => {
  OX.forEach((id) => { assert.deepStrictEqual(M.giftErrors({ unique: id }), []); const s = mk(); M.deliver(s, M.parseFeed({ letters: [{ id: 'o-' + id, title: 'Дар', body: 'x', from: 'Администрация', gifts: { unique: id } }] }).letters, Date.parse('2026-10-06'));
    assert(M.claim(s, 'o-' + id, Date.parse('2026-10-06')).ok); assert.strictEqual(s.inv.filter((x) => x.uq === id).length, 1); assert(!M.claim(s, 'o-' + id, Date.parse('2026-10-06')).ok); assert.strictEqual(s.inv.filter((x) => x.uq).length, 1); });
  assert.deepStrictEqual(M.giftErrors({ unique: OX }), []);
  const out = require('child_process').execFileSync('node', [path.join(__dirname, '../tools/mail.js'), 'ids'], { encoding: 'utf8' }); const help = require('child_process').execFileSync('node', [path.join(__dirname, '../tools/mail.js'), 'help'], { encoding: 'utf8' }); const doc = fs.readFileSync(path.join(__dirname, '../docs/MAIL.md'), 'utf8');
  OX.forEach((id) => { assert(out.includes(id), id); assert(help.includes(id), 'help ' + id); assert(doc.includes('`' + id + '`'), 'doc ' + id); });
});
t('общие свойства: mods.origin только пока надета вещь r ≥ 9 (герой и Свита); 5 свойств описаны, статусы с иконками', () => {
  const { s } = slotWith('zero_law'); assert.strictEqual(E.derive(s).mods.origin, 1); E.unequip(s, 'weapon'); assert(!E.derive(s).mods.origin);
  const { s: s3 } = slotWith('prime_cause'); assert(C.unitFromSlot(s3).mods.origin);
  const s2 = mk(); const it = E.addItem(s2, E.makeUnique('end_of_all')); E.equip(s2, it.id); assert(!E.derive(s2).mods.origin, 'Концептуальный не даёт Истока');
  const cid = Object.keys(D.CREW)[0]; s.crew = s.crew || {}; s.crew[cid] = { lv: 50, loy: 60, eq: { weapon: E.makeUnique('first_division') } }; assert(C.unitFromCrew(s, cid).mods.origin, 'Свита');
  assert.deepStrictEqual(D.ORIGIN_COMMON.map((x) => x.n), ['Отрицание бессмертия', 'Иммунитет к концепциям', 'Приоритет Истока', 'Стирание Истоком', 'Общий приоритет']);
  ['causeMark', 'conseq', 'preConseq', 'lawless', 'split', 'severed', 'erasedSt'].forEach((id) => { const d = D.ST[id]; assert(d && d.n && d.ic && d.d, id); });
  assert.strictEqual(D.ST.causeMark.n, 'Причинная Метка'); assert.strictEqual(D.ST.lawless.n, 'Без Закона'); assert.strictEqual(D.ST.split.n, 'Расщепление'); assert.strictEqual(D.ST.severed.n, 'Разрыв Связи'); assert.strictEqual(D.ST.erasedSt.n, 'Стёрт из существования'); assert.strictEqual(D.ST.preConseq.n, 'Предопределённое Следствие'); assert.strictEqual(D.ST.conseq.n, 'Следствие');
  assert(D.ELEMS.div && !D.ELEM_IDS.includes('div'), 'Разделяющий урон — не стихия'); assert.strictEqual(D.GEAR_LBL.allRes, 'Сопротивление всему урону');
});

console.log('Общие свойства Истока');
t('Отрицание бессмертия: урон Истока убивает сквозь воскрешение, Вторую жизнь, Отрицание смерти (Сердце Преисподней), откат Хроноса, Бессмертие, стирание ударов и неуязвимость; обычный урон — нет', () => {
  const guards = [{ reviveOnce: 1 }, { reviveFull: 1 }, { secondLife: 1 }, { hellDeny: 35 }, { chronoRewind: 30 }, { erase: 3 }, { dmgImm: 100 }, 'immortal'];
  guards.forEach((g) => {
    const { B, P } = bat('prime_cause'); const x = plain('e', 'e5'); B.foes.push(x); B.units.push(x); if (g === 'immortal') C.addSt(B, x, x, 'immortal', 2); else Object.assign(x.mods, g);
    C._hurt(B, x, x.hp + 10, 'phys', P); assert(!x.alive, 'Исток убивает: ' + JSON.stringify(g));
    const { B: B2 } = bat('end_of_all'); const P2 = B2.party[0]; const y = plain('e', 'e6'); B2.foes.push(y); B2.units.push(y); if (g === 'immortal') C.addSt(B2, y, y, 'immortal', 2); else Object.assign(y.mods, g);
    C._hurt(B2, y, y.hp + 10, 'phys', P2); assert(y.alive, 'Концептуальный не пробивает: ' + JSON.stringify(g));
  });
});
t('Отрицание бессмертия (функционально): владелец Сердца Преисподней / Хроноса погибает от урона Истока', () => {
  ['hell_heart', 'chronos'].forEach((cid) => {
    const { s } = slotWith(cid); const H = C.unitFromSlot(s); const { s: so } = slotWith('first_division'); const O = C.unitFromSlot(so); O.side = 'e'; O.id = 'e0';
    const B = C.create([H], [O], E.rng(3), {}); H.hp = 100; C._hurt(B, H, 5000, 'phys', O); assert(!H.alive, cid + ' погиб от урона Истока');
    const B2 = C.create([C.unitFromSlot(s)], [C.unitFromEnemy('slime', 40, 0, false, 'e0')], E.rng(3), {}); const H2 = B2.party[0]; H2.hp = 100; C._hurt(B2, H2, 5000, 'phys', B2.foes[0]); assert(H2.alive, cid + ': обычный урон — защита от смерти работает');
  });
});
t('Иммунитет к концепциям: концептуальный урон по владельцу Истока теряет тег и проходит через броню; без Истока — мимо брони', () => {
  const { s } = slotWith('zero_law'); const O = C.unitFromSlot(s); O.def = 400; O.hp = O.maxHp = 1e7; O.mods.taken = 0; const A = plain('e', 'e0'); const B = C.create([O], [A], E.rng(2), {});
  const K = 50 + 4 * O.lv; C._cHurt(B, A, O, 10000, 'arcane'); const got = 1e7 - O.hp; assert.strictEqual(got, Math.round(10000 * K / (K + 400)));
  assert(B.ev.some((e) => e.t === 'dmg' && e.u === O.id && e.concept === 0)); assert(B.ev.some((e) => e.t === 'txt' && e.s === 'Иммунитет к концепциям'));
  const N = plain('a', 'q'); N.def = 400; const B2 = C.create([N], [plain('e', 'e0')], E.rng(2), {}); C._cHurt(B2, B2.foes[0], N, 10000, 'arcane'); assert.strictEqual(1e6 - N.hp, 10000);
});
t('Приоритет Истока: Распад, Тепловая смерть, Горение, Первичное Горение, Застывшее время, «Закон необратимости» от предметов ниже Истока не действуют; урон проходит; навыки монстров работают', () => {
  const { s } = slotWith('prime_cause'); const O = C.unitFromSlot(s); O.hp = O.maxHp = 1e6; O.mods.pcFirst = 0; O.mods.pcFix = 0;
  const { s: se } = slotWith('end_of_all'); const En = C.unitFromSlot(se); En.side = 'e'; En.id = 'e0'; const B = C.create([O], [En], E.rng(4), {});
  const h0 = O.hp; C._hurt(B, O, 5000, 'arcane', En); assert.strictEqual(h0 - O.hp, 5000 - 0, 'урон Энтропии прошёл'); assert(!stOf(O, 'decay'), 'Распад не наложен');
  C._addDecay(B, En, O, 6); assert(!stOf(O, 'decay') && !stOf(O, 'heatDeath'));
  ['fburn', 'primal', 'chronoStop', 'heatDeath'].forEach((id) => { C.addSt(B, En, O, id, 3, 100); assert(!stOf(O, id), id); });
  const m0 = O.maxHp; O.hp = 1; C._heal(B, O, O, 5000); assert.strictEqual(O.maxHp, m0, 'нет необратимой потери макс. HP');
  C.addSt(B, En, O, 'poison', 3, 100); assert(stOf(O, 'poison'), 'обычный яд (навык монстра) работает');
  const N = plain('a', 'q'); const B2 = C.create([N], [En], E.rng(4), {}); C._hurt(B2, N, 100, 'arcane', En); assert(stOf(N, 'decay'), 'без Истока Распад есть');
});
t('Стирание Истоком: убийство уроном Истока → «Стёрт из существования»; обычное убийство и призванные — нет; стёртого нельзя воскресить', () => {
  const { B, P, e } = bat('zero_law', { ehp: 100 }); C._hurt(B, e, 1000, 'phys', P); assert(!e.alive && e.gone && stOf(e, 'erasedSt')); assert.deepStrictEqual(B.erasedNow, ['e0']);
  const { B: B2, e: e2 } = bat('end_of_all', { ehp: 100 }); C._hurt(B2, e2, 1000, 'phys', B2.party[0]); assert(!e2.alive && !e2.gone && !B2.erasedNow);
  const { B: B3, P: P3 } = bat('zero_law'); const sm = plain('e', 'e7s'); sm.summoned = true; B3.foes.push(sm); B3.units.push(sm); C._hurt(B3, sm, 1e9, 'phys', P3); assert(!sm.alive && !(B3.erasedNow || []).length);
});

console.log('Стирание: таймер, автоочистка, сюжет');
const DID = Object.keys(D.DUN).find((k) => { const d = D.DUN[k]; return !D.ENEMIES[d.boss].duel && !D.ENEMIES[d.mini].duel; });
const runSlot = (id) => { const { s } = slotWith(id || 'first_division'); s.prog.cleared[DID] = 1; s.prog.boss[DID] = true; s.story.flags.prologue_done = 1; s.run = E.genRun(s, DID, 0, 777); s.run.hp = 1e5; s.run.mp = 999; s.run.comp = {}; return s; };
let NOW = 1e12; E.now = () => NOW;
t('стёртый экземпляр сохраняется с реальным временем и 10 минут не появляется (подделанные часы); потом возвращается', () => {
  const s = runSlot(); const node = s.run.nodes[0]; assert(node.e.length >= 2);
  const B = C.startNodeBattle(s); assert.strictEqual(B.foes.length, node.e.length); B.foes[0].hp = 1; C._hurt(B, B.foes[0], 10, 'phys', B.party[0]); B.over = 'flee';
  C.finishBattle(s, B); assert.strictEqual(s.erased.length, 1); assert.deepStrictEqual([s.erased[0].k, s.erased[0].i, s.erased[0].until - s.erased[0].at], [DID + '|0|0', 0, 600000]);
  const s2 = JSON.parse(JSON.stringify(s)); const B2 = C.startNodeBattle(s2); assert.strictEqual(B2.foes.length, node.e.length - 1, 'после сохранения/загрузки стёртый не появился'); assert(!B2.foes.some((f) => f.id === 'e0'));
  NOW += 9 * 60 * 1000; assert.strictEqual(C.startNodeBattle(s2).foes.length, node.e.length - 1, 'через 9 минут ещё стёрт'); assert.strictEqual(C.fmtLeft(C.eraseLeft(s2.erased[0])), '01:00');
  NOW += 61 * 1000; assert.strictEqual(C.startNodeBattle(s2).foes.length, node.e.length, 'через 10 минут вернулся'); assert.strictEqual(C.erasedList(s2).length, 0);
  const s3 = runSlot(); s3.run.tier = 1; assert.strictEqual(C.erasedAt(s3, s3.run, 0).length, 0, 'другая сложность — другой этап');
});
t('все враги этапа стёрты → этап очищается сам без опыта, золота и добычи; обычный узел — просто проходится', () => {
  const s = runSlot(); const n0 = s.run.nodes[0]; s.erased = n0.e.map((eid, i) => ({ k: DID + '|0|0', i, eid, at: NOW, until: NOW + 600000 }));
  const xp = s.hero.xp, gold = s.gold, bag = JSON.stringify(s.run.bag), kills = s.stats.kills;
  const r = C.autoClear(s); assert(r && r.auto && !r.bossDown && r.xp === 0 && r.gold === 0 && !r.items.length); assert.strictEqual(s.run.node, 1);
  assert.strictEqual(s.hero.xp, xp); assert.strictEqual(s.gold, gold); assert.strictEqual(JSON.stringify(s.run.bag), bag); assert.strictEqual(s.stats.kills, kills);
  assert.strictEqual(C.autoClear(s), null, 'следующий узел не стёрт — бой как обычно');
});
t('стёртый босс: прогресс засчитан, но без повторной добычи, искры Нимба и счётчика побед', () => {
  const s = runSlot(); const bi = s.run.nodes.findIndex((n) => n.t === 'boss'); s.run.node = bi; s.erased = [{ k: DID + '|0|' + bi, i: 0, eid: D.DUN[DID].boss, at: NOW, until: NOW + 600000 }];
  s.prog.cleared[DID] = 0; delete s.prog.boss[DID]; const pts = s.hero.bossPts || 0, wins = s.stats.wins, bag = JSON.stringify(s.run.bag);
  const r = C.autoClear(s); assert(r && r.bossDown); assert.strictEqual(s.prog.cleared[DID], 1); assert(s.prog.boss[DID]); assert.strictEqual(s.hero.bossPts || 0, pts); assert.strictEqual(s.stats.wins, wins); assert.strictEqual(JSON.stringify(s.run.bag), bag);
  const res = E.claimRun(s, 'win'); assert.strictEqual(res.gold, 0); assert.strictEqual(res.items.length, 0);
});
t('сюжетные бои не стираются: дуэли с героинями и сюжетные боссы (duel) остаются; бой с ними создаётся полностью', () => {
  const duels = Object.keys(D.ENEMIES).filter((k) => D.ENEMIES[k].duel); assert(duels.length >= 3);
  duels.forEach((eid) => assert(!C.erasable({ t: D.ENEMIES[eid].role === 'boss' ? 'boss' : 'mini', e: [eid] }), eid));
  const did = Object.keys(D.DUN).find((k) => D.ENEMIES[D.DUN[k].mini].duel); const { s } = slotWith('first_division'); s.run = E.genRun(s, did, 0, 5); s.run.hp = 1e5; s.run.mp = 999; s.run.comp = {};
  const mi = s.run.nodes.findIndex((n) => n.t === 'mini'); s.run.node = mi; const B = C.startNodeBattle(s); B.foes[0].hp = 1; C._hurt(B, B.foes[0], 10, 'phys', B.party[0]); B.over = 'win'; C.finishBattle(s, B);
  assert.strictEqual((s.erased || []).length, 0, 'дуэль не записана'); s.run.node = mi; assert.strictEqual(C.autoClear(s), null); assert.strictEqual(C.startNodeBattle(s).foes.length, 1);
  assert(!C.erasable({ t: 'ev', ev: 'rest' }), 'события не стираются');
});

console.log('Клинок Первопричины');
t('Причинная Метка: +1 уровень за удар (макс. 4), −6% защиты/−4% урона/−5% лечения за уровень; на 4 — Следствие 20% макс. HP (боссы 8%) и сброс', () => {
  const { B, P, e } = bat('prime_cause'); for (let i = 0; i < 4; i++) C._oHurt(B, P, e, 10, 'origin'); const m = stOf(e, 'causeMark'); assert.strictEqual(m.pow, 4);
  const h0 = e.hp; C._oHurt(B, P, e, 10, 'origin'); assert(!stOf(e, 'causeMark'), 'сброс'); assert(stOf(e, 'conseq')); assert.strictEqual(h0 - e.hp, 10 + Math.round(P.maxHp * 0.2));
  const { B: B2, P: P2, e: e2 } = bat('prime_cause', { boss: true }); for (let i = 0; i < 4; i++) C._oHurt(B2, P2, e2, 10, 'origin'); const h2 = e2.hp; C._oHurt(B2, P2, e2, 10, 'origin'); assert.strictEqual(h2 - e2.hp, 10 + Math.round(P2.maxHp * 0.08));
  const { B: B3, P: P3, e: e3 } = bat('prime_cause'); e3.st.push({ id: 'causeMark', dur: 99, pow: 4, src: 'p' }); e3.hp = 1; C._heal(B3, e3, e3, 1000); assert.strictEqual(e3.hp, 1 + Math.round(1000 * 0.8)); P3.mods.pcMark = 4;
  const sd = (u) => u.st.reduce((a, x) => a + (D.ST[x.id].dealt || 0) * (D.ST[x.id].per ? x.pow : 1), 0); assert(Math.abs(sd(e3) + 0.16) < 1e-9);
});
t('Первая причина: −50% урона; первый дебафф врага между ходами блокируется с шансом 70%', () => {
  const { s } = slotWith('prime_cause'); assert.strictEqual(E.derive(s).mods.taken, -50);
  const { B, P, e } = bat('prime_cause'); P.mods.pcFix = 0; fixR(B, 0.5); C.addSt(B, e, P, 'poison', 3, 10); assert(!stOf(P, 'poison')); C.addSt(B, e, P, 'weak', 3); assert(stOf(P, 'weak'), 'второй — уже проходит');
  const { B: B2, P: P2, e: e2 } = bat('prime_cause'); P2.mods.pcFix = 0; fixR(B2, 0.75); C.addSt(B2, e2, P2, 'poison', 3, 10); assert(stOf(P2, 'poison'), '30% — проходит');
});
t('До следствия: действие врага > 30% макс. HP → сразу +35% полученного урона, не чаще раза между ходами', () => {
  const { B, P, e } = bat('prime_cause'); P.mods.taken = 0; P.hp = P.maxHp; e.atk = P.maxHp * 0.45; e.crit = 0; P.def = 0; e.sk = ['e_hit']; e.intent = { id: 'e_hit', tid: 'p' }; P.st = []; P.mods.pcFirst = 0;
  B.cur = e; fixR(B, 0.5); const h0 = P.hp; C.act(B, e, { t: 'enemy', id: 'e_hit', tid: 'p' }); const lost = h0 - P.hp; const got = B.ev.find((x) => x.t === 'txt' && /До следствия/.test(x.s));
  assert(got, 'сработало'); const dmg = B.ev.filter((x) => x.t === 'dmg' && x.u === 'p').reduce((a, x) => a + x.v, 0); assert(dmg > P.maxHp * 0.3); assert.strictEqual(lost, dmg - Math.round(dmg * 0.35));
  B.cur = e; C.act(B, e, { t: 'enemy', id: 'e_hit', tid: 'p' }); assert.strictEqual(B.ev.filter((x) => x.t === 'txt' && /До следствия/.test(x.s)).length, 1, 'второй раз до хода владельца — нет');
});
t('Причинная устойчивость: мгновенное убийство раз за бой оставляет 15% макс. HP', () => {
  const { B, P, e } = bat('prime_cause'); P.hp = P.maxHp; C._hurt(B, P, P.hp + 1e9, 'arcane', e, true); assert(P.alive); assert.strictEqual(P.hp, Math.round(P.maxHp * 0.15));
  C._hurt(B, P, P.hp + 1e9, 'arcane', e, true); assert(!P.alive, 'второй раз — нет');
});
t('Исправление причины: раз в 4 хода наложение дебаффа отменяется, источник −15% шкалы хода', () => {
  const { B, P, e } = bat('prime_cause'); P.mods.pcFirst = 0; e.gauge = 50; C.addSt(B, e, P, 'stun', 1); assert(!stOf(P, 'stun')); assert.strictEqual(e.gauge, 35);
  C.addSt(B, e, P, 'stun', 1); assert(stOf(P, 'stun'), 'в те же 4 хода — проходит'); P.turns += 4; P.st = []; C.addSt(B, e, P, 'weak', 2); assert(!stOf(P, 'weak'));
});
t('навык «Первая причина»: 90% макс. HP + 25% потерянного HP цели мимо брони, игнорирует 40% снижения; Предопределённое Следствие возвращает 40%', () => {
  const { B, P, e } = bat('prime_cause'); e.def = 1e6; e.hp = 9e6; e.mods.taken = -50; skill(B, P, 'x_prime'); const K = 1 - 0.5 * 0.6;
  const dm = B.ev.find((x) => x.t === 'dmg' && x.u === 'e0' && x.origin); assert.strictEqual(dm.v, Math.round((P.maxHp * 0.9 + 1e6 * 0.25) * K)); assert(stOf(e, 'preConseq')); assert.strictEqual(P.cds.x_prime, 4);
  const eh = e.hp; P.hp = P.maxHp = 1e6; P.mods.taken = 0; C._hurt(B, P, 1000, 'phys', e); assert.strictEqual(eh - e.hp, 400);
  const { B: B2, P: P2, e: e2 } = bat('prime_cause', { boss: true }); e2.hp = 1e6; skill(B2, P2, 'x_prime'); const d2 = B2.ev.find((x) => x.t === 'dmg' && x.u === 'e0' && x.origin); assert.strictEqual(d2.v, Math.round(P2.maxHp * 0.9 + P2.maxHp * 3), 'боссы: потерянное ≤ 300% макс. HP владельца');
});

console.log('Клинок Нулевого Закона');
t('Закон ещё не написан: периодический урон −55%, ослабления характеристик вдвое слабее; Нулевая константа: не больше 3 дебаффов', () => {
  const { s } = slotWith('zero_law'); const d = E.derive(s); assert.strictEqual(d.mods.dotTaken, 55); assert.strictEqual(d.mods.zlHalf, 50);
  const { B, P, e } = bat('zero_law'); C.addSt(B, e, P, 'weak', 3); C.addSt(B, e, P, 'vuln', 3); const ref = plain('a', 'q'); ref.st = P.st.map((x) => Object.assign({}, x));
  const k = (u, key) => u.st.reduce((a, x) => a + (D.ST[x.id][key] || 0), 0); assert(k(ref, 'dealt') < 0); assert(Math.abs(C._redK(B, P, null) - Math.max(0.2, 1 + (P.mods.taken || 0) / 100 + k(ref, 'taken') * 0.5)) < 1e-9, 'уязвимость вдвое');
  P.st = []; ['poison', 'weak', 'vuln', 'bleed'].forEach((id) => C.addSt(B, e, P, id, 3, 5)); assert.strictEqual(P.st.filter((x) => ['debuff', 'dot', 'ctrl'].includes(D.ST[x.id].k)).length, 3); assert(!stOf(P, 'poison'), 'самый старый исчез');
});
t('Отмена Закона: самое сильное усиление врага −60% (боссы −30%) до следующего хода владельца; щит слабее', () => {
  const { B, P, e } = bat('zero_law'); C.addSt(B, e, e, 'shield', 5, 4e6); C.addSt(B, e, e, 'rally', 3); np(B, P); const sh = stOf(e, 'shield'); assert(Math.abs(sh.wk - 0.6) < 1e-9); assert(!stOf(e, 'rally').wk, 'ослабляется одно — самое сильное');
  sh.pow = 1000; const h0 = e.hp; C._hurt(B, e, 1000, 'phys', plain('a', 'q')); assert.strictEqual(h0 - e.hp, 600, 'щит 1000 работает на 40%'); assert(Math.abs(sh.pow) < 1e-6, 'щит израсходован');
  const { B: B2, P: P2, e: e2 } = bat('zero_law', { boss: true }); C.addSt(B2, e2, e2, 'rally', 3); np(B2, P2); assert(Math.abs(stOf(e2, 'rally').wk - 0.3) < 1e-9);
});
t('Никаких абсолютов: 100% иммунитет к урону против владельца — 80%; урон Истока его игнорирует полностью', () => {
  const { B, P, e } = bat('zero_law'); e.mods.dmgImm = 100; const h0 = e.hp; C._hurt(B, e, 1000, 'phys', P); assert.strictEqual(h0 - e.hp, 1000, 'урон Истока');
  const q = plain('a', 'q'); q.mods.zlNoAbs = 80; const h1 = e.hp; C._hurt(B, e, 1000, 'phys', q); assert.strictEqual(h1 - e.hp, 200, 'не урон Истока: 100% → 80%');
  const h2 = e.hp; C._hurt(B, e, 1000, 'phys', plain('a', 'q2')); assert.strictEqual(h2 - e.hp, 0);
});
t('Исключение из правил: крит раз в 3 хода проходит по иммунной цели; при абсолютном иммунитете — ×1,5 вместо крита', () => {
  const { B, P, e } = bat('zero_law'); P.crit = 80; fixR(B, 0); e.mods.critImm = 50; const eff = { k: 'dmg', s: 'atk', m: 1 }, sk = { id: 'basic' };
  let r = C._dmgCalc(B, P, e, eff, sk, 0); assert(r.crit && r.notes.includes('exc')); r = C._dmgCalc(B, P, e, eff, sk, 0); assert(!r.crit, 'в тот же ход — нет'); P.turns += 3; r = C._dmgCalc(B, P, e, eff, sk, 0); assert(r.crit);
  e.mods.critImm = 100; P.turns += 3; const a = C._dmgCalc(B, P, e, eff, sk, 0); const b = C._dmgCalc(B, P, e, eff, sk, 0); assert(!a.crit && !b.crit); assert(Math.abs(a.v / b.v - 1.5) < 0.01);
});
t('навык «Нулевой Закон»: 75% макс. HP с учётом брони; Без Закона 2 хода: защита −35%, уклонение 0, щиты −60%, лечение −50% (боссы — вдвое слабее)', () => {
  const { B, P, e } = bat('zero_law'); e.def = 300; skill(B, P, 'x_zero'); const pk = Math.min(0.9, P.sub.pen / 100), K = 50 + 4 * e.lv, ak = K / (K + 300 * (1 - pk));
  const dm = B.ev.find((x) => x.t === 'dmg' && x.u === 'e0' && x.origin); assert.strictEqual(dm.v, Math.round(P.maxHp * 0.75 * ak)); const lw = stOf(e, 'lawless'); assert(lw && lw.pow === 1); assert.strictEqual(P.cds.x_zero, 5);
  e.eva = 40; e.hp = 1; C._heal(B, e, e, 1000); assert.strictEqual(e.hp, 501); C.addSt(B, e, e, 'shield', 5, 1000); const h0 = e.hp + 1e6; e.hp = h0; C._hurt(B, e, 1000, 'phys', plain('a', 'q')); assert.strictEqual(h0 - e.hp, 600);
  const { B: B2, P: P2, e: e2 } = bat('zero_law', { boss: true }); skill(B2, P2, 'x_zero'); assert.strictEqual(stOf(e2, 'lawless').pow, 0.5); e2.hp = 1; C._heal(B2, e2, e2, 1000); assert.strictEqual(e2.hp, 751);
});

console.log('Клинок Первого Разделения');
t('Две стороны: удар ×0,85 + 25% отдельным Разделяющим уроном; Граница: пробитие ≥ 60%; Сопротивление всему урону 27%', () => {
  const { B, P, e } = bat('first_division'); np(B, P); fixR(B, 0.99); C.act(B, P, { t: 'basic', tid: 'e0' }); const ds = B.ev.filter((x) => x.t === 'dmg' && x.u === 'e0'); const main = ds.find((x) => x.el !== 'div'), div = ds.find((x) => x.el === 'div');
  assert(main && div); assert(Math.abs(div.v / (main.v / 0.85) - 0.25) < 0.01, div.v + ' / ' + main.v);
  const { B: B2, P: P2, e: e2 } = bat('first_division'); P2.sub.pen = 10; e2.def = 500; fixR(B2, 0.99); const eff = { k: 'dmg', s: 'atk', m: 1 }; const a = C._dmgCalc(B2, P2, e2, eff, { id: 'basic' }, 0); P2.mods.fdEdge = 0; const b = C._dmgCalc(B2, P2, e2, eff, { id: 'basic' }, 0); assert(a.v > b.v * 1.2);
  const K = 50 + 4 * e2.lv; assert(Math.abs(a.v / b.v - (K + 500 * 0.9) / (K + 500 * 0.4)) < 0.02);
  const { s } = slotWith('first_division'); assert.strictEqual(E.derive(s).mods.allRes, 27); const { B: B3, P: P3 } = bat('first_division'); P3.mods.taken = 0; assert(Math.abs(C._redK(B3, P3, null) - 0.73) < 1e-9); P3.mods.taken = -90; assert.strictEqual(C._redK(B3, P3, null), 0.2, 'общий нижний предел');
});
t('Совершенный разрез: крит игнорирует 25% снижения урона цели', () => {
  const { B, P, e } = bat('first_division'); e.mods.taken = -60; P.crit = 100; fixR(B, 0.5); const eff = { k: 'dmg', s: 'atk', m: 1 }; const a = C._dmgCalc(B, P, e, eff, { id: 'basic' }, 0); P.mods.fdCut = 0; const b = C._dmgCalc(B, P, e, eff, { id: 'basic' }, 0);
  assert(a.crit && b.crit); assert(Math.abs(a.v / b.v - (0.4 * 0.75 + 0.25) / 0.4) < 0.01);
});
t('Отделение свойства: каждый второй крит снимает усиление и блокирует его 2 хода; на боссах — −50% силы', () => {
  const { B, P, e } = bat('first_division'); C.addSt(B, e, e, 'rally', 5);
  P.crit = 100; P.mods.fdSplit = 0; np(B, P); fixR(B, 0.5); C.act(B, P, { t: 'basic', tid: 'e0' }); assert(stOf(e, 'rally'), 'первый крит — нет');
  np(B, P); fixR(B, 0.5); C.act(B, P, { t: 'basic', tid: 'e0' }); assert(!stOf(e, 'rally'), 'второй крит — снято'); C.addSt(B, e, e, 'rally', 3); assert(!stOf(e, 'rally'), 'заблокировано');
  e.turns += 2; C.addSt(B, e, e, 'rally', 3); assert(stOf(e, 'rally'), 'через 2 хода снова можно');
  const { B: B2, P: P2, e: e2 } = bat('first_division', { boss: true }); C.addSt(B2, e2, e2, 'rally', 9); P2.crit = 100; P2.mods.fdSplit = 0; for (let i = 0; i < 2; i++) { np(B2, P2); fixR(B2, 0.5); C.act(B2, P2, { t: 'basic', tid: 'e0' }); }
  const r = stOf(e2, 'rally'); assert(r && r.half === 0.5);
});
t('Разделение сущности: после 4 попаданий — Расщепление 2 хода (макс. HP −15%, боссы −5%; возвращается без лечения), защита −25%, щиты −40%, лечение −35%', () => {
  const { B, P, e } = bat('first_division'); P.mods.fdStrip = 0; const m0 = e.maxHp; for (let i = 0; i < 3; i++) C._oHurt(B, P, e, 1, 'origin'); assert(!stOf(e, 'split')); C._oHurt(B, P, e, 1, 'origin');
  const sp = stOf(e, 'split'); assert(sp); assert.strictEqual(e.maxHp, m0 - Math.round(m0 * 0.15)); const hp = e.hp; e.hp = 1; C._heal(B, e, e, 1000); assert.strictEqual(e.hp, 651); e.hp = hp - 5;
  const before = e.hp; e.gauge = 0; for (let i = 0; i < 2; i++) { B.cur = e; C.act(B, e, { t: 'guard' }); } assert(!stOf(e, 'split')); assert.strictEqual(e.maxHp, m0, 'макс. HP вернулся'); assert(e.hp <= before + 1, 'без лечения');
  const { B: B2, P: P2, e: e2 } = bat('first_division', { boss: true }); P2.mods.fdStrip = 0; const mb = e2.maxHp; for (let i = 0; i < 4; i++) C._oHurt(B2, P2, e2, 1, 'origin'); assert.strictEqual(e2.maxHp, mb - Math.round(mb * 0.05));
});
t('Разделить неразделимое: мгновенное убийство владельца раз за бой → 20% HP, снятие дебаффов, +30% урона 2 хода', () => {
  const { B, P, e } = bat('first_division'); C.addSt(B, e, P, 'poison', 3, 5); P.st.push({ id: 'weak', dur: 3, pow: 0, src: 'e0' }); C._hurt(B, P, P.hp + 1e9, 'arcane', e, true);
  assert(P.alive); assert.strictEqual(P.hp, Math.round(P.maxHp * 0.2)); assert(!P.st.some((x) => ['debuff', 'dot', 'ctrl'].includes(D.ST[x.id].k))); assert(stOf(P, 'fdRage')); assert.strictEqual(D.ST.fdRage.dealt, 0.3);
  C._hurt(B, P, P.hp + 1e9, 'arcane', e, true); assert(!P.alive);
});
t('навык «Первое Разделение»: 70% макс. HP мимо брони + Разделяющий 35% потерянного HP (боссы ≤ 300% макс. HP); Разрыв Связи 2 хода (щиты и усиления вполовину, боссы — на 75%)', () => {
  const { B, P, e } = bat('first_division'); e.def = 1e6; e.hp = 9e6; P.mods.fdSplit = 0; skill(B, P, 'x_division'); const ds = B.ev.filter((x) => x.t === 'dmg' && x.u === 'e0' && x.origin);
  assert.strictEqual(ds[0].v, Math.round(P.maxHp * 0.7)); assert.strictEqual(ds[1].el, 'div'); assert.strictEqual(ds[1].v, Math.round((1e7 - 9e6 + ds[0].v) * 0.35)); assert.strictEqual(stOf(e, 'severed').pow, 1); assert.strictEqual(P.cds.x_division, 5);
  C.addSt(B, e, e, 'shield', 5, 1000); const h0 = e.hp; C._hurt(B, e, 1000, 'phys', plain('a', 'q')); assert.strictEqual(h0 - e.hp, 500);
  const { B: B2, P: P2, e: e2 } = bat('first_division', { boss: true }); e2.hp = 1e6; P2.mods.fdSplit = 0; skill(B2, P2, 'x_division'); const d2 = B2.ev.filter((x) => x.t === 'dmg' && x.u === 'e0' && x.origin); assert.strictEqual(d2[1].v, Math.round(P2.maxHp * 3)); assert.strictEqual(stOf(e2, 'severed').pow, 0.5);
});

console.log('Порядок силы (concept-duel, герой ур. 55, 4 босса + живучесть)');
t('Энтропия < Первопричина ≈ Нулевой Закон < Первое Разделение (ходы до победы, 4 босса)', () => {
  const run = (a) => { const o = require('child_process').execFileSync('node', [path.join(__dirname, '../tools/concept-duel.js')].concat(a, ['--json']), { encoding: 'utf8' }).trim().split('\n'); return JSON.parse(o[o.length - 1]); };
  [['ember_titan', '47'], ['frost_queen', '47'], ['void_sovereign', '47'], ['ember_titan', '52']].forEach(([b, l]) => {
    const r = run(['30', b, l]), en = r.end_of_all.turnsToWin, p = r.prime_cause.turnsToWin, z = r.zero_law.turnsToWin, d = r.first_division.turnsToWin;
    assert(en > p && en > z, `${b} ${l}: Энтропия ${en} медленнее Первопричины ${p} и Нулевого Закона ${z}`); assert(Math.abs(p / z - 1) <= 0.15, `${b} ${l}: Первопричина ${p} ≈ Нулевой Закон ${z}`); assert(d < Math.min(p, z), `${b} ${l}: Разделение ${d} быстрее всех`);
    Object.keys(r).filter((k) => D.UNIQUE_ITEMS[k].r === 8).forEach((k) => assert(r[k].turnsToWin >= en, `${k} не быстрее Энтропии`));
  });
});

t('живучесть (--tank, void_sovereign ур. 55): Первопричина — самый живучий клинок Истока («высокая живучесть»)', () => {
  const o = require('child_process').execFileSync('node', [path.join(__dirname, '../tools/concept-duel.js'), '30', 'void_sovereign', '55', '--tank', '--json'], { encoding: 'utf8' }).trim().split('\n'); const r = JSON.parse(o[o.length - 1]);
  assert(r.prime_cause.turns > r.zero_law.turns && r.prime_cause.turns > r.first_division.turns, JSON.stringify([r.prime_cause.turns, r.zero_law.turns, r.first_division.turns]));
  assert(r.prime_cause.takenPerEnemyTurn < r.zero_law.takenPerEnemyTurn && r.prime_cause.takenPerEnemyTurn < r.first_division.takenPerEnemyTurn);
});

console.log(`\nИсток: ${pass} ✓, ${fail} ✗`);
if (fail) { console.log(failed.join('\n')); process.exit(1); }
