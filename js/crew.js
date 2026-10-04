/* Свита: подчинённые и генералы — уровни, снаряжение, верность, подарки, разговоры, свидания, задания. */
(function () {
  const RPG = globalThis.RPG, D = RPG.D, E = RPG.E, C = RPG.C;
  const clamp = E.clamp;
  E.PARTY_MAX = 3;
  E.recruited = (slot) => D.CREW_IDS.filter((id) => slot.crew && slot.crew[id]);
  E.unlockedComps = E.recruited;
  E.crewState = (slot, id) => slot.crew[id];
  E.recruit = function (slot, id) {
    const c = D.CREW[id]; if (!c || slot.crew[id]) return false;
    slot.crew[id] = { lv: Math.max(1, slot.hero.level - 1), xp: 0, loy: c.loy0 || 50, eq: {}, t: 0 };
    if (c.t !== 'sub') slot.rom[id] = slot.rom[id] || { aff: 0, seen: [], dates: 0, gifts: 0 };
    if (slot.party.length < 2 && !slot.party.includes(id)) slot.party.push(id);
    slot.rev++; return true;
  };
  E.setParty = function (slot, ids) { const ok = E.recruited(slot).filter((id) => !E.onMission(slot, id)); slot.party = ids.filter((x, i) => ok.includes(x) && ids.indexOf(x) === i).slice(0, E.PARTY_MAX); };
  E.finishScene = function (slot, id) { if (!slot.story.done.includes(id)) { slot.story.done.push(id); slot.rev++; } if (!slot.party.length) slot.party = E.recruited(slot).slice(0, 2); };
  E.addLoy = function (slot, id, n) { const s = slot.crew[id]; if (!s) return 0; const b = s.loy; s.loy = clamp(s.loy + n, 0, 100); return s.loy - b; };
  E.addAff = function (slot, id, n) { const r = slot.rom[id]; if (!r) return 0; const b = r.aff; r.aff = clamp(r.aff + n, 0, 100); return r.aff - b; };
  E.romStage = (r) => (!r ? 0 : r.aff >= 70 ? 3 : r.aff >= 40 ? 2 : r.aff >= 15 ? 1 : 0);
  E.ROM_AT = [15, 40, 70];
  // следующая доступная романтическая сцена (индекс 0..2) или -1
  E.romScenePending = function (slot, id) { const r = slot.rom[id]; if (!r || !slot.crew[id]) return -1; for (let i = 0; i < 3; i++) if (r.aff >= E.ROM_AT[i] && !r.seen.includes(i)) return i; return -1; };
  E.bondMods = function (slot, mods) {
    if (!D.ROMANCE) return;
    for (const id in slot.rom) { const R = D.ROMANCE[id], st = E.romStage(slot.rom[id]); if (R && R.bond && st) for (const k in R.bond) mods[k] = (mods[k] || 0) + R.bond[k] * st; }
  };
  E.crewTier = (slot, id) => D.loyTier(slot.crew[id].loy);
  E.crewXpNeed = (L) => Math.round(D.xpNeed(L) * 0.7);
  E.crewCap = (slot) => Math.min(D.LEVEL_CAP, slot.hero.level + 2);
  E.crewAddXp = function (slot, id, xp) {
    const s = slot.crew[id]; if (!s) return 0; let up = 0; const cap = E.crewCap(slot);
    if (s.lv >= cap) return 0; s.xp += xp;
    while (s.lv < cap && s.xp >= E.crewXpNeed(s.lv)) { s.xp -= E.crewXpNeed(s.lv); s.lv++; up++; }
    if (s.lv >= cap) s.xp = Math.min(s.xp, E.crewXpNeed(s.lv) - 1);
    return up;
  };
  E.crewSkills = function (slot, id) {
    const c = D.CREW[id], s = slot.crew[id], out = [];
    D.ARCH_SKILLS[c.arch].forEach(([sk, lv]) => { if (s.lv >= lv) out.push(sk); });
    if (c.sig && s.lv >= 8 && s.loy >= 50) out.push(c.sig);
    return out.slice(-5);
  };
  const SLOTKEY = { weapon: 'weapon', armor: 'body', trinket: 'ring' };
  E.crewSlotOk = (key, it) => key === 'weapon' ? it.sl === 'weapon' : key === 'armor' ? (it.sl === 'body' || it.sl === 'head') : (it.sl === 'ring' || it.sl === 'amulet');
  E.crewEquip = function (slot, id, key, itemId) {
    const s = slot.crew[id], i = slot.inv.findIndex((x) => x.id === itemId); if (!s || i < 0) return 'Нет предмета';
    const it = slot.inv[i]; if (!E.crewSlotOk(key, it)) return 'Не подходит в этот слот';
    if (it.sl === 'weapon' && D.BASES[it.k].wt === 'shield' && D.CREW[id].arch !== 'shield') return 'Щит носят только стражи';
    slot.inv.splice(i, 1); if (s.eq[key]) slot.inv.push(s.eq[key]); s.eq[key] = it; slot.rev++; return '';
  };
  E.crewUnequip = function (slot, id, key) { const s = slot.crew[id]; if (!s || !s.eq[key]) return; slot.inv.push(s.eq[key]); delete s.eq[key]; slot.rev++; };
  // боевой юнит подчинённого
  C.unitFromCrew = function (slot, id, hpFrac) {
    const c = D.CREW[id], s = slot.crew[id], L = s.lv, fs = C.fakeSlot(c.arch, L, 'human');
    const eq = s.eq || {};
    if (eq.weapon) fs.eq.weapon = eq.weapon; if (eq.armor) fs.eq[eq.armor.sl === 'head' ? 'head' : 'body'] = eq.armor; if (eq.trinket) fs.eq[eq.trinket.sl] = eq.trinket;
    const d = E.derive(fs), hm = E.derive(slot).mods.crew || 0, lt = D.loyTier(s.loy);
    const k = (c.k || 0.9) * lt.k * (1 + hm / 100);
    ['maxHp', 'atk', 'mag', 'hpow', 'def', 'res'].forEach((st) => { d[st] = Math.round(d[st] * k); });
    const u = C.baseUnit({ id, side: 'a', name: c.n, cls: c.arch, lv: L, portrait: c.art, ic: c.ic, ai: true, crewUnit: true, compSlot: true, loy: s.loy, tags: [c.t === 'sub' ? 'sub' : 'human'] }, d);
    u.sk = E.crewSkills(slot, id); u.rcMax = D.CLASSES[c.arch].rc.max; u.hp = Math.round(u.maxHp * (hpFrac == null ? 1 : hpFrac)); u.mp = u.maxMp; return u;
  };
  // ───── Подарки, разговоры, свидания ─────
  E.giftCount = (slot, g) => (slot.gifts && slot.gifts[g]) || 0;
  E.buyGift = function (slot, g, n) { const p = D.GIFTS[g].p * (n || 1); if (slot.gold < p) return false; slot.gold -= p; slot.gifts = slot.gifts || {}; slot.gifts[g] = (slot.gifts[g] || 0) + (n || 1); return true; };
  E.giftTaste = (id, g) => D.CREW[id].fav === g ? 2 : D.CREW[id].like.includes(g) ? 1 : 0;
  E.giveGift = function (slot, id, g) {
    if (!slot.crew[id]) return null; if (E.giftCount(slot, g) < 1) return null;
    slot.gifts[g]--; const t = E.giftTaste(id, g); const dl = [2, 4, 8][t], da = [1, 3, 6][t];
    const l = E.addLoy(slot, id, dl); const a = slot.rom[id] ? E.addAff(slot, id, da) : 0;
    if (slot.rom[id]) slot.rom[id].gifts++; slot.rev++; return { t, loy: l, aff: a };
  };
  E.talkTokens = (slot) => slot.crewTalk || 0;
  E.talk = function (slot, id, rng) {
    if ((slot.crewTalk || 0) < 1 || !slot.crew[id]) return null; slot.crewTalk--;
    const c = D.CREW[id], line = c.talk[Math.floor((rng ? rng() : Math.random()) * c.talk.length)];
    const l = E.addLoy(slot, id, 3), a = slot.rom[id] ? E.addAff(slot, id, 2) : 0; slot.rev++; return { line, loy: l, aff: a };
  };
  E.dateCost = (slot) => 40 + slot.hero.level * 8;
  E.dateOk = function (slot, id) { if (!slot.rom[id] || !slot.crew[id]) return 'Недоступно'; if ((slot.crewTalk || 0) < 1) return 'Нужен свободный вечер (+1 за вылазку)'; if (slot.gold < E.dateCost(slot)) return 'Не хватает золота'; return ''; };
  E.doDate = function (slot, id, good) {
    const why = E.dateOk(slot, id); if (why) return null; slot.crewTalk--; slot.gold -= E.dateCost(slot);
    const a = E.addAff(slot, id, good ? 9 : 4), l = E.addLoy(slot, id, good ? 4 : 1); slot.rom[id].dates++; slot.rev++; return { aff: a, loy: l };
  };
  // ───── Задания вне боя ─────
  E.MISSION_DUR = [{ n: 'Разведка', min: 2, k: 1 }, { n: 'Поход', min: 10, k: 3.2 }, { n: 'Долгий рейд', min: 30, k: 8 }];
  E.onMission = (slot, id) => (slot.missions || []).some((m) => m.cid === id);
  E.missionLeft = (m, now) => Math.max(0, m.start + m.dur * 60000 - (now || Date.now()));
  E.sendMission = function (slot, id, did, di, now) {
    if (!slot.crew[id]) return 'Нет такого подчинённого'; if (E.onMission(slot, id)) return 'Уже в походе';
    if (slot.run && slot.party.includes(id)) return 'Он в вашем отряде';
    if ((slot.missions || []).length >= 3) return 'Не более трёх заданий одновременно';
    if (!E.dungeonUnlocked(slot, did)) return 'Подземелье закрыто';
    const md = E.MISSION_DUR[di]; if (!md) return 'Нет такой длительности';
    slot.party = slot.party.filter((x) => x !== id);
    slot.missions = slot.missions || []; slot.missions.push({ cid: id, did, di, dur: md.min, start: now || Date.now(), seed: (E.hash(id + did) + slot.stats.runs * 17 + slot.uid) >>> 0 }); slot.rev++; return '';
  };
  E.missionChance = (slot, m) => clamp(0.6 + (slot.crew[m.cid].lv - D.DUN[m.did].lv) * 0.05 + (D.loyTier(slot.crew[m.cid].loy).k - 1), 0.3, 0.97);
  E.collectMission = function (slot, idx, now) {
    const m = slot.missions[idx]; if (!m || E.missionLeft(m, now) > 0) return null;
    const rng = E.rng(m.seed), d = D.DUN[m.did], md = E.MISSION_DUR[m.di], c = slot.crew[m.cid];
    const ok = rng() < E.missionChance(slot, m); const res = { cid: m.cid, ok, gold: 0, mats: {}, xp: 0 };
    if (ok) {
      res.gold = Math.round((16 + 7 * d.lv) * md.k * (0.85 + rng() * 0.3));
      const eid = d.pool[Math.floor(rng() * d.pool.length)]; (D.ENEMIES[eid].loot || []).forEach((l) => { if (rng() < Math.min(1, l[1] * 1.6)) { const q = Math.max(1, Math.round(rng.int(l[2], l[3]) * (md.k > 3 ? 2 : 1))); res.mats[l[0]] = (res.mats[l[0]] || 0) + q; } });
      res.xp = Math.round((20 + 9 * d.lv) * md.k); slot.gold += res.gold; slot.stats.goldEarned += res.gold; for (const k in res.mats) E.addMat(slot, k, res.mats[k]);
      res.up = E.crewAddXp(slot, m.cid, res.xp); E.addLoy(slot, m.cid, 1);
    } else { res.xp = Math.round(6 * md.k); res.up = E.crewAddXp(slot, m.cid, res.xp); E.addLoy(slot, m.cid, -1); }
    slot.missions.splice(idx, 1); slot.rev++; return res;
  };
  // награда в бою: опыт и верность
  E.crewAfterBattle = function (slot, ids, xp, boss) {
    const out = {};
    ids.forEach((id) => { if (!slot.crew[id]) return; out[id] = E.crewAddXp(slot, id, Math.round(xp * 0.7)); if (boss) E.addLoy(slot, id, 2); });
    return out;
  };
  if (typeof module !== 'undefined') module.exports = RPG;
})();
