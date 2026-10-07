/* Пошаговый бой: очередь по скорости, ресурсы класса, стихии и реакции, статусы, ИИ врагов и союзников. */
(function () {
  const RPG = globalThis.RPG || (globalThis.RPG = {});
  const D = RPG.D, E = RPG.E;
  const C = RPG.C = {};
  C.TUNE = { hp: 2.0, atk: 3.2, lateHp: 2.6, lateAtk: 1.3, lateFrom: 30, lateBoss: 0.9, bossPlus: 1.2, bossPlusFrom: 50, bossPlusTo: 90, hitCap: [0.3, 0.12], hitCapFrom: 30, hitCapTo: 80, actCapMul: 3 };   // hitCap: макс. доля HP босса за один удар (от ур. 30: 30% → к ур. 80: 12%) — боссы поздних арок не умирают с одного-двух ударов; за одно действие (многоударный навык) — не более ×3 от лимита удара   // bossPlus: доп. HP боссов поздних арок (до +120% к ур. 90+), минибоссов — вдвое меньше
  const SKL = (id) => D.SKILLS[id] || D.ESK[id];
  const clamp = E.clamp;
  const isDeb = (s) => { const k = D.ST[s.id].k; return k === 'debuff' || k === 'dot' || k === 'ctrl'; };
  const cleanable = (s) => isDeb(s) && !D.ST[s.id].fixed;   // fixed: Распад, Тепловая смерть, Горение Пламени Первого Пожара — обычное очищение не снимает
  const big = (t) => t.role === 'boss' || t.role === 'mini';

  // ───── Создание юнитов ─────
  C.unitFromSlot = function (slot) {
    const h = slot.hero, d = E.derive(slot), cls = D.CLASSES[h.cls], run = slot.run;
    const u = base({ id: 'p', side: 'a', name: h.name, cls: h.cls, lv: h.level, hero: true, portrait: h.portrait, ic: cls.ic, tags: ['human'] }, d);
    u.skb = d.skb; u.sk = E.skillsOf(h).concat(E.gearSkills ? E.gearSkills(slot.eq) : []); u.ov = {};
    if (h.uniq) {
      const U = D.UNIQ[h.uniq], sid = 'u_' + h.uniq, sk0 = JSON.parse(JSON.stringify(D.SKILLS[sid]));
      let cdm = 0, mpm = 0;
      U.nodes.forEach(n => { const r = h.uspent[n.id] || 0; if (!r) return; if (n.e.cdm) cdm += n.e.cdm * r; if (n.e.mpm) mpm += n.e.mpm * r;
        (n.e.fxAdd || []).forEach(f => { const g = JSON.parse(JSON.stringify(f)); const rk = g.rank ? r : 1; delete g.rank; if (g.m != null) g.m *= rk; if (g.v != null) g.v *= rk; if (g.pow != null) g.pow *= rk; sk0.fx.push(g); }); });
      sk0.cd = Math.max(1, (sk0.cd || 0) - cdm); sk0.mp = Math.max(4, (sk0.mp || 0) - mpm); u.ov[sid] = sk0;
    }
    u.rcMax = cls.rc.max; u.rc = 0; u.cls = h.cls;
    if (run && run.hp != null) { u.hp = clamp(run.hp, 1, u.maxHp); u.mp = clamp(run.mp, 0, u.maxMp); }
    u.slotRef = true; return u;
  };
  C.baseUnit = base;
  function base(o, d) {
    return Object.assign({ hp: d.maxHp, maxHp: d.maxHp, mp: d.maxMp, maxMp: d.maxMp, rc: 0, rcMax: 100, atk: d.atk, mag: d.mag, hpow: d.hpow, def: d.def, res: d.res, spd: d.spd, crit: d.crit, critRaw: d.critRaw == null ? d.crit : d.critRaw, critDmg: d.critDmg, eva: d.eva, mods: d.mods || {}, sub: d.sub || {}, skb: {}, st: [], cds: {}, gauge: 0, alive: true, weak: [], resist: [], sk: [], ov: {}, takenSince: 0, tags: [], turns: 0, ai: false }, o);
  }
  C.fakeSlot = function (cls, L, race) {
    const slot = { hero: { cls, race: race || 'human', level: L, spent: {}, uspent: {}, name: 'x', prof1: null, prof2: null }, eq: {}, profs: {}, buffs: [] };
    const rng = E.rng(L * 7 + cls.length);
    const bs = { warrior: ['sword', 'head_h', 'body_h', 'boots_h'], mage: ['staff', 'head_c', 'body_c', 'boots_c'], rogue: ['dagger', 'head_l', 'body_l', 'boots_l'], healer: ['wand', 'head_c', 'body_c', 'boots_c'], shield: ['shield', 'head_h', 'body_h', 'boots_h'] }[cls];
    ['weapon', 'head', 'body', 'boots'].forEach((s, i) => { slot.eq[s] = E.genItem(rng, { base: bs[i], il: Math.max(1, L - 1), rarity: 0 }); });
    return slot;
  };
  C.unitFromComp = function (cid, L, hpFrac) {
    const c = D.COMPANIONS[cid], fs = C.fakeSlot(c.cls, L, c.race), d = E.derive(fs), k = c.k || 0.92;
    ['maxHp', 'atk', 'mag', 'hpow', 'def', 'res'].forEach(s => d[s] = Math.round(d[s] * k));
    const u = base({ id: cid, side: 'a', name: c.n, cls: c.cls, lv: L, portrait: c.portrait, ic: c.ic, ai: true, tags: [c.race === 'human' ? 'human' : c.race] }, d);
    u.sk = c.skills.slice(); u.rcMax = D.CLASSES[c.cls].rc.max; u.hp = Math.round(u.maxHp * (hpFrac == null ? 1 : hpFrac)); u.mp = u.maxMp; u.compSlot = c; return u;
  };
  C.unitFromEnemy = function (eid, lv, tier, elite, idn) {
    const t = D.ENEMIES[eid], R = D.ROLES[t.role], tm = D.TIERS[tier || 0].mul, L = lv;
    const ramp = Math.min(1, (L + 1) / 12), th = 1 + (C.TUNE.hp - 1) * ramp, ta = 1 + (C.TUNE.atk - 1) * ramp;
    const lt = Math.max(1, L / C.TUNE.lateFrom), lh = Math.pow(lt, C.TUNE.lateHp + (t.role === 'boss' ? C.TUNE.lateBoss : t.role === 'mini' ? C.TUNE.lateBoss * 0.6 : 0)), la = Math.pow(lt, C.TUNE.lateAtk);
    const bp = t.role === 'boss' || t.role === 'mini' ? 1 + C.TUNE.bossPlus * (t.role === 'mini' ? 0.5 : 1) * Math.max(0, Math.min(1, (L - C.TUNE.bossPlusFrom) / (C.TUNE.bossPlusTo - C.TUNE.bossPlusFrom))) : 1;
    const hp = (30 + 22 * L + 1.0 * L * L) * R.hp * tm * (elite ? 1.35 : 1) * th * lh * bp, atk = (8 + 3.4 * L) * R.atk * (1 + (tm - 1) * 0.55) * (elite ? 1.15 : 1) * ta * la, def = (4 + 2.6 * L) * R.def;
    const u = base({ id: idn, side: 'e', eid, role: t.role, name: (elite ? 'Закалённый ' : '') + t.n.replace(/^(.)/, (m, a) => elite ? a.toLowerCase() : a), lv: L, ic: t.ic, tags: t.tags.slice(), weak: t.weak || [], resist: t.res || [], elite: !!elite, ai: true, tier: tier || 0 },
      { maxHp: Math.round(hp), maxMp: 999, atk, mag: atk, hpow: atk, def, res: def * 0.9, spd: (10 + L * 0.25) * R.spd, crit: 5, critDmg: 1.5, eva: t.role === 'skirm' ? 8 : 2 });
    u.sk = t.sk.slice(); u.mp = 999; u.maxMp = 999; u.phase = 1; u.el = t.el || null; u.sub = { statRes: t.role === 'boss' ? 30 : t.role === 'mini' ? 12 : 0, resEl: {} }; return u;
  };

  // ───── Бой ─────
  C.create = function (party, foes, rng, opts) {
    const B = { party, foes, units: party.concat(foes), rng, log: [], ev: [], over: null, cur: null, opts: opts || {}, stolen: 0, nextId: 1, cons: opts && opts.cons || {}, round: 0, potionK: (opts && opts.potionK) || 1, bombK: (opts && opts.bombK) || 1, killed: [] };
    B.units.forEach(u => { u.gauge = rng() * 35 + (u.sub && u.sub.init || 0); if (u.mods.startShield) addSt(B, u, u, 'shield', 5, u.maxHp * u.mods.startShield / 100); if (u.mods.startHaste) addSt(B, u, u, 'haste', u.mods.startHaste + 1); u.reviveUsed = false; u.denyUsed = false; u.rewUsed = false; u.acts = 0; u.heat = 0; u._snapCur = { hp: u.hp, mp: u.mp }; });
    B.units.forEach(u => { u.takenTot = 0; u.erased = 0; u.kills = 0; u.devStack = 0; u.immDebt = 0; if ((u.mods.mantra > 0 || u.mods.mantraMag > 0 || u.mods.mantraTime > 0) && u.side === 'a') { u.m0 = { atk: u.atk, def: u.def, spd: u.spd, mag: u.mag, res: u.res, hpow: u.hpow }; u.mst = 0; u.mgs = 0; } });
    B.law = {};
    B.units.forEach(u => { if (u.side === 'a' && u.mods.tyrant > 0) alive(B.foes).forEach(e => { addSt(B, u, e, 'tyrant', 99); e.gauge -= 20 * Math.min(2, u.mods.tyrant); }); });
    foes.forEach(e => intent(B, e));
    return B;
  };
  const side = (B, u) => u.side === 'a' ? B.party : B.foes;
  const opp = (B, u) => u.side === 'a' ? B.foes : B.party;
  const alive = (arr) => arr.filter(x => x.alive);
  C.alive = alive;
  const has = (u, id) => u.st.find(s => s.id === id);
  C.has = has;
  const msg = (B, s) => { B.log.push(s); if (B.log.length > 80) B.log.shift(); };
  const ev = (B, o) => B.ev.push(o);
  function spdOf(u) { let s = u.spd; u.st.forEach(x => { const d = D.ST[x.id]; if (d.spd) s *= 1 + d.spd; }); return Math.max(1, s); }
  C.spdOf = spdOf;

  function addSt(B, src, tgt, id, dur, pow) {
    if (!tgt.alive) return;
    const def = D.ST[id]; let s = has(tgt, id);
    const foe = src && src.side && src.side !== tgt.side, deb = def.k === 'debuff' || def.k === 'dot' || def.k === 'ctrl';
    if (foe && deb && tgt.mods.srcForm > 0 && !tgt._formUsed) { tgt._formUsed = true; if (B.rng() * 100 < tgt.mods.srcForm) { ev(B, { t: 'txt', u: tgt.id, s: 'Вода приняла форму' }); msg(B, tgt.name + ': «' + def.n + '» растворяется'); return; } }   // ✧ «Вода принимает любую форму»
    if (foe && deb && tgt.mods.chronoShort > 0 && dur < 90) dur = Math.max(1, dur - tgt.mods.chronoShort);   // «Вне мгновения»
    if (id === 'shield' && has(tgt, 'heatDeath')) pow *= 0.2;   // ✧ Тепловая смерть: щиты −80%
    if (id === 'shield') { if (s) { s.pow += pow; s.dur = Math.max(s.dur, dur); } else tgt.st.push({ id, dur, pow, src: src.id }); }
    else if (s) { s.dur = Math.max(s.dur, dur); s.pow = Math.max(s.pow || 0, pow || 0); }
    else tgt.st.push({ id, dur, pow: pow || 0, src: src.id });
    ev(B, { t: 'st', u: tgt.id, id, on: 1 });
  }
  function rmSt(tgt, id) { const i = tgt.st.findIndex(s => s.id === id); if (i >= 0) tgt.st.splice(i, 1); }
  C.addSt = addSt;

  // Следующий исполнитель. Возвращает юнит, ожидающий команды игрока, или null (ход обработан автоматически / бой окончен).
  C.next = function (B) {
    if (B.over) return null;
    if (!B.cur) {
      let best = null, bt = 1e9;
      for (const u of B.units) { if (!u.alive) continue; const t = (100 - u.gauge) / spdOf(u); if (t < bt - 1e-9 || (Math.abs(t - bt) < 1e-9 && best && u.side === 'a' && best.side === 'e')) { bt = t; best = u; } }
      if (!best) { B.over = 'lose'; return null; }
      const adv = Math.max(0, bt); B.units.forEach(u => { if (u.alive) u.gauge += adv * spdOf(u); });
      best.gauge -= 100; B.cur = best; B.round++; startTurn(B, best); check(B);
      if (!best.alive || B.over) { B.cur = null; return null; }
      if (best.skip) { best.skip = false; endTurn(B, best); return null; }
    }
    const u = B.cur;
    const manual = u.side === 'a' && u.crewUnit && B.opts.cmd && !B.opts.auto && !(u.loy < 20 && B.rng() < 0.25);
    if (manual) return u;
    if (u.ai || (B.opts.auto && u.side === 'a')) { C.act(B, u, C.choose(B, u)); return null; }
    return u;
  };
  function startTurn(B, u) {
    u.turns++; u.skip = false; u._formUsed = false;
    if (u.mods.chronoRewind > 0) { u._snapPrev = u._snapCur || { hp: u.hp, mp: u.mp }; u._snapCur = { hp: u.hp, mp: u.mp }; }   // ✧ «То, чего ещё не произошло»: снимки начала ходов
    if (u.m0 && u.alive) {
      const cap = (v) => Math.max(0, Math.min(8, v || 0));
      if (u.mods.mantra > 0) { u.mst = Math.min(cap(u.mods.mantra), u.mst + 1); const k = Math.pow(2, u.mst); u.atk = u.m0.atk * k; u.def = u.m0.def * k; ev(B, { t: 'txt', u: u.id, s: 'Мантра ×' + k }); msg(B, u.name + ': Мантра Силы ×' + k); }
      if (u.mods.mantraMag > 0) { u.mgs = Math.min(cap(u.mods.mantraMag), u.mgs + 1); const k = Math.pow(2, u.mgs); u.mag = u.m0.mag * k; u.res = u.m0.res * k; u.hpow = u.m0.hpow * k; ev(B, { t: 'txt', u: u.id, s: 'Разум ×' + k }); msg(B, u.name + ': Мантра Разума ×' + k); }
      u.spd = u.m0.spd * (1 + 0.12 * u.mst + (u.mods.mantraTime > 0 ? 0.2 * Math.min(cap(u.mods.mantraTime), u.turns) : 0));
      const ms = has(u, 'mantra'); if (ms) { ms.pow = u.mst + u.mgs; ms.dur = 99; } else u.st.push({ id: 'mantra', dur: 99, pow: u.mst + u.mgs, src: u.id });
    }
    if (u.side === 'e' && u.turns > 10) { u.atk *= 1.07; u.mag *= 1.07; if (u.turns === 11) msg(B, u.name + ' теряет терпение…'); }
    for (const id in u.cds) if (u.cds[id] > 0) { u.cds[id]--; if (u.cds[id] > 0 && u.sub && u.sub.cdr && B.rng() * 100 < u.sub.cdr) u.cds[id]--; }
    // сначала регенерация и DoT
    const hr = (u.mods.hpRegen || 0); if (hr) heal(B, u, u, u.maxHp * hr / 100, true);
    if (u.mods.srcRegen > 0) heal(B, u, u, u.maxHp * u.mods.srcRegen / 100, true, true);   // «Восстановление потока»
    (has(u, 'regen') ? [has(u, 'regen')] : []).forEach(s => heal(B, { id: s.src, hpow: s.pow }, u, s.pow, true, true));
    u.st.filter(s => D.ST[s.id].k === 'dot').forEach(s => { if (!u.alive) return; const v = Math.max(1, Math.round(s.pow * (1 - clamp(u.sub && u.sub.tenac || 0, 0, 70) / 100) * (1 - clamp(u.mods.dotTaken || 0, 0, 90) / 100))); hurt(B, u, v, D.ST[s.id].el, null, true); ev(B, { t: 'dot', u: u.id, id: s.id, v }); msg(B, u.name + ': ' + D.ST[s.id].n + ' −' + v); });
    if (!u.alive) return;
    // ✧ «Жажда Эдема»: в начале хода владельца, если у любого живого врага текущее HP больше текущего HP владельца — +X% макс. HP
    if (u.mods.edenThirst > 0 && alive(opp(B, u)).some(e => e.hp > u.hp)) { const v = heal(B, u, u, u.maxHp * u.mods.edenThirst / 100, true, true); if (v) { ev(B, { t: 'txt', u: u.id, s: 'Жажда Эдема +' + v }); msg(B, u.name + ': Жажда Эдема +' + v + ' HP'); } }
    const c = has(u, 'stun') || has(u, 'freeze') || has(u, 'stop') || has(u, 'chronoStop');
    if (c) { u.skip = true; msg(B, u.name + ' пропускает ход (' + D.ST[c.id].n + ')'); ev(B, { t: 'skip', u: u.id, id: c.id }); rmSt(u, c.id); }
    const dm = has(u, 'dominate');
    if (dm && u.alive) {
      u.skip = true; const others = alive(side(B, u)).filter(x => x !== u);
      if (others.length) { const t = others[Math.floor(B.rng() * others.length)]; const v = Math.max(1, Math.round(u.atk * 1.25 * 100 / (100 + t.def * 0.5))); const real = hurt(B, t, v, 'phys', null); ev(B, { t: 'dmg', u: t.id, from: u.id, v: real }); msg(B, u.name + ' подчинён и бьёт своих: ' + t.name + ' −' + real); }
      else msg(B, u.name + ' подчинён и стоит как вкопанный');
      ev(B, { t: 'skip', u: u.id, id: 'dominate' });
    }
  }
  function endTurn(B, u) {
    if (u.hero && B.law) for (const k in B.law) { B.law[k]--; if (B.law[k] <= 0) delete B.law[k]; }
    const imm = has(u, 'immortal'); if (imm && imm.dur <= 1 && u.alive && u.immDebt > 0) { const debt = Math.round(u.immDebt * 0.5); u.immDebt = 0; ev(B, { t: 'txt', u: u.id, s: 'Расплата −' + debt }); msg(B, u.name + ': расплата за бессмертие −' + debt); hurt(B, u, debt, 'phys', null, true); }
    u.st.forEach(s => s.dur--); u.st = u.st.filter(s => s.dur > 0 && !(s.id === 'shield' && s.pow <= 0));
    if (u.alive && u.side === 'e') intent(B, u);
    if (u.alive && u.side === 'a') { u.mp = Math.min(u.maxMp, u.mp + (2 + (u.mods.mpRegen || 0)) * (has(u, 'heatDeath') ? 0.5 : 1)); }
    B.cur = null; check(B);
  }
  function check(B) {
    if (!alive(B.foes).length) B.over = 'win'; else if (!B.party[0].alive) B.over = 'lose';
    else if (!alive(B.party).length) B.over = 'lose';
  }

  // ───── Урон/лечение ─────
  function absorb(B, tgt, v) {
    const s = has(tgt, 'shield'); if (!s || s.pow <= 0) return v;
    const a = Math.min(s.pow, v); s.pow -= a; ev(B, { t: 'abs', u: tgt.id, v: Math.round(a) }); return v - a;
  }
  function hurt(B, tgt, v, el, src, dot) {
    if (!tgt.alive) return 0;
    if (!dot && v > 0 && tgt.mods.erase && (tgt.erased || 0) < tgt.mods.erase) { tgt.erased++; ev(B, { t: 'txt', u: tgt.id, s: 'Стёрто!' }); msg(B, 'Удар по ' + tgt.name + ' стёрт из реальности'); return 0; }
    if (v > 0 && src && src.el === 'dark' && src.side !== tgt.side && tgt.mods.edenDark > 0) v *= 1 - Math.min(90, tgt.mods.edenDark) / 100;   // ✧ «Рассвет над Тьмой»
    if (v > 0 && src && src.el === 'light' && src.side !== tgt.side && tgt.mods.abyssLight > 0) v *= 1 - Math.min(90, tgt.mods.abyssLight) / 100;   // ✧ «Угасание Света»
    if (v > 0 && !dot && src && src.mods && src.mods.entHeat > 0 && src.side !== tgt.side && has(tgt, 'heatDeath')) v *= 1 + src.mods.entHeat / 100;   // ✧ Тепловая смерть: +35% урона владельца
    if (!dot) v = absorb(B, tgt, v);
    v = Math.max(0, Math.round(v));
    const rf = has(tgt, 'reflect'); if (rf && !dot && src && src.alive && src.side !== tgt.side && v > 0) { const back = Math.round(v * rf.pow * 1.5); v = Math.round(v * (1 - rf.pow)); ev(B, { t: 'txt', u: tgt.id, s: 'Обращено!' }); msg(B, tgt.name + ' обращает урон на ' + src.name + ' (' + back + ')'); const rr = hurt(B, src, back, 'arcane', null, true); ev(B, { t: 'dmg', u: src.id, from: tgt.id, v: rr, thorn: 1 }); }
    if (has(tgt, 'immortal') && tgt.hp - v < 1) { const cut = Math.max(0, tgt.hp - 1); tgt.immDebt = (tgt.immDebt || 0) + (v - cut); v = cut; if (!tgt._immTxt) { tgt._immTxt = 1; ev(B, { t: 'txt', u: tgt.id, s: 'Бессмертен!' }); } }
    if (v > 0 && tgt.side === 'e' && tgt.role === 'boss' && tgt.lv >= C.TUNE.hitCapFrom) { const k = clamp((tgt.lv - C.TUNE.hitCapFrom) / (C.TUNE.hitCapTo - C.TUNE.hitCapFrom), 0, 1), cap = Math.max(1, Math.round(tgt.maxHp * (C.TUNE.hitCap[0] + (C.TUNE.hitCap[1] - C.TUNE.hitCap[0]) * k))); if (v > cap) v = cap; if (tgt._seq !== B.actSeq) { tgt._seq = B.actSeq; tgt._acc = 0; } const room = Math.max(0, cap * C.TUNE.actCapMul - tgt._acc); if (v > room) v = Math.round(room); tgt._acc += v; }
    tgt.hp -= v; tgt.takenSince += v; tgt.takenTot = (tgt.takenTot || 0) + v;
    if (v > 0 && el === 'light' && src && src.side !== tgt.side && tgt.mods.abyssLight > 0 && tgt.hp > 0) addSt(B, tgt, tgt, 'abyssDusk', 1);
    if (v > 0 && src && src.mods && src.mods.entDecay > 0 && src.side !== tgt.side && tgt.hp > 0) addDecay(B, src, tgt, 1);   // ✧ «Энтропия всегда возрастает»
    if (tgt.mods.chronoRewind > 0 && !tgt.rewUsed && tgt.hp < tgt.maxHp * tgt.mods.chronoRewind / 100) {   // ✧ «То, чего ещё не произошло»
      tgt.rewUsed = true; const sn = (B.cur === tgt ? tgt._snapPrev : tgt._snapCur) || tgt._snapCur || { hp: tgt.maxHp, mp: tgt.mp };
      tgt.hp = clamp(Math.round(sn.hp), Math.max(1, tgt.hp), tgt.maxHp); tgt.mp = clamp(Math.round(sn.mp), 0, tgt.maxMp); ev(B, { t: 'txt', u: tgt.id, s: 'Откат времени' }); msg(B, tgt.name + ': время откатилось — HP ' + tgt.hp + ', мана ' + tgt.mp);
    }
    if (v > 0 && tgt.side === 'a') { const c = D.CLASSES[tgt.cls]; if (c && !dot && tgt.hero) tgt.rc = clamp(tgt.rc + (c.rc.taken || 0), 0, tgt.rcMax); }
    if (tgt.hp <= 0) {
      if (tgt.mods.secondLife && !tgt.slUsed) { tgt.slUsed = true; tgt.hp = Math.round(tgt.maxHp * Math.min(0.9, 0.35 + tgt.mods.secondLife * 0.15)); tgt.st = tgt.st.filter(x => !cleanable(x)); addSt(B, tgt, tgt, 'immortal', 2); ev(B, { t: 'revive', u: tgt.id }); msg(B, tgt.name + ': Вторая жизнь!'); return v; }
      if (tgt.mods.hellDeny > 0 && !tgt.denyUsed) { tgt.denyUsed = true; tgt.hp = 1; addSt(B, tgt, tgt, 'shield', 5, tgt.maxHp * tgt.mods.hellDeny / 100); ev(B, { t: 'txt', u: tgt.id, s: 'Отрицание смерти' }); msg(B, tgt.name + ': Отрицание смерти — 1 HP и щит'); return v; }
      if ((tgt.mods.reviveOnce || tgt.mods.reviveFull) && !tgt.reviveUsed) { tgt.reviveUsed = true; tgt.hp = Math.round(tgt.maxHp * (tgt.mods.reviveFull ? 1 : 0.3)); if (tgt.mods.reviveFull) tgt.st = tgt.st.filter(x => !cleanable(x)); ev(B, { t: 'revive', u: tgt.id }); msg(B, tgt.name + ' возрождается!'); return v; }
      tgt.hp = 0; tgt.alive = false; tgt.st = []; ev(B, { t: 'death', u: tgt.id }); msg(B, tgt.name + ' повержен.'); if (tgt.side === 'e') { B.killed.push(tgt); if (src) src.kills = (src.kills || 0) + 1; if (src && src.alive && src.mods) { if (src.mods.killRc) src.rc = clamp(src.rc + src.mods.killRc, 0, src.rcMax); if (src.mods.killMp) src.mp = Math.min(src.maxMp, src.mp + src.mods.killMp); } if (src && src.alive && src.mods && src.mods.hellFeast > 0) { heal(B, src, src, src.maxHp * src.mods.hellFeast / 100, true, true); src.mp = Math.min(src.maxMp, src.mp + Math.round(src.maxMp * 0.2)); ev(B, { t: 'txt', u: src.id, s: 'Пир Падших' }); msg(B, src.name + ': Пир Падших'); } if (src && src.alive && src.mods && src.mods.devour) { heal(B, src, src, src.maxHp * src.mods.devour / 100, true, true); src.mp = Math.min(src.maxMp, src.mp + Math.round(src.maxMp * src.mods.devour / 200)); ev(B, { t: 'txt', u: src.id, s: 'Пожрано' }); } }
    } else if (tgt.side === 'e' && tgt.role && (tgt.role === 'boss' || tgt.role === 'mini') && tgt.phase === 1 && tgt.hp <= tgt.maxHp * 0.5) {
      tgt.phase = 2; addSt(B, tgt, tgt, 'enrage', 99); ev(B, { t: 'phase', u: tgt.id }); msg(B, tgt.name + ' впадает в ярость!');
    }
    return v;
  }
  function heal(B, src, tgt, amount, silent, raw) {
    if (!tgt.alive) return 0;
    if (B.law && B.law.noheal > 0 && tgt.side === 'e') return 0;
    let v = amount; if (!raw) v *= 1 + (tgt.mods.healIn || 0) / 100;
    const dc = has(tgt, 'decay'); if (dc) v *= Math.max(0, 1 - 0.05 * dc.pow); if (has(tgt, 'heatDeath')) v *= 0.2;   // ✧ Распад / Тепловая смерть
    const over = v - (tgt.maxHp - tgt.hp);
    if (over > 0 && tgt.mods.srcOverflow > 0) { const cap = tgt.maxHp * tgt.mods.srcOverflow / 100, sh = has(tgt, 'shield'), cur = sh ? sh.pow : 0, add = Math.round(Math.min(over, cap - cur)); if (add > 0) { addSt(B, tgt, tgt, 'shield', 3, add); ev(B, { t: 'txt', u: tgt.id, s: 'Обратное течение +' + add }); } }   // ✧ «Обратное течение»
    v = Math.round(Math.min(v, tgt.maxHp - tgt.hp)); if (v <= 0) return 0;
    tgt.hp += v;
    if (B.units && alive(opp(B, tgt)).some(x => x.mods && x.mods.entIrrev > 0)) { const k = alive(opp(B, tgt)).reduce((a, x) => Math.max(a, x.mods.entIrrev || 0), 0) * (big(tgt) ? 0.25 : 1), loss = Math.round(v * k / 100); if (loss > 0) { tgt.maxHp = Math.max(1, tgt.maxHp - loss); tgt.hp = Math.min(tgt.hp, tgt.maxHp); tgt.lostMax = (tgt.lostMax || 0) + loss; } }   // ✧ «Закон необратимости» (боссы: 20%×0.25 = 5%) ev(B, { t: 'heal', u: tgt.id, v }); if (!silent) msg(B, tgt.name + ' +' + v + ' HP'); return v;
  }
  const stMod = (u, k) => { let s = 0; u.st.forEach(x => { const d = D.ST[x.id]; if (d[k]) s += d[k] * (d.per ? (x.pow || 1) : 1); }); return s; };

  // ✧ условные бонусы концептуальных клинков к наносимому урону (доля: 0.3 = +30%)
  const hellStacks = (a) => a.mods && a.mods.hellPrice > 0 ? Math.min(a.mods.hellPrice, Math.floor((1 - a.hp / a.maxHp) * 10 + 1e-9)) : 0;
  function cxBonus(a) {
    const m = a.mods || {}; let b = 0;
    if (m.hellPact > 0 && a.hp < a.maxHp * 0.5) b += m.hellPact / 100;   // «Кровавый договор»
    b += 0.06 * hellStacks(a);   // ✧ «Цена силы»
    if (m.flameHeat > 0) b += Math.min(25, m.flameHeat * (a.heat || 0)) / 100;   // «Жар битвы»
    return b;
  }
  C._cxBonus = cxBonus;
  // множитель стихий/получаемого урона цели (без брони) — для концептуальных навыков
  function redK(B, tgt, el) {
    let k = 1; const tsub = tgt.sub || {};
    if (el && el !== 'phys') { if (tgt.weak.includes(el)) k *= 1.35; else if (tgt.resist.includes(el)) k *= 0.6; else if (tgt.el) { if (tgt.el === el) k *= 0.75; else if ((D.ELEM_BEATS[el] || []).includes(tgt.el)) k *= 1.2; } }
    if (tsub.resEl && tsub.resEl[el]) k *= 1 - clamp(tsub.resEl[el], -50, 75) / 100;
    let tk = 1 + (tgt.mods.taken || 0) / 100 + stMod(tgt, 'taken'); if (tgt.mods.lowTaken && tgt.hp < tgt.maxHp * 0.3) tk -= tgt.mods.lowTaken / 100;
    return k * Math.max(0.2, tk);
  }
  // концептуальный урон: тег 'concept' — его режет «Сопротивление концептуальному урону»
  function cHurt(B, u, t, v, el, note) {
    if (!t.alive) return 0; v = Math.max(1, v); if (t.mods.conceptRes > 0) v *= 1 - clamp(t.mods.conceptRes, 0, 75) / 100;
    const real = hurt(B, t, Math.round(v), el, u); ev(B, { t: 'dmg', u: t.id, from: u.id, v: real, el, notes: [], concept: 1 }); msg(B, '→ ' + t.name + ' −' + real + (note ? ' (' + note + ')' : ''));
    if (real > 0) onHit(B, u, t, false); return real;
  }
  C._cHurt = cHurt;
  // доля потерянного HP цели; у боссов/минибоссов ограничена bossLost × макс. HP владельца
  const lostPart = (u, t, eff) => { const v = (t.maxHp - t.hp) * (eff.lost || 0); return big(t) && eff.bossLost != null ? Math.min(v, u.maxHp * eff.bossLost) : v; };
  C._lostPart = lostPart;
  // после удара владельца: «Раскалённая сталь», «Воспламенение»
  function onHit(B, u, t, crit) {
    if (!t.alive || u.side === t.side) return;
    if (u.mods.flameSteel > 0) addSt(B, u, t, 'fburn', 3, Math.max(1, u.atk * u.mods.flameSteel / 100));
    if (crit && u.mods.flameIgnite > 0) { let tot = 0; t.st.forEach(s => { if (s.id === 'burn' || s.id === 'fburn' || s.id === 'primal') tot += (s.pow || 0) * Math.max(0, s.dur); }); if (tot > 0) { const r = hurt(B, t, Math.round(tot), 'fire', u, true); ev(B, { t: 'dmg', u: t.id, from: u.id, v: r, el: 'fire', notes: [] }); ev(B, { t: 'txt', u: t.id, s: 'Воспламенение!' }); msg(B, 'Воспламенение: ' + t.name + ' −' + r); } }
  }
  function addDecay(B, src, tgt, n) {
    if (!tgt.alive) return; const mx = src.mods.entDecay || 6; let s = has(tgt, 'decay'); const prev = s ? s.pow : 0, nw = Math.min(mx, prev + n);
    if (!s) { s = { id: 'decay', dur: 99, pow: nw, src: src.id }; tgt.st.push(s); } else { s.pow = nw; s.dur = 99; }
    ev(B, { t: 'st', u: tgt.id, id: 'decay', on: 1 });
    if (prev < mx && nw >= mx && src.mods.entHeat > 0) { const sh = has(tgt, 'shield'); if (sh) sh.pow *= 0.2; addSt(B, src, tgt, 'heatDeath', 2); ev(B, { t: 'txt', u: tgt.id, s: 'Тепловая смерть' }); msg(B, tgt.name + ': Тепловая смерть'); }
  }
  C._addDecay = addDecay;
  function dmgCalc(B, att, tgt, eff, skill, spent) {
    const stat = att[eff.s || 'atk']; const asub = att.sub || {}, tsub = tgt.sub || {};
    let m = eff.m; if (eff.rcMul) m += eff.rcMul * spent;
    let base = stat * m; if (eff.fromTaken) { base += att.takenSince * eff.fromTaken; att.takenSince = 0; }
    const el = eff.el || 'phys', notes = [];
    const skb = (att.skb && att.skb[skill.id]) || 0; base *= 1 + skb / 100;
    let mul = 1 + (att.mods.dmg || 0) / 100 + (att.mods['dmg_' + el] || 0) / 100 + stMod(att, 'dealt');
    if (tgt.tags.includes('beast') && att.mods.beastDmg) mul += att.mods.beastDmg / 100;
    if (att.mods.execute && tgt.hp < tgt.maxHp * 0.3) mul += att.mods.execute / 100;
    if (asub.bossDmg && (tgt.role === 'boss' || tgt.role === 'mini')) mul += asub.bossDmg / 100;
    const am = att.mods; if (am.lowDmg && att.hp < att.maxHp * 0.3) mul += am.lowDmg / 100; if (am.fullDmg && att.hp > att.maxHp * 0.8) mul += am.fullDmg / 100; if (am.openDmg && att.turns <= 2) mul += am.openDmg / 100;
    if (am.perCrew) mul += am.perCrew / 100 * Math.max(0, alive(side(B, att)).length - 1); if (am.debuffDmg && tgt.st.some(isDeb)) mul += am.debuffDmg / 100;
    if (am.killStack) mul += am.killStack / 100 * Math.min(10, att.kills || 0); if (am.growDmg) mul += am.growDmg / 100 * Math.min(12, Math.max(0, att.turns - 1));
    if (am.foeDmg) mul += am.foeDmg / 100 * alive(opp(B, att)).length; if (att.devStack) mul += 0.06 * Math.min(20, att.devStack);
    mul += cxBonus(att);
    if (am.dmgMul) mul *= 1 + am.dmgMul / 100; if (tgt.role === 'boss' && am.bossMul) mul *= 1 + am.bossMul / 100;
    if (eff.ifLow && tgt.hp < tgt.maxHp * eff.ifLow) mul *= eff.lowMul;
    if (eff.ifAny && tgt.st.some(isDeb)) mul *= eff.ifMul;
    if (tgt.weak.includes(el)) { mul *= 1.35; notes.push('weak'); } else if (tgt.resist.includes(el)) { mul *= 0.6; notes.push('res'); }
    else if (tgt.el && el !== 'phys') { if (tgt.el === el) { mul *= 0.75; notes.push('res'); } else if ((D.ELEM_BEATS[el] || []).includes(tgt.el)) { mul *= 1.2; notes.push('weak'); } }
    if (tsub.resEl && tsub.resEl[el]) mul *= 1 - clamp(tsub.resEl[el], -50, 75) / 100;
    if (skill.id === 'h_smite' && tgt.tags.includes('undead')) mul *= 1.5;
    let react = null;
    if (el === 'bolt' && has(tgt, 'wet')) { mul *= 1.4; react = 'Проводимость'; rmSt(tgt, 'wet'); }
    else if (el === 'ice' && has(tgt, 'wet')) { react = 'Заморозка'; rmSt(tgt, 'wet'); tgt._freeze = true; }
    else if (el === 'fire' && has(tgt, 'chill')) { mul *= 1.3; react = 'Таяние'; rmSt(tgt, 'chill'); }
    let cc = att.crit + (eff.crit || 0) + stMod(att, 'crit'); let cdx = 0;
    if (am.abyssBack > 0) { cc = att.crit + (eff.crit || 0) + stMod(att, 'crit') + (tgt.hp > tgt.maxHp * 0.5 ? am.abyssBack : 0); if (cc > 80) { cdx = (cc - 80) * 2 / 100; cc = 80; } }   // ✧ «Тень за спиной»: сверх 80% → урон крита 1:2
    let crit = B.rng() * 100 < cc || (am.markCrit > 0 && has(tgt, 'mark')); if (crit && att.side === 'e' && B.law && B.law.nocrit > 0) crit = false; if (crit) { mul *= 1 + (att.critDmg + cdx - 1) * (1 - clamp(tsub.tenac || 0, 0, 70) / 100); if (tgt.mods.critTaken > 0) mul *= 1 - clamp(tgt.mods.critTaken, 0, 90) / 100; if (has(att, 'focus')) rmSt(att, 'focus'); }
    const penK = Math.min(0.9, (eff.pierce || 0) + ((eff.s === 'mag' ? asub.penMag : asub.pen) || 0) / 100 + hellStacks(att) * 0.04); const defv = (eff.s === 'mag' ? tgt.res : tgt.def) * (1 - penK) * (1 + stMod(tgt, 'def')) * (1 - clamp(am.entIgnore || 0, 0, 90) / 100);
    const K = 50 + 4 * tgt.lv, mit = K / (K + Math.max(0, defv));
    let tk = 1 + (tgt.mods.taken || 0) / 100 + stMod(tgt, 'taken') + (eff.s === 'mag' ? (tgt.mods.magTaken || 0) : (tgt.mods.physTaken || 0)) / 100;
    if (tgt.mods.lowTaken && tgt.hp < tgt.maxHp * 0.3) tk -= tgt.mods.lowTaken / 100;
    tk = Math.max(0.2, tk);
    const out = base * mul * mit * tk * (0.93 + B.rng() * 0.14);
    return { v: Math.max(1, Math.min(9e12, Math.round(out))), crit, notes, react };
  }

  // ───── Применение навыка ─────
  function targetsFor(B, u, sk, tid) {
    const own = alive(side(B, u)), en = alive(opp(B, u)), t = sk.tgt;
    if (t === 'foes') return en; if (t === 'self') return [u]; if (t === 'allies' || t === 'eallies') return own;
    if (t === 'rfoe') return en;
    if (t === 'dead') { const x = side(B, u).find(y => y.id === tid && !y.alive) || side(B, u).find(y => !y.alive); return x ? [x] : []; }
    if (t === 'ally' || t === 'eally') { const x = own.find(y => y.id === tid) || own.slice().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0]; return x ? [x] : []; }
    // foe
    let x = en.find(y => y.id === tid); if (!x) x = en[0];
    if (u.side === 'e') { const tn = en.find(y => has(y, 'taunt')); if (tn) x = tn; }
    else { const tn = en.find(y => has(y, 'taunt')); if (tn && !x) x = tn; }
    return x ? [x] : [];
  }
  function applyStatus(B, u, tgt, eff, skill) {
    if (eff.p != null && eff.p < 1 && B.rng() > eff.p) return;
    const id = eff.id; let pow = 0;
    if (id !== 'stop' && tgt.sub && tgt.sub.statRes && ['debuff', 'ctrl', 'dot'].includes(D.ST[id].k) && tgt.side !== u.side && B.rng() * 100 < tgt.sub.statRes) { ev(B, { t: 'txt', u: tgt.id, s: 'Сопротивление' }); return; }
    if (D.ST[id].k === 'ctrl' && tgt.side !== u.side && tgt.mods && tgt.mods.ccRes > 0 && B.rng() * 100 < clamp(tgt.mods.ccRes, 0, 75)) { ev(B, { t: 'txt', u: tgt.id, s: 'Сопротивление' }); return; }   // «Сопротивление эффектам контроля»
    if (tgt.side !== u.side && B.law && B.law.noctrl > 0 && D.ST[id].k === 'ctrl' && u.side === 'e') return;
    if (D.ST[id].k === 'dot') pow = Math.max(u.atk, u.mag) * ({ burn: 0.42, poison: 0.4, bleed: 0.36 }[id]) * (1 + (u.mods.dmg || 0) / 100 + (u.mods['dmg_' + D.ST[id].el] || 0) / 100) * (1 + ((u.skb && u.skb[skill.id]) || 0) / 200);
    if (id === 'regen') pow = u.hpow * (eff.pow || 0.5) * (1 + ((u.skb && u.skb[skill.id]) || 0) / 100);
    if (id === 'shield') pow = (u[eff.s === 'heal' ? 'hpow' : eff.s] || u.hpow) * (eff.pow || 1) * (eff.s === 'def' ? 1 : 1) * (eff.s === 'heal' ? 1 : 1) * (1 + ((u.skb && u.skb[skill.id]) || 0) / 100);
    if (eff.pow != null && !pow) pow = eff.pow;
    if (D.ST[id].k === 'ctrl' && tgt.role === 'boss' && id !== 'chill' && id !== 'stop') { if (B.rng() < 0.6) { ev(B, { t: 'txt', u: tgt.id, s: 'Сопротивление' }); return; } }
    if (D.ST[id].k === 'ctrl' && tgt.role === 'mini' && id !== 'stop' && B.rng() < 0.3) { ev(B, { t: 'txt', u: tgt.id, s: 'Сопротивление' }); return; }
    addSt(B, u, tgt, id, (eff.dur || 2) + (tgt === u && D.ST[id].k !== 'ctrl' && eff.to === 'self' ? 0 : 0), pow);
  }
  C.skillOf = (u, id) => (u.ov && u.ov[id]) || SKL(id);
  const mpCost = (u, sk) => Math.max(1, Math.round(sk.mp * (1 - clamp(u.sub && u.sub.manaEff || 0, 0, 60) / 100)));
  C.mpCost = mpCost;
  C.canUse = function (B, u, id) {
    const sk = C.skillOf(u, id); if (!sk) return 'нет навыка';
    if ((u.cds[id] || 0) > 0) return 'перезарядка ' + u.cds[id];
    if (sk.mp && u.mp < mpCost(u, sk)) return 'мало энергии';
    if (sk.rc && u.rc < sk.rc) return 'мало ресурса';
    if (sk.rcAll && u.rc < 1) return 'нет комбо';
    if (sk.tgt === 'dead' && !side(B, u).some(x => !x.alive)) return 'некого возвращать';
    return '';
  };
  function doSkill(B, u, sk, tid, opts) {
    opts = opts || {}; let targets = targetsFor(B, u, sk, tid); if (!targets.length) return;
    let spent = 0;
    if (!opts.free) { if (sk.mp) u.mp -= mpCost(u, sk); if (sk.rc) { u.rc -= sk.rc; spent = sk.rc; } if (sk.rcAll) { spent = u.rc; u.rc = 0; } if (sk.cd) u.cds[sk.id] = sk.cd + 0; if (sk.hpCost) u.hp = Math.max(1, u.hp - Math.round(u.maxHp * sk.hpCost)); }
    if (u.side === 'a' && sk.id !== 'basic' && !sk.noEcho) { u.lastSk = sk.id; u.lastTid = tid; }
    ev(B, { t: 'skill', u: u.id, id: sk.id, n: sk.n, ic: sk.ic, tg: targets.map(x => x.id) });
    msg(B, u.name + ': «' + sk.n + '»');
    let dealt = 0;
    const dealOne = (tgt, eff, scale, noDbl) => {
      if (!tgt.alive) return; scale = (scale || 1) * (opts.scale || 1);
      let T = tgt, mult = 1;
      if (u.side === 'e' && sk.tgt === 'foe') { const cv = alive(B.party).find(x => has(x, 'cover') && x !== tgt); if (cv && !has(tgt, 'taunt')) { T = cv; mult = 0.75; ev(B, { t: 'txt', u: cv.id, s: 'Прикрыл!' }); } }
      const eva = clamp(T.eva + stMod(T, 'eva') - (u.sub && u.sub.acc || 0), 0, 80);
      if (!eff.sure && B.rng() * 100 < eva) { ev(B, { t: 'miss', u: T.id }); msg(B, T.name + ' уклоняется'); return; }
      const r = dmgCalc(B, u, T, eff, sk, spent);
      let v = Math.round(r.v * mult * scale);
      if (eff.s !== 'mag' && T.sub && T.sub.blockCh && B.rng() * 100 < T.sub.blockCh) { v = Math.round(v * (1 - clamp(T.sub.blockPow || 30, 0, 90) / 100)); ev(B, { t: 'txt', u: T.id, s: 'Блок!' }); }
      if (r.react) { ev(B, { t: 'txt', u: T.id, s: r.react + '!' }); msg(B, 'Реакция: ' + r.react); }
      const real = hurt(B, T, v, eff.el || 'phys', u); dealt += real;
      ev(B, { t: 'dmg', u: T.id, from: u.id, v: real, crit: r.crit, el: eff.el || 'phys', notes: r.notes });
      msg(B, '→ ' + T.name + ' −' + real + (r.crit ? ' (крит!)' : '') + (r.notes.includes('weak') ? ' (слабость)' : r.notes.includes('res') ? ' (стойкость)' : ''));
      if (T._freeze && T.alive) { T._freeze = false; addSt(B, u, T, 'freeze', 1); }
      if (!noDbl && T.alive && u.sub && u.sub.dbl && B.rng() * 100 < u.sub.dbl) { ev(B, { t: 'txt', u: u.id, s: 'Двойной удар!' }); dealOne(T, eff, 0.5, true); }
      if (real > 0) onHit(B, u, T, r.crit);
      if (eff.drain && real) heal(B, u, u, real * eff.drain, true);
      if (real && has(u, 'pact')) heal(B, u, u, real * 0.3, true, true);
      if (u.mods.lifesteal && real) heal(B, u, u, real * u.mods.lifesteal / 100 * (1 + (u.mods.hellFlesh || 0) / 100), true);
      if (T.alive && u.side !== T.side && (eff.s !== 'mag') && T.mods.thorns) { const th = Math.round(real * T.mods.thorns / 100); if (th > 0) { hurt(B, u, th, 'phys', T, true); ev(B, { t: 'dmg', u: u.id, from: T.id, v: th, thorn: 1 }); } }
      if (T.alive && eff.s !== 'mag' && T.mods.counter && B.rng() * 100 < T.mods.counter && u.alive) { const cdm = Math.max(1, Math.round(T.atk * 0.6 * 100 / (100 + u.def * 0.5))); hurt(B, u, cdm, 'phys', T, true); ev(B, { t: 'dmg', u: u.id, from: T.id, v: cdm, thorn: 1 }); msg(B, T.name + ' контратакует −' + cdm); }
    };
    for (const eff of sk.fx) {
      if (!u.alive && eff.k !== 'dmg') break;
      const to = eff.to === 'self' ? [u] : eff.to === 'allies' ? alive(side(B, u)) : targets;
      switch (eff.k) {
        case 'dmg': {
          const hits = eff.hits || 1;
          for (let i = 0; i < hits; i++) {
            if (sk.tgt === 'rfoe') { const en = alive(opp(B, u)); if (!en.length) break; dealOne(en[Math.floor(B.rng() * en.length)], eff); }
            else targets.forEach(t => dealOne(t, eff));
          }
          break;
        }
        case 'heal': to.forEach(t => { const v = u.hpow * eff.m * (1 + ((u.skb && u.skb[sk.id]) || 0) / 100) * (u.hero ? B.potionK * 0 + 1 : 1); heal(B, u, t, v); }); break;
        case 'healPct': to.forEach(t => heal(B, u, t, t.maxHp * eff.v * (eff.to === 'self' ? 1 : 1))); break;
        case 'st': to.forEach(t => { if (t.alive) applyStatus(B, u, t, eff, sk); }); break;
        case 'mp': to.forEach(t => { t.mp = Math.min(t.maxMp, t.mp + eff.v); }); break;
        case 'rc': { const c = D.CLASSES[u.cls]; if (u.hero || u.compSlot) { let g = eff.v; if (u.rcMax === 5) g = eff.v + (B.rng() < (u.mods.rcGain || 0) * 0.12 ? 1 : 0); else g = Math.round(eff.v * (1 + (u.mods.rcGain || 0) / 20)); u.rc = clamp(u.rc + g, 0, u.rcMax); } break; }
        case 'revTaken': {
          const T = Math.max(u.takenTot || 0, u.atk * 2.5); const en = alive(opp(B, u));
          en.forEach(t => { const real = hurt(B, t, Math.round(T * eff.m * 100 / (100 + t.res * 0.1)), 'arcane', u); ev(B, { t: 'dmg', u: t.id, from: u.id, v: real, el: 'arcane' }); msg(B, '→ ' + t.name + ' −' + real + ' (реверс)'); });
          heal(B, u, u, T * eff.heal, true, true); u.takenTot = 0; break;
        }
        case 'edenLight': targets.forEach(t => {   // ✧ «Свет Эдема»: урон = m × текущее HP владельца (мимо брони/уклонения), лечение heal × нанесённого
          if (!t.alive) return; const raw = Math.max(1, Math.round(u.hp * eff.m));
          const real = hurt(B, t, raw, eff.el || 'light', u); dealt += real;
          ev(B, { t: 'dmg', u: t.id, from: u.id, v: real, el: eff.el || 'light', notes: [] }); msg(B, '→ ' + t.name + ' −' + real + ' (Свет Эдема)');
          const hv = heal(B, u, u, real * (eff.heal || 0), true, true); if (hv) ev(B, { t: 'txt', u: u.id, s: 'Эдем +' + hv });
        }); break;
        // ───── концептуальные навыки клинков v2.12 (урон с тегом concept) ─────
        case 'abyssSk': targets.forEach(t => {   // ✧ «Тьма Бездны»
          if (!t.alive) return; if (B.rng() * 100 < clamp(t.eva + stMod(t, 'eva') - (u.sub && u.sub.acc || 0), 0, 80)) { ev(B, { t: 'miss', u: t.id }); msg(B, t.name + ' уклоняется'); return; }
          const K = (1 + cxBonus(u) + stMod(u, 'dealt')) * redK(B, t, eff.el);
          dealt += cHurt(B, u, t, (u.maxHp * eff.m + lostPart(u, t, eff)) * K, eff.el, 'Тьма Бездны');
          if (t.alive && t.hp < t.maxHp * eff.thr) { ev(B, { t: 'txt', u: t.id, s: 'Добивание' }); dealt += cHurt(B, u, t, t.maxHp * (big(t) ? eff.bossFin : eff.fin) * K, eff.el, 'добивание'); }
        }); break;
        case 'hellSk': targets.forEach(t => {   // ✧ «Сердце Преисподней»
          if (!t.alive) return; const cost = Math.min(u.hp - 1, Math.round(u.hp * eff.cost)); u.hp -= cost; ev(B, { t: 'txt', u: u.id, s: '−' + cost + ' HP' });
          const K = (1 + cxBonus(u) + stMod(u, 'dealt')) * Math.max(0.5, Math.min(1, redK(B, t, eff.el))) * Math.max(1, redK(B, t, eff.el));
          dealt += cHurt(B, u, t, ((u.maxHp - u.hp) * eff.m + u.maxHp * eff.mx) * K, eff.el, 'демонический');
          if (!t.alive && u.alive) { u.hp = Math.min(u.maxHp, u.hp + cost); ev(B, { t: 'txt', u: u.id, s: 'Сердце насыщено +' + cost }); }
        }); break;
        case 'flameSk': targets.forEach(t => {   // ✧ «Первый Пожар»
          if (!t.alive) return; dealt += cHurt(B, u, t, u.maxHp * eff.m * (1 + cxBonus(u) + stMod(u, 'dealt')) * redK(B, t, eff.el), eff.el, 'Первый Пожар');
          if (t.alive) addSt(B, u, t, 'primal', eff.dur, Math.max(1, t.maxHp * (big(t) ? eff.boss : eff.dot)));
        }); break;
        case 'sourceSk': {   // ✧ «Безбрежный Исток»
          let n = 0; u.st = u.st.filter(x => { if (n < eff.n && cleanable(x)) { n++; return false; } return true; }); if (n) ev(B, { t: 'txt', u: u.id, s: 'Очищение ×' + n });
          targets.forEach(t => { if (t.alive) dealt += cHurt(B, u, t, u.maxHp * eff.m * (1 + eff.per * n) * (1 + cxBonus(u) + stMod(u, 'dealt')) * redK(B, t, eff.el), eff.el, 'Исток'); });
          heal(B, u, u, u.maxHp * eff.heal, true, true); break;
        }
        case 'chronoSk': targets.forEach(t => {   // ✧ «Разрыв Хроноса»
          if (!t.alive) return; dealt += cHurt(B, u, t, u.hp * eff.m, eff.el, 'Разрыв Хроноса');
          if (t.alive) { if (big(t)) { t.gauge -= eff.boss; ev(B, { t: 'txt', u: t.id, s: 'Шкала −' + eff.boss + '%' }); } else { addSt(B, u, t, 'chronoStop', 1); ev(B, { t: 'txt', u: t.id, s: 'Время застыло' }); } }
          u.gauge += eff.gain; ev(B, { t: 'txt', u: u.id, s: 'Шкала +' + eff.gain + '%' });
        }); break;
        case 'entropySk': targets.forEach(t => {   // ✧ «Вселенская Энтропия»
          if (!t.alive) return; const d0 = has(t, 'decay'), full = !!(d0 && d0.pow >= (u.mods.entDecay || 6));
          const rk = redK(B, t, eff.el), K = rk < 1 ? 1 - (1 - rk) * eff.red : rk;
          dealt += cHurt(B, u, t, (u.maxHp * eff.m + lostPart(u, t, eff)) * K * (1 + cxBonus(u) + stMod(u, 'dealt')), eff.el, 'Энтропия');
          if (!t.alive) return;
          if (full) { ev(B, { t: 'txt', u: t.id, s: 'Коллапс!' }); dealt += cHurt(B, u, t, t.hp * (big(t) ? eff.boss : eff.col), eff.el, 'Коллапс'); }
          else if (u.mods.entDecay > 0) addDecay(B, u, t, eff.add); else { addDecay(B, { mods: { entDecay: 6 }, id: u.id }, t, eff.add); }
        }); break;
        case 'hpCost': u.hp = Math.max(1, u.hp - Math.round(u.maxHp * eff.v)); break;
        case 'law': { B.law = B.law || {}; (eff.ids || [eff.id]).forEach(id => { B.law[id] = Math.max(B.law[id] || 0, eff.dur || 2); }); ev(B, { t: 'txt', u: u.id, s: 'Закон!' }); msg(B, u.name + ' объявляет закон: ' + (eff.n || '') ); break; }
        case 'timestop': { alive(opp(B, u)).forEach(t => { addSt(B, u, t, 'stop', eff.dur || 1); }); u.gauge += eff.extra == null ? 100 : eff.extra; ev(B, { t: 'txt', u: u.id, s: 'Время остановлено' }); msg(B, 'Время остановлено — враги замерли'); break; }
        case 'decree': { alive(opp(B, u)).forEach(t => { t.gauge = Math.min(t.gauge, 0) - (eff.delay == null ? 70 : eff.delay); addSt(B, u, t, 'vuln', eff.dur || 3); addSt(B, u, t, 'weak', eff.dur || 3); }); ev(B, { t: 'txt', u: u.id, s: 'Приказ мира' }); msg(B, 'Приказ мира: враги отброшены назад'); break; }
        case 'erase': targets.forEach(t => {
          if (!t.alive) return; const big = t.role === 'boss' || t.role === 'mini'; const thr = eff.thr || 0.35;
          if (!big && t.hp <= t.maxHp * thr) { t.st = []; ev(B, { t: 'txt', u: t.id, s: 'Стёрт!' }); msg(B, t.name + ' стёрт из реальности'); hurt(B, t, t.hp + 1e9, 'arcane', u, true); ev(B, { t: 'dmg', u: t.id, from: u.id, v: 0, el: 'arcane', notes: [] }); }
          else if (big) { const v = Math.min(t.maxHp * (eff.boss || 0.12), Math.max(u.mag, u.atk) * 14); const real = hurt(B, t, Math.round(v), 'arcane', u, true); ev(B, { t: 'dmg', u: t.id, from: u.id, v: real, el: 'arcane', notes: [] }); msg(B, '→ ' + t.name + ' −' + real + ' (стирание)'); }
          else dealOne(t, { k: 'dmg', s: 'mag', m: eff.m || 4, el: 'arcane' }, 1);
        }); break;
        case 'devour': targets.forEach(t => {
          if (!t.alive) return; const big = t.role === 'boss' || t.role === 'mini';
          if (!big && t.hp <= t.maxHp * (eff.thr || 0.3)) { t.st = []; msg(B, u.name + ' пожирает ' + t.name); ev(B, { t: 'txt', u: t.id, s: 'Пожран!' }); hurt(B, t, t.hp + 1e9, 'dark', u, true); u.devStack = (u.devStack || 0) + 1; heal(B, u, u, u.maxHp * (eff.heal || 0.2), true, true); u.mp = Math.min(u.maxMp, u.mp + Math.round(u.maxMp * 0.1)); }
          else { dealOne(t, { k: 'dmg', s: 'atk', m: eff.m || 3, drain: 0.5 }, 1); }
        }); break;
        case 'strip': alive(opp(B, u)).forEach(t => { t.st = t.st.filter(s => !(D.ST[s.id].k === 'buff' || D.ST[s.id].k === 'hot') || false); ev(B, { t: 'txt', u: t.id, s: 'Раскол' }); }); break;
        case 'mantraUp': if (u.m0) { if (u.mods.mantra > 0) u.mst = Math.min(8, u.mst + (eff.v || 1)); if (u.mods.mantraMag > 0) u.mgs = Math.min(8, u.mgs + (eff.v || 1)); ev(B, { t: 'txt', u: u.id, s: 'Мантра +' + (eff.v || 1) }); } break;
        case 'echo': { const id = u.lastSk; if (!id || id === sk.id) break; const s2 = C.skillOf(u, id); if (!s2 || s2.noEcho) break; let tid2 = u.lastTid; ev(B, { t: 'txt', u: u.id, s: 'Эхо: ' + s2.n }); msg(B, 'Эхо Королей повторяет «' + s2.n + '»'); doSkill(B, u, s2, tid2, { free: true, scale: eff.m || 0.7 }); break; }
        case 'cleanse': to.forEach(t => { t.st = t.st.filter(s => !cleanable(s)); ev(B, { t: 'txt', u: t.id, s: 'Очищение' }); }); break;
        case 'steal': { const g = Math.round(3 + 1.6 * targets[0].lv); B.stolen += g; ev(B, { t: 'txt', u: u.id, s: '+' + g + ' зол.' }); break; }
        case 'revive': to.forEach(t => { if (!t.alive) { t.alive = true; t.hp = Math.round(t.maxHp * eff.v); t.gauge = 40; ev(B, { t: 'revive', u: t.id }); msg(B, t.name + ' возвращён к жизни!'); } }); break;
        case 'summon': {
          if (alive(B.foes).length >= 4 || (B.law && B.law.nosummon > 0)) break; const lv = u.lv - 1; const nu = C.unitFromEnemy(eff.id, Math.max(1, lv), u.tier, false, 'e' + (B.nextId++) + 's'); nu.summoned = true; nu.gauge = 30;
          B.foes.push(nu); B.units.push(nu); intent(B, nu); ev(B, { t: 'summon', u: nu.id }); msg(B, u.name + ' призывает: ' + nu.name); break;
        }
      }
    }
    if (u.mods.flameHeat > 0 && sk.fx.some(f => f.k === 'dmg' || /Sk$|edenLight/.test(f.k)) && u.alive) u.heat = Math.min(5, (u.heat || 0) + 1);   // «Жар битвы»: после каждой атаки
    // реакция «Заморозка» уже обработана; ярость на полученный урон не нужна тут
    if (u.alive && dealt > 0 && u.hero && D.CLASSES[u.cls].rc.hit) { /* зарезервировано */ }
  }

  // ───── Действия ─────
  C._hurt = hurt;   // для тестов баланса
  C.act = function (B, u, a) {
    B.actSeq = (B.actSeq || 0) + 1;
    if (B.over || B.cur !== u) return false;
    a = a || { t: 'basic' };
    if (a.t === 'skill') {
      const why = C.canUse(B, u, a.id); if (why) { a = { t: 'basic', tid: a.tid }; } else { doSkill(B, u, C.skillOf(u, a.id), a.tid); if (u.sub && u.sub.castSpd) u.gauge += clamp(u.sub.castSpd, 0, 60); }
    }
    if (a.t === 'basic') {
      const b = D.BASIC[u.cls] || D.BASIC.warrior; const sk = { id: 'basic', n: b.n, ic: b.ic, tgt: 'foe', fx: b.fx };
      if (u.side === 'e') sk.fx = [{ k: 'dmg', s: 'atk', m: 1 }];
      doSkill(B, u, sk, a.tid);
    } else if (a.t === 'enemy') {
      let sk = SKL(a.id); if (B.law && B.law.nocast > 0 && u.side === 'e') sk = { id: 'basic', n: 'Удар', ic: '👊', tgt: 'foe', fx: [{ k: 'dmg', s: 'atk', m: 1 }] }; doSkill(B, u, sk, a.tid);
    } else if (a.t === 'guard') {
      addSt(B, u, u, 'guard', 2); u.mp = Math.min(u.maxMp, u.mp + 6); u.rc = clamp(u.rc + (u.rcMax === 5 ? 0 : 8), 0, u.rcMax); ev(B, { t: 'skill', u: u.id, n: 'Защита', ic: '🛡️', tg: [u.id] }); msg(B, u.name + ' встаёт в защиту');
    } else if (a.t === 'item') {
      const c = D.CONS[a.id]; if (!c || !(B.cons[a.id] > 0)) return false;
      B.cons[a.id]--; B.used = B.used || {}; B.used[a.id] = (B.used[a.id] || 0) + 1;
      ev(B, { t: 'skill', u: u.id, n: c.n, ic: c.ic, tg: [u.id] }); msg(B, u.name + ' использует ' + c.n);
      if (c.heal || c.mp || c.cleanse) {
        const tgt = side(B, u).find(x => x.id === a.tid && x.alive) || u;
        if (c.heal) heal(B, u, tgt, tgt.maxHp * c.heal * B.potionK); if (c.mp) { tgt.mp = Math.min(tgt.maxMp, tgt.mp + Math.round(tgt.maxMp * c.mp * B.potionK)); ev(B, { t: 'txt', u: tgt.id, s: '+энергия' }); }
        if (c.cleanse) tgt.st = tgt.st.filter(s => !cleanable(s));
      } else if (c.dmg) {
        const tl = c.aoe ? alive(B.foes) : [alive(B.foes).find(x => x.id === a.tid) || alive(B.foes)[0]];
        tl.forEach(t => { const v0 = (26 + 8 * u.lv) * c.dmg * B.bombK; let v = v0; if (t.weak.includes(c.el)) v *= 1.35; else if (t.resist.includes(c.el)) v *= 0.6; v = Math.round(v * (0.95 + B.rng() * 0.1)); const real = hurt(B, t, v, c.el, u); ev(B, { t: 'dmg', u: t.id, from: u.id, v: real, el: c.el }); msg(B, '→ ' + t.name + ' −' + real); if (c.st && t.alive) addSt(B, u, t, c.st, 2); });
      }
    } else if (a.t === 'flee') {
      if (B.opts.noFlee) { msg(B, 'Бежать нельзя!'); } else if (B.rng() < 0.6) { B.over = 'flee'; msg(B, 'Отряд отступает.'); return true; } else msg(B, 'Не удалось сбежать!');
    }
    if (u.alive) { u.acts = (u.acts || 0) + 1; if (u.mods.chronoSteal > 0 && u.acts % 3 === 0) { u.gauge += u.mods.chronoSteal; ev(B, { t: 'txt', u: u.id, s: 'Украденная секунда' }); msg(B, u.name + ': Украденная секунда — шкала хода +' + u.mods.chronoSteal + '%'); } }   // ✧
    endTurn(B, u);
    return true;
  };

  // ───── ИИ ─────
  function intent(B, e) {
    if (!e.alive) return;
    const foes = alive(B.party), own = alive(B.foes);
    if (!foes.length) return;
    const list = [];
    e.sk.forEach(id => {
      const sk = SKL(id); let w = 1;
      if (sk.tgt === 'eally') { const low = own.filter(x => x.hp < x.maxHp * 0.65); w = low.length ? 4 : 0; }
      else if (sk.tgt === 'eallies') { w = own.every(x => has(x, 'rally')) ? 0 : 1.2; }
      else if (sk.tgt === 'self') { const f = sk.fx[0]; if (f.k === 'summon') w = own.length < 3 && e.turns % 3 === 2 ? 3 : (own.length < 3 ? 0.4 : 0); else if (f.k === 'healPct') w = e.hp < e.maxHp * 0.6 ? 3 : 0; else w = has(e, f.id) ? 0 : (e.hp < e.maxHp * 0.7 ? 1.4 : 0.6); }
      else if (sk.tgt === 'foes') w = foes.length > 1 ? 1.5 + foes.length * 0.3 : 0.6;
      if (sk.tele) { w = e.lastTele ? 0 : (e.turns >= 1 ? 1.2 : 0); }
      if (e.phase === 2 && (sk.tele || sk.tgt === 'foes')) w *= 1.4;
      if (w > 0) list.push([id, w]);
    });
    if (!list.length) list.push([e.sk[0], 1]);
    const pick = list[B.rng.weighted(list.map(x => x[1]))][0], sk = SKL(pick);
    let tid = null;
    if (sk.tgt === 'foe') {
      const tn = foes.find(x => has(x, 'taunt'));
      if (tn) tid = tn.id; else { const ws = foes.map(x => 1 + (1 - x.hp / x.maxHp) * 1.5 + (['mage', 'healer', 'rogue'].includes(x.cls) ? 0.5 : 0) + (x.hero ? 0.15 : 0)); tid = foes[B.rng.weighted(ws)].id; }
    }
    e.intent = { id: pick, tid };
  }
  C.intent = intent;
  function enemyAct(B, e) {
    if (e.charging) { const a = e.charging; e.charging = null; e.lastTele = true; let tid = a.tid; if (!alive(B.party).find(x => x.id === tid)) tid = alive(B.party)[0].id; return { t: 'enemy', id: a.id, tid }; }
    const it = e.intent || { id: e.sk[0] }; let sk = SKL(it.id);
    if (sk.tele) { e.charging = it; e.lastTele = false; ev(B, { t: 'charge', u: e.id, id: it.id }); msg(B, e.name + ' накапливает силу: «' + sk.n + '»!'); return { t: 'wait' }; }
    e.lastTele = false;
    let tid = it.tid; if (sk.tgt === 'foe') { const tn = alive(B.party).find(x => has(x, 'taunt')); if (tn) tid = tn.id; else if (!alive(B.party).find(x => x.id === tid)) tid = alive(B.party)[0].id; }
    return { t: 'enemy', id: it.id, tid };
  }
  const squish = (u) => u.maxHp;

  function estimate(B, u, sk) {
    // Оценка полезности навыка для ИИ игрока-стороны
    const foes = alive(opp(B, u)), own = alive(side(B, u)); let score = 0;
    const nF = foes.length; const mpFrac = u.mp / u.maxMp; const spentRc = sk.rcAll ? u.rc : sk.rc || 0;
    const lowestAlly = own.slice().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0], lowFrac = lowestAlly.hp / lowestAlly.maxHp;
    const wantsAoe = sk.tgt === 'foes' || sk.tgt === 'rfoe';
    sk.fx.forEach(f => {
      if (f.k === 'dmg') {
        const hits = f.hits || 1; let m = f.m + (f.rcMul ? f.rcMul * spentRc : 0); let n = sk.tgt === 'foes' ? nF : 1; let el = f.el || 'phys';
        const wk = foes.filter(x => x.weak.includes(el)).length / nF, rs = foes.filter(x => x.resist.includes(el)).length / nF;
        let s = 18 * m * hits * (1 + (n - 1) * 0.75) * (1 + 0.35 * wk - 0.4 * rs);
        if (f.ifLow && foes.some(x => x.hp < x.maxHp * f.ifLow)) s *= 1.6; if (f.ifAny && foes.some(x => x.st.some(isDeb))) s *= 1.3;
        if (el === 'bolt' && foes.some(x => has(x, 'wet'))) s *= 1.3; if (f.fromTaken) s *= 1 + Math.min(1, u.takenSince / (u.maxHp * 0.4));
        score += s;
      } else if (f.k === 'heal') {
        if (sk.tgt === 'allies') { const hurtN = own.filter(x => x.hp < x.maxHp * 0.75).length; const need = own.reduce((a, x) => a + (x.maxHp - x.hp), 0); score += hurtN >= 2 || lowFrac < 0.5 ? 55 * Math.min(1.6, need / (u.hpow * f.m * own.length * 1.1) + 0.5) : 0; }
        else score += lowFrac < 0.6 ? 70 * (1 - lowFrac) + 25 : lowFrac < 0.78 ? 12 : 0;
      } else if (f.k === 'healPct') { const me = u.hp / u.maxHp; score += me < 0.55 ? 60 : 0; }
      else if (f.k === 'revive') score += own.length < side(B, u).length ? 80 : 0;
      else if (f.k === 'cleanse') score += own.some(x => x.st.some(isDeb)) ? 28 : 0;
      else if (f.k === 'erase' || f.k === 'devour') { const small = foes.filter(x => x.role !== 'boss' && x.role !== 'mini' && x.hp <= x.maxHp * (f.thr || 0.3)).length; score += small ? 120 + 20 * small : 22; }
      else if (f.k === 'timestop') score += (nF >= 2 ? 70 + 10 * nF : 40) + (u.hp < u.maxHp * 0.5 ? 40 : 0);
      else if (f.k === 'decree') score += nF >= 2 ? 62 : 34;
      else if (f.k === 'law') score += !(B.law && B.law[f.id || (f.ids && f.ids[0])] > 0) && foes.some(x => x.role === 'boss' || x.role === 'caster' || x.role === 'support') ? 46 : 0;
      else if (f.k === 'strip') score += foes.filter(x => x.st.some(s => D.ST[s.id].k === 'buff')).length * 25;
      else if (f.k === 'mantraUp') score += u.m0 ? 30 : 0;
      else if (f.k === 'echo') { const l = u.lastSk && C.skillOf(u, u.lastSk); score += l && l.id !== sk.id ? estimate(B, u, l) * 0.7 : 0; }
      else if (f.k === 'edenLight') score += 18 * (u.hp * f.m) / Math.max(1, u.atk) + (u.hp < u.maxHp * 0.6 ? 20 : 0);
      else if (/^(abyss|hell|flame|source|chrono|entropy)Sk$/.test(f.k)) { const t0 = foes[0] || u; const raw = { abyssSk: u.maxHp * f.m + (t0.maxHp - t0.hp) * (f.lost || 0), hellSk: u.maxHp * f.mx + (u.maxHp - u.hp * (1 - f.cost)) * f.m, flameSk: u.maxHp * f.m * 1.4, sourceSk: u.maxHp * f.m * (1 + f.per * u.st.filter(cleanable).length) + (u.hp < u.maxHp * 0.7 ? u.maxHp : 0), chronoSk: u.hp * f.m * 1.3, entropySk: u.maxHp * f.m + (t0.maxHp - t0.hp) * f.lost }[f.k]; score += 18 * raw / Math.max(1, u.atk) + (f.k === 'hellSk' && u.hp < u.maxHp * 0.35 ? -60 : 0); }
      else if (f.k === 'hpCost') score -= u.hp / u.maxHp < 0.6 ? 80 : 0;
      else if (f.k === 'st') {
        const id = f.id, kind = D.ST[id].k;
        if (kind === 'buff' || kind === 'hot') {
          const tg = f.to === 'self' || sk.tgt === 'self' ? [u] : own;
          const miss = tg.filter(x => !has(x, id)).length;
          if (!miss) return;
          let base = { rally: 26, guard: 16, taunt: 24, cover: 24, shield: 28, haste: 20, focus: 12, evade: 14, defUp: 14, bless: 22, regen: lowFrac < 0.85 ? 26 : 0, reflect: u.hp < u.maxHp * 0.7 ? 44 : 12, immortal: u.hp < u.maxHp * 0.38 ? 150 : 0, pact: u.hp > u.maxHp * 0.55 && nF ? 95 : 0 }[id];
          if (base === undefined) base = 10;
          let b = base * (tg.length > 1 ? 1 + miss * 0.3 : 1);
          if ((id === 'taunt' || id === 'cover') && own.length < 2) b *= 0.4; if ((id === 'guard' || id === 'shield') && lowFrac > 0.9 && u.turns < 2) b *= 0.7;
          if (id === 'rally' || id === 'bless') b *= nF > 0 ? 1 : 0; score += b;
        } else if (kind === 'ctrl') score += 12 * (sk.tgt === 'foes' ? nF : 1) * (f.p || 1);
        else { const need = foes.filter(x => !has(x, id) || id === 'wet').length; score += (kind === 'dot' ? 14 : 9) * Math.min(sk.tgt === 'foes' ? nF : 1, need) * (f.p == null ? 1 : f.p); }
      } else if (f.k === 'mp') score += mpFrac < 0.4 ? 10 : 2;
      else if (f.k === 'rc') score += 2;
      else if (f.k === 'steal') score += 3;
    });
    const cost = (sk.mp || 0);
    if (u.compSlot === undefined && cost) score *= 1 - Math.min(0.35, cost * 0.006);
    return score;
  }
  C.choose = function (B, u) {
    if (u.side === 'e') return enemyAct(B, u);
    const foes = alive(B.foes); const own = alive(B.party);
    // зелья
    if (u.hero && (u.hp < u.maxHp * 0.3)) { const p = ['pot_hp3', 'pot_hp2', 'pot_hp1'].find(x => B.cons[x] > 0); if (p && !(u.cls === 'healer' && u.mp >= 10)) return { t: 'item', id: p, tid: u.id }; }
    if (u.hero && u.mp < u.maxMp * 0.12 && u.cls !== 'warrior' && u.cls !== 'rogue') { const p = ['pot_mp2', 'pot_mp1'].find(x => B.cons[x] > 0); if (p) return { t: 'item', id: p, tid: u.id }; }
    let best = null, bs = 0;
    u.sk.forEach(id => {
      if (C.canUse(B, u, id)) return; const sk = C.skillOf(u, id); let s = estimate(B, u, sk);
      if (s > bs) { bs = s; best = { t: 'skill', id }; }
    });
    // базовая атака
    const baseScore = (u.cls === 'healer' || u.cls === 'mage' ? 16 : 17);
    const mpLow = u.mp < 8;
    if (!best || bs < baseScore * (mpLow ? 0.5 : 1)) {
      if (u.hero && u.hp < u.maxHp * 0.4 && !B.opts.noGuard) return { t: 'guard' };
      best = { t: 'basic' };
    }
    // выбор цели
    const sk = best.t === 'skill' ? C.skillOf(u, best.id) : { tgt: 'foe' };
    if (sk.tgt === 'foe') {
      const tn = foes.find(x => has(x, 'taunt'));
      const t = tn || foes.slice().sort((a, b) => {
        const sa = (a.hp) * (a.role === 'swarm' ? 0.7 : 1) - (a.tags.includes('spirit') && a.role === 'caster' ? 40 : 0) - (a.role === 'support' ? 60 : 0), sb = (b.hp) * (b.role === 'swarm' ? 0.7 : 1) - (b.role === 'support' ? 60 : 0) - (b.tags.includes('spirit') && b.role === 'caster' ? 40 : 0);
        return sa - sb;
      })[0];
      // стихийная слабость
      if (!tn && best.t === 'skill') { const el = (sk.fx.find(f => f.k === 'dmg') || {}).el; if (el) { const w = foes.find(x => x.weak.includes(el)); if (w) { best.tid = w.id; return best; } } }
      best.tid = t.id;
    } else if (sk.tgt === 'ally') best.tid = own.slice().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0].id;
    else if (sk.tgt === 'dead') best.tid = side(B, u).find(x => !x.alive).id;
    return best;
  };
  // «wait» — враг копит силу
  const _act = C.act;
  C.act = function (B, u, a) { if (a && a.t === 'wait') { endTurn(B, u); return true; } return _act(B, u, a); };

  // ───── Награды ─────
  C.rewards = function (slot, B, ctx) {
    const h = slot.hero, rng = ctx.rng, mods = ctx.mods; const out = { xp: 0, gold: 0, mats: {}, items: [] };
    const xk = 1 + (mods.xp || 0) / 100;
    B.killed.forEach(e => {
      if (e.summoned) return;
      let xp = (12 + 7 * e.lv) * (D.killXpK ? D.killXpK(e.lv) : 1) * D.ROLES[e.role].xp * (e.elite ? 1.4 : 1) * (1 + (ctx.tier.mul - 1) * 0.3); const diff = h.level - e.lv; if (diff > 3) xp *= Math.max(0.15, 1 - 0.2 * (diff - 3));
      out.xp += Math.round(xp * xk);
      const l = E.rollLoot(rng, slot, e, { mods, tier: ctx.tier }); out.gold += l.gold; for (const k in l.mats) out.mats[k] = (out.mats[k] || 0) + l.mats[k]; out.items.push(...l.items);
    });
    out.gold += B.stolen; return out;
  };

  // ───── Вылазка: узлы ─────
  C.nodeEnemies = function (run, node, idx) {
    const d = D.DUN[run.did]; const lv0 = E.dungeonLv(d, run.tier, node.f);
    const bump = node.t === 'mini' ? 1 : node.t === 'boss' ? 2 : 0;
    return node.e.map((eid, i) => C.unitFromEnemy(eid, Math.min(D.ENEMY_LV_CAP || 40, lv0 + bump + (node.elite && i === 0 ? 1 : 0)), run.tier, !!(node.elite && i === 0), 'e' + i));
  };
  C.startNodeBattle = function (slot, opts) {
    const run = slot.run, node = run.nodes[run.node]; const P = C.unitFromSlot(slot); const party = [P];
    (slot.party || []).forEach(cid => { if (slot.crew[cid] && party.length < 4) { const hf = run.comp && run.comp[cid] != null ? run.comp[cid] : 1; party.push(C.unitFromCrew(slot, cid, hf)); } });
    const foes = C.nodeEnemies(run, node);
    const rng = E.rng((run.seed + run.node * 977 + run.kills * 31) >>> 0);
    const B = C.create(party, foes, rng, Object.assign({ cons: slot.cons, cmd: !!(slot.cmd) }, opts, { noFlee: node.t === 'boss' }));
    B.cons = slot.cons; const m = P.mods; B.potionK = 1 + (m.potion || 0) / 100; B.bombK = 1 + (m.bomb || 0) / 100; B.node = node;
    return B;
  };
  // Завершение боя: применяет результаты к слоту/вылазке. Возвращает отчёт.
  C.finishBattle = function (slot, B) {
    const run = slot.run, node = run.nodes[run.node], P = B.party[0]; const d = E.derive(slot);
    const rep = { result: B.over, xp: 0, gold: 0, mats: {}, items: [], lvUp: 0 };
    run.hp = P.alive ? P.hp : 1; run.mp = P.mp;
    B.party.slice(1).forEach(c => { run.comp[c.id] = c.alive ? c.hp / c.maxHp : 0.5; });
    if (B.used) for (const k in B.used) { /* потрачено в slot.cons напрямую */ }
    if (B.over === 'win') {
      const rng = E.rng((run.seed + 5 + run.node * 131 + run.kills) >>> 0);
      const r = C.rewards(slot, B, { rng, mods: d.mods, tier: D.TIERS[run.tier] });
      rep.xp = r.xp; rep.gold = r.gold; rep.mats = r.mats; rep.items = r.items; run.kills += B.killed.length; slot.stats.kills += B.killed.length;
      run.bag.gold += r.gold; run.bag.xp += r.xp; for (const k in r.mats) run.bag.mats[k] = (run.bag.mats[k] || 0) + r.mats[k]; r.items.forEach(it => run.bag.items.push(it));
      rep.lvUp = E.addXp(slot, r.xp); rep.crewUp = E.crewAfterBattle(slot, B.party.slice(1).map(c => c.id), r.xp, node.t === 'boss' || node.t === 'mini');
      const dd = E.derive(slot); run.hp = Math.min(dd.maxHp, Math.round(run.hp + dd.maxHp * 0.1 * 1)); run.mp = Math.min(dd.maxMp, Math.round(run.mp + dd.maxMp * 0.15));
      if (rep.lvUp) { run.hp = Math.min(dd.maxHp, run.hp + Math.round((dd.maxHp - d.maxHp))); run.mp = Math.min(dd.maxMp, run.mp + (dd.maxMp - d.maxMp)); }
      if (node.t === 'boss') {
        const wasFirst = !slot.prog.boss[run.did];
        slot.prog.boss[run.did] = true; slot.prog.cleared[run.did] = Math.max(slot.prog.cleared[run.did] || 0, run.tier + 1);
        if (wasFirst) { slot.hero.bossPts = (slot.hero.bossPts || 0) + 1; rep.firstClear = true; }
        slot.stats.wins++; rep.bossDown = true;
      }
      run.node++;
    } else if (B.over === 'lose') {
      slot.stats.deaths++; rep.dead = true;
    }
    slot.rev++; return rep;
  };
  // Событие-узел
  C.resolveEvent = function (slot, choice) {
    const run = slot.run, node = run.nodes[run.node]; const d = E.derive(slot); const rng = E.rng((run.seed + run.node * 4421) >>> 0);
    const res = { ev: node.ev, text: '', gold: 0, mats: {}, items: [] };
    const addBag = (g, m, its) => { run.bag.gold += g || 0; for (const k in (m || {})) run.bag.mats[k] = (run.bag.mats[k] || 0) + m[k]; (its || []).forEach(i => run.bag.items.push(i)); };
    const L = E.dungeonLv(D.DUN[run.did], run.tier, node.f);
    if (node.ev === 'chest') {
      const g = Math.round((12 + 6 * L) * (1 + (d.mods.gold || 0) / 100)); const it = E.genItem(rng, { il: L, rarity: E.rollRarity(rng, D.TIERS[run.tier].loot * 1.5 * (1 + (d.mods.drop || 0) / 100), 0, L), base: rng.pick(D.CLASSES[slot.hero.cls].weapons.concat(D.BASE_IDS.filter(k => !D.BASES[k].wt))) });
      const m = {}; const mk = rng.pick(['dust', 'herb_g', 'ore_cu', 'cloth']); m[mk] = rng.int(1, 3); res.text = 'В сундуке — золото, добыча и ' + it.nm + '.'; res.gold = g; res.mats = m; res.items = [it]; addBag(g, m, [it]);
    } else if (node.ev === 'rest') {
      run.hp = Math.min(d.maxHp, Math.round(run.hp + d.maxHp * 0.45)); run.mp = Math.min(d.maxMp, Math.round(run.mp + d.maxMp * 0.5)); Object.keys(run.comp).forEach(k => run.comp[k] = Math.min(1, (run.comp[k] || 0) + 0.45)); res.text = 'Вы переводите дух у костра. Здоровье +45%, энергия +50%.';
    } else if (node.ev === 'shrine') {
      const c = choice || 'bless';
      if (c === 'bless') { slot.buffs = slot.buffs || []; slot.buffs.push({ id: 'shrine' + run.node, m: { dmg: 8, def: 8 }, food: false }); res.text = 'Алтарь Лиры отзывается: до конца вылазки +8% урона и брони.'; }
      else if (c === 'heal') { run.hp = Math.min(d.maxHp, Math.round(run.hp + d.maxHp * 0.6)); run.mp = Math.min(d.maxMp, run.mp + Math.round(d.maxMp * 0.3)); res.text = 'Тёплый свет затягивает раны: здоровье +60%.'; }
      else { const g = Math.round(20 + 9 * L); run.hp = Math.max(1, Math.round(run.hp - d.maxHp * 0.15)); addBag(g); res.gold = g; res.text = 'Вы отдаёте каплю крови и получаете ' + g + ' золота.'; }
    } else if (node.ev.startsWith('gather')) {
      const G = D.GATHER_EV[node.ev], pid = G.prof; const mine = (slot.hero.prof1 === pid || slot.hero.prof2 === pid);
      const lv = E.profLv(slot, pid), gk = (1 + (d.mods.gather || 0) / 100) * (1 + lv * 0.06);
      const n = mine ? 3 : 1; const got = {};
      for (let i = 0; i < n; i++) { const dr = G.drops[rng.weighted(G.drops.map(x => x[3]))]; let q = rng.int(dr[1], dr[2]); if (!mine) q = Math.min(1, q); else q = Math.max(0, Math.round(q * gk)); if (q > 0) got[dr[0]] = (got[dr[0]] || 0) + q; }
      if (mine) { const up = E.profXp(slot, pid, 14 + node.f * 4); res.lvUp = up; slot.stats.gathered++; res.text = G.n + ': вы знаете, где искать — добыча богата!'; } else res.text = G.n + ': без навыков удаётся взять лишь немного.';
      res.mats = got; addBag(0, got);
    }
    run.node++; slot.rev++; return res;
  };
  C.heroPeek = function (slot) { return C.unitFromSlot(slot); };
  if (typeof module !== 'undefined') module.exports = RPG;
})();
