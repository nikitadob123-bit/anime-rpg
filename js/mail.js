/* Почта: письма с подарками. Источники — «сервер» (статический mail/inbox.json на GitHub Pages) и сама игра (локальные письма).
   Логика без DOM (тестируется в node). Состояние хранится в слоте: slot.mail = { list, seen, claimed, arcBase }.
   Повторная загрузка ленты не дублирует письма (seen[id]); подарок выдаётся один раз на id (claimed[id]) — даже если письмо удалено или переведены часы. */
(function () {
  const RPG = globalThis.RPG, D = RPG.D, E = RPG.E;
  const M = RPG.M = {};
  M.FEED = 'mail/inbox.json';
  M.MAX_LIST = 60;                          // в ящике держим не больше 60 писем (старые прочитанные и забранные — удаляются первыми)
  M.ID_RE = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/;
  M.RARITY_IDS = D.RARITY.slice(0, D.RARITY_OPEN + 1).map((r) => r.id);   // common … divine (0…7); 8+ («Концептуальный» и выше) ещё не открыты
  M.RARITY_ALIAS = { legendary: 'legend', myth: 'mythic', god: 'divine' };
  // типы подарков: ключ → описание (для валидации, CLI и документации)
  M.GIFT_TYPES = {
    gold: 'золото 🪙 (число)',
    xp: 'опыт героя (число)',
    sp: 'искры Нимба ✦ (число)',
    cons: 'расходники: { id: количество } — зелья, склянки, еда',
    mats: 'материалы: { id: количество } — руда, травы, слитки, эссенции',
    presents: 'подарки для Свиты: { id: количество }',
    gear: 'снаряжение: [{ base, rarity, il?, nm? }] — base из списка, rarity 0–7 или common/uncommon/rare/unique/epic/legend/mythic/divine, il — уровень (по умолчанию = уровень героя)'
  };
  const MAXN = 10000000;
  const isInt = (n) => typeof n === 'number' && Number.isInteger(n) && n > 0 && n <= MAXN;
  const parseT = (s) => { if (s == null || s === '') return NaN; const t = typeof s === 'number' ? s : Date.parse(s); return Number.isFinite(t) ? t : NaN; };
  M.parseT = parseT;
  const rarIdx = (r) => (typeof r === 'number' ? r : M.RARITY_IDS.indexOf(M.RARITY_ALIAS[String(r)] || String(r)));
  M.rarIdx = rarIdx;

  // ───── Подарки ─────
  // Подарки письма: объект в формате ['give'] сюжета ({ gold, cons:{}, mats:{} … }) или массив таких объектов (сливаются).
  M.normGifts = function (g) {
    if (!g) return {};
    const arr = Array.isArray(g) ? g : [g], out = {};
    arr.forEach((x) => {
      if (!x || typeof x !== 'object') return;
      for (const k in x) {
        const v = x[k];
        if (k === 'gold' || k === 'xp' || k === 'sp') out[k] = (out[k] || 0) + v;
        else if (k === 'gear') out.gear = (out.gear || []).concat(Array.isArray(v) ? v : [v]);
        else if (k === 'item' && v === 'tear') out.item = 'tear';
        else if (v && typeof v === 'object') { out[k] = out[k] || {}; for (const id in v) out[k][id] = (out[k][id] || 0) + v[id]; }
        else out[k] = v;   // неизвестное — пусть валидатор скажет
      }
    });
    return out;
  };
  // список ошибок (пустой — всё верно)
  M.giftErrors = function (g) {
    const err = []; g = M.normGifts(g);
    const tables = { cons: D.CONS, mats: D.MATS, presents: D.GIFTS };
    for (const k in g) {
      const v = g[k];
      if (k === 'gold' || k === 'xp' || k === 'sp') { if (!isInt(v)) err.push(`${k}: нужно целое число от 1 до ${MAXN}`); }
      else if (tables[k]) { for (const id in v) { if (!tables[k][id]) err.push(`${k}: неизвестный id «${id}»`); else if (!isInt(v[id]) || v[id] > 9999) err.push(`${k}.${id}: нужно целое число от 1 до 9999`); } }
      else if (k === 'gear') {
        if (v.length > 10) err.push('gear: не больше 10 вещей в письме');
        v.forEach((it, i) => {
          if (!it || typeof it !== 'object') { err.push(`gear[${i}]: нужен объект { base, rarity }`); return; }
          if (!D.BASES[it.base]) err.push(`gear[${i}]: неизвестный base «${it.base}»`);
          const r = rarIdx(it.rarity == null ? 0 : it.rarity), lockd = typeof it.rarity === 'number' ? it.rarity >= D.RARITY_OPEN + 1 && it.rarity < D.RARITY.length : D.RARITY_IDS.indexOf(String(it.rarity)) > D.RARITY_OPEN;
          if (!(Number.isInteger(r) && r >= 0 && r <= D.RARITY_OPEN)) err.push(`gear[${i}]: rarity — 0…${D.RARITY_OPEN} или ${M.RARITY_IDS.join('/')}` + (lockd ? ' («' + D.RARITY[typeof it.rarity === 'number' ? it.rarity : D.RARITY_IDS.indexOf(String(it.rarity))].n + '» и выше ещё не открыты)' : ''));
          if (it.il != null && !(isInt(it.il) && it.il <= D.LEVEL_CAP)) err.push(`gear[${i}]: il — уровень 1…${D.LEVEL_CAP}`);
          if (it.nm != null && (typeof it.nm !== 'string' || it.nm.length > 40)) err.push(`gear[${i}]: nm — строка до 40 символов`);
        });
      }
      else if (k === 'item' && v === 'tear') { /* сюжетный артефакт */ }
      else err.push(`неизвестный тип подарка «${k}» (можно: ${Object.keys(M.GIFT_TYPES).join(', ')})`);
    }
    return err;
  };
  M.hasGifts = (g) => Object.keys(M.normGifts(g)).length > 0;
  // строки для показа: [{ ic, n, q }]
  M.giftList = function (g) {
    g = M.normGifts(g); const out = [];
    if (g.gold) out.push({ ic: '🪙', n: 'Золото', q: g.gold });
    if (g.xp) out.push({ ic: '⭐', n: 'Опыт', q: g.xp });
    if (g.sp) out.push({ ic: '✦', n: 'Искры Нимба', q: g.sp });
    for (const id in (g.cons || {})) if (D.CONS[id]) out.push({ ic: D.CONS[id].ic, n: D.CONS[id].n, q: g.cons[id] });
    for (const id in (g.mats || {})) if (D.MATS[id]) out.push({ ic: D.MATS[id].ic, n: D.MATS[id].n, q: g.mats[id] });
    for (const id in (g.presents || {})) if (D.GIFTS[id]) out.push({ ic: D.GIFTS[id].ic, n: D.GIFTS[id].n, q: g.presents[id] });
    (g.gear || []).forEach((it) => { const B = D.BASES[it.base]; if (B) { const ri = rarIdx(it.rarity || 0), r = D.RARITY[ri] || D.RARITY[0]; out.push({ ic: B.ic, n: it.nm || B.n, q: 1, c: r.c, r: r.n, ri: D.RARITY[ri] ? ri : 0 }); } });
    if (g.item === 'tear') out.push({ ic: '📿', n: 'Слеза Осколка', q: 1, c: D.RARITY[5].c, r: D.RARITY[5].n, ri: 5 });
    return out;
  };
  // выдать подарки (seed — id письма: вещи одинаковы при любом устройстве)
  M.apply = function (slot, g, seed) {
    g = M.normGifts(g); const got = { items: [], levels: 0 };
    if (g.gold) slot.gold += g.gold;
    if (g.xp) got.levels = E.addXp(slot, g.xp) || 0;
    if (g.sp) slot.hero.bossPts = (slot.hero.bossPts || 0) + g.sp;
    for (const id in (g.cons || {})) if (D.CONS[id]) E.addCons(slot, id, g.cons[id]);
    for (const id in (g.mats || {})) if (D.MATS[id]) E.addMat(slot, id, g.mats[id]);
    for (const id in (g.presents || {})) if (D.GIFTS[id]) { slot.gifts = slot.gifts || {}; slot.gifts[id] = (slot.gifts[id] || 0) + g.presents[id]; }
    (g.gear || []).forEach((x, i) => {
      if (!D.BASES[x.base]) return;
      const it = E.genItem(E.rng(E.hash(String(seed) + ':' + i)), { base: x.base, rarity: Math.max(0, Math.min(D.RARITY_OPEN, rarIdx(x.rarity || 0) | 0)), il: x.il || slot.hero.level || 1 });
      if (x.nm) it.nm = String(x.nm).slice(0, 40);
      got.items.push(E.addItem(slot, it));
    });
    if (g.item === 'tear') E.give(slot, { item: 'tear' });
    slot.rev = (slot.rev || 0) + 1;
    return got;
  };

  // ───── Лента писем ─────
  const str = (v, n) => String(v == null ? '' : v).slice(0, n);
  M.letterErrors = function (L) {
    const err = [];
    if (!L || typeof L !== 'object') return ['письмо должно быть объектом'];
    if (typeof L.id !== 'string' || !M.ID_RE.test(L.id)) err.push('id: латиница/цифры/-_. до 64 символов');
    if (!L.title || typeof L.title !== 'string') err.push('title: нужен заголовок');
    if (L.body != null && typeof L.body !== 'string') err.push('body: текст');
    if (L.date != null && !Number.isFinite(parseT(L.date))) err.push('date: дата вида 2026-10-06');
    if (L.expires != null && !Number.isFinite(parseT(L.expires))) err.push('expires: дата вида 2026-10-13');
    const c = L.conditions;
    if (c != null) {
      if (typeof c !== 'object') err.push('conditions: объект');
      else for (const k in c) {
        if (k === 'minLevel' || k === 'minChapter') { if (!isInt(c[k])) err.push(`conditions.${k}: целое число`); }
        else if (k === 'createdBefore' || k === 'createdAfter') { if (!Number.isFinite(parseT(c[k]))) err.push(`conditions.${k}: дата`); }
        else if (k === 'newPlayersOnly') { if (typeof c[k] !== 'boolean') err.push('conditions.newPlayersOnly: true/false'); }
        else err.push(`conditions: неизвестное условие «${k}»`);
      }
    }
    return err.concat(M.giftErrors(L.gifts || {}).map((e) => 'gifts.' + e));
  };
  // разбор ленты: битые письма пропускаются, игра не падает
  M.parseFeed = function (json) {
    let data = json;
    if (typeof json === 'string') { try { data = JSON.parse(json); } catch (e) { return { letters: [], errors: ['JSON не читается: ' + e.message] }; } }
    const arr = Array.isArray(data) ? data : (data && Array.isArray(data.letters) ? data.letters : null);
    if (!arr) return { letters: [], errors: ['нет массива letters'] };
    const letters = [], errors = [], ids = new Set();
    arr.forEach((L, i) => {
      const e = M.letterErrors(L);
      if (!e.length && ids.has(L.id)) e.push('id повторяется: ' + L.id);
      if (e.length) { errors.push(`#${i + 1} ${L && L.id || ''}: ${e.join('; ')}`); return; }
      ids.add(L.id);
      letters.push({ id: L.id, from: str(L.from || 'Администрация', 40), title: str(L.title, 80), body: str(L.body, 4000), date: L.date || null, expires: L.expires || null, conditions: L.conditions || null, gifts: M.normGifts(L.gifts) });
    });
    return { letters, errors };
  };

  // ───── Состояние в слоте ─────
  M.chapters = (slot) => { const ST = RPG.story; try { if (ST && ST.doneCount) return ST.doneCount(slot); } catch (e) { /* ignore */ } return (slot.story && slot.story.ch) || 0; };
  M.ensure = function (slot) {
    if (!slot) return null;
    const m = slot.mail = (slot.mail && typeof slot.mail === 'object') ? slot.mail : {};
    if (!Array.isArray(m.list)) m.list = [];
    if (!m.seen || typeof m.seen !== 'object') m.seen = {};
    if (!m.claimed || typeof m.claimed !== 'object') m.claimed = {};
    // письма за арки — только за арки, пройденные после появления почты (без «ретро-подарков» за 50 глав сразу)
    if (typeof m.arcBase !== 'number') m.arcBase = Math.floor(M.chapters(slot) / 10);
    return m;
  };
  // expires «2026-10-13» (только дата) — письмо действует весь этот день включительно
  M.expiresAt = (L) => { let t = parseT(L && L.expires); if (Number.isFinite(t) && /^\d{4}-\d{2}-\d{2}$/.test(String(L.expires))) t += 864e5 - 1; return t; };
  M.isExpired = (L, now) => { const t = M.expiresAt(L); return Number.isFinite(t) && (now == null ? Date.now() : now) > t; };
  M.canClaim = (slot, L, now) => !!L && M.hasGifts(L.gifts) && !M.ensure(slot).claimed[L.id] && !L.claimed && !M.isExpired(L, now);
  // подходит ли письмо этому герою сейчас
  M.eligible = function (slot, L, now) {
    now = now == null ? Date.now() : now;
    const m = M.ensure(slot);
    if (m.seen[L.id] || m.claimed[L.id]) return false;
    const d = parseT(L.date); if (Number.isFinite(d) && d > now + 864e5) return false;   // запланированное письмо (с запасом на часовой пояс — сутки)
    if (M.isExpired(L, now)) return false;
    const c = L.conditions || {}, h = slot.hero || {};
    if (c.minLevel && (h.level || 1) < c.minLevel) return false;
    if (c.minChapter && M.chapters(slot) < c.minChapter) return false;
    const created = slot.created || 0;
    if (c.createdBefore && !(created < parseT(c.createdBefore))) return false;
    const after = c.createdAfter ? parseT(c.createdAfter) : (c.newPlayersOnly && Number.isFinite(d) ? d : NaN);
    if (Number.isFinite(after) && !(created >= after)) return false;
    return true;
  };
  // положить подходящие письма в ящик; возвращает число новых
  M.deliver = function (slot, letters, now) {
    now = now == null ? Date.now() : now;
    const m = M.ensure(slot); let n = 0;
    (letters || []).forEach((L) => {
      if (!L || !L.id || !M.eligible(slot, L, now)) return;
      m.seen[L.id] = now;
      m.list.unshift({ id: L.id, src: L.src || 'srv', from: L.from, title: L.title, body: L.body, date: L.date || new Date(now).toISOString(), expires: L.expires || null, gifts: M.normGifts(L.gifts), got: now, read: 0, claimed: 0 });
      n++;
    });
    if (m.list.length > M.MAX_LIST) {   // переполнение: убираем самые старые «закрытые» письма
      const closed = (x) => x.read && (x.claimed || !M.hasGifts(x.gifts) || M.isExpired(x, now));
      for (let i = m.list.length - 1; i >= 0 && m.list.length > M.MAX_LIST; i--) if (closed(m.list[i])) m.list.splice(i, 1);
    }
    return n;
  };
  M.find = (slot, id) => M.ensure(slot).list.find((x) => x.id === id) || null;
  M.markRead = function (slot, id) { const L = M.find(slot, id); if (L && !L.read) { L.read = 1; return true; } return false; };
  // забрать подарки письма: { ok, err, gifts, got }
  M.claim = function (slot, id, now) {
    now = now == null ? Date.now() : now;
    const m = M.ensure(slot), L = M.find(slot, id);
    if (!L) return { ok: false, err: 'Письмо не найдено' };
    if (m.claimed[id] || L.claimed) { L.claimed = 1; return { ok: false, err: 'Подарок уже получен' }; }
    if (!M.hasGifts(L.gifts)) return { ok: false, err: 'В письме нет подарков' };
    if (M.isExpired(L, now)) return { ok: false, err: 'Срок письма истёк' };
    m.claimed[id] = now; L.claimed = 1; L.read = 1;
    const got = M.apply(slot, L.gifts, id);
    return { ok: true, gifts: L.gifts, got };
  };
  M.claimAll = function (slot, now) {
    const res = { n: 0, gifts: [], got: { items: [], levels: 0 } };
    M.ensure(slot).list.slice().forEach((L) => { if (!M.canClaim(slot, L, now)) return; const r = M.claim(slot, L.id, now); if (r.ok) { res.n++; res.gifts.push(r.gifts); res.got.items.push(...r.got.items); res.got.levels += r.got.levels; } });
    res.sum = M.normGifts(res.gifts);
    return res;
  };
  M.canRemove = (slot, L, now) => !!L && !!L.read && (!M.hasGifts(L.gifts) || !!L.claimed || !!M.ensure(slot).claimed[L.id] || M.isExpired(L, now));
  M.remove = function (slot, id, now) { const m = M.ensure(slot), i = m.list.findIndex((x) => x.id === id); if (i < 0 || !M.canRemove(slot, m.list[i], now)) return false; m.list.splice(i, 1); return true; };   // seen/claimed остаются — письмо не вернётся
  M.removeDone = function (slot, now) { const m = M.ensure(slot), before = m.list.length; m.list = m.list.filter((x) => !M.canRemove(slot, x, now)); return before - m.list.length; };
  // сколько писем требуют внимания: непрочитанные + с незабранным подарком
  M.count = function (slot, now) { if (!slot) return 0; return M.ensure(slot).list.filter((x) => !x.read || M.canClaim(slot, x, now)).length; };

  // ───── Письма от самой игры (работают офлайн) ─────
  M.localLetters = function (slot) {
    const m = M.ensure(slot), out = [];
    out.push({ id: 'loc-welcome', src: 'local', from: 'Ильвара', title: 'Почта лагеря открыта', date: slot.created ? new Date(slot.created).toISOString() : null,
      body: 'Мой Король.\n\nВороны Свиты теперь приносят письма прямо в лагерь. Когда рядом есть связь с миром (интернет), сюда будут приходить вести и дары от Администрации. Без связи — ничего не потеряется: письма дождутся вас.\n\nПримите скромный дар на дорогу.\n\n— Ильвара',
      gifts: { gold: 100, cons: { pot_hp1: 3 } } });
    const arcs = Math.floor(M.chapters(slot) / 10);
    for (let k = m.arcBase + 1; k <= arcs && k <= 30; k++) {
      out.push({ id: 'loc-arc-' + k, src: 'local', from: 'Ильвара', title: `Арка ${k} пройдена`,
        body: `Мой Король, ещё одна глава нашей истории закрыта — арка ${k} позади.\n\nСвита гордится вами. Казна выделила награду: используйте её с умом.\n\n— Ильвара`,
        gifts: { gold: 150 * k, cons: { pot_hp2: 2, pot_mp2: 1 } } });
    }
    return out;
  };

  // новый герой: почта сразу «с нуля»
  const _new = E.newSlot; E.newSlot = function (o) { const s = _new(o); s.mail = { list: [], seen: {}, claimed: {}, arcBase: 0 }; return s; };
  // миграция старых сохранений: поле mail добавляется при загрузке (формат v5 не меняется — старая версия игры спокойно читает такие сейвы)
  if (RPG.S) { const mig = RPG.S.migrate; RPG.S.migrate = function (p) { p = mig(p); if (p && Array.isArray(p.slots)) p.slots.forEach((s) => { if (s && typeof s === 'object' && s.hero) M.ensure(s); }); return p; }; }
  if (typeof module !== 'undefined') module.exports = RPG;
})();
