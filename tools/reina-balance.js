/* v2.33.0: проверка баланса «Рангов Рейны». Запуск: node tools/reina-balance.js (входит в npm test).
   Рейна (ур. 100, ранг 10, без крови, без звёзд) должна быть сильнее каждого союзника Мировых артефактов
   на максимальной прокачке (артефакт ★5, эволюция ★5, потолок уровня) и любого другого члена Свиты на максимуме.
   Сравнение без снаряжения, при равной верности (100) и узах (10). */
const path = require('path'), assert = require('assert');
const J = (f) => path.join(__dirname, '..', 'js', f + '.js');
const RPG = require(J('data-core')); require(J('data-stats'));
['data-maou', 'data-maou2', 'data-prof', 'data-world', 'data-world2', 'data-crew', 'data-theme', 'data-story', 'data-story2', 'data-story3', 'data-romance', 'portrait', 'engine', 'stats', 'gear', 'combat', 'crew', 'save', 'artifact', 'dungeons-sp', 'pets', 'allies', 'data-craft-icons', 'craft', 'goals', 'challenge', 'life', 'tekken', 'tekken-roster', 'tekken-story', 'tekken-romance', 'tekken-reina-romance', 'tekken-meet', 'reina-asc', 'mail'].forEach((f) => require(J(f)));
const { E, D, C } = RPG;

function maxSlot() {
  const s = E.newSlot({ name: 'Баланс', race: 'human', uniq: 'phoenix', prof1: 'smith' });
  s.hero.level = D.LEVEL_CAP;
  D.ARTIFACTS.filter((a) => a.comp).forEach((a) => { s.arts[a.id] = 5; });
  D.CREW_IDS.forEach((id) => { s.crew[id] = { lv: 1, xp: 0, loy: 100, eq: {}, t: 0, star: E.isAlly(id) ? 0 : D.CREW_STAR_MAX, skl: D.CREW_SKL_MAX, bxp: 1e6, ev: E.isAlly(id) ? D.ALLY_STAR_MAX : 0 }; });
  return s;
}
const row = (s, id) => { const u = C.unitFromCrew(s, id, 1); return { id, n: D.CREW[id].n, lv: u.lv, hp: u.maxHp, off: Math.max(u.atk, u.mag), def: u.def, res: u.res, pow: E.crewPower(u) }; };

function report() {
  const s = maxSlot();
  // все, кроме Рейны — на своём потолке
  D.CREW_IDS.forEach((id) => { if (id !== 'tk_reina') s.crew[id].lv = E.crewCap(s, id); });
  const others = D.CREW_IDS.filter((id) => id !== 'tk_reina').map((id) => row(s, id));
  const allies = others.filter((r) => E.isAlly(r.id));
  const st = s.crew.tk_reina; st.star = 0; s.tk = s.tk || {}; s.tk.blood = 0;
  s.reinaAsc = { rank: 10, capBreak: 0 }; st.lv = 100; const r100 = row(s, 'tk_reina');
  s.reinaAsc.capBreak = 1; st.lv = 150; const r150 = row(s, 'tk_reina');
  s.reinaAsc = { rank: 0, capBreak: 0 }; st.lv = 100; const r0 = row(s, 'tk_reina');
  return { allies, others, r100, r150, r0 };
}

function check() {
  const R = report();
  assert(R.allies.length >= 2, 'союзники Мировых артефактов не найдены');
  R.allies.forEach((a) => {
    assert(R.r100.pow > a.pow, `сила: Рейна ${R.r100.pow} ≤ ${a.n} ${a.pow}`);
    assert(R.r100.hp > a.hp, `здоровье: Рейна ${R.r100.hp} ≤ ${a.n} ${a.hp}`);
    assert(R.r100.off > a.off, `атака: Рейна ${R.r100.off} ≤ ${a.n} ${a.off}`);
    assert(R.r100.def > a.def, `защита: Рейна ${R.r100.def} ≤ ${a.n} ${a.def}`);
  });
  const top = R.others.slice().sort((a, b) => b.pow - a.pow)[0];
  assert(R.r100.pow > top.pow, `Рейна не сильнейшая: ${top.n} ${top.pow}`);
  assert(R.r150.pow > R.r100.pow, 'ур. 150 должен быть сильнее ур. 100');
  return R;
}
module.exports = { report, check, maxSlot };

if (require.main === module) {
  const R = check();
  const f = (r) => `${r.n.padEnd(22)} ур.${String(r.lv).padStart(4)}  сила ${String(r.pow).padStart(7)}  ❤ ${String(r.hp).padStart(7)}  ⚔ ${String(r.off).padStart(6)}  🛡 ${String(r.def).padStart(6)}  ✨ ${String(r.res).padStart(6)}`;
  console.log('Баланс «Рангов Рейны»');
  R.allies.forEach((a) => console.log('  союзник  ' + f(a)));
  const top = R.others.filter((r) => !E.isAlly(r.id)).sort((a, b) => b.pow - a.pow)[0];
  console.log('  лучший из Свиты ' + f(top));
  console.log('  Рейна р0  ' + f(R.r0));
  console.log('  Рейна р10 ' + f(R.r100));
  console.log('  Рейна 150 ' + f(R.r150));
  console.log('  ✓ Рейна (ур. 100, ранг 10) сильнее всех союзников на максимуме');
}
