/* Обновляет список готовых иконок в js/icons.js по файлам img/icons/*.webp. node tools/icons-index.js */
const fs = require('fs'), path = require('path'), root = path.join(__dirname, '..');
const ids = fs.readdirSync(path.join(root, 'img/icons')).filter((f) => f.endsWith('.webp')).map((f) => f.slice(0, -5)).sort();
const p = path.join(root, 'js/icons.js'); fs.writeFileSync(p, fs.readFileSync(p, 'utf8').replace(/D\.ICON_HAVE = \[.*?\]; \/\/ @icons-have/, `D.ICON_HAVE = ${JSON.stringify(ids)}; // @icons-have`)); console.log(ids.length, 'icons');
