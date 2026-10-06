/* Тесты почты (node, без зависимостей): разбор ленты, валидация подарков, выдача один раз, миграция, срок, условия. Запуск: npm test */
const fs = require('fs'), path = require('path'), assert = require('assert');
const RPG = require('../js/data-core.js');
['data-stats', 'data-maou', 'data-maou2', 'data-prof', 'data-world', 'data-world2', 'data-crew', 'data-theme', 'data-story', 'data-story2', 'data-story3', 'data-romance', 'portrait', 'engine', 'stats', 'combat', 'crew', 'save', 'mail'].forEach((f) => require('../js/' + f + '.js'));
const { D, E, S, M } = RPG;
let pass = 0, fail = 0; const failed = [];
const t = (name, fn) => { try { fn(); pass++; } catch (e) { fail++; failed.push(name + ': ' + e.message); console.log('  ✗', name, '\n     ', e.message); } };
const mk = (o) => E.newSlot(Object.assign({ name: 'Тест', race: 'o_street', uniq: 'phoenix', prof1: 'smith', prof2: 'miner', now: Date.parse('2026-10-01') }, o || {}));
const DAY = 864e5, NOW = Date.parse('2026-10-06T12:00:00Z');
const L = (o) => Object.assign({ id: 'test-1', from: 'Администрация', title: 'Привет', body: 'Текст', date: '2026-10-05', gifts: { gold: 500 } }, o || {});

console.log('Почта: лента и валидация');
t('mail/inbox.json валиден, есть стартовое письмо с подарком без срока', () => {
  const raw = fs.readFileSync(path.join(__dirname, '../mail/inbox.json'), 'utf8'); const r = M.parseFeed(raw);
  assert.deepStrictEqual(r.errors, []); assert(r.letters.length >= 1);
  const w = r.letters.find((x) => x.from === 'Администрация' && /Добро пожаловать/.test(x.title)); assert(w, 'нет письма запуска'); assert(!w.expires); assert(w.gifts.gold > 0 && M.giftList(w.gifts).length >= 2);
});
t('parseFeed: битый JSON и битые письма не роняют игру, хорошие проходят', () => {
  assert.deepStrictEqual(M.parseFeed('{oops').letters, []); assert(M.parseFeed('{oops').errors.length === 1);
  assert.deepStrictEqual(M.parseFeed({ nope: 1 }).letters, []);
  const r = M.parseFeed({ letters: [L(), L({ id: 'bad id!' }), L({ id: 'g2', gifts: { gold: -5 } }), L({ id: 'g3', gifts: { mats: { nope: 1 } } }), L({ id: 'test-1' }), L({ id: 'ok2', gifts: [{ gold: 1 }, { gold: 2, cons: { pot_hp1: 1 } }] })] });
  assert.deepStrictEqual(r.letters.map((x) => x.id), ['test-1', 'ok2']); assert.strictEqual(r.errors.length, 4);
  assert.strictEqual(r.letters[1].gifts.gold, 3); assert.strictEqual(r.letters[1].gifts.cons.pot_hp1, 1);
  assert(M.parseFeed([L()]).letters.length === 1, 'голый массив тоже можно');
});
t('giftErrors: все типы подарков проверяются по данным игры', () => {
  assert.deepStrictEqual(M.giftErrors({ gold: 10, xp: 50, sp: 1, cons: { pot_hp2: 2 }, mats: { ore_fe: 3 }, presents: { flowers: 1 }, gear: [{ base: 'sword', rarity: 'rare', il: 10 }, { base: 'ring', rarity: 4, nm: 'Кольцо Короля' }] }), []);
  assert(M.giftErrors({ gems: 5 })[0].includes('неизвестный тип'));
  assert(M.giftErrors({ gear: [{ base: 'laser', rarity: 1 }] }).length === 1);
  assert(M.giftErrors({ gear: [{ base: 'sword', rarity: 9 }] }).length === 1);
  assert(M.giftErrors({ cons: { pot_hp1: 1.5 } }).length === 1);
  assert(M.giftErrors({ gold: '100' }).length === 1);
  Object.keys(M.GIFT_TYPES).forEach((k) => assert(['gold', 'xp', 'sp', 'cons', 'mats', 'presents', 'gear'].includes(k)));
});

