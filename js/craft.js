/* v2.15 — Ремесло творца (пользовательское снаряжение). Открывается, если у героя ОБЕ профессии: Кузнец и Зачарователь.
   3 материала → редкость (СРЕДНЕЕ качество, вниз, не выше Божественного = 7) → конструктор: основа (любое оружие/броня/украшение),
   имя, бюджет очков на линии характеристик и аффиксов (лимиты числа линий и значения линии — как у случайных вещей этой редкости),
   особые свойства (по одному на каждый тип u/m/d, который даёт редкость), навыки (пул «Отголосков Нимба»), иконка из 200 (≤ редкости),
   для Божественного из 3 божественных материалов — своя PNG. Всё значимое пересчитывается из it.cu при загрузке (защита от подмены). Логика без DOM. */
(function () {
  const RPG = globalThis.RPG, D = RPG.D, E = RPG.E, S = RPG.S;
  const clamp = E.clamp;

  // ───── Качество материалов (0…7 = ступень редкости) ─────
  Object.assign(D.MATS, {
    star_ore: { n: 'Звёздная руда', ic: '🌠', v: 45, q: 4, d: 'Эпический материал. Мини-боссы и боссы с ур. 18.' },
    phoenix_f: { n: 'Перо феникса', ic: '🪶', v: 80, q: 5, d: 'Легендарный материал. Мини-боссы и боссы с ур. 28.' },
    myth_blood: { n: 'Кровь Мифа', ic: '🩸', v: 140, q: 6, d: 'Мифический материал. Мини-боссы и боссы с ур. 45.' },
    nimbus_shard: { n: 'Осколок Нимба', ic: '💫', v: 240, q: 7, d: 'Божественный материал. Только боссы с ур. 65.' }
  });
  const Q = { ore_cu: 0, herb_g: 0, hide: 0, cloth: 0, fish_s: 0, meat: 0, spice: 0, prov: 0,
    ore_fe: 1, ing_cu: 1, herb_b: 1, fang: 1, fish_m: 1, leather: 1,
    ore_ms: 2, gem_ae: 2, ing_fe: 2, herb_r: 2, silk: 2, dust: 2, fish_i: 2,
    ing_ms: 3, gem_fr: 3, herb_s: 3, ess: 3, ess_l: 3 };
  for (const id in Q) if (D.MATS[id] && D.MATS[id].q == null) D.MATS[id].q = Q[id];
  E.matQ = (id) => (D.MATS[id] && D.MATS[id].q != null ? clamp(D.MATS[id].q | 0, 0, 7) : 0);
  // где добываются высокие качества: [качество, мин. ур. врага, шанс босс, мини-босс, элита]
  D.CRAFT_DROPS = [['star_ore', 4, 18, 0.5, 0.25, 0.04], ['phoenix_f', 5, 28, 0.45, 0.2, 0.03], ['myth_blood', 6, 45, 0.4, 0.15, 0.02], ['nimbus_shard', 7, 65, 0.3, 0, 0]];
  const _roll = E.rollLoot;
  E.rollLoot = function (rng, slot, enemy, ctx) {
    const out = _roll(rng, slot, enemy, ctx), role = enemy.role, k = role === 'boss' ? 3 : role === 'mini' ? 4 : enemy.elite ? 5 : 0;
    if (!k) return out;
    const dk = (1 + ((ctx.mods && ctx.mods.drop) || 0) / 100) * ((ctx.tier && ctx.tier.loot) || 1);
    let best = null; D.CRAFT_DROPS.forEach((d) => { if (enemy.lv >= d[2] && d[k] > 0) best = d; });
    if (best && rng() < Math.min(0.9, best[k] * dk)) {
      const pool = D.CRAFT_DROPS.filter((d) => enemy.lv >= d[2] && d[k] > 0), d = rng() < 0.45 ? best : pool[Math.floor(rng() * pool.length)];
      out.mats[d[0]] = (out.mats[d[0]] || 0) + 1;
    }
    return out;
  };

  // ───── Открытие и редкость ─────
  E.craftUnlocked = (slot) => { const h = slot && slot.hero; if (!h) return false; const p = [h.prof1, h.prof2]; return p.includes('smith') && p.includes('ench'); };
  E.craftLockWhy = (slot) => { const h = slot.hero, p = [h.prof1, h.prof2], miss = ['smith', 'ench'].filter((x) => !p.includes(x)).map((x) => D.PROFS[x].n); return miss.length ? 'Нужны обе профессии: Кузнец и Зачарователь (нет: ' + miss.join(', ') + ')' : ''; };
  D.CRAFT_MAX_R = Math.min(7, D.RARITY_OPEN);     // никогда выше Божественного
  // v2.16: редкость = СРЕДНЕЕ качество трёх материалов, округление вниз, не выше 7
  E.craftRarity = (mats) => (Array.isArray(mats) && mats.length === 3 && mats.every((id) => D.MATS[id]) ? Math.min(D.CRAFT_MAX_R, Math.floor(mats.map(E.matQ).reduce((a, b) => a + b, 0) / 3)) : -1);
  E.craftDivine = (mats) => Array.isArray(mats) && mats.length === 3 && mats.every((id) => E.matQ(id) >= 7);

  // ───── Правила редкости ─────
  // lines: attr/aff — максимум линий как у случайной вещи; pts — до 10 очков на линию (10 = максимальный бросок случайной вещи);
  // budget — подобран по оценке вещи (E.itemScore, все основы, ур. 10…90): ЛУЧШАЯ возможная раскладка ≈ 90-й перцентиль случайной вещи
  // той же редкости (не ниже медианы), но ниже медианы следующей редкости (проверяет test/craft.js).
  D.CRAFT_PT_MAX = 10; D.CRAFT_BUDGET = [8, 10, 17, 18, 28, 40, 45, 52];
  D.CRAFT_SK = [0, 0, 0, 0, 1, 1, 1, 2];        // навыков: Эпический…Мифический — 1, Божественный — 2
  E.craftRules = function (r) {
    r = clamp(r | 0, 0, D.CRAFT_MAX_R); const R = D.RARITY[r];
    const attr = R.attr[1], aff = R.aff[1];
    return { r, attr, aff, fx: R.fx.slice(), sk: D.CRAFT_SK[r], budget: D.CRAFT_BUDGET[r], lineMax: D.CRAFT_PT_MAX };
  };
  D.CRAFT_SK_POOL = Object.keys(D.UNIQ || {}).map((id) => D.UNIQ[id].skillId).filter((id) => D.SKILLS[id]);

  // ───── Значения линий ─────
  const pOf = (il) => 5 + il * 2.4, round1 = (v) => Math.round(v * 10) / 10, TOP = 1.15;
  E.craftAttrVal = (k, il, r, pts) => Math.max(1, Math.round(D.GEAR_ATTR_K * pOf(il) * D.RARITY[r].am * TOP * pts / D.CRAFT_PT_MAX));
  E.craftAffVal = function (k, il, r, pts) {
    const a = D.GEAR_AFF_BY[k], pm = D.RARITY[r].pm, t = TOP * pts / D.CRAFT_PT_MAX; if (!a) return 0;
    if (a.f) return Math.max(1, Math.round(a.f * pOf(il) * pm * t));
    const v = round1(Math.min(a.cap || 1e9, (a.pct[0] + il * a.pct[1]) * pm * t)); return a.frac ? Math.round(v) / 100 : Math.max(0.1, v);
  };
  E.craftFxVal = function (f, il, r) { if (f.fixed != null) return f.fixed; const v = round1(Math.min(f.cap, (f.pct[0] + il * f.pct[1]) * D.RARITY[r].pm)); return (f.sign || 1) * Math.max(0.1, v); };
  E.craftLineVal = (k, il, r, pts) => (D.STATS.includes(k) ? E.craftAttrVal(k, il, r, pts) : E.craftAffVal(k, il, r, pts));
  D.CRAFT_BASES = Object.keys(D.BASES);
  E.craftIconGroup = (base) => (/^head_/.test(base) ? 'head' : /^body_/.test(base) ? 'body' : /^boots_/.test(base) ? 'boots' : base);
  E.craftIcons = (base, r) => { const g = E.craftIconGroup(base); return (D.CRAFT_ICONS || []).filter((ic) => ic.g === g && ic.r <= r); };

  // ───── Имя и картинка ─────
  E.craftName = (s, base) => { let t = String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f<>&"'`\\{}]/g, '').replace(/\s+/g, ' ').trim().slice(0, D.CRAFT_NAME_MAX); return t || (D.BASES[base] ? D.BASES[base].n : 'Предмет'); };
  D.CRAFT_NAME_MAX = 28; D.CRAFT_IMG_MAX = 60 * 1024;   // лимит на ОБЕ картинки вместе (символы data URL)
  E.craftImgOk = (u) => typeof u === 'string' && /^data:image\/(png|webp|jpeg);base64,[A-Za-z0-9+/=]+$/.test(u) && u.length <= D.CRAFT_IMG_MAX;
  E.craftCanUpload = (r, mats) => (r | 0) === 7 && E.craftDivine(mats);
  // v2.16: полноразмерная картинка (до 1024 px) лежит в IndexedDB по ключу; в сейве — только ключ и превью 128
  E.craftKeyOk = (k) => typeof k === 'string' && /^ci_[a-z0-9]{6,32}$/.test(k);
  D.CRAFT_UP_MAX = 15 * 1024 * 1024; D.CRAFT_HD_PX = 1024; D.CRAFT_HD_MAX = 8 * 1024 * 1024;

  // ───── Проверка и сборка (одна функция и для создания, и для перепроверки сохранения) ─────
  // spec: { base, mats[3], nm, a:{ключ: очки}, fx:{u,m,d: id}, sk:[id], ic: номер иконки, img?, img2? }; il — уровень предмета
  E.craftCheck = function (spec, o) {
    o = o || {}; const err = [], fix = !!o.fix; spec = spec && typeof spec === 'object' ? spec : {};
    const base = D.BASES[spec.base] ? spec.base : null; if (!base) { err.push('нет основы'); return { err, spec: null }; }
    let r = E.craftRarity(spec.mats); if (r < 0) { err.push('нужно ровно 3 материала'); if (!fix) return { err, spec: null }; r = 0; }
    if (o.r != null && (o.r | 0) < r) r = clamp(o.r | 0, 0, r);      // сохранённая редкость ниже — не поднимаем
    const R = E.craftRules(r), a = {}, src = spec.a && typeof spec.a === 'object' ? spec.a : {};
    const attrK = [], affK = [];
    Object.keys(src).forEach((k) => {
      let p = Math.floor(+src[k]); if (!(p > 0)) return; if (p > R.lineMax) { err.push(k + ': больше ' + R.lineMax + ' очков'); p = R.lineMax; }
      if (D.BASES[base].p[k] != null) err.push(k + ': уже в основе'); else if (D.STATS.includes(k)) attrK.push([k, p]); else if (D.GEAR_AFF_BY[k]) affK.push([k, p]); else err.push(k + ': недопустимая линия');
    });
    if (attrK.length > R.attr) { err.push('линий характеристик больше ' + R.attr); attrK.length = R.attr; }
    if (affK.length > R.aff) { err.push('аффиксов больше ' + R.aff); affK.length = R.aff; }
    attrK.concat(affK).forEach(([k, p]) => { a[k] = p; });
    let tot = Object.values(a).reduce((x, y) => x + y, 0);
    if (tot > R.budget) { err.push('очков ' + tot + ' > бюджета ' + R.budget); while (tot > R.budget) { const k = Object.keys(a).sort((x, y) => a[y] - a[x])[0]; a[k]--; tot--; if (!a[k]) delete a[k]; } }
    const fx = {}, sf = spec.fx && typeof spec.fx === 'object' ? spec.fx : {}, usedK = new Set(Object.keys(a));
    R.fx.forEach((t) => { const f = D.GEAR_FX_BY[sf[t]]; if (f && f.t === t && !usedK.has(f.k)) { fx[t] = f.id; usedK.add(f.k); } else if (sf[t]) err.push('свойство ' + t + ' недопустимо'); });
    Object.keys(sf).forEach((t) => { if (!R.fx.includes(t)) err.push('свойство ' + t + ' не для этой редкости'); });
    const sk = (Array.isArray(spec.sk) ? spec.sk : []).filter((id, i, l) => D.CRAFT_SK_POOL.includes(id) && l.indexOf(id) === i);
    if ((Array.isArray(spec.sk) ? spec.sk.length : 0) !== sk.length) err.push('недопустимый навык');
    if (sk.length > R.sk) { err.push('навыков больше ' + R.sk); sk.length = R.sk; }
    const icons = E.craftIcons(base, r); let ic = +spec.ic;
    if (!icons.some((x) => x.id === ic)) { if (spec.ic != null) err.push('иконка не подходит'); ic = icons.length ? icons[icons.length - 1].id : 0; }
    const out = { base, mats: spec.mats.slice(0, 3), nm: E.craftName(spec.nm, base), a, fx, sk, ic, r, div: E.craftDivine(spec.mats) };
    if (spec.img != null || spec.img2 != null) {
      const okU = E.craftCanUpload(r, spec.mats), tot2 = String(spec.img || '').length + String(spec.img2 || '').length;
      if (!okU) err.push('своя иконка — только Божественный из 3 божественных материалов');
      else if (!E.craftImgOk(spec.img) || (spec.img2 != null && !E.craftImgOk(spec.img2)) || tot2 > D.CRAFT_IMG_MAX) err.push('картинка не прошла проверку');
      else { out.img = spec.img; if (spec.img2) out.img2 = spec.img2; if (spec.imgKey != null) { if (E.craftKeyOk(spec.imgKey)) out.imgKey = spec.imgKey; else err.push('ключ картинки не прошёл проверку'); } }
    }
    return { err, spec: out, rules: R, spent: tot };
  };
  E.craftBuild = function (cs, il, by) {
    const B = D.BASES[cs.base], r = cs.r, Rr = D.RARITY[r], p = pOf(il);
    const it = { id: 0, k: cs.base, r, il, nm: cs.nm, st: {}, up: 0, en: null, sl: B.slot, fx: [], gv: 2, cu: { v: 1, mats: cs.mats, a: cs.a, fx: cs.fx, sk: cs.sk, ic: cs.ic, by: by || '' } };
    for (const k in B.p) it.st[k] = Math.max(1, Math.round(B.p[k] * p * Rr.mul * 1.02));   // основа: чуть выше среднего броска
    for (const k in cs.a) it.st[k] = E.craftLineVal(k, il, r, cs.a[k]);
    ['u', 'm', 'd'].forEach((t) => { const f = D.GEAR_FX_BY[cs.fx[t]]; if (f) { it.st[f.k] = E.craftFxVal(f, il, r); it.fx.push(f.id); } });
    if (cs.img) { it.cu.img = cs.img; if (cs.img2) it.cu.img2 = cs.img2; if (cs.imgKey) it.cu.imgKey = cs.imgKey; }
    return it;
  };
  // предпросмотр без траты
  E.craftPreview = function (slot, spec) { const c = E.craftCheck(spec); if (!c.spec) return c; c.item = E.craftBuild(c.spec, E.craftIl(slot), slot.hero.name); return c; };
  E.craftIl = (slot) => clamp(slot.hero.level | 0 || 1, 1, 100);
  E.craftMatsOk = function (slot, mats) { const need = {}; (mats || []).forEach((id) => { need[id] = (need[id] || 0) + 1; }); return Object.keys(need).every((id) => (slot.mats[id] || 0) >= need[id]); };
  // создание: материалы тратятся ТОЛЬКО здесь и только если всё прошло проверку
  E.craftCustom = function (slot, spec) {
    if (!E.craftUnlocked(slot)) return { err: E.craftLockWhy(slot) };
    if (slot.run) return { err: 'Не во время вылазки' };
    const c = E.craftCheck(spec); if (!c.spec) return { err: c.err.join('; ') }; if (c.err.length) return { err: c.err.join('; ') };
    if (!E.craftMatsOk(slot, c.spec.mats)) return { err: 'Не хватает материалов' };
    const cost = E.craftGold(c.spec.r); if (slot.gold < cost) return { err: 'Нужно 🪙' + cost };
    const it = E.craftBuild(c.spec, E.craftIl(slot), slot.hero.name); it.cu.t = Date.now();
    c.spec.mats.forEach((id) => { slot.mats[id]--; if (slot.mats[id] <= 0) delete slot.mats[id]; }); slot.gold -= cost;
    E.addItem(slot, it); slot.stats = slot.stats || {}; slot.stats.crafted = (slot.stats.crafted || 0) + 1;
    ['smith', 'ench'].forEach((p) => E.profXp(slot, p, 20 + c.spec.r * 15));
    return { item: it };
  };
  // v2.16: ×3 для 0…6 (120·2^r), ×7 для Божественного (35 840)
  E.craftGold = (r) => { r = clamp(r | 0, 0, 7); return r === 7 ? 40 * 128 * 7 : 120 * Math.pow(2, r); };
  // перепроверка вещи из сохранения: статы пересобираются из it.cu, всё сверх правил режется; up/en/lock/id сохраняются
  E.craftSanitize = function (it) {
    if (!it || typeof it !== 'object' || !it.cu || typeof it.cu !== 'object') return it;
    const cu = it.cu, spec = { base: it.k, mats: Array.isArray(cu.mats) ? cu.mats.slice(0, 3) : [], nm: it.nm, a: cu.a, fx: cu.fx, sk: cu.sk, ic: cu.ic, img: cu.img, img2: cu.img2, imgKey: cu.imgKey };
    let c = E.craftCheck(spec, { fix: true, r: it.r });
    if (!c.spec) { c = E.craftCheck(Object.assign(spec, { base: 'sword' }), { fix: true, r: 0 }); }
    const il = clamp(it.il | 0 || 1, 1, 100), fresh = E.craftBuild(c.spec, il, String(cu.by || '').slice(0, 16));
    fresh.cu.t = +cu.t || 0; if (c.err.length) fresh.cu.fixed = 1;
    ['id', 'up', 'en', 'lock'].forEach((k) => { if (it[k] != null) fresh[k] = it[k]; });
    fresh.up = clamp(fresh.up | 0, 0, 20);
    Object.keys(it).forEach((k) => delete it[k]); Object.assign(it, fresh); return it;
  };
  // ───── v2.16: смена профессий за золото ─────
  // Основную и/или дополнительную можно сменить за 50 000 🪙 каждую смену. Прогресс (ур./опыт) каждой профессии хранится в slot.profs
  // и не стирается: вернувшись к ней, герой продолжает с того же места (уровень выше потолка новой роли ограничен потолком — 20 / 10).
  // Выбор текущей второй профессии основной (и наоборот) меняет их местами — это одна смена.
  D.PROF_CHANGE_COST = 50000;
  E.profChange = function (slot, which, pid) {
    const h = slot.hero; if (slot.run) return 'Не во время вылазки';
    if (!D.PROFS[pid]) return 'Нет такой профессии'; if (which !== 'main' && which !== 'sub') return 'Неверный выбор';
    const cur = which === 'main' ? h.prof1 : h.prof2, other = which === 'main' ? h.prof2 : h.prof1;
    if (cur === pid) return 'Это уже ваша профессия';
    if ((slot.gold | 0) < D.PROF_CHANGE_COST) return 'Нужно 🪙' + D.PROF_CHANGE_COST;
    slot.gold -= D.PROF_CHANGE_COST;
    if (pid === other) { const t = h.prof1; h.prof1 = h.prof2; h.prof2 = t; }
    else if (which === 'main') h.prof1 = pid; else h.prof2 = pid;
    slot.profs[pid] = slot.profs[pid] || { lv: 1, xp: 0 }; h.profLocked = true; slot.stats = slot.stats || {}; slot.stats.profChanges = (slot.stats.profChanges || 0) + 1;
    return '';
  };
  // уровень с учётом потолка текущей роли (сохранённый прогресс не трогаем)
  const _plv = E.profLv;
  E.profLv = (slot, pid) => { const lv = _plv(slot, pid), cap = E.profCap(slot.hero, pid); return cap ? Math.min(lv, cap) : lv; };
  // навыки вещи
  const _gs = E.gearSkills;
  E.gearSkills = function (eq) { const out = _gs(eq); Object.values(eq || {}).forEach((it) => { if (it && it.cu && Array.isArray(it.cu.sk)) it.cu.sk.forEach((id) => { if (D.CRAFT_SK_POOL.includes(id) && !out.includes(id)) out.push(id); }); }); return out; };
  // загрузка сохранения: все пользовательские вещи перепроверяются
  if (S && S.migrate) {
    const _mg = S.migrate;
    S.migrate = function (p) { p = _mg(p); if (p && Array.isArray(p.slots)) p.slots.forEach((s) => { if (s) E.slotItems(s).forEach(E.craftSanitize); }); return p; };
  }
})();
