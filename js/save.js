/* Профили и сохранения: localStorage с версией, резервной копией, экспортом/импортом кодом и миграциями. */
(function () {
  const RPG = globalThis.RPG || (globalThis.RPG = {});
  const S = RPG.S = {};
  S.VERSION = 6;
  S.PREFIX = 'arpg.';
  S.SLOTS = 3;
  S.AVATARS = ['🦉', '🐺', '🦊', '🐉', '🦅', '🌙', '⭐', '🔥', '❄️', '🍀', '⚔️', '🛡️'];
  S.store = (typeof localStorage !== 'undefined') ? localStorage : null;

  const kIdx = () => S.PREFIX + 'index', kP = (id) => S.PREFIX + 'p.' + id, kB = (id) => S.PREFIX + 'p.' + id + '.bak';
  S.defaultSettings = () => ({ sound: true, music: true, vol: 0.6, textSpeed: 2, battleSpeed: 1, auto: false, shake: true, particles: true, tutorial: true });

  S.newProfile = function (nick, avatar, now) {
    const id = 'p' + (now || Date.now()).toString(36) + Math.floor(Math.random() * 1e4).toString(36);
    return { v: S.VERSION, id, nick: String(nick || 'Игрок').trim().slice(0, 14) || 'Игрок', avatar: avatar || S.AVATARS[0], created: now || Date.now(), last: now || Date.now(), settings: S.defaultSettings(), slots: new Array(S.SLOTS).fill(null), active: 0, seenIntro: {} };
  };

  // ───── Миграции: v1 → … → v6 ─────
  S.migrations = {
    1: function (p) { // v1: слот хранил party/tut/bossPts не везде, настройки были плоскими
      p.slots = (p.slots || []).map(s => { if (!s) return s; s.party = s.party || []; s.tut = s.tut || {}; s.hero = s.hero || {}; s.hero.bossPts = s.hero.bossPts || 0; s.stats = Object.assign({ kills: 0, runs: 0, wins: 0, deaths: 0, crafted: 0, gathered: 0, goldEarned: 0 }, s.stats || {}); return s; });
      p.settings = Object.assign(S.defaultSettings(), p.settings || {}); p.v = 2; return p;
    },
    2: function (p) { // v2: добавили buffs, rev, shopSeed, seenIntro; тип 'cleared' → число
      p.seenIntro = p.seenIntro || {};
      p.slots = (p.slots || []).map(s => { if (!s) return s; s.buffs = s.buffs || []; s.rev = s.rev || 0; s.shopSeed = s.shopSeed || 0; s.prog = s.prog || { cleared: {}, best: {}, boss: {} };
        for (const k in s.prog.cleared) if (s.prog.cleared[k] === true) s.prog.cleared[k] = 1; s.hero.uspent = s.hero.uspent || {}; s.hero.spent = s.hero.spent || {}; s.eq = s.eq || {}; s.inv = s.inv || []; s.mats = s.mats || {}; s.cons = s.cons || {}; s.profs = s.profs || {}; s.played = s.played || 0; return s; });
      p.v = 3; return p;
    },
    3: function (p) { // v3 → v4: «Нимб Мира». Классы → Король Демонов, очки навыков пересчитываются, сюжет перезапускается с главы 1, добавлены Свита и Романтика
      const ORIG = { human: 'o_guard', elf: 'o_scholar', dwarf: 'o_guard', beast: 'o_street', demon: 'o_void' };
      p.slots = (p.slots || []).map(s => {
        if (!s) return s; const h = s.hero = s.hero || {};
        h.oldCls = h.cls; h.cls = 'maou'; h.sex = 'm'; h.portrait = 'hero'; h.race = ORIG[h.race] || (String(h.race).startsWith('o_') ? h.race : 'o_orphan');
        h.spent = {}; h.uspent = h.uspent || {}; h.level = h.level || 1; h.xp = h.xp || 0;
        const hadPro = s.story && s.story.done && s.story.done.includes('prologue');
        s.story = { flags: hadPro ? { prologue_done: 1 } : {}, done: hadPro ? ['prologue'] : [], cur: 'prologue', log: [] };
        s.run = null; s.party = []; s.crew = {}; s.rom = {}; s.missions = []; s.crewTalk = 2; s.gifts = {}; s.cmd = false; s.migrated = 4; s.rev = (s.rev || 0) + 1;
        return s;
      });
      p.v = 4; return p;
    },
    4: function (p) { // v4 → v5: 8 характеристик, ручные очки (hero.alloc), кап уровня 100, субстаты считаются из статов — прогресс не теряется
      p.slots = (p.slots || []).map((s) => { if (!s) return s; const h = s.hero = s.hero || {}; h.alloc = h.alloc || {}; h.statVer = 5; h.level = h.level || 1; s.rev = (s.rev || 0) + 1; return s; });
      p.v = 5; return p;
    },
    5: function (p) { // v5 → v6: 11 редкостей снаряжения. Старые 0…4 → по названию (Эпический 3→4, Легендарный 4→5), статы сохраняются, недостающие линии добавляются
      const E = RPG.E, OLD = { 0: 0, 1: 1, 2: 2, 3: 4, 4: 5 };
      const fix = (it) => { if (!it || typeof it !== 'object' || it.gv >= 2) return; if (E && E.migrateItem) E.migrateItem(it); else { it.r = OLD[it.r | 0] != null ? OLD[it.r | 0] : it.r; it.gv = 2; } };
      p.slots = (p.slots || []).map((s) => { if (!s) return s; (E && E.slotItems ? E.slotItems(s) : (s.inv || []).concat(Object.values(s.eq || {}))).forEach(fix); s.rev = (s.rev || 0) + 1; return s; });
      p.v = 6; return p;
    }
  };
  S.migrate = function (p) {
    if (!p || typeof p !== 'object') return null;
    let v = p.v || 1; if (v > S.VERSION) return null; // из будущего — не трогаем
    let guard = 10; while (v < S.VERSION && guard--) { p = S.migrations[v](p); v = p.v; }
    return p;
  };
  S.validate = function (p) {
    return !!(p && typeof p === 'object' && typeof p.id === 'string' && Array.isArray(p.slots) && p.slots.length === S.SLOTS && p.settings && typeof p.nick === 'string');
  };

  // ───── Хранилище ─────
  S.listIds = function () { try { const ix = JSON.parse(S.store.getItem(kIdx()) || '[]'); return Array.isArray(ix) ? ix : []; } catch (e) { return []; } };
  S.saveIndex = (ids) => S.store.setItem(kIdx(), JSON.stringify(ids));
  S.save = function (p) {
    p.v = S.VERSION; const key = kP(p.id), prev = S.store.getItem(key), json = JSON.stringify(p);
    try { if (prev) { try { const pp = JSON.parse(prev); if (S.validate(pp)) S.store.setItem(kB(p.id), prev); } catch (e) { /* битая — не затираем резерв */ } } S.store.setItem(key, json); }
    catch (e) { return { ok: false, err: e && e.name === 'QuotaExceededError' ? 'Нет места в хранилище' : String(e) }; }
    const ids = S.listIds(); if (!ids.includes(p.id)) { ids.push(p.id); S.saveIndex(ids); }
    return { ok: true };
  };
  S.load = function (id) {
    const tryParse = (raw) => { if (!raw) return null; try { const p = S.migrate(JSON.parse(raw)); return S.validate(p) ? p : null; } catch (e) { return null; } };
    let p = tryParse(S.store.getItem(kP(id))); if (p) return { p, recovered: false };
    p = tryParse(S.store.getItem(kB(id))); if (p) { return { p, recovered: true }; }
    return { p: null, recovered: false };
  };
  S.hasBackup = function (id) { try { return !!S.migrate(JSON.parse(S.store.getItem(kB(id)))) && S.validate(S.migrate(JSON.parse(S.store.getItem(kB(id))))); } catch (e) { return false; } };
  S.restoreBackup = function (id) { try { const p = S.migrate(JSON.parse(S.store.getItem(kB(id)))); if (!S.validate(p)) return null; S.store.setItem(kP(id), JSON.stringify(p)); return p; } catch (e) { return null; } };
  S.remove = function (id) { S.store.removeItem(kP(id)); S.store.removeItem(kB(id)); S.saveIndex(S.listIds().filter(x => x !== id)); };
  S.summaries = function () {
    return S.listIds().map(id => { const r = S.load(id); if (!r.p) return { id, broken: true }; const p = r.p; return { id, nick: p.nick, avatar: p.avatar, last: p.last, recovered: r.recovered, slots: p.slots.map(s => s ? { name: s.hero.name, cls: s.hero.cls, race: s.hero.race, level: s.hero.level, portrait: s.hero.portrait } : null) }; });
  };

  // ───── Экспорт/импорт кодом ─────
  const fnv = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
  const b64 = {
    enc: (str) => { const bytes = new TextEncoder().encode(str); let bin = ''; bytes.forEach(b => bin += String.fromCharCode(b)); return (typeof btoa !== 'undefined' ? btoa(bin) : Buffer.from(bin, 'binary').toString('base64')); },
    dec: (s) => { const bin = (typeof atob !== 'undefined' ? atob(s) : Buffer.from(s, 'base64').toString('binary')); const bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i); return new TextDecoder().decode(bytes); }
  };
  S.exportCode = function (p, slotIdx) {
    const obj = slotIdx == null ? p : Object.assign({}, p, { slots: p.slots.map((s, i) => i === slotIdx ? s : null) });
    const body = b64.enc(JSON.stringify(obj)); return 'ARPG' + S.VERSION + '.' + fnv(body) + '.' + body;
  };
  S.importCode = function (code, opts) {
    code = String(code || '').replace(/\s+/g, '');
    const m = /^ARPG(\d+)\.([0-9a-z]+)\.([A-Za-z0-9+/=]+)$/.exec(code); if (!m) return { err: 'Код повреждён или не от этой игры' };
    if (fnv(m[3]) !== m[2]) return { err: 'Контрольная сумма не сходится — код изменён или обрезан' };
    let obj; try { obj = JSON.parse(b64.dec(m[3])); } catch (e) { return { err: 'Не удалось прочитать данные' }; }
    if (obj && obj.v > S.VERSION) return { err: 'Сохранение сделано в более новой версии игры' };
    const p = S.migrate(obj); if (!S.validate(p)) return { err: 'Формат сохранения не распознан' };
    if (S.listIds().includes(p.id) && !(opts && opts.overwrite)) { p.id = p.id + 'i' + Date.now().toString(36).slice(-4); p.nick = (p.nick + ' (импорт)').slice(0, 20); }
    return { p };
  };
  if (typeof module !== 'undefined') module.exports = RPG;
})();
