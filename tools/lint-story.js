#!/usr/bin/env node
/* Линтер сюжета «Нимба Мира». Запуск: node tools/lint-story.js [--chapter N] [--arc K] [--strict] [--quiet]
   Проверяет формат реплик и служебных строк, допустимые id (говорящие, настроения, фоны, fx, CG, свита, предметы),
   контракт RPG.D.CHAPTERS[n], длину глав, русский язык, запрещённый контент и outline.js на 300 глав.
   Код выхода 1, если есть ошибки (с --strict — и предупреждения). Спецификация: docs/STORY_SPEC.md. */
const { load } = require('./lib-story');
const args = process.argv.slice(2), opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const ONLY_CH = opt('--chapter') ? +opt('--chapter') : 0, ONLY_ARC = opt('--arc') ? +opt('--arc') : 0, STRICT = args.includes('--strict'), QUIET = args.includes('--quiet');
const RPG = load(), { D, story: ST } = RPG;
if (args.includes('--list')) {   // справочник допустимых id для авторов глав
  const L = (t, a) => console.log('\n' + t + ':\n  ' + a.join(', '));
  L('Говорящие (ключ → имя)', Object.keys(D.SPEAKERS).map((k) => k + '=' + D.SPEAKERS[k].n)); L('Настроения', ST.MOODS); L('Фоны', ST.BG_IDS()); L('Эффекты fx', ST.FX); L('CG', ST.CGS);
  L('Свита (rec/loy/aff)', Object.keys(D.CREW).map((k) => k + '=' + D.CREW[k].n)); L('Расходники (give.cons)', Object.keys(D.CONS)); L('Материалы (give.mats)', Object.keys(D.MATS));
  L('Подземелья', Object.keys(D.DUN).map((k) => k + ' (ур.' + D.DUN[k].lv + ')')); L('Враги с дуэлью', Object.keys(D.ENEMIES).filter((k) => D.ENEMIES[k].duel)); process.exit(0);
}
const errs = [], warns = [];
const E = (w, m) => errs.push(w + ': ' + m), W = (w, m) => warns.push(w + ': ' + m);

// ───── пороги (docs/STORY_SPEC.md) ─────
const LIM = { minLines: 70, warnLines: 85, maxLines: 180, minChars: 6000, warnChars: 7500, maxChars: 15000, maxLine: 700, warnLine: 450, maxNarr: 0.4, minMood: 0.3, scenesMin: 2, scenesMax: 6, choicesMin: 1, choicesMax: 4, sceneMaxLines: 60 };
// запрещённый контент: откровенный сексуальный текст, насилие над беззащитными и пр.
const BANNED = [/секс/i, /порно/i, /оргазм/i, /совокуп/i, /эрекц/i, /мастурб/i, /изнасил/i, /интим(ная|ные|ной) (сцен|близост)/i, /обнажённ(ая|ые|ую) грудь/i, /сосок|соски/i, /гениталь/i, /половой акт/i, /fuck|shit/i, /\bхуй|\bпизд|\bебат|\bблят|\bсука\b/i, /педофил/i, /несовершеннолетн\S* (тело|грудь)/i];
const MOODS = ST.MOODS, FX = ST.FX, CGS = ST.CGS, BGS = new Set(ST.BG_IDS());
const SP = D.SPEAKERS, CREW = D.CREW || {};
const speakers = new Set(Object.keys(SP));

// ───── флаги: где задаются / где читаются ─────
const setFlags = new Set(), usedFlags = [];
const collectSet = (lines) => lines.forEach((l) => {
  if (l[0] === 'set' && l[1] && typeof l[1] === 'object') Object.keys(l[1]).forEach((k) => setFlags.add(k));
  else if (l[0] === 'choice') (l[1] || []).forEach((o) => { Object.keys(o.f || {}).forEach((k) => setFlags.add(k)); collectSet(o.r || []); });
  else if (l[0] === 'if' && Array.isArray(l[2])) collectSet(l[2]);
});
Object.keys(D.SCENES).forEach((id) => collectSet(D.SCENES[id].lines));
Object.keys(D.CHAPTERS).forEach((n) => { const c = D.CHAPTERS[n]; if (c && c.reward) { /* награды не флаги */ } });
// флаги, которые движок ставит сам
['ch1_done', 'ch2_done', 'ch3_done'].forEach((f) => setFlags.add(f));
for (let n = 1; n <= ST.TOTAL; n++) setFlags.add('ch' + n + '_done');
const knownEngineFlags = new Set(Object.keys(D.ENDING_FLAGS || {}));

