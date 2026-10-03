/* Генерация фикстур старых версий сохранений (v1, v2) из текущих данных. node test/fixtures/make.js */
const RPG = require('../../js/data-core.js'); ['data-prof', 'data-world', 'data-story', 'engine', 'combat', 'save'].forEach((f) => require('../../js/' + f + '.js'));
const fs = require('fs'), path = require('path'), { E, S } = RPG;
const slot = E.newSlot({ name: 'Старичок', sex: 'm', race: 'elf', cls: 'mage', portrait: 'elf_m_1', uniq: 'frostheart', prof1: 'alch', prof2: 'herb', now: 1700000000000 });
slot.hero.level = 7; slot.gold = 777; slot.prog.cleared.mill = 1; slot.story.done.push('prologue');
const p = S.newProfile('Старый игрок', '🦉', 1700000000000); p.id = 'pold'; p.slots[0] = JSON.parse(JSON.stringify(slot));
// v2: нет seenIntro? (был), cleared как true, нет shopSeed
const v2 = JSON.parse(JSON.stringify(p)); v2.v = 2; delete v2.slots[0].shopSeed; v2.slots[0].prog.cleared.mill = true;
// v1: плоские настройки, нет party/tut/stats/buffs/rev/bossPts/seenIntro
const v1 = JSON.parse(JSON.stringify(v2)); v1.v = 1; delete v1.seenIntro; delete v1.slots[0].party; delete v1.slots[0].tut; delete v1.slots[0].stats; delete v1.slots[0].buffs; delete v1.slots[0].rev; delete v1.slots[0].hero.bossPts; delete v1.slots[0].hero.uspent;
v1.settings = { sound: false };
fs.writeFileSync(path.join(__dirname, 'v1.json'), JSON.stringify(v1, null, 1)); fs.writeFileSync(path.join(__dirname, 'v2.json'), JSON.stringify(v2, null, 1));
console.log('ok');
