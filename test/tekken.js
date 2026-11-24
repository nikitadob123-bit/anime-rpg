/* v2.31.1 коллаба «Железный Кулак»: канонический сценарий, 19 глав, 3 исхода + Рейна. */
const assert = require('assert');
const RPG = require('../js/data-core.js'); require('../js/data-stats.js');
['data-maou', 'data-maou2', 'data-prof', 'data-world', 'data-world2', 'data-crew', 'data-theme', 'data-story', 'data-story2', 'data-story3', 'data-romance', 'portrait', 'engine', 'stats', 'gear', 'combat', 'crew', 'save', 'artifact', 'dungeons-sp', 'pets', 'allies', 'data-craft-icons', 'craft', 'goals', 'challenge', 'life', 'tekken', 'tekken-roster', 'tekken-story', 'tekken-romance', 'tekken-meet'].forEach((f) => require('../js/' + f + '.js'));
const { E, D, C, S } = RPG;
let pass = 0, fail = 0; const t = (n, f) => { try { f(); pass++; } catch (e) { fail++; console.log('  ✗', n, '\n     ', e.message); } };
const NOW = Date.parse('2026-11-24T12:00:00+01:00');
const BEFORE = Date.parse('2026-11-23T12:00:00+01:00');
const AFTER = Date.parse('2026-12-25T12:00:00+01:00');
const mk = (now) => { const s = E.newSlot({ name: 'Арата', race: 'human', uniq: 'phoenix', prof1: 'smith', now: now || NOW }); E.tkEnsure(s, now || NOW); return s; };
const auto = (B) => { B.auto = 1; let g = 80; while (B.over === 'ongoing' && g--) C.turn(B, { kind: 'auto' }); };
const CH = () => D.TK_CH.map((c) => c.id);

function playThrough(s, last, flags) {
  Object.assign(s.tk.flags, flags || {});
  E.tkSyncFlags && E.tkSyncFlags(s);
  for (const id of CH()) {
    if (id === 'tk18_vow') { s.tk.vowDone = 1; s.tk.taken = s.tk.taken || 'none'; }
    const r = E.tkFinishChapter(s, id);
    assert.strictEqual(r, '', id + ': ' + r);
    if (id === last) break;
  }
}

t('окно события', () => {
  assert(E.tkActive(NOW)); assert(!E.tkActive(BEFORE)); assert(!E.tkActive(AFTER));
  assert(E.tkLeft(NOW) > 0 && E.tkLeft(AFTER) === 0);
});

t('полный состав: 43 бойца, 14 романтических линий, Юдзиро не в сетке', () => {
  assert.strictEqual(D.TK_FIGHTERS.length, 43);
  assert.strictEqual(D.TK_WOMEN.length, 14);
  D.TK_WOMEN.forEach((id) => assert(D.ROMANCE[id] && D.ROMANCE[id].scenes.length === 3, id));
  assert(!D.TK_FIGHTER.yujiro && !D.TK_FIGHTERS.some((f) => /yujiro|ханма/i.test(f.id + f.n)));
  const first = D.TK_FIGHTERS.slice(0, 11).map((f) => f.id);
  assert.deepStrictEqual(first, D.TK_OLD_LADDER);
  D.TK_FIGHTERS.forEach((f) => { const u = E.tkFoe(mk(), f.id); assert(u.maxHp > 0 && u.sk.length && u.name, f.id); });
  const a = E.tkFoe(mk(), 'paul').maxHp, b = E.tkFoe(mk(), 'roger').maxHp;
  assert(b > a, 'сетка растёт к концу, но не ломает ранних');
});

t('19 глав открываются строго по сюжету, без турнирного порога', () => {
  const s = mk();
  assert.strictEqual(D.TK_CH.length, 19);
  assert.strictEqual(D.TK_CH[0].id, 'tk01_rift');
  assert.strictEqual(D.TK_CH[18].id, 'tk19_home');
  assert(E.tkChapterOpen(s, 'tk01_rift'));
  assert(!E.tkChapterOpen(s, 'tk02_reina'));
  assert.strictEqual(E.tkFinishChapter(s, 'tk01_rift'), '');
  assert(E.tkChapterOpen(s, 'tk02_reina'));
  const vis = E.tkVisibleChapters(s).map((c) => c.id);
  assert.deepStrictEqual(vis, CH());
  assert(!vis.includes('tk15_self') && !vis.includes('tk14_feud') && !vis.includes('tk13_night'));
  D.TK_CH.forEach((c) => assert.strictEqual(c.need, 0, c.id));
});