// ───── проверка одной строки ─────
function lintLines(where, lines, ctx, depth) {
  if (!Array.isArray(lines)) return E(where, 'lines не массив');
  lines.forEach((l, i) => {
    const w = where + ' #' + (i + 1);
    if (!Array.isArray(l) || typeof l[0] !== 'string') return E(w, 'реплика должна быть массивом [ключ, …]');
    const k = l[0];
    if (!ST.DIRECTIVES.includes(k)) {                                          // реплика говорящего
      if (!speakers.has(k)) return E(w, 'неизвестный говорящий «' + k + '» (RPG.story.speaker в js/story/cast.js)');
      if (typeof l[1] !== 'string' || !l[1].trim()) return E(w, 'пустой текст реплики');
      if (l[2] !== undefined && !MOODS.includes(l[2])) E(w, 'неизвестное настроение «' + l[2] + '» (допустимы: ' + MOODS.join(', ') + ')');
      if (/^m[a-z]$/.test(l[2] || '') && k !== 'h') E(w, 'настроение формы Короля «' + l[2] + '» допустимо только у героя (h)');
      if (l.length > 3) E(w, 'лишние элементы в реплике');
      ctx.lines++; ctx.chars += l[1].length; if (k === 'n') ctx.narr++; if (l[2]) ctx.mood++;
      if (l[1].length > LIM.maxLine) E(w, 'реплика длиннее ' + LIM.maxLine + ' знаков (' + l[1].length + ')'); else if (l[1].length > LIM.warnLine) W(w, 'длинная реплика (' + l[1].length + ' зн.) — разбейте');
      checkText(w, l[1], ctx.legacy);
      return;
    }
    switch (k) {
      case 'bg': if (!BGS.has(l[1])) E(w, 'неизвестный фон «' + l[1] + '» (js/story/cast.js: RPG.story.bg)'); break;
      case 'cg': if (l[1] !== null && !CGS.includes(l[1])) E(w, 'неизвестный CG «' + l[1] + '»'); break;
      case 'fx': if (l[1] !== null && !FX.includes(l[1])) E(w, 'неизвестный эффект «' + l[1] + '» (' + FX.join(', ') + ')'); break;
      case 'title': if (typeof l[1] !== 'string' || typeof l[2] !== 'string') E(w, 'title: ["title", "заголовок", "подзаголовок"]'); else { checkText(w, l[1] + ' ' + l[2], ctx.legacy); ctx.titles++; } break;
      case 'hide': if (typeof l[1] !== 'string') E(w, 'hide: ключ говорящего'); break;
      case 'date': break;
      case 'set': if (!l[1] || typeof l[1] !== 'object') E(w, 'set: объект флагов'); else Object.keys(l[1]).forEach((f) => { if (!/^[a-z][a-z0-9_]*$/.test(f)) E(w, 'флаг «' + f + '»: только a-z, 0-9, _'); const v = l[1][f]; if (!['number', 'string', 'boolean'].includes(typeof v)) E(w, 'значение флага «' + f + '»'); ctx.sets++; }); break;
      case 'give': if (ctx.chapterNew && ctx.lastScene) E(w, 'награду главы задавайте полем reward, а не give в сцене'); lintGive(w, l[1]); break;
      case 'rec': if (!CREW[l[1]]) E(w, 'rec: нет «' + l[1] + '» в D.CREW'); break;
      case 'loy': case 'aff': if (!l[1] || typeof l[1] !== 'object') E(w, k + ': объект {id: ±n}'); else { Object.keys(l[1]).forEach((c) => { if (!CREW[c]) E(w, k + ': нет «' + c + '» в D.CREW'); if (typeof l[1][c] !== 'number' || Math.abs(l[1][c]) > 10) E(w, k + ' ' + c + ': число от −10 до 10'); }); ctx[k]++; } break;
      case 'if': if (typeof l[1] !== 'string' || !Array.isArray(l[2])) { E(w, 'if: ["if", "флаг", [строки]]'); break; } usedFlags.push([w, l[1].replace(/^!/, '')]); lintLines(w + ' if', l[2], ctx, depth + 1); break;
      case 'choice': {
        if (depth > 0) W(w, 'вложенный выбор в if/choice'); if (!Array.isArray(l[1]) || l[1].length < 2 || l[1].length > 4) { E(w, 'choice: от 2 до 4 вариантов'); break; }
        ctx.choices++;
        l[1].forEach((o, j) => {
          const ww = w + ' вар.' + (j + 1);
          if (!o || typeof o.t !== 'string' || !o.t.trim()) return E(ww, 'нет текста варианта t');
          if (o.t.length > 110) W(ww, 'длинный текст варианта (' + o.t.length + ')');
          if (!o.f || typeof o.f !== 'object' || !Object.keys(o.f).length) E(ww, 'вариант без флага f — выбор не запомнится');
          if (!Array.isArray(o.r)) E(ww, 'нет ответа r (массив реплик)'); else { if (!o.r.length) W(ww, 'пустой ответ r'); lintLines(ww, o.r, ctx, depth + 1); }
          checkText(ww, o.t, ctx.legacy);
        });
        break;
      }
      default: E(w, 'неизвестная команда «' + k + '»');
    }
  });
}
function lintGive(w, g) {
  if (!g || typeof g !== 'object') return E(w, 'give: объект');
  Object.keys(g).forEach((k) => {
    if (!['gold', 'sp', 'cons', 'mats', 'item'].includes(k)) E(w, 'give: неизвестное поле «' + k + '»');
    else if (k === 'gold' || k === 'sp') { if (typeof g[k] !== 'number' || g[k] < 0) E(w, 'give.' + k + ': число ≥ 0'); }
    else if (k === 'cons') Object.keys(g.cons).forEach((c) => { if (!D.CONS[c]) E(w, 'give.cons: нет расходника «' + c + '»'); });
    else if (k === 'mats') Object.keys(g.mats).forEach((c) => { if (!D.MATS[c]) E(w, 'give.mats: нет материала «' + c + '»'); });
    else if (k === 'item' && g.item !== 'tear') E(w, 'give.item: допустим только «tear»');
  });
  if (g.gold > 3000) W(w, 'награда золотом слишком велика: ' + g.gold); if (g.sp > 3) W(w, 'sp > 3 за главу');
}
function checkText(w, text, legacy) {
  const t = String(text).replace(/\{name\}|\{echo\}/g, 'Имя');
  BANNED.forEach((re) => { if (re.test(t)) E(w, 'запрещённая лексика/контент (' + re + ')'); });
  if (legacy) return;
  const lat = t.match(/[A-Za-z]{2,}/g); if (lat) W(w, 'латиница в тексте: ' + lat.slice(0, 3).join(', '));
  const cyr = (t.match(/[А-Яа-яЁё]/g) || []).length, letters = (t.match(/[A-Za-zА-Яа-яЁё]/g) || []).length;
  if (letters > 12 && cyr / letters < 0.9) E(w, 'текст не по-русски (доля кириллицы ' + Math.round(cyr / letters * 100) + '%)');
  if (/ {2,}/.test(t)) W(w, 'двойной пробел'); if (/\.\.\.(?!\.)/.test(t)) W(w, 'три точки: используйте «…»');
  if (/\bе\b.*\bё\b/.test('')) { /* заглушка */ }
}
function sentences(s) { return (String(s).match(/[^.!?…]+[.!?…]+/g) || []).length; }

