#!/usr/bin/env node
/* Сквозной аудит сюжета на 300 глав: дубли id, ссылки (враги, навыки, подземелья, ворота), покрытие уровней,
   автопрохождение «первый вариант» (и по каждой из 4 концовок) до game_complete. Код выхода 1 при ошибках. */
const { load } = require('./lib-story');
const dup = { enemy: {}, dun: {} };
const RPG = load((R) => {
  const ST = R.story, de = ST.defineEnemy, dd = ST.defineDungeon;
  ST.defineEnemy = function (id, o) { if (R.D.ENEMIES[id]) (dup.enemy[id] = dup.enemy[id] || []).push('defineEnemy'); return de(id, o); };
  ST.defineDungeon = function (o) { if (R.D.DUN[o.id]) (dup.dun[o.id] = dup.dun[o.id] || []).push('defineDungeon'); return dd(o); };
});
const { D, E, C, story: ST } = RPG;
const errs = [], notes = [];
const err = (m) => errs.push(m);

// дубли
Object.keys(dup.enemy).forEach((id) => err('дубль врага ' + id));
Object.keys(dup.dun).forEach((id) => err('дубль подземелья ' + id));
const ids = D.DUNGEONS.map((d) => d.id); ids.forEach((id, i) => { if (ids.indexOf(id) !== i) err('дубль в D.DUNGEONS: ' + id); });

// подземелья и враги
const refDun = {}; for (let n = 1; n <= 300; n++) { const c = D.CHAPTERS[n]; if (c && c.battle) refDun[c.battle.dun] = n; }
D.DUNGEONS.forEach((d) => {
  if (d.gate === '#pending') err('подземелье ' + d.id + ': gate #pending не заменён' + (refDun[d.id] ? '' : ' (нет главы с battle.dun)'));
  if (d.gate && d.gate !== '#pending' && !D.STORY.some((s) => s.id === d.gate)) err('подземелье ' + d.id + ': gate ' + d.gate + ' — нет сцены');
  [d.mini, d.boss].concat(d.pool || []).forEach((e) => { const en = D.ENEMIES[e]; if (!en) return err('подземелье ' + d.id + ': нет врага ' + e); (en.sk || []).forEach((s) => { if (!D.ESK[s]) err('враг ' + e + ': нет навыка ' + s); }); });
  if (!d.pool || !d.pool.length) err('подземелье ' + d.id + ': пустой pool');
});
Object.keys(D.ENEMIES).forEach((e) => (D.ENEMIES[e].sk || []).forEach((s) => { if (!D.ESK[s]) err('враг ' + e + ': нет навыка ' + s); }));
// все подземелья глав открываются после ворот
for (let n = 4; n <= 300; n++) { const c = D.CHAPTERS[n]; if (!c || !c.battle) continue; const d = D.DUN[c.battle.dun]; if (!d) { err('гл.' + n + ': нет подземелья ' + c.battle.dun); continue; } if (!d.gate || d.gate === '#pending') err('гл.' + n + ': подземелье ' + d.id + ' без рабочих ворот'); }
// покрытие уровней
const lvs = D.DUNGEONS.map((d) => d.lv).sort((a, b) => a - b); let maxGap = 0, gapAt = 0; for (let i = 1; i < lvs.length; i++) if (lvs[i] - lvs[i - 1] > maxGap) { maxGap = lvs[i] - lvs[i - 1]; gapAt = lvs[i - 1]; }
notes.push('подземелий ' + D.DUNGEONS.length + ', врагов ' + Object.keys(D.ENEMIES).length + ', уровни подземелий ' + lvs[0] + '…' + lvs[lvs.length - 1] + ', макс. разрыв ' + maxGap + ' (после ур. ' + gapAt + ')');
if (maxGap > 4) err('разрыв в кривой уровней подземелий: ' + maxGap + ' после ур. ' + gapAt);
for (let n = 4; n <= 300; n++) { const c = D.CHAPTERS[n]; if (c && c.battle && D.DUN[c.battle.dun]) { const dl = D.DUN[c.battle.dun].lv, rl = ST.levelOf(n); if (Math.abs(dl - rl) > 10) err('гл.' + n + ': ур. подземелья ' + dl + ' vs рекомендуемый ' + rl); } }

// need.done в D.STORY
const sceneIds = new Set(D.STORY.map((s) => s.id));
D.STORY.forEach((s) => { if (!D.SCENES[s.id]) err('D.STORY: нет сцены ' + s.id); if (s.need && s.need.done && s.need.done !== 'prologue' && !sceneIds.has(s.need.done)) err('D.STORY ' + s.id + ': need.done ' + s.need.done + ' не существует'); });
for (let n = 4; n <= 300; n++) { const last = D.SCENES['ch' + n + '_end']; if (!last) { err('нет сцены ch' + n + '_end'); continue; } if (!last.lines.some((l) => l[0] === 'set' && l[1]['ch' + n + '_done'])) err('ch' + n + '_end не ставит ch' + n + '_done'); }

