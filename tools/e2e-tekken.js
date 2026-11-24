/* E2E v2.29 коллаба «Железный Кулак»: вход, глава, бой, жетоны, магазин, выбор, скрытие после окончания.
   Скриншоты — /workspace/shots-tekken/sel/  (444×986) */
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path');
const { serve } = require('./serve.js');
const outDir = process.env.TK_SHOTS || '/workspace/shots-tekken/sel';
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

  // выбор и его сохранение
  await ev(() => {
    const s = __RPG.UI.slot(), D = __RPG.D;
    s.tk.story = D.TK_CH.filter((c) => c.i < 10).map((c) => c.id);
    __RPG.UI.tkOpen('story');
  });
  await page.waitForTimeout(200);
  await click('[data-act="tkPlay"][data-id="tk11_choice"]');
  const vn11 = await playVn();
  if (vn11 !== 'choice') await shot('08-choice-miss');
  await page.waitForSelector('#schoice.on .choice', { timeout: 8000 });
  await shot('08-choice');
  const labels = await ev(() => [...document.querySelectorAll('.choice')].map((e) => e.textContent));
  check('четыре варианта выбора', labels.length >= 4, labels.join(' | '));
  const kaz = page.locator('.choice').filter({ hasText: /Кадзуи/i });
  if (await kaz.count()) await kaz.first().click();
  else await page.locator('.choice').nth(1).click();
  await playVn();
  await page.waitForTimeout(400);
  const side = await ev(() => __RPG.UI.slot().tk.flags.tk_side);
  check('выбор сохранён (kazuya)', side === 'kazuya', String(side));
  const side2 = await ev(() => { __RPG.UI.save(true); return __RPG.UI.slot().tk.flags.tk_side; });
  check('выбор держится в сохранении', side2 === 'kazuya');

  // скрытие после окончания, награды на месте
  const tokensKeep = await ev(() => __RPG.UI.slot().tk.tokens);
  await ev(() => {
    const D = __RPG.D, UI = __RPG.UI;
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
  await shot('09-expired-hidden');

  const jsErr = errors.filter((e) => !/Failed to load|webp|favicon/i.test(e));
  check('нет JS-ошибок', jsErr.length === 0, jsErr.slice(0, 3).join(' | '));
  check('нет неожиданных 404', failed.length === 0, failed.slice(0, 4).join(' | '));

  await browser.close(); srv.close();
  console.log(`e2e-tekken ${ok} ✓, ${bad} ✗  shots ${outDir}`);
  if (bad) process.exit(1);
})().catch((e) => { console.error(e); process.exit(1); });