// ───── главы ─────
let checked = 0;
const written = {};
for (let n = 1; n <= ST.TOTAL; n++) {
  if (ONLY_CH && n !== ONLY_CH) continue; if (ONLY_ARC && ST.arcOf(n) !== ONLY_ARC) continue;
  const c = D.CHAPTERS[n]; if (!c || !c._ok) continue;
  checked++; written[n] = 1; const where = 'гл.' + n, legacy = !!c.legacy;
  const o = D.OUTLINE && D.OUTLINE.chapters[n - 1];
  if (!legacy) {
    if (typeof c.title !== 'string' || !c.title.trim()) E(where, 'нет title');
    if (!Array.isArray(c.scenes) || c.scenes.length < LIM.scenesMin || c.scenes.length > LIM.scenesMax) E(where, 'сцен должно быть ' + LIM.scenesMin + '–' + LIM.scenesMax);
    if (!c.reward || typeof c.reward !== 'object') E(where, 'нет reward {gold, sp?, mats?, cons?}'); else lintGive(where + ' reward', c.reward);
    if (c.battle) {
      if (!c.battle.dun || !D.DUN[c.battle.dun]) E(where, 'battle.dun «' + (c.battle.dun) + '» не найден в D.DUN');
      else {
        const d = D.DUN[c.battle.dun], lv = ST.levelOf(n); if (Math.abs(d.lv - lv) > 6) W(where, 'уровень подземелья ' + d.lv + ' далеко от рекомендуемого ' + lv);
        if (!c.scenes.some((s) => s.afterBattle)) W(where, 'есть бой, но нет сцены afterBattle (сцена после победы)');
        if (c.scenes[c.scenes.length - 1] && !c.scenes[c.scenes.length - 1].afterBattle) W(where, 'последняя сцена не afterBattle: глава закончится до боя');
        if (c.pre) Object.keys(c.pre).forEach((dn) => { if (dn !== c.battle.dun) W(where, 'pre для другого подземелья «' + dn + '»'); });
      }
    } else if (c.scenes.some((s) => s.afterBattle)) E(where, 'afterBattle без battle');
    if (c.pre) Object.keys(c.pre).forEach((dn) => { if (!D.DUN[dn]) E(where, 'pre: нет подземелья «' + dn + '»'); else lintLines(where + ' pre', c.pre[dn].lines, mk(false, n)); });
    if (c.duels) Object.keys(c.duels).forEach((en) => { const e = D.ENEMIES[en]; if (!e) E(where, 'duels: нет врага «' + en + '»'); else if (!e.duel) E(where, 'duels: у врага «' + en + '» нет поля duel'); else lintLines(where + ' duel ' + en, c.duels[en].lines, mk(false, n), 0); });
    if (o && o.title !== c.title) E(where, 'title «' + c.title + '» ≠ outline «' + o.title + '»');
  }
  // суммарные метрики по сценам главы
  const ctx = mk(legacy, n); const ids = ST.sceneIds(n);
  ids.forEach((id, i) => {
    const sc = D.SCENES[id]; if (!sc) return E(where, 'нет сцены ' + id);
    if (!BGS.has(sc.bg)) E(where + ' ' + id, 'неизвестный фон сцены «' + sc.bg + '»');
    const sctx = mk(legacy, n); sctx.lastScene = i === ids.length - 1; sctx.chapterNew = !legacy;
    lintLines(where + ' ' + id, sc.lines.filter((l) => !(l[0] === 'give' && sctx.lastScene && sc.ch)), sctx, 0);   // автоматическая награда добавляется движком
    Object.keys(sctx).forEach((k) => { if (typeof sctx[k] === 'number') ctx[k] += sctx[k]; });
    if (!legacy && sctx.lines > LIM.sceneMaxLines) W(where + ' ' + id, 'сцена из ' + sctx.lines + ' реплик — разбейте (лимит ' + LIM.sceneMaxLines + ')');
    if (!legacy && sctx.lines < 6) W(where + ' ' + id, 'слишком короткая сцена (' + sctx.lines + ' реплик)');
    if (!legacy && !sc.lines.some((l) => l[0] === 'title')) E(where + ' ' + id, 'нет заставки title');
  });
  ST.auxIds(n).forEach((id) => { const sc = D.SCENES[id]; if (!sc) return; const a = mk(legacy, n); lintLines(where + ' ' + id, sc.lines, a, 0); ctx.lines += a.lines; ctx.chars += a.chars; ctx.choices += a.choices; ctx.aff += a.aff; ctx.loy += a.loy; ctx.narr += a.narr; ctx.mood += a.mood; });
  if (!legacy) {
    if (ctx.lines < LIM.minLines) E(where, 'мало реплик: ' + ctx.lines + ' (минимум ' + LIM.minLines + ')'); else if (ctx.lines < LIM.warnLines) W(where, 'реплик ' + ctx.lines + ' (эталон ≈ 96, рекомендуется ≥ ' + LIM.warnLines + ')');
    if (ctx.lines > LIM.maxLines) E(where, 'слишком много реплик: ' + ctx.lines);
    if (ctx.chars < LIM.minChars) E(where, 'мало знаков: ' + ctx.chars + ' (минимум ' + LIM.minChars + ')'); else if (ctx.chars < LIM.warnChars) W(where, 'знаков ' + ctx.chars + ' (эталон ≈ 8900, рекомендуется ≥ ' + LIM.warnChars + ')');
    if (ctx.chars > LIM.maxChars) E(where, 'слишком длинная глава: ' + ctx.chars + ' зн.');
    if (ctx.choices < LIM.choicesMin || ctx.choices > LIM.choicesMax) E(where, 'выборов ' + ctx.choices + ' (нужно ' + LIM.choicesMin + '–' + LIM.choicesMax + ')');
    if (ctx.lines && ctx.narr / ctx.lines > LIM.maxNarr) W(where, 'слишком много рассказчика: ' + Math.round(ctx.narr / ctx.lines * 100) + '%');
    if (ctx.lines && ctx.mood / ctx.lines < LIM.minMood) W(where, 'мало настроений в репликах: ' + Math.round(ctx.mood / ctx.lines * 100) + '%');
    if (!ctx.aff && !ctx.loy) W(where, 'нет ни aff, ни loy: добавьте романтическую/дружескую вставку');
    if (!ctx.sets) W(where, 'глава не ставит флагов (set)');
  }
}
// ссылки на флаги
usedFlags.forEach(([w, f]) => { if (!setFlags.has(f) && !knownEngineFlags.has(f)) E(w, 'if по флагу «' + f + '», который нигде не задаётся'); });

