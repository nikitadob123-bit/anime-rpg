/* Тесты редкости «До существования» v2.14: «Клинок Нулевой Возможности» (данные, пределы, иммунитеты, Отказ смерти, Абсолютная защита,
   Отрицание/Возможность существования — постоянное состояние в сохранении, автоочистка без наград, сюжет, один экземпляр, сила). Запуск: npm test */
const fs = require('fs'), path = require('path'), assert = require('assert');
const RPG = require('../js/data-core.js');
['data-stats', 'data-maou', 'data-maou2', 'data-prof', 'data-world', 'data-world2', 'data-crew', 'data-theme', 'data-story', 'data-story2', 'data-story3', 'data-romance', 'portrait', 'engine', 'stats', 'gear', 'combat', 'crew', 'save', 'mail'].forEach((f) => require('../js/' + f + '.js'));
const { D, E, C, M } = RPG;
let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); pass++; } catch (e) { fail++; console.log('  ✗', name, '\n     ', e.message); } };
const ID = 'null_possibility';
const mk = (cls) => E.newSlot({ name: 'Тест', race: 'o_street', uniq: 'phoenix', prof1: 'smith', prof2: 'miner', cls: cls || 'warrior' });
const slotWith = (id, lv) => { const s = mk(); s.hero.level = lv || 70; const it = E.addItem(s, E.makeUnique(id || ID)); assert.strictEqual(E.equip(s, it.id), ''); return { s, it }; };
const plain = (side, id) => { const u = C.unitFromEnemy('slime', 40, 0, false, id || (side === 'a' ? 'q' : 'e9')); u.side = side; u.mods = {}; u.weak = []; u.resist = []; u.el = null; u.eva = 0; u.hp = u.maxHp = 1e6; u.def = 0; u.sub = { statRes: 0, resEl: {} }; return u; };
// бой 1×1: владелец клинка против нейтрального врага
const bat = (o) => {
  o = o || {}; const { s } = slotWith(o.id); const P = C.unitFromSlot(s); const e = C.unitFromEnemy(o.eid || 'slime', 40, 0, false, 'e0');
  e.weak = []; e.resist = []; e.el = null; e.eva = 0; e.sub = { statRes: 0, resEl: {} }; e.hp = e.maxHp = o.ehp || 1e7;
  const B = C.create([P], [e], E.rng(o.seed || 5), {}); P.mods.hpRegen = 0; P.eva = 0; return { B, P, e, s };
};
const stOf = (u, id) => u.st.find((x) => x.id === id);
const np = (B, only) => { for (let i = 0; i < 400; i++) { const u = C.next(B); if (u && (!only || u === only)) return u; if (B.over) return null; if (u && only) C.act(B, u, { t: 'guard' }); } throw new Error('нет хода игрока'); };
let NOW = 2e12; E.now = () => NOW;
const DID = Object.keys(D.DUN).find((k) => { const d = D.DUN[k]; return !D.ENEMIES[d.boss].duel && !D.ENEMIES[d.mini].duel && !(D.PRE_BOSS && D.PRE_BOSS[k]); });
const runSlot = (seed) => { const { s } = slotWith(); s.prog.cleared[DID] = 1; s.prog.boss[DID] = true; s.story.flags.prologue_done = 1; s.run = E.genRun(s, DID, 0, seed || 777); s.run.hp = 1e5; s.run.mp = 9999; s.run.comp = {}; return s; };
const runBat = (s) => { const B = C.startNodeBattle(s); const P = B.party[0]; return { B, P }; };
const useSk = (B, P, id, tid) => { P.mp = Math.max(P.mp, 100); B.cur = P; assert.strictEqual(C.canUse(B, P, id), ''); C.act(B, P, { t: 'skill', id, tid }); };

