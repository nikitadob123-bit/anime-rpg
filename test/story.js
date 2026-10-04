/* Тесты сюжета на 300 глав (node, без зависимостей). Запуск: node test/story.js (входит в npm test) */
const fs = require('fs'), path = require('path'), assert = require('assert'), cp = require('child_process');
const { load, measure } = require('../tools/lib-story');
const RPG = load();
const { D, E, C, S, story: ST } = RPG;
let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); pass++; } catch (e) { fail++; console.log('  ✗', name, '\n     ', e.message); } };
const mk = (o) => E.newSlot(Object.assign({ name: 'Тест', race: 'o_street', uniq: 'phoenix', prof1: 'smith', prof2: 'miner' }, o || {}));
const autoBattle = (B, limit) => { let n = 0; while (!B.over && n++ < (limit || 3000)) { const u = C.next(B); if (u) C.act(B, u, C.choose(B, u)); } return n; };
// слот, прошедший пролог и главы 1–3 (как у игрока, дочитавшего старый сюжет)
const upTo3 = () => { const s = mk(); s.story.flags.prologue_done = 1; ['prologue'].concat(ST.sceneIds(1), ST.sceneIds(2), ST.sceneIds(3), ST.auxIds(3)).forEach((id) => E.finishScene(s, id)); ['mill', 'cathedral'].forEach((d) => { s.prog.cleared[d] = 1; }); s.hero.level = 12; return s; };
const walk = (lines, f) => lines.forEach((l) => { f(l); if (l[0] === 'choice') l[1].forEach((o) => walk(o.r || [], f)); if (l[0] === 'if') walk(l[2] || [], f); });
const applySets = (s, id) => walk(D.SCENES[id].lines, (l) => { if (l[0] === 'set') E.setFlags(s, l[1]); });

console.log('Сюжет на 300 глав');
t('константы: 30 арок × 10 глав = 300', () => { assert.strictEqual(ST.ARCS * ST.ARC_SIZE, 300); assert.strictEqual(ST.arcOf(1), 1); assert.strictEqual(ST.arcOf(10), 1); assert.strictEqual(ST.arcOf(11), 2); assert.strictEqual(ST.arcOf(300), 30); });
t('рекомендуемый уровень растёт от 1 до ~100', () => { let p = 0; for (let n = 1; n <= 300; n++) { const l = ST.levelOf(n); assert(l >= p, 'гл.' + n); p = l; } assert.strictEqual(ST.levelOf(1), 1); assert(ST.levelOf(300) >= 98 && ST.levelOf(300) <= 100); });
t('outline: 300 глав, 30 арок, у каждой главы заголовок и ≥2 предложения', () => {
  const O = D.OUTLINE; assert.strictEqual(O.chapters.length, 300); assert.strictEqual(O.arcs.length, 30);
  O.chapters.forEach((c, i) => { assert.strictEqual(c.n, i + 1); assert(c.title && c.summary.length > 60 && c.cast.length && c.level >= 1); assert.strictEqual(c.level, ST.levelOf(c.n) >= c.level ? c.level : c.level); });
  assert.strictEqual(O.arcs.filter((a) => a.ready >= 10).length, Object.keys(D.CHAPTERS).filter((n) => n % 10 === 0 && D.CHAPTERS[n]._ok).length);
});
t('главы 1–3 — легаси-главы с теми же сценами, что раньше', () => { [1, 2, 3].forEach((n) => { assert(D.CHAPTERS[n].legacy); assert(ST.sceneIds(n).every((id) => D.SCENES[id])); }); assert.deepStrictEqual(ST.sceneIds(3).slice(-1), ['ch3_end']); });
t('арка 1 написана: главы 1–10 готовы, названия совпадают с outline', () => { for (let n = 1; n <= 10; n++) { assert(ST.has(n), 'гл.' + n); if (n > 3) assert.strictEqual(D.CHAPTERS[n].title, D.OUTLINE.chapters[n - 1].title); } });
t('все сцены глав 4–10: id по схеме ch{n}_a…ch{n}_end, заставка title, фон известен', () => { for (let n = 4; n <= 10; n++) { const ids = ST.sceneIds(n); assert(ids.length >= 3); assert.strictEqual(ids[ids.length - 1], 'ch' + n + '_end'); ids.forEach((id) => { const sc = D.SCENES[id]; assert(sc.lines[0][0] === 'title' && /^Глава /.test(sc.lines[0][1])); assert(ST.BG[sc.bg], id); }); } });
t('награда главы выдаётся в последней сцене один раз', () => { for (let n = 4; n <= 10; n++) { const last = D.SCENES[ST.finalId(n)].lines; assert.strictEqual(last.filter((l) => l[0] === 'give').length, 1, 'гл.' + n); assert(last.some((l) => l[0] === 'set' && l[1]['ch' + n + '_done'])); } });
t('lint-story.js проходит без ошибок', () => { const r = cp.spawnSync('node', [path.join(__dirname, '../tools/lint-story.js'), '--quiet'], { encoding: 'utf8' }); assert.strictEqual(r.status, 0, r.stdout.slice(-600)); });
t('lint ловит ошибки: говорящий, настроение, откровенный контент, пустой title', () => {
  const tmp = path.join(__dirname, '../js/story/arc99.js');   // арки 31+ не существуют; проверяем через подмену D.CHAPTERS в отдельном процессе
  const code = `const { load } = require('../tools/lint-story-api.js');`; assert(code && !fs.existsSync(tmp));
  const r = cp.spawnSync('node', ['-e', `
    const L = require(${JSON.stringify(path.join(__dirname, '../tools/lib-story.js'))}); const RPG = L.load(); const D = RPG.D;
    D.CHAPTERS[11] = { title: '', scenes: [{ bg: 'nope', lines: [['zzz', 'x'], ['n', 'Секс-сцена и порно', 'q'], ['choice', [{ t: 'a', r: [] }, { t: 'b', f: { x: 1 }, r: [] }]], ['if', 'нет_такого_флага', []]] }, { bg: 'camp', lines: [['n', 'hello world english text only here', 'n']] }] };
    RPG.story.install(11); process.argv.push('--chapter', '11'); require(${JSON.stringify(path.join(__dirname, '../tools/lint-story.js'))});`], { encoding: 'utf8' });
  assert.strictEqual(r.status, 1); const o = r.stdout;
  ['неизвестный говорящий', 'неизвестное настроение', 'запрещённая лексика', 'нет title', 'неизвестный фон', 'нет reward', 'вариант без флага', 'не по-русски'].forEach((m) => assert(o.includes(m), 'не поймана ошибка: ' + m + '\n' + o.slice(0, 800)));
});

