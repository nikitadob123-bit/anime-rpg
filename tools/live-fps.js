/* fps интерфейса (титул с сигилем, главная с частицами, смена вкладок, диалог VN) на DPR3 + CPU 4×. node tools/live-fps.js [url] */
const { chromium } = require('playwright-core'); const fs = require('fs');
const url = process.argv[2] || 'https://nikitadob123-bit.github.io/anime-rpg/';
let ok = 0, bad = 0; const check = (n, c, x) => { c ? ok++ : bad++; console.log(c ? '  ✓' : '  ✗', n, x || ''); };
(async () => {
  const exe = ['/usr/bin/google-chrome', '/usr/bin/chromium'].find((p) => fs.existsSync(p));
  const b = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 444, height: 986 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  const page = await ctx.newPage(); const cdp = await ctx.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const ev = (f, a) => page.evaluate(f, a);
  const navSel = async (sel) => { const m = /data-t="(\w+)"/.exec(sel); if (!m) return sel; const l = page.locator(sel).first(); if (await l.count() && /\bnavx\b/.test((await l.getAttribute('class')) || '')) { await page.locator('#nav [data-act="navMore"]').click(); await page.waitForTimeout(300); return `#modal [data-act="tab"][data-t="${m[1]}"]`; } return sel; };   // v2.7.0: редкие вкладки — в меню «Ещё»
  const click = async (sel) => { sel = await navSel(sel); const l = page.locator(sel).first(); await l.waitFor({ state: 'visible', timeout: 8000 }); await l.click(); await page.waitForTimeout(80); };
  const act = (a, x) => click(`[data-act="${a}"]${x || ''}`);
  const fps = (ms, during) => ev(async ([ms]) => new Promise((res) => { const t = []; let last = performance.now(), n = 0, long = 0; const t0 = last; const f = (ts) => { t.push(ts - last); last = ts; if (ts - t0 < ms) requestAnimationFrame(f); else { t.shift(); t.sort((a, b) => a - b); res({ fps: +(1000 / (t.reduce((a, c) => a + c, 0) / t.length)).toFixed(1), p95: +t[Math.floor(t.length * 0.95)].toFixed(1) }); } }; requestAnimationFrame(f); }), [ms]);
  await page.goto(url, { waitUntil: 'load' }); await page.waitForTimeout(2500);
  let r = await fps(3000); check('титул (сигиль + звёзды): fps ≥ 50', r.fps >= 50, JSON.stringify(r));
  await act('newProfile'); await page.fill('#npNick', 'Проверка'); await act('npAv', '[data-i="3"]'); await act('npCreate'); await page.waitForTimeout(800);
  await act('newHero', '[data-i="0"]'); await page.fill('#crName', 'Арата'); await act('crNext'); await act('crRaceSet', '[data-id="o_street"]'); await act('crNext'); await act('crUniq', '[data-id="shadowdance"]'); await act('crNext'); await act('crNext'); await act('crProf', '[data-id="smith"]'); await act('crProf', '[data-id="miner"]'); await act('crNext'); await act('crFinish'); await click('#cfOk'); await page.waitForSelector('#story', { timeout: 8000 });
  await page.waitForTimeout(1500); r = await fps(3000); check('диалог VN (панель с орнаментами): fps ≥ 50', r.fps >= 50, JSON.stringify(r));
  for (let g = 0; g < 400 && await page.locator('#story').count(); g++) { await ev(() => { __RPG.UI.sSkip && !document.querySelector('#sSkip.on') && __RPG.UI.sSkip(); }); if (await page.locator('.schoice.on .choice').count()) await page.locator('.schoice.on .choice').first().click().catch(() => {}); else await page.locator('#dlg').click({ force: true, timeout: 300 }).catch(() => {}); await page.waitForTimeout(60); }
  await page.waitForTimeout(600); if (await page.locator('#modal.on').count()) await ev(() => __RPG.UI.closeModal());
  await click('#nav button[data-t="city"]'); await page.waitForTimeout(800); r = await fps(3000); check('главная (кольцо Нимба + частицы): fps ≥ 50', r.fps >= 50, JSON.stringify(r));
  const tabs = ['story', 'dun', 'hero', 'skills', 'crew', 'hearts', 'inv', 'set', 'city']; const p = fps(5000); for (const t of tabs) { await click(`#nav button[data-t="${t}"]`).catch(() => {}); await page.waitForTimeout(450); } r = await p; check('переключение 9 вкладок подряд: fps ≥ 45', r.fps >= 45, JSON.stringify(r));
  console.log(`live-fps: ${ok} ✓, ${bad} ✗`); await b.close(); process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
