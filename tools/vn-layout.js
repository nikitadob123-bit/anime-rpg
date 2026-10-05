/* Раскладка VN: воспроизводит реальную сцену (гл. 1, ch1_b: Арата + Ильвара + Грак) и произвольные 1–3 актёра; снимает скриншоты и метрики лиц.
   node tools/vn-layout.js <url> <префикс-файлов> [WxH[@DPR]=400x880@2] ; SHOTS=папка */
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path');
const url = process.argv[2] || 'http://127.0.0.1:8802/', tag = process.argv[3] || 'x', [VW, VH] = (process.argv[4] || '400x880').split('@')[0].split('x').map(Number), DPR = +((process.argv[4] || '').split('@')[1] || 2);
const out = process.env.SHOTS || '/workspace/shots'; fs.mkdirSync(out, { recursive: true });
(async () => {
  const exe = ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find((p) => fs.existsSync(p));
  const b = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: DPR, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  const page = await ctx.newPage(); const errs = [], bad = [];
  page.on('console', (m) => m.type() === 'error' && errs.push(m.text())); page.on('pageerror', (e) => errs.push(e.message));
  const ev = (f, a) => page.evaluate(f, a);
  const navSel = async (sel) => { const m = /data-t="(\w+)"/.exec(sel); if (!m) return sel; const l = page.locator(sel).first(); if (await l.count() && /\bnavx\b/.test((await l.getAttribute('class')) || '')) { await page.locator('#nav [data-act="navMore"]').click(); await page.waitForTimeout(300); return `#modal [data-act="tab"][data-t="${m[1]}"]`; } return sel; };   // v2.7.0: редкие вкладки — в меню «Ещё»
  const click = async (sel) => { sel = await navSel(sel); const l = page.locator(sel).first(); await l.waitFor({ state: 'visible', timeout: 8000 }); await l.click(); await page.waitForTimeout(80); };
  const act = (a, x) => click(`[data-act="${a}"]${x || ''}`);
  await page.goto(url, { waitUntil: 'load' }); await page.waitForTimeout(2000);
  await act('newProfile'); await page.fill('#npNick', 'Проверка'); await act('npAv', '[data-i="3"]'); await act('npCreate');
  await act('newHero', '[data-i="0"]'); await page.fill('#crName', 'Арата'); await act('crNext');
  await act('crRaceSet', '[data-id="o_street"]'); await act('crNext'); await act('crUniq', '[data-id="shadowdance"]'); await act('crNext'); await act('crNext');
  await act('crProf', '[data-id="smith"]'); await act('crProf', '[data-id="miner"]'); await act('crNext'); await act('crFinish');
  await click('#cfOk'); await page.waitForSelector('#story', { timeout: 8000 });
  for (let g = 0; g < 400 && await page.locator('#story').count(); g++) { const sk = page.locator('#sSkip'); if (await sk.count()) await sk.click().catch(() => {}); if (await page.locator('.schoice.on .choice').count()) await page.locator('.schoice.on .choice').first().click().catch(() => {}); else await page.locator('#dlg').click({ force: true, timeout: 300 }).catch(() => {}); await page.waitForTimeout(60); }
  await page.waitForTimeout(400); if (await page.locator('#modal.on').count()) await ev(() => __RPG.UI.closeModal());
  const faces = () => ev(() => { const M = __RPG.UI.manifest; return Array.from(document.querySelectorAll('.vact')).map((a) => { const im = Array.from(a.querySelectorAll('img.vsp')).pop(); if (!im) return null; const f = im.getAttribute('src').split('/').pop(), d = M.dim[f], r = im.getBoundingClientRect(), k = r.width / d[0], cs = getComputedStyle(a); const nw = im.naturalWidth, nh = im.naturalHeight; return { ar: +((r.width / r.height) / (nw / nh)).toFixed(4), up: +(r.width * devicePixelRatio / nw).toFixed(2), f, talk: a.classList.contains('talk'), z: cs.zIndex, face: { cx: +(r.left + d[3] * k).toFixed(1), cy: +(r.top + d[4] * k).toFixed(1), w: +(d[5] * k).toFixed(1) }, box: { l: +r.left.toFixed(0), r: +r.right.toFixed(0), t: +r.top.toFixed(0) }, op: cs.opacity }; }).filter(Boolean); });
  const shot = async (name) => { await page.waitForTimeout(1300); const m = await faces(); await page.screenshot({ path: path.join(out, `${tag}-${name}.jpg`), type: 'jpeg', quality: 84, scale: 'css' }); console.log(name, JSON.stringify(m.map((x) => [x.f.replace('.webp', ''), x.talk ? 'talk' : '', x.face.cx, x.face.cy, x.face.w, x.box.l, x.box.r, 'ar=' + x.ar, 'up=' + x.up]))); m.forEach((x) => { if (Math.abs(x.ar - 1) > 0.01) { bad.push(name + ' ' + x.f + ' rendered/natural aspect=' + x.ar); } if (x.up > 4.5) bad.push(name + ' ' + x.f + ' апскейл ×' + x.up); }); return m; };
  // 1) реальная сцена ch1_b до реплики «Я не собираюсь вас развоплощать.»
  await ev(() => { const sc = __RPG.D.SCENES.ch1_b; const i = sc.lines.findIndex((l) => /развоплощать/.test(l[1] || '')); __RPG.UI.vnTest = __RPG.UI.playLines(sc.lines.slice(0, i + 1), { bg: sc.bg, replay: true }); });
  await page.waitForSelector('#story');
  for (let g = 0; g < 60; g++) { const t = await ev(() => (document.querySelector('#stxt') || {}).textContent || ''); if (/развоплощать/.test(t)) break; await page.locator('#dlg').click({ force: true, timeout: 500 }).catch(() => {}); await page.waitForTimeout(450); }
  await shot('scene3');
  await ev(() => { __RPG.UI.sSkip && __RPG.UI.sSkip(); }); await page.waitForTimeout(900);
  // 2) два актёра: герой + генерал; 3) три: герой + генерал + подчинённый; 4) герой один; 5) пустой фон (без актёров)
  const run = async (name, L, n) => { await ev((L) => { __RPG.UI.vnTest = __RPG.UI.playLines(L, { bg: 'ruins', replay: true }); }, L); await page.waitForSelector('#story'); for (let g = 0; g < 14; g++) { if ((await page.locator('.vact.in').count()) >= n) break; await page.locator('#dlg').click({ force: true, timeout: 400 }).catch(() => {}); await page.waitForTimeout(500); } const m = await shot(name); await ev(() => { __RPG.UI.sSkip && __RPG.UI.sSkip(); }); await page.waitForTimeout(800); return m; };
  await run('hero-only', [['bg', 'ruins'], ['h', 'Тише.', 'n']], 1);
  await run('two', [['bg', 'ruins'], ['i', 'Государь.', 'n'], ['h', 'Слушаю.', 'h']], 2);
  await run('three', [['bg', 'ruins'], ['g', 'Эй, не бейте!', 'a'], ['i', 'Государь.', 'n'], ['h', 'Я не собираюсь вас развоплощать.', 'h']], 3);
  await run('three-grak', [['bg', 'ruins'], ['i', 'Государь.', 'n'], ['h', 'Слушаю.', 'h'], ['g', 'Мы сдаёмся!', 'a']], 3);
  await run('demon-solo', [['bg', 'ruins'], ['h', 'Преклонитесь.', 'm']], 1);
  await run('demon-two', [['bg', 'ruins'], ['i', 'Государь.', 'n'], ['h', 'Я не собираюсь вас развоплощать.', 'mh']], 2);
  await run('demon-three', [['bg', 'ruins'], ['g', 'Эй, не бейте!', 'a'], ['i', 'Государь.', 'n'], ['h', 'Довольно.', 'ma']], 3);
  for (const mo of ['n', 'a', 'h', 'd', 's', 'u']) await run('mood-' + mo, [['bg', 'ruins'], ['i', 'Государь.', 'n'], ['h', 'Реплика.', mo]], 2);
  await ev(() => { __RPG.UI.vnTest = __RPG.UI.playLines([['bg', 'void_dusk'], ['n', 'Над руинами тихо.']], { replay: true }); }); await page.waitForSelector('#story'); await page.waitForTimeout(1500);
  const bg = await ev(() => ({ bg: getComputedStyle(document.querySelector('#sbg')).backgroundImage.slice(0, 60), cls: document.querySelector('#sbg').className, ring: !!document.querySelector('#story .lira'), ringW: (document.querySelector('#story .lira') || { getBoundingClientRect: () => ({ width: 0 }) }).getBoundingClientRect().width }));
  console.log('empty-bg', JSON.stringify(bg)); await page.screenshot({ path: path.join(out, `${tag}-empty.jpg`), type: 'jpeg', quality: 84, scale: 'css' });
  console.log('errs', JSON.stringify(errs)); console.log(bad.length ? 'FAIL ' + JSON.stringify(bad) : 'OK: соотношение сторон отрисовки == натуральному (±1%) во всех сценах'); await b.close(); if (bad.length || errs.length) process.exit(1);
})().catch((e) => { console.error(e); process.exit(2); });