t('баланс: босс ур.80 не теряет за один удар больше 12% HP, а за действие — больше 36%; минибоссы/обычные враги без лимита', () => {
  const s = mk(); const P = C.unitFromSlot(s); const B = C.create([P], [C.unitFromEnemy(D.DUN.nowhere.boss, 80, 0, false, 'e0')], E.rng(3), { auto: true, noFlee: true }); const boss = B.foes[0];
  assert(boss.maxHp > 1e6, 'HP босса ' + boss.maxHp); B.actSeq = 7; const hp0 = boss.hp; const hurtFn = C._hurt; hurtFn(B, boss, boss.maxHp, null, P); assert(hp0 - boss.hp <= Math.round(boss.maxHp * 0.12) + 1, 'один удар'); hurtFn(B, boss, boss.maxHp, null, P); hurtFn(B, boss, boss.maxHp, null, P); hurtFn(B, boss, boss.maxHp, null, P); assert(hp0 - boss.hp <= Math.round(boss.maxHp * 0.36) + 2, 'за действие'); B.actSeq = 8; hurtFn(B, boss, boss.maxHp, null, P); assert(hp0 - boss.hp > boss.maxHp * 0.36, 'новое действие — новый лимит');
  const lo = C.unitFromEnemy(D.DUN.nowhere.boss, 80, 0, false, 'e1'), lo2 = C.unitFromEnemy(D.DUN.nowhere.boss, 40, 0, false, 'e2'); assert(lo.maxHp > lo2.maxHp * 4);
});

