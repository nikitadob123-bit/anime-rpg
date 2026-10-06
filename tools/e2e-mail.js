/* E2E почты: Xiaomi 12T (444×986 @2.75). Онлайн → письмо приходит, бейдж, «Забрать» даёт золото один раз, перезагрузка не дублирует;
   новое письмо с «сервера»; офлайн (mail/* недоступен, сеть выключена) → игра работает, видна подсказка.
   Запуск: node tools/e2e-mail.js [baseUrl]. Скриншоты — $SHOTS или /workspace/shots/v290-mail-*.jpg (≤1200 px по высоте). */
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { serve } = require('./serve.js');
const outDir = process.env.SHOTS || '/workspace/shots'; fs.mkdirSync(outDir, { recursive: true });
let ok = 0, bad = 0; const check = (n, c, extra) => { if (c) { ok++; console.log('  ✓', n, extra || ''); } else { bad++; console.log('  ✗', n, extra || ''); } };
(async () => {
  let srv = null, url = process.argv[2];
  if (!url) { srv = await serve(0); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
  const exe = process.env.CHROME_PATH || ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find((p) => fs.existsSync(p));
  const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 444, height: 986 }, deviceScaleFactor: 2.75, isMobile: true, hasTouch: true, locale: 'ru-RU', timezoneId: 'Europe/Minsk' });
  const page = await ctx.newPage(); const errors = [], mailReqs = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/ERR_INTERNET_DISCONNECTED|ERR_FAILED|Failed to load resource/.test(m.text())) errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('request', (r) => { if (/\/mail\//.test(r.url())) mailReqs.push(r.url()); });
  const shot = async (n) => {   // снимок в полном разрешении телефона → уменьшаем до 1200 px по высоте
    const raw = path.join(outDir, '.raw-' + n + '.png'), out = path.join(outDir, 'v290-mail-' + n + '.jpg');
    await page.screenshot({ path: raw });
    execFileSync('python3', ['-c', `from PIL import Image\nim=Image.open(${JSON.stringify(raw)}).convert('RGB')\nh=min(1200,im.height)\nim.resize((round(im.width*h/im.height),h),Image.LANCZOS).save(${JSON.stringify(out)},quality=84)`]);
    fs.unlinkSync(raw);
  };
  const ev = (f, a) => page.evaluate(f, a);
  const gold = () => ev(() => __RPG.UI.slot().gold);
  const mail = () => ev(() => JSON.parse(JSON.stringify(__RPG.UI.slot().mail)));
  const badge = () => ev(() => { const b = document.querySelector('.mailbtn .nb'); return b ? b.textContent : ''; });
  async function closeStory() { let g = 400; while (g-- > 0 && await page.locator('#story').count()) { if (await page.locator('.schoice.on .choice').count()) { await page.locator('.schoice.on .choice').first().click(); continue; } const sk = page.locator('#sSkip'); if (await sk.count() && !(await sk.evaluate((e) => e.classList.contains('on')))) await sk.click().catch(() => {}); await page.waitForTimeout(100); await page.locator('#dlg').click({ force: true, timeout: 600 }).catch(() => {}); } if (await page.locator('#modal.on').count()) await ev(() => __RPG.UI.closeModal()); }
  // готовый герой после пролога и глав 1–3 (сюжет не проигрываем — его проверяют e2e.js / e2e-story.js)
  async function enter(pid) {
    await ev(async (pid) => {
      const { UI, S, E, story: ST } = __RPG; let p;
      if (pid) p = S.load(pid).p; else {
        p = S.newProfile('Почта', '🐉'); const s = E.newSlot({ name: 'Кайрон', race: 'o_street', uniq: 'shadowdance', prof1: 'smith', prof2: 'miner', now: Date.now() }); s.hero.profLocked = true; s.tut = { guide: 1 };
        p.slots[0] = s; ['prologue'].concat(ST.sceneIds(1), ST.sceneIds(2), ST.sceneIds(3), ST.auxIds(3)).forEach((id) => E.finishScene(s, id)); s.story.flags.prologue_done = 1; ['mill', 'cathedral', 'spire'].forEach((d) => { s.prog.cleared[d] = 1; }); s.hero.level = 12; s.gold = 1000; S.save(p);
      }
      UI.p = p; p.active = 0; UI.enterGame();
    }, pid || null);
    await page.waitForTimeout(1200); await closeStory(); await page.waitForTimeout(300);
    await ev(() => { if (__RPG.UI.tab !== 'city') { __RPG.UI.tab = 'city'; } __RPG.UI.refresh(); });
  }

  await page.goto(url, { waitUntil: 'load' }); await page.waitForTimeout(1500);
  console.log('E2E-mail', url);
  check('лента запрошена при запуске (с ?t= против кэша)', mailReqs.some((u) => /mail\/inbox\.json\?t=\d+/.test(u)), mailReqs[0] || '');
  check('лента сохранена в кэш (письма для офлайна)', await ev(() => __RPG.UI.mailFeed().letters.length) >= 1);
  await enter(); await page.waitForTimeout(600);
  let m = await mail();
  const pid = await ev(() => __RPG.UI.p.id);
  check('письмо Администрации пришло', m.list.some((x) => x.id === 'launch-2026-10' && x.from === 'Администрация'));
  check('приветствие игры (офлайн-письмо) пришло', m.list.some((x) => x.id === 'loc-welcome'));
  check('бейдж на конверте в шапке', await badge() === String(m.list.length), 'badge=' + await badge());
  check('бейдж на «Ещё»', await ev(() => !!document.querySelector('#nav .nav-more .nb')));
  check('плашка «Новые письма» в Лагере', await page.locator('.mailhint').count() === 1);
  check('конверт рядом с золотом, крупная цель (≥40 px)', await ev(() => { const b = document.querySelector('.mailbtn').getBoundingClientRect(), g = document.querySelector('.gtop .gold').getBoundingClientRect(); return b.width >= 40 && b.height >= 40 && b.right <= g.left + 1 && Math.abs((b.top + b.bottom) / 2 - (g.top + g.bottom) / 2) < 12; }));
  await page.waitForTimeout(2600); await shot('header');   // тост «Новое письмо» успевает уйти
  // «Ещё» → строка «Почта» с бейджем
  await page.locator('#nav [data-act="navMore"]').click(); await page.waitForTimeout(300);
  check('«Почта» в меню «Ещё» с бейджем', await page.locator('#modal [data-t="mail"] .nb').count() === 1);
  await ev(() => __RPG.UI.closeModal());

  await page.locator('.mailbtn').click(); await page.waitForTimeout(700);
  check('вкладка «Почта» открыта', await ev(() => __RPG.UI.tab) === 'mail');
  check('в списке 2 письма, оба непрочитанные', await page.locator('.mrow.unread').count() === 2);
  check('есть «Забрать всё»', await page.locator('#btnMailAll').count() === 1);
  check('строки писем — крупные (≥64 px)', await ev(() => [...document.querySelectorAll('.mrow')].every((r) => r.getBoundingClientRect().height >= 64)));
  check('без горизонтального переполнения', await ev(() => [...document.querySelectorAll('#view .content *')].every((e) => { const b = e.getBoundingClientRect(); return !b.width || (b.right <= innerWidth + 1 && b.left >= -1); })));
  await shot('list');

  const g0 = await gold();
  await page.locator('.mrow[data-id="launch-2026-10"]').click(); await page.waitForTimeout(500);
  check('письмо открыто в нижнем листе', await page.locator('#modal.on .mailsheet .mlbody').count() === 1);
  check('в письме видны подарки', await page.locator('#modal .mgift').count() >= 2);
  check('письмо прочитано, но бейдж держится, пока подарок не забран', await badge() === '2' && await ev(() => __RPG.M.find(__RPG.UI.slot(), 'launch-2026-10').read === 1), 'badge=' + await badge());
  await shot('letter');
  await page.locator('#btnMailClaim').click(); await page.waitForTimeout(1300);
  check('окно наград', await page.locator('#modal.on .mreward').count() === 1);
  const g1 = await gold();
  check('золото +300 ровно один раз', g1 === g0 + 300, g0 + ' → ' + g1);
  check('после «Забрать» бейдж уменьшился до 1', await badge() === '1', 'badge=' + await badge());
  check('зелья лечения +3', await ev(() => __RPG.UI.slot().cons.pot_hp2) === 3);
  await shot('reward');
  await page.locator('#btnMailOk').click(); await page.waitForTimeout(300);
  check('повторно забрать нельзя', await ev(() => !__RPG.M.claim(__RPG.UI.slot(), 'launch-2026-10').ok) && await gold() === g1);
  await ev(() => __RPG.UI.mailFetch(true)); await page.waitForTimeout(1200);
  m = await mail();
  check('повторная загрузка ленты не дублирует', m.list.filter((x) => x.id === 'launch-2026-10').length === 1 && await gold() === g1);
  check('строка письма: «✔ Получено»', await page.locator('.mrow[data-id="launch-2026-10"] .mst.ok').count() === 1);

  // перезагрузка страницы: письма и выданные подарки на месте, без дублей
  await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(1500); await enter(pid); await page.waitForTimeout(800);
  m = await mail();
  check('после перезагрузки золото то же', await gold() === g1, String(await gold()));
  check('после перезагрузки писем столько же, подарок отмечен', m.list.length === 2 && m.list.find((x) => x.id === 'launch-2026-10').claimed === 1 && !!m.claimed['launch-2026-10']);

  // новое письмо на «сервере»
  await page.route('**/mail/inbox.json*', async (r) => { const res = await r.fetch(); const j = await res.json(); j.letters.push({ id: 'e2e-gift', from: 'Ильвара', title: 'Тестовый дар', body: 'Для {name}.', date: '2026-10-06', expires: '2099-01-01', gifts: { gold: 777, mats: { ore_fe: 2 }, gear: [{ base: 'ring', rarity: 'rare' }] } }); r.fulfill({ response: res, json: j }); });
  await ev(() => __RPG.UI.mailFetch(true)); await page.waitForTimeout(1200);
  m = await mail();
  check('новое письмо с сервера доставлено', m.list[0] && m.list[0].id === 'e2e-gift');
  check('тост «Новое письмо»', await ev(() => [...document.querySelectorAll('.toast')].some((t) => /Новое письмо/.test(t.textContent))));
  const inv0 = await ev(() => __RPG.UI.slot().inv.length), g2 = await gold();
  await ev(() => { __RPG.UI.tab = 'mail'; __RPG.UI.refresh(); }); await page.waitForTimeout(200);
  await page.locator('#btnMailAll').click(); await page.waitForTimeout(1200);
  check('«Забрать всё»: 777 + 100 (приветствие), кольцо в сумке', await gold() === g2 + 877 && await ev(() => __RPG.UI.slot().inv.length) === inv0 + 1, (await gold() - g2) + '');
  await ev(() => __RPG.UI.closeModal());
  await ev(() => __RPG.UI.mailFetch(true)); await page.waitForTimeout(900);
  check('после ещё одной загрузки — без дублей', (await mail()).list.length === 3 && await gold() === g2 + 877);
  await page.unroute('**/mail/inbox.json*');

  // офлайн: сервер почты недоступен
  await page.route('**/mail/**', (r) => r.abort());
  await ev(() => __RPG.UI.mailFetch(true)); await page.waitForTimeout(800);
  check('сервер недоступен → письма на месте, подсказка', (await mail()).list.length === 3 && await page.locator('.mnet.off').count() === 1);
  await ctx.setOffline(true); await page.waitForTimeout(500);
  await ev(() => __RPG.UI.mailFetch(true)); await page.waitForTimeout(500);
  check('нет сети → «Нет связи — новые письма придут…»', await ev(() => (document.querySelector('.mnet.off') || {}).textContent || '').then((t) => /Нет связи — новые письма придут, когда появится интернет/.test(t)));
  await shot('offline');
  for (const t of ['city', 'hero', 'crew', 'mail']) { await ev((t) => { __RPG.UI.tab = t; __RPG.UI.renderGame(); }, t); await page.waitForTimeout(150); }
  check('офлайн: вкладки работают', await ev(() => __RPG.UI.tab) === 'mail' && await page.locator('.mrow').count() === 3);
  await page.locator('.mrow').first().click(); await page.waitForTimeout(300);
  check('офлайн: письмо открывается', await page.locator('#modal.on .mlbody').count() === 1);
  check('в тексте письма подставлено имя героя', await ev(() => document.querySelector('#modal .mlbody').textContent.includes('Кайрон')));
  await ev(() => __RPG.UI.closeModal());
  await ctx.setOffline(false); await page.unroute('**/mail/**');
  check('нет ошибок JS', errors.length === 0, errors.slice(0, 3).join(' | '));

  console.log(`\nE2E-mail: ${ok} ✓, ${bad} ✗`);
  await browser.close(); if (srv) srv.close();
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
