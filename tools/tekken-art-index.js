/* Обновляет список готовых артов коллабы в js/ui-tekken.js по файлам img/tekken/*.webp. node tools/tekken-art-index.js */
const fs = require('fs'), path = require('path'), root = path.join(__dirname, '..');
const dir = path.join(root, 'img/tekken');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
const ids = fs.readdirSync(dir).filter((f) => f.endsWith('.webp')).map((f) => f.slice(0, -5)).sort();
const p = path.join(root, 'js/ui-tekken.js');
const src = fs.readFileSync(p, 'utf8');
const next = src.replace(/D\.TK_ART_HAVE = \[.*?\]; \/\/ @tk-art-have/, `D.TK_ART_HAVE = ${JSON.stringify(ids)}; // @tk-art-have`);
if (next === src) { console.error('marker @tk-art-have not found'); process.exit(1); }
fs.writeFileSync(p, next);
console.log(ids.length, 'tekken arts');
