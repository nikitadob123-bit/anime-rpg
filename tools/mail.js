#!/usr/bin/env node
/* Почта «Нимба Мира»: управление лентой mail/inbox.json (её читают все игроки через GitHub Pages).
   node tools/mail.js add --title "Заголовок" --body "Текст" --gold 500 --item pot_hp2:3 --days 7
   node tools/mail.js list | remove <id> | check | ids
   Подробно — docs/MAIL.md. После изменения: git commit + git push, через ~1 минуту письмо увидят игроки. */
const fs = require('fs'), path = require('path');
const RPG = require('../js/data-core.js');
['data-stats', 'data-maou', 'data-maou2', 'data-prof', 'data-world', 'data-world2', 'data-crew', 'data-theme', 'data-story', 'data-story2', 'data-story3', 'data-romance', 'portrait', 'engine', 'stats', 'gear', 'combat', 'crew', 'save', 'mail'].forEach((f) => require('../js/' + f + '.js'));
const { D, M } = RPG;
const FILE = process.env.MAIL_FILE || path.join(__dirname, '..', 'mail', 'inbox.json');

const die = (msg) => { console.error('✗ ' + msg); process.exit(1); };
const read = () => { const raw = fs.readFileSync(FILE, 'utf8'); let j; try { j = JSON.parse(raw); } catch (e) { die('mail/inbox.json не читается: ' + e.message); } if (Array.isArray(j)) j = { letters: j }; j.letters = j.letters || []; return j; };
const write = (j) => fs.writeFileSync(FILE, JSON.stringify(j, null, 2) + '\n');
const day = (t) => new Date(t).toISOString().slice(0, 10);
const giftTxt = (g) => M.giftList(g).map((x) => `${x.ic} ${x.n}${x.q > 1 || !x.r ? ' ×' + x.q : ''}${x.r ? ' (' + x.r + ')' : ''}`).join(', ') || '—';

// разбор аргументов: --key value, повторяемые --item/--gear
function parseArgs(argv) {
  const o = { _: [], item: [], gear: [], unique: [], to: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { o._.push(a); continue; }
    const k = a.slice(2); const flag = ['new-players', 'dry-run', 'yes'].includes(k);
    const v = flag ? true : argv[++i]; if (v === undefined) die(`после ${a} нужно значение`);
    if (k === 'item' || k === 'gear' || k === 'unique' || k === 'to') o[k].push(...String(v).split(',').map((x) => x.trim()).filter(Boolean)); else o[k] = v;
  }
  return o;
}
const num = (v, name) => { const n = Number(v); if (!Number.isInteger(n) || n <= 0) die(`${name}: нужно целое число больше 0 (получено «${v}»)`); return n; };

function buildLetter(o, existing) {
  if (!o.title) die('нужен --title "Заголовок"');
  const now = Date.now();
  let id = o.id || ('m-' + day(now).replace(/-/g, '') + '-' + Math.random().toString(36).slice(2, 6));
  while (existing.has(id)) { if (o.id) die(`письмо с id «${id}» уже есть — выберите другой id`); id = 'm-' + day(now).replace(/-/g, '') + '-' + Math.random().toString(36).slice(2, 6); }
  const g = {};
  if (o.gold) g.gold = num(o.gold, '--gold');
  if (o.xp) g.xp = num(o.xp, '--xp');
  if (o.sp) g.sp = num(o.sp, '--sp');
  o.item.forEach((s) => {
    const [itemId, q] = String(s).split(/[:x×*]/); const n = q ? num(q, '--item ' + s) : 1;
    const kind = D.CONS[itemId] ? 'cons' : D.MATS[itemId] ? 'mats' : D.GIFTS[itemId] ? 'presents' : null;
    if (!kind) die(`--item: неизвестный предмет «${itemId}». Список: node tools/mail.js ids`);
    g[kind] = g[kind] || {}; g[kind][itemId] = (g[kind][itemId] || 0) + n;
  });
  o.gear.forEach((s) => {
    const [base, rarity, il] = String(s).split(':'); const x = { base, rarity: /^\d$/.test(rarity || '') ? +rarity : (rarity || 'common') };
    if (il) x.il = num(il, '--gear уровень'); if (o['gear-name']) x.nm = o['gear-name'];
    (g.gear = g.gear || []).push(x);
  });
  o.unique.forEach((u) => { if (!D.UNIQUE_ITEMS[u]) die(`--unique: неизвестный уникальный предмет «${u}» (есть: ${D.UNIQUE_IDS.join(', ')})`); (g.unique = g.unique || []).includes(u) || g.unique.push(u); });
  const L = { id, from: o.from || 'Администрация', title: String(o.title), body: String(o.body || '').replace(/\\n/g, '\n'), date: o.date || day(now) };
  if (o.days) L.expires = day(Date.parse(L.date) + num(o.days, '--days') * 864e5);   // дата включительно
  if (o.expires) L.expires = o.expires;
  const c = {};
  if (o['min-level']) c.minLevel = num(o['min-level'], '--min-level');
  if (o['min-chapter']) c.minChapter = num(o['min-chapter'], '--min-chapter');
  if (o['new-players']) c.newPlayersOnly = true;
  if (o['created-before']) c.createdBefore = o['created-before'];
  if (o['created-after']) c.createdAfter = o['created-after'];
  if (Object.keys(c).length) L.conditions = c;
  if (o.to.length) { L.to = o.to.map(M.normCode); L.to.forEach((x) => { if (!M.CODE_RE.test(x)) die(`--to: «${x}» — не код игрока (вид NM-XXXXXX, его видно во вкладке «Почта»)`); }); }
  if (Object.keys(g).length) L.gifts = g;
  const err = M.letterErrors(L); if (err.length) die('письмо с ошибками:\n  ' + err.join('\n  '));
  return L;
}