t('отказ Рейне на первой встрече закрывает её линию, но не войну', () => {
  const s = mk();
  playThrough(s, 'tk01_rift');
  s.tk.flags.tk_reina_no = 1; E.tkSyncFlags(s);
  playThrough(s, 'tk09_case', { tk_jin: 1, tk_side: 'jin' });
  assert(s.tk.flags.tk_reina_no);
  assert(!E.tkRomGate(s, 'tk_reina', 0));
  playThrough(s, 'tk16_outcome');
  assert.strictEqual(s.tk.ending, 'jin');
  assert(s.crew.tk_jin);
  assert(!s.crew.tk_reina);
});

t('принять Рейну — независимый путь; слово Дзину — концовка Дзина', () => {
  const s = mk();
  playThrough(s, 'tk02_reina', { tk_reina: 1 });
  playThrough(s, 'tk16_outcome', { tk_jin: 1, tk_side: 'jin', tk_reina: 1 });
  assert.strictEqual(s.tk.ending, 'jin');
  assert(s.crew.tk_jin);
  s.tk.flags.tk_reina_join = 1; s.tk.flags.tk_blood = 1; E.tkSyncFlags(s);
  playThrough(s, 'tk17_blood');
  assert(s.crew.tk_reina);
  assert(s.tk.blood);
});

t('сделка с Кадзуей даёт Сферу Судьбы и не требует союзника', () => {
  const s = mk();
  playThrough(s, 'tk16_outcome', { tk_kazuya: 1, tk_side: 'kazuya' });
  assert.strictEqual(s.tk.ending, 'kazuya');
  assert(s.tk.sphere);
  assert(s.inv.some((it) => it && (it.id === 'tk_sphere' || it.k === 'tk_sphere')));
  assert(!s.tk.needAlly);
  assert(!s.crew.tk_jin && !s.crew.tk_nina);
});

t('наблюдатель, не давший ни слова, получает Нину', () => {
  const s = mk();
  playThrough(s, 'tk09_case');
  assert(!s.tk.flags.tk_jin && !s.tk.flags.tk_kazuya);
  playThrough(s, 'tk16_outcome');
  assert.strictEqual(s.tk.ending, 'neutral');
  assert(s.tk.flags.tk_neutral);
  assert(s.crew.tk_nina);
});

t('сюжетные бои есть, сюжетные враги не в сетке из 43, поражение не закрывает главу', () => {
  const s = mk();
  playThrough(s, 'tk02_reina', { tk_reina: 1 });
  const ch = D.TK_CH_MAP.tk03_doors;
  assert.strictEqual(E.tkFightFor(s, ch), 'jin');
  const B = E.tkBattle(s, 'story', 'jin');
  assert(!B.err, B.err);
  assert.strictEqual(B.tk.mark, 'story');
  B.over = 'lose';
  const rep = E.tkFinish(s, B);
  assert.strictEqual(rep.result, 'lose');
  assert(!s.tk.story.includes('tk03_doors'));
  const g = E.tkFoe(s, 'guard2'), j = E.tkFoe(s, 'jackmob');
  assert(g && g.maxHp > 0 && j && j.maxHp > 0);
  assert.strictEqual(D.TK_FIGHTERS.length, 43);
  assert(!D.TK_FIGHTER.guard2 && !D.TK_FIGHTER.jackmob);
});

t('встречи: 31 сцена, Юдзиро и Хэйхати после финала, Азазель после главы 09', () => {
  const s = mk();
  assert.strictEqual(D.TK_MEETS.length, 31);
  assert(D.TK_MEET_MAP.yujiro && D.TK_MEET_MAP.azazel && D.TK_MEET_MAP.deviljin && D.TK_MEET_MAP.panda);
  assert(!E.tkMeetOpen(s, 'paul'));
  playThrough(s, 'tk02_reina', { tk_reina: 1 });
  assert(E.tkMeetOpen(s, 'paul') && E.tkMeetOpen(s, 'jin') && E.tkMeetOpen(s, 'kuma'));
  assert(!E.tkMeetOpen(s, 'king'));
  playThrough(s, 'tk09_case');
  assert(E.tkMeetOpen(s, 'azazel'));
  assert(!E.tkMeetOpen(s, 'yujiro') && !E.tkMeetOpen(s, 'heihachi') && !E.tkMeetOpen(s, 'clive'));
  s.tk.flags.tk_jin = 1; s.tk.flags.tk_side = 'jin';
  s.tk.vowDone = 1; s.tk.taken = 'none';
  playThrough(s, 'tk19_home');
  assert(E.tkMeetOpen(s, 'yujiro') && E.tkMeetOpen(s, 'heihachi') && E.tkMeetOpen(s, 'clive'));
});