console.log('До существования: данные, недоступность, почта');
t('null_possibility: r 10 «До существования», ур. 70, +0/15 у кузнеца, статы и аффиксы ровно по описанию, 4 пассивки, 2 навыка 100 маны без перезарядки, арт и SW', () => {
  const it = E.makeUnique(ID), U = D.UNIQUE_ITEMS[ID]; assert.strictEqual(it.r, 10); assert.strictEqual(D.RARITY[10].n, 'До существования'); assert.strictEqual(it.il, 70); assert.strictEqual(it.nm, 'Клинок Нулевой Возможности'); assert(it.lock && it.uq === ID && it.sl === 'weapon' && U.single);
  assert.deepStrictEqual(it.st, { atk: 10000, str: 500, vit: 500, luk: 500, spi: 500, dmg: 200, crit: 100, critDmg: 3, pen: 100, lifesteal: 100, hpPct: 100, allRes: 100 });
  const { s } = slotWith(); assert.strictEqual(E.upCap(s, it), 15);
  assert.deepStrictEqual(U.sp.map((x) => x.n), ['Предсуществующая броня', 'Нулевая устойчивость', 'Отказ смерти', 'Абсолютная защита']); assert.strictEqual(U.sp[0].v, 70); assert.strictEqual(U.sp[2].v, 50); assert.strictEqual(U.sp[3].v, 100);
  assert.deepStrictEqual(U.skills, ['x_deny', 'x_restore']); ['x_deny', 'x_restore'].forEach((k) => { const sk = D.SKILLS[k]; assert.strictEqual(sk.mp, 100); assert.strictEqual(sk.cd, 0); assert(sk.prex && sk.fixedMp && sk.noEcho && sk.img); });
  assert.strictEqual(D.SKILLS.x_deny.n, 'Отрицание существования'); assert.strictEqual(D.SKILLS.x_restore.n, 'Возможность существования'); assert(/Одним движением/.test(U.lore) && /Вторым/.test(U.lore));
  ['128', '256', 'art'].forEach((k) => { const f = path.join(__dirname, '../assets/gear/' + ID + '_' + k + '.webp'); assert(fs.existsSync(f), f); assert(fs.readFileSync(path.join(__dirname, '../sw.js'), 'utf8').includes("'assets/gear/" + ID + '_' + k + ".webp'")); });
  assert.deepStrictEqual(D.PREX_COMMON.map((x) => x.n), ['Выше Истока', 'Абсолютная иерархия', 'Наследие Истока', 'За пределами законов', 'Единственный экземпляр']); assert(/До существования решает/.test(D.PREX_COMMON[0].d));
  assert.strictEqual(D.GEAR_LBL.hpPct, 'Максимальное здоровье'); assert.strictEqual(D.ST.deniedSt.n, 'Существование отрицается');
});
t('не выпадает, не продаётся, не куётся, не генерируется; --gear :10 запрещён', () => {
  const rng = E.rng(21); for (let i = 0; i < 1000; i++) { const it = E.genItem(rng, { base: 'sword', il: 70, rarity: 10 }); assert(it.r <= 7 && !it.uq); }
  const s = mk(); for (let k = 0; k < 6; k++) { s.shopSeed = k; E.shopStock(s).forEach((it) => assert(!it.uq && it.r <= 7)); }
  const { s: s2, it } = slotWith(); E.unequip(s2, 'weapon'); const g0 = s2.gold; assert.strictEqual(E.sell(s2, it.id), 0); assert.strictEqual(s2.gold, g0);
  assert.strictEqual(M.giftErrors({ gear: [{ base: 'sword', rarity: 10 }] }).length, 1);
});
t('«Не может существовать более чем в одном экземпляре»: второй подарок отклоняется с пометкой (сумка, надет, Свита, добыча вылазки); другие уникальные — как раньше', () => {
  const day = Date.parse('2026-10-08'); const L = (id, g) => M.parseFeed({ letters: [{ id, title: 'Дар', body: 'x', from: 'Администрация', gifts: g }] }).letters;
  assert.deepStrictEqual(M.giftErrors({ unique: ID }), []);
  const s = mk(); M.deliver(s, L('p1', { unique: ID }), day); const r1 = M.claim(s, 'p1', day); assert(r1.ok && r1.got.items.length === 1 && !r1.got.refused);
  M.deliver(s, L('p2', { unique: [ID, 'prime_cause'] }), day); const r2 = M.claim(s, 'p2', day); assert(r2.ok); assert.strictEqual(r2.got.refused.length, 1); assert(/второй экземпляр невозможен/.test(r2.got.refused[0].why)); assert.strictEqual(r2.got.items.length, 1, 'Первопричина выдана');
  assert.strictEqual(E.slotItems(s).filter((x) => x.uq === ID).length, 1);
  const it = s.inv.find((x) => x.uq === ID); E.equip(s, it.id); assert.strictEqual(E.addItem(s, E.makeUnique(ID)), null, 'надет — второй не создаётся'); E.unequip(s, 'weapon');
  const cid = Object.keys(D.CREW)[0]; s.inv = s.inv.filter((x) => x !== it); s.crew[cid] = { lv: 50, loy: 60, eq: { weapon: it } }; assert(E.uniqueRefused(s, ID), 'у Свиты');
  const s3 = mk(); s3.run = { bag: { items: [E.makeUnique(ID)] } }; assert(E.uniqueRefused(s3, ID), 'в добыче вылазки');
  M.deliver(s3, L('p3', { unique: ID }), day); const r3 = M.claimAll(s3, day); assert.strictEqual(r3.got.refused.length, 1);
  const s4 = mk(); E.addItem(s4, E.makeUnique('prime_cause')); assert(E.addItem(s4, E.makeUnique('prime_cause')), 'Исток — без ограничения');
  const ids = require('child_process').execFileSync('node', [path.join(__dirname, '../tools/mail.js'), 'ids'], { encoding: 'utf8' }), help = require('child_process').execFileSync('node', [path.join(__dirname, '../tools/mail.js'), 'help'], { encoding: 'utf8' }), doc = fs.readFileSync(path.join(__dirname, '../docs/MAIL.md'), 'utf8');
  assert(ids.includes(ID) && help.includes(ID) && doc.includes('`' + ID + '`') && /одном экземпляре/.test(doc));
});