console.log('Почта: доставка и подарки');
t('deliver: повторная загрузка ленты не дублирует письма', () => {
  const s = mk(), feed = M.parseFeed({ letters: [L()] }).letters;
  assert.strictEqual(M.deliver(s, feed, NOW), 1); assert.strictEqual(M.deliver(s, feed, NOW), 0); assert.strictEqual(M.deliver(s, M.parseFeed({ letters: [L()] }).letters, NOW + DAY), 0);
  assert.strictEqual(s.mail.list.length, 1); assert.strictEqual(M.count(s, NOW), 1);
});
t('claim: подарок выдаётся ровно один раз; после удаления и повторной ленты — не возвращается', () => {
  const s = mk(), g0 = s.gold, feed = M.parseFeed({ letters: [L({ gifts: { gold: 500, cons: { pot_hp2: 2 }, mats: { ore_fe: 3 }, presents: { flowers: 1 }, sp: 1, xp: 30 } })] }).letters;
  M.deliver(s, feed, NOW); const r = M.claim(s, 'test-1', NOW); assert(r.ok, r.err);
  assert.strictEqual(s.gold, g0 + 500); assert.strictEqual(s.cons.pot_hp2, 2); assert.strictEqual(s.mats.ore_fe, 3); assert.strictEqual(s.gifts.flowers, 1); assert.strictEqual(s.hero.bossPts, 1);
  const r2 = M.claim(s, 'test-1', NOW); assert(!r2.ok); assert.strictEqual(s.gold, g0 + 500);
  assert(M.remove(s, 'test-1', NOW)); assert.strictEqual(s.mail.list.length, 0);
  assert.strictEqual(M.deliver(s, feed, NOW + DAY), 0, 'удалённое письмо не вернулось'); assert.strictEqual(s.gold, g0 + 500);
});
t('перевод часов назад/вперёд не даёт повторной выдачи', () => {
  const s = mk(), feed = M.parseFeed({ letters: [L()] }).letters; M.deliver(s, feed, NOW); M.claim(s, 'test-1', NOW); const g = s.gold;
  [NOW - 365 * DAY, NOW + 365 * DAY, 0].forEach((tm) => { M.deliver(s, feed, tm); M.claim(s, 'test-1', tm); M.claimAll(s, tm); });
  assert.strictEqual(s.gold, g); assert.strictEqual(s.mail.list.length, 1);
});
t('claimAll: забирает все доступные, пропускает истёкшие и уже забранные', () => {
  const s = mk(), g0 = s.gold;
  M.deliver(s, M.parseFeed({ letters: [L({ id: 'a', gifts: { gold: 10 } }), L({ id: 'b', gifts: { gold: 20 } }), L({ id: 'c', gifts: { gold: 40 }, expires: '2026-10-07' }), L({ id: 'n', gifts: {} })] }).letters, NOW);
  M.claim(s, 'a', NOW); const r = M.claimAll(s, NOW + 3 * DAY);
  assert.strictEqual(r.n, 1); assert.strictEqual(r.sum.gold, 20); assert.strictEqual(s.gold, g0 + 30);
  assert(M.isExpired(M.find(s, 'c'), NOW + 3 * DAY)); assert(!M.claim(s, 'c', NOW + 3 * DAY).ok);
  M.ensure(s).list.forEach((x) => M.markRead(s, x.id)); assert.strictEqual(M.removeDone(s, NOW + 3 * DAY), 4, 'истёкшее, пустое и забранные удаляются');
});
t('снаряжение из письма: одинаковое при повторе (seed = id), уровень героя по умолчанию', () => {
  const a = mk(), b = mk(); a.hero.level = b.hero.level = 12; const f = M.parseFeed({ letters: [L({ id: 'gear-1', gifts: { gear: [{ base: 'sword', rarity: 'epic' }, { base: 'ring', rarity: 2, il: 5, nm: 'Перстень вестника' }] } })] }).letters;
  [a, b].forEach((s) => { M.deliver(s, f, NOW); assert(M.claim(s, 'gear-1', NOW).ok); });
  const ia = a.inv.slice(-2), ib = b.inv.slice(-2); assert.strictEqual(ia.length, 2); assert.deepStrictEqual(ia.map((x) => x.st), ib.map((x) => x.st));
  assert.strictEqual(ia[0].r, 3); assert.strictEqual(ia[0].il, 12); assert.strictEqual(ia[1].nm, 'Перстень вестника'); assert.strictEqual(ia[1].il, 5);
});

