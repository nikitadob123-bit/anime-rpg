#!/usr/bin/env node
/* Генерирует разделы «Арки» и «Главы» в docs/STORY_BIBLE.md из js/story/outline.js (источник правды — outline.js).
   Запуск: node tools/gen-bible.js. Всё между <!-- ARCS:BEGIN --> и <!-- ARCS:END --> перезаписывается. */
const fs = require('fs'), path = require('path');
globalThis.RPG = { D: {} }; require('../js/story/outline.js');
const O = RPG.D.OUTLINE, file = path.join(__dirname, '../docs/STORY_BIBLE.md');
const parts = {}; O.arcs.forEach((a) => { (parts[a.part] = parts[a.part] || []).push(a); });
const b = (s) => String(s || '').replace(/\|/g, '\\|');
let out = `<!-- ARCS:BEGIN — сгенерировано tools/gen-bible.js из js/story/outline.js (версия ${O.version}); правьте outline.js, а не этот раздел -->\n\n`;
out += '## Сводная таблица арок\n\n| № | Арка | Часть | Главы | Рек. ур. | Главный антагонист / босс | Готово |\n|---|---|---|---|---|---|---|\n';
O.arcs.forEach((a) => { out += `| ${a.n} | ${b(a.title)} | ${b(a.part)} | ${(a.n - 1) * 10 + 1}–${a.n * 10} | ${a.levels[0]}–${a.levels[1]} | ${b(a.boss)} | ${a.ready ? a.ready + '/10' : '—'} |\n`; });
out += '\n';
Object.keys(parts).forEach((p) => {
  out += `## Часть ${p}\n\n`;
  parts[p].forEach((a) => {
    const from = (a.n - 1) * 10 + 1;
    out += `### Арка ${a.n}. ${a.title} (главы ${from}–${a.n * 10})\n\n`;
    out += `- **Регион:** ${a.region}\n- **Локации:** ${a.locs.join('; ')}\n- **Фоновые сцены (bg):** ${a.bgs.map((x) => '`' + x + '`').join(', ')}\n`;
    out += `- **Главный антагонист:** ${a.antagonist}\n- **Босс(ы) подземелья:** ${a.boss}\n- **Вступают / присоединяются:** ${a.joins}\n`;
    out += `- **Ключевые повороты:**\n${a.twists.map((t) => '  - ' + t).join('\n')}\n`;
    out += `- **Лирия (эмоциональная дуга):** ${a.sister}\n- **Романтика:** ${a.romance}\n- **Дуэли героинь / решения:** ${a.duels}\n`;
    out += `- **Рост силы:** ${a.power}\n- **Подчинённые:** ${a.subs}\n- **Ключевой предмет арки:** ${a.key}\n- **Уровни:** ${a.levels[0]}–${a.levels[1]}\n\n`;
    out += '| Гл. | Название | Ур. | Фон | Босс | Содержание |\n|---|---|---|---|---|---|\n';
    O.chapters.filter((c) => c.arc === a.n).forEach((c) => { out += `| ${c.n} | ${b(c.title)} | ${c.level} | \`${c.bg}\` | ${c.boss ? '`' + c.boss + '`' : ''} | ${b(c.summary)} |\n`; });
    out += '\n';
  });
});
out += '<!-- ARCS:END -->';
let doc = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '# Библия сюжета\n\n';
const i = doc.indexOf('<!-- ARCS:BEGIN'), j = doc.indexOf('<!-- ARCS:END -->');
doc = i >= 0 && j > i ? doc.slice(0, i) + out + doc.slice(j + '<!-- ARCS:END -->'.length) : doc.trimEnd() + '\n\n' + out + '\n';
fs.writeFileSync(file, doc);
console.log('docs/STORY_BIBLE.md: арок ' + O.arcs.length + ', глав ' + O.chapters.length + ', ' + doc.length + ' знаков');
