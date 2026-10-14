/* v2.17 «Артефакты»: один слот артефакта у героя, своя лестница редкостей (Обычный … Божественный + 5 Мировых),
   статы от уровня Мифического снаряжения до уровня Истока, навыки и пассивы, спутницы Мировых артефактов,
   «Подземелье Артефактов» (ур. 30 → 300, 10 этапов) и развитие Свиты: звёзды возвышения, мастерство навыков, узы, экспедиции, поддержка в бою.
   Статы артефакта не хранятся в сохранении — пересчитываются из данных (s.arts = { id: звёзды }, s.artEq = id). Логика без DOM. */
(function () {
  const RPG = globalThis.RPG, D = RPG.D, E = RPG.E, C = RPG.C, S = RPG.S;
  const clamp = E.clamp;

  // ───── Лестница редкостей артефактов ─────
  // k — множитель шаблона статов: Обычный ≈ Мифическое оружие ур. 80, Божественный ≈ Концептуальный клинок, Мировой ≈ Исток
  D.ART_RAR = D.RARITY.slice(0, 8).map((r, i) => ({ id: r.id, n: r.n, c: r.c, g: r.g, k: [1, 1.12, 1.25, 1.4, 1.55, 1.72, 1.86, 2.0][i] }));
  D.ART_RAR.push({ id: 'world', n: 'Мировой', c: '#7fffd4', g: 'rgba(80,255,210,.75)', k: 2.8 });
  D.ART_WORLD = 8;
  D.ART_STAR_MAX = 5; D.ART_STAR_K = 0.08;   // +8% ко всем статам артефакта за звезду (дубликат)

  // шаблоны статов при k = 1 (уровень Мифического снаряжения)
  D.ART_TPL = {
    atk: { atk: 500, str: 35, agi: 30, vit: 30, luk: 28, hp: 500, dmg: 18, crit: 9, critDmg: 0.3, pen: 10 },
    mag: { mag: 500, int: 35, spi: 30, wis: 30, vit: 28, hp: 500, mp: 200, dmg: 18, penMag: 10, cdr: 4 },
    def: { def: 420, res: 380, hp: 1400, atk: 220, mag: 220, vit: 40, str: 26, spi: 26, taken: -7, blockCh: 8 },
    hyb: { atk: 320, mag: 320, hp: 800, str: 26, agi: 26, vit: 26, int: 26, spi: 26, dmg: 14, spd: 6, crit: 6 }
  };
  const SK = D.SKILLS;
  const ask = (id, o) => { o.id = id; o.cls = 'art'; o.art = 1; SK[id] = o; return id; };
  const A = (id, r, n, ic, foc, lore, pas, sk, o) => Object.assign({ id, r, n, ic, foc, lore, pas, sk, icon: 'assets/artifacts/icons/' + id + '.webp', icon128: 'assets/artifacts/icons/t/' + id + '.webp' }, o || {});

  // ───── Навыки артефактов ─────
  ask('ak_lantern', { n: 'Вспышка фонаря', ic: '🏮', mp: 10, cd: 2, tgt: 'foe', d: 'Свет 140% и «Слабость».', fx: [{ k: 'dmg', s: 'mag', m: 1.4, el: 'light' }, { k: 'st', id: 'weak', p: 0.7, dur: 2 }] });
  ask('ak_coin', { n: 'Подброшенная монета', ic: '🪙', mp: 10, cd: 2, tgt: 'foe', d: 'Удар 160%, +40% шанса крита.', fx: [{ k: 'dmg', s: 'atk', m: 1.6, crit: 40 }] });
  ask('ak_bell', { n: 'Тревожный звон', ic: '🔔', mp: 12, cd: 3, tgt: 'foes', d: 'Эфир 75% по всем, 25% оглушить.', fx: [{ k: 'dmg', s: 'mag', m: 0.75, el: 'arcane' }, { k: 'st', id: 'stun', p: 0.25, dur: 1 }] });
  ask('ak_feather', { n: 'Чёрный росчерк', ic: '🪶', mp: 12, cd: 2, tgt: 'rfoe', d: 'Четыре удара по случайным врагам (60% каждый).', fx: [{ k: 'dmg', s: 'atk', m: 0.6, hits: 4 }] });
  ask('ak_ember', { n: 'Тлеющий взрыв', ic: '🔥', mp: 14, cd: 3, tgt: 'foes', d: 'Огонь 95% по всем, 50% поджечь.', fx: [{ k: 'dmg', s: 'mag', m: 0.95, el: 'fire' }, { k: 'st', id: 'burn', p: 0.5, dur: 3 }] });
  ask('ak_shell', { n: 'Шёпот прилива', ic: '🐚', mp: 14, cd: 3, tgt: 'allies', d: 'Лечит отряд (90%).', fx: [{ k: 'heal', m: 0.9 }] });
  ask('ak_compass', { n: 'Верный курс', ic: '🧭', mp: 12, cd: 4, tgt: 'self', d: '«Фокус» и «Ускорение» на 2 хода.', fx: [{ k: 'st', id: 'focus', dur: 2 }, { k: 'st', id: 'haste', dur: 2 }] });
  ask('ak_fang', { n: 'Лунный укус', ic: '🐺', mp: 14, cd: 2, tgt: 'foe', d: 'Удар 210%, кровотечение.', fx: [{ k: 'dmg', s: 'atk', m: 2.1 }, { k: 'st', id: 'bleed', p: 1, dur: 3 }] });
  ask('ak_mirror', { n: 'Отражённое проклятие', ic: '🪞', mp: 15, cd: 3, tgt: 'foe', d: 'Тьма 170%, «Слабость» и «Уязвимость».', fx: [{ k: 'dmg', s: 'mag', m: 1.7, el: 'dark' }, { k: 'st', id: 'weak', p: 1, dur: 2 }, { k: 'st', id: 'vuln', p: 1, dur: 2 }] });
  ask('ak_hourglass', { n: 'Сжатое мгновение', ic: '⏳', mp: 16, cd: 4, tgt: 'allies', d: 'Отряд получает «Ускорение» на 2 хода.', fx: [{ k: 'st', id: 'haste', dur: 2 }] });
  ask('ak_banner', { n: 'Знамя поднято', ic: '🚩', mp: 16, cd: 4, tgt: 'allies', d: '«Боевой дух» и «Благословение» отряду.', fx: [{ k: 'st', id: 'rally', dur: 3 }, { k: 'st', id: 'bless', dur: 3 }] });
  ask('ak_golem', { n: 'Гранитная кожа', ic: '🪨', mp: 14, cd: 4, tgt: 'self', d: '«Стойка», «Крепость» и щит (150% брони).', fx: [{ k: 'st', id: 'guard', dur: 2 }, { k: 'st', id: 'defUp', dur: 3 }, { k: 'st', id: 'shield', dur: 3, pow: 1.5, s: 'def' }] });
  ask('ak_crown', { n: 'Шипы раскаяния', ic: '👑', mp: 18, cd: 3, tgt: 'foes', d: 'Тьма 125% по всем, кровотечение.', fx: [{ k: 'dmg', s: 'mag', m: 1.25, el: 'dark' }, { k: 'st', id: 'bleed', p: 0.8, dur: 3 }] });
  ask('ak_horn', { n: 'Громовой зов', ic: '📯', mp: 18, cd: 3, tgt: 'foes', d: 'Молния 115% по всем, 30% оглушить.', fx: [{ k: 'dmg', s: 'atk', m: 1.15, el: 'bolt' }, { k: 'st', id: 'stun', p: 0.3, dur: 1 }] });
  ask('ak_chalice', { n: 'Святая влага', ic: '🏆', mp: 18, cd: 3, tgt: 'allies', d: 'Лечит отряд (130%) и очищает.', fx: [{ k: 'heal', m: 1.3 }, { k: 'cleanse' }] });
  ask('ak_eye', { n: 'Взор дракона', ic: '👁️', mp: 20, cd: 3, tgt: 'foe', d: 'Огонь 250% и «Метка».', fx: [{ k: 'dmg', s: 'mag', m: 2.5, el: 'fire' }, { k: 'st', id: 'mark', dur: 3 }] });
  ask('ak_chain', { n: 'Оковы титана', ic: '⛓️', mp: 20, cd: 4, tgt: 'foes', d: 'Удар 90% по всем, 50% оглушить.', fx: [{ k: 'dmg', s: 'atk', m: 0.9, el: 'earth' }, { k: 'st', id: 'stun', p: 0.5, dur: 1 }] });
  ask('ak_quill', { n: 'Переписанная строка', ic: '🖋️', mp: 20, cd: 3, tgt: 'foe', d: 'Эфир 270%, игнорирует 30% защиты.', fx: [{ k: 'dmg', s: 'mag', m: 2.7, el: 'arcane', pierce: 0.3 }] });
  ask('ak_lance', { n: 'Копьё рассвета', ic: '🔱', mp: 22, cd: 3, tgt: 'foe', d: 'Свет 330%, игнорирует 35% защиты.', fx: [{ k: 'dmg', s: 'atk', m: 3.3, el: 'light', pierce: 0.35 }] });
  ask('ak_seal', { n: 'Девятый вал', ic: '🌊', mp: 22, cd: 3, tgt: 'foes', d: 'Вода 155% по всем, «Промокший» и «Холод».', fx: [{ k: 'dmg', s: 'mag', m: 1.55, el: 'water' }, { k: 'st', id: 'wet', p: 1, dur: 3 }, { k: 'st', id: 'chill', p: 0.7, dur: 2 }] });
  ask('ak_rose', { n: 'Цветение жизни', ic: '🌹', mp: 22, cd: 3, tgt: 'allies', d: 'Лечит отряд (160%) и даёт регенерацию.', fx: [{ k: 'heal', m: 1.6 }, { k: 'st', id: 'regen', dur: 3, pow: 0.35, s: 'heal' }] });
  ask('ak_halo', { n: 'Суд Нимба', ic: '😇', mp: 26, cd: 3, tgt: 'foes', d: 'Свет 210% по всем и «Слабость».', fx: [{ k: 'dmg', s: 'mag', m: 2.1, el: 'light' }, { k: 'st', id: 'weak', p: 1, dur: 2 }] });
  ask('ak_scale', { n: 'Приговор весов', ic: '⚖️', mp: 26, cd: 3, tgt: 'foe', d: 'Всегда крит: удар 420%.', fx: [{ k: 'dmg', s: 'atk', m: 4.2, crit: 100 }] });
  ask('ak_tear', { n: 'Милость Создательницы', ic: '💧', mp: 26, cd: 3, tgt: 'allies', d: 'Лечит отряд (220%), очищает, «Благословение».', fx: [{ k: 'heal', m: 2.2 }, { k: 'cleanse' }, { k: 'st', id: 'bless', dur: 3 }] });
  // Мировые
  ask('ak_blackhole', { n: 'Чёрная дыра', ic: '🕳️', mp: 30, cd: 3, tgt: 'foes', d: 'Пустота 260% по всем, 40% оглушить, «Уязвимость».', fx: [{ k: 'dmg', s: 'mag', m: 2.6, el: 'arcane' }, { k: 'st', id: 'stun', p: 0.4, dur: 1 }, { k: 'st', id: 'vuln', p: 1, dur: 3 }] });
  ask('ak_collapse', { n: 'Гравитационный коллапс', ic: '🌌', mp: 34, cd: 4, tgt: 'foe', d: 'Пустота 520% по цели, игнорирует 50% защиты.', fx: [{ k: 'dmg', s: 'mag', m: 5.2, el: 'arcane', pierce: 0.5 }] });
  ask('ak_mace', { n: 'Гром булавы', ic: '🔨', mp: 28, cd: 3, tgt: 'foe', d: 'Удар 460%, 60% оглушить.', fx: [{ k: 'dmg', s: 'atk', m: 4.6 }, { k: 'st', id: 'stun', p: 0.6, dur: 1 }] });
  ask('ak_golddrain', { n: 'Золотой дождь', ic: '💰', mp: 30, cd: 3, tgt: 'rfoe', d: 'Шесть ударов по случайным врагам (90% каждый).', fx: [{ k: 'dmg', s: 'atk', m: 0.9, hits: 6 }] });
  ask('ak_worldtree', { n: 'Сок Мирового Древа', ic: '🌳', mp: 30, cd: 3, tgt: 'allies', d: 'Лечит отряд (300%), очищает, регенерация.', fx: [{ k: 'heal', m: 3.0 }, { k: 'cleanse' }, { k: 'st', id: 'regen', dur: 3, pow: 0.5, s: 'heal' }] });
  ask('ak_roots', { n: 'Корни мира', ic: '🌿', mp: 26, cd: 4, tgt: 'foes', d: 'Земля 200% по всем, 50% оглушить.', fx: [{ k: 'dmg', s: 'mag', m: 2.0, el: 'earth' }, { k: 'st', id: 'stun', p: 0.5, dur: 1 }] });
  ask('ak_clock', { n: 'Остановленный миг', ic: '⏱️', mp: 30, cd: 4, tgt: 'foes', d: 'Эфир 180% по всем, «Холод» и 45% заморозить.', fx: [{ k: 'dmg', s: 'mag', m: 1.8, el: 'arcane' }, { k: 'st', id: 'chill', p: 1, dur: 2 }, { k: 'st', id: 'freeze', p: 0.45, dur: 1 }] });
  ask('ak_rewind', { n: 'Обратный ход', ic: '🔄', mp: 26, cd: 4, tgt: 'allies', d: 'Отряд: лечение 150% и «Ускорение».', fx: [{ k: 'heal', m: 1.5 }, { k: 'st', id: 'haste', dur: 2 }] });
  ask('ak_firstflame', { n: 'Первородный огонь', ic: '☄️', mp: 30, cd: 3, tgt: 'foes', d: 'Огонь 250% по всем, поджигает.', fx: [{ k: 'dmg', s: 'atk', m: 2.5, el: 'fire' }, { k: 'st', id: 'burn', p: 1, dur: 3 }] });
  ask('ak_sunspear', { n: 'Копьё солнца', ic: '🌞', mp: 32, cd: 4, tgt: 'foe', d: 'Огонь 560% по цели, всегда крит.', fx: [{ k: 'dmg', s: 'atk', m: 5.6, el: 'fire', crit: 100 }] });

  // ───── Артефакты: 3 на каждую редкость Обычный…Божественный + 5 Мировых ─────
  const P = (n, m, d) => ({ n, m, d: d || '' });
  D.ARTIFACTS = [
    A('lantern', 0, 'Фонарь Путника', '🏮', 'hyb', 'Его зажгли у входа в первое подземелье — и он до сих пор помнит дорогу назад.', [P('Свет в коридоре', { acc: 6, eva: 4 })], ['ak_lantern']),
    A('lucky_coin', 0, 'Медяк Удачи', '🪙', 'atk', 'Обычная монета, которую слишком часто подбрасывали перед боем. Теперь она решает исход сама.', [P('Счастливый случай', { gold: 10, crit: 4 })], ['ak_coin']),
    A('cracked_bell', 0, 'Треснувший Колокольчик', '🔔', 'mag', 'Звонил в деревне, когда шли демоны. Звонит и сейчас — только теперь демоны идут за вами.', [P('Звон тревоги', { init: 8, statRes: 6 })], ['ak_bell']),
    A('raven_feather', 1, 'Перо Вороны-Вестницы', '🪶', 'atk', 'Ворона принесла весть о вашем пробуждении. Перо оставила как расписку.', [P('Чёрное крыло', { spd: 6, eva: 5 })], ['ak_feather']),
    A('ember', 1, 'Неугасимый Уголёк', '🔥', 'mag', 'Последний уголь из очага сожжённой деревни. Тёплый — и злой.', [P('Тление', { dmg_fire: 12, res_ice: 10 })], ['ak_ember']),
    A('surf_shell', 1, 'Раковина Прибоя', '🐚', 'def', 'Приложи к уху — и услышишь море, которое когда-то было на месте этих гор.', [P('Шум волн', { res_water: 14, hpRegen: 1 })], ['ak_shell']),
    A('lost_compass', 2, 'Компас Заблудших', '🧭', 'hyb', 'Стрелка указывает не на север, а туда, где вы нужнее всего.', [P('Верная тропа', { drop: 10, acc: 8 })], ['ak_compass']),
    A('moon_fang', 2, 'Клык Лунного Волка', '🐺', 'atk', 'Волк выл на луну триста лет. Луна однажды ответила.', [P('Голод полнолуния', { lifesteal: 4, critDmg: 0.15 })], ['ak_fang']),
    A('witch_mirror', 2, 'Зеркальце Ведьмы', '🪞', 'mag', 'Показывает не лицо, а то, что о нём думают враги.', [P('Отражение', { penMag: 8, statRes: 8 })], ['ak_mirror']),
    A('hourglass', 3, 'Песочные Часы Мгновения', '⏳', 'mag', 'Песок в них течёт вверх, когда хозяин опаздывает.', [P('Украденные секунды', { cdr: 8, castSpd: 8 })], ['ak_hourglass']),
    A('first_banner', 3, 'Обрывок Знамени Первых', '🚩', 'atk', 'Лоскут знамени первой армии Короля Демонов. Под ним не отступали.', [P('Не отступать', { dmg: 6, tenac: 10 })], ['ak_banner']),
    A('golem_heart', 3, 'Каменное Сердце Голема', '🪨', 'def', 'Бьётся раз в сутки — но каждый удар держит стену.', [P('Гранит', { taken: -5, blockCh: 8 })], ['ak_golem']),
    A('thorn_crown', 4, 'Терновый Венец Падшего', '👑', 'mag', 'Венец короля, который раскаялся слишком поздно. Шипы растут внутрь.', [P('Покаяние', { dmg_dark: 18, lifesteal: 4 })], ['ak_crown']),
    A('thunder_horn', 4, 'Рог Громового Зверя', '📯', 'atk', 'Один выдох — и над полем собираются тучи.', [P('Раскат', { dmg_bolt: 18, spd: 6 })], ['ak_horn']),
    A('quiet_chalice', 4, 'Чаша Тихого Источника', '🏆', 'def', 'Вода в ней не кончается, пока кто-то рядом ранен.', [P('Источник', { heal: 20, hpRegen: 2 })], ['ak_chalice']),
    A('dragon_eye', 5, 'Око Дракона-Провидца', '👁️', 'hyb', 'Дракон видел будущее на тысячу лет вперёд. В этом будущем были вы.', [P('Предвидение', { crit: 8, critDmg: 0.3, acc: 10 })], ['ak_eye']),
    A('titan_chain', 5, 'Цепь Скованного Титана', '⛓️', 'def', 'Звено цепи, что держала титана. Титан ушёл. Цепь осталась верной.', [P('Оковы', { taken: -8, counter: 12, thorns: 15 })], ['ak_chain']),
    A('fate_quill', 5, 'Перо Летописца Судеб', '🖋️', 'mag', 'Им вписали ваше имя в хронику мира. Теперь вы можете дописать пару строк.', [P('Летопись', { xp: 10, cdr: 10, manaEff: 10 })], ['ak_quill']),
    A('dawn_lance', 6, 'Наконечник Копья Рассвета', '🔱', 'atk', 'Им пронзили первую ночь — и она до сих пор не оправилась.', [P('Рассвет', { dmg_light: 25, bossDmg: 20, pen: 10 }), P('Утренний луч', { openDmg: 20 })], ['ak_lance']),
    A('seven_seas', 6, 'Печать Семи Морей', '🌊', 'mag', 'Печать, которой моря когда-то подписали мир с сушей.', [P('Власть над водой', { dmg_water: 25, res_water: 20, mpRegen: 4 }), P('Прилив', { manaEff: 12 })], ['ak_seal']),
    A('undying_rose', 6, 'Роза Бессмертной Королевы', '🌹', 'def', 'Королева умирала девять раз. Роза ни разу не завяла.', [P('Бессмертие', { reviveOnce: 1, startShield: 20, heal: 20 }), P('Шипы', { thorns: 20 })], ['ak_rose']),
    A('halo_shard', 7, 'Обломок Нимба', '😇', 'hyb', 'Осколок того самого Нимба, что раскололся над миром. Он всё ещё светится — для вас.', [P('Свет Нимба', { dmg: 20, allStat: 6, startShield: 25 }), P('Ореол', { statRes: 20, ccRes: 20 })], ['ak_halo']),
    A('last_scales', 7, 'Весы Последнего Суда', '⚖️', 'atk', 'Взвешивают не грехи, а оставшиеся удары сердца.', [P('Приговор', { execute: 30, crit: 10, critDmg: 0.5 }), P('Равновесие', { lifesteal: 6, bossDmg: 25 })], ['ak_scale']),
    A('creator_tear', 7, 'Слеза Создательницы', '💧', 'def', 'Создательница плакала один раз — когда увидела, что сотворили её дети.', [P('Милость', { reviveOnce: 1, taken: -12, hpRegen: 3 }), P('Утешение', { heal: 35, statRes: 20 })], ['ak_tear']),
    // ✦ Мировые: уникальны (дубликатов нет), только с двух последних этапов
    A('supernova_heart', 8, 'Сердце Сверхновой', '🌌', 'mag', 'Звезда умерла, чтобы родилась чёрная дыра. Чёрная дыра решила, что ей нужна хозяйка — и выбрала Астерию.', [P('Горизонт событий', { taken: -15, dmg_arcane: 40, penMag: 20 }, 'Пространство вокруг гнётся — удары по вам теряют силу.'), P('Звёздный ток', { mpRegen: 8, cdr: 12, critDmg: 0.4 })], ['ak_blackhole', 'ak_collapse'], { k: 3.2, comp: 'asteria', world: 1 }),
    A('hoard_key', 8, 'Ключ Бездонной Сокровищницы', '🗝️', 'atk', 'Ключ от сокровищницы, у которой нет дна. Её хранительница Гримхильда смеётся, когда кто-то пытается его украсть.', [P('Добыча победителя', { gold: 40, drop: 30, xp: 15 }), P('Хозяйка подземелий', { dmg: 25, lifesteal: 8, counter: 20 })], ['ak_mace', 'ak_golddrain'], { k: 3.1, comp: 'grimhild', world: 1 }),
    A('world_seed', 8, 'Семя Мирового Древа', '🌳', 'def', 'Из такого же семени выросло Древо, на котором держится небо.', [P('Вечная жизнь', { reviveOnce: 1, hpRegen: 5, taken: -18 }), P('Корни', { heal: 50, statRes: 30, ccRes: 30 })], ['ak_worldtree', 'ak_roots'], { k: 3.0, world: 1 }),
    A('first_clock', 8, 'Шестерня Первых Часов', '⏱️', 'hyb', 'С неё начали отсчитывать время. Если её вынуть — мир на миг замирает.', [P('Ход времени', { spd: 15, startHaste: 2, cdr: 15 }), P('Петля', { dbl: 15, init: 25 })], ['ak_clock', 'ak_rewind'], { k: 3.15, world: 1 }),
    A('first_spark', 8, 'Искра Первого Пламени', '☄️', 'atk', 'Искра, от которой зажглись все звёзды. Она помнит, как это было, — и хочет повторить.', [P('Первородный жар', { dmg_fire: 50, dmg: 20, critDmg: 0.6 }), P('Пепел миров', { pen: 20, bossDmg: 30 })], ['ak_firstflame', 'ak_sunspear'], { k: 3.3, world: 1 })
  ];
  D.ART = {}; D.ARTIFACTS.forEach((a) => { D.ART[a.id] = a; });
  D.ART_IDS = D.ARTIFACTS.map((a) => a.id);
  D.ART_WORLD_IDS = D.ARTIFACTS.filter((a) => a.r === D.ART_WORLD).map((a) => a.id);

  // ───── Статы ─────
  const round1 = (v) => Math.round(v * 10) / 10;
  E.artK = (a, stars) => (a.k || D.ART_RAR[a.r].k) * (1 + D.ART_STAR_K * clamp(stars | 0, 0, D.ART_STAR_MAX));
  E.artStats = function (id, stars) {
    const a = D.ART[id]; if (!a) return {}; const k = E.artK(a, stars), T = D.ART_TPL[a.foc] || D.ART_TPL.hyb, out = {};
    for (const key in T) { const v = T[key] * k; out[key] = D.STATS.includes(key) || D.FLAT[key] ? Math.round(v) : key === 'critDmg' ? Math.round(v * 100) / 100 : round1(v); }
    return out;
  };
  E.artMods = function (id) { const a = D.ART[id], m = {}; if (!a) return m; a.pas.forEach((p) => { for (const k in p.m) m[k] = (k === 'reviveOnce' ? Math.max(m[k] || 0, p.m[k]) : (m[k] || 0) + p.m[k]); }); return m; };
  E.artEnsure = function (s) { if (!s) return s; if (!s.arts || typeof s.arts !== 'object' || Array.isArray(s.arts)) s.arts = {}; if (s.artEq && s.arts[s.artEq] == null) s.artEq = null; if (s.artEq === undefined) s.artEq = null; if (s.artProg == null || typeof s.artProg !== 'object') s.artProg = { best: 0, clears: {}, drops: 0 }; return s; };
  E.artEquipped = (s) => (s && s.arts && s.artEq && s.arts[s.artEq] != null && D.ART[s.artEq]) ? s.artEq : null;
  E.artEquip = function (s, id) { E.artEnsure(s); if (id && s.arts[id] == null) return 'Нет такого артефакта'; if (s.run) return 'Во время вылазки артефакт не меняется'; s.artEq = id || null; s.rev = (s.rev || 0) + 1; return ''; };
  // артефакт → характеристики героя (как снаряжение: плоские статы × бонус кузнеца не применяется — артефакт не выкован)
  const _collect = E.collect;
  E.collect = function (slot, ctx) {
    const c = _collect(slot, ctx), id = E.artEquipped(slot); if (!id) return c;
    const st = E.artStats(id, slot.arts[id]), mods = Object.assign({}, E.artMods(id));
    for (const k in st) { const v = st[k]; if (D.STATS.includes(k)) { c.stats[k] += v; const b = c.sby[k] || (c.sby[k] = {}); b.art = (b.art || 0) + v; } else if (D.FLAT[k]) c.flat[k] = (c.flat[k] || 0) + v; else mods[k] = (mods[k] || 0) + v; }
    for (const k in mods) { if (k === 'reviveOnce') c.mods[k] = Math.max(c.mods[k] || 0, mods[k]); else c.mods[k] = (c.mods[k] || 0) + mods[k]; const b = c.by[k] || (c.by[k] = {}); b.art = (b.art || 0) + mods[k]; }
    if (mods.allStat) D.STATS.forEach((s) => { c.stats[s] += c.stats[s] * mods.allStat / 100; });
    return c;
  };
  if (D.SRC_N) D.SRC_N.art = 'Артефакт';
  const _srcName = E.srcName; E.srcName = (k) => (k === 'art' ? 'Артефакт' : k === 'crewBond' ? 'Узы Свиты' : _srcName(k));
  E.artSkills = (s) => { const id = E.artEquipped(s); return id ? D.ART[id].sk.slice() : []; };

  // ───── Получение: дубликаты → звёзды, Мировые — только один экземпляр ─────
  E.artOwns = (s, id) => !!(s && s.arts && s.arts[id] != null);
  E.artGain = function (s, id) {
    E.artEnsure(s); const a = D.ART[id]; if (!a) return null;
    const res = { id, n: a.n, r: a.r, isNew: false, star: 0, conv: null, comp: null };
    if (s.arts[id] == null) { s.arts[id] = 0; res.isNew = true; if (a.comp && E.recruit && !s.crew[a.comp]) { E.recruit(s, a.comp); res.comp = a.comp; } }
    else if (a.world) { res.refused = true; return res; }   // уникален: второй экземпляр невозможен
    else if (s.arts[id] < D.ART_STAR_MAX) { s.arts[id]++; res.star = s.arts[id]; }
    else { const q = a.r + 1, g = 500 * (a.r + 1) * (a.r + 1); E.addMat(s, 'asc_sigil', q); s.gold += g; res.conv = { sig: q, gold: g }; }
    s.artProg.drops = (s.artProg.drops || 0) + 1; s.rev = (s.rev || 0) + 1; return res;
  };

  // ───── Подземелье Артефактов: 10 этапов, ур. 30 → 300 ─────
  // ur — уровень этапа (показ), lv — боевой уровень врагов (сжатая шкала: ур. 300 ≈ 130 — сильнее «Предела» финальных подземелий)
  D.ART_UNLOCK_LV = 30;
  const STG = [[30, 'ossuary'], [55, 'crater'], [80, 'tempest'], [105, 'sunken'], [130, 'garden'], [160, 'citadel'], [190, 'abyss'], [220, 'citadel'], [260, 'abyss'], [300, 'nowhere']];
  D.ART_STAGES = STG.map(([ur, src], i) => {
    const B = D.DUN[src] || D.DUNGEONS[D.DUNGEONS.length - 1];
    const lv = Math.round(30 + (ur - 30) * (100 / 270));
    return { id: 'artd' + (i + 1), i, n: 'Подземелье Артефактов · этап ' + (i + 1), ic: '🏺', lv, ur, floors: 2, bio: B.bio, col: '#3a2a5a', art: i + 1, src,
      d: 'Сокровищница, где лежат вещи старше мира. Этап ' + (i + 1) + ' из ' + STG.length + ' (ур. ' + ur + ').', pool: B.pool.slice(), mini: B.mini, boss: B.boss, ev: ['chest', 'rest', 'shrine'], need: i ? 'artd' + i : null, hidden: 1, mul: 1 + i * 0.04 };
  });
  D.ART_STAGES.forEach((d) => { D.DUNGEONS.push(d); D.DUN[d.id] = d; });
  // шанс выпадения (%) за прохождение этапа по редкостям [Обычный … Божественный, Мировой]; Божественные и Мировые — только два последних этапа
  D.ART_DROP = [
    [40, 15, 0, 0, 0, 0, 0, 0, 0],
    [35, 20, 8, 0, 0, 0, 0, 0, 0],
    [25, 20, 12, 4, 0, 0, 0, 0, 0],
    [15, 18, 14, 7, 0, 0, 0, 0, 0],
    [0, 15, 15, 10, 4, 0, 0, 0, 0],
    [0, 0, 14, 12, 7, 2.5, 0, 0, 0],
    [0, 0, 0, 12, 9, 4.5, 1.2, 0, 0],
    [0, 0, 0, 0, 10, 6, 2.5, 0, 0],
    [0, 0, 0, 0, 9, 7, 4, 1.8, 0.5],
    [0, 0, 0, 0, 0, 8, 5, 3, 1]
  ];
  D.ART_DIVINE_STAGES = [D.ART_STAGES.length - 2, D.ART_STAGES.length - 1];
  E.isArtDun = (did) => !!(D.DUN[did] && D.DUN[did].art);
  E.artStageOpen = function (s, i) { const d = D.ART_STAGES[i]; if (!d || !s || !s.hero) return false; if (s.hero.level < D.ART_UNLOCK_LV) return false; return i === 0 || !!(s.prog && s.prog.cleared[D.ART_STAGES[i - 1].id]); };
  // текущие шансы с учётом уникальности Мировых (уже полученные исключаются)
  E.artDropTable = function (s, i) {
    const row = D.ART_DROP[i] || [], out = [];
    row.forEach((p, r) => { if (!p) return; const pool = D.ARTIFACTS.filter((a) => a.r === r && !(a.world && E.artOwns(s, a.id))); if (pool.length) out.push({ r, p, pool }); });
    return out;
  };
  E.rollArtifact = function (s, i, rng) {
    const tab = E.artDropTable(s, i); let u = rng() * 100;
    for (const t of tab) { if (u < t.p) return t.pool[Math.floor(rng() * t.pool.length) % t.pool.length].id; u -= t.p; }
    return null;
  };
  const _unlocked = E.dungeonUnlocked;
  E.dungeonUnlocked = function (slot, did) { const d = D.DUN[did]; if (d && d.art) return E.artStageOpen(slot, d.art - 1); return _unlocked(slot, did); };
  const _visible = E.dungeonVisible;
  E.dungeonVisible = (slot, did) => { const d = D.DUN[did]; if (d && d.hidden) return false; return _visible ? _visible(slot, did) : true; };
  const _tierU = E.tierUnlocked; E.tierUnlocked = (slot, did, t) => (E.isArtDun(did) ? t === 0 : _tierU(slot, did, t));
  // враги этапа: свой предел уровня и множитель силы этапа
  const _nodeEnemies = C.nodeEnemies;
  C.nodeEnemies = function (run, node, idx) {
    const d = D.DUN[run.did]; if (!d || !d.art) return _nodeEnemies(run, node, idx);
    const lv0 = E.dungeonLv(d, 0, node.f), bump = node.t === 'mini' ? 1 : node.t === 'boss' ? 2 : 0;
    return node.e.map((eid, i) => { const u = C.unitFromEnemy(eid, Math.min(140, lv0 + bump + (node.elite && i === 0 ? 1 : 0)), 0, !!(node.elite && i === 0), 'e' + i);
      ['maxHp', 'atk', 'mag', 'hpow', 'def', 'res'].forEach((k) => { u[k] = Math.round(u[k] * d.mul); }); u.hp = u.maxHp; return u; });
  };
  // награда этапа: шанс артефакта за победу над боссом
  const _finish = C.finishBattle;
  C.finishBattle = function (slot, B) {
    const run = slot.run, node = run && run.nodes[run.node], d = run && D.DUN[run.did];
    const rep = _finish(slot, B);
    if (d && d.art && node && node.t === 'boss' && B.over === 'win') {
      E.artEnsure(slot); const i = d.art - 1; slot.artProg.best = Math.max(slot.artProg.best || 0, d.art); slot.artProg.clears[d.id] = (slot.artProg.clears[d.id] || 0) + 1;
      const rng = E.rng((run.seed * 31 + 7 + (slot.artProg.clears[d.id] || 0) * 977) >>> 0), id = E.rollArtifact(slot, i, rng);
      rep.art = id ? E.artGain(slot, id) : { none: true };
      const sig = 1 + Math.floor(i / 2); E.addMat(slot, 'asc_sigil', sig); rep.artSig = sig;
    }
    return rep;
  };
  // артефакт и поддержка → навыки героя в бою
  const _ufs = C.unitFromSlot;
  C.unitFromSlot = function (slot) {
    const u = _ufs(slot); E.artSkills(slot).forEach((id) => { if (!u.sk.includes(id)) u.sk.push(id); });
    const sup = E.supportSkill(slot); if (sup && !u.sk.includes(sup.id)) { u.sk.push(sup.id); u.skb = Object.assign({}, u.skb, { [sup.id]: ((u.skb || {})[sup.id] || 0) + sup.bonus }); }
    return u;
  };

  // ═════ Свита: возвышение, мастерство, узы, экспедиции, поддержка ═════
  D.MATS.asc_sigil = { n: 'Знак возвышения', ic: '🔱', v: 120, d: 'Возвышение и мастерство Свиты. Экспедиции, Подземелье Артефактов.' };
  // спутницы Мировых артефактов
  const sg = (id, o) => { o.id = id; o.cls = 'crew'; SK[id] = o; };
  sg('g_asteria', { n: 'Горизонт событий', ic: '🕳️', mp: 22, cd: 3, tgt: 'foes', d: 'Пустота 160% по всем, «Уязвимость», 30% оглушить.', fx: [{ k: 'dmg', s: 'mag', m: 1.6, el: 'arcane' }, { k: 'st', id: 'vuln', p: 1, dur: 3 }, { k: 'st', id: 'stun', p: 0.3, dur: 1 }] });
  sg('g_grimhild', { n: 'Расколотая сокровищница', ic: '🔨', mp: 18, cd: 3, tgt: 'foe', d: 'Удар булавой 300%, 50% оглушить, кровотечение.', fx: [{ k: 'dmg', s: 'atk', m: 3.0 }, { k: 'st', id: 'stun', p: 0.5, dur: 1 }, { k: 'st', id: 'bleed', p: 1, dur: 3 }] });
  Object.assign(D.CREW, {
    asteria: { n: 'Астерия', t: 'art', arch: 'mage', art: 'art_asteria', img: 'assets/artifacts/comp/asteria.webp', av: 'assets/artifacts/comp/asteria_av.webp', ic: '🌌', c: '#b48cff', role: 'Звёздная Владычица Пустоты', d: 'Тёмно-фиолетовые волосы, бело-чёрная космическая мантия, у сердца — чёрная дыра, в ладони — звезда. Повелевает гравитацией и пустотой. Пришла вместе с «Сердцем Сверхновой».', k: 1.12, loy0: 70, sig: 'g_asteria', fav: 'book', like: ['jewel', 'trinket'], talk: ['Каждая звезда когда-то тоже боялась погаснуть. Вы — нет. Это любопытно.', 'Я держу у сердца чёрную дыру. Не волнуйтесь — она ручная. Почти.', 'Галактики вращаются медленно. Я подожду, пока вы станете достаточно сильным.'], need: 'art_supernova_heart' },
    grimhild: { n: 'Гримхильда', t: 'art', arch: 'warrior', art: 'art_grimhild', img: 'assets/artifacts/comp/grimhild.webp', av: 'assets/artifacts/comp/grimhild_av.webp', ic: '🗝️', c: '#ff6a4a', role: 'Рыцарь Бездонной Сокровищницы', d: 'Ухмыляющаяся рыцарь с каштановой косой, в тяжёлых латах и рваном алом плаще, с булавой наперевес. Хозяйка подземелий, война и сокровища — её стихия. Пришла вместе с «Ключом Бездонной Сокровищницы».', k: 1.12, loy0: 70, sig: 'g_grimhild', fav: 'wine', like: ['jewel', 'whet'], talk: ['Ха! Ещё один этаж — ещё один сундук. Обожаю эту работу!', 'Плащ порван? Это не дыры, Король, это истории.', 'Ключ от сокровищницы у вас. Значит, и я — у вас. Не потеряйте ни то, ни другое.'], need: 'art_hoard_key' }
  });
  D.CREW_IDS = Object.keys(D.CREW); D.CREW_ARTS = D.CREW_IDS.filter((i) => D.CREW[i].t === 'art');

  D.CREW_STAR_MAX = 5; D.CREW_SKL_MAX = 5; D.CREW_BOND_MAX = 10;
  E.crewEnsure = function (st) { if (!st) return st; st.star = clamp(st.star | 0, 0, D.CREW_STAR_MAX); st.skl = clamp(st.skl | 0, 0, D.CREW_SKL_MAX); st.bxp = Math.max(0, +st.bxp || 0); return st; };
  // потолок уровня: от уровня героя (+2), каждая звезда — ещё +10 (выше 100)
  E.crewCap = function (slot, id) { const base = Math.min(D.LEVEL_CAP, slot.hero.level + 2), st = id && slot.crew && slot.crew[id]; return base + 10 * ((st && st.star) | 0); };
  E.crewAddXp = function (slot, id, xp) {
    const s = slot.crew[id]; if (!s) return 0; let up = 0; const cap = E.crewCap(slot, id);
    if (s.lv >= cap) return 0; s.xp += xp;
    while (s.lv < cap && s.xp >= E.crewXpNeed(s.lv)) { s.xp -= E.crewXpNeed(s.lv); s.lv++; up++; }
    if (s.lv >= cap) s.xp = Math.min(s.xp, E.crewXpNeed(s.lv) - 1);
    return up;
  };
  // возвышение (звёзды)
  E.ascCost = (st) => { const n = (st.star | 0) + 1; return { gold: 2000 * n * n, sig: [2, 4, 7, 11, 16][n - 1] || 99, lv: 10 + 15 * (n - 1) }; };
  E.crewAscendWhy = function (slot, id) { const st = slot.crew[id]; if (!st) return 'Нет такого члена Свиты'; E.crewEnsure(st); if (st.star >= D.CREW_STAR_MAX) return 'Максимум звёзд'; const c = E.ascCost(st); if (st.lv < c.lv) return 'Нужен ур. ' + c.lv; if (slot.gold < c.gold) return 'Не хватает золота'; if ((slot.mats.asc_sigil || 0) < c.sig) return 'Нужно знаков: ' + c.sig; return ''; };
  E.crewAscend = function (slot, id) { const w = E.crewAscendWhy(slot, id); if (w) return w; const st = slot.crew[id], c = E.ascCost(st); slot.gold -= c.gold; slot.mats.asc_sigil -= c.sig; st.star++; slot.rev++; return ''; };
  // мастерство навыков: +10% силы всех навыков подчинённого за ступень
  E.sklCost = (st) => { const n = (st.skl | 0) + 1; return { gold: 600 * n * n, sig: n }; };
  E.crewSkillUpWhy = function (slot, id) { const st = slot.crew[id]; if (!st) return 'Нет такого члена Свиты'; E.crewEnsure(st); if (st.skl >= D.CREW_SKL_MAX) return 'Мастерство на максимуме'; const c = E.sklCost(st); if (st.skl >= (st.star | 0) + 1) return 'Нужна звезда возвышения'; if (slot.gold < c.gold) return 'Не хватает золота'; if ((slot.mats.asc_sigil || 0) < c.sig) return 'Нужно знаков: ' + c.sig; return ''; };
  E.crewSkillUp = function (slot, id) { const w = E.crewSkillUpWhy(slot, id); if (w) return w; const st = slot.crew[id], c = E.sklCost(st); slot.gold -= c.gold; slot.mats.asc_sigil -= c.sig; st.skl++; slot.rev++; return ''; };
  // узы: опыт уз за бои, разговоры, подарки, задания; уровень = √(bxp/10), до 10
  E.bondLv = (st) => clamp(Math.floor(Math.sqrt(((st && st.bxp) || 0) / 10)), 0, D.CREW_BOND_MAX);
  E.bondNext = (st) => { const L = E.bondLv(st); return L >= D.CREW_BOND_MAX ? null : (L + 1) * (L + 1) * 10; };
  E.addBond = function (slot, id, n) { const st = slot.crew && slot.crew[id]; if (!st) return 0; E.crewEnsure(st); const b = E.bondLv(st); st.bxp += n; return E.bondLv(st) - b; };
  D.BOND_HERO = { warrior: ['atk', 0.6], mage: ['mag', 0.6], rogue: ['crit', 0.3], healer: ['heal', 1], shield: ['def', 0.8] };
  E.crewBondMods = function (slot) { const m = {}; if (!slot || !slot.crew) return m; for (const id in slot.crew) { const c = D.CREW[id], L = E.bondLv(slot.crew[id]); if (!c || !L) continue; const [k, v] = D.BOND_HERO[c.arch]; m[k] = (m[k] || 0) + v * L; } return m; };
  const _bondMods = E.bondMods;
  E.bondMods = function (slot, mods) { if (_bondMods) _bondMods(slot, mods); const m = E.crewBondMods(slot); for (const k in m) mods[k] = (mods[k] || 0) + m[k]; };
  // боевой юнит: звёзды +12%, узы +2% за уровень, мастерство — к силе навыков
  const _ufc = C.unitFromCrew;
  C.unitFromCrew = function (slot, id, hpFrac) {
    const u = _ufc(slot, id, hpFrac), st = E.crewEnsure(slot.crew[id]), k = (1 + 0.12 * st.star) * (1 + 0.02 * E.bondLv(st));
    if (k !== 1) { const f = u.hp / Math.max(1, u.maxHp); ['maxHp', 'atk', 'mag', 'hpow', 'def', 'res'].forEach((x) => { u[x] = Math.round(u[x] * k); }); u.hp = Math.round(u.maxHp * f); }
    if (st.skl) { u.skb = Object.assign({}, u.skb); u.sk.forEach((sk) => { u.skb[sk] = (u.skb[sk] || 0) + st.skl * 10; }); }
    return u;
  };
  const _afterB = E.crewAfterBattle;
  E.crewAfterBattle = function (slot, ids, xp, boss) { const out = _afterB(slot, ids, xp, boss); ids.forEach((id) => E.addBond(slot, id, boss ? 4 : 2)); if (slot.support && slot.crew[slot.support]) E.addBond(slot, slot.support, 1); return out; };
  const _talk = E.talk; E.talk = function (slot, id, rng) { const r = _talk(slot, id, rng); if (r) E.addBond(slot, id, 5); return r; };
  const _gift = E.giveGift; if (_gift) E.giveGift = function (slot, id, g) { const r = _gift(slot, id, g); if (r) E.addBond(slot, id, 3 + 2 * (r.t | 0)); return r; };
  // экспедиции: долгие задания со Знаками возвышения
  E.MISSION_DUR.push({ n: 'Экспедиция', min: 120, k: 18, sig: 1 }, { n: 'Великий поход', min: 480, k: 48, sig: 3 });
  const _collectM = E.collectMission;
  E.collectMission = function (slot, idx, now) {
    const m = slot.missions && slot.missions[idx]; const md = m && E.MISSION_DUR[m.di]; const res = _collectM(slot, idx, now); if (!res) return res;
    E.addBond(slot, res.cid, res.ok ? 3 + Math.round(md.k / 4) : 1);
    if (res.ok && md && md.sig) { const q = md.sig + (slot.crew[res.cid] && slot.crew[res.cid].loy >= 90 ? 1 : 0); E.addMat(slot, 'asc_sigil', q); res.mats.asc_sigil = (res.mats.asc_sigil || 0) + q; }
    return res;
  };
  // поддержка: один член Свиты вне отряда даёт герою активный навык поддержки
  const sup = (arch, o) => { o.id = 'sup_' + arch; o.cls = 'sup'; SK[o.id] = o; };
  sup('warrior', { n: 'Клич соратника', ic: '📣', mp: 12, cd: 4, tgt: 'allies', d: 'Поддержка: «Боевой дух» отряду на 3 хода.', fx: [{ k: 'st', id: 'rally', dur: 3 }] });
  sup('mage', { n: 'Залп поддержки', ic: '✴️', mp: 14, cd: 3, tgt: 'foes', d: 'Поддержка: эфир 90% по всем врагам.', fx: [{ k: 'dmg', s: 'mag', m: 0.9, el: 'arcane' }] });
  sup('rogue', { n: 'Метка из тени', ic: '🎯', mp: 10, cd: 3, tgt: 'foe', d: 'Поддержка: «Метка» и «Уязвимость» на цель.', fx: [{ k: 'st', id: 'mark', dur: 3 }, { k: 'st', id: 'vuln', p: 1, dur: 2 }] });
  sup('healer', { n: 'Исцеление издалека', ic: '💚', mp: 16, cd: 4, tgt: 'allies', d: 'Поддержка: лечит отряд (90%) и даёт регенерацию.', fx: [{ k: 'heal', m: 0.9 }, { k: 'st', id: 'regen', dur: 3, pow: 0.25, s: 'heal' }] });
  sup('shield', { n: 'Заслон соратника', ic: '🛡️', mp: 14, cd: 4, tgt: 'allies', d: 'Поддержка: «Крепость» отряду.', fx: [{ k: 'st', id: 'defUp', dur: 3 }] });
  E.supportOk = function (slot, id) { if (!id) return ''; if (!slot.crew[id]) return 'Не в Свите'; if (slot.party.includes(id)) return 'Уже в отряде'; if (E.onMission(slot, id)) return 'На задании'; return ''; };
  E.setSupport = function (slot, id) { if (slot.run) return 'Во время вылазки поддержка не меняется'; const w = E.supportOk(slot, id); if (w) return w; slot.support = id || null; slot.rev++; return ''; };
  E.supportSkill = function (slot) { const id = slot && slot.support; if (!id || !slot.crew || !slot.crew[id] || E.supportOk(slot, id)) return null; const c = D.CREW[id], st = E.crewEnsure(slot.crew[id]); return { id: 'sup_' + c.arch, cid: id, bonus: Math.round(st.lv * 0.6 + st.star * 12 + st.skl * 5) }; };
  const _setParty = E.setParty; E.setParty = function (slot, ids) { _setParty(slot, ids); if (slot.support && slot.party.includes(slot.support)) slot.support = null; };

  // ───── Новые профили / сохранения: миграция v6 → v7 ─────
  const _newSlot = E.newSlot; if (_newSlot) E.newSlot = function (o) { const s = _newSlot(o); s.arts = {}; s.artEq = null; s.artProg = { best: 0, clears: {}, drops: 0 }; s.support = null; return s; };
  E.migrateArtSlot = function (s) { if (!s) return s; E.artEnsure(s); if (s.support === undefined) s.support = null; s.mats = s.mats || {}; for (const id in (s.crew || {})) { if (!D.CREW[id]) continue; E.crewEnsure(s.crew[id]); } return s; };
  if (S && S.migrations) {
    S.VERSION = 7;
    S.migrations[6] = function (p) { p.slots = (p.slots || []).map((s) => (s ? E.migrateArtSlot(s) : s)); p.v = 7; return p; };
  }
  if (typeof module !== 'undefined') module.exports = RPG;
})();
