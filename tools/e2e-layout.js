/* Regression: story cards and skill SVG must retain their height in scrollable flex columns. */
const assert = require('node:assert/strict');
require('node:fs').mkdirSync('.tmp/onboarding', { recursive: true });
const { chromium } = require('playwright-core');
const { serve } = require('./serve');
(async () => {
  const srv = await serve(0);
  const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 730 }, isMobile: true });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://127.0.0.1:' + srv.address().port + '/');
    await page.waitForFunction(() => window.__RPG?.UI?.manifest?.portraits);
    await page.evaluate(async () => {
      const { UI, S, E, story: ST } = __RPG;
      const p = S.newProfile('Проверка', '🐉');
      p.slots[0] = E.newSlot({ name: 'Арата', race: 'o_street', uniq: 'shadowdance', prof1: 'smith', prof2: 'miner', now: Date.now() });
      p.active = 0; p.slots[0].hero.level = 7; UI.p = p; UI.buildNav();
      await ST.loadOutline(); UI.go('game');
    });
    const failures = [];
    for (const width of [320, 390, 480]) {
      await page.setViewportSize({ width, height: 730 });
      await page.evaluate(() => { __RPG.UI.tab = 'story'; __RPG.UI.sub.arc = 1; __RPG.UI.renderGame(); });
      const arcs = await page.locator('.arcbox').evaluateAll(es => es.map(e => ({ height: e.getBoundingClientRect().height, row: e.querySelector('.arcrow').getBoundingClientRect().height })));
      console.log('Story', width, 'arcs', arcs.length, 'min height', Math.min(...arcs.map(x => x.height)));
      if (arcs.length !== 30 || arcs.some(x => x.height < x.row)) failures.push('Story cards collapsed at ' + width);
      await page.locator('.arcrow[data-v="2"]').click();
      assert.equal(await page.locator('.chrow').count(), 10);
      await page.locator('.arcrow[data-v="1"]').click();
      assert.equal(await page.locator('.chrow').count(), 10);
      if (width === 390) await page.screenshot({ path: '.tmp/onboarding/fixed-story.png' });
      await page.evaluate(() => { __RPG.UI.tab = 'skills'; __RPG.UI.renderGame(); });
      const graph = await page.locator('.tgraph').evaluate(e => ({ actual: e.getBoundingClientRect().height, declared: parseFloat(e.style.height), svg: e.querySelector('svg').getBoundingClientRect().height, last: Math.max(...[...e.querySelectorAll('.node')].map(n => n.offsetTop + n.offsetHeight)) }));
      console.log('Skills', width, graph);
      if (Math.abs(graph.actual - graph.declared) > 1 || Math.abs(graph.svg - graph.declared) > 1 || graph.last > graph.actual) failures.push('Skill graph collapsed at ' + width);
      await page.locator('.tgraph .node').first().click();
      assert.ok(await page.locator('.ndet').count());
      if (width === 390) await page.screenshot({ path: '.tmp/onboarding/fixed-skills.png' });
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(failures, []);
    console.log('Story expansion and skill node selection passed at all three widths');
  } finally { await browser.close(); srv.close(); }
})().catch(e => { console.error(e); process.exit(1); });
