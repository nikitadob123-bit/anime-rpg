/* v2.30 Полный состав Теккен 8 (база + DLC на ноябрь 2026, без Юдзиро Ханмы — он в 2027).
   Расширяет сетку, навыки, врагов и записи Свиты. Сюжет и романы — в соседних файлах. */
(function () {
  const RPG = globalThis.RPG, D = RPG.D, E = RPG.E, C = RPG.C;
  const SK = D.SKILLS;
  const sk = (id, n, ic, o) => { SK[id] = Object.assign({ id, n, ic, mp: 0, cd: 2, tgt: 'foe', fx: [{ k: 'dmg', s: 'atk', m: 1.5 }] }, o); return id; };

  sk('tk_e_box', 'Джеб-кросс', '🥊', { cd: 1, d: 'Серия 80%×2.', fx: [{ k: 'dmg', s: 'atk', m: 0.8, hits: 2 }] });
  sk('tk_e_capo', 'Жинга', '🌀', { cd: 2, d: 'Удар 150%, «Ускорение».', fx: [{ k: 'dmg', s: 'atk', m: 1.5 }, { k: 'st', id: 'haste', dur: 2, to: 'self' }] });
  sk('tk_e_sword', 'Клинок', '⚔️', { cd: 2, d: 'Удар 170%.', fx: [{ k: 'dmg', s: 'atk', m: 1.7 }] });
  sk('tk_e_gun', 'Выстрел', '🔫', { cd: 2, d: 'Дальний удар 160%.', fx: [{ k: 'dmg', s: 'atk', m: 1.6 }] });
  sk('tk_e_karate', 'Сейкен', '🥋', { cd: 1, d: 'Каратэ 155%.', fx: [{ k: 'dmg', s: 'atk', m: 1.55 }] });
  sk('tk_e_muay', 'Колено', '🦵', { cd: 2, d: 'Муай-тай 180%.', fx: [{ k: 'dmg', s: 'atk', m: 1.8 }] });
  sk('tk_e_copy', 'Кадозепа', '⚡', { cd: 3, d: 'Молния 200%, 25% оглушить.', fx: [{ k: 'dmg', s: 'atk', m: 2.0, el: 'bolt' }, { k: 'st', id: 'stun', p: 0.25, dur: 1 }] });
  sk('tk_e_prophecy', 'Азраэль', '🔮', { cd: 3, tgt: 'foes', d: 'Тьма 90% по всем.', fx: [{ k: 'dmg', s: 'mag', m: 0.9, el: 'dark' }] });
  sk('tk_e_coffee', 'Эспрессо', '☕', { cd: 2, d: 'Удар 140% и «Слабость».', fx: [{ k: 'dmg', s: 'atk', m: 1.4 }, { k: 'st', id: 'weak', p: 1, dur: 2 }] });
  sk('tk_e_pride', 'Пируэт', '💎', { cd: 2, d: 'Удар 165%.', fx: [{ k: 'dmg', s: 'atk', m: 1.65 }] });
  sk('tk_e_noshin', 'Носин-ган', '✨', { cd: 3, d: 'Свет 150%, лечение себе 20%.', fx: [{ k: 'dmg', s: 'mag', m: 1.5, el: 'light' }, { k: 'heal', m: 0.8 }] });
  sk('tk_e_wing', 'Крыло', '🕊️', { cd: 2, d: 'Удар 150%.', fx: [{ k: 'dmg', s: 'atk', m: 1.5 }] });
  sk('tk_e_chain', 'Цепь', '⛓️', { cd: 2, d: 'Удар 145%, «Уязвимость».', fx: [{ k: 'dmg', s: 'atk', m: 1.45 }, { k: 'st', id: 'vuln', p: 0.7, dur: 2 }] });
  sk('tk_e_beast', 'Зверь', '🐾', { cd: 2, d: 'Удар 170%.', fx: [{ k: 'dmg', s: 'atk', m: 1.7 }] });
  sk('tk_e_ff', 'Примесенс', '🔥', { cd: 3, d: 'Огонь 190%.', fx: [{ k: 'dmg', s: 'mag', m: 1.9, el: 'fire' }] });
  sk('tk_e_kunai', 'Кунай', '🗡️', { cd: 1, d: 'Три удара 65%.', fx: [{ k: 'dmg', s: 'atk', m: 0.65, hits: 3 }] });
  sk('tk_e_bounce', 'Отскок', '🦘', { cd: 2, d: 'Удар 160%.', fx: [{ k: 'dmg', s: 'atk', m: 1.6 }] });

  const ten = (id, o) => { o.id = id; o.loot = o.loot || []; D.ENEMIES[id] = o; };
  const F = [];
  const add = (id, n, ic, role, sks, extra) => {
    extra = extra || {};
    ten('tk_' + id, Object.assign({ n, ic, role, tags: extra.tags || ['human'], sk: sks, art: 'tk_' + id }, extra.en || {}));
    F.push(Object.assign({ id, en: 'tk_' + id, n, ic, off: extra.off != null ? extra.off : Math.min(22, F.length) }, extra.f || {}));
  };

  // прежние 11 — тот же порядок, чтобы старые сохранения продолжили сетку честно
  add('paul', 'Пол Феникс', '🔥', 'brute', ['tk_e_punch', 'tk_e_kick', 'tk_e_rush'], { off: 0 });
  add('law', 'Маршалл Ло', '🥋', 'skirm', ['tk_e_kick', 'tk_e_rush', 'tk_e_punch'], { off: 2 });
  add('king', 'Кинг', '🐯', 'tank', ['tk_e_throw', 'tk_e_punch', 'tk_e_rush'], { off: 4 });
  add('nina', 'Нина Уильямс', '🗡️', 'skirm', ['tk_e_rush', 'tk_e_kick', 'e_shade'], { off: 6 });
  add('hwoarang', 'Хворан', '🦵', 'skirm', ['tk_e_kick', 'tk_e_rush', 'tk_e_punch'], { off: 8 });
  add('lars', 'Ларс Александерссон', '⚔️', 'brute', ['tk_e_punch', 'tk_e_electric', 'tk_e_rush'], { off: 10 });
  add('jun', 'Джун Кадзама', '🕊️', 'caster', ['tk_e_heal', 'e_smite', 'tk_e_kick'], { off: 12, en: { weak: ['dark'] } });
  add('heihachi', 'Хэйхати Мисима', '👴', 'mini', ['tk_e_punch', 'tk_e_electric', 'tk_e_throw', 'tk_e_rush'], { off: 14, en: { tags: ['human', 'spirit'], ph2: 'enrage' } });
  add('kazuya', 'Кадзуя Мисима', '👿', 'boss', ['tk_e_electric', 'tk_e_punch', 'tk_e_laser', 'tk_e_rush'], { off: 16, en: { el: 'dark', ph2: 'enrage' } });
  add('jin', 'Дзин Кадзама', '👊', 'boss', ['tk_e_electric', 'tk_e_rush', 'tk_e_kick', 'tk_e_punch'], { off: 18, en: { ph2: 'enrage' } });
  add('deviljin', 'Дьявольский Дзин', '😈', 'boss', ['tk_e_laser', 'tk_e_electric', 'tk_e_rush', 'tk_e_kick'], { off: 22, en: { tags: ['human', 'spirit'], el: 'dark', ph2: 'enrage', weak: ['light'] } });

  // остальные бойцы базы и DLC (на ноябрь 2026; Юдзиро Ханма ещё не вышел)
  add('asuka', 'Асука Кадзама', '🥋', 'skirm', ['tk_e_karate', 'tk_e_throw', 'tk_e_punch'], { off: 3 });
  add('xiaoyu', 'Лин Сяоюй', '🎀', 'skirm', ['tk_e_kick', 'tk_e_rush', 'tk_e_punch'], { off: 3 });
  add('lili', 'Лили', '💎', 'skirm', ['tk_e_pride', 'tk_e_kick', 'tk_e_rush'], { off: 5 });
  add('alisa', 'Алиса Босконович', '🤖', 'skirm', ['tk_e_chain', 'tk_e_gun', 'tk_e_kick'], { off: 7, en: { tags: ['construct'] } });
  add('leo', 'Лео Клизен', '⛏️', 'brute', ['tk_e_punch', 'tk_e_kick', 'tk_e_throw'], { off: 6 });
  add('zafina', 'Зафина', '🔮', 'caster', ['tk_e_prophecy', 'e_shade', 'tk_e_kick'], { off: 9, en: { el: 'dark' } });
  add('azucena', 'Асусена Ортис', '☕', 'skirm', ['tk_e_coffee', 'tk_e_kick', 'tk_e_rush'], { off: 5 });
  add('reina', 'Рейна Мисима', '⚡', 'brute', ['tk_e_copy', 'tk_e_electric', 'tk_e_punch', 'tk_e_rush'], { off: 15, en: { ph2: 'enrage' } });
  add('steve', 'Стив Фокс', '🥊', 'skirm', ['tk_e_box', 'tk_e_punch', 'tk_e_rush'], { off: 6 });
  add('feng', 'Фэн Вэй', '👊', 'brute', ['tk_e_karate', 'tk_e_punch', 'tk_e_throw'], { off: 8 });
  add('shaheen', 'Шахиин', '🏜️', 'skirm', ['tk_e_sword', 'tk_e_kick', 'tk_e_punch'], { off: 7 });
  add('raven', 'Рэйвен', '🦅', 'skirm', ['tk_e_kunai', 'e_shade', 'tk_e_kick'], { off: 8 });
  add('dragunov', 'Сергей Драгунов', '❄️', 'brute', ['tk_e_throw', 'tk_e_punch', 'tk_e_rush'], { off: 9 });
  add('yoshimitsu', 'Ёсимицу', '🗡️', 'skirm', ['tk_e_sword', 'tk_e_kunai', 'tk_e_heal'], { off: 8 });
  add('jack', 'Джек-8', '🤖', 'tank', ['tk_e_punch', 'tk_e_gun', 'tk_e_rush'], { off: 10, en: { tags: ['construct'] } });
  add('kuma', 'Кума', '🐻', 'tank', ['tk_e_beast', 'tk_e_throw', 'tk_e_punch'], { off: 6, en: { tags: ['beast'] } });
  add('panda', 'Панда', '🐼', 'tank', ['tk_e_beast', 'tk_e_throw', 'tk_e_punch'], { off: 6, en: { tags: ['beast'] } });
  add('bryan', 'Брайан Фьюри', '💀', 'brute', ['tk_e_punch', 'tk_e_rush', 'tk_e_kick'], { off: 11, en: { tags: ['undead'] } });
  add('claudio', 'Клаудио Серафино', '✨', 'caster', ['tk_e_noshin', 'e_smite', 'tk_e_punch'], { off: 9, en: { el: 'light' } });
  add('lee', 'Ли Чаолан', '🕶️', 'skirm', ['tk_e_kick', 'tk_e_rush', 'tk_e_pride'], { off: 8 });
  add('leroy', 'Лерой Смит', '🥋', 'tank', ['tk_e_punch', 'tk_e_throw', 'tk_e_kick'], { off: 8 });
  add('victor', 'Виктор Шевалье', '🎩', 'skirm', ['tk_e_sword', 'tk_e_gun', 'tk_e_rush'], { off: 10 });
  add('eddy', 'Эдди Гордо', '🌀', 'skirm', ['tk_e_capo', 'tk_e_kick', 'tk_e_rush'], { off: 7 });
  add('lidia', 'Лидия Собеская', '⚖️', 'brute', ['tk_e_karate', 'tk_e_punch', 'tk_e_kick'], { off: 9 });
  add('clive', 'Клайв Росфилд', '🔥', 'brute', ['tk_e_ff', 'tk_e_sword', 'tk_e_punch'], { off: 12, en: { el: 'fire' } });
  add('anna', 'Анна Уильямс', '💃', 'skirm', ['tk_e_rush', 'tk_e_kick', 'tk_e_pride'], { off: 7 });
  add('fahkumram', 'Факумрам', '🦵', 'brute', ['tk_e_muay', 'tk_e_kick', 'tk_e_punch'], { off: 11 });
  add('armorking', 'Армор Кинг', '🐆', 'tank', ['tk_e_throw', 'tk_e_punch', 'tk_e_rush'], { off: 12 });
  add('miary', 'Миари Зо', '🌿', 'skirm', ['tk_e_beast', 'tk_e_kick', 'tk_e_rush'], { off: 10 });
  add('kuni', 'Кунимицу', '🥷', 'skirm', ['tk_e_kunai', 'tk_e_sword', 'e_shade'], { off: 9 });
  add('bob', 'Боб', '💨', 'brute', ['tk_e_rush', 'tk_e_punch', 'tk_e_kick'], { off: 8 });
  add('roger', 'Роджер-младший', '🦘', 'skirm', ['tk_e_bounce', 'tk_e_kick', 'tk_e_punch'], { off: 7, en: { tags: ['beast'] } });

  D.TK_FIGHTERS = F;
  D.TK_FIGHTER = {}; F.forEach((f, i) => { f.i = i; D.TK_FIGHTER[f.id] = f; });
  D.TK_OLD_LADDER = ['paul', 'law', 'king', 'nina', 'hwoarang', 'lars', 'jun', 'heihachi', 'kazuya', 'jin', 'deviljin'];

  // сгладить рост статов на длинной сетке (43 бойца)
  E.tkFoe = function (s, fid) {
    const f = (D.TK_FIGHTER && D.TK_FIGHTER[fid]) || (D.TK_STORY_FOES && D.TK_STORY_FOES[fid]); if (!f) return null;
    const lv = E.tkLv(s, f.off);
    const u = C.unitFromEnemy(f.en, lv, 0, 0, 'tk_' + fid) || C.unitFromEnemy('golem', lv, 0, 0, 'tk_' + fid);
    if (!u) return null;
    const h = C.unitFromSlot(s);
    const n = Math.max(1, F.length - 1), t = (f.i | 0) / n;
    const hpMul = 1.7 + t * 3.5;
    const atkMul = 0.82 + t * 0.78;
    u.maxHp = Math.max(180, Math.round((h.maxHp || 200) * hpMul * (f.id === 'deviljin' ? 1.15 : 1)));
    u.hp = u.maxHp;
    ['atk', 'mag', 'hpow'].forEach((k) => { u[k] = Math.max(8, Math.round((h[k] || 10) * atkMul)); });
    u.def = Math.max(4, Math.round((h.def || 8) * (0.65 + t * 0.45)));
    u.res = Math.round(u.def * 0.9);
    u.tkArt = 'tk_' + fid;
    if (fid === 'reina' && s.tk && s.tk.blood) u.tkArt = 'tk_reina_devil';
    return u;
  };

  // ───── Свита: гости коллабы ─────
  SK.g_tk_reina = { id: 'g_tk_reina', n: 'Ученица Мисимы', ic: '⚡', mp: 16, cd: 3, tgt: 'foe', d: 'Молния 220%, 30% оглушить.', fx: [{ k: 'dmg', s: 'atk', m: 2.2, el: 'bolt' }, { k: 'st', id: 'stun', p: 0.3, dur: 1 }], cls: 'crew' };
  SK.g_tk_reina_devil = { id: 'g_tk_reina_devil', n: 'Высший Дьявол', ic: '😈', mp: 18, cd: 3, tgt: 'foes', d: 'Тьма и молния 130% по всем. Вы получаете «Ускорение».', fx: [{ k: 'dmg', s: 'mag', m: 1.3, el: 'dark' }, { k: 'dmg', s: 'atk', m: 1.15, el: 'bolt' }, { k: 'st', id: 'haste', dur: 2, to: 'self' }], cls: 'crew' };
  SK.g_tk_azucena = { id: 'g_tk_azucena', n: 'Обжарка', ic: '☕', mp: 14, cd: 3, tgt: 'foe', d: 'Удар 190% и «Слабость».', fx: [{ k: 'dmg', s: 'atk', m: 1.9 }, { k: 'st', id: 'weak', p: 1, dur: 2 }], cls: 'crew' };
  SK.g_tk_anna = { id: 'g_tk_anna', n: 'Алая молния', ic: '💃', mp: 14, cd: 3, tgt: 'foe', d: 'Удар 200%.', fx: [{ k: 'dmg', s: 'atk', m: 2.0 }], cls: 'crew' };
  SK.g_tk_jack = { id: 'g_tk_jack', n: 'Гатлинг', ic: '🤖', mp: 16, cd: 3, tgt: 'foes', d: 'Удар 85% по всем.', fx: [{ k: 'dmg', s: 'atk', m: 0.85, hits: 2 }], cls: 'crew' };
  SK.g_tk_fah = { id: 'g_tk_fah', n: 'Колено Таиланда', ic: '🦵', mp: 16, cd: 3, tgt: 'foe', d: 'Удар 210%.', fx: [{ k: 'dmg', s: 'atk', m: 2.1 }], cls: 'crew' };
  SK.g_tk_asuka = { id: 'g_tk_asuka', n: 'Контратака', ic: '🥋', mp: 14, cd: 3, tgt: 'foe', d: 'Удар 180% и «Стойка».', fx: [{ k: 'dmg', s: 'atk', m: 1.8 }, { k: 'st', id: 'guard', dur: 2, to: 'self' }], cls: 'crew' };
  SK.g_tk_xiaoyu = { id: 'g_tk_xiaoyu', n: 'Феникс', ic: '🎀', mp: 14, cd: 3, tgt: 'foe', d: 'Удар 185%.', fx: [{ k: 'dmg', s: 'atk', m: 1.85 }], cls: 'crew' };
  SK.g_tk_lili = { id: 'g_tk_lili', n: 'Розовый пируэт', ic: '💎', mp: 14, cd: 3, tgt: 'foe', d: 'Удар 195%.', fx: [{ k: 'dmg', s: 'atk', m: 1.95 }], cls: 'crew' };
  SK.g_tk_alisa = { id: 'g_tk_alisa', n: 'Цепи', ic: '🤖', mp: 15, cd: 3, tgt: 'foe', d: 'Удар 170% и «Уязвимость».', fx: [{ k: 'dmg', s: 'atk', m: 1.7 }, { k: 'st', id: 'vuln', p: 1, dur: 2 }], cls: 'crew' };
  SK.g_tk_leo = { id: 'g_tk_leo', n: 'Кирка', ic: '⛏️', mp: 14, cd: 3, tgt: 'foe', d: 'Удар 185%.', fx: [{ k: 'dmg', s: 'atk', m: 1.85 }], cls: 'crew' };
  SK.g_tk_zafina = { id: 'g_tk_zafina', n: 'Азраэль', ic: '🔮', mp: 16, cd: 3, tgt: 'foes', d: 'Тьма 100% по всем.', fx: [{ k: 'dmg', s: 'mag', m: 1.0, el: 'dark' }], cls: 'crew' };
  SK.g_tk_lidia = { id: 'g_tk_lidia', n: 'Приговор сейма', ic: '⚖️', mp: 15, cd: 3, tgt: 'foe', d: 'Удар 200%.', fx: [{ k: 'dmg', s: 'atk', m: 2.0 }], cls: 'crew' };
  SK.g_tk_miary = { id: 'g_tk_miary', n: 'Серебряный бог', ic: '🌿', mp: 15, cd: 3, tgt: 'foe', d: 'Удар 190%.', fx: [{ k: 'dmg', s: 'atk', m: 1.9 }], cls: 'crew' };
  SK.g_tk_kuni = { id: 'g_tk_kuni', n: 'Тень кунай', ic: '🥷', mp: 14, cd: 3, tgt: 'foe', d: 'Три удара 70%.', fx: [{ k: 'dmg', s: 'atk', m: 0.7, hits: 3 }], cls: 'crew' };
  SK.g_tk_jun = { id: 'g_tk_jun', n: 'Свет Кадзама', ic: '🕊️', mp: 16, cd: 3, tgt: 'allies', d: 'Лечение отряда.', fx: [{ k: 'heal', m: 1.2 }], cls: 'crew' };

  const col = (id, n, arch, ic, c, role, d, k, loy0, sig, fav, like, talk) => {
    D.CREW[id] = { n, t: 'col', arch, art: id, ic, c, role, d, k, loy0, sig, fav, like, talk, event: 'tk' };
    if (D.CREW_IDS && !D.CREW_IDS.includes(id)) D.CREW_IDS.push(id);
  };
  // jin/nina уже есть; обновим описание, k не ломаем
  col('tk_reina', 'Рейна Мисима', 'warrior', '⚡', '#b48cff', 'Гостья коллабы',
    'Дочь Хэйхати, которая сначала назвалась школьницей. Если принять её и пойти своей дорогой — она останется. Если отдать ей кровь Короля — станет Высшим Дьяволом.',
    0.98, 55, 'g_tk_reina', 'whet', ['book', 'jewel'],
    ['Не смотрите так. Я же обещала слушаться.', 'Отец учил побеждать. Вы учите… другому. Это раздражает. И держит.', 'Если я когда-нибудь предам вас — это будет не из страха. Запомните.']);
  col('tk_azucena', 'Асусена Ортис', 'rogue', '☕', '#c8a060', 'Гостья коллабы',
    'Королева кофейных плантаций. Дерётся так же, как говорит о зерне: быстро, горячо и без лишней скромности.',
    0.94, 45, 'g_tk_azucena', 'sweets', ['wine', 'trinket'],
    ['Сначала кофе, потом разговор. Или наоборот, но кофе всё равно будет.', 'В моём урожае нет слабых зёрен. В отряде — тоже не должно.', 'Вы странный король. Мне нравится.']);
  col('tk_anna', 'Анна Уильямс', 'rogue', '💃', '#ff6a8a', 'Гостья коллабы',
    'Младшая Уильямс. Одевается ярче сестры и бьёт не мягче. Любит внимание и не делит его.',
    0.94, 40, 'g_tk_anna', 'jewel', ['wine', 'flowers'],
    ['Нина вам уже надоела? Хорошо. Я интереснее.', 'Не сравнивайте нас. Я всегда выигрываю в сравнении.', 'Если я с вами — значит, мне так захотелось. Запомните.']);
  col('tk_jack', 'Джек-8', 'shield', '🤖', '#9aa0b8', 'Гость коллабы',
    'Боевая машина G Corporation. Говорит коротко, бьёт тяжело. Кто дал приказ — тот и хозяин. Пока что это вы.',
    0.95, 60, 'g_tk_jack', 'whet', ['trinket'],
    ['ДЖЕК ГОТОВ.', 'ЦЕЛЬ УКАЗАНА.', 'ЗАЩИТА КОРОЛЯ — ПРИОРИТЕТ.']);
  col('tk_fahkumram', 'Факумрам', 'warrior', '🦵', '#7ad87a', 'Гость коллабы',
    'Национальный герой Таиланда, который слишком далеко зашёл за местью. Кулак его длиннее совести — но приказ он ещё слышит.',
    0.96, 40, 'g_tk_fah', 'whet', ['wine'],
    ['Я не ищу друзей. Только тех, кто не встанет у меня на пути.', 'Мishima Zaibatsu должна заплатить. Остальное — потом.', 'Вы не из них. Поэтому я здесь.']);
  col('tk_asuka', 'Асука Кадзама', 'warrior', '🥋', '#7ad87a', 'Гостья коллабы',
    'Врач с левой, хулиганка с правой. Говорит прямо, лечит тех, кого только что ударила.',
    0.93, 50, 'g_tk_asuka', 'sweets', ['book', 'whet'],
    ['Ты опять влез не в своё дело? Ладно, я тоже.', 'Болит? Терпи. Или дай посмотреть. Одно из двух.', 'Не надо меня охранять. Охраняй тех, кто слабее.']);
  col('tk_xiaoyu', 'Лин Сяоюй', 'rogue', '🎀', '#ff9ad0', 'Гостья коллабы',
    'Ученица и подруга Дзина. Улыбается часто, сдаётся редко. Ищет его даже там, где его нет.',
    0.93, 50, 'g_tk_xiaoyu', 'sweets', ['flowers', 'trinket'],
    ['Дзин тоже такой молчаливый был. Потом я привыкла.', 'Не делай вид, что тебе всё равно. Я вижу.', 'Панда сказала бы, что ты нормальный. Это высокая оценка.']);
  col('tk_lili', 'Лили де Рошфор', 'rogue', '💎', '#e8c0ff', 'Гостья коллабы',
    'Дочь монекского богача. Гордая, избалованная и честная в своей гордыне. Дерётся, потому что это красиво.',
    0.94, 40, 'g_tk_lili', 'jewel', ['flowers', 'wine'],
    ['Не вздумайте жалеть меня. Жалость — это дурной тон.', 'В имении скучно. С вами — меньше.', 'Асука опять будет спорить. Пусть. Я всё равно изящнее.']);
  col('tk_alisa', 'Алиса Босконович', 'mage', '🤖', '#ffb0c8', 'Гостья коллабы',
    'Автоматон с добрым лицом и пилами в руках. Говорит вежливо. Иногда слишком вежливо для того, что умеет.',
    0.93, 55, 'g_tk_alisa', 'flowers', ['book', 'trinket'],
    ['Я рада быть полезной. Правда рада.', 'Доктор всегда говорил: улыбайся, даже если внутри шестерёнки.', 'Если нужно, я могу отсоединить руки. Не пугайтесь — они вернутся.']);
  col('tk_leo', 'Лео Клизен', 'warrior', '⛏️', '#c8b080', 'Гостья коллабы',
    'Элеонора Клизен. Археолог и боец. Слова бережёт, удары — нет.',
    0.94, 45, 'g_tk_leo', 'book', ['whet', 'trinket'],
    ['Я не люблю длинных разговоров. Коротких — тоже, если в них нет дела.', 'Отец искал правду в земле. Я ищу её иначе.', 'Если пойдёте вперёд — я пойду. Этого достаточно.']);
  col('tk_zafina', 'Зафина', 'mage', '🔮', '#c060ff', 'Гостья коллабы',
    'Прорицательница, которая носит в себе слишком древнюю тень. Говорит загадками, но не врёт.',
    0.94, 40, 'g_tk_zafina', 'book', ['jewel', 'trinket'],
    ['Я видела вас раньше, чем вы пришли. Не пугайтесь. Это просто привычка.', 'Азраэль голоден. Я держу его. Пока держу.', 'Ваша дорога кривая. Значит, она настоящая.']);
  col('tk_lidia', 'Лидия Собеская', 'warrior', '⚖️', '#e8d080', 'Гостья коллабы',
    'Премьер-министр и каратистка. Говорит, как с трибуны, бьёт, как на ринге: без лишней вежливости к тиранам.',
    0.95, 50, 'g_tk_lidia', 'book', ['whet', 'wine'],
    ['Власть — это не кулак. Но кулак иногда помогает власти не врать.', 'Я не прошу защиты. Я прошу честности.', 'Если вы король, ведите себя как король. Не как деспот.']);
  col('tk_miary', 'Миари Зо', 'warrior', '🌿', '#8fe8b0', 'Гостья коллабы',
    'Сосуд Серебряного боевого бога. Говорит тихо, движется так, будто помнит чужие шаги.',
    0.95, 50, 'g_tk_miary', 'flowers', ['book', 'trinket'],
    ['Деревья у нас дома старше любых империй. Они никуда не торопятся.', 'Бог во мне не злой. Он просто тяжёлый.', 'Я пойду с вами, пока моя дорога совпадает с вашей.']);
  col('tk_kuni', 'Кунимицу', 'rogue', '🥷', '#9aa0ff', 'Гостья коллабы',
    'Наследница имени Кунимицу. Крадёт то, что плохо лежит, и то, что лежит хорошо. Молчит чаще, чем говорит.',
    0.93, 35, 'g_tk_kuni', 'jewel', ['trinket', 'wine'],
    ['Не спрашивайте, откуда вещь. Спросите, нужна ли она.', 'Тень не обязана объясняться.', 'Если я осталась — значит, здесь есть что стеречь. Или украсть позже.']);
  col('tk_jun', 'Джун Кадзама', 'healer', '🕊️', '#c8f0d0', 'Гостья коллабы',
    'Мать Дзина. Тихая сила, которая не путает жалость с любовью.',
    0.95, 50, 'g_tk_jun', 'flowers', ['book', 'sweets'],
    ['Я не прошу вас спасать моего сына за меня. Только не мешайте ему дышать.', 'В вас тоже есть тьма. Вы хотя бы не притворяетесь, что её нет.', 'Если устанете — сядьте. Мир подождёт минуту.']);

  D.TK_WOMEN = ['tk_reina', 'tk_nina', 'tk_jun', 'tk_xiaoyu', 'tk_asuka', 'tk_lili', 'tk_alisa', 'tk_leo', 'tk_zafina', 'tk_azucena', 'tk_lidia', 'tk_anna', 'tk_miary', 'tk_kuni'];
  D.TK_KAZ_ALLIES = [
    { id: 'tk_azucena', n: 'Асусена Ортис', ic: '☕', why: 'G Corporation нужен кофе и человек, который не боится сильных. Она согласна — на своих условиях.' },
    { id: 'tk_anna', n: 'Анна Уильямс', ic: '💃', why: 'Кадзуя платит тем, кто умеет убивать красиво. Анна не откажется оказаться нужнее сестры.' },
    { id: 'tk_jack', n: 'Джек-8', ic: '🤖', why: 'Машина G Corporation. Приказ переписан: новый хозяин — вы.' },
    { id: 'tk_fahkumram', n: 'Факумрам', ic: '🦵', why: 'Его месть Zaibatsu удобна Кадзуе. Пока ваш путь не мешает его — он ваш.' }
  ];

  D.TK_SPEAKERS = Object.assign({}, D.TK_SPEAKERS, {
    rei: { n: 'Рейна', art: 'tk_reina', c: '#b48cff' },
    asu: { n: 'Асука Кадзама', art: 'tk_asuka', c: '#7ad87a' },
    xia: { n: 'Лин Сяоюй', art: 'tk_xiaoyu', c: '#ff9ad0' },
    lil: { n: 'Лили', art: 'tk_lili', c: '#e8c0ff' },
    ali: { n: 'Алиса', art: 'tk_alisa', c: '#ffb0c8' },
    leo: { n: 'Лео', art: 'tk_leo', c: '#c8b080' },
    zaf: { n: 'Зафина', art: 'tk_zafina', c: '#c060ff' },
    azu: { n: 'Асусена', art: 'tk_azucena', c: '#c8a060' },
    lid: { n: 'Лидия Собеская', art: 'tk_lidia', c: '#e8d080' },
    ann: { n: 'Анна Уильямс', art: 'tk_anna', c: '#ff6a8a' },
    mia: { n: 'Миари Зо', art: 'tk_miary', c: '#8fe8b0' },
    kun: { n: 'Кунимицу', art: 'tk_kuni', c: '#9aa0ff' },
    vic: { n: 'Виктор Шевалье', art: 'tk_victor', c: '#c8c0a0' },
    ler: { n: 'Лерой Смит', art: 'tk_leroy', c: '#d0a070' },
    ste: { n: 'Стив Фокс', art: 'tk_steve', c: '#e8e0d0' },
    edd: { n: 'Эдди Гордо', art: 'tk_eddy', c: '#f0d060' },
    cla: { n: 'Клаудио', art: 'tk_claudio', c: '#f0e8a0' },
    bry: { n: 'Брайан Фьюри', art: 'tk_bryan', c: '#b0c0c8' },
    kum: { n: 'Кума', art: 'tk_kuma', c: '#c8a060' },
    pan: { n: 'Панда', art: 'tk_panda', c: '#f0d080' },
    jac: { n: 'Джек-8', art: 'tk_jack', c: '#9aa0b8' },
    yos: { n: 'Ёсимицу', art: 'tk_yoshimitsu', c: '#7ad87a' },
    sha: { n: 'Шахин', art: 'tk_shaheen', c: '#e8d080' },
    dra: { n: 'Сергей Драгунов', art: 'tk_dragunov', c: '#9ab0c0' },
    fen: { n: 'Фэн Вэй', art: 'tk_feng', c: '#d0a070' },
    rav: { n: 'Рэйвен', art: 'tk_raven', c: '#8090a8' },
    lee: { n: 'Ли Чаолан', art: 'tk_lee', c: '#e8e0d0' },
    cli: { n: 'Клайв Росфилд', art: 'tk_clive', c: '#c06070' },
    fah: { n: 'Факумрам', art: 'tk_fahkumram', c: '#8fe8b0' },
    ark: { n: 'Армор Кинг', art: 'tk_armorking', c: '#c8b080' },
    bob: { n: 'Боб Ричардс', art: 'tk_bob', c: '#f0d060' },
    rog: { n: 'Роджер-младший', art: 'tk_roger', c: '#ffd35a' },
    yuj: { n: 'Юдзиро Ханма', art: 'tk_yujiro', c: '#ff6a4a' },
    aza: { n: 'Азазель', c: '#c060ff', art: 'tk_azazel' },
    drv: { n: 'Водитель', c: '#9aa0b8', art: 'tk_driver' },
    mer: { n: 'Торговец', c: '#c8a060', art: 'tk_vendor' },
    boy: { n: 'Мальчик', c: '#ffe0a0', art: 'tk_boy' },
    med: { n: 'Медик', c: '#a0d0c8', art: 'tk_medic' },
    sgc: { n: 'Солдат G Corporation', c: '#b0b8c8' },
    syg: { n: 'Солдат Yggdrasil', c: '#a0c0e8', art: 'tk_ygg' },
    fgt: { n: 'Боец', c: '#9aa0b8' },
    fix: { n: 'Посредник', c: '#b8a888', art: 'tk_fixer' }
  });

  if (typeof module !== 'undefined') module.exports = RPG;
})();