console.log('Пределы, мана, моды');
t('владелец r 10: крит 100%, бронепробитие 100%, вампиризм 100%, урон крита сверх 600%, макс. HP +100%; у Истока пределы прежние', () => {
  const { s } = slotWith(); const d = E.derive(s); assert.strictEqual(d.crit, 100); assert.strictEqual(d.sub.pen, 100); assert.strictEqual(d.mods.lifesteal, 100); assert(d.critDmg > 6, 'урон крита ' + d.critDmg); assert(d.mods.prex === 1 && d.mods.origin === 1);
  const it = s.eq.weapon; const st = Object.assign({}, it.st); delete st.hpPct; it.st = st; const d0 = E.derive(s), o = d0.mods.hp || 0; assert(Math.abs(d.maxHp / d0.maxHp - (200 + o) / (100 + o)) < 0.01, '+100% к макс. HP (складывается с прочими %): ' + d.maxHp + '/' + d0.maxHp);
  const { s: s2 } = slotWith('first_division', 55); const d2 = E.derive(s2); assert(d2.crit <= 80 && d2.sub.pen <= 70 && !d2.mods.prex);
});
t('мана: 100 на навык достижимы на ур. 70 у всех классов (даже без клинка); стоимость ровно 100 — «Эффективность энергии» её не снижает', () => {
  ['warrior', 'mage', 'rogue', 'healer', 'shield'].forEach((c) => { const s = mk(c); s.hero.level = 70; assert(E.derive(s).maxMp >= 100, c + ' без клинка ' + E.derive(s).maxMp); const it = E.addItem(s, E.makeUnique(ID)); E.equip(s, it.id); assert(E.derive(s).maxMp >= 100 + 750, c + ' с клинком'); });
  const { P } = bat(); P.sub.manaEff = 50; assert.strictEqual(C.mpCost(P, D.SKILLS.x_deny), 100); assert.strictEqual(C.mpCost(P, D.SKILLS.x_restore), 100);
});