// ───── подземелья и враги, добавленные историей ─────
if (!ONLY_CH && !ONLY_ARC) {
  Object.keys(D.DUN).forEach((id) => {
    const d = D.DUN[id]; if (!d.gate) return;
    if (!D.STORY.some((s) => s.id === d.gate)) E('подземелье ' + id, 'gate «' + d.gate + '» — нет такой сцены');
    if (d.need && !D.DUN[d.need]) E('подземелье ' + id, 'need «' + d.need + '» не найдено');
    if (!d.lockHint) W('подземелье ' + id, 'нет lockHint (подсказка, почему закрыто)');
    [d.mini, d.boss].concat(d.pool).forEach((e) => { if (!D.ENEMIES[e]) E('подземелье ' + id, 'нет врага «' + e + '»'); else D.ENEMIES[e].sk.forEach((s) => { if (!D.ESK[s]) E('враг ' + e, 'нет навыка «' + s + '»'); }); });
  });
  D.STORY.forEach((s) => { const sc = D.SCENES[s.id]; if (!sc) E('D.STORY', 'нет сцены ' + s.id); if (s.need && s.need.done && !D.STORY.some((x) => x.id === s.need.done) && s.need.done !== 'prologue') E('D.STORY ' + s.id, 'need.done «' + s.need.done + '» не существует'); if (s.need && s.need.clear && !D.DUN[s.need.clear]) E('D.STORY ' + s.id, 'need.clear «' + s.need.clear + '» не существует'); });
}