t('ворота романа: Рейна после 05/11/17, остальные после 05/10/16–17', () => {
  const s = mk();
  playThrough(s, 'tk05_street', { tk_reina: 1 });
  assert(E.tkRomGate(s, 'tk_reina', 0));
  assert(!E.tkRomGate(s, 'tk_reina', 1));
  assert(E.tkRomGate(s, 'tk_nina', 0));
  assert(!E.tkRomGate(s, 'tk_nina', 1));
  playThrough(s, 'tk11_daughter', { tk_reina: 1, tk_jin: 1, tk_side: 'jin' });
  assert(E.tkRomGate(s, 'tk_reina', 1));
  assert(E.tkRomGate(s, 'tk_nina', 1));
  assert(!E.tkRomGate(s, 'tk_reina', 2));
});

t('магазин и награды', () => {
  const s = mk(); s.tk.tokens = 2000; s.tk.stage = 11; s.tk.best = 11;
  playThrough(s, 'tk16_outcome', { tk_jin: 1, tk_side: 'jin' });
  assert.strictEqual(E.tkShopBuy(s, 'bolt', NOW), ''); assert.strictEqual(s.tk.bolt, 1);
  assert(E.tkShopBuy(s, 'bolt', NOW));
  assert.strictEqual(E.tkShopBuy(s, 'gloves', NOW), ''); assert(E.ownsUnique(s, 'tk_gloves'));
  assert.strictEqual(E.tkShopBuy(s, 'gene', NOW), ''); assert(s.arts.devil_gene != null);
  // Дзин уже выдан концовкой
  assert(s.crew.tk_jin);
});

t('после окончания события награды остаются, бои закрыты', () => {
  const s = mk(); s.tk.tokens = 500; s.tk.shop.ending = 1; s.tk.shop.title = 1; E.setTitle(s, 'ironfist');
  assert(E.tkBattle(s, 'tour', 'paul', AFTER).err); assert(E.tkShopBuy(s, 'pack_s', AFTER));
  assert.strictEqual(E.titleName(s), 'Король Железного Кулака'); assert.strictEqual(s.tk.tokens, 500);
  assert(!E.tkActive(AFTER));
});

t('во время вылазки бой недоступен', () => { const s = mk(); s.run = { node: 0 }; assert(E.tkBattle(s, 'tour', 'paul', NOW).err); });

