/* v2.31.2 коллаба «Железный Кулак»: канонический сценарий, 19 глав, 3 исхода + Рейна. */
const assert = require('assert');
const RPG = require('../js/data-core.js'); require('../js/data-stats.js');
['data-maou', 'data-maou2', 'data-prof', 'data-world', 'data-world2', 'data-crew', 'data-theme', 'data-story', 'data-story2', 'data-story3', 'data-romance', 'portrait', 'engine', 'stats', 'gear', 'combat', 'crew', 'save', 'artifact', 'dungeons-sp', 'pets', 'allies', 'data-craft-icons', 'craft', 'goals', 'challenge', 'life', 'tekken', 'tekken-roster', 'tekken-story', 'tekken-romance', 'tekken-reina-romance', 'tekken-meet', 'mail'].forEach((f) => require('../js/' + f + '.js'));
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
  D.TK_WOMEN.forEach((id) => assert(D.ROMANCE[id] && D.ROMANCE[id].scenes.length === (id === 'tk_reina' ? 12 : 3), id));
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

t('сделка с Кадзуей даёт Сферу Судьбы и предлагает выбрать союзника', () => {
  const s = mk();
  playThrough(s, 'tk16_outcome', { tk_kazuya: 1, tk_side: 'kazuya' });
  assert.strictEqual(s.tk.ending, 'kazuya');
  assert(s.tk.sphere);
  assert(s.inv.some((it) => it && (it.id === 'tk_sphere' || it.k === 'tk_sphere')));
  assert.strictEqual(s.tk.needAlly, 1);
  assert(!s.tk.ally);
  assert(!s.crew.tk_jin && !s.crew.tk_nina);
  assert.strictEqual(E.tkPickAlly(s, 'tk_azucena'), '');
  assert(s.crew.tk_azucena);
  assert.strictEqual(s.tk.needAlly, 0);
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

t('ворота романа: Рейна после финала коллабы, остальные после 05/10/16–17', () => {
  const s = mk();
  playThrough(s, 'tk05_street', { tk_reina: 1 });
  assert(!E.tkRomGate(s, 'tk_reina', 0), 'романтика Рейны закрыта до конца коллабы');
  assert(E.tkRomGate(s, 'tk_nina', 0));
  assert(!E.tkRomGate(s, 'tk_nina', 1));
  playThrough(s, 'tk11_daughter', { tk_reina: 1, tk_jin: 1, tk_side: 'jin' });
  assert(!E.tkRomGate(s, 'tk_reina', 0));
  assert(E.tkRomGate(s, 'tk_nina', 1));
  playThrough(s, 'tk16_outcome');
  s.tk.flags.tk_reina_join = 1; E.tkSyncFlags(s);
  playThrough(s, 'tk19_home');
  assert(s.crew.tk_reina);
  assert(E.tkRomGate(s, 'tk_reina', 0));
  assert(E.tkRomGate(s, 'tk_reina', 5));
  assert(!E.tkRomGate(s, 'tk_reina', 11), 'свадебный этап без любовной ветки закрыт');
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
  assert(!D.TK_SHOP.some((it) => it.id === 'rec_jin' || it.id === 'rec_nina' || it.typ === 'rec'));
  assert(!D.TK_SHOP_MAP.rec_jin && !D.TK_SHOP_MAP.rec_nina);
  assert.strictEqual(E.tkShopBuy(s, 'rec_jin', NOW), 'Нет такой позиции');
  assert.strictEqual(E.tkShopBuy(s, 'rec_nina', NOW), 'Нет такой позиции');
});

t('старая покупка Дзина/Нины в магазине не ломает сохранение и не забирает их из Свиты', () => {
  const s = mk();
  s.tk.tokens = 50;
  s.tk.shop.rec_jin = 1;
  s.tk.shop.rec_nina = 1;
  s.tk.rec = ['tk_jin', 'tk_nina'];
  E.recruit(s, 'tk_jin');
  E.recruit(s, 'tk_nina');
  E.tkEnsure(s);
  assert(s.crew.tk_jin && s.crew.tk_nina);
  assert.strictEqual(s.tk.shop.rec_jin, 1);
  assert.strictEqual(s.tk.shop.rec_nina, 1);
  assert.deepStrictEqual(s.tk.rec, ['tk_jin', 'tk_nina']);
  assert.strictEqual(s.tk.tokens, 50);
  // остальные позиции магазина по-прежнему покупаются
  assert.strictEqual(E.tkShopWhy(s, 'pack_s', NOW), '');
  assert.strictEqual(E.tkShopBuy(s, 'pack_s', NOW), '');
  assert(s.crew.tk_jin && s.crew.tk_nina);
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
  Object.keys(D.TK_LOSS || {}).forEach((id) => {
    const v = D.TK_LOSS[id];
    if (Array.isArray(v)) walk('loss:' + id, v);
    else Object.keys(v || {}).forEach((side) => walk('loss:' + id + '/' + side, v[side]));
  });
  (D.TK_BARKS || []).forEach((b, i) => walk('bark:' + i, [[b.who, b.t]]));

  assert.strictEqual(hits.length, 0, hits.slice(0, 8).join(' | '));
});


t('диалоги Рейны — пакетный бюст, полный рост только в карточке романа', () => {
  assert.strictEqual(D.TK_SPEAKERS.rei.art, 'tk_reina');
  const s = mk();
  assert.strictEqual(E.tkReinaLook(s), 'tk_reina');
  s.tk.flags.tk_reina_reveal = 1;
  assert.strictEqual(E.tkReinaLook(s), 'tk_reina');
  s.tk.blood = 1;
  assert.strictEqual(E.tkReinaLook(s), 'tk_reina_devil');
  E.tkReinaApply(s);
  assert.strictEqual(D.CREW.tk_reina.art, 'tk_reina_devil');
  s.tk.blood = 0;
  E.tkReinaApply(s);
  assert.strictEqual(D.CREW.tk_reina.art, 'tk_reina');
});


t('новые портреты NPC и фоны локаций привязаны без догадок', () => {
  const art = {
    aza: 'tk_azazel', drv: 'tk_driver', mer: 'tk_vendor', boy: 'tk_boy',
    med: 'tk_medic', syg: 'tk_ygg', fix: 'tk_fixer'
  };
  Object.keys(art).forEach((id) => assert.strictEqual(D.TK_SPEAKERS[id].art, art[id], id));
  assert.strictEqual(D.TK_SPEAKERS.sgc.art, undefined, 'sgc still has no portrait');
  assert.strictEqual(D.TK_SPEAKERS.fgt.art, undefined, 'fgt still has no portrait');
  const bg = {
    tk01_rift: 'tk_helmor', tk02_reina: 'tk_service', tk03_doors: 'tk_jinhall',
    tk04_paul: 'tk_coliseum', tk05_street: 'tk_service', tk06_hwoarang: 'tk_jinhall',
    tk07_sisters: 'tk_dojo', tk08_flagless: 'tk_eastgate', tk09_case: 'tk_kazbox',
    tk10_coliseum: 'tk_eastgate', tk11_daughter: 'tk_pier', tk12_night: 'tk_gcorp',
    tk13_island: 'tk_shore', tk14_sky: 'tk_awaken', tk15_last: 'tk_shore',
    tk16_outcome: 'tk_shore', tk17_blood: 'tk_awaken', tk18_vow: 'tk_pier',
    tk19_home: 'tk_helmor'
  };
  Object.keys(bg).forEach((id) => assert.strictEqual(D.TK_SCENES[id].bg, bg[id], id));
  const flat = (lines) => {
    const out = [];
    (lines || []).forEach((l) => {
      if (l[0] === 'bg') out.push(l[1]);
      if (l[0] === 'if') flat(l[2]).forEach((x) => out.push(x));
    });
    return out;
  };
  assert(flat(D.TK_SCENES.tk01_rift.lines).includes('tk_manhattan'));
  assert(flat(D.TK_SCENES.tk12_night.lines).includes('tk_pier'));
  assert(flat(D.TK_SCENES.tk13_island.lines).includes('tk_sanctuary'));
  assert(flat(D.TK_SCENES.tk13_island.lines).includes('tk_pier'));
  assert.strictEqual(D.TK_MEET_MAP.azazel.art, 'tk_azazel');
  assert.strictEqual(D.TK_MEET_MAP.law.bg, 'tk_lawdojo');
});


t('в репликах нет сценарных скобок «[Называет имя…]» и «Прощание. […]»', () => {
  const hits = [];
  const walk = (src, lines) => {
    (lines || []).forEach((l) => {
      if (!l || typeof l === 'string') return;
      if (l[0] === 'if') return walk(src, l[2]);
      if (l[0] === 'choice') return (l[1] || []).forEach((op, j) => walk(src + '/c' + j, op.r));
      const text = typeof l[1] === 'string' ? l[1] : '';
      if (/\[Называет имя/.test(text) || /Прощание\.\s*\[/.test(text)) hits.push(src + ': ' + text);
    });
  };
  Object.keys(D.TK_SCENES || {}).forEach((id) => walk('scene:' + id, (D.TK_SCENES[id] || {}).lines));
  (D.TK_MEETS || []).forEach((m) => walk('meet:' + m.id, m.lines));
  const named = [];
  const collect = (lines) => (lines || []).forEach((l) => {
    if (!l) return;
    if (l[0] === 'if') return collect(l[2]);
    if (l[0] === 'choice') return (l[1] || []).forEach((op) => collect(op.r));
    if (typeof l[1] === 'string' && /Покажешь, куда ушёл/.test(l[1])) named.push(l[1]);
  });
  collect((D.TK_SCENES.tk02_reina || {}).lines);
  assert(named.length && named.every((s) => s.indexOf('{name}.') === 0), named.join(' | '));
  assert.strictEqual(hits.length, 0, hits.slice(0, 6).join(' | '));
});


t('выбор Рейны в гл. 02 — косметическое предупреждение, флаги те же', () => {
  const ch = (D.TK_SCENES.tk02_reina.lines || []).find((l) => l && l[0] === 'choice');
  assert(ch && ch[2] && /Осторожно: этот выбор опасен/.test(ch[2].warn), ch && ch[2] && ch[2].warn);
  assert.strictEqual(ch[1].length, 2);
  assert.deepStrictEqual(ch[1][0].f, { tk_reina: 1 });
  assert.deepStrictEqual(ch[1][1].f, { tk_reina_no: 1 });
});


function romCanStart(s, id) {
  assert(s.crew[id], 'нет союзника ' + id);
  assert(s.rom[id], 'нет записи романа ' + id);
  assert(E.tkRomGate(s, id, 0), 'ворота романа закрыты для ' + id);
  const need = E.ROM_AT[0] - ((s.rom[id].aff) | 0);
  if (need > 0) E.addAff(s, id, need);
  assert.strictEqual(E.romScenePending(s, id), 0, 'сцена 1 недоступна для ' + id);
}

t('каждый маршрут до конца выдаёт союзника, роман можно начать', () => {
  // путь Дзина (слово в гл. 03) — в свиту Дзин; роман Сяоюй открывается
  const jin = mk();
  playThrough(jin, 'tk19_home', { tk_jin: 1, tk_side: 'jin', tk_reina_no: 1 });
  assert.strictEqual(jin.tk.ending, 'jin');
  assert(jin.crew.tk_jin);
  assert(!jin.crew.tk_nina && !jin.crew.tk_reina);
  assert(!E.tkRomGate(jin, 'tk_reina', 0));
  assert(E.tkRomGate(jin, 'tk_xiaoyu', 0) && E.tkRomGate(jin, 'tk_xiaoyu', 2), 'ворота романа после исхода Дзина закрыты');
  E.tkGrantComp(jin, 'tk_xiaoyu');
  romCanStart(jin, 'tk_xiaoyu');

  // путь Кадзуи (сделка в гл. 09) — сфера и выбор союзника
  const kaz = mk();
  playThrough(kaz, 'tk16_outcome', { tk_kazuya: 1, tk_side: 'kazuya' });
  assert.strictEqual(kaz.tk.ending, 'kazuya');
  assert.strictEqual(kaz.tk.needAlly, 1);
  assert.strictEqual(E.tkPickAlly(kaz, 'tk_anna'), '');
  kaz.tk.vowDone = 1; kaz.tk.taken = 'none';
  playThrough(kaz, 'tk19_home');
  assert(kaz.crew.tk_anna);
  assert(!kaz.crew.tk_jin && !kaz.crew.tk_nina);
  romCanStart(kaz, 'tk_anna');

  // наблюдатель (замок стороны в гл. 10) — Нина Уильямс, роман открывается
  const neu = mk();
  playThrough(neu, 'tk10_coliseum');
  assert.strictEqual(E.tkSide(neu), 'neutral');
  assert(neu.tk.flags.tk_neutral);
  playThrough(neu, 'tk19_home');
  assert.strictEqual(neu.tk.ending, 'neutral');
  assert(neu.crew.tk_nina);
  romCanStart(neu, 'tk_nina');

  // путь Рейны: отказ — Дзин есть, Рейны нет и роман закрыт
  const no = mk();
  playThrough(no, 'tk19_home', { tk_reina_no: 1, tk_jin: 1, tk_side: 'jin' });
  assert(no.crew.tk_jin);
  assert(!no.crew.tk_reina);
  assert(!E.tkRomGate(no, 'tk_reina', 0));

  // путь Рейны: принять и кровь — Рейна в свите, роман открывается (плюс Дзин)
  const yes = mk();
  playThrough(yes, 'tk16_outcome', { tk_reina: 1, tk_jin: 1, tk_side: 'jin' });
  yes.tk.flags.tk_reina_join = 1; yes.tk.flags.tk_blood = 1; E.tkSyncFlags(yes);
  playThrough(yes, 'tk19_home');
  assert(yes.crew.tk_jin && yes.crew.tk_reina);
  assert(yes.tk.blood);
  romCanStart(yes, 'tk_reina');
});

t('если исход уже записан, а союзника нет — выдача добирается при загрузке', () => {
  const s = mk();
  s.tk.story = D.TK_CH.map((c) => c.id);
  s.tk.ending = 'neutral';
  s.tk.flags = { tk_side: 'neutral', tk_neutral: 1 };
  s.tk.mig230 = 1; s.tk.mig231 = 1; s.tk.storyMig230 = 1;
  E.tkEnsure(s);
  assert(s.crew.tk_nina, 'Нина должна появиться у уже законченного наблюдателя');
  assert(s.rom.tk_nina);
  romCanStart(s, 'tk_nina');

  const k = mk();
  k.tk.story = D.TK_CH.map((c) => c.id);
  k.tk.ending = 'kazuya';
  k.tk.flags = { tk_side: 'kazuya', tk_kazuya: 1 };
  k.tk.mig230 = 1; k.tk.mig231 = 1; k.tk.storyMig230 = 1;
  E.tkEnsure(k);
  assert.strictEqual(k.tk.needAlly, 1);
  assert(k.tk.sphere);
});

t('сброс сюжета коллабы убирает прогресс и союзников, оставляя уровень и вещи', () => {
  const mid = mk();
  mid.gold = 8888; mid.hero.level = 33;
  mid.inv.push({ id: 'keep_me', n: 'Вещь' });
  E.artGain(mid, 'lantern');
  mid.tk.tokens = 120; mid.tk.stage = 4; mid.tk.best = 4; mid.tk.bolt = 1; mid.tk.won = ['paul', 'law'];
  playThrough(mid, 'tk10_coliseum');
  assert(mid.tk.story.includes('tk10_coliseum'));
  assert.strictEqual(E.tkResetStory(mid), '');
  assert.deepStrictEqual(mid.tk.story, []);
  assert.strictEqual(mid.tk.ending, null);
  assert.strictEqual(mid.gold, 8888);
  assert.strictEqual(mid.hero.level, 33);
  assert(mid.inv.some((it) => it && it.id === 'keep_me'));
  assert(mid.arts && mid.arts.lantern != null);
  assert.strictEqual(mid.tk.tokens, 120);
  assert.strictEqual(mid.tk.bolt, 1);
  assert.deepStrictEqual(mid.tk.won, ['paul', 'law']);
  assert.strictEqual(mid.tk.stage, 4);
  assert(E.tkChapterOpen(mid, 'tk01_rift'));
  assert(!E.tkChapterOpen(mid, 'tk02_reina'));

  const done = mk();
  done.gold = 5000; done.hero.level = 50;
  playThrough(done, 'tk16_outcome');
  assert(done.crew.tk_nina);
  const arts = Object.assign({}, done.arts || {});
  const invN = done.inv.length;
  done.tk.tokens = 200;
  assert.strictEqual(E.tkResetStory(done), '');
  assert(!done.crew.tk_nina);
  assert(!done.rom.tk_nina);
  assert.deepStrictEqual(done.tk.story, []);
  assert.strictEqual(done.tk.ending, null);
  assert.strictEqual(done.gold, 5000);
  assert.strictEqual(done.hero.level, 50);
  assert.strictEqual(done.inv.length, invN);
  assert.deepStrictEqual(done.arts, arts);
  assert.strictEqual(done.tk.tokens, 200);
  // после сброса маршрут наблюдателя снова выдаёт Нину, роман можно начать
  playThrough(done, 'tk19_home');
  assert(done.crew.tk_nina);
  romCanStart(done, 'tk_nina');
});

t('письмо сбрасывает коллабу и выдаёт «Одинокого Волка»', () => {
  const RPG = globalThis.RPG, M = RPG.M;
  const s = mk();
  s.gold = 777; s.hero.level = 28;
  playThrough(s, 'tk16_outcome', { tk_jin: 1, tk_side: 'jin' });
  assert(s.crew.tk_jin);
  s.tk.tokens = 90; s.tk.bolt = 1;
  const letter = { id: 'lone-wolf-reset-test', from: 'Администрация', title: 'Одинокий Волк', body: 'Сброс', date: '2026-11-25', gifts: { resetStory: 'tekken', achievements: ['lone_wolf'], titles: ['lone_wolf'] } };
  const feed = M.parseFeed({ letters: [letter] });
  assert.deepStrictEqual(feed.errors, []);
  M.deliver(s, feed.letters, NOW);
  const c = M.claim(s, letter.id, NOW);
  assert(c.ok, c.err);
  assert.deepStrictEqual(s.tk.story, []);
  assert(!s.crew.tk_jin);
  assert.strictEqual(s.gold, 777);
  assert.strictEqual(s.hero.level, 28);
  assert.strictEqual(s.tk.tokens, 90);
  assert.strictEqual(s.tk.bolt, 1);
  assert(s.ach.claimed.includes('lone_wolf'));
  assert((s.life.titles || []).includes('lone_wolf'));
  assert.strictEqual(E.titleName(s), 'Одинокий Волк');
  // скрыто, пока не получено
  const fresh = mk();
  assert(!E.achList(fresh).some((x) => x.a.id === 'lone_wolf'));
  assert(!E.titlesOf(fresh).some((x) => x.id === 'lone_wolf'));
});


t('облики Рейны: список, выбор сохраняется, сброс сюжета его не трогает', () => {
  const list = (D.TK_SKINS && D.TK_SKINS.tk_reina) || [];
  assert.strictEqual(list.length, 8);
  assert.strictEqual(list[0].id, 'jacket');
  assert.strictEqual(list[0].n, 'Обычный');
  assert.strictEqual(list[0].img, 'tk_reina_jacket');
  assert(!list[0].lock && !list[1].lock);
  assert.strictEqual(list[1].id, 'top');
  assert.strictEqual(list[1].n, 'Без бомбера');
  assert.strictEqual(list[1].img, 'tk_reina_top');
  assert.deepStrictEqual(list.slice(2).map((x) => [x.id, x.n, x.img, x.lock, x.stage, x.stageName]), [
    ['suit', 'Деловой костюм', 'tk_reina_skin_suit', 1, 1, 'Деловой визит'],
    ['shorts', 'Топ и шорты', 'tk_reina_skin_shorts', 1, 2, 'Свои правила ринга'],
    ['evening', 'Вечернее платье', 'tk_reina_skin_evening', 1, 4, 'Вечер, который не назначен'],
    ['catsuit', 'Кожаный комбинезон', 'tk_reina_skin_catsuit', 1, 6, 'Ночная работа'],
    ['armor', 'Демоническая броня', 'tk_reina_skin_armor', 1, 5, 'Крылья, которые не просили'],
    ['wedding', 'Свадебное платье', 'tk_reina_skin_wedding', 1, 11, 'Не как у Мисим']
  ]);
  assert.strictEqual(E.skinReqText(list[2]), 'Откроется: этап «Деловой визит»');
  assert.strictEqual(E.skinReqText(list[6]), 'Откроется: этап «Крылья, которые не просили»');
  assert.strictEqual(E.skinReqText(list[7]), 'Откроется: этап «Не как у Мисим»');
  const s = mk();
  assert.strictEqual(E.skinId(s, 'tk_reina'), 'jacket');
  assert.strictEqual(E.skinOf(s, 'tk_reina').img, 'tk_reina_jacket');
  assert(E.skinSrc(E.skinOf(s, 'tk_reina')).indexOf('tk_reina_jacket.webp') >= 0);
  ['suit', 'shorts', 'evening', 'catsuit', 'armor', 'wedding'].forEach((id) => assert(E.skinLocked(s, 'tk_reina', id), id));
  assert(!E.skinLocked(s, 'tk_reina', 'jacket') && !E.skinLocked(s, 'tk_reina', 'top'));
  assert.strictEqual(E.setSkin(s, 'tk_reina', 'suit'), 'Облик ещё закрыт');
  assert.strictEqual(E.setSkin(s, 'tk_reina', 'armor'), 'Облик ещё закрыт');
  // облики открываются этапами маршрута, а не числом симпатии или кровью
  s.rom.tk_reina = s.rom.tk_reina || { aff: 0, seen: [], dates: 0, gifts: 0 };
  s.rom.tk_reina.aff = 100;
  s.tk.blood = 1;
  assert(E.skinLocked(s, 'tk_reina', 'suit'), 'высокая симпатия и кровь сами по себе не открывают облик');
  const see = (n) => { s.rom.tk_reina.seen = Array.from({ length: n + 1 }, (_, i) => i); };
  see(1);
  assert(!E.skinLocked(s, 'tk_reina', 'suit') && E.skinLocked(s, 'tk_reina', 'shorts'));
  assert.strictEqual(E.setSkin(s, 'tk_reina', 'suit'), '');
  assert.strictEqual(E.skinOf(s, 'tk_reina').img, 'tk_reina_skin_suit');
  see(2);
  assert(!E.skinLocked(s, 'tk_reina', 'shorts') && E.skinLocked(s, 'tk_reina', 'evening'));
  see(4);
  assert(!E.skinLocked(s, 'tk_reina', 'evening') && E.skinLocked(s, 'tk_reina', 'catsuit') && E.skinLocked(s, 'tk_reina', 'armor'));
  see(5);
  assert(!E.skinLocked(s, 'tk_reina', 'armor') && E.skinLocked(s, 'tk_reina', 'catsuit'), 'броня — этап гена, без крови как условия');
  see(6);
  assert(!E.skinLocked(s, 'tk_reina', 'catsuit') && E.skinLocked(s, 'tk_reina', 'wedding'));
  see(11);
  assert(!E.skinLocked(s, 'tk_reina', 'wedding'));
  // без симпатии письмо и E.unlockSkin по-прежнему снимают замок
  const sMail = mk(); const M = globalThis.RPG.M;
  assert(E.skinLocked(sMail, 'tk_reina', 'wedding'));
  assert.strictEqual(E.unlockSkin(sMail, 'tk_reina', 'armor'), '');
  assert(!E.skinLocked(sMail, 'tk_reina', 'armor') && E.skinLocked(sMail, 'tk_reina', 'wedding'));
  const feed = M.parseFeed({ letters: [{ id: 'skin-unlock-test', from: 'Администрация', title: 'Облик', date: '2026-11-25', gifts: { unlockSkins: ['tk_reina:wedding'] } }] });
  assert.deepStrictEqual(feed.errors, []);
  M.deliver(sMail, feed.letters, NOW);
  assert(M.claim(sMail, 'skin-unlock-test', NOW).ok);
  assert(!E.skinLocked(sMail, 'tk_reina', 'wedding') && !E.skinLocked(sMail, 'tk_reina', 'armor'));
  assert.strictEqual(E.setSkin(s, 'tk_reina', 'top'), '');
  assert.strictEqual(s.skins.tk_reina, 'top');
  assert.strictEqual(E.skinId(s, 'tk_reina'), 'top');
  assert.strictEqual(E.setSkin(s, 'tk_reina', 'nope'), 'Нет такого облика');
  assert.strictEqual(s.skins.tk_reina, 'top');
  s.skins.tk_reina = 'armor';
  s.tk.blood = 0;
  s.rom.tk_reina.aff = 0;
  s.rom.tk_reina.seen = [];
  assert.strictEqual(E.skinId(s, 'tk_reina'), 'jacket');
  assert.strictEqual(E.unlockSkin(s, 'tk_reina'), '');
  assert(!E.skinLocked(s, 'tk_reina', 'wedding') && !E.skinLocked(s, 'tk_reina', 'suit'));
  s.skins.tk_reina = 'top';
  playThrough(s, 'tk16_outcome');
  assert.strictEqual(E.tkResetStory(s), '');
  assert.strictEqual(s.skins.tk_reina, 'top', 'сброс сюжета коллабы не должен затирать выбранный облик');
  assert.strictEqual(s.skinsUnlock.tk_reina, 1, 'сброс не должен затирать открытие обликов письмом/флагом');
  assert(!E.skinsOf('tk_nina').length);
});



t('романтика Рейны отдельно от преданности и открывается после коллабы', () => {
  const s = mk();
  s.crew.tk_reina = { lv: 10, loy: 40, eq: {}, t: 0, star: 0, skl: 0, bxp: 0 };
  s.rom.tk_reina = { aff: 0, seen: [], dates: 0, gifts: 0 };
  s.tk.flags.tk_reina = 1;
  assert.strictEqual(E.tkRomanceOpen(s), false);
  assert.strictEqual(E.addAff(s, 'tk_reina', 20), 0);
  assert.strictEqual(s.rom.tk_reina.aff, 0);
  assert.strictEqual(E.dateOk(s, 'tk_reina'), 'Романтика Рейны откроется после прохождения коллабы');
  E.tkGiveBlood(s, 1);
  assert.strictEqual(s.tk.blood, 1);
  assert.strictEqual(s.crew.tk_reina.loy, 90);
  assert.strictEqual(s.rom.tk_reina.aff, 0, 'кровь не поднимает романтику');
  s.tk.ending = 'jin';
  s.tk.story = (s.tk.story || []).concat(['tk16_outcome', 'tk19_home']);
  assert.strictEqual(E.tkRomanceOpen(s), true);
  assert.strictEqual(E.addAff(s, 'tk_reina', 6), 6);
  assert.strictEqual(s.rom.tk_reina.aff, 6);
  const sc = D.ROMANCE.tk_reina.scenes;
  assert.strictEqual(sc.length, 12);
  assert.strictEqual(sc[0].t, 'Утро без расписания');
  assert.strictEqual(sc[11].t, 'Не как у Мисим');
  assert.deepStrictEqual(E.romAts('tk_reina'), [0, 6, 12, 18, 24, 32, 40, 48, 56, 64, 72, 80]);
  assert.strictEqual(E.romScenePending(s, 'tk_reina'), 0);
  s.rom.tk_reina.aff = 80;
  s.rom.tk_reina.seen = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  s.story.flags = s.story.flags || {};
  assert.strictEqual(E.tkRomGate(s, 'tk_reina', 11), false, 'свадебный этап только на любовной ветке');
  s.story.flags.rei_rom_love = 1;
  assert.strictEqual(E.tkRomGate(s, 'tk_reina', 11), true);
  s.story.flags.rei_rom_bad = 1;
  assert.strictEqual(E.tkRomGate(s, 'tk_reina', 9), false);
});

t('старые сохранения: романтика Рейны сбрасывается, преданность и письма с обликами остаются', () => {
  const s = mk();
  s.crew.tk_reina = { lv: 12, loy: 90, eq: {}, t: 0, star: 0, skl: 0, bxp: 0 };
  s.rom.tk_reina = { aff: 80, seen: [0, 1, 2], dates: 3, gifts: 2 };
  s.skins = { tk_reina: 'wedding' };
  s.tk.blood = 1;
  s.tk.ending = 'jin';
  s.tk.mig232 = 0;
  E.tkEnsure(s);
  assert.strictEqual(s.tk.mig232, 1);
  assert.strictEqual(s.rom.tk_reina.aff, 0);
  assert.deepStrictEqual(s.rom.tk_reina.seen, []);
  assert.strictEqual(s.crew.tk_reina.loy, 90);
  assert.strictEqual(s.skins.tk_reina, 'jacket');
  assert(E.skinLocked(s, 'tk_reina', 'wedding'));
  const sMail = mk();
  sMail.skins = { tk_reina: 'armor' };
  sMail.rom.tk_reina = { aff: 40, seen: [0], dates: 0, gifts: 0 };
  sMail.skinsUnlock = { tk_reina: { armor: 1 } };
  sMail.tk.mig232 = 0;
  E.tkEnsure(sMail);
  assert.strictEqual(sMail.rom.tk_reina.aff, 0);
  assert(!E.skinLocked(sMail, 'tk_reina', 'armor'), 'письмо/unlockSkin не перезапирает');
  assert.strictEqual(sMail.skins.tk_reina, 'armor');
});

t('реплики в боях коллабы и тексты поражения по маршрутам', () => {
  assert((D.TK_BARKS || []).length >= 16);
  const start = E.tkBarkList({ tk: { flags: {} } }, { tk: { chId: 'tk10_coliseum', side: 'jin', wave: 0, mark: 'story' } }, 'start');
  assert.strictEqual(start.length, 2);
  assert.strictEqual(start[0].who, 'lars');
  assert(/Первые уже в проёме/.test(start[0].t));
  const hit = E.tkBarkList({}, { tk: { chId: 'tk03_doors', side: 'jin', wave: 0 } }, 'hit1');
  assert.strictEqual(hit.length, 2);
  assert.strictEqual(hit[0].who, 'jin');
  const mid = E.tkBarkList({}, { tk: { chId: 'tk13_island', side: 'kazuya', wave: 0 } }, 'mid');
  assert.strictEqual(mid.length, 2);
  const none = E.tkBarkList({}, { tk: { chId: 'tk03_doors', side: 'jin', wave: 0 } }, 'start');
  assert.strictEqual(none.length, 0);
  const s = mk();
  s.tk.flags.tk_side = 'kazuya'; s.tk.flags.tk_kazuya = 1;
  const lossK = E.tkLossLines(s, 'tk10_coliseum');
  assert(lossK.some((l) => l[0] === 'vic'));
  s.tk.flags = { tk_side: 'jin', tk_jin: 1 };
  const lossJ = E.tkLossLines(s, 'tk10_coliseum');
  assert(lossJ.some((l) => /первому пролёту/.test(l[1] || '')));
  const loss13 = E.tkLossLines(s, 'tk13_island');
  assert(loss13.some((l) => l[0] === 'ali'));
});

t('сцены сочетаний маршрутов в главе «Домой»', () => {
  const s = mk();
  s.crew.tk_reina = { lv: 10, loy: 80, eq: {}, t: 0, star: 0, skl: 0, bxp: 0 };
  s.crew.tk_jin = { lv: 10, loy: 80, eq: {}, t: 0, star: 0, skl: 0, bxp: 0 };
  s.tk.rec = ['tk_reina', 'tk_jin'];
  s.tk.flags.tk_has_reina = 1; s.tk.flags.tk_has_jin = 1;
  s.tk.blood = 1; s.tk.taken = 'tk_reina';
  const lines = E.tkSceneLines(s, D.TK_SCENES.tk19_home);
  const ifs = lines.filter((l) => l[0] === 'if').map((l) => l[1]);
  assert(ifs.includes('tk_combo_rj'));
  assert(ifs.includes('tk_combo_love_blood'));
  assert.strictEqual(s.story.flags.tk_combo_rj, 1);
  assert.strictEqual(s.story.flags.tk_combo_love_blood, 1);
  const jinLine = lines.find((l) => l[0] === 'if' && l[1] === 'tk_combo_rj')[2][0];
  assert.strictEqual(jinLine[0], 'jin');
  assert(/отца с самого начала/.test(jinLine[1]));
});

console.log(`  ${pass} ✓, ${fail} ✗`); if (fail) process.exit(1);
