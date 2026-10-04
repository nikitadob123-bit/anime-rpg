/* Скриншоты и проверка горизонтального переполнения всех основных экранов (v2.6.0 редизайн).
   node tools/ui-shots.js <url> <префикс> [WxH[@DPR]=444x986@2.75] ; SHOTS=папка (по умолчанию /workspace/shots) ; NOSHOT=1 — только проверки */
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path');
const url = process.argv[2] || 'http://127.0.0.1:8802/', tag = process.argv[3] || 'ui', spec = process.argv[4] || '444x986@2.75';
const [VW, VH] = spec.split('@')[0].split('x').map(Number), DPR = +(spec.split('@')[1] || 2);
const out = process.env.SHOTS || '/workspace/shots'; fs.mkdirSync(out, { recursive: true });
let ok = 0, bad = 0; const check = (n, c, x) => { c ? ok++ : bad++; console.log(c ? '  ✓' : '  ✗', n, c ? '' : (x || '')); };
(async () => {
  const exe = ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find((p) => fs.existsSync(p));
  const b = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: DPR, isMobile: true, hasTouch: true, serviceWorkers: 'block', locale: 'ru-RU' });
  const page = await ctx.newPage(); const errs = [];
  page.on('console', (m) => m.type() === 'error' && errs.push(m.text())); page.on('pageerror', (e) => errs.push(e.message));
  const ev = (f, a) => page.evaluate(f, a);
  const click = async (sel) => { const l = page.locator(sel).first(); await l.waitFor({ state: 'visible', timeout: 8000 }); await l.click(); await page.waitForTimeout(80); };
  const act = (a, x) => click(`[data-act="${a}"]${x || ''}`);
  const shot = async (name, wait) => { console.log('  ·', name); await page.waitForTimeout(wait || 700); if (!process.env.NOSHOT) await page.screenshot({ path: path.join(out, `${tag}-${name}.jpg`), type: 'jpeg', quality: 86, scale: 'css' }); };
  const over = (name) => ev(() => { const W = innerWidth, r = []; if (document.documentElement.scrollWidth > W + 1) r.push('doc ' + document.documentElement.scrollWidth); document.querySelectorAll('#view,.content,.screen,.crbody,.mbox,#modal,.hub,.battle,.dlg').forEach((e) => { if (e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflowX !== 'auto') r.push((e.className || e.id) + ' ' + e.scrollWidth + '>' + e.clientWidth); }); document.querySelectorAll('.content *,.screen *,.mbox *,.battle *,.dlg *').forEach((e) => { const q = e.getBoundingClientRect(); if (q.width && (q.right > W + 1 || q.left < -1) && !e.closest('.sil,.bg,.hubcg,.lira,.vact,.vstage,.tgraph,.skgrid,[style*="overflow"],.por,.flt,.fxl')) { if (r.length < 6) r.push((e.tagName + '.' + e.className).slice(0, 40) + ' ' + Math.round(q.left) + '..' + Math.round(q.right)); } }); return r; }).then((r) => check('нет горизонтального переполнения: ' + name, r.length === 0, JSON.stringify(r)));
  await page.goto(url, { waitUntil: 'load' }); await page.waitForTimeout(2200);
  await shot('title'); await over('титул');
  await act('newProfile'); await shot('newprofile'); await page.fill('#npNick', 'Проверка'); await act('npAv', '[data-i="3"]'); await act('npCreate');
  await shot('slots'); await over('слоты');
  await act('newHero', '[data-i="0"]'); await page.fill('#crName', 'Арата'); await shot('create'); await over('создание 1'); await act('crNext');
  await shot('create2'); await over('создание 2'); await act('crRaceSet', '[data-id="o_street"]'); await act('crNext'); await act('crUniq', '[data-id="shadowdance"]'); await shot('create3'); await over('создание 3'); await act('crNext'); await act('crNext');
  await act('crProf', '[data-id="smith"]'); await act('crProf', '[data-id="miner"]'); await act('crNext'); await shot('create-final'); await over('создание финал'); await act('crFinish');
  await click('#cfOk'); await page.waitForSelector('#story', { timeout: 8000 });
  for (let g = 0; g < 4; g++) { await page.locator('#dlg').click({ force: true, timeout: 400 }).catch(() => {}); await page.waitForTimeout(500); }
  await shot('vn', 1500);
  for (let g = 0; g < 400 && await page.locator('#story').count(); g++) { const sk = page.locator('#sSkip'); if (await sk.count()) await sk.click().catch(() => {}); if (await page.locator('.schoice.on .choice').count()) await page.locator('.schoice.on .choice').first().click().catch(() => {}); else await page.locator('#dlg').click({ force: true, timeout: 300 }).catch(() => {}); await page.waitForTimeout(60); }
  await page.waitForTimeout(500); if (await page.locator('#modal.on').count()) { await shot('modal'); await ev(() => __RPG.UI.closeModal()); }
  await ev(() => { const s = __RPG.UI.slot(); s.hero.level = 12; s.hero.gold = 5000; __RPG.UI.refresh(); });
  const tabs = ['city', 'story', 'dun', 'hero', 'skills', 'crew', 'hearts', 'prof', 'inv', 'set'];
  for (const t of tabs) { await click(`#nav button[data-t="${t}"]`); await shot('tab-' + t, 900); await over('вкладка ' + t); }
  await click('#nav button[data-t="city"]'); await act('shop').catch(() => {}); await shot('modal-shop', 600); await over('модалка: лавка'); await ev(() => __RPG.UI.closeModal());
  const fonts = await ev(() => ({ r: document.fonts.check('20px "Ruslan Display"'), p: document.fonts.check('bold 16px "Philosopher"') })); check('шрифты Ruslan Display / Philosopher загружены', fonts.r && fonts.p, JSON.stringify(fonts));
  await click('#nav button[data-t="hero"]'); await page.waitForTimeout(300); if (await page.locator('[data-act="toggleSubs"]').count()) { await act('toggleSubs'); await shot('hero-subs'); await over('герой: субстаты'); }
  await ev(() => { __RPG.UI.vnTest = __RPG.UI.playLines([['bg', 'ruins'], ['i', 'Государь, мы ждали вас всю ночь.', 'n'], ['h', 'Я не собираюсь вас развоплощать.', 'h']], { replay: true }); }).catch((e) => console.log('vn', e.message));
  await page.waitForSelector('#story', { timeout: 5000 }).catch(() => {}); await page.waitForTimeout(1500); await page.locator('#dlg').click({ force: true, timeout: 400 }).catch(() => {}); await page.waitForTimeout(500); await page.locator('#dlg').click({ force: true, timeout: 400 }).catch(() => {});
  await shot('vn-dialog', 1600); await ev(() => { const l = document.querySelector('#vlog'); }).catch(() => {}); await act('vLog').catch(() => {}); await shot('vn-log', 500); await ev(() => { __RPG.UI.vLog(); });
  for (let g = 0; g < 30 && await page.locator('#story').count(); g++) { await ev(() => { __RPG.UI.sSkip && !document.querySelector('#sSkip.on') && __RPG.UI.sSkip(); }); await page.waitForTimeout(250); }
  await page.waitForTimeout(600);
  await click('#nav button[data-t="dun"]'); await act('dunOpen', '[data-id="mill"]'); await shot('prep'); await over('подготовка вылазки'); await act('dunGo');
  await page.waitForTimeout(400); for (let g = 0; g < 200 && await page.locator('#story').count(); g++) { const sk = page.locator('#sSkip'); if (await sk.count()) await sk.click().catch(() => {}); await page.locator('#dlg').click({ force: true, timeout: 300 }).catch(() => {}); await page.waitForTimeout(60); }
  await page.waitForTimeout(500);
  if (await page.locator('[data-act="runNext"]').count()) { await act('runNext'); await page.waitForSelector('#battle', { timeout: 6000 }).catch(() => {}); await page.waitForTimeout(900); await shot('battle'); await over('бой'); await act('bSel', '.foe').catch(() => {}); await act('bBasic').catch(() => {}); await page.waitForTimeout(500); await shot('battle-hit', 400); }
  else console.log('  (нет runNext)');
  console.log('errs', JSON.stringify(errs.slice(0, 5))); check('нет ошибок консоли', errs.length === 0, JSON.stringify(errs.slice(0, 3)));
  console.log(`ui-shots ${spec}: ${ok} ✓, ${bad} ✗`); await b.close(); process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