t('миграция v13→v15 сохраняет награды и переносит прогресс', () => {
  assert(S.VERSION >= 15);
  const s = mk(); delete s.tk;
  const p = S.migrations[12]({ v: 12, slots: [s, null] });
  assert.strictEqual(p.v, 13); assert(p.slots[0].tk && p.slots[0].tk.tokens === 0);

  const old = mk();
  old.tk = {
    tokens: 200, story: ['tk01_rift','tk02_paul','tk03_law','tk04_king','tk05_hwoarang','tk06_nina','tk07_lars','tk08_jun','tk09_heihachi','tk10_feud','tk11_choice','tk12_final','tk13_home'],
    flags: { tk_side: 'self', tk_self: 1 }, stage: 11, best: 11, shop: { ending: 1, title: 1, gene: 1 }, rec: [], ending: 'self', bolt: 0, day: 0, fights: 0, won: ['paul','law','king','hwoarang','nina','lars','lee','steve','bryan','eddy','kuma']
  };
  const p2 = S.migrate({ v: 13, slots: [old, null] });
  assert.strictEqual(p2.v, 15);
  const ns = p2.slots[0];
  assert.strictEqual(ns.tk.tokens, 200);
  assert(ns.tk.shop.gene && ns.tk.shop.title);
  assert(ns.crew.tk_reina, 'за старую концовку Короля Демонов выдаётся Рейна');
  assert(ns.tk.flags.tk_reina);
  assert(ns.tk.flags.tk_neutral || ns.tk.flags.tk_side === 'neutral');
  assert(ns.tk.story.includes('tk19_home'));
  assert.strictEqual(ns.tk.story.length, 19);
  assert.strictEqual(ns.tk.ending, 'self');
  assert.strictEqual(ns.tk.won.length, 11);

  const kaz = mk();
  kaz.tk = { tokens: 100, story: ['tk13_home'], flags: { tk_side: 'kazuya' }, stage: 5, best: 5, shop: { ending: 1, title: 1 }, rec: [], ending: 'kazuya', bolt: 1, day: 0, fights: 0, won: [] };
  S.migrate({ v: 13, slots: [kaz] });
  assert.strictEqual(kaz.tk.tokens, 100);
  assert(kaz.tk.sphere, 'Сфера за старую концовку Кадзуи');
  assert.strictEqual(kaz.tk.needAlly, 1);
  assert.strictEqual(E.tkPickAlly(kaz, 'tk_azucena'), '');
  assert(kaz.crew.tk_azucena);

  const jin = mk();
  jin.tk = { tokens: 80, story: ['tk13_home'], flags: { tk_side: 'jin' }, stage: 8, best: 8, shop: { ending: 1, rec_jin: 1 }, rec: ['tk_jin'], ending: 'jin', bolt: 0, day: 0, fights: 0, won: [] };
  E.recruit(jin, 'tk_jin');
  S.migrate({ v: 13, slots: [jin] });
  assert(jin.crew.tk_jin);
  assert(jin.tk.story.includes('tk19_home'));

  const mid = mk();
  mid.tk = { tokens: 40, story: ['tk01_rift','tk02_reina','tk03_paul','tk04_dojo'], flags: { tk_reina: 1 }, stage: 2, best: 2, shop: {}, rec: [], day: 0, fights: 0, won: [] };
  S.migrate({ v: 13, slots: [mid] });
  assert(mid.tk.story.includes('tk01_rift') && mid.tk.story.includes('tk04_paul'));
  assert(!mid.tk.story.includes('tk19_home'));
  assert(mid.tk.flags.tk_reina);
  assert.strictEqual(mid.tk.tokens, 40);
});

t('существующие профессии и стоимость смены не тронуты', () => { assert.strictEqual(D.PROF_CHANGE_COST, 50000); });

t('кроп лица для рамки диалога: центр в середине кадра, лицо целиком внутри', () => {
  const m = { w: 1024, h: 1024, fx: 512, fy: 410, fw: 360 };
  const r = RPG.dlgPorPlace(m, 80);
  assert(Math.abs(r.left + 512 * r.sc - 40) < 0.51, 'fx не в центре: ' + r.left);
  assert(Math.abs(r.top + 410 * r.sc - 40) < 0.51, 'fy не в центре: ' + r.top);
  const face = 360 * r.sc;
  assert(face <= 80 + 0.01, 'лицо шире рамки: ' + face);
  assert(face >= 80 * 0.5, 'лицо слишком мелкое: ' + face);
  const jacket = RPG.dlgPorPlace({ w: 555, h: 1024, fx: 274, fy: 158, fw: 180 }, 80);
  assert(180 * jacket.sc <= 80 + 0.01);
  assert(Math.abs(jacket.left + 274 * jacket.sc - 40) < 0.51);
});

t('рамка в диалоге включается для сцен коллабы и не для обычного сюжета', () => {
  assert(E.vnSceneBoxPor(D.TK_SCENES.tk02_reina.lines));
  assert(E.vnSceneBoxPor(D.TK_SCENES.tk01_rift.lines));
  assert(!E.vnSceneBoxPor([['n', 'Только рассказчик.'], ['h', 'Реплика героя.', 'n']]));
  const rom = D.ROMANCE.tk_reina && D.ROMANCE.tk_reina.scenes[0];
  assert(rom && E.vnSceneBoxPor(rom.lines));
});


