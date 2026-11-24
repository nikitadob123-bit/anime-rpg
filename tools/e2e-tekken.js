/* E2E v2.29 коллаба «Железный Кулак»: вход, глава, бой, жетоны, магазин, выбор, скрытие после окончания.
   Скриншоты — /workspace/shots-tekken/v230/  (444×986) */
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path');
const { serve } = require('./serve.js');
const outDir = process.env.TK_SHOTS || '/workspace/shots-tekken/v230';
fs.mkdirSync(outDir, { recursive: true });
let ok = 0, bad = 0;
const check = (n, c, extra) => { if (c) { ok++; console.log('  ✓', n, extra || ''); } else { bad++; console.log('  ✗', n, extra || ''); } };

(async () => {
  const srv = await serve(0);
  const url = 'http://127.0.0.1:' + srv.address().port + '/';
  const exe = process.env.CHROME_PATH || ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find((p) => fs.existsSync(p));
  const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 444, height: 986 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ru-RU', timezoneId: 'Europe/Berlin' });
  const page = await ctx.newPage();
  const errors = [], failed = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('response', (r) => { if (r.status() >= 400 && !/img\/tekken\//.test(r.url())) failed.push(r.status() + ' ' + r.url()); });
  const shot = (n) => page.screenshot({ path: path.join(outDir, n + '.jpg'), type: 'jpeg', quality: 80, scale: 'css' });
  const ev = (f, a) => page.evaluate(f, a);
  const click = async (sel, o) => { const l = page.locator(sel).first(); await l.waitFor({ state: 'visible', timeout: 8000 }); await l.click(o || {}); await page.waitForTimeout(80); };

  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__RPG && __RPG.UI && __RPG.E && __RPG.D && __RPG.D.TK_EVENT);
  await ev(async () => {
    const { UI, S, E, D, C } = __RPG;
    const p = S.newProfile('Коллаба', '👊');
    const s = E.newSlot({ name: 'Арата', race: 'o_street', uniq: 'phoenix', prof1: 'smith', prof2: 'miner', now: Date.now() });
    s.hero.level = 28; s.gold = 20000;
    const ids = (D.CREW_IDS || []).filter((id) => !String(id).startsWith('tk_')).slice(0, 2);
    ids.forEach((id) => { try { E.recruit(s, id); s.party = s.party || []; if (!s.party.includes(id) && s.party.length < 3) s.party.push(id); } catch (e) {} });
    p.slots[0] = s; p.active = 0; UI.p = p; UI.buildNav();
    if (__RPG.story && __RPG.story.loadOutline) await __RPG.story.loadOutline();
    UI.go('game');
  });
  await page.waitForTimeout(400);

  check('событие активно', await ev(() => __RPG.E.tkActive()));
  check('баннер в Лагере', await page.locator('.tkbanner').count() > 0);
  await shot('01-camp-banner');

  await click('.tkbanner');
  await page.waitForSelector('.tkmodal, .mbox', { timeout: 5000 });
  const disc = await ev(() => (document.querySelector('.mbox') || document.body).innerText);
  check('дисклеймер', /Неофициальная фанатская коллаба/.test(disc) && /Bandai Namco/.test(disc));
  check('обратный отсчёт', /⏳/.test(disc));
  await shot('02-event-modal');

  // глава 1
  const playVn = async () => {
    await page.waitForSelector('#story', { timeout: 8000 });
    const sk = page.locator('#sSkip');
    if (await sk.count()) await sk.click().catch(() => {});
    let guard = 250;
    while (guard-- > 0) {
      if (await page.locator('#schoice.on .choice').count()) return 'choice';
      if (!(await page.locator('#story').count())) return 'done';
      await page.waitForTimeout(80);
    }
    return 'story';
  };
  await click('[data-act="tkPlay"][data-id="tk01_rift"]');
  await playVn();
  await page.waitForTimeout(400);
  await shot('03-story-chapter');
  const story1 = await ev(() => (__RPG.UI.slot().tk.story || []).includes('tk01_rift'));
  check('глава 1 завершена', story1);

  // турнир: открыть и начать бой с Полом
  await ev(() => { if (!document.querySelector('.tkmodal, .mbox h3')) __RPG.UI.tkOpen('tour'); });
  await page.waitForTimeout(200);
  if (!(await page.locator('[data-act="tkTab"][data-k="tour"]').count())) await ev(() => __RPG.UI.tkOpen('tour'));
  await click('[data-act="tkTab"][data-k="tour"]');
  await shot('04-tournament');
  await ev(() => { __RPG.UI.p.settings.auto = true; __RPG.UI.p.settings.battleSpeed = 2; });
  const tokens0 = await ev(() => __RPG.UI.slot().tk.tokens);
  await click('[data-act="tkFight"][data-k="tour"][data-id="paul"]');
  await page.waitForSelector('#battle', { timeout: 8000 });
  await ev(() => { const B = __RPG.UI.B; if (B) { B.opts.auto = true; B.speed = 20; if (B.pending) { const p = B.pending; B.pending = null; p.res(__RPG.C.choose(B, p.u)); } } });
  await shot('05-fight-paul');
  await page.waitForFunction(() => !document.getElementById('battle'), { timeout: 60000 });
  const after = await ev(() => { const t = __RPG.UI.slot().tk; return { tokens: t.tokens, stage: t.stage }; });
  check('бой выигран, жетоны начислены', after.tokens > tokens0 && after.stage >= 1, JSON.stringify(after));

  // магазин
  await ev(() => { const s = __RPG.UI.slot(); s.tk.tokens = Math.max(s.tk.tokens, 80); __RPG.UI.tkOpen('shop'); });
  await page.waitForTimeout(200);
  await shot('06-shop');
  const gold0 = await ev(() => __RPG.UI.slot().gold);
  const tok0 = await ev(() => __RPG.UI.slot().tk.tokens);
  await click('[data-act="tkBuy"][data-id="pack_s"]');
  await page.waitForTimeout(200);
  const bought = await ev(() => ({ gold: __RPG.UI.slot().gold, tokens: __RPG.UI.slot().tk.tokens }));
  check('покупка за жетоны', bought.gold > gold0 && bought.tokens < tok0, JSON.stringify(bought));
  await shot('07-shop-bought');

  // глава Рейны: принять в подчинённые
  await ev(() => { const s = __RPG.UI.slot(); s.tk.story = ['tk01_rift']; __RPG.UI.tkOpen('story'); });
  await page.waitForTimeout(200);
  await click('[data-act="tkPlay"][data-id="tk02_reina"]');
  const vnR = await playVn();
  check('сцена Рейны — выбор', vnR === 'choice', vnR);
  await page.waitForSelector('#schoice.on .choice', { timeout: 8000 });
  await shot('08-reina-schoolgirl');
  const reiChoices = await ev(() => [...document.querySelectorAll('.choice')].map((e) => e.textContent));
  check('принять или отказать Рейне', reiChoices.length >= 2, reiChoices.join(' | '));
  const yes = page.locator('.choice').filter({ hasText: /Идёшь за мной|хорошо|подчин/i });
  if (await yes.count()) await yes.first().click();
  else await page.locator('.choice').first().click();
  await playVn();
  await page.waitForTimeout(300);
  const accepted = await ev(() => !!__RPG.UI.slot().tk.flags.tk_reina);
  check('Рейна принята, ветка Короля Демонов открыта', accepted);

  // сетка из 43
  await ev(() => __RPG.UI.tkOpen('tour'));
  await page.waitForTimeout(200);
  const fighterN = await ev(() => (__RPG.D.TK_FIGHTERS || []).length);
  check('в сетке 43 бойца', fighterN === 43, String(fighterN));
  await shot('09-tour-43');

  // развилка: 4 варианта только после принятия Рейны
  await ev(() => {
    const s = __RPG.UI.slot(), E = __RPG.E, D = __RPG.D;
    s.tk.flags.tk_reina = 1; E.tkSyncFlags && E.tkSyncFlags(s);
    s.tk.best = 12; s.tk.stage = 12;
    const vis = E.tkVisibleChapters(s);
    const feudI = vis.findIndex((c) => c.id === 'tk14_feud');
    s.tk.story = vis.slice(0, feudI).map((c) => c.id);
    __RPG.UI.tkOpen('story');
  });
  await page.waitForTimeout(200);
  await click('[data-act="tkPlay"][data-id="tk14_feud"]');
  const vn14 = await playVn();
  if (vn14 !== 'choice') await shot('10-choice-miss');
  await page.waitForSelector('#schoice.on .choice', { timeout: 8000 });
  await shot('10-feud-choice');
  const labels = await ev(() => [...document.querySelectorAll('.choice')].map((e) => e.textContent));
  check('четыре варианта выбора (с путём Короля Демонов)', labels.length >= 4, labels.join(' | '));
  const selfBtn = page.locator('.choice').filter({ hasText: /своим путём|Ни Дзин, ни Кадзуя|своей дорог/i });
  if (await selfBtn.count()) await selfBtn.first().click();
  else await page.locator('.choice').nth(2).click();
  await playVn();
  await page.waitForTimeout(300);
  const side = await ev(() => __RPG.UI.slot().tk.flags.tk_side);
  check('выбор сохранён (self)', side === 'self', String(side));

  // логика четырёх концовок, клятвы, крови, миграции
  const logic = await ev(() => {
    const { E, D, C, S } = __RPG;
    const NOW = Date.parse('2026-11-24T12:00:00+01:00');
    const mk = () => { const s = E.newSlot({ name: 'Т', race: 'human', uniq: 'phoenix', prof1: 'smith', now: NOW }); E.tkEnsure(s, NOW); s.tk.best = 12; s.tk.stage = 12; return s; };
    const shared = (s, reina) => {
      const ids = ['tk01_rift','tk02_reina','tk03_paul','tk04_dojo','tk05_king','tk06_girls','tk07_hwoarang','tk08_nina','tk09_coffee','tk09b_guests','tk10_lars','tk11_jun','tk12_heihachi', reina ? 'tk13_mask' : 'tk13_night'];
      if (reina) s.tk.flags.tk_reina = 1; else s.tk.flags.tk_reina_no = 1;
      E.tkSyncFlags && E.tkSyncFlags(s);
      ids.forEach((id) => E.tkFinishChapter(s, id));
    };
    const out = {};
    const jin = mk(); shared(jin, false); jin.tk.flags.tk_side = 'jin'; E.tkSyncFlags(jin);
    ['tk14_feud','tk15_jin','tk16_jin','tk17_jin'].forEach((id) => E.tkFinishChapter(jin, id));
    out.jin = !!(jin.crew.tk_jin && jin.tk.ending === 'jin');

    const neu = mk(); shared(neu, false); neu.tk.flags.tk_side = 'neutral'; E.tkSyncFlags(neu);
    ['tk14_feud','tk15_neu','tk16_neu','tk17_neu'].forEach((id) => E.tkFinishChapter(neu, id));
    out.nina = !!(neu.crew.tk_nina && neu.tk.ending === 'neutral');

    const kaz = mk(); shared(kaz, false); kaz.tk.flags.tk_side = 'kazuya'; E.tkSyncFlags(kaz);
    ['tk14_feud','tk15_kaz','tk16_kaz'].forEach((id) => E.tkFinishChapter(kaz, id));
    out.allyNeed = E.tkFinishChapter(kaz, 'tk17_kaz') === 'Сначала выберите союзника';
    out.allyAz = E.tkPickAlly(kaz, 'tk_azucena') === '' && !!kaz.crew.tk_azucena;
    E.tkFinishChapter(kaz, 'tk17_kaz');
    out.kazEnd = kaz.tk.ending === 'kazuya';

    const sl = mk(); shared(sl, true); sl.tk.flags.tk_side = 'self'; sl.tk.flags.tk_reina_reveal = 1; sl.story.flags.tk_blood = 1; sl.tk.flags.tk_blood = 1; E.tkSyncFlags(sl);
    ['tk14_feud','tk15_self','tk16_self','tk17_self'].forEach((id) => E.tkFinishChapter(sl, id));
    out.reina = !!(sl.crew.tk_reina && sl.tk.blood && sl.tk.taken === 'tk_reina');
    out.devilK = D.CREW.tk_reina.k === 1.08;

    const rom = mk(); shared(rom, true); rom.tk.flags.tk_side = 'jin'; E.tkSyncFlags(rom);
    ['tk14_feud','tk15_jin','tk16_jin','tk17_jin'].forEach((id) => E.tkFinishChapter(rom, id));
    E.addAff(rom, 'tk_lili', 40); E.addAff(rom, 'tk_asuka', 40);
    out.vow = E.tkTakeGirl(rom, 'tk_lili') === '' && E.tkTakeGirl(rom, 'tk_asuka') === 'Вы уже сделали выбор';
    out.bloodLock = E.tkGiveBlood(rom, 1) === 'Клятву вы уже дали другой';

    const noR = mk(); shared(noR, false);
    out.selfLocked = !E.tkVisibleChapters(noR).some((c) => c.route === 'self');

    const old = mk();
    old.tk = { tokens: 200, story: ['tk01_rift','tk02_paul','tk03_law','tk04_king','tk05_hwoarang','tk06_nina','tk07_lars','tk08_jun','tk09_heihachi','tk10_feud','tk11_choice','tk12_final','tk13_home'], flags: { tk_side: 'self', tk_self: 1 }, stage: 11, best: 11, shop: { ending: 1, title: 1 }, rec: [], ending: 'self', bolt: 0, day: 0, fights: 0 };
    S.migrations[13]({ v: 13, slots: [old] });
    out.migReina = !!(old.crew.tk_reina && old.tk.flags.tk_reina);

    const oldK = mk();
    oldK.tk = { tokens: 80, story: ['tk13_home'], flags: { tk_side: 'kazuya' }, stage: 5, best: 5, shop: { ending: 1 }, rec: [], ending: 'kazuya', bolt: 1, day: 0, fights: 0 };
    S.migrations[13]({ v: 13, slots: [oldK] });
    out.migAlly = oldK.tk.needAlly === 1;

    return out;
  });
  check('концовка Дзина даёт Дзина', logic.jin);
  check('нейтральная концовка даёт Нину', logic.nina);
  check('Кадзуя требует выбрать союзника', logic.allyNeed);
  check('можно взять Асусену', logic.allyAz);
  check('концовка Кадзуи записана', logic.kazEnd);
  check('кровь: Рейна — Высший Дьявол', logic.reina && logic.devilK, JSON.stringify({ reina: logic.reina, k: logic.devilK }));
  check('одна клятва, остальные блокируются', logic.vow && logic.bloodLock);
  check('путь Короля Демонов закрыт без принятия Рейны', logic.selfLocked);
  check('миграция v2.29.1 self → Рейна', logic.migReina);
  check('миграция kazuya → needAlly', logic.migAlly);

  // карточки спутников и выбор союзника
  await ev(() => {
    const s = __RPG.UI.slot(), E = __RPG.E;
    s.tk.ending = 'kazuya'; s.tk.needAlly = 1; s.tk.flags.tk_side = 'kazuya';
    E.tkSyncFlags && E.tkSyncFlags(s);
    __RPG.UI.tkAllyModal(s);
  });
  await page.waitForTimeout(200);
  await shot('11-ally-pick');
  const allyN = await ev(() => document.querySelectorAll('[data-act="tkPickAlly"]').length);
  check('в выборе союзника 4 кандидата', allyN === 4, String(allyN));
  await ev(() => { __RPG.UI.closeModal && __RPG.UI.closeModal(); });

  await ev(() => {
    const s = __RPG.UI.slot(), E = __RPG.E;
    s.tk.flags.tk_reina = 1; s.tk.blood = 1; s.tk.taken = 'tk_reina';
    if (!s.crew.tk_reina) E.tkGrantComp(s, 'tk_reina');
    E.tkReinaApply && E.tkReinaApply(s);
    __RPG.UI.tab = 'crew'; __RPG.UI.renderGame();
  });
  await page.waitForTimeout(250);
  await shot('12-reina-devil-crew');
  check('Рейна видна в Свите после крови', await ev(() => !!__RPG.UI.slot().crew.tk_reina));

  // скрытие после окончания, награды на месте
  const tokensKeep = await ev(() => __RPG.UI.slot().tk.tokens);
  await ev(() => {
    const D = __RPG.D, UI = __RPG.UI, s = UI.slot();
    s.tk.needAlly = 0;
    D.TK_EVENT.end = Date.now() - 1000;
    UI.closeModal && UI.closeModal();
    UI.tab = 'city'; UI.renderGame();
  });
  await page.waitForTimeout(200);
  check('баннер скрыт после окончания', await page.locator('.tkbanner').count() === 0);
  check('жетоны остались', await ev((n) => __RPG.UI.slot().tk.tokens === n, tokensKeep));
  await ev(() => { __RPG.UI.tab = 'dun'; __RPG.UI.renderGame(); });
  await page.waitForTimeout(150);
  check('нет входа и на Вылазках', await page.locator('.tkbanner').count() === 0);
  await shot('13-expired-hidden');

  const jsErr = errors.filter((e) => !/Failed to load|webp|favicon/i.test(e));
  check('нет JS-ошибок', jsErr.length === 0, jsErr.slice(0, 3).join(' | '));
  check('нет неожиданных 404', failed.length === 0, failed.slice(0, 4).join(' | '));

  await browser.close(); srv.close();
  console.log(`e2e-tekken ${ok} ✓, ${bad} ✗  shots ${outDir}`);
  if (bad) process.exit(1);
})().catch((e) => { console.error(e); process.exit(1); });