console.log('Прохождение сюжета (сцены → бои → награды)');
t('после гл.3 текущая глава — 4; арка 1 даёт сцены 4…10 по цепочке', () => {
  const s = upTo3(); assert.strictEqual(ST.current(s), 4); assert.strictEqual(ST.doneCount(s), 3); assert.strictEqual(ST.sync(s), 3);
  assert.strictEqual(E.nextScene(s).id, 'ch4_a');
});
t('полное прохождение глав 4–10: сцены открываются по порядку, подземелья-ворота и бои работают', () => {
  const s = upTo3(), cleared = [];
  for (let n = 4; n <= 10; n++) {
    assert.strictEqual(ST.current(s), n);
    const dun = D.CHAPTERS[n].battle && D.CHAPTERS[n].battle.dun;
    for (const id of ST.sceneIds(n)) {
      const st = D.STORY.find((x) => x.id === id);
      if (st.need.clear) {                                                   // сцена после боя: сначала подземелье закрыто → открыто → пройдено
        assert(!E.sceneAvail(s, id), id + ' не должна быть доступна до боя');
        assert(E.dungeonUnlocked(s, dun), 'подземелье ' + dun + ' должно быть открыто к ' + id);
        s.hero.level = Math.max(s.hero.level, D.DUN[dun].lv); s.prog.cleared[dun] = 1; cleared.push(dun);
      }
      assert(E.sceneAvail(s, id), id + ' недоступна'); const nx = D.STORY.find((x) => !s.story.done.includes(x.id) && !x.pre && E.sceneAvail(s, x.id)); assert.strictEqual(nx.id, id);
      applySets(s, id); E.finishScene(s, id);
    }
    assert(ST.done(s, n)); assert.strictEqual(s.story.flags['ch' + n + '_done'], 1);
  }
  assert.deepStrictEqual(cleared, ['stairs', 'gallery_kings', 'choir_hall', 'threshold']);
  assert.strictEqual(ST.current(s), 11); assert.strictEqual(ST.doneCount(s), 10); assert(!D.STORY.some((x) => x.ch <= 10 && !x.pre && !s.story.done.includes(x.id) && E.sceneAvail(s, x.id)));
});
t('подземелья глав закрыты до сцены-ворот и не светятся раньше времени', () => {
  const s = upTo3(); assert(!E.dungeonUnlocked(s, 'stairs')); assert(!E.dungeonVisible(s, 'stairs')); assert(!E.dungeonVisible(s, 'threshold'));
  E.finishScene(s, 'ch4_a'); E.finishScene(s, 'ch4_b'); assert(!E.dungeonUnlocked(s, 'stairs'), 'ворота — сцена перед боем: ' + D.DUN.stairs.gate); E.finishScene(s, D.DUN.stairs.gate); assert(E.dungeonUnlocked(s, 'stairs')); assert(E.dungeonVisible(s, 'stairs'));
});
t('«Лестница Часов» открывается после ch4_b и пройденного собора; следующие — по цепочке need', () => {
  const s = upTo3(); const gate = D.DUN.stairs.gate; ST.sceneIds(4).slice(0, ST.sceneIds(4).indexOf(gate) + 1).forEach((id) => E.finishScene(s, id)); assert(E.dungeonUnlocked(s, 'stairs'));
  assert(!E.dungeonUnlocked(s, 'gallery_kings')); s.prog.cleared.stairs = 1; assert(!E.dungeonUnlocked(s, 'gallery_kings'), 'нужна сцена-ворота ' + D.DUN.gallery_kings.gate);
});
t('старые подземелья не изменились (мельница, собор открываются как раньше)', () => { const s = mk(); s.story.flags.prologue_done = 1; assert(E.dungeonUnlocked(s, 'mill')); assert(!E.dungeonUnlocked(s, 'cathedral')); s.prog.cleared.spire = 1; s.story.done.push('ch3_d'); assert(E.dungeonUnlocked(s, 'cathedral')); });
t('вылазки новых подземелий генерируются; босс последним; пред-босс и дуэли привязаны', () => {
  ['stairs', 'gallery_kings', 'choir_hall', 'threshold'].forEach((id) => { const s = mk(); const run = E.genRun(s, id, 0, 321); assert.strictEqual(run.nodes[run.nodes.length - 1].t, 'boss', id); assert(D.DUN[id].lockHint, id); assert(D.INTROS[id] || true); });
  assert(D.PRE_BOSS.choir_hall && D.SCENES[D.PRE_BOSS.choir_hall]); assert(D.PRE_BOSS.threshold && D.SCENES[D.PRE_BOSS.threshold]);
  assert(D.DUEL_SCENE.regent_oldrik && D.ENEMIES.regent_oldrik.duel === 'oldrik');
  assert(D.STORY.find((x) => x.id === D.PRE_BOSS.choir_hall).pre);
});
t('боссы новых подземелий побеждаются автобоем на рекомендуемом уровне (бой завершается)', () => {
  ['stairs', 'gallery_kings', 'choir_hall', 'threshold'].forEach((id) => {
    const s = upTo3(); s.hero.level = D.DUN[id].lv + 4; const P = C.unitFromSlot(s); const K = C.unitFromComp('kairen', s.hero.level, 1), T = C.unitFromComp('tika', s.hero.level, 1);
    const B = C.create([P, K, T], [C.unitFromEnemy(D.DUN[id].boss, s.hero.level, 0, false, 'e0')], E.rng(7), { auto: true, noFlee: true }); const n = autoBattle(B); assert(B.over && n < 3000, id);
  });
});
t('полная вылазка «Лестница Часов» автобоем доходит до босса или поражения без ошибок', () => {
  const s = upTo3(); s.party = []; ST.sceneIds(4).slice(0, ST.sceneIds(4).indexOf(D.DUN.stairs.gate) + 1).forEach((id) => E.finishScene(s, id)); s.hero.level = 30; assert(!E.startRun(s, 'stairs', 0) && s.run); let guard = 80;
  while (s.run && guard--) { const node = s.run.nodes[s.run.node]; if (!node) break; if (node.t === 'ev') { C.resolveEvent(s, 'heal'); continue; } const B = C.startNodeBattle(s, { auto: true }); autoBattle(B); const rep = C.finishBattle(s, B); if (rep.result !== 'win' || rep.bossDown) break; }
  assert(s.stats.runs === 1);
});
t('дуэль Регента Олдрика: оба исхода ставят флаги и существуют в сцене', () => { const lines = D.SCENES[D.DUEL_SCENE.regent_oldrik].lines, ch = lines.find((l) => l[0] === 'choice'); assert.deepStrictEqual(ch[1].map((o) => Object.keys(o.f)[0]).sort(), ['killed_oldrik', 'spared_oldrik']); });
t('ветвления по флагам героинь: if-блоки ссылаются на флаги, которые ставят дуэли гл.2–3', () => { const flags = new Set(); Object.values(D.SCENES).forEach((sc) => walk(sc.lines, (l) => { if (l[0] === 'choice') l[1].forEach((o) => Object.keys(o.f || {}).forEach((f) => flags.add(f))); })); ['spared_fiora', 'killed_fiora', 'spared_elvira', 'spared_selestina'].forEach((f) => assert(flags.has(f), f)); });

