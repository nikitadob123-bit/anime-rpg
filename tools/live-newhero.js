/* Проверка нового аватара героя на опубликованной версии (мобильная эмуляция 400×880): VN-сцены с героем (neutral/surprised/shy, героем и генералом, форма Короля Демонов),
   вкладка «Герой», аватары; подлинность файлов (sha1 с диска = с сайта), спрайт не обрезан, нет мерцания (кадры/ошибки). Скриншоты — /workspace/shots/newhero-*.jpg. node tools/live-newhero.js [url] */
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const url = process.argv[2] || 'https://nikitadob123-bit.github.io/anime-rpg/';
const out = process.env.SHOTS || '/workspace/shots'; fs.mkdirSync(out, { recursive: true });
let ok = 0, bad = 0; const check = (n, c, x) => { c ? ok++ : bad++; console.log(c ? '  ✓' : '  ✗', n, x || ''); };
const sha = (b) => crypto.createHash('sha1').update(b).digest('hex');
(async () => {
  const exe = process.env.CHROME_PATH || ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find((p) => fs.existsSync(p));
  const b = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 400, height: 880 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ru-RU', timezoneId: 'Europe/Minsk' });
  const page = await ctx.newPage(); const errs = [], bad404 = [];
  page.on('console', (m) => m.type() === 'error' && errs.push(m.text())); page.on('pageerror', (e) => errs.push(e.message)); page.on('response', (r) => { if (r.status() >= 400) bad404.push(r.status() + ' ' + r.url()); });
  const ev = (f, a) => page.evaluate(f, a);
  const click = async (sel) => { const l = page.locator(sel).first(); await l.waitFor({ state: 'visible', timeout: 8000 }); await l.click(); await page.waitForTimeout(80); };
  const act = (a, x) => click(`[data-act="${a}"]${x || ''}`);
  await page.goto(url, { waitUntil: 'load' }); await page.evaluate(() => navigator.serviceWorker.ready); await page.waitForTimeout(3000);
  // манифест и подлинность файлов
  const man = await ev(() => fetch('assets/vn/manifest.json', { cache: 'no-cache' }).then((r) => r.json()));
  check('манифест: hero (8 ключей) и hero_demon (6) + аватары', Object.keys(man.portraits.hero).length === 8 && Object.keys(man.portraits.hero_demon).length === 6 && man.av.hero && man.av.hero_demon, JSON.stringify(man.portraits.hero));
  let same = 0, all = 0; for (const f of new Set([...Object.values(man.portraits.hero), ...Object.values(man.portraits.hero_demon), man.av.hero, man.av.hero_demon])) { all++; const r = await ctx.request.get(url + 'assets/vn/' + f); const loc = fs.readFileSync(path.join(__dirname, '../assets/vn', f)); if (r.ok() && sha(await r.body()) === sha(loc)) same++; }
  check('файлы hero_*/hero_demon_* на сайте совпадают с репозиторием', same === all, same + '/' + all);
  const gone = await ctx.request.get(url + 'assets/vn/hero_demon.webp'); check('старый hero_demon.webp удалён с сайта', gone.status() === 404, String(gone.status()));
  // профиль и герой
  await act('newProfile'); await page.fill('#npNick', 'Проверка'); await act('npAv', '[data-i="3"]'); await act('npCreate');
  await act('newHero', '[data-i="0"]'); await page.fill('#crName', 'Арата'); await act('crNext');
  await page.waitForTimeout(300);
  const crImg = await ev(() => { const i = document.querySelector('.por[data-pid="hero"]'); return i ? i.getAttribute('src') : null; });
  check('создание героя: показан новый аватар (кроп лица)', /hero_av\.webp$/.test(crImg || ''), crImg);
  await page.screenshot({ path: path.join(out, 'newhero-create.jpg'), type: 'jpeg', quality: 80, scale: 'css' });
  await act('crRaceSet', '[data-id="o_street"]'); await act('crNext'); await act('crUniq', '[data-id="shadowdance"]'); await act('crNext'); await act('crNext');
  await act('crProf', '[data-id="smith"]'); await act('crProf', '[data-id="miner"]'); await act('crNext'); await act('crFinish');
  await click('#cfOk'); await page.waitForSelector('#story', { timeout: 8000 });
  for (let g = 0; g < 400 && await page.locator('#story').count(); g++) { const sk = page.locator('#sSkip'); if (await sk.count()) await sk.click().catch(() => {}); if (await page.locator('.schoice.on .choice').count()) await page.locator('.schoice.on .choice').first().click().catch(() => {}); else await page.locator('#dlg').click({ force: true, timeout: 300 }).catch(() => {}); await page.waitForTimeout(60); }
  await page.waitForTimeout(300); if (await page.locator('#modal.on').count()) await ev(() => __RPG.UI.closeModal());
  // вкладка «Герой»
  await act('tab', '[data-t="hero"]'); await page.waitForTimeout(700);
  const heroSrc = await ev(() => Array.from(document.querySelectorAll('img.por')).map((i) => i.getAttribute('src')));
  check('вкладка «Герой»/шапка: аватары — кроп hero_av.webp, старого арта нет', heroSrc.length > 0 && heroSrc.every((s) => /hero_av\.webp$/.test(s)), JSON.stringify(heroSrc));
  const ok1 = await ev(() => { const im = document.querySelector('.herocard img.por'); return !!im && im.complete && im.naturalWidth > 0; }); check('карточка героя: картинка загружена', ok1);
  await page.screenshot({ path: path.join(out, 'newhero-hero-tab.jpg'), type: 'jpeg', quality: 80, scale: 'css' });
  await act('tab', '[data-t="home"]').catch(() => {}); await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(out, 'newhero-home.jpg'), type: 'jpeg', quality: 80, scale: 'css' });
  // VN-сцены
  const scene = async (name, L, clicks, post) => {
    await ev((L) => { __RPG.UI.vnTest = __RPG.UI.playLines(L, { bg: 'camp', replay: true }); }, L);
    await page.waitForSelector('#story', { timeout: 6000 });
    const nAct = () => page.locator('.vact').count();
    for (let i = 0; i < 8; i++) { if (i >= 1 && (await nAct()) >= clicks) break; await page.locator('#dlg').click({ force: true, timeout: 800 }).catch(() => {}); await page.waitForTimeout(700); }   // clicks — сколько актёров ждём в кадре
    await page.waitForTimeout(900);
    const info = await ev(() => { const st = document.querySelector('#story').getBoundingClientRect(); return Array.from(document.querySelectorAll('.vact')).map((a) => { const im = Array.from(a.querySelectorAll('img')).pop(); const r = im.getBoundingClientRect(); return { src: im.getAttribute('src'), ok: im.complete && im.naturalWidth > 0, l: Math.round(r.left), rr: Math.round(r.right), t: Math.round(r.top), vis: getComputedStyle(a).opacity }; }); });
    await page.screenshot({ path: path.join(out, name), type: 'jpeg', quality: 80, scale: 'css' });
    if (post) await post(info);
    await ev(() => { const s = document.querySelector('#sSkip'); s && s.click(); }); await page.waitForTimeout(500); if (await page.locator('#story').count()) await ev(() => { __RPG.UI.vnAbort && __RPG.UI.vnAbort(); }).catch(() => {});
    return info;
  };
  const frames = await ev(() => new Promise((res) => { const d = []; let t = performance.now(); const f = (n) => { d.push(n - t); t = n; if (d.length < 240) requestAnimationFrame(f); else res(d.slice(5)); }; requestAnimationFrame(f); }));
  // 1) герой один, neutral → затем удивление → смущение (кроссфейды)
  let info = await scene('newhero-vn-neutral.jpg', [['bg', 'camp'], ['h', 'Тише. Слушайте.', 'n'], ['h', 'Что?!', 'u'], ['h', 'Я… не привык к таким словам.', 's']], 1);
  check('VN neutral: спрайт hero_neutral.webp загружен, лицо в кадре (поля спрайта — прозрачные)', info.length === 1 && /hero_neutral\.webp$/.test(info[0].src) && info[0].ok && info[0].l >= -200 && info[0].rr <= 500, JSON.stringify(info));
  // 2) удивление и смущение отдельными скринами
  info = await scene('newhero-vn-surprised.jpg', [['bg', 'camp'], ['h', 'Подожди. Что ты сказала?!', 'u']], 1, null);
  check('VN surprised: hero_surprised.webp', /hero_surprised\.webp$/.test(info[0].src) && info[0].ok, JSON.stringify(info));
  info = await scene('newhero-vn-shy.jpg', [['bg', 'camp'], ['m', 'Ты смутился? Король смутился!', 'h'], ['h', 'Нет. Это… тактический вздох.', 's']], 2);
  check('VN shy: герой hero_shy.webp рядом с генералом (2 актёра)', info.length === 2 && info.some((x) => /hero_shy\.webp$/.test(x.src)) && info.every((x) => x.ok), JSON.stringify(info));
  // 3) герой + генерал
  info = await scene('newhero-vn-general.jpg', [['bg', 'camp'], ['i', 'Государь, мы у цели.', 'n'], ['h', 'Тише. Слушайте.', 'n'], ['i', 'Тогда идём.', 'n']], 2);
  check('VN герой+генерал: оба загружены, лица в кадре', info.length === 2 && info.every((x) => x.ok && x.l >= -250 && x.rr <= 650), JSON.stringify(info));
  // 4) форма Короля Демонов
  info = await scene('newhero-demon-neutral.jpg', [['bg', 'camp'], ['h', 'Я иду всерьёз. Без лени. Хоть раз.', 'm']], 1);
  check('VN демон-форма (m): hero_demon_neutral.webp', /hero_demon_neutral\.webp$/.test(info[0].src) && info[0].ok, JSON.stringify(info));
  info = await scene('newhero-demon-angry.jpg', [['bg', 'camp'], ['h', 'Тогда придётся просить по-другому.', 'ma']], 1);
  check('VN демон-форма гнев (ma): hero_demon_angry.webp', /hero_demon_angry\.webp$/.test(info[0].src) && info[0].ok, JSON.stringify(info));
  info = await scene('newhero-demon-smirk.jpg', [['bg', 'camp'], ['h', 'Показывайте, чем вы меня взвешиваете.', 'mh']], 1);
  check('VN демон-форма ухмылка (mh): hero_demon_smirk.webp', /hero_demon_smirk\.webp$/.test(info[0].src) && info[0].ok, JSON.stringify(info));
  info = await scene('newhero-demon-with-general.jpg', [['bg', 'camp'], ['i', 'Государь…', 'd'], ['h', 'Встаньте.', 'm'], ['m', 'Вот это я люблю!', 'h']], 2);
  check('VN демон-форма + генералы: все в кадре', info.length >= 2 && info.every((x) => x.ok && x.l >= -650 && x.rr <= 700), JSON.stringify(info));
  const sorted = frames.slice().sort((a, b) => a - b), p95 = sorted[Math.floor(sorted.length * 0.95)];
  check('кадры: p95 интервала rAF < 50 мс на главном экране', p95 < 50, p95.toFixed(1) + ' мс');
  const oldArt = await ev(() => performance.getEntriesByType('resource').map((r) => r.name).filter((n) => /hero_demon\.webp/.test(n)));
  check('старый арт (hero_demon.webp) не запрашивался', oldArt.length === 0, JSON.stringify(oldArt));
  check('нет ошибок консоли', errs.length === 0, errs.slice(0, 3).join(' | ')); check('нет 404', bad404.length === 0, bad404.slice(0, 3).join(' | '));
  console.log(`\nlive-newhero: ${ok} ✓, ${bad} ✗`); await b.close(); process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