console.log('Почта: срок и условия');
t('истёкшее письмо не доставляется; доставленное и истёкшее — помечено, подарок не выдаётся', () => {
  const s = mk(); assert.strictEqual(M.deliver(s, M.parseFeed({ letters: [L({ expires: '2026-10-01' })] }).letters, NOW), 0);
  const s2 = mk(), g = s2.gold; M.deliver(s2, M.parseFeed({ letters: [L({ expires: '2026-10-08' })] }).letters, NOW);
  assert(!M.claim(s2, 'test-1', NOW + 5 * DAY).ok); assert.strictEqual(s2.gold, g); assert.strictEqual(M.count(s2, NOW + 5 * DAY), 1, 'непрочитанное'); M.markRead(s2, 'test-1'); assert.strictEqual(M.count(s2, NOW + 5 * DAY), 0);
});
t('запланированное письмо (дата в будущем) приходит в свой день', () => { const s = mk(), f = M.parseFeed({ letters: [L({ date: '2026-10-20' })] }).letters; assert.strictEqual(M.deliver(s, f, NOW), 0); assert.strictEqual(M.deliver(s, f, Date.parse('2026-10-20T10:00:00Z')), 1); });
t('условия: minLevel и minChapter — письмо ждёт, пока герой дорастёт', () => {
  const s = mk(), f = M.parseFeed({ letters: [L({ id: 'lv', conditions: { minLevel: 10 } }), L({ id: 'ch', conditions: { minChapter: 5 } })] }).letters;
  assert.strictEqual(M.deliver(s, f, NOW), 0); s.hero.level = 10; assert.strictEqual(M.deliver(s, f, NOW), 1); s.story.ch = 5; assert.strictEqual(M.deliver(s, f, NOW), 1);
});
t('условия: newPlayersOnly / createdAfter / createdBefore', () => {
  const old = mk({ now: Date.parse('2026-09-01') }), nw = mk({ now: Date.parse('2026-10-06T08:00:00Z') }), legacy = mk({ now: 0 });
  const f = M.parseFeed({ letters: [L({ id: 'np', date: '2026-10-05', conditions: { newPlayersOnly: true } }), L({ id: 'vet', conditions: { createdBefore: '2026-10-01' } }), L({ id: 'ca', conditions: { createdAfter: '2026-09-15' } })] }).letters;
  [old, nw, legacy].forEach((s) => M.deliver(s, f, NOW));
  const ids = (s) => s.mail.list.map((x) => x.id).sort().join(',');
  assert.strictEqual(ids(old), 'vet'); assert.strictEqual(ids(nw), 'ca,np'); assert.strictEqual(ids(legacy), 'vet');
});

