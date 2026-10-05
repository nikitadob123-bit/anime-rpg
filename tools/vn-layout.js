/* Раскладка VN: воспроизводит реальную сцену (гл. 1, ch1_b: Арата + Ильвара + Грак) и произвольные 1–3 актёра; снимает скриншоты и метрики лиц.
   node tools/vn-layout.js <url> <префикс-файлов> [WxH[@DPR]=400x880@2] ; SHOTS=папка */
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path');
const url = process.argv[2] || 'http://127.0.0.1:8802/', tag = process.argv[3] || 'x', [VW, VH] = (process.argv[4] || '400x880').split('@')[0].split('x').map(Number), DPR = +((process.argv[4] || '').split('@')[1] || 2);
const out = process.env.SHOTS || '/workspace/shots'; fs.mkdirSync(out, { recursive: true });
const HEAD = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'head-metrics.json'), 'utf8'));   // разметка глаз/подбородка по спрайтам (tools/measure-heads.py)
{ const med = (a) => { a = a.slice().sort((x, y) => x - y); const m = a.length >> 1; return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; }; HEAD._ec = {}; for (const sx of ['m', 'f']) HEAD._ec[sx] = med(Object.keys(HEAD).filter((k) => !k.startsWith('_') && HEAD[k].kind === 'adult' && HEAD[k].sex === sx && !HEAD[k].same).map((k) => HEAD[k].chin - HEAD[k].eye)); }
const LIM = { size: 0.15, eye: 6, overlap: 0.12 };   // допуски: разброс голов взрослых, линия глаз (css px), перекрытие лица чужой головой
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
  // ── головы: размер, линия глаз, перекрытие и обрез лиц в комбинациях персонажей ──
  const heads = () => ev((HEAD) => {
    const M = __RPG.UI.manifest, st = document.querySelector('#story'), sr = st.getBoundingClientRect(), dl = document.querySelector('#dlg').getBoundingClientRect(), top = document.querySelector('.vtop').getBoundingClientRect();
    const acts = Array.from(document.querySelectorAll('.vact.in'));
    return acts.map((a, i) => {
      const im = Array.from(a.querySelectorAll('img.vsp')).pop(); if (!im) return null;
      const f = im.getAttribute('src').split('/').pop(), d = M.dim[f], art = f.replace(/_(neutral|angry|happy|shy|sad|smirk|surprised|av)\.webp$/, ''), H = HEAD[art] || { eye: -1.2, chin: 2.8, kind: 'adult' }, Hs = (H.same && HEAD[H.same]) || H;
      const r = im.getBoundingClientRect(), k = r.width / d[0], fw = d[5] * k, cx = r.left + d[3] * k, ey = r.top + (d[4] + H.eye * d[5] / 10) * k, chin = r.top + (d[4] + H.chin * d[5] / 10) * k;
      const head = 0.5 * fw * (1 + (Hs.chin - Hs.eye) / HEAD._ec[Hs.sex || 'f']);   // «единица головы»: среднее ширины лица по каскаду и длины глаза→подбородок (к медиане своего пола)
      return { art, kind: H.kind, talk: a.classList.contains('talk'), z: (a.classList.contains('talk') ? 100 : 0) + i, head: +head.toFixed(1), ec: +(chin - ey).toFixed(1), eye: +ey.toFixed(1), cx: +cx.toFixed(1),
        face: [cx - 0.3 * fw, ey - 0.3 * fw, cx + 0.3 * fw, chin], hair: [cx - 0.55 * fw, ey - 0.9 * fw, cx + 0.55 * fw, chin + 0.1 * fw], vw: sr.width, dlgTop: dl.top, barB: top.bottom };
    }).filter(Boolean);
  }, HEAD);
  const inter = (a, b) => Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
  const spreadOf = (xs) => (xs.length > 1 ? Math.max(...xs) / Math.min(...xs) - 1 : 0);
  const report = [];
  const combo = async (name, L, n) => {
    await ev((L) => { __RPG.UI.vnTest = __RPG.UI.playLines(L, { bg: 'ruins', replay: true }); }, L); await page.waitForSelector('#story');
    for (let g = 0; g < 14; g++) { if ((await page.locator('.vact.in').count()) >= n) break; await page.locator('#dlg').click({ force: true, timeout: 400 }).catch(() => {}); await page.waitForTimeout(450); }
    await page.waitForTimeout(1400); const h = await heads(); await page.screenshot({ path: path.join(out, `${tag}-heads-${name}.jpg`), type: 'jpeg', quality: 80, scale: 'css' });
    const ad = h.filter((x) => x.kind === 'adult'), sAd = spreadOf(ad.map((x) => x.head)), sAll = spreadOf(h.map((x) => x.head)), eyeD = Math.max(...h.map((x) => x.eye)) - Math.min(...h.map((x) => x.eye));
    const fails = [];
    if (sAd > LIM.size) fails.push(`головы взрослых различаются на ${(sAd * 100).toFixed(0)}%`);
    if (h.length > 1 && eyeD > LIM.eye) fails.push(`линия глаз гуляет на ${eyeD.toFixed(0)}px`);
    h.forEach((x) => {
      const F = x.face, A = (F[2] - F[0]) * (F[3] - F[1]);
      if (F[0] < 0 || F[2] > x.vw || F[1] < x.barB || F[3] > x.dlgTop) fails.push(`${x.art}: лицо обрезано [${F.map((v) => v.toFixed(0))}]`);
      h.forEach((y) => { if (y !== x && y.z > x.z) { const o = inter(F, y.hair) / A; if (o > LIM.overlap) fails.push(`${x.art}: лицо закрыто ${y.art} на ${(o * 100).toFixed(0)}%`); } });
    });
    report.push({ name, sAd, sAll, eyeD, fails });
    console.log('heads', name, h.map((x) => `${x.art}${x.talk ? '*' : ''} head=${x.head} ec=${x.ec} eye=${x.eye} cx=${x.cx}`).join(' | '), `→ разброс взрослых ${(sAd * 100).toFixed(1)}%, всех ${(sAll * 100).toFixed(1)}%, глаза ±${eyeD.toFixed(1)}px`, fails.length ? 'FAIL ' + fails.join('; ') : 'ok');
    fails.forEach((f) => bad.push(name + ': ' + f));
    await ev(() => { __RPG.UI.sSkip && __RPG.UI.sSkip(); }); await page.waitForTimeout(800);
  };
  await combo('hero+gen1', [['bg', 'ruins'], ['h', 'Слушаю.', 'n'], ['i', 'Государь.', 'n']], 2);
  await combo('hero+gen1-heroTalk', [['bg', 'ruins'], ['i', 'Государь.', 'n'], ['h', 'Слушаю.', 'n']], 2);
  await combo('hero+sister+gen1', [['bg', 'ruins'], ['l', 'Братик!', 'n'], ['i', 'Тише.', 'n'], ['h', 'Кто ты?', 'd']], 3);
  await combo('hero+hero2+sister', [['bg', 'ruins'], ['h', 'Эй.', 'a'], ['l', 'Нет!', 'n'], ['t', 'Источник найден.', 'n']], 3);
  await combo('demon+grak+gen1', [['bg', 'ruins'], ['g', 'Эй, не бейте!', 'a'], ['i', 'Государь.', 'n'], ['h', 'Довольно.', 'ma']], 3);
  await combo('gen1+gen5+gen9', [['bg', 'ruins'], ['i', 'Сёстры.', 'n'], ['y', 'Ну?', 'n'], ['v', 'Тише.', 'n']], 3);
  await combo('gen2+gen7', [['bg', 'ruins'], ['m', 'Огонь!', 'n'], ['r', 'Вода.', 'n']], 2);
  await combo('hero+vesper+skril', [['bg', 'ruins'], ['z', 'Государь.', 'n'], ['k', 'Кости помнят.', 'n'], ['h', 'Вольно.', 'n']], 3);
  const mx = (k) => Math.max(...report.map((r) => r[k]));
  console.log(`HEADS SUMMARY: макс. разброс голов взрослых ${(mx('sAd') * 100).toFixed(1)}% (лимит ${LIM.size * 100}%), всех ${(mx('sAll') * 100).toFixed(1)}%, линия глаз до ${mx('eyeD').toFixed(1)}px; комбинаций с ошибками: ${report.filter((r) => r.fails.length).length}/${report.length}`);
  await ev(() => { __RPG.UI.vnTest = __RPG.UI.playLines([['bg', 'void_dusk'], ['n', 'Над руинами тихо.']], { replay: true }); }); await page.waitForSelector('#story'); await page.waitForTimeout(1500);
  const bg = await ev(() => ({ bg: getComputedStyle(document.querySelector('#sbg')).backgroundImage.slice(0, 60), cls: document.querySelector('#sbg').className, ring: !!document.querySelector('#story .lira:not([hidden])'), ringW: (document.querySelector('#story .lira') || { getBoundingClientRect: () => ({ width: 0 }) }).getBoundingClientRect().width }));
  console.log('empty-bg', JSON.stringify(bg)); if (bg.ring && bg.ringW > 0) bad.push('кольцо Нимба (.lira) нарисовано в сцене без [\'fx\',\'ring\']'); await page.screenshot({ path: path.join(out, `${tag}-empty.jpg`), type: 'jpeg', quality: 84, scale: 'css' });
  console.log('errs', JSON.stringify(errs)); console.log(bad.length ? 'FAIL ' + JSON.stringify(bad) : 'OK: соотношение сторон отрисовки == натуральному (±1%) во всех сценах'); await b.close(); if (bad.length || errs.length) process.exit(1);
})().catch((e) => { console.error(e); process.exit(2); });
