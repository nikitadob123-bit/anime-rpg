/* Обновляет список готовых артов в js/dungeon-art.js по файлам img/dungeons/*.webp. node tools/dungeon-art-index.js */
const fs = require('fs'), path = require('path'), root = path.join(__dirname, '..');
const dir = path.join(root, 'img/dungeons');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
const ids = fs.readdirSync(dir).filter((f) => f.endsWith('.webp')).map((f) => f.slice(0, -5)).sort();
const p = path.join(root, 'js/dungeon-art.js');
fs.writeFileSync(p, fs.readFileSync(p, 'utf8').replace(/D\.DUN_ART_HAVE = \[.*?\]; \/\/ @dun-art-have/, `D.DUN_ART_HAVE = ${JSON.stringify(ids)}; // @dun-art-have`));
console.log(ids.length, 'dungeon arts');