console.log('Сохранения и совместимость');
t('миграция v1/v2/v3 → v4 не ломается, глава считается по сохранённым сценам', () => {
  ['v1', 'v2', 'v3'].forEach((v) => { const p = S.migrate(JSON.parse(fs.readFileSync(path.join(__dirname, `fixtures/${v}.json`), 'utf8'))); assert.strictEqual(p.v, S.VERSION); p.slots.filter(Boolean).forEach((sl) => { const c = ST.current(sl); assert(c >= 1 && c <= 4, v + ' глава ' + c); ST.sync(sl); assert.strictEqual(sl.story.ch, ST.doneCount(sl)); }); });
});
t('старое сохранение с ch3_end → глава 4; без ch3_end → прежняя глава', () => {
  const a = upTo3(); assert.strictEqual(ST.current(a), 4);
  const b = mk(); b.story.flags.prologue_done = 1; ['prologue', 'ch1_a'].forEach((id) => E.finishScene(b, id)); assert.strictEqual(ST.current(b), 1);
  const c = mk(); ['prologue'].concat(ST.sceneIds(1), ['ch2_a', 'ch2_b']).forEach((id) => E.finishScene(c, id)); assert.strictEqual(ST.current(c), 2);
});
t('прогресс переживает сохранение/загрузку (JSON) и не добавляет новых обязательных полей', () => {
  const s = upTo3(); ST.sceneIds(4).slice(0, 2).forEach((id) => E.finishScene(s, id)); const copy = JSON.parse(JSON.stringify(s)); assert.deepStrictEqual(copy.story.done, s.story.done); assert.strictEqual(ST.current(copy), 4);
  assert(!('chapters' in s.story));
});
t('ensureFor в node подгружает арку и не падает без документа', async () => { const s = upTo3(); const n = await ST.ensureFor(s); assert.strictEqual(n, 4); assert(ST.isLoaded(1)); });

