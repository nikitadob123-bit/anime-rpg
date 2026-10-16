/* node tools/pet-icons.js [файл] [new] → /workspace/pet-icons.json [{id,name,rarity,prompt}] для всех наполненных питомцев (без заглушек, арт которых пришлёт автор) */
const fs = require('fs'); const RPG = require('../js/data-core.js'); require('../js/data-stats.js');
['data-maou', 'data-maou2', 'data-prof', 'data-world', 'data-world2', 'data-crew', 'data-theme', 'data-story', 'data-story2', 'data-story3', 'data-romance', 'portrait', 'engine', 'stats', 'gear', 'combat', 'crew', 'save', 'artifact', 'dungeons-sp', 'pets'].forEach((f) => require('../js/' + f + '.js'));
const { D } = RPG, STYLE = 'anime-style game icon, centered full-body pet, soft dramatic lighting, rich colors, no text, no frame';
const onlyNew = process.argv[3] === 'new', hasArt = (p) => fs.existsSync(__dirname + '/../assets/pets/' + p.id + '.webp');   // 'new' — только питомцы без готового арта
const out = D.PETS.filter((p) => !p.ph && (!onlyNew || !hasArt(p))).map((p) => ({ id: p.id, name: p.n, rarity: D.PET_RAR[p.r].n, prompt: p.vp + ', ' + STYLE + (p.r >= 4 ? ', glowing aura, ornate magical details' : '') }));
fs.writeFileSync(process.argv[2] || '/workspace/pet-icons.json', JSON.stringify(out, null, 2) + '\n'); console.log(out.length + ' pets');