console.log('Защита владельца');
t('урон ниже r 10 по владельцу = 0: удары монстров, прямой урон, мгновенная смерть, концептуальный, урон Истока (Отрицание бессмертия не действует), DoT, отражение', () => {
  const { B, P, e } = bat(); const sh = stOf(P, 'shield').pow, h0 = P.hp;
  e.atk = 1e6; for (let i = 0; i < 5; i++) { B.cur = e; C.act(B, e, { t: 'enemy', id: e.sk[0], tid: 'p' }); } assert.strictEqual(P.hp, h0); assert.strictEqual(stOf(P, 'shield').pow, sh, 'щит не тронут — урона нет');
  assert.strictEqual(C._hurt(B, P, 1e9, 'phys', e), 0); assert.strictEqual(C._hurt(B, P, P.hp + 1e9, 'arcane', e, true), 0); assert(P.alive);
  const cx = plain('e', 'e7'); cx.mods.conceptRes = 0; assert.strictEqual(C._cHurt(B, cx, P, 1e8, 'dark'), 0);
  const { s: so } = slotWith('first_division', 55); const O = C.unitFromSlot(so); O.side = 'e'; O.id = 'e8'; B.foes.push(O); B.units.push(O); assert(C.isOrigin(O));
  assert.strictEqual(C._oHurt(B, O, P, 1e9, 'origin'), 0); P.hp = 1; C._hurt(B, P, 1e9, 'phys', O); assert(P.alive && P.hp === 1, 'Исток не пробивает r 10');
  P.st.push({ id: 'burn', dur: 3, pow: 1e6, src: 'e0' }); assert.strictEqual(C._hurt(B, P, 1e6, 'fire', e, true), 0);
  assert.strictEqual(C._redK(B, P, null), 1, 'allRes владельца r 10 — в hurt()'); P.mods.taken = -150; assert.strictEqual(C._redK(B, P, null), 0, 'нижний предел ×0,2 снят'); P.mods.taken = 0; assert(C._redK(B, B.foes[0], null) >= 0.2);
});
t('буквально: «Сопротивление всему урону» и «Предсуществующая броня −70%» перемножаются (allRes 0 → 30% урона, 50 → 15%)', () => {
  const { B, P, e } = bat(); P.st = []; P.hp = P.maxHp = 1e9;
  P.mods.allRes = 0; assert.strictEqual(C._hurt(B, P, 1000, 'phys', e), 300); P.mods.allRes = 50; assert.strictEqual(C._hurt(B, P, 1000, 'phys', e), 150);
  const x = plain('a', 'q'); x.mods.allRes = 100; x.hp = x.maxHp = 1e6; B.party.push(x); B.units.push(x); assert(C._redK(B, x, null) >= 0.2, 'без r 10 предел ×0,2 остаётся');
});
t('Нулевая устойчивость: ни один отрицательный статус (контроль, дебафф, DoT, метки, статусы предметов Истока) от монстра, Истока или себя; Распад, Застывшее время, «Закон необратимости» — тоже', () => {
  const { B, P, e } = bat(); P.st = []; const neg = Object.keys(D.ST).filter((k) => ['debuff', 'dot', 'ctrl'].includes(D.ST[k].k)); assert(neg.length > 15);
  const { s: so } = slotWith('prime_cause', 55); const O = C.unitFromSlot(so); O.side = 'e'; O.id = 'e8'; B.foes.push(O); B.units.push(O);
  neg.forEach((id) => { C.addSt(B, e, P, id, 3, 50); C.addSt(B, O, P, id, 3, 50); C.addSt(B, P, P, id, 3, 50); }); assert.deepStrictEqual(P.st.filter((x) => neg.includes(x.id)), []);
  C._addDecay(B, { id: 'e9', side: 'e', mods: { entDecay: 6, entHeat: 35 } }, P, 6); assert(!stOf(P, 'decay'));
  C.addSt(B, P, P, 'haste', 2); assert(stOf(P, 'haste'), 'усиления работают');
  const ent = plain('e', 'e6'); ent.mods.entIrrev = 20; B.foes.push(ent); B.units.push(ent); const mx = P.maxHp; P.hp = 1; C._heal(B, P, P, 1000); assert.strictEqual(P.maxHp, mx);
  const cc = Object.keys(D.ESK).find((k) => D.ESK[k].tgt === 'foe' && D.ESK[k].fx.some((f) => f.k === 'st' && D.ST[f.id].k === 'ctrl')); assert(cc, 'навык монстра с контролем');
  P.sub.statRes = 0; P.mods.ccRes = 0; for (let i = 0; i < 10; i++) { B.cur = e; C.act(B, e, { t: 'enemy', id: cc, tid: 'p' }); } assert(!P.st.some((x) => D.ST[x.id].k === 'ctrl')); assert(B.log.some((l) => /Нулевая устойчивость/.test(l)));
});
t('Абсолютная защита: щит 100% макс. HP в начале боя, держится до разрушения (не по ходам)', () => {
  const { B, P } = bat(); const sh = stOf(P, 'shield'); assert.strictEqual(Math.round(sh.pow), P.maxHp); assert(sh.dur >= 1e8);
  for (let i = 0; i < 60; i++) { const u = np(B, P); C.act(B, u, { t: 'guard' }); } assert(stOf(P, 'shield') && Math.round(stOf(P, 'shield').pow) === P.maxHp, 'через 60 ходов на месте');
  P.mods.allRes = 0; P.mods.pxArmor = 0; C._hurt(B, P, P.maxHp * 0.5, 'phys', B.foes[0]); assert(Math.abs(stOf(P, 'shield').pow - P.maxHp * 0.5) < 2);
});
t('Отказ смерти: первый смертельный удар за бой игнорируется (+50% HP, щит 50% на 2 хода), не воскрешение, срабатывает и против урона Истока; второй — смерть', () => {
  const { B, P } = bat(); P.mods.allRes = 0; P.mods.pxArmor = 0; P.st = []; P.hp = 1000;
  const { s: so } = slotWith('first_division', 55); const O = C.unitFromSlot(so); O.side = 'e'; O.id = 'e8'; B.foes.push(O); B.units.push(O);
  assert.strictEqual(C._hurt(B, P, 1e7, 'phys', O), 0); assert(P.alive); assert.strictEqual(P.hp, Math.min(P.maxHp, 1000 + Math.round(P.maxHp * 0.5))); const sh = stOf(P, 'shield'); assert(sh && sh.dur === 2 && Math.round(sh.pow) === Math.round(P.maxHp * 0.5));
  assert(!P.reviveUsed && !B.ev.some((x) => x.t === 'revive'), 'не воскрешение'); assert(B.log.some((l) => /Отказ смерти/.test(l)));
  assert.strictEqual(C._hurt(B, P, P.hp + 1e9, 'phys', O), 0, 'мгновенная смерть — Нулевая устойчивость'); P.st = []; C._hurt(B, P, P.hp + P.maxHp, 'phys', O); assert(!P.alive, 'второй смертельный удар');
});
t('удары владельца: лимит урона по боссу за удар снят, Отрицание бессмертия сохраняется, обычное убийство ничего не стирает (нет 10-минутного Стирания)', () => {
  const { B, P, e } = bat({ ehp: 1e9 }); e.role = 'boss'; e.lv = 80; assert.strictEqual(C._hurt(B, e, 5e8, 'phys', P), 5e8);
  const { B: B2, P: P2 } = bat({ id: 'first_division' }); B2.party[0].hero = true; const e2 = B2.foes[0]; e2.role = 'boss'; e2.lv = 80; e2.hp = e2.maxHp = 1e9; assert(C._hurt(B2, e2, 5e8, 'phys', P2) < 5e8, 'Исток — с лимитом');
  const x = plain('e', 'e5'); x.mods.reviveOnce = 1; B.foes.push(x); B.units.push(x); C._hurt(B, x, x.hp + 10, 'phys', P); assert(!x.alive && !x.gone && !(B.erasedNow || []).length);
});