// автопрохождение
function runThrough(pick, label, pre) {
  const s = E.newSlot({ name: 'Тест', race: 'o_street', uniq: 'phoenix', prof1: 'smith', prof2: 'miner' });
  s.story.flags.prologue_done = 1; if (!s.story.done.includes('prologue')) s.story.done.push('prologue');
  let guard = 0, scenes = 0, battles = 0, fights = 0;
  const speakers = D.SPEAKERS;
  const play = (lines, id) => lines.forEach((l) => {
    const k = l[0];
    if (k === 'set') E.setFlags(s, l[1]);
    else if (k === 'give') E.give(s, l[1]);
    else if (k === 'choice') { const o = pick(l[1], s); E.setFlags(s, o.f || {}); play(o.r || [], id); }
    else if (k === 'if') { if (E.flagTest(s, l[1])) play(l[2], id); }
    else if (k === 'rec') { if (!D.CREW[l[1]]) err(label + ' ' + id + ': rec ' + l[1]); else if (E.recruit) { try { E.recruit(s, l[1]); } catch (e) { /* ignore */ } } }
    else if (!ST.DIRECTIVES.includes(k) && !speakers[k]) err(label + ' ' + id + ': неизвестный говорящий ' + k);
  });
  if (pre) pre(s, play);
  while (guard++ < 5000) {
    const n = ST.current(s); if (!n) break;
    const nx = ST.nextScene(s, n);
    if (nx) {
      const sc = D.SCENES[nx.id]; if (!sc) { err(label + ': нет сцены ' + nx.id); break; }
      play(sc.lines, nx.id); E.finishScene(s, nx.id); scenes++;
      const nl = ST.levelOf(n); if (s.hero.level < nl) s.hero.level = Math.min(100, nl);
      continue;
    }
    // нужен бой: открыть подземелье главы, провести бой с боссом, отметить пройденным
    const pend = ST.pendingScene(s, n); const dun = (pend && pend.need && pend.need.clear) || (D.CHAPTERS[n] && D.CHAPTERS[n].battle && D.CHAPTERS[n].battle.dun);
    if (!dun) { err(label + ': гл.' + n + ' зависла без боя (сцена ' + (ST.pendingScene(s, n) || {}).id + ')'); break; }
    if (!E.dungeonUnlocked(s, dun)) { err(label + ': гл.' + n + ' подземелье ' + dun + ' закрыто (gate ' + D.DUN[dun].gate + ')'); break; }
    const d = D.DUN[dun]; s.hero.level = Math.max(s.hero.level, Math.min(100, d.lv + 3));
    const P = C.unitFromSlot(s); const K = C.unitFromComp('kairen', s.hero.level, 1), T = C.unitFromComp('tika', s.hero.level, 1);
    const B = C.create([P, K, T], [C.unitFromEnemy(d.boss, d.lv, 0, false, 'e0')], E.rng(n), { auto: true, noFlee: true });
    let it = 0; while (!B.over && it++ < 4000) { const u = C.next(B); if (u) C.act(B, u, C.choose(B, u)); }
    if (!B.over) { err(label + ': бой с боссом ' + d.boss + ' (гл.' + n + ') завис'); break; } fights++;
    s.prog.cleared[dun] = 1; battles++;
  }
  if (guard >= 5000) err(label + ': зацикливание');
  if (!s.story.flags.game_complete) err(label + ': game_complete не поставлен (остановились на гл.' + ST.current(s) + ')');
  return { s, scenes, battles, fights };
}
const base = runThrough((opts) => opts[0], 'первый вариант');
notes.push('автопрохождение (первый вариант): сцен ' + base.scenes + ', боёв с боссами ' + base.battles + ', game_complete=' + (base.s.story.flags.game_complete || 0) + ', концовка: ' + ['ending_return', 'ending_dim', 'ending_crown', 'ending_true'].filter((f) => base.s.story.flags[f]).join(',') + ', гл. пройдено ' + ST.doneCount(base.s));
const endings = ['ending_return', 'ending_dim', 'ending_crown', 'ending_true'];
const TRUE_KEYS = ['ending_true', 'spared_fiora', 'spared_elvira', 'spared_selestina', 'heard_nine', 'own_choice', 'heart_any'];
endings.forEach((f) => {
  const keys = f === 'ending_true' ? TRUE_KEYS : [f];
  const pick = (opts) => opts.find((o) => o.f && keys.some((k) => o.f[k])) || opts[0];
  // дуэли героинь (гл.2–3) играются в обычной игре после боя; «пощадить» нужно для истинной концовки
  const pre = (s, play) => { ['duel_fiora', 'duel_elvira', 'duel_selestina'].forEach((id) => { if (D.SCENES[id]) play(D.SCENES[id].lines, id); else err('нет сцены дуэли ' + id); }); };
  const r = runThrough(pick, 'концовка ' + f, pre);
  const got = endings.filter((x) => r.s.story.flags[x]);
  if (!got.includes(f)) err('концовка ' + f + ' недостижима (поставлено: ' + got.join(',') + ')');
  if (got.length !== 1) notes.push('концовка ' + f + ': одновременно флаги ' + got.join(','));
  notes.push('концовка ' + f + ': достижима, game_complete=' + (r.s.story.flags.game_complete || 0));
});
notes.forEach((m) => console.log('  · ' + m));
errs.forEach((m) => console.log('  ✗ ' + m));
console.log('\naudit-story: ошибок ' + errs.length);
process.exit(errs.length ? 1 : 0);