t('в коллабе нет голой буквы «К» вместо героя', () => {
  assert.strictEqual(D.SPEAKERS.h.n, '{name}');
  assert.strictEqual(D.SPEAKERS.h.art, 'hero');
  assert(D.SPEAKERS.h.hero);
  const named = mk();
  const untitled = E.newSlot({ name: '', race: 'human', uniq: 'phoenix', prof1: 'smith', now: NOW });
  untitled.hero.name = '';
  E.tkEnsure(untitled, NOW);
  assert.strictEqual(E.heroName(named, 'nom'), 'Арата');
  assert.strictEqual(E.heroName(named, 'gen'), 'Араты');
  assert.strictEqual(E.heroName(named, 'dat'), 'Арате');
  assert.strictEqual(E.heroName(named, 'acc'), 'Арату');
  assert.strictEqual(E.heroName(named, 'ins'), 'Аратой');
  assert.strictEqual(E.heroName(untitled, 'nom'), 'Король Демонов');
  assert.strictEqual(E.heroName(untitled, 'gen'), 'Короля Демонов');
  assert.strictEqual(E.heroName(untitled, 'dat'), 'Королю Демонов');
  assert.strictEqual(E.heroName(untitled, 'acc'), 'Короля Демонов');
  assert.strictEqual(E.heroName(untitled, 'ins'), 'Королём Демонов');
  const opener = (D.TK_SCENES.tk01_rift.lines.find((l) => l[0] === 'n' && /сидит у костра/.test(l[1] || '')) || [])[1];
  assert(opener, 'есть ремарка про костёр');
  assert.strictEqual(E.fmtText(opener, named), opener.replace(/\{name\}/g, 'Арата'));
  assert(/Арата сидит у костра/.test(E.fmtText(opener, named)));
  assert(/Король Демонов сидит у костра/.test(E.fmtText(opener, untitled)));
  assert.strictEqual(E.fmtText(D.SPEAKERS.h.n, named), 'Арата');
  assert.strictEqual(E.fmtText(D.SPEAKERS.h.n, untitled), 'Король Демонов');

  const SKIP = new Set(['fight', 'bg', 'cg', 'fx', 'title', 'hide', 'set', 'give', 'rec', 'loy', 'aff', 'if', 'choice']);
  const PREP = /^\s+(вам|нас|нему|ней|ним|тебе|себе|мне|нам|Якусиме|Кадзуе|Хельмору)(?![A-Za-zА-Яа-яЁё])/;
  const bare = (s) => {
    const out = [];
    s = String(s || '');
    for (let i = 0; i < s.length; i++) {
      if (s[i] !== 'К') continue;
      const prev = i ? s[i - 1] : '';
      const next = s[i + 1] || '';
      if (/[A-Za-zА-Яа-яЁё\-]/.test(prev) || /[A-Za-zА-Яа-яЁё\-]/.test(next)) continue;
      if (PREP.test(s.slice(i + 1))) continue;
      out.push(s.slice(Math.max(0, i - 24), i + 24));
    }
    return out;
  };
  const hits = [];
  const walk = (src, arr) => {
    (arr || []).forEach((l, i) => {
      if (!l || !l.length) return;
      const k = l[0];
      if (k === 'К' || k === 'K' || k === 'k') hits.push(src + ': speaker ' + k);
      if (k === 'if') return walk(src + '/if', l[2]);
      if (k === 'choice') {
        (l[1] || []).forEach((op, j) => {
          walk(src + '/choice' + j, [{ 0: 'n', 1: op.t }, ...(op.r || [])].map((x, idx) => idx === 0 ? ['n', op.t] : x));
        });
        return;
      }
      if (SKIP.has(k)) return;
      const text = typeof l[1] === 'string' ? l[1] : '';
      ['named', 'untitled'].forEach((tag) => {
        const slot = tag === 'named' ? named : untitled;
        bare(E.fmtText(text, slot)).forEach((ctx) => hits.push(src + ' [' + tag + '] ' + ctx));
      });
    });
  };
  Object.keys(D.TK_SCENES || {}).forEach((id) => walk('scene:' + id, (D.TK_SCENES[id] || {}).lines));
  Object.keys(D.ROMANCE || {}).filter((id) => String(id).startsWith('tk_')).forEach((id) => {
    (D.ROMANCE[id].scenes || []).forEach((sc, i) => walk('rom:' + id + '/' + i, sc.lines));
  });
  Object.keys(D.TK_MEETS || {}).forEach((id) => walk('meet:' + id, (D.TK_MEETS[id] || {}).lines));
  Object.keys(D.TK_LOSS || {}).forEach((id) => walk('loss:' + id, D.TK_LOSS[id]));
  assert.strictEqual(hits.length, 0, hits.slice(0, 8).join(' | '));
});

console.log(`  ${pass} ✓, ${fail} ✗`); if (fail) process.exit(1);
