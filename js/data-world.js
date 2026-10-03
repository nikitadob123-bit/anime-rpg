/* Мир: снаряжение, редкости, враги, боссы, подземелья. */
(function () {
  const RPG = globalThis.RPG || (globalThis.RPG = {});
  const D = RPG.D = RPG.D || {};

  D.LEVEL_CAP = 30;
  D.xpNeed = (L) => Math.round(48 * Math.pow(L, 1.7));
  D.RARITY = [
    { id: 'common', n: 'Обычный', c: '#b8bcc8', mul: 1, aff: 0 }, { id: 'uncommon', n: 'Необычный', c: '#6ee08a', mul: 1.12, aff: 1 }, { id: 'rare', n: 'Редкий', c: '#5aa8ff', mul: 1.25, aff: 2 },
    { id: 'epic', n: 'Эпический', c: '#c27aff', mul: 1.42, aff: 3 }, { id: 'legend', n: 'Легендарный', c: '#ffb23a', mul: 1.65, aff: 4 }
  ];
  D.SLOTS = { weapon: 'Оружие', head: 'Голова', body: 'Тело', boots: 'Ноги', ring: 'Кольцо', amulet: 'Амулет' };
  D.SLOT_IC = { weapon: '🗡️', head: '⛑️', body: '🥋', boots: '👢', ring: '💍', amulet: '📿' };

  // p = 5 + il*2.4 ; значения профиля умножаются на p
  D.BASES = {
    sword: { n: 'Меч', slot: 'weapon', wt: 'sword', ic: '🗡️', p: { atk: 1.3, str: 0.1 } }, axe: { n: 'Топор', slot: 'weapon', wt: 'axe', ic: '🪓', p: { atk: 1.55 } },
    dagger: { n: 'Кинжалы', slot: 'weapon', wt: 'dagger', ic: '🗡️', p: { atk: 1.0, agi: 0.14 } }, staff: { n: 'Посох', slot: 'weapon', wt: 'staff', ic: '🪄', p: { mag: 1.5, int: 0.1 } },
    wand: { n: 'Жезл', slot: 'weapon', wt: 'wand', ic: '🔱', p: { mag: 1.0, spi: 0.13, mp: 0.8 } }, shield: { n: 'Щит', slot: 'weapon', wt: 'shield', ic: '🛡️', p: { atk: 0.6, def: 0.9, vit: 0.1 } },
    head_h: { n: 'Шлем', slot: 'head', ic: '⛑️', p: { def: 0.55, hp: 1.2 } }, head_l: { n: 'Капюшон', slot: 'head', ic: '🧢', p: { def: 0.3, hp: 0.8, agi: 0.08 } }, head_c: { n: 'Колпак', slot: 'head', ic: '🎩', p: { res: 0.5, mag: 0.4, mp: 0.5 } },
    body_h: { n: 'Латы', slot: 'body', ic: '🛡️', p: { def: 1.0, hp: 2.2 } }, body_l: { n: 'Куртка', slot: 'body', ic: '🥋', p: { def: 0.6, hp: 1.4, agi: 0.1 } }, body_c: { n: 'Мантия', slot: 'body', ic: '👘', p: { res: 0.9, hp: 1.2, mag: 0.4 } },
    boots_h: { n: 'Сапоги', slot: 'boots', ic: '👢', p: { def: 0.45, hp: 0.8 } }, boots_l: { n: 'Мягкие сапоги', slot: 'boots', ic: '👟', p: { def: 0.25, hp: 0.6, agi: 0.1 } }, boots_c: { n: 'Туфли', slot: 'boots', ic: '🥿', p: { res: 0.4, hp: 0.6, mp: 0.5 } },
    ring: { n: 'Кольцо', slot: 'ring', ic: '💍', p: { atk: 0.4, mag: 0.4, hp: 0.6 } }, amulet: { n: 'Амулет', slot: 'amulet', ic: '📿', p: { def: 0.3, res: 0.3, mp: 0.9, hp: 0.8 } }
  };
  D.BASE_IDS = Object.keys(D.BASES);
  D.AFFIX = [
    { k: 'atk', f: 0.28, n: 'Силы' }, { k: 'mag', f: 0.28, n: 'Мудрости' }, { k: 'def', f: 0.22, n: 'Стойкости' }, { k: 'res', f: 0.22, n: 'Оберега' }, { k: 'hp', f: 0.8, n: 'Жизни' }, { k: 'mp', f: 0.6, n: 'Эфира' },
    { k: 'str', f: 0.12, n: 'Мощи' }, { k: 'agi', f: 0.12, n: 'Ловкости' }, { k: 'int', f: 0.12, n: 'Разума' }, { k: 'vit', f: 0.12, n: 'Крепости' }, { k: 'spi', f: 0.12, n: 'Духа' },
    { k: 'crit', pct: [1, 0.22], n: 'Остроты' }, { k: 'eva', pct: [1, 0.2], n: 'Теней' }, { k: 'spd', pct: [1, 0.18], n: 'Ветра' }, { k: 'dmg', pct: [1, 0.2], n: 'Ярости' }, { k: 'heal', pct: [2, 0.3], n: 'Милости' },
    { k: 'lifesteal', pct: [0.5, 0.08], n: 'Жажды' }, { k: 'gold', pct: [2, 0.4], n: 'Достатка' }, { k: 'dmg_fire', pct: [2, 0.35], n: 'Пламени' }, { k: 'dmg_ice', pct: [2, 0.35], n: 'Инея' }, { k: 'dmg_bolt', pct: [2, 0.35], n: 'Грома' }, { k: 'dmg_light', pct: [2, 0.35], n: 'Зари' }, { k: 'dmg_dark', pct: [2, 0.35], n: 'Мрака' }
  ];
  D.LEGEND_NAMES = ['Безмолвная Лира', 'Последний Рассвет', 'Слеза Осколка', 'Эхо Звёзд', 'Пепел Феникса', 'Клятва Серых Знамён', 'Тихий Шторм', 'Сердце Горы'];

  // ───── Враги ─────
  D.ROLES = {
    swarm: { hp: 0.55, atk: 0.8, def: 0.6, spd: 1.05, xp: 0.55, g: 0.6 }, brute: { hp: 1.25, atk: 1.0, def: 1.1, spd: 0.8, xp: 1, g: 1 }, skirm: { hp: 0.8, atk: 1.1, def: 0.8, spd: 1.3, xp: 0.9, g: 1 },
    caster: { hp: 0.7, atk: 1.2, def: 0.55, spd: 1.0, xp: 1, g: 1.1 }, tank: { hp: 1.7, atk: 0.8, def: 1.7, spd: 0.7, xp: 1.2, g: 1.2 }, support: { hp: 0.8, atk: 0.8, def: 0.7, spd: 1.0, xp: 1.1, g: 1.1 },
    mini: { hp: 4.2, atk: 1.15, def: 1.2, spd: 0.95, xp: 3.2, g: 3.5 }, boss: { hp: 8.5, atk: 1.25, def: 1.3, spd: 1.0, xp: 7, g: 8 }
  };
  const ES = D.ESK = {};
  function es(id, n, ic, o) { o.id = id; o.n = n; o.ic = ic; ES[id] = o; }
  es('e_hit', 'Удар', '👊', { tgt: 'foe', fx: [{ k: 'dmg', s: 'atk', m: 1.0 }] });
  es('e_gnaw', 'Грызня', '🦷', { tgt: 'foe', fx: [{ k: 'dmg', s: 'atk', m: 0.8, hits: 2 }] });
  es('e_bite', 'Укус', '🦷', { tgt: 'foe', fx: [{ k: 'dmg', s: 'atk', m: 1.0 }, { k: 'st', id: 'bleed', p: 0.3, dur: 3 }] });
  es('e_claw', 'Когти', '🐾', { tgt: 'foe', fx: [{ k: 'dmg', s: 'atk', m: 1.2 }] });
  es('e_slam', 'Сокрушающий удар', '💢', { tgt: 'foe', tele: 1, fx: [{ k: 'dmg', s: 'atk', m: 2.3 }] });
  es('e_charge', 'Таранный бросок', '🐗', { tgt: 'foe', fx: [{ k: 'dmg', s: 'atk', m: 1.5 }, { k: 'st', id: 'stun', p: 0.3, dur: 1 }] });
  es('e_spit', 'Ядовитый плевок', '🟢', { tgt: 'foe', fx: [{ k: 'dmg', s: 'atk', m: 0.7, el: 'dark' }, { k: 'st', id: 'poison', p: 1, dur: 3 }] });
  es('e_fire', 'Огненный сгусток', '🔥', { tgt: 'foe', fx: [{ k: 'dmg', s: 'mag', m: 1.2, el: 'fire' }, { k: 'st', id: 'burn', p: 0.35, dur: 3 }] });
  es('e_frost', 'Ледяная стрела', '❄️', { tgt: 'foe', fx: [{ k: 'dmg', s: 'mag', m: 1.15, el: 'ice' }, { k: 'st', id: 'chill', p: 0.6, dur: 2 }] });
  es('e_zap', 'Разряд', '⚡', { tgt: 'foe', fx: [{ k: 'dmg', s: 'mag', m: 1.25, el: 'bolt' }] });
  es('e_shade', 'Теневой коготь', '🌑', { tgt: 'foe', fx: [{ k: 'dmg', s: 'mag', m: 1.2, el: 'dark' }] });
  es('e_curse', 'Проклятие', '🕯️', { tgt: 'foe', fx: [{ k: 'dmg', s: 'mag', m: 0.6, el: 'dark' }, { k: 'st', id: 'weak', p: 1, dur: 3 }] });
  es('e_heal', 'Целебный шёпот', '💚', { tgt: 'eally', fx: [{ k: 'heal', m: 2.2 }] });
  es('e_howl', 'Боевой вой', '🐺', { tgt: 'eallies', fx: [{ k: 'st', id: 'rally', dur: 3 }] });
  es('e_guard', 'Каменная стойка', '🪨', { tgt: 'self', fx: [{ k: 'st', id: 'guard', dur: 2, to: 'self' }] });
  es('e_web', 'Паутина', '🕸️', { tgt: 'foe', fx: [{ k: 'dmg', s: 'atk', m: 0.6 }, { k: 'st', id: 'chill', p: 1, dur: 2 }, { k: 'st', id: 'weak', p: 0.6, dur: 2 }] });
  es('e_swarm', 'Налёт', '🦇', { tgt: 'foes', fx: [{ k: 'dmg', s: 'atk', m: 0.45 }] });
  es('e_blast', 'Взрывная волна', '💥', { tgt: 'foes', fx: [{ k: 'dmg', s: 'mag', m: 0.75, el: 'fire' }] });
  es('e_quake', 'Дрожь земли', '🌋', { tgt: 'foes', fx: [{ k: 'dmg', s: 'atk', m: 0.75 }, { k: 'st', id: 'weak', p: 0.5, dur: 2 }] });
  es('e_vines', 'Хлёсткие лозы', '🌿', { tgt: 'foes', fx: [{ k: 'dmg', s: 'atk', m: 0.65 }] });
  es('e_blizzard', 'Вьюга', '🌨️', { tgt: 'foes', fx: [{ k: 'dmg', s: 'mag', m: 0.8, el: 'ice' }, { k: 'st', id: 'chill', p: 1, dur: 2 }] });
  es('e_bigfrost', 'Ледяной приговор', '🧊', { tgt: 'foe', tele: 1, fx: [{ k: 'dmg', s: 'mag', m: 2.4, el: 'ice' }, { k: 'st', id: 'freeze', p: 0.6, dur: 1 }] });
  es('e_chord', 'Беззвучный аккорд', '🎼', { tgt: 'foes', tele: 1, fx: [{ k: 'dmg', s: 'mag', m: 1.7, el: 'dark' }, { k: 'st', id: 'weak', p: 1, dur: 2 }] });
  es('e_needle', 'Багряная игла', '🪡', { tgt: 'foe', fx: [{ k: 'dmg', s: 'atk', m: 0.8, hits: 3 }, { k: 'st', id: 'bleed', p: 0.6, dur: 3 }] });
  es('e_bigbite', 'Яд матки', '🕷️', { tgt: 'foe', tele: 1, fx: [{ k: 'dmg', s: 'atk', m: 1.9 }, { k: 'st', id: 'poison', p: 1, dur: 4 }] });
  es('e_miasma', 'Болотные испарения', '☁️', { tgt: 'foes', fx: [{ k: 'dmg', s: 'mag', m: 0.55, el: 'dark' }, { k: 'st', id: 'poison', p: 1, dur: 3 }] });
  es('e_leech', 'Кровососание', '🩸', { tgt: 'foe', fx: [{ k: 'dmg', s: 'atk', m: 0.9, drain: 0.7 }] });
  es('e_drill', 'Бур', '🔩', { tgt: 'foe', tele: 1, fx: [{ k: 'dmg', s: 'atk', m: 2.0, pierce: 0.5 }] });
  es('e_call_rat', 'Зов стаи', '🐀', { tgt: 'self', fx: [{ k: 'summon', id: 'rat' }] });
  es('e_call_acolyte', 'Призыв послушника', '🕯️', { tgt: 'self', fx: [{ k: 'summon', id: 'acolyte' }] });
  es('e_call_spider', 'Выводок', '🕷️', { tgt: 'self', fx: [{ k: 'summon', id: 'spiderling' }] });
  es('e_call_leech', 'Из тины', '🪱', { tgt: 'self', fx: [{ k: 'summon', id: 'leech' }] });
  es('e_call_shade', 'Зов теней', '👻', { tgt: 'self', fx: [{ k: 'summon', id: 'shade' }] });
  es('e_regrow', 'Возрождение коры', '🌳', { tgt: 'self', fx: [{ k: 'healPct', v: 0.12, to: 'self' }] });

  const EN = D.ENEMIES = {};
  function en(id, o) { o.id = id; o.sk = o.sk || ['e_hit']; o.loot = o.loot || []; EN[id] = o; }
  // role, lv — смещение уровня, el — стихия атак, weak/res — множители ×1.35/×0.6, tags
  en('rat', { n: 'Подвальная крыса', ic: '🐀', role: 'swarm', tags: ['beast'], sk: ['e_gnaw', 'e_bite'], loot: [['hide', 0.35, 1, 1], ['meat', 0.3, 1, 1]] });
  en('bat', { n: 'Летучая мышь', ic: '🦇', role: 'skirm', tags: ['beast'], sk: ['e_bite', 'e_swarm'], weak: ['light'], loot: [['hide', 0.3, 1, 1], ['dust', 0.15, 1, 1]] });
  en('slime', { n: 'Серая слизь', ic: '🟢', role: 'tank', tags: [], sk: ['e_hit', 'e_spit'], weak: ['fire'], res: ['phys'], loot: [['dust', 0.35, 1, 2], ['herb_g', 0.25, 1, 1]] });
  en('acolyte', { n: 'Послушник Безмолвия', ic: '🧙', role: 'caster', tags: ['human'], sk: ['e_shade', 'e_curse'], weak: ['light'], loot: [['cloth', 0.5, 1, 2], ['dust', 0.3, 1, 2], ['ore_cu', 0.2, 1, 1]] });
  en('rat_king', { n: 'Крысиный король', ic: '👑', role: 'mini', tags: ['beast'], sk: ['e_bite', 'e_slam', 'e_call_rat', 'e_gnaw'], loot: [['hide', 1, 2, 3], ['meat', 0.8, 1, 2], ['ore_cu', 0.6, 1, 2]] });
  en('gatekeeper', { n: 'Привратник Безмолвия', ic: '🗿', role: 'boss', tags: ['construct'], sk: ['e_hit', 'e_slam', 'e_call_acolyte', 'e_shade'], ph2: 'enrage', weak: ['light', 'bolt'], loot: [['dust', 1, 3, 5], ['ore_cu', 1, 3, 4], ['cloth', 1, 2, 3]], title: 'Страж врат', lines: ['Здесь… не поют.', 'Тишина — это милость.'] });

  en('wolf', { n: 'Лесной волк', ic: '🐺', role: 'skirm', tags: ['beast'], sk: ['e_bite', 'e_howl', 'e_claw'], weak: ['fire'], loot: [['hide', 0.5, 1, 2], ['fang', 0.35, 1, 1], ['meat', 0.4, 1, 2]] });
  en('vine', { n: 'Плеть-лоза', ic: '🌱', role: 'brute', tags: ['plant'], sk: ['e_vines', 'e_hit'], weak: ['fire'], res: ['bolt'], loot: [['herb_g', 0.6, 1, 2], ['herb_b', 0.3, 1, 1]] });
  en('sprite', { n: 'Лесной огонёк', ic: '🧚', role: 'caster', tags: ['spirit'], sk: ['e_zap', 'e_fire', 'e_heal'], weak: ['dark'], loot: [['dust', 0.5, 1, 2], ['herb_b', 0.3, 1, 1]] });
  en('spider', { n: 'Лесной паук', ic: '🕷️', role: 'skirm', tags: ['beast'], sk: ['e_web', 'e_spit', 'e_bite'], weak: ['fire'], loot: [['silk', 0.4, 1, 1], ['fang', 0.25, 1, 1]] });
  en('boar', { n: 'Дикий кабан', ic: '🐗', role: 'brute', tags: ['beast'], sk: ['e_charge', 'e_hit'], loot: [['hide', 0.5, 1, 2], ['meat', 0.6, 1, 2], ['fang', 0.3, 1, 1]] });
  en('spiderling', { n: 'Паучок', ic: '🕷️', role: 'swarm', tags: ['beast'], sk: ['e_bite'], weak: ['fire'], loot: [['silk', 0.2, 1, 1]] });
  en('spider_queen', { n: 'Паучья матка', ic: '🕸️', role: 'mini', tags: ['beast'], sk: ['e_web', 'e_bigbite', 'e_call_spider', 'e_bite'], weak: ['fire'], loot: [['silk', 1, 2, 4], ['fang', 0.8, 1, 2], ['herb_b', 0.5, 1, 2]] });
  en('oak_guardian', { n: 'Старый Хранитель', ic: '🌳', role: 'boss', tags: ['plant'], sk: ['e_vines', 'e_hit', 'e_regrow', 'e_slam'], ph2: 'enrage', weak: ['fire'], res: ['ice', 'bolt'], loot: [['herb_b', 1, 3, 5], ['herb_r', 0.8, 1, 3], ['silk', 0.7, 1, 2], ['hide', 1, 2, 3]], title: 'Дух древнего дуба', lines: ['Вы пришли… забрать песню?', 'Корни помнят каждого.'] });

  en('beetle', { n: 'Кристальный жук', ic: '🪲', role: 'tank', tags: ['beast'], sk: ['e_hit', 'e_guard', 'e_charge'], weak: ['bolt'], res: ['fire'], loot: [['gem_ae', 0.3, 1, 1], ['ore_cu', 0.5, 1, 2]] });
  en('golem', { n: 'Каменный голем', ic: '🗿', role: 'tank', tags: ['construct'], sk: ['e_hit', 'e_slam', 'e_guard'], weak: ['ice'], res: ['bolt'], loot: [['ore_fe', 0.5, 1, 2], ['ore_cu', 0.5, 1, 2]] });
  en('miner_ghost', { n: 'Дух шахтёра', ic: '👻', role: 'caster', tags: ['undead', 'spirit'], sk: ['e_shade', 'e_curse'], weak: ['light', 'fire'], res: ['phys'], loot: [['dust', 0.5, 1, 2], ['ore_fe', 0.3, 1, 1]] });
  en('imp', { n: 'Искровик', ic: '👹', role: 'skirm', tags: ['demon'], sk: ['e_fire', 'e_claw', 'e_blast'], weak: ['ice'], res: ['fire'], loot: [['gem_ae', 0.2, 1, 1], ['ore_fe', 0.3, 1, 1]] });
  en('bat_swarm', { n: 'Рой пещерных мышей', ic: '🦇', role: 'swarm', tags: ['beast'], sk: ['e_swarm', 'e_bite'], weak: ['fire', 'light'], loot: [['hide', 0.3, 1, 1], ['dust', 0.2, 1, 1]] });
  en('drill_golem', { n: 'Бур-голем', ic: '⚙️', role: 'mini', tags: ['construct'], sk: ['e_hit', 'e_drill', 'e_guard'], weak: ['ice', 'bolt'], loot: [['ore_fe', 1, 2, 4], ['gem_ae', 0.6, 1, 2]] });
  en('stone_king', { n: 'Гхорм, Каменный Король', ic: '👑', role: 'boss', tags: ['construct'], sk: ['e_hit', 'e_quake', 'e_slam', 'e_guard'], ph2: 'enrage', weak: ['ice', 'bolt'], loot: [['ore_fe', 1, 3, 5], ['ore_ms', 0.5, 1, 2], ['gem_ae', 1, 2, 3]], title: 'Король шахт', lines: ['Кархол — мой! Мой камень!', 'Рассыпьтесь в пыль!'] });

  en('drowned', { n: 'Утопец', ic: '🧟', role: 'brute', tags: ['undead'], sk: ['e_hit', 'e_claw', 'e_leech'], weak: ['fire', 'light'], res: ['ice'], loot: [['fish_m', 0.4, 1, 1], ['cloth', 0.3, 1, 1]] });
  en('wisp', { n: 'Болотный огонёк', ic: '🔵', role: 'caster', tags: ['spirit'], sk: ['e_fire', 'e_zap', 'e_blast'], weak: ['dark', 'ice'], res: ['fire'], loot: [['dust', 0.5, 1, 2], ['ess', 0.2, 1, 1]] });
  en('toad', { n: 'Ядовитая жаба', ic: '🐸', role: 'skirm', tags: ['beast'], sk: ['e_spit', 'e_bite'], weak: ['fire'], loot: [['herb_b', 0.4, 1, 1], ['fish_m', 0.3, 1, 1]] });
  en('leech', { n: 'Тинная пиявка', ic: '🪱', role: 'swarm', tags: ['beast'], sk: ['e_leech'], weak: ['fire'], loot: [['herb_r', 0.2, 1, 1]] });
  en('bog_witch', { n: 'Болотная ведунья', ic: '🧙‍♀️', role: 'support', tags: ['human'], sk: ['e_heal', 'e_curse', 'e_spit'], weak: ['light', 'fire'], loot: [['herb_r', 0.5, 1, 2], ['ess', 0.3, 1, 1], ['cloth', 0.4, 1, 2]] });
  en('hag', { n: 'Гнилая карга', ic: '🧛‍♀️', role: 'mini', tags: ['human'], sk: ['e_curse', 'e_miasma', 'e_call_leech', 'e_heal'], weak: ['light', 'fire'], loot: [['ess', 0.8, 1, 2], ['herb_r', 1, 2, 3]] });
  en('swamp_mother', { n: 'Болотная Матушка', ic: '🐊', role: 'boss', tags: ['beast'], sk: ['e_miasma', 'e_bigbite', 'e_leech', 'e_call_leech'], ph2: 'enrage', weak: ['fire', 'light'], res: ['ice'], loot: [['ess', 1, 2, 4], ['herb_r', 1, 2, 4], ['fish_m', 1, 3, 5], ['herb_s', 0.5, 1, 2]], title: 'Хозяйка трясины', lines: ['Тише… тише… тони.', 'Дети мои, угощайтесь!'] });

  en('frost_wolf', { n: 'Инистый волк', ic: '🐺', role: 'skirm', tags: ['beast'], sk: ['e_bite', 'e_frost', 'e_howl'], weak: ['fire'], res: ['ice'], loot: [['hide', 0.5, 1, 2], ['fang', 0.4, 1, 2]] });
  en('ice_elem', { n: 'Ледяной элементаль', ic: '🧊', role: 'caster', tags: ['spirit'], sk: ['e_frost', 'e_blizzard'], weak: ['fire'], res: ['ice'], loot: [['gem_ae', 0.3, 1, 1], ['dust', 0.4, 1, 2]] });
  en('snow_wraith', { n: 'Снежный призрак', ic: '👻', role: 'caster', tags: ['undead'], sk: ['e_shade', 'e_curse', 'e_frost'], weak: ['light', 'fire'], res: ['ice', 'phys'], loot: [['ess_l', 0.3, 1, 1], ['dust', 0.4, 1, 2]] });
  en('yeti', { n: 'Снежный великан', ic: '🦍', role: 'brute', tags: ['beast'], sk: ['e_hit', 'e_slam', 'e_charge'], weak: ['fire'], res: ['ice'], loot: [['hide', 0.7, 1, 3], ['fish_i', 0.3, 1, 2]] });
  en('frozen_knight', { n: 'Замёрзший рыцарь', ic: '🗡️', role: 'tank', tags: ['undead'], sk: ['e_hit', 'e_guard', 'e_slam'], weak: ['fire', 'light'], res: ['ice', 'dark'], loot: [['ore_ms', 0.4, 1, 1], ['ess_l', 0.25, 1, 1]] });
  en('ice_captain', { n: 'Капитан Инея', ic: '🥶', role: 'mini', tags: ['undead'], sk: ['e_hit', 'e_bigfrost', 'e_guard', 'e_blizzard'], weak: ['fire', 'light'], res: ['ice'], loot: [['ore_ms', 1, 2, 3], ['ess_l', 0.7, 1, 2]] });
  en('frost_queen', { n: 'Хозяйка Шпиля', ic: '❄️', role: 'boss', tags: ['spirit'], sk: ['e_frost', 'e_blizzard', 'e_bigfrost', 'e_guard'], ph2: 'enrage', weak: ['fire'], res: ['ice'], loot: [['ore_ms', 1, 3, 5], ['ess_l', 1, 2, 3], ['fish_i', 1, 2, 4], ['gem_ae', 1, 2, 3]], title: 'Королева инея', lines: ['Холод — это покой…', 'Замри. Замри. Замри.'] });

  en('ash_cultist', { n: 'Пепельный фанатик', ic: '🧎', role: 'brute', tags: ['human'], sk: ['e_hit', 'e_curse', 'e_slam'], weak: ['light'], loot: [['cloth', 0.5, 1, 2], ['ess', 0.25, 1, 1], ['ore_ms', 0.2, 1, 1]] });
  en('hellhound', { n: 'Пепельная гончая', ic: '🐕', role: 'skirm', tags: ['beast', 'demon'], sk: ['e_bite', 'e_fire', 'e_howl'], weak: ['ice'], res: ['fire'], loot: [['fang', 0.5, 1, 2], ['gem_fr', 0.12, 1, 1]] });
  en('silent_cleric', { n: 'Клирик Безмолвия', ic: '🧑‍⚕️', role: 'support', tags: ['human'], sk: ['e_heal', 'e_curse', 'e_shade'], weak: ['light'], loot: [['ess', 0.4, 1, 2], ['dust', 0.5, 1, 3]] });
  en('gargoyle', { n: 'Горгулья Собора', ic: '🦇', role: 'tank', tags: ['construct'], sk: ['e_claw', 'e_guard', 'e_slam'], weak: ['bolt'], res: ['fire'], loot: [['ore_ms', 0.4, 1, 2], ['gem_fr', 0.12, 1, 1]] });
  en('shade', { n: 'Тень без имени', ic: '👤', role: 'swarm', tags: ['spirit'], sk: ['e_shade'], weak: ['light'], res: ['dark'], loot: [['ess', 0.3, 1, 1]] });
  en('mara', { n: 'Мара Багряная Игла', ic: '🩸', role: 'mini', tags: ['human', 'demon'], sk: ['e_needle', 'e_fire', 'e_claw', 'e_needle'], weak: ['ice', 'light'], res: ['fire'], loot: [['gem_fr', 1, 1, 2], ['ess', 1, 1, 3]], title: 'Лейтенант Безмолвия', lines: ['Ты быстрее, чем я думала.', 'Но игла длиннее твоей жизни.'] });
  en('eydran', { n: 'Эйдран Вейл, Канцлер Тишины', ic: '🌌', role: 'boss', tags: ['human'], sk: ['e_shade', 'e_curse', 'e_chord', 'e_call_shade'], ph2: 'enrage', weak: ['light'], res: ['dark'], loot: [['gem_fr', 1, 2, 3], ['ess', 1, 3, 5], ['ess_l', 0.8, 1, 3], ['ore_ms', 1, 2, 4]], title: 'Канцлер Тишины', lines: ['Лира лжёт. Я лишь выключаю свет в комнате, где все кричат.', 'Тишина… наконец.'] });

  // ───── Подземелья ─────
  D.DUNGEONS = [
    { id: 'mill', n: 'Мельничные подвалы', ic: '🏚️', lv: 1, floors: 2, bio: 'crypt', col: '#5a4a6a', d: 'Сырые подвалы старой мельницы Лунного Брода. Под ними кто-то прорыл ход.', pool: ['rat', 'bat', 'slime', 'acolyte'], mini: 'rat_king', boss: 'gatekeeper', ev: ['chest', 'rest', 'gather_ore', 'shrine'], need: 'ch1' },
    { id: 'wood', n: 'Шепчущая чаща', ic: '🌲', lv: 3, floors: 3, bio: 'forest', col: '#2f6a4a', d: 'Лес Вельдора, где деревья перешёптываются о путниках.', pool: ['wolf', 'vine', 'sprite', 'spider', 'boar'], mini: 'spider_queen', boss: 'oak_guardian', ev: ['chest', 'rest', 'gather_herb', 'gather_game', 'shrine'], need: 'mill' },
    { id: 'mines', n: 'Кархольские шахты', ic: '⛏️', lv: 6, floors: 3, bio: 'cave', col: '#7a5a3a', d: 'Заброшенные шахты кархолмов. Камень здесь будто дышит.', pool: ['beetle', 'golem', 'miner_ghost', 'imp', 'bat_swarm'], mini: 'drill_golem', boss: 'stone_king', ev: ['chest', 'rest', 'gather_ore', 'gather_ore', 'shrine'], need: 'wood' },
    { id: 'swamp', n: 'Топи Тихих Огней', ic: '🌫️', lv: 9, floors: 3, bio: 'swamp', col: '#4a6a4a', d: 'Болото, где огоньки зовут путников — и редко отпускают.', pool: ['drowned', 'wisp', 'toad', 'leech', 'bog_witch'], mini: 'hag', boss: 'swamp_mother', ev: ['chest', 'rest', 'gather_herb', 'gather_fish', 'shrine'], need: 'mines' },
    { id: 'spire', n: 'Ледяной шпиль', ic: '🏔️', lv: 12, floors: 3, bio: 'ice', col: '#4a7aa0', d: 'Башня-обсерватория, скованная вечной зимой. Лира здесь звучит громче.', pool: ['frost_wolf', 'ice_elem', 'snow_wraith', 'yeti', 'frozen_knight'], mini: 'ice_captain', boss: 'frost_queen', ev: ['chest', 'rest', 'gather_ore', 'gather_fish', 'gather_game', 'shrine'], need: 'swamp' },
    { id: 'cathedral', n: 'Пепельный собор', ic: '⛪', lv: 15, floors: 3, bio: 'ash', col: '#7a3a4a', d: 'Сердце Ордена Безмолвия. Здесь решится судьба Лиры.', pool: ['ash_cultist', 'hellhound', 'silent_cleric', 'gargoyle', 'shade'], mini: 'mara', boss: 'eydran', ev: ['chest', 'rest', 'gather_ore', 'shrine'], need: 'spire' }
  ];
  D.DUN = {}; D.DUNGEONS.forEach(d => D.DUN[d.id] = d);
  D.TIERS = [{ n: 'Обычный', lv: 0, mul: 1, loot: 1, ic: '🟢' }, { n: 'Героический', lv: 3, mul: 1.2, loot: 1.3, ic: '🟠' }, { n: 'Кошмар', lv: 6, mul: 1.45, loot: 1.7, ic: '🔴' }, { n: 'Бездна', lv: 9, mul: 1.8, loot: 2.2, ic: '⚫' }];
  D.GATHER_EV = { gather_ore: { n: 'Рудная жила', ic: '⛏️', prof: 'miner', drops: [['ore_cu', 1, 3, 4], ['ore_fe', 1, 2, 3], ['ore_ms', 1, 2, 2], ['gem_ae', 0, 1, 1]] }, gather_herb: { n: 'Заросли трав', ic: '🌿', prof: 'herb', drops: [['herb_g', 1, 3, 4], ['herb_b', 1, 3, 3], ['herb_r', 1, 2, 2], ['herb_s', 0, 1, 1]] }, gather_game: { n: 'Звериная тропа', ic: '🏹', prof: 'hunt', drops: [['hide', 1, 3, 4], ['meat', 1, 3, 3], ['fang', 0, 2, 2], ['silk', 0, 1, 1]] }, gather_fish: { n: 'Тихая вода', ic: '🎣', prof: 'fish', drops: [['fish_s', 1, 3, 3], ['fish_m', 1, 3, 3], ['fish_i', 1, 2, 2]] } };

  D.COMPANIONS = {
    kairen: { n: 'Кайрен Вос', cls: 'warrior', race: 'human', portrait: 'npc_kairen', ic: '🗡️', skills: ['w_power', 'w_cleave', 'w_rally', 'w_second'], k: 0.8, need: 'ch1_done', role: 'Рыцарь Серых Знамён', d: 'Опытный фронтовик. Держит строй, поднимает боевой дух.' },
    tika: { n: 'Тика Ломэ', cls: 'rogue', race: 'beast', portrait: 'npc_tika', ic: '🦊', skills: ['r_stab', 'r_poison', 'r_fin', 'r_smoke'], k: 0.78, need: 'ch1_done', role: 'Разведчица-вельдар', d: 'Быстрая, ядовитая, ловкая. Любит добивать.' },
    irel: { n: 'Ирэль', cls: 'healer', race: 'elf', portrait: 'npc_irel', ic: '🌙', skills: ['h_heal', 'h_regen', 'h_cleanse', 'h_smite', 'h_mend'], k: 0.78, need: 'ch2_irel', role: 'Хранительница песни', d: 'Целительница с тайной. Лечит и очищает отряд.' }
  };
  D.COMP_IDS = Object.keys(D.COMPANIONS);
  if (typeof module !== 'undefined') module.exports = RPG;
})();
