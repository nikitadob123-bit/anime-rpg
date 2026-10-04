/* Общий загрузчик данных сюжета для node-инструментов (lint, stats, тесты). */
const path = require('path');
const root = path.join(__dirname, '..');
function load() {
  const RPG = require(path.join(root, 'js/data-core.js'));
  ['data-maou', 'data-prof', 'data-world', 'data-crew', 'data-theme', 'data-story', 'data-story2', 'data-story3', 'data-romance', 'portrait', 'engine', 'combat', 'crew', 'save',
    'story/cast', 'story/core', 'story/enemies', 'story/outline'].forEach((f) => require(path.join(root, 'js', f + '.js')));
  const ST = RPG.story;
  for (let k = 1; k <= ST.ARCS; k++) {
    const f = path.join(root, ST.arcFile(k));
    if (require('fs').existsSync(f)) { require(f); ST.installArc(k); ST.loaded[k] = 1; }
  }
  return RPG;
}
// Текстовая метрика главы
function measure(RPG, n) { const ST = RPG.story, m = measureScenes(RPG, ST.sceneIds(n), ST.auxIds(n)); m.n = n; const c = RPG.D.CHAPTERS[n]; m.battle = !!(c && c.battle); m.legacy = !!(c && c.legacy); return m; }
function measureScenes(RPG, ids, aux) {
  const { D } = RPG; aux = aux || [];
  const m = { n: 0, scenes: ids.length, lines: 0, chars: 0, words: 0, choices: 0, narr: 0, mood: 0, maxLine: 0, ifs: 0, aux: aux.length };
  const walk = (lines) => lines.forEach((l) => {
    const k = l[0];
    if (k === 'choice') { m.choices++; l[1].forEach((o) => walk(o.r || [])); return; }
    if (k === 'if') { m.ifs++; walk(l[2] || []); return; }
    if (!D.SPEAKERS[k]) return;
    m.lines++; m.chars += l[1].length; m.words += l[1].trim().split(/\s+/).length; if (k === 'n') m.narr++; if (l[2]) m.mood++; if (l[1].length > m.maxLine) m.maxLine = l[1].length;
  });
  ids.concat(aux).forEach((id) => D.SCENES[id] && walk(D.SCENES[id].lines));
  return m;
}
module.exports = { load, measure, measureScenes, root };