console.log('Почта: сохранения и письма игры');
t('миграция: старые сохранения (v1/v2/v3) загружаются и получают пустой ящик; формат v5 не меняется', () => {
  ['v1', 'v2', 'v3'].forEach((v) => { const p = S.migrate(JSON.parse(fs.readFileSync(path.join(__dirname, `fixtures/${v}.json`), 'utf8'))); assert(S.validate(p)); assert.strictEqual(p.v, S.VERSION); const sl = p.slots[0]; assert(Array.isArray(sl.mail.list) && sl.mail.seen && sl.mail.claimed && typeof sl.mail.arcBase === 'number'); });
  const s = mk(); delete s.mail; const p = S.migrate({ v: 5, id: 'x', nick: 'a', settings: S.defaultSettings(), slots: [s, null, null] }); assert.deepStrictEqual(p.slots[0].mail.list, []);
  const s2 = mk(); s2.mail = { list: 'junk' }; M.ensure(s2); assert(Array.isArray(s2.mail.list));
});
t('сохранение → загрузка: письма, прочитанность и выданные подарки сохраняются', () => {
  const m = {}; S.store = { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: (k) => { delete m[k]; } };
  const p = S.newProfile('Тест', '🦉'); p.slots[0] = mk(); M.deliver(p.slots[0], M.parseFeed({ letters: [L()] }).letters, NOW); M.claim(p.slots[0], 'test-1', NOW); assert(S.save(p).ok);
  const q = S.load(p.id).p, sl = q.slots[0]; assert.strictEqual(sl.mail.list[0].claimed, 1); assert(sl.mail.claimed['test-1']); const g = sl.gold; assert(!M.claim(sl, 'test-1', NOW).ok); assert.strictEqual(sl.gold, g);
});
t('письма игры: приветствие один раз; за арку — только за арки после появления почты', () => {
  const s = mk(); assert.strictEqual(s.mail.arcBase, 0);
  assert.strictEqual(M.deliver(s, M.localLetters(s), NOW), 1); assert.strictEqual(M.deliver(s, M.localLetters(s), NOW), 0); assert.strictEqual(M.find(s, 'loc-welcome').src, 'local');
  s.story.ch = 20; assert.strictEqual(M.deliver(s, M.localLetters(s), NOW), 2); assert(M.find(s, 'loc-arc-2'));
  const vet = mk(); delete vet.mail; vet.story.ch = 47; M.ensure(vet); assert.strictEqual(vet.mail.arcBase, 4); assert.strictEqual(M.deliver(vet, M.localLetters(vet), NOW), 1, 'только приветствие');
  vet.story.ch = 50; assert.strictEqual(M.deliver(vet, M.localLetters(vet), NOW), 1); assert(M.find(vet, 'loc-arc-5'));
  M.localLetters(s).forEach((x) => assert.deepStrictEqual(M.giftErrors(x.gifts), [], x.id));
});
t('переполнение ящика: старые закрытые письма уходят, незабранные подарки — нет', () => {
  const s = mk(); const many = []; for (let i = 0; i < 70; i++) many.push(L({ id: 'm' + i, gifts: i < 5 ? { gold: 1 } : {} }));
  const f = M.parseFeed({ letters: many }).letters; M.deliver(s, f.slice(0, 5), NOW); M.ensure(s).list.forEach((x) => M.markRead(s, x.id));
  M.deliver(s, f.slice(5, 40), NOW); M.ensure(s).list.forEach((x) => M.markRead(s, x.id)); M.deliver(s, f.slice(40), NOW);
  assert(s.mail.list.length <= M.MAX_LIST + 5); ['m0', 'm1', 'm2', 'm3', 'm4'].forEach((id) => assert(M.find(s, id), 'незабранный подарок пропал: ' + id));
});
t('sw.js: лента mail/* идёт мимо кэша (network-only)', () => { const sw = fs.readFileSync(path.join(__dirname, '../sw.js'), 'utf8'); assert(sw.includes('/\\/mail\\//.test(url.pathname)) return;')); assert(sw.includes('js/mail.js') && sw.includes('js/ui-mail.js')); assert(!/'mail\/inbox\.json'/.test(sw.split('const ASSETS')[1].split('];')[0]), 'лента не в прекэше'); });
t('index.html подключает mail.js, ui-mail.js и css/mail.css (в прекэше SW)', () => { const h = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8'); assert(h.indexOf('css/mail.css') > h.indexOf('css/demon.css')); assert(fs.readFileSync(path.join(__dirname, '../sw.js'), 'utf8').includes("'css/mail.css'")); assert(h.indexOf('js/mail.js') > h.indexOf('js/save.js')); assert(h.indexOf('js/ui-mail.js') > h.indexOf('js/ui-game.js') && h.indexOf('js/ui-mail.js') < h.indexOf('js/main.js')); });
t('expires «только дата» действует весь день включительно', () => { const x = { expires: '2026-10-13' }; assert(!M.isExpired(x, Date.parse('2026-10-13T20:00:00Z'))); assert(M.isExpired(x, Date.parse('2026-10-14T00:30:00Z'))); assert(M.isExpired({ expires: '2026-10-13T10:00:00Z' }, Date.parse('2026-10-13T11:00:00Z'))); });
t('tools/mail.js: add/list/remove/check работают с файлом и не пропускают ошибки', () => {
  const { execFileSync } = require('child_process'), os = require('os'); const f = path.join(os.tmpdir(), 'inbox-test-' + process.pid + '.json');
  fs.writeFileSync(f, JSON.stringify({ letters: [] })); const run = (args) => execFileSync('node', [path.join(__dirname, '../tools/mail.js')].concat(args), { env: Object.assign({}, process.env, { MAIL_FILE: f }), encoding: 'utf8', stdio: 'pipe' });
  run(['add', '--title', 'Тест', '--body', 'А\\nБ', '--gold', '500', '--item', 'pot_hp2:2', '--item', 'flowers', '--item', 'ore_fe:3', '--gear', 'sword:epic', '--days', '7', '--date', '2026-10-06', '--min-level', '5']);
  run(['add', '--title', 'Второе', '--sp', '1', '--id', 'second']);
  const j = JSON.parse(fs.readFileSync(f, 'utf8')); assert.strictEqual(j.letters.length, 2); const a = j.letters[0];
  assert(/^m-\d{8}-[a-z0-9]{4}$/.test(a.id), a.id); assert.notStrictEqual(a.id, j.letters[1].id); assert.strictEqual(a.body, 'А\nБ'); assert.strictEqual(a.expires, '2026-10-13'); assert.deepStrictEqual(a.conditions, { minLevel: 5 });
  assert.deepStrictEqual(a.gifts, { gold: 500, cons: { pot_hp2: 2 }, presents: { flowers: 1 }, mats: { ore_fe: 3 }, gear: [{ base: 'sword', rarity: 'epic' }] });
  assert.deepStrictEqual(M.parseFeed(j).errors, []); assert(run(['check']).includes('писем 2')); assert(run(['list']).includes('Второе'));
  assert.throws(() => run(['add', '--title', 'x', '--item', 'nope'])); assert.throws(() => run(['add', '--title', 'x', '--gold', '-1'])); assert.throws(() => run(['add', '--title', 'x', '--id', 'second']));
  run(['remove', 'second']); assert.strictEqual(JSON.parse(fs.readFileSync(f, 'utf8')).letters.length, 1); fs.unlinkSync(f);
});

console.log(`\nПочта: ${pass} ✓, ${fail} ✗`);
if (fail) { console.log(failed.join('\n')); process.exit(1); }