function show(L) {
  const exp = L.expires ? (M.isExpired(L) ? ` · ИСТЕКЛО ${L.expires}` : ` · до ${L.expires}`) : ' · без срока';
  console.log(`• ${L.id}  [${L.date || '—'}${exp}]\n  От: ${L.from || 'Администрация'} — «${L.title}»\n  Подарки: ${giftTxt(L.gifts)}${L.conditions ? '\n  Условия: ' + JSON.stringify(L.conditions) : ''}${L.to ? '\n  Кому: ' + [].concat(L.to).join(', ') : '\n  Кому: всем'}`);
}

const o = parseArgs(process.argv.slice(2)), cmd = o._[0];
if (cmd === 'add') {
  const j = read(), L = buildLetter(o, new Set(j.letters.map((x) => x && x.id)));
  if (o['dry-run']) { console.log(JSON.stringify(L, null, 2)); process.exit(0); }
  j.letters.push(L); write(j);
  console.log('✓ Письмо добавлено в mail/inbox.json:'); show(L);
  console.log('\nТеперь отправьте его игрокам:\n  git add mail/inbox.json && git commit -m "Письмо: ' + L.title.replace(/"/g, '') + '" && git push\nЧерез ~1 минуту (GitHub Pages) письмо придёт всем, кто играет с интернетом.');
} else if (cmd === 'list') {
  const j = read(); if (!j.letters.length) console.log('Писем нет.'); j.letters.forEach(show);
  const r = M.parseFeed(j); if (r.errors.length) console.log('\n⚠ Ошибки (такие письма игра пропустит):\n  ' + r.errors.join('\n  '));
} else if (cmd === 'remove' || cmd === 'rm') {
  const id = o._[1]; if (!id) die('укажите id: node tools/mail.js remove <id> (список — node tools/mail.js list)');
  const j = read(), n = j.letters.length; j.letters = j.letters.filter((x) => !x || x.id !== id); if (j.letters.length === n) die(`письма «${id}» нет`);
  write(j); console.log(`✓ Письмо «${id}» убрано из ленты. У тех, кто его уже получил, оно останется (и подарок второй раз не выдастся).`);
} else if (cmd === 'check') {
  const r = M.parseFeed(fs.readFileSync(FILE, 'utf8'));
  if (r.errors.length) { console.log('✗ Ошибки:\n  ' + r.errors.join('\n  ')); process.exit(1); }
  console.log(`✓ mail/inbox.json в порядке: писем ${r.letters.length}`);
} else if (cmd === 'ids') {
  const t = (title, obj) => console.log(`\n${title}\n` + Object.keys(obj).map((k) => `  ${k.padEnd(17)} ${obj[k].ic} ${obj[k].n}`).join('\n'));
  console.log('Типы подарков:\n' + Object.keys(M.GIFT_TYPES).map((k) => `  ${k.padEnd(9)} ${M.GIFT_TYPES[k]}`).join('\n'));
  t('Расходники (--item id:кол-во → cons):', D.CONS); t('Материалы (--item id:кол-во → mats):', D.MATS); t('Подарки Свите (--item id:кол-во → presents):', D.GIFTS);
  t('Снаряжение (--gear base:редкость[:уровень]):', D.BASES);
  console.log('\nУникальные предметы (--unique id) — единственный способ выдать «Концептуальный», «Исток» и «До существования»:\n' + D.UNIQUE_IDS.map((k) => `  ${k.padEnd(17)} ${D.UNIQUE_ITEMS[k].nm} (${D.RARITY[D.UNIQUE_ITEMS[k].r].n})`).join('\n')); console.log('  редкость: ' + M.RARITY_IDS.map((r, i) => `${i}=${r} (${D.RARITY[i].n})`).join(', '));
} else {
  console.log(`Почта «Нимба Мира» — mail/inbox.json

  node tools/mail.js add --title "Заголовок" --body "Текст письма" [подарки] [срок] [условия]
      подарки:  --gold 500  --xp 200  --sp 1  --item pot_hp2:3 (можно несколько)  --gear sword:rare[:уровень] [--gear-name "Имя"]
                редкость 0…7: common uncommon rare unique epic legend mythic divine (8+ через --gear запрещены)
                --unique eden_light — уникальный предмет (только так выдаётся «Концептуальный»):
                  eden_light abyss_dark hell_heart first_flame boundless_source chronos end_of_all
                  Исток (r 9): prime_cause zero_law first_division
                  До существования (r 10, один экземпляр): null_possibility
      кому:     --to NM-XXXXXX (код игрока из вкладки «Почта»; можно несколько через запятую) — без --to письмо всем
      срок:     --days 7  или  --expires 2026-12-31      дата письма: --date 2026-10-10 (письмо придёт в этот день)
      условия:  --min-level 10  --min-chapter 5  --new-players  --created-before 2026-10-01
      прочее:   --from "Ильвара"  --id my-letter-1  --dry-run (только показать)
  node tools/mail.js list            — все письма в ленте
  node tools/mail.js remove <id>     — убрать письмо из ленты
  node tools/mail.js check           — проверить файл на ошибки
  node tools/mail.js ids             — список id предметов для подарков
Подробно: docs/MAIL.md`);
}
