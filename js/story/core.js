/* Движок глав «Нимба Мира»: 300 глав = 30 арок × 10. Главы 1–3 живут в data-story*.js (старые сцены), главы 4+ — в js/story/arcNN.js.
   Контракт главы — docs/STORY_SPEC.md. Коротко:
     RPG.D.CHAPTERS[n] = { title, scenes: [{ sub?, bg, lines, afterBattle? }, …], battle?: { dun }, pre?: { dun: сцена }, duels?: { враг: сцена }, reward };
   После загрузки файла арки движок вызывает RPG.story.install(n): строит сцены ch{n}_a … ch{n}_end, записи D.STORY и привязки боёв.
   Прогресс хранится как раньше — в slot.story.done (id сцен): глава пройдена, когда сыграна её последняя сцена. Новых полей в сохранении нет. */
(function () {
  const RPG = globalThis.RPG, D = RPG.D, E = RPG.E;
  const ST = RPG.story = RPG.story || {};
  D.CHAPTERS = D.CHAPTERS || {};
  D.STORY = D.STORY || []; D.SCENES = D.SCENES || {};
  D.PRE_BOSS = D.PRE_BOSS || {}; D.DUEL_SCENE = D.DUEL_SCENE || {}; D.INTROS = D.INTROS || {};

  ST.ARC_SIZE = 10; ST.ARCS = 30; ST.TOTAL = 300; ST.VERSION = 1;
  ST.LEGACY = {                                                                  // старые сцены, превращённые в главы 1–3
    1: { title: 'Первый генерал', scenes: ['ch1_a', 'ch1_b'], aux: [] },
    2: { title: 'Девять предначертанных', scenes: ['ch2_a', 'ch2_b', 'ch2_c'], aux: ['duel_fiora'] },
    3: { title: 'Колокола крестового похода', scenes: ['ch3_a', 'ch3_b', 'ch3_c', 'ch3_d', 'ch3_end'], aux: ['duel_elvira', 'duel_selestina', 'ch3_pre'] }
  };
  const LET = 'abcdefgh';
  ST.arcOf = (n) => Math.ceil(n / ST.ARC_SIZE);
  ST.arcRange = (k) => [(k - 1) * ST.ARC_SIZE + 1, k * ST.ARC_SIZE];
  ST.arcFile = (k) => 'js/story/arc' + String(k).padStart(2, '0') + '.js';
  const LV = { 1: 1, 2: 3, 3: 9, 4: 16, 5: 17, 6: 19, 7: 21, 8: 22, 9: 24, 10: 26 };
  ST.levelOf = (n) => (n <= 10 ? LV[n] : Math.round(26 + (n - 10) * 74 / 290));    // рекомендуемый уровень к началу главы (в 300-й главе ≈ 100)
  ST.finalId = (n) => (ST.LEGACY[n] ? ST.LEGACY[n].scenes[ST.LEGACY[n].scenes.length - 1] : 'ch' + n + '_end');
  ST.sceneId = (n, i, count) => (i === count - 1 ? 'ch' + n + '_end' : 'ch' + n + '_' + LET[i]);
  ST.titleOf = (n) => {
    if (ST.LEGACY[n]) return ST.LEGACY[n].title;
    const c = D.CHAPTERS[n]; if (c && c.title) return c.title;
    const o = D.OUTLINE && D.OUTLINE.chapters[n - 1]; return o ? o.title : '';
  };
  ST.has = (n) => !!(ST.LEGACY[n] || (D.CHAPTERS[n] && D.CHAPTERS[n]._ok));      // текст главы загружен и готов к игре
  ST.sceneIds = function (n) {
    if (ST.LEGACY[n]) return ST.LEGACY[n].scenes.slice();
    const c = D.CHAPTERS[n]; return c && c._ids ? c._ids.slice() : [];
  };
  ST.auxIds = function (n) { if (ST.LEGACY[n]) return ST.LEGACY[n].aux.slice(); const c = D.CHAPTERS[n]; return c && c._aux ? c._aux.slice() : []; };
  ST.chapterOf = function (sceneId) { const m = /^ch(\d+)_/.exec(sceneId); if (m) return +m[1]; const sc = D.SCENES[sceneId]; return sc && sc.ch || 0; };
  ST.done = (slot, n) => slot.story.done.includes(ST.finalId(n));
  ST.current = function (slot) { for (let n = 1; n <= ST.TOTAL; n++) if (!ST.done(slot, n)) return n; return 0; };   // 0 — всё пройдено
  ST.doneCount = function (slot) { let c = 0; for (let n = 1; n <= ST.TOTAL; n++) { if (ST.done(slot, n)) c++; else break; } return c; };
  ST.sync = function (slot) { const c = ST.doneCount(slot); if (slot.story.ch !== c) { slot.story.ch = c; } return c; };   // кэш для карточки слота; сохранение не меняется

  // Следующая сцена главы n, которую можно играть (или null)
  ST.nextScene = function (slot, n) {
    for (const id of ST.sceneIds(n)) if (!slot.story.done.includes(id)) return E.sceneAvail(slot, id) ? D.STORY.find((s) => s.id === id) : null;
    return null;
  };
  ST.pendingScene = function (slot, n) { for (const id of ST.sceneIds(n)) if (!slot.story.done.includes(id)) return D.STORY.find((s) => s.id === id) || null; return null; };

  // ───── Установка главы ─────
  const clone = (x) => JSON.parse(JSON.stringify(x));
  ST.install = function (n) {
    const ch = D.CHAPTERS[n]; if (!ch || ch._ok || ST.LEGACY[n]) return false;
    if (!Array.isArray(ch.scenes) || !ch.scenes.length) throw new Error('Глава ' + n + ': нет сцен');
    const cnt = ch.scenes.length, ids = [], aux = []; ch._ids = ids; ch._aux = aux; ch.n = n;
    let prev = n === 1 ? 'prologue' : ST.finalId(n - 1), gate = null;
    const dun = ch.battle && ch.battle.dun;
    ch.scenes.forEach((sc, i) => {
      const id = ST.sceneId(n, i, cnt), last = i === cnt - 1, lines = sc.lines.slice();
      if (!(lines[0] && lines[0][0] === 'title')) lines.unshift(['title', 'Глава ' + n, sc.sub || ch.title]);
      if (last) { lines.push(['set', { ['ch' + n + '_done']: 1 }]); if (ch.reward) lines.push(['give', clone(ch.reward)]); }
      D.SCENES[id] = { t: 'Глава ' + n, sub: sc.sub || ch.title, bg: sc.bg || 'camp', lines, ch: n, idx: i };
      const need = { done: prev };
      if (sc.afterBattle && dun) { need.clear = dun; if (!gate) gate = prev; }
      const hint = sc.hint || (need.clear && D.DUN[need.clear] ? 'Пройдите «' + D.DUN[need.clear].n + '».' : '');
      D.STORY.push({ id, need, hint, ch: n }); ids.push(id); prev = id;
    });
    if (dun && D.DUN[dun]) { const d = D.DUN[dun]; d.gate = ch.battle.gate || gate || ids[0]; d.ch = n; /* ворота: сцена перед первой afterBattle или battle.gate */ }
    const first = ids[0];
    for (const dn in ch.pre || {}) {                                             // сцена перед боссом подземелья
      const sc = ch.pre[dn], id = 'ch' + n + '_pre'; D.SCENES[id] = { t: 'Глава ' + n, sub: sc.sub || 'Перед боем', bg: sc.bg || 'camp', lines: sc.lines.slice(), ch: n, aux: 1 };
      D.STORY.push({ id, need: { done: (D.DUN[dn] && D.DUN[dn].gate) || first }, hint: '', pre: true, ch: n }); D.PRE_BOSS[dn] = id; aux.push(id);
    }
    let di = 0;
    for (const en in ch.duels || {}) {                                           // дуэль после победы над врагом: пощадить / убить
      const sc = ch.duels[en], id = 'ch' + n + '_duel' + (di++ || ''); D.SCENES[id] = { t: 'Дуэль', sub: sc.sub || 'Дуэль', bg: sc.bg || 'camp', lines: sc.lines.slice(), ch: n, aux: 1 };
      D.DUEL_SCENE[en] = id; aux.push(id);
    }
    for (const dn in ch.intro || {}) D.INTROS[dn] = ch.intro[dn];
    ch._ok = true; return true;
  };
  ST.installArc = function (k) { const [a, b] = ST.arcRange(k); let c = 0; for (let n = a; n <= b; n++) if (D.CHAPTERS[n] && ST.install(n)) c++; return c; };
  ST.installAll = function () { let c = 0; for (let k = 1; k <= ST.ARCS; k++) c += ST.installArc(k); return c; };

  // Старые главы 1–3 — тоже записи D.CHAPTERS (чтобы линтер и статистика видели их одинаково)
  Object.keys(ST.LEGACY).forEach((n) => {
    const L = ST.LEGACY[n];
    if (L.scenes.every((id) => D.SCENES[id])) D.CHAPTERS[n] = { n: +n, title: L.title, legacy: true, _ok: true, _ids: L.scenes.slice(), _aux: L.aux.slice(), scenes: L.scenes.map((id) => D.SCENES[id]).concat(L.aux.map((id) => D.SCENES[id])) };
  });

  // ───── Подземелья и враги ─────
  ST.defineEnemy = function (id, o) { o.id = id; o.sk = o.sk || ['e_hit']; o.loot = o.loot || []; o.tags = o.tags || []; D.ENEMIES[id] = o; return o; };
  ST.defineDungeon = function (o) {
    o.ev = o.ev || ['chest', 'rest', 'shrine']; o.floors = o.floors || 2; o.col = o.col || '#6a5a9a'; o.ic = o.ic || '🗝️';
    const i = D.DUNGEONS.findIndex((d) => d.id === o.id); if (i >= 0) D.DUNGEONS[i] = o; else D.DUNGEONS.push(o); D.DUN[o.id] = o; return o;
  };
  // Подземелье с полем gate ('#pending' — пока глава не установлена) открывается, когда прочитана сцена-ворота (и пройдено d.need, если указано); без gate — прежняя цепочка
  if (E && !E._storyWrapped) {
    const base = E.dungeonUnlocked; E._storyWrapped = true;
    E.dungeonUnlocked = function (slot, did) {
      const d = D.DUN[did]; if (d && d.gate) return slot.story.done.includes(d.gate) && (!d.need || !!slot.prog.cleared[d.need]);
      return base(slot, did);
    };
    E.dungeonVisible = (slot, did) => { const d = D.DUN[did]; return !(d && d.gate) || E.dungeonUnlocked(slot, did) || !!slot.prog.cleared[did]; };
  }

  // ───── Загрузка арок (браузер: <script>, node: require) ─────
  ST.loaded = ST.loaded || {}; const pending = {};
  ST.isLoaded = (k) => !!ST.loaded[k];
  const hasDoc = typeof document !== 'undefined' && document.createElement;
  const inject = (src) => new Promise((res) => {
    const s = document.createElement('script'); s.src = src + '?v=' + ST.VERSION; s.async = true;
    s.onload = () => res(true); s.onerror = () => { s.remove(); res(false); }; document.head.appendChild(s);
  });
  ST.ready = function (k) {   // арка написана? (outline.arcs[k-1].ready — число готовых глав)
    const o = D.OUTLINE && D.OUTLINE.arcs[k - 1]; if (!o) return k === 1; return !!o.ready;
  };
  ST.loadArc = function (k) {
    if (k < 1 || k > ST.ARCS) return Promise.resolve(false);
    if (ST.loaded[k]) return Promise.resolve(true);
    if (pending[k]) return pending[k];
    const p = (async () => {
      let ok = false;
      if (hasDoc) { if (k === 1 || !D.OUTLINE || ST.ready(k)) ok = await inject(ST.arcFile(k)); }
      else { try { require('./arc' + String(k).padStart(2, '0') + '.js'); ok = true; } catch (e) { if (e.code !== 'MODULE_NOT_FOUND') throw e; } }
      if (ok) { ST.installArc(k); ST.loaded[k] = 1; }
      delete pending[k]; return ok;
    })();
    pending[k] = p; return p;
  };
  ST.loadOutline = function () {
    if (D.OUTLINE) return Promise.resolve(D.OUTLINE);
    if (pending.outline) return pending.outline;
    pending.outline = (async () => { if (hasDoc) await inject('js/story/outline.js'); else require('./outline.js'); delete pending.outline; return D.OUTLINE; })();
    return pending.outline;
  };
  // Загрузить арку текущей главы и подгрузить следующую
  ST.ensureFor = async function (slot) {
    const n = ST.current(slot), k = n ? ST.arcOf(n) : ST.ARCS;
    if (k > 1) await ST.loadOutline();
    await ST.loadArc(k);                                                         // главы 4–10 лежат в arc01.js, поэтому он нужен уже с первой главы
    if (k < ST.ARCS) ST.loadOutline().then(() => ST.loadArc(k + 1)).catch(() => {});   // предзагрузка следующей арки
    return n;
  };

  if (typeof module !== 'undefined') module.exports = RPG;
})();
