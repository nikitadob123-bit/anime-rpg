/* Статистика длины глав: node tools/story-stats.js [--json]. Эталон — docs/STORY_SPEC.md (главы 1–3 + пролог). */
const { load, measure, measureScenes } = require('./lib-story');
const RPG = load(), { D, story: ST } = RPG;
const REF = { lines: 96, chars: 8900, words: 1470 };               // среднее по главам 1–3
const rows = [];
if (D.SCENES.prologue) { const m = measureScenes(RPG, ['prologue']); m.n = 'пролог'; rows.push(m); }
for (let n = 1; n <= ST.TOTAL; n++) if (ST.has(n)) { const m = measure(RPG, n); const c = D.CHAPTERS[n]; m.battle = !!(c && c.battle) || n === 2 || n === 3; rows.push(m); }
if (process.argv.includes('--json')) { console.log(JSON.stringify(rows, null, 1)); process.exit(0); }
const pad = (x, w) => String(x).padStart(w);
console.log(' гл. | сцен | реплик | знаков | слов | выб. | % рассказчик | отн. эталона');
rows.forEach((r) => console.log(`${pad(r.n, 5)} |${pad(r.scenes, 5)} |${pad(r.lines, 7)} |${pad(r.chars, 7)} |${pad(r.words, 5)} |${pad(r.choices, 5)} |${pad(r.lines ? Math.round(r.narr / r.lines * 100) + '%' : '-', 13)} |${pad(r.n === 'пролог' ? '-' : Math.round(r.chars / REF.chars * 100) + '%', 10)}`));
const ch = rows.filter((r) => r.n !== 'пролог'), tot = (k) => ch.reduce((a, r) => a + r[k], 0);
console.log(`\nГлав готово: ${ch.length} из ${ST.TOTAL}. Всего: ${tot('lines')} реплик, ${tot('chars')} знаков, ${tot('words')} слов.`);
if (ch.length) {
  const avg = (k) => Math.round(tot(k) / ch.length);
  console.log(`Среднее на главу: ${avg('lines')} реплик, ${avg('chars')} знаков, ${avg('words')} слов, ${(tot('choices') / ch.length).toFixed(1)} выборов.`);
  const nw = ch.filter((r) => r.n >= 4);
  if (nw.length) console.log(`Новые главы (4+): среднее ${Math.round(nw.reduce((a, r) => a + r.chars, 0) / nw.length)} знаков, ${Math.round(nw.reduce((a, r) => a + r.lines, 0) / nw.length)} реплик.`);
  console.log(`Прогноз на ${ST.TOTAL} глав при среднем эталоне (${REF.chars} зн.): ≈ ${(REF.chars * ST.TOTAL / 1e6).toFixed(1)} млн знаков, ≈ ${Math.round(REF.words * ST.TOTAL / 1000)} тыс. слов.`);
}
