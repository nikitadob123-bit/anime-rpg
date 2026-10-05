/* Скриншоты реальных сцен сюжета до заданной реплики (все предыдущие строки сцены проигрываются — актёры накапливаются как в игре).
   node tools/vn-scenes.js <url> <префикс> [WxH@DPR] [scene:regex ...]   (по умолчанию — три сцены из жалобы u51) ; SHOTS=папка */
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path');
const url = process.argv[2] || 'http://127.0.0.1:8802/', tag = process.argv[3] || 'sc', vp = process.argv[4] || '444x986@2.75';
const [VW, VH] = vp.split('@')[0].split('x').map(Number), DPR = +(vp.split('@')[1] || 2);
const out = process.env.SHOTS || '/workspace/shots'; fs.mkdirSync(out, { recursive: true });
const JOBS = process.argv.slice(5).length ? process.argv.slice(5) : ['ch1_a:не титул, а функция', 'prologue:Церковь\\? Добей', 'prologue:Источник найден'];
(async () => {
  const exe = ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find((p) => fs.existsSync(p));
  const b = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: DPR, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  const ev = (f, a) => page.evaluate(f, a);
  const navSel = async (sel) => { const m = /data-t="(\w+)"/.exec(sel); if (!m) return sel; const l = page.locator(sel).first(); if (await l.count() && /\bnavx\b/.test((await l.getAttribute('class')) || '')) { await page.locator('#nav [data-act="navMore"]').click(); await page.waitForTimeout(300); return `#modal [data-act="tab"][data-t="${m[1]}"]`; } return sel; };
  const click = async (sel) => { sel = await navSel(sel); const l = page.locator(sel).first(); await l.waitFor({ state: 'visible', timeout: 8000 }); await l.click(); await page.waitForTimeout(80); };
  const act = (a, x) => click(`[data-act="${a}"]${x || ''}`);
  await page.goto(url, { waitUntil: 'load' }); await page.waitForTimeout(1500);
  await act('newProfile'); await page.fill('#npNick', 'Проверка'); await act('npAv', '[data-i="3"]'); await act('npCreate');
  await act('newHero', '[data-i="0"]'); await page.fill('#crName', 'Арата'); await act('crNext');
  await act('crRaceSet', '[data-id="o_street"]'); await act('crNext'); await act('crUniq', '[data-id="shadowdance"]'); await act('crNext'); await act('crNext');
  await act('crProf', '[data-id="smith"]'); await act('crProf', '[data-id="miner"]'); await act('crNext'); await act('crFinish');
  await click('#cfOk'); await page.waitForSelector('#story', { timeout: 8000 });
  await ev(() => { const s = document.querySelector('#story'); if (s) { __RPG.UI.sSkip(); } });
  for (let g = 0; g < 300 && await page.locator('#story').count(); g++) { if (await page.locator('.schoice.on .choice').count()) await page.locator('.schoice.on .choice').first().click().catch(() => {}); else await page.locator('#dlg').click({ force: true, timeout: 300 }).catch(() => {}); await page.waitForTimeout(50); }
  await page.waitForTimeout(400); if (await page.locator('#modal.on').count()) await ev(() => __RPG.UI.closeModal());
  let n = 0;
  for (const job of JOBS) {
    const [sid, rx] = [job.slice(0, job.indexOf(':')), job.slice(job.indexOf(':') + 1)]; n++;
    // реплики до нужной: title/choice/give выкидываем, порядок и состав актёров — как в игре
    await ev(([sid, rx]) => { __RPG.UI.p.settings.textSpeed = 0; const sc = __RPG.D.SCENES[sid], re = new RegExp(rx); const i = sc.lines.findIndex((l) => re.test(l[1] || '')); const L = sc.lines.slice(0, i + 1).filter((l) => !/^(title|choice|give|set|rec|loy|aff|bell|date)$/.test(l[0])); __RPG.UI.vnTest = __RPG.UI.playLines(L, { bg: sc.bg, replay: true, noTitle: true }); }, [sid, rx]);
    await page.waitForSelector('#story');
    await ev(async (rx) => { const re = new RegExp(rx); for (let g = 0; g < 2000; g++) { const t = (document.querySelector('#stxt') || {}).textContent || ''; if (re.test(t)) break; if (__RPG.UI.sNext) __RPG.UI.sNext(); await new Promise((r) => setTimeout(r, 30)); } }, rx);
    await page.waitForTimeout(1700);
    const file = path.join(out, `${tag}${n}.jpg`); await page.screenshot({ path: file, type: 'jpeg', quality: 85, scale: 'css' });
    const m = await ev(() => Array.from(document.querySelectorAll('.vact.in')).map((a) => { const im = Array.from(a.querySelectorAll('img.vsp')).pop(); return im && im.getAttribute('src').split('/').pop(); }));
    console.log(file, sid, JSON.stringify(m));
    await ev(() => { if (__RPG.UI.sSkip) __RPG.UI.sSkip(); }); for (let g = 0; g < 200 && await page.locator('#story').count(); g++) { await page.locator('#dlg').click({ force: true, timeout: 300 }).catch(() => {}); await page.waitForTimeout(40); }
  }
  console.log('errs', JSON.stringify(errs)); await b.close();
})().catch((e) => { console.error(e); process.exit(2); });
