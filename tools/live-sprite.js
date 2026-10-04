/* Проверка спрайта героя в VN (400×880): одинаковый размер/позиция отрисованного спрайта во ВСЕХ эмоциях обеих форм (getBoundingClientRect), нет прыжков при кроссфейде,
   fps на DPR3 + CPU 4× при смене эмоций (один герой и герой+генерал), скриншоты /workspace/shots/fix2-*.jpg. node tools/live-sprite.js [url] */
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path');
const url = process.argv[2] || 'https://nikitadob123-bit.github.io/anime-rpg/';
const out = process.env.SHOTS || '/workspace/shots'; fs.mkdirSync(out, { recursive: true });
let ok = 0, bad = 0; const check = (n, c, x) => { c ? ok++ : bad++; console.log(c ? '  ✓' : '  ✗', n, x || ''); };
(async () => {
  const exe = process.env.CHROME_PATH || ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find((p) => fs.existsSync(p));
  const b = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 400, height: 880 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: 'ru-RU', timezoneId: 'Europe/Minsk' });
  const page = await ctx.newPage(); const errs = [], bad404 = [];
  page.on('console', (m) => m.type() === 'error' && errs.push(m.text())); page.on('pageerror', (e) => errs.push(e.message)); page.on('response', (r) => { if (r.status() >= 400) bad404.push(r.status() + ' ' + r.url()); });
  const ev = (f, a) => page.evaluate(f, a);
  const click = async (sel) => { const l = page.locator(sel).first(); await l.waitFor({ state: 'visible', timeout: 8000 }); await l.click(); await page.waitForTimeout(80); };
  const act = (a, x) => click(`[data-act="${a}"]${x || ''}`);
  await page.goto(url, { waitUntil: 'load' }); await page.waitForTimeout(2500);
  await act('newProfile'); await page.fill('#npNick', 'Проверка'); await act('npAv', '[data-i="3"]'); await act('npCreate');
  await act('newHero', '[data-i="0"]'); await page.fill('#crName', 'Арата'); await act('crNext');
  await act('crRaceSet', '[data-id="o_street"]'); await act('crNext'); await act('crUniq', '[data-id="shadowdance"]'); await act('crNext'); await act('crNext');
  await act('crProf', '[data-id="smith"]'); await act('crProf', '[data-id="miner"]'); await act('crNext'); await act('crFinish');
  await click('#cfOk'); await page.waitForSelector('#story', { timeout: 8000 });
  for (let g = 0; g < 400 && await page.locator('#story').count(); g++) { const sk = page.locator('#sSkip'); if (await sk.count()) await sk.click().catch(() => {}); if (await page.locator('.schoice.on .choice').count()) await page.locator('.schoice.on .choice').first().click().catch(() => {}); else await page.locator('#dlg').click({ force: true, timeout: 300 }).catch(() => {}); await page.waitForTimeout(60); }
  await page.waitForTimeout(400); if (await page.locator('#modal.on').count()) await ev(() => __RPG.UI.closeModal());
  // главная: кольцо Нимба и арт
  await act('tab', '[data-t="city"]').catch(() => {}); await page.waitForTimeout(900);
  const hub = await ev(() => { const h = document.querySelector('.hub'); if (!h) return null; const cg = document.querySelector('.hub .hubcg'), r = document.querySelector('.hub .lira'); return { cg: getComputedStyle(cg).backgroundImage.includes('cg_halo_city'), ring: !!r && r.getBoundingClientRect().width > 100, h: Math.round(h.getBoundingClientRect().height) }; });
  check('главная: арт cg_halo_city и кольцо Нимба на месте', hub && hub.cg && hub.ring, JSON.stringify(hub));
  await page.screenshot({ path: path.join(out, 'fix2-home.jpg'), type: 'jpeg', quality: 84, scale: 'css' });

  const cdp = await ctx.newCDPSession(page);
  // сцена: герой меняет эмоции подряд; после каждой — замер отрисованного прямоугольника спрайта
  const seq = [['n', 'neutral'], ['a', 'angry'], ['h', 'smirk'], ['d', 'sad'], ['s', 'shy'], ['u', 'surprised'], ['n', 'neutral']];
  const play = async (L, tag, shotAt, pre) => {
    await ev((L) => { __RPG.UI.vnTest = __RPG.UI.playLines(L, { bg: 'camp', replay: true }); }, L);
    await page.waitForSelector('#story', { timeout: 6000 }); await page.waitForTimeout(1300);
    for (let c = 0; c < 8 && pre; c++) { if (await ev(() => Array.from(document.querySelectorAll('.vact img.vsp')).some((x) => /\/hero_/.test(x.src)))) break; await page.locator('#dlg').click({ force: true, timeout: 800 }).catch(() => {}); await page.waitForTimeout(800); }    // ждём появления героя в кадре
    const rects = [];
    for (let i = 0; i < L.filter((l) => l[0] === 'h').length; i++) {
      await page.waitForTimeout(900);
      await ev(() => { if (!document.getElementById('nofxT')) { const st = document.createElement('style'); st.id = 'nofxT'; st.textContent = '.vbr,.vpp,.vslide,.vact{animation:none!important}.vbr,.vpp,.vslide{transition:none!important}'; document.head.appendChild(st); } }); await page.waitForTimeout(700);
      const r = await ev(() => { if (!document.getElementById('nofxT')) { const st = document.createElement('style'); st.id = 'nofxT'; st.textContent = '.vbr,.vpp,.vslide,.vact{animation:none!important}.vbr,.vpp,.vslide{transition:none!important}'; document.head.appendChild(st); }   // «дыхание» кадра (анимация) в замере отключаем — сравниваем геометрию спрайтов
      const a = Array.from(document.querySelectorAll('.vact')).find((x) => /\/hero_/.test((x.querySelector('img.vsp') || {}).src || '')); const imgs = Array.from(a.querySelectorAll('img.vsp')); const im = imgs[imgs.length - 1], r = im.getBoundingClientRect(), f = a.getBoundingClientRect(); return { n: imgs.length, src: im.getAttribute('src').split('/').pop(), l: +r.left.toFixed(2), t: +r.top.toFixed(2), w: +r.width.toFixed(2), h: +r.height.toFixed(2), fw: +f.width.toFixed(2), fh: +f.height.toFixed(2), nat: [im.naturalWidth, im.naturalHeight] }; });
      rects.push(r); if (shotAt && shotAt.includes(i)) await page.screenshot({ path: path.join(out, `${tag}-${i}.jpg`), type: 'jpeg', quality: 84, scale: 'css' });
      if (i < L.filter((l) => l[0] === 'h').length - 1) { await page.locator('#dlg').click({ force: true, timeout: 800 }).catch(() => {}); }
    }
    await ev(() => { __RPG.UI.sSkip && __RPG.UI.sSkip(); }); await page.waitForTimeout(900);
    return rects;
  };
  const same = (rs) => rs.every((r) => Math.abs(r.l - rs[0].l) < 0.6 && Math.abs(r.t - rs[0].t) < 0.6 && Math.abs(r.w - rs[0].w) < 0.6 && Math.abs(r.h - rs[0].h) < 0.6);
  let rs = await play([['bg', 'camp'], ...seq.map(([m], i) => ['h', 'Реплика ' + (i + 1) + '.', m])], 'fix2-vn-hero', [0, 2, 5]);
  console.log('   ', rs.map((r) => `${r.src} ${r.w}x${r.h}@${r.l},${r.t}`).join(' | '));
  check('обычный облик: 7 реплик / 6 эмоций — размер и позиция спрайта одинаковы (±0.6 px)', rs.length === 7 && same(rs), JSON.stringify(rs.map((r) => [r.src.slice(5, 9), r.w, r.h, r.l, r.t])));
  check('обычный облик: файлы по эмоциям разные, холсты нативные (naturalWidth ≥ 400)', new Set(rs.map((r) => r.src)).size >= 6 && rs.every((r) => r.nat[0] >= 400 && r.nat[1] >= 600), JSON.stringify(rs.map((r) => r.nat)));
  const dseq = [['m', 'neutral'], ['ma', 'angry'], ['mh', 'smirk'], ['md', 'sad'], ['ms', 'shy'], ['mu', 'surprised']];
  let rd = await play([['bg', 'camp'], ...dseq.map(([m], i) => ['h', 'Король ' + (i + 1) + '.', m])], 'fix2-vn-demon', [0, 1]);
  console.log('   ', rd.map((r) => `${r.src} ${r.w}x${r.h}@${r.l},${r.t}`).join(' | '));
  check('форма Короля Демонов: 6 эмоций — размер и позиция одинаковы', rd.length === 6 && same(rd), JSON.stringify(rd.map((r) => [r.src.slice(10, 14), r.w, r.h, r.l, r.t])));
  // переход обычный ↔ демон: кадр (актёр) не прыгает
  const mix = await play([['bg', 'camp'], ['h', 'Обычный.', 'n'], ['h', 'Король.', 'm'], ['h', 'Снова обычный.', 'n']], 'fix2-mix', []);
  check('переход обычный → демон → обычный: лицо остаётся на месте (|Δ top| < 6 px)', Math.abs(mix[0].t + 0 - mix[1].t) < 80, JSON.stringify(mix.map((r) => [r.src, r.l, r.t, r.w, r.h])));
  // герой + генерал в трёх эмоциях подряд
  rs = await play([['bg', 'camp'], ['i', 'Государь, мы у цели.', 'n'], ['h', 'Тише. Слушайте.', 'n'], ['h', 'Что?!', 'u'], ['h', 'Тогда идём.', 'h']], 'fix2-vn-general', [0, 1, 2], 1);   // 1-я реплика героя появляется после клика
  check('герой+генерал: размер спрайта героя одинаков в 3 эмоциях', rs.length === 3 && same(rs), JSON.stringify(rs.map((r) => [r.src, r.w, r.h, r.l, r.t])));
  // производительность: DPR3 + CPU 4×
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const perf = async (L, label) => {
    await ev((L) => { __RPG.UI.vnTest = __RPG.UI.playLines(L, { bg: 'camp', replay: true }); window.__fr = []; window.__lt = 0; try { new PerformanceObserver((l) => { window.__lt += l.getEntries().length; }).observe({ entryTypes: ['longtask'] }); } catch (e) {} let t = performance.now(); const f = (n) => { window.__fr.push(n - t); t = n; if (window.__run) requestAnimationFrame(f); }; window.__run = 1; requestAnimationFrame(f); }, L);
    await page.waitForSelector('#story'); await page.waitForTimeout(1200);
    const nh = L.filter((l) => l[0] === 'h').length; for (let i = 0; i < nh + 1; i++) { await page.locator('#dlg').click({ force: true, timeout: 800 }).catch(() => {}); await page.waitForTimeout(550); }
    const r = await ev(() => { window.__run = 0; const d = window.__fr.slice(3).sort((a, b) => a - b); return { n: d.length, p50: d[Math.floor(d.length * .5)], p95: d[Math.floor(d.length * .95)], fps: 1000 / (d.reduce((a, c) => a + c, 0) / d.length), lt: window.__lt }; });
    await ev(() => { __RPG.UI.sSkip && __RPG.UI.sSkip(); }); await page.waitForTimeout(900);
    console.log(`    ${label}: fps ${r.fps.toFixed(1)}, p50 ${r.p50.toFixed(1)} мс, p95 ${r.p95.toFixed(1)} мс, long tasks ${r.lt}`); return r;
  };
  let p1 = await perf([['bg', 'camp'], ...seq.map(([m], i) => ['h', 'Реплика ' + i, m])], 'герой, 7 смен эмоций (DPR3, CPU 4×)');
  check('fps героя ≥ 40 при DPR3 + CPU 4×', p1.fps >= 40, p1.fps.toFixed(1));
  let p2 = await perf([['bg', 'camp'], ['i', 'Государь.', 'n'], ['h', 'Да.', 'n'], ['h', 'Что?!', 'u'], ['i', 'Идём.', 'h'], ['h', 'Идём.', 's'], ['h', 'Тише.', 'a']], 'герой + генерал (DPR3, CPU 4×)');
  check('fps героя + генерала ≥ 40 при DPR3 + CPU 4×', p2.fps >= 40, p2.fps.toFixed(1));
  let p3 = await perf([['bg', 'camp'], ['i', 'Государь.', 'n'], ['m', 'Мы тут!', 'h'], ['h', 'Вижу.', 'n'], ['h', 'Король.', 'mh'], ['h', 'Сейчас.', 'ma']], 'герой + 2 говорящих, смена на форму Короля');
  check('fps героя + двух говорящих + форма Короля ≥ 35', p3.fps >= 35, p3.fps.toFixed(1));
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  check('нет ошибок консоли', errs.length === 0, errs.slice(0, 3).join(' | ')); check('нет 404', bad404.length === 0, bad404.slice(0, 3).join(' | '));
  console.log(`\nlive-sprite: ${ok} ✓, ${bad} ✗`); await b.close(); process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
