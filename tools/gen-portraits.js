/* Генерация assets/portraits/*.webp из процедурных SVG (js/portrait.js) через Chrome + Pillow. */
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path'), cp = require('child_process');
const RPG = require('../js/portrait.js');
const out = path.join(__dirname, '..', 'assets', 'portraits');
const tmp = path.join(__dirname, '..', '.tmp'); fs.mkdirSync(tmp, { recursive: true }); fs.mkdirSync(out, { recursive: true });
(async () => {
  const exe = process.env.CHROME_PATH || '/usr/bin/google-chrome';
  const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 256, height: 320 }, deviceScaleFactor: 1 });
  const jobs = [];
  RPG.PORTRAITS.forEach(p => jobs.push([p.id, Object.assign({}, p, { mood: 'n' })]));
  Object.keys(RPG.NPC_LOOK).forEach(k => ['n', 'h', 's', 'x'].forEach(m => jobs.push(['npc_' + k + '_' + m, Object.assign({}, RPG.NPC_LOOK[k], { mood: m })])));
  const only = process.argv[2];
  for (const [id, spec] of jobs) {
    if (only && !id.startsWith(only)) continue;
    const svg = RPG.portraitSVG(spec);
    await page.setContent(`<html><body style="margin:0">${svg.replace('<svg ', '<svg width="256" height="320" ')}</body></html>`);
    await page.screenshot({ path: path.join(tmp, id + '.png'), clip: { x: 0, y: 0, width: 256, height: 320 } });
  }
  await browser.close();
  cp.execSync(`python3 - <<'PY'
import glob,os
from PIL import Image
for f in glob.glob('${tmp}/*.png'):
    im=Image.open(f).convert('RGB'); n=os.path.basename(f)[:-4]
    im.save('${out}/'+n+'.webp','WEBP',quality=80,method=6)
PY`);
  const files = fs.readdirSync(out); let tot = 0; files.forEach(f => tot += fs.statSync(path.join(out, f)).size);
  console.log(files.length + ' файлов, ' + Math.round(tot / 1024) + ' КБ');
})();