// ───── outline.js ─────
function lintOutline() {
  const O = D.OUTLINE, w = 'outline';
  if (!O) return E(w, 'нет RPG.D.OUTLINE (js/story/outline.js)');
  if (!Array.isArray(O.arcs) || O.arcs.length !== 30) E(w, 'арок должно быть 30 (есть ' + (O.arcs && O.arcs.length) + ')');
  if (!Array.isArray(O.chapters) || O.chapters.length !== 300) return E(w, 'глав должно быть 300 (есть ' + (O.chapters && O.chapters.length) + ')');
  let prevLv = 0;
  O.chapters.forEach((c, i) => {
    const n = i + 1, ww = 'outline гл.' + n;
    if (c.n !== n) E(ww, 'номер n=' + c.n + ' не совпадает с позицией'); if (c.arc !== Math.ceil(n / 10)) E(ww, 'arc=' + c.arc + ' (должно быть ' + Math.ceil(n / 10) + ')');
    if (typeof c.title !== 'string' || !c.title.trim()) E(ww, 'нет title'); if (typeof c.summary !== 'string' || !c.summary.trim()) E(ww, 'нет summary');
    else { if (sentences(c.summary) < 2) W(ww, 'summary короче двух предложений'); if (c.summary.length < 90) W(ww, 'summary слишком короткий (' + c.summary.length + ')'); if (c.summary.length > 600) W(ww, 'summary слишком длинный'); checkText(ww, c.summary + ' ' + c.title, false); }
    if (!BGS.has(c.bg)) E(ww, 'неизвестный bg «' + c.bg + '»'); if (c.fx !== null && c.fx !== undefined && !FX.includes(c.fx)) E(ww, 'неизвестный fx «' + c.fx + '»');
    if (!Array.isArray(c.cast) || !c.cast.length) E(ww, 'пустой cast'); else c.cast.forEach((p) => { if (!speakers.has(p)) E(ww, 'cast: нет говорящего «' + p + '»'); });
    if (typeof c.level !== 'number' || c.level < 1 || c.level > 100) E(ww, 'level 1–100'); else { if (c.level < prevLv) E(ww, 'level уменьшается (' + prevLv + '→' + c.level + ')'); prevLv = c.level; }
    if (c.boss !== undefined && typeof c.boss !== 'string') E(ww, 'boss — строка');
  });
  O.arcs.forEach((a, i) => {
    const k = i + 1, ww = 'outline арка ' + k;
    if (a.n !== k || a.id !== 'arc' + String(k).padStart(2, '0')) E(ww, 'n/id не совпадают');
    ['title', 'part', 'region', 'boss', 'antagonist', 'joins', 'sister', 'romance', 'duels', 'power', 'subs', 'key'].forEach((f) => { if (typeof a[f] !== 'string' || !a[f].trim()) E(ww, 'нет поля ' + f); });
    if (!Array.isArray(a.locs) || a.locs.length < 3) E(ww, 'locs: ≥3 локаций'); if (!Array.isArray(a.bgs) || a.bgs.length < 3 || a.bgs.length > 4) E(ww, 'bgs: 3–4 фоновых сцены'); else a.bgs.forEach((b) => { if (!BGS.has(b)) E(ww, 'bgs: неизвестный фон «' + b + '»'); });
    if (!Array.isArray(a.twists) || a.twists.length < 2) E(ww, 'twists: ≥2 ключевых поворота');
    if (!Array.isArray(a.levels) || a.levels.length !== 2) E(ww, 'levels: [от, до]');
    const real = []; for (let n = (k - 1) * 10 + 1; n <= k * 10; n++) if (D.CHAPTERS[n] && D.CHAPTERS[n]._ok) real.push(n);
    if (a.ready !== real.length) E(ww, 'ready=' + a.ready + ', а написано глав: ' + real.length + ' (' + real.join(',') + ') — обновите ready в outline.js');
  });
}
if (!ONLY_CH && !ONLY_ARC) lintOutline();

// ───── итог ─────
function mk(legacy, n) { return { legacy, n, lines: 0, chars: 0, narr: 0, mood: 0, choices: 0, sets: 0, aff: 0, loy: 0, titles: 0 }; }
if (!QUIET) { warns.forEach((m) => console.log('  ⚠ ' + m)); }
errs.forEach((m) => console.log('  ✗ ' + m));
console.log(`\nlint-story: глав проверено ${checked}; ошибок ${errs.length}; предупреждений ${warns.length}` + (QUIET && warns.length ? ' (скрыты, уберите --quiet)' : ''));
process.exit(errs.length || (STRICT && warns.length) ? 1 : 0);
