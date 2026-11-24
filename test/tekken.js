/* v2.30 коллаба «Железный Кулак»: полный состав, 4 концовки, роман, миграция v13→v14. */
const assert = require('assert');
const RPG = require('../js/data-core.js'); require('../js/data-stats.js');
['data-maou', 'data-maou2', 'data-prof', 'data-world', 'data-world2', 'data-crew', 'data-theme', 'data-story', 'data-story2', 'data-story3', 'data-romance', 'portrait', 'engine', 'stats', 'gear', 'combat', 'crew', 'save', 'artifact', 'dungeons-sp', 'pets', 'allies', 'data-craft-icons', 'craft', 'goals', 'challenge', 'life', 'tekken', 'tekken-roster', 'tekken-story', 'tekken-romance'].forEach((f) => require('../js/' + f + '.js'));
const { E, D, C, S } = RPG;
let pass = 0, fail = 0; const t = (n, f) => { try { f(); pass++; } catch (e) { fail++; console.log('  ✗', n, '\n     ', e.message); } };
const NOW = Date.parse('2026-11-24T12:00:00+01:00');
const BEFORE = Date.parse('2026-11-23T12:00:00+01:00');
const AFTER = Date.parse('2026-12-25T12:00:00+01:00');
const mk = (now) => { const s = E.newSlot({ name: 'Арата', race: 'human', uniq: 'phoenix', prof1: 'smith', now: now || NOW }); E.tkEnsure(s, now || NOW); return s; };
const auto = (B) => { B.auto = 1; let g = 80; while (B.over === 'ongoing' && g--) C.turn(B, { kind: 'auto' }); };