console.log('Отрицание существования');
t('цель исчезает: вне боя (не в B.foes/B.units), не смерть — без добычи/опыта/эффектов «при смерти», мимо бессмертия/неуязвимости/воскрешения/1 HP/второй жизни', () => {
  const s = runSlot(); const { B, P } = runBat(s); const T = B.foes[0]; Object.assign(T.mods, { reviveOnce: 1, secondLife: 1, dmgImm: 100, erase: 9, hellDeny: 50 }); C.addSt(B, T, T, 'immortal', 5);
  P.mods.killMp = 50; P.mods.hellFeast = 30; const mp0 = Math.max(P.mp, 100); B.foes.slice(1).forEach((f) => { f.hp = 1; });
  useSk(B, P, 'x_deny', T.id); assert(!B.foes.includes(T) && !B.units.includes(T)); assert(T.denied && T.gone && !T.alive); assert(!B.killed.includes(T)); assert(P.mp < mp0 - 100 + 20, 'ни маны за убийство, ни Пира: ' + P.mp); assert(!B.log.some((l) => /Пир Падших/.test(l)));
  assert(B.ev.some((x) => x.t === 'deny' && x.u === T.id) && !B.ev.some((x) => x.t === 'death' && x.u === T.id), 'без события смерти');
  const rec = s.denied[0]; assert.deepStrictEqual([rec.k, rec.i, rec.eid, rec.did, rec.tier, rec.node], [DID + '|0|0', +T.id.slice(1), T.eid, DID, 0, 0]); assert(rec.n && !rec.until, 'без таймера');
});
t('единственный враг отрицается → победа без опыта/золота/добычи; сохраняется в сохранении без таймера (годы); тот же враг на том же месте не появляется, другой — появляется', () => {
  const s = runSlot(); s.run.nodes[0].e = [s.run.nodes[0].e[0]]; const { B, P } = runBat(s); const xp = s.hero.xp, gold = s.gold, kills = s.stats.kills;
  useSk(B, P, 'x_deny', 'e0'); assert.strictEqual(B.over, 'win'); const rep = C.finishBattle(s, B); assert.strictEqual(rep.xp, 0); assert.strictEqual(rep.gold, 0); assert.strictEqual(rep.items.length, 0); assert.strictEqual(rep.denied, 1); assert.strictEqual(s.hero.xp, xp); assert.strictEqual(s.gold, gold); assert.strictEqual(s.stats.kills, kills);
  const s2 = JSON.parse(JSON.stringify(s)); NOW += 10 * 365 * 864e5; s2.run.node = 0; assert.strictEqual(C.deniedList(s2).length, 1); assert(C.nodeErased(s2, s2.run, 0), 'через 10 лет всё ещё отрицается');
  const r = C.autoClear(s2); assert(r && r.auto && r.denied === 1 && r.xp === 0 && !r.items.length);
  const s3 = JSON.parse(JSON.stringify(s)); s3.run.node = 0; const other = Object.keys(D.ENEMIES).find((k) => k !== s3.run.nodes[0].e[0] && D.ENEMIES[k].role !== 'boss' && !D.ENEMIES[k].duel); s3.run.nodes[0].e = [other]; assert(!C.nodeErased(s3, s3.run, 0)); assert.strictEqual(C.startNodeBattle(s3).foes.length, 1, 'на этом месте другой враг — появляется');
  const s4 = JSON.parse(JSON.stringify(s)); s4.run.tier = 1; s4.run.node = 0; assert(!C.nodeErased(s4, s4.run, 0), 'другая сложность — другой этап');
});
t('часть этапа отрицается → остальные появляются (место в этапе сохраняется); полностью отрицаемый этап очищается сам без наград', () => {
  const s = runSlot(); const n0 = s.run.nodes[0]; assert(n0.e.length >= 2); const { B, P } = runBat(s); useSk(B, P, 'x_deny', 'e0'); B.over = 'flee'; C.finishBattle(s, B);
  const B2 = C.startNodeBattle(s); assert.strictEqual(B2.foes.length, n0.e.length - 1); assert(!B2.foes.some((f) => f.id === 'e0'));
  s.denied.push(...n0.e.slice(1).map((eid, j) => ({ id: 'x' + j, k: DID + '|0|0', i: j + 1, eid, n: eid, did: DID, tier: 0, node: 0 })));
  const bag = JSON.stringify(s.run.bag); const r = C.autoClear(s); assert(r && r.auto && !r.bossDown && r.xp === 0); assert.strictEqual(JSON.stringify(s.run.bag), bag); assert.strictEqual(s.run.node, 1);
});
t('босс: отрицание в бою — этап засчитан, без искры Нимба, побед и добычи с босса; отрицаемый босс при следующей вылазке — автоочистка с прогрессом', () => {
  const s = runSlot(); const bi = s.run.nodes.findIndex((n) => n.t === 'boss'); s.run.node = bi; s.prog.cleared[DID] = 0; delete s.prog.boss[DID]; const pts = s.hero.bossPts || 0, wins = s.stats.wins;
  const { B, P } = runBat(s); useSk(B, P, 'x_deny', 'e0'); assert.strictEqual(B.over, 'win'); const rep = C.finishBattle(s, B); assert(rep.bossDown && !rep.firstClear && !rep.items.length); assert.strictEqual(s.prog.cleared[DID], 1); assert(s.prog.boss[DID]); assert.strictEqual(s.hero.bossPts || 0, pts); assert.strictEqual(s.stats.wins, wins);
  E.claimRun(s, 'win'); s.run = E.genRun(s, DID, 0, 991); s.run.hp = 1e5; s.run.mp = 999; s.run.comp = {}; s.run.node = s.run.nodes.findIndex((n) => n.t === 'boss'); s.prog.cleared[DID] = 0; delete s.prog.boss[DID];
  const r = C.autoClear(s); assert(r && r.bossDown && r.denied === 1); assert.strictEqual(s.prog.cleared[DID], 1, 'прогресс засчитан'); assert.strictEqual(s.hero.bossPts || 0, pts);
});
t('сюжет нельзя сломать: дуэли с героинями, босс-героиня и босс со сценой перед боем недоступны (навык выключен с объяснением); вне этапа — тоже', () => {
  const duelDid = Object.keys(D.DUN).find((k) => D.ENEMIES[D.DUN[k].mini].duel); const { s } = slotWith(); s.run = E.genRun(s, duelDid, 0, 5); s.run.hp = 1e5; s.run.mp = 999; s.run.comp = {}; s.run.node = s.run.nodes.findIndex((n) => n.t === 'mini');
  const B = C.startNodeBattle(s); const P = B.party[0]; P.mp = 999; assert.strictEqual(C.canUse(B, P, 'x_deny'), 'сюжетный бой — нельзя');
  const bossDuel = Object.keys(D.DUN).find((k) => D.ENEMIES[D.DUN[k].boss].duel); s.run = E.genRun(s, bossDuel, 0, 5); s.run.hp = 1e5; s.run.mp = 999; s.run.comp = {}; s.run.node = s.run.nodes.findIndex((n) => n.t === 'boss'); assert.strictEqual(C.canUse(C.startNodeBattle(s), P, 'x_deny'), 'сюжетный бой — нельзя');
  const pre = Object.keys(D.PRE_BOSS)[0]; s.run = E.genRun(s, pre, 0, 5); s.run.hp = 1e5; s.run.mp = 999; s.run.comp = {}; s.run.node = s.run.nodes.findIndex((n) => n.t === 'boss'); assert.strictEqual(C.canUse(C.startNodeBattle(s), P, 'x_deny'), 'сюжетный бой — нельзя');
  const { B: B2, P: P2 } = bat(); P2.mp = 999; assert.strictEqual(C.canUse(B2, P2, 'x_deny'), 'только в бою этапа'); assert(s.run.nodes.filter((n) => n.t === 'ev').every((n) => !C.erasable(n)), 'события — не цели');
});
t('призванный: исчезает до конца боя (повторно не призвать), в сохранение не пишется', () => {
  const s = runSlot(); const { B, P } = runBat(s); const sm = C.unitFromEnemy('slime', 30, 0, false, 'e9s'); sm.summoned = true; B.foes.push(sm); B.units.push(sm);
  useSk(B, P, 'x_deny', 'e9s'); assert(!B.foes.includes(sm)); assert.strictEqual(C.deniedList(s).length, 0); assert(B.noSummon.slime);
});
t('ИИ (авто-бой) никогда сам не применяет Отрицание/Возможность; Эхо не повторяет их; перезарядки нет', () => {
  const s = runSlot(); const { B, P } = runBat(s); P.mp = P.maxMp; B.opts.auto = true; s.denied = [{ id: 'z', k: 'x|0|0', i: 0, eid: 'slime', n: 'Слизень', did: DID, tier: 0, node: 3 }];
  for (let i = 0; i < 30; i++) { B.cur = P; const a = C.choose(B, P); assert(!(a.t === 'skill' && /x_deny|x_restore/.test(a.id)), JSON.stringify(a)); }
  useSk(B, P, 'x_restore', 'z'); assert.strictEqual(P.cds.x_restore || 0, 0); assert.notStrictEqual(P.lastSk, 'x_restore');
});

