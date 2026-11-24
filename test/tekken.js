/* v2.29 коллаба «Железный Кулак»: окно события, сюжет и выборы, турнир, жетоны, магазин, миграция v12→v13. */
const assert = require('assert');
const RPG = require('../js/data-core.js'); require('../js/data-stats.js');
['data-maou', 'data-maou2', 'data-prof', 'data-world', 'data-world2', 'data-crew', 'data-theme', 'data-story', 'data-story2', 'data-story3', 'data-romance', 'portrait', 'engine', 'stats', 'gear', 'combat', 'crew', 'save', 'artifact', 'dungeons-sp', 'pets', 'allies', 'data-craft-icons', 'craft', 'goals', 'challenge', 'life', 'tekken'].forEach((f) => require('../js/' + f + '.js'));
const { D, E, C, S } = RPG;
let pass = 0, fail = 0; const t = (n, f) => { try { f(); pass++; } catch (e) { fail++; console.log('  ✗', n, '\n     ', e.message); } };
const NOW = D.TK_EVENT.start + 3 * 86400e3, AFTER = D.TK_EVENT.end + 86400e3, BEFORE = D.TK_EVENT.start - 86400e3;
const mk = () => { const s = E.newSlot({ name: 'Т', race: 'o_street', uniq: 'phoenix', prof1: 'smith', prof2: 'miner', now: NOW }); s.hero.level = 40; s.gold = 1e6; return s; };
const auto = (B) => { let n = 0; while (!B.over && n++ < 8000) { const u = C.next(B); if (u) C.act(B, u, C.choose(B, u)); } if (!B.over) B.over = 'lose'; return B; };
console.log('Коллаба: Железный Кулак');
t('окно события: сейчас открыто, до и после — нет', () => {
  assert(E.tkActive(NOW)); assert(!E.tkActive(BEFORE)); assert(!E.tkActive(AFTER));
  assert(E.tkLeft(NOW) > 0 && E.tkLeft(AFTER) === 0);
});
t('13 глав, 11 бойцов, все враги собираются', () => {
  assert.strictEqual(D.TK_CH.length, 13); assert.strictEqual(D.TK_FIGHTERS.length, 11);
  D.TK_FIGHTERS.forEach((f) => { const u = E.tkFoe(mk(), f.id); assert(u.maxHp > 0 && u.sk.length && u.name, f.id); });
});
t('сюжет: главы по порядку, выбор обязателен, концовка выдаёт награду', () => {
  const s = mk();
  assert(E.tkChapterOpen(s, 'tk01_rift')); assert(!E.tkChapterOpen(s, 'tk02_paul'));
  assert.strictEqual(E.tkFinishChapter(s, 'tk01_rift'), '');
  assert(E.tkChapterOpen(s, 'tk02_paul'));
  assert.strictEqual(E.tkFinishChapter(s, 'tk12_final'), 'Сначала предыдущая глава');
  D.TK_CH.filter((c) => !c.choice && !c.ending && c.id !== 'tk01_rift').forEach((c) => {
    if (!E.tkChapterOpen(s, c.id)) { /* fight chapters unlock after previous done */ const p = D.TK_CH[c.i - 1]; if (!s.tk.story.includes(p.id)) E.tkFinishChapter(s, p.id); }
    if (c.choice) return; E.tkFinishChapter(s, c.id);
  });
  // force story up to choice
  s.tk.story = D.TK_CH.filter((c) => c.i < 10).map((c) => c.id);
  assert(E.tkChapterOpen(s, 'tk11_choice'));
  assert.strictEqual(E.tkFinishChapter(s, 'tk11_choice'), 'Сначала сделайте выбор');
  s.tk.flags.tk_side = 'self'; s.tk.flags.tk_self = 1;
  assert.strictEqual(E.tkFinishChapter(s, 'tk11_choice'), '');
  assert.strictEqual(E.tkFinalId(s), 'deviljin');
  assert.strictEqual(E.tkFinishChapter(s, 'tk12_final'), '');
  const tok = s.tk.tokens; assert.strictEqual(E.tkFinishChapter(s, 'tk13_home'), '');
  assert.strictEqual(s.tk.ending, 'self'); assert(s.tk.tokens > tok); assert(s.arts && s.arts.devil_gene != null); assert.strictEqual(E.titleName(s), 'Король Железного Кулака');
});
t('концовки: jin даёт рамку, kazuya — навык, neutral — только жетоны и титул', () => {
  const one = (side) => { const s = mk(); s.tk.story = D.TK_CH.filter((c) => !c.ending).map((c) => c.id); s.tk.flags.tk_side = side; s.tk.flags['tk_' + side] = 1; E.tkFinishChapter(s, 'tk13_home'); return s; };
  const j = one('jin'), k = one('kazuya'), n = one('neutral');
  assert(j.life.cos.frame === 'ironfist' && j.tk.bolt !== 1);
  assert(k.tk.bolt === 1 && !(k.arts && k.arts.devil_gene != null));
  assert(n.tk.tokens >= 80 && !(n.arts && n.arts.devil_gene != null));
  assert.strictEqual(E.tkFinalId(k), 'jin'); assert.strictEqual(E.tkFinalId(j), 'deviljin');
});
t('турнир: этапы по порядку, жетоны, реванш только после победы, лимит попыток', () => {
  const s = mk();
  const ids = (D.CREW_IDS || []).filter((id) => !String(id).startsWith('tk_')).slice(0, 2);
  ids.forEach((id) => { try { E.recruit(s, id); s.party = s.party || []; if (!s.party.includes(id) && s.party.length < 3) s.party.push(id); } catch (e) {} });
  assert(E.tkBattle(s, 'tour', 'law', NOW).err);
  const B = E.tkBattle(s, 'tour', 'paul', NOW); assert(!B.err && B.tk.fid === 'paul');
  auto(B); assert.strictEqual(B.over, 'win'); const r = E.tkFinish(s, B, NOW); assert(r.tokens > 0); assert.strictEqual(s.tk.stage, 1);
  const D0 = E.tkBattle(s, 'daily', 'paul', NOW); assert(!D0.err); D0.over = 'win'; E.tkFinish(s, D0, NOW);
  for (let i = 0; i < 10 && E.tkDailyLeft(s, NOW) > 0; i++) { const x = E.tkBattle(s, 'daily', 'paul', NOW); if (x.err) break; x.over = 'lose'; E.tkFinish(s, x, NOW); }
  assert.strictEqual(E.tkDailyLeft(s, NOW), 0); assert(E.tkBattle(s, 'daily', 'paul', NOW).err);
});
t('магазин: списание жетонов, уникальные один раз, перчатки и навык', () => {
  const s = mk(); s.tk.tokens = 2000; s.tk.stage = 10; s.tk.story = ['tk06_nina', 'tk10_feud'];
  assert.strictEqual(E.tkShopBuy(s, 'bolt', NOW), ''); assert.strictEqual(s.tk.bolt, 1); assert(s.tk.tokens === 2000 - 150);
  assert(E.tkShopBuy(s, 'bolt', NOW));
  assert.strictEqual(E.tkShopBuy(s, 'gloves', NOW), ''); assert(E.ownsUnique(s, 'tk_gloves'));
  assert.strictEqual(E.tkShopBuy(s, 'gene', NOW), ''); assert(s.arts.devil_gene != null);
  assert.strictEqual(E.tkShopBuy(s, 'rec_jin', NOW), ''); assert(s.crew.tk_jin);
  assert(E.tkShopBuy(s, 'rec_jin', NOW));
  const u = C.unitFromSlot(s); assert(u.sk.includes('tk_mishima'));
});
t('после окончания события бои и лавка закрыты, награды на месте', () => {
  const s = mk(); s.tk.tokens = 500; s.tk.shop.title = 1; E.setTitle(s, 'ironfist');
  assert(E.tkBattle(s, 'tour', 'paul', AFTER).err); assert(E.tkShopBuy(s, 'pack_s', AFTER));
  assert.strictEqual(E.titleName(s), 'Король Железного Кулака'); assert.strictEqual(s.tk.tokens, 500);
  assert(!E.tkActive(AFTER));
});
t('во время вылазки бой недоступен', () => { const s = mk(); s.run = { node: 0 }; assert(E.tkBattle(s, 'tour', 'paul', NOW).err); });
t('миграция v12 → v13', () => {
  assert(S.VERSION >= 13); const s = mk(); delete s.tk;
  const p = S.migrations[12]({ v: 12, slots: [s, null] }); assert.strictEqual(p.v, 13); assert(p.slots[0].tk && p.slots[0].tk.tokens === 0);
});
t('существующие профессии и стоимость смены не тронуты', () => { assert.strictEqual(D.PROF_CHANGE_COST, 50000); });
console.log(`  ${pass} ✓, ${fail} ✗`); if (fail) process.exit(1);