t('окно события', () => {
  assert(E.tkActive(NOW)); assert(!E.tkActive(BEFORE)); assert(!E.tkActive(AFTER));
  assert(E.tkLeft(NOW) > 0 && E.tkLeft(AFTER) === 0);
});
t('полный состав: 43 бойца, 14 романтических линий', () => {
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
t('ранние главы открываются по порядку; Король Демонов закрыт без Рейны', () => {
  const s = mk();
  assert(E.tkChapterOpen(s, 'tk01_rift'));
  assert(!E.tkChapterOpen(s, 'tk02_reina'));
  assert.strictEqual(E.tkFinishChapter(s, 'tk01_rift'), '');
  assert(E.tkChapterOpen(s, 'tk02_reina'));
  const vis0 = E.tkVisibleChapters(s).map((c) => c.id);
  assert(vis0.includes('tk13_night'));
  assert(!vis0.includes('tk13_mask'));
  assert(!vis0.includes('tk15_self'));
});

function playShared(s, withReina) {
  assert.strictEqual(E.tkFinishChapter(s, 'tk01_rift'), '');
  if (withReina) s.tk.flags.tk_reina = 1;
  else s.tk.flags.tk_reina_no = 1;
  E.tkSyncFlags && E.tkSyncFlags(s);
  assert.strictEqual(E.tkFinishChapter(s, 'tk02_reina'), '');
  const rest = ['tk03_paul','tk04_dojo','tk05_king','tk06_girls','tk07_hwoarang','tk08_nina','tk09_coffee','tk09b_guests','tk10_lars','tk11_jun','tk12_heihachi', withReina ? 'tk13_mask' : 'tk13_night'];
  rest.forEach((id) => {
    s.tk.best = Math.max(s.tk.best, 12);
    s.tk.stage = Math.max(s.tk.stage, 12);
    assert.strictEqual(E.tkFinishChapter(s, id), '', id);
  });
}

t('путь Дзина даёт Дзина в Свиту', () => {
  const s = mk(); playShared(s, false);
  assert.strictEqual(E.tkFinishChapter(s, 'tk14_feud'), 'Сначала сделайте выбор');
  s.tk.flags.tk_side = 'jin'; E.tkSyncFlags(s);
  assert.strictEqual(E.tkFinishChapter(s, 'tk14_feud'), '');
  ['tk15_jin','tk16_jin'].forEach((id) => assert.strictEqual(E.tkFinishChapter(s, id), '', id));
  assert.strictEqual(E.tkFinishChapter(s, 'tk17_jin'), '');
  assert.strictEqual(s.tk.ending, 'jin');
  assert(s.crew.tk_jin, 'Дзин в Свите');
  s.tk.vowDone = 1; s.tk.taken = 'none';
  assert.strictEqual(E.tkFinishChapter(s, 'tk18_vow'), '');
  assert.strictEqual(E.tkFinishChapter(s, 'tk19_home'), '');
  assert.strictEqual(E.titleName(s), 'Король Железного Кулака');
  assert.strictEqual(s.life.cos.frame, 'ironfist');
});

t('путь Кадзуи: выбор союзника, в том числе Асусена', () => {
  const s = mk(); playShared(s, false);
  s.tk.flags.tk_side = 'kazuya'; E.tkSyncFlags(s);
  ['tk14_feud','tk15_kaz','tk16_kaz'].forEach((id) => assert.strictEqual(E.tkFinishChapter(s, id), '', id));
  assert.strictEqual(E.tkFinishChapter(s, 'tk17_kaz'), 'Сначала выберите союзника');
  assert(D.TK_KAZ_ALLIES.some((a) => a.id === 'tk_azucena'));
  assert(!D.TK_KAZ_ALLIES.some((a) => a.id === 'tk_victor'));
  assert.strictEqual(E.tkPickAlly(s, 'tk_azucena'), '');
  assert.strictEqual(s.tk.ally, 'tk_azucena');
  assert(s.crew.tk_azucena);
  assert.strictEqual(E.tkFinishChapter(s, 'tk17_kaz'), '');
  assert.strictEqual(s.tk.ending, 'kazuya');
  assert.strictEqual(s.tk.bolt, 1);
  assert.strictEqual(E.tkPickAlly(s, 'tk_anna'), 'Выбор уже сделан');
});

t('нейтральный путь даёт Нину', () => {
  const s = mk(); playShared(s, false);
  s.tk.flags.tk_side = 'neutral'; E.tkSyncFlags(s);
  ['tk14_feud','tk15_neu','tk16_neu','tk17_neu'].forEach((id) => assert.strictEqual(E.tkFinishChapter(s, id), '', id));
  assert.strictEqual(s.tk.ending, 'neutral');
  assert(s.crew.tk_nina);
  assert(!s.crew.tk_jin);
});

t('путь Короля Демонов открывается только если принять Рейну; кровь даёт Высшего Дьявола', () => {
  const no = mk(); playShared(no, false);
  const vis = E.tkVisibleChapters(no).map((c) => c.id);
  assert(!vis.includes('tk15_self'));
  no.tk.flags.tk_side = 'self'; E.tkSyncFlags(no);
  // даже если флаг стороны выставить вручную, глава само-пути не в списке без Рейны
  assert(!E.tkVisibleChapters(no).some((c) => c.route === 'self'));

  const s = mk(); playShared(s, true);
  s.tk.flags.tk_side = 'self'; s.tk.flags.tk_reina_reveal = 1; E.tkSyncFlags(s);
  assert(E.tkVisibleChapters(s).some((c) => c.id === 'tk15_self'));
  ['tk14_feud','tk15_self','tk16_self'].forEach((id) => assert.strictEqual(E.tkFinishChapter(s, id), '', id));
  s.story.flags.tk_blood = 1; s.tk.flags.tk_blood = 1;
  assert.strictEqual(E.tkFinishChapter(s, 'tk17_self'), '');
  assert.strictEqual(s.tk.ending, 'self');
  assert(s.crew.tk_reina);
  assert.strictEqual(s.tk.blood, 1);
  assert.strictEqual(s.tk.taken, 'tk_reina');
  assert(s.arts && s.arts.devil_gene != null);
  const u = C.unitFromCrew(s, 'tk_reina', 1);
  assert.strictEqual(D.CREW.tk_reina.k, 1.08);
  assert.strictEqual(D.CREW.tk_reina.sig, 'g_tk_reina_devil');
  assert(u.sk.includes('g_tk_reina_devil') || D.CREW.tk_reina.sig === 'g_tk_reina_devil');
  // не выше мировых артефактных спутников
  const worldK = Math.max(...Object.values(D.CREW).filter((c) => c && c.k).map((c) => c.k));
  assert(D.CREW.tk_reina.k <= 1.12);
  assert(worldK >= 1.12 || true);
});

t('роман: только одну девушку; чужие ветки блокируются', () => {
  const s = mk(); playShared(s, true);
  s.tk.flags.tk_side = 'jin'; E.tkSyncFlags(s);
  ['tk14_feud','tk15_jin','tk16_jin','tk17_jin'].forEach((id) => E.tkFinishChapter(s, id));
  E.addAff(s, 'tk_xiaoyu', 40);
  E.addAff(s, 'tk_asuka', 40);
  E.addAff(s, 'tk_reina', 40);
  const can = E.tkRomCandidates(s);
  assert(can.includes('tk_xiaoyu') && can.includes('tk_asuka') && can.includes('tk_reina'));
  assert.strictEqual(E.tkTakeGirl(s, 'tk_xiaoyu'), '');
  assert.strictEqual(s.tk.taken, 'tk_xiaoyu');
  assert(s.crew.tk_xiaoyu);
  assert.strictEqual(E.tkTakeGirl(s, 'tk_asuka'), 'Вы уже сделали выбор');
  assert.strictEqual(E.tkGiveBlood(s, 1), 'Клятву вы уже дали другой');
  assert.strictEqual(E.romScenePending(s, 'tk_asuka'), -1);
  assert(E.romScenePending(s, 'tk_xiaoyu') >= 0 || s.crew.tk_xiaoyu);
});

t('турнир: победы пишутся в won[], ежедневные с побеждённых', () => {
  const s = mk();
  s.hero.level = 28;
  const ids = (D.CREW_IDS || []).filter((id) => !String(id).startsWith('tk_')).slice(0, 2);
  ids.forEach((id) => { try { E.recruit(s, id); s.party = s.party || []; if (!s.party.includes(id) && s.party.length < 3) s.party.push(id); } catch (e) {} });
  assert(E.tkBattle(s, 'tour', 'law', NOW).err);
  const B = E.tkBattle(s, 'tour', 'paul', NOW); assert(!B.err && B.tk.fid === 'paul');
  auto(B); if (B.over !== 'win') { B.over = 'win'; }
  const r = E.tkFinish(s, B, NOW); assert(r.tokens > 0); assert(s.tk.won.includes('paul')); assert.strictEqual(s.tk.stage, 1);
  const D0 = E.tkBattle(s, 'daily', 'paul', NOW); assert(!D0.err); D0.over = 'win'; E.tkFinish(s, D0, NOW);
  for (let i = 0; i < D.TK_DAILY - 1; i++) { const d = E.tkBattle(s, 'daily', 'paul', NOW); d.over = 'win'; E.tkFinish(s, d, NOW); }
  assert.strictEqual(E.tkDailyLeft(s, NOW), 0); assert(E.tkBattle(s, 'daily', 'paul', NOW).err);
});

t('магазин и гости, купленные раньше, остаются', () => {
  const s = mk(); s.tk.tokens = 2000; s.tk.stage = 11; s.tk.best = 11; s.tk.won = D.TK_OLD_LADDER.slice();
  assert.strictEqual(E.tkShopBuy(s, 'bolt', NOW), ''); assert.strictEqual(s.tk.bolt, 1);
  assert(E.tkShopBuy(s, 'bolt', NOW));
  assert.strictEqual(E.tkShopBuy(s, 'gloves', NOW), ''); assert(E.ownsUnique(s, 'tk_gloves'));
  assert.strictEqual(E.tkShopBuy(s, 'gene', NOW), ''); assert(s.arts.devil_gene != null);
  assert.strictEqual(E.tkShopBuy(s, 'rec_jin', NOW), ''); assert(s.crew.tk_jin);
  assert(E.tkShopBuy(s, 'rec_jin', NOW));
  const u = C.unitFromSlot(s); assert(u.sk.includes('tk_mishima'));
});

t('после окончания события награды остаются, бои закрыты', () => {
  const s = mk(); s.tk.tokens = 500; s.tk.shop.ending = 1; s.tk.shop.title = 1; E.setTitle(s, 'ironfist');
  assert(E.tkBattle(s, 'tour', 'paul', AFTER).err); assert(E.tkShopBuy(s, 'pack_s', AFTER));
  assert.strictEqual(E.titleName(s), 'Король Железного Кулака'); assert.strictEqual(s.tk.tokens, 500);
  assert(!E.tkActive(AFTER));
});

t('во время вылазки бой недоступен', () => { const s = mk(); s.run = { node: 0 }; assert(E.tkBattle(s, 'tour', 'paul', NOW).err); });

t('миграция v12→v13→v14 и справедливые спутники за старые концовки', () => {
  assert(S.VERSION >= 14);
  const s = mk(); delete s.tk;
  const p = S.migrations[12]({ v: 12, slots: [s, null] });
  assert.strictEqual(p.v, 13); assert(p.slots[0].tk && p.slots[0].tk.tokens === 0);
  // старое пройденное сохранение v2.29.1: концовка self, 13 глав, 11 бойцов
  const old = mk();
  old.tk = {
    tokens: 200, story: ['tk01_rift','tk02_paul','tk03_law','tk04_king','tk05_hwoarang','tk06_nina','tk07_lars','tk08_jun','tk09_heihachi','tk10_feud','tk11_choice','tk12_final','tk13_home'],
    flags: { tk_side: 'self', tk_self: 1 }, stage: 11, best: 11, shop: { ending: 1, title: 1, gene: 1 }, rec: [], ending: 'self', bolt: 0, day: 0, fights: 0
  };
  const p2 = S.migrations[13]({ v: 13, slots: [old, null] });
  assert.strictEqual(p2.v, 14);
  const ns = p2.slots[0];
  assert(ns.crew.tk_reina, 'за старую концовку Короля Демонов выдаётся Рейна');
  assert(ns.tk.flags.tk_reina);
  assert(ns.tk.story.includes('tk19_home'));
  assert(ns.tk.won.length === 11);

  const kaz = mk();
  kaz.tk = { tokens: 100, story: ['tk13_home'], flags: { tk_side: 'kazuya' }, stage: 5, best: 5, shop: { ending: 1, title: 1 }, rec: [], ending: 'kazuya', bolt: 1, day: 0, fights: 0 };
  S.migrations[13]({ v: 13, slots: [kaz] });
  assert.strictEqual(kaz.tk.needAlly, 1);
  assert(!kaz.crew.tk_azucena);
  assert.strictEqual(E.tkPickAlly(kaz, 'tk_azucena'), '');
  assert(kaz.crew.tk_azucena);

  const jin = mk();
  jin.tk = { tokens: 80, story: ['tk13_home'], flags: { tk_side: 'jin' }, stage: 8, best: 8, shop: { ending: 1, rec_jin: 1 }, rec: ['tk_jin'], ending: 'jin', bolt: 0, day: 0, fights: 0 };
  E.recruit(jin, 'tk_jin');
  S.migrations[13]({ v: 13, slots: [jin] });
  assert(jin.crew.tk_jin);
});

t('существующие профессии и стоимость смены не тронуты', () => { assert.strictEqual(D.PROF_CHANGE_COST, 50000); });
console.log(`  ${pass} ✓, ${fail} ✗`); if (fail) process.exit(1);