console.log('Возможность существования');
t('нет отрицаемых — «некого возвращать»; возврат с другого этапа снимает статус, враг снова появляется при следующем запуске этапа', () => {
  const s = runSlot(); const { B, P } = runBat(s); P.mp = 999; assert.strictEqual(C.canUse(B, P, 'x_restore'), 'некого возвращать');
  useSk(B, P, 'x_deny', 'e0'); B.over = 'flee'; C.finishBattle(s, B); const rec = s.denied[0];
  s.run.node = 1; const { B: B2, P: P2 } = runBat(s); const n2 = B2.foes.length; useSk(B2, P2, 'x_restore', rec.id); assert.strictEqual(C.deniedList(s).length, 0); assert.strictEqual(B2.foes.length, n2, 'чужой этап — в этот бой не возвращается');
  s.run.node = 0; assert(C.startNodeBattle(s).foes.some((f) => f.id === 'e0'), 'снова появляется на своём месте');
});
t('возврат в бою на том же этапе: сущность возвращается на поле с полным HP и обычным состоянием, обычный бой и добыча', () => {
  const s = runSlot(); s.run.nodes[0].e = s.run.nodes[0].e.slice(0, 2); const { B, P } = runBat(s); useSk(B, P, 'x_deny', 'e0'); assert.strictEqual(B.foes.length, 1); const rid = s.denied[0].id;
  useSk(B, P, 'x_restore', rid); const R = B.foes.find((f) => f.id === 'e0'); assert(R && R.alive && R.hp === R.maxHp && R.phase === 1 && !R.st.length && B.units.includes(R)); assert.strictEqual(B.foes[0], R, 'на своём месте в волне'); assert.strictEqual(C.deniedList(s).length, 0);
  B.foes.forEach((f) => { f.hp = 1; C._hurt(B, f, 10, 'phys', P); }); assert(B.killed.includes(R)); B.over = 'win'; const rep = C.finishBattle(s, B); assert(rep.xp > 0, 'обычная добыча за возвращённого');
});

console.log('Сила (concept-duel)');
t('Клинок Нулевой Возможности далеко выше клинков Истока (4 босса), живучесть: 0 урона, доживает до предела', () => {
  const run = (a) => { const o = require('child_process').execFileSync('node', [path.join(__dirname, '../tools/concept-duel.js')].concat(a, ['--json']), { encoding: 'utf8' }).trim().split('\n'); return JSON.parse(o[o.length - 1]); };
  [['ember_titan', '47'], ['frost_queen', '47'], ['void_sovereign', '47'], ['ember_titan', '52']].forEach(([b, l]) => { const r = run(['10', b, l]); assert.strictEqual(r[ID].win, 1); assert(r[ID].turnsToWin * 2 <= Math.min(r.prime_cause.turnsToWin, r.zero_law.turnsToWin, r.first_division.turnsToWin), b + ' ' + l + ': ' + r[ID].turnsToWin + ' vs ' + r.first_division.turnsToWin); });
  const k = run(['10', 'void_sovereign', '60', '--tank']); assert.strictEqual(k[ID].alive300, 1); assert.strictEqual(k[ID].takenPerEnemyTurn, 0);
});

console.log(`\nДо существования: ${pass} ✓, ${fail} ✗`);
if (fail) process.exit(1);
