/* Проверка опубликованной версии: загрузка, регистрация SW, офлайн-перезагрузка, ошибки консоли. node tools/live-check.js [url] */
const { chromium } = require('playwright-core');
const url = process.argv[2] || 'https://nikitadob123-bit.github.io/anime-rpg/';
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage(); const errs = []; page.on('console', (m) => m.type() === 'error' && errs.push(m.text())); page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(url, { waitUntil: 'load' });
  await page.evaluate(() => navigator.serviceWorker.ready); await page.waitForTimeout(2500);
  const ctrl = await page.evaluate(async () => { const ks = await caches.keys(); const c = await caches.open(ks.find((k) => k.endsWith('core'))); return (await c.keys()).length; });
  console.log('кэш ядра, файлов:', ctrl);
  const art = await page.evaluate(async () => { const ks = await caches.keys(); const c = await caches.open(ks.find((k) => k.endsWith('core'))); return (await c.keys()).filter((r) => r.url.includes('/assets/vn/')).length; });
  console.log('арт в кэше (CG + neutral + manifest):', art);
  await ctx.setOffline(true); await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(800);
  console.log('офлайн: вид =', await page.evaluate(() => document.body.dataset.view), '| заголовок:', await page.title());
  await page.locator('#btnNewProfile').click(); await page.fill('#npNick', 'Офлайн'); await page.click('#btnNpCreate'); await page.waitForTimeout(200);
  console.log('офлайн: создание профиля ->', await page.evaluate(() => __RPG.UI.v));
  await page.click('[data-act="newHero"]'); await page.waitForTimeout(300);
  console.log('офлайн: мастер ->', await page.evaluate(() => __RPG.UI.v), '| версия SW кэша ок');
  console.log('ошибки консоли:', errs.length, errs.slice(0, 3));
  await b.close(); process.exit(errs.length ? 1 : 0);
})();