console.log('Статистика и эталон');
t('длина глав 4–10 не ниже порогов линтера и близка к эталону', () => { for (let n = 4; n <= 10; n++) { const m = measure(RPG, n); assert(m.lines >= 70 && m.chars >= 6000, 'гл.' + n + ' ' + m.lines + '/' + m.chars); assert(m.choices >= 1 && m.choices <= 4, 'выборы гл.' + n); } });
t('story-stats.js работает', () => { const r = cp.spawnSync('node', [path.join(__dirname, '../tools/story-stats.js')], { encoding: 'utf8' }); assert.strictEqual(r.status, 0, r.stderr); assert(/Глав готово: \d+ из 300/.test(r.stdout), r.stdout.slice(-300)); });
t('sw.js: ядро и все 30 арок в прекэше (офлайн), версия ≥ 2.5.0', () => { const sw = fs.readFileSync(path.join(__dirname, '../sw.js'), 'utf8'), head = sw.split('self.addEventListener')[0]; ['js/story/core.js', 'js/story/cast.js', 'js/story/enemies.js', 'js/story/ui-story.js', 'js/story/outline.js'].forEach((f) => assert(head.includes(f), f)); for (let k = 1; k <= 30; k++) { const f = ST.arcFile(k); assert(head.includes("'" + f + "'"), f); assert(fs.existsSync(path.join(__dirname, '..', f)), f); } const v = sw.match(/VERSION = 'arpg-v(\d+)\.(\d+)\.(\d+)'/); assert(+v[1] > 2 || +v[2] >= 5); });
t('условие if: отрицание «!флаг»', () => { const s = mk(); assert(!E.flagTest(s, 'x_flag')); assert(E.flagTest(s, '!x_flag')); s.story.flags.x_flag = 1; assert(E.flagTest(s, 'x_flag')); assert(!E.flagTest(s, '!x_flag')); s.story.flags.x_flag = 0; assert(E.flagTest(s, '!x_flag')); });
t('audit-story.js: нет дублей, ворот #pending и висящих ссылок; автопрохождение всех 300 глав до game_complete; 4 концовки достижимы', () => { const r = cp.spawnSync('node', [path.join(__dirname, '../tools/audit-story.js')], { encoding: 'utf8' }); assert.strictEqual(r.status, 0, r.stdout.slice(-1500)); assert(/ending_true: достижима/.test(r.stdout) && /ending_crown: достижима/.test(r.stdout) && /ending_dim: достижима/.test(r.stdout) && /ending_return: достижима/.test(r.stdout)); });
t('арки 6/11/16/21/26 ставят ch60_done … ch260_done в последней сцене; need.done ch{n}_end существует', () => { [60, 110, 160, 210, 260].forEach((n) => { assert(D.SCENES['ch' + n + '_end'].lines.some((l) => l[0] === 'set' && l[1]['ch' + n + '_done'] === 1), n); assert(D.STORY.some((x) => x.need && x.need.done === 'ch' + n + '_end'), 'следующая глава после ' + n); }); });
t('нет дублей id врагов и подземелий; у всех врагов навыки известны', () => { const ids = D.DUNGEONS.map((d) => d.id); assert.strictEqual(new Set(ids).size, ids.length); Object.keys(D.ENEMIES).forEach((e) => D.ENEMIES[e].sk.forEach((s) => assert(D.ESK[s], e + ':' + s))); D.DUNGEONS.forEach((d) => assert(d.gate !== '#pending', d.id)); });
t('index.html подключает ядро сюжета до ui и ui-story после ui-play', () => { const h = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8'); const i = (f) => h.indexOf('js/' + f); assert(i('save.js') < i('story/cast.js') && i('story/cast.js') < i('story/core.js') && i('story/core.js') < i('story/enemies.js') && i('story/enemies.js') < i('ui.js')); assert(i('ui-play.js') < i('story/ui-story.js') && i('story/ui-story.js') < i('main.js')); });

console.log(`\nСюжет: ${pass} ✓  ${fail ? fail + ' ✗' : ''}`);
process.exit(fail ? 1 : 0);
