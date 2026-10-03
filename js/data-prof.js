/* Профессии, материалы, рецепты, расходники. */
(function () {
  const RPG = globalThis.RPG || (globalThis.RPG = {});
  const D = RPG.D = RPG.D || {};

  D.MATS = {
    ore_cu: { n: 'Медная руда', ic: '🟤', v: 3 }, ore_fe: { n: 'Железная руда', ic: '⚙️', v: 7 }, ore_ms: { n: 'Лунное серебро', ic: '🌙', v: 16 },
    gem_ae: { n: 'Эфирный кристалл', ic: '💠', v: 14 }, gem_fr: { n: 'Рубин Бездны', ic: '♦️', v: 30 },
    ing_cu: { n: 'Медный слиток', ic: '🟧', v: 8 }, ing_fe: { n: 'Железный слиток', ic: '⬜', v: 18 }, ing_ms: { n: 'Слиток лунного серебра', ic: '🔷', v: 40 },
    herb_g: { n: 'Лугоцвет', ic: '🌿', v: 3 }, herb_b: { n: 'Туманник', ic: '🍃', v: 7 }, herb_r: { n: 'Алый корень', ic: '🥕', v: 12 }, herb_s: { n: 'Звёздница', ic: '🌸', v: 22 },
    hide: { n: 'Шкура', ic: '🟫', v: 4 }, leather: { n: 'Выделанная кожа', ic: '🧶', v: 10 }, fang: { n: 'Клык', ic: '🦷', v: 6 }, silk: { n: 'Паутинный шёлк', ic: '🕸️', v: 12 }, cloth: { n: 'Грубая ткань', ic: '🧵', v: 4 },
    fish_s: { n: 'Речной окунь', ic: '🐟', v: 4 }, fish_m: { n: 'Болотный сом', ic: '🐠', v: 9 }, fish_i: { n: 'Ледяной налим', ic: '🐡', v: 16 }, meat: { n: 'Мясо', ic: '🍖', v: 4 },
    dust: { n: 'Магическая пыль', ic: '✨', v: 8 }, ess: { n: 'Эссенция тени', ic: '🌑', v: 18 }, ess_l: { n: 'Эссенция света', ic: '🌟', v: 18 }, spice: { n: 'Специи', ic: '🧂', v: 5 }, prov: { n: 'Провиант', ic: '🎒', v: 6 }
  };

  // Расходники: heal/mp — доля максимума; dmg — множитель от уровня; buff — на вылазку
  D.CONS = {
    pot_hp1: { n: 'Малое зелье лечения', ic: '🧪', v: 10, heal: 0.35, d: 'Лечит 35% здоровья.' }, pot_hp2: { n: 'Зелье лечения', ic: '🧪', v: 26, heal: 0.6, d: 'Лечит 60% здоровья.' }, pot_hp3: { n: 'Большое зелье лечения', ic: '🧪', v: 60, heal: 0.9, d: 'Лечит 90% здоровья.' },
    pot_mp1: { n: 'Малый настой энергии', ic: '💙', v: 12, mp: 0.4, d: 'Восстанавливает 40% энергии.' }, pot_mp2: { n: 'Настой энергии', ic: '💙', v: 30, mp: 0.7, d: 'Восстанавливает 70% энергии.' },
    antidote: { n: 'Противоядие', ic: '💚', v: 12, cleanse: 1, heal: 0.15, d: 'Снимает негативные статусы, лечит 15%.' },
    bomb_fire: { n: 'Огненная склянка', ic: '🔥', v: 18, dmg: 1, el: 'fire', aoe: 1, d: 'Взрыв огня по всем врагам.' }, bomb_ice: { n: 'Ледяная склянка', ic: '🧊', v: 20, dmg: 1, el: 'ice', aoe: 1, st: 'chill', d: 'Холод по всем врагам и замедление.' }, bomb_bolt: { n: 'Громовая склянка', ic: '⚡', v: 24, dmg: 1.3, el: 'bolt', d: 'Мощный разряд по одной цели.' },
    el_atk: { n: 'Эликсир ярости', ic: '🔴', v: 40, buff: { dmg: 12 }, bn: '+12% урона', d: 'На вылазку: +12% к урону.' }, el_def: { n: 'Эликсир стойкости', ic: '🔵', v: 40, buff: { def: 15, res: 15 }, bn: '+15% брони/сопр.', d: 'На вылазку: +15% брони и сопротивления.' },
    food_stew: { n: 'Тушёное мясо', ic: '🍲', v: 14, buff: { hp: 10 }, bn: '+10% здоровья', d: 'На вылазку: +10% здоровья.' }, food_roast: { n: 'Жаркое с травами', ic: '🍗', v: 22, buff: { atk: 8, mag: 8 }, bn: '+8% силы', d: 'На вылазку: +8% силы атаки и магии.' },
    food_soup: { n: 'Рыбная похлёбка', ic: '🍜', v: 18, buff: { mpRegen: 1 }, bn: '+1 энергия/ход', d: 'На вылазку: +1 энергия за ход.' }, food_pie: { n: 'Ягодный пирог', ic: '🥧', v: 24, buff: { xp: 12 }, bn: '+12% опыта', d: 'На вылазку: +12% опыта.' },
    food_feast: { n: 'Пир героя', ic: '🍱', v: 70, buff: { hp: 12, dmg: 6, xp: 8, hpRegen: 1 }, bn: 'Комплексный бонус', d: 'На вылазку: +12% здоровья, +6% урона, +8% опыта, +1% регена.' }
  };

  // Профессии
  D.PROFS = {
    smith: { n: 'Кузнец', ic: '⚒️', t: 'craft', d: 'Куёт оружие и тяжёлые доспехи, плавит слитки. В кузне — улучшение снаряжения до +6 (вместо +3) с 25% скидкой.',
      perks: { 5: { n: 'Закалка', m: { gear: 4 } }, 10: { n: 'Мастер горна', m: { gear: 8 } }, 15: { n: 'Рука мастера', m: { gear: 12 } }, 20: { n: 'Легенда кузни', m: { gear: 16, dmg: 4 } } }, fx: 'Ваше снаряжение даёт больше характеристик.' },
    alch: { n: 'Алхимик', ic: '⚗️', t: 'craft', d: 'Варит зелья, склянки-бомбы и эликсиры.',
      perks: { 5: { n: 'Точные дозы', m: { potion: 15 } }, 10: { n: 'Концентрат', m: { potion: 30, bomb: 15 } }, 15: { n: 'Эликсирный мастер', m: { potion: 45, bomb: 30 } }, 20: { n: 'Философский камень', m: { potion: 60, bomb: 50, hpRegen: 1 } } }, fx: 'Зелья лечат сильнее, склянки бьют больнее.' },
    ench: { n: 'Зачарователь', ic: '🔮', t: 'craft', d: 'Создаёт посохи, жезлы, кольца и амулеты, накладывает чары на снаряжение.',
      perks: { 5: { n: 'Искра чар', m: { mag: 3, res: 3 } }, 10: { n: 'Резонанс', m: { mag: 6, res: 6 } }, 15: { n: 'Узор силы', m: { mag: 9, dmg: 4, res: 9 } }, 20: { n: 'Архичародей', m: { mag: 12, dmg: 8, res: 12 } } }, fx: 'Сильнее магия и сопротивление.' },
    leath: { n: 'Кожевник', ic: '🧵', t: 'craft', d: 'Выделывает кожу, шьёт лёгкие доспехи, одежду и кинжалы.',
      perks: { 5: { n: 'Лёгкий шаг', m: { eva: 3 } }, 10: { n: 'Мягкая подошва', m: { eva: 5, spd: 4 } }, 15: { n: 'Второй слой', m: { eva: 7, spd: 6, hp: 5 } }, 20: { n: 'Мастер кроя', m: { eva: 9, spd: 8, hp: 8 } } }, fx: 'Больше уклонения и скорости.' },
    cook: { n: 'Повар', ic: '🍳', t: 'craft', d: 'Готовит блюда, дающие бонусы на всю вылазку.',
      perks: { 5: { n: 'Вкусная еда', m: { food: 20 } }, 10: { n: 'Секретный рецепт', m: { food: 40, hpRegen: 0.5 } }, 15: { n: 'Шеф-повар', m: { food: 60, hpRegen: 1 } }, 20: { n: 'Королевский стол', m: { food: 90, hpRegen: 1.5, xp: 5 } } }, fx: 'Еда сильнее, здоровье восстанавливается между ходами.' },
    miner: { n: 'Шахтёр', ic: '⛏️', t: 'gather', d: 'Добывает руду и кристаллы — в подземельях (жилы) и на промысле.',
      perks: { 5: { n: 'Крепкая спина', m: { hp: 4, gather: 10 } }, 10: { n: 'Шахтёрская закалка', m: { def: 5, gather: 20 } }, 15: { n: 'Каменный нрав', m: { physTaken: -4, def: 5, gather: 30 } }, 20: { n: 'Повелитель недр', m: { physTaken: -6, thorns: 5, gather: 40 } } }, fx: 'Прочнее в бою, больше руды.',
      areas: [{ lv: 1, n: 'Старая штольня', drops: [['ore_cu', 2, 4, 5], ['gem_ae', 0, 1, 1]] }, { lv: 5, n: 'Железный пласт', drops: [['ore_cu', 1, 3, 3], ['ore_fe', 2, 4, 5], ['gem_ae', 0, 1, 2]] }, { lv: 11, n: 'Лунная жила', drops: [['ore_fe', 1, 3, 3], ['ore_ms', 2, 3, 5], ['gem_ae', 1, 2, 2], ['gem_fr', 0, 1, 1]] }] },
    herb: { n: 'Травник', ic: '🌿', t: 'gather', d: 'Собирает травы и цветы — для зелий, блюд и чар.',
      perks: { 5: { n: 'Знаток трав', m: { gather: 10, hpRegen: 0.5 } }, 10: { n: 'Зелёный шёпот', m: { gather: 20, hpRegen: 1, potion: 10 } }, 15: { n: 'Хранитель рощи', m: { gather: 30, hpRegen: 1, heal: 6 } }, 20: { n: 'Дитя леса', m: { gather: 40, hpRegen: 1.5, heal: 12 } } }, fx: 'Раны затягиваются сами, больше трав.',
      areas: [{ lv: 1, n: 'Луг у реки', drops: [['herb_g', 2, 4, 5], ['spice', 0, 1, 1]] }, { lv: 5, n: 'Туманная опушка', drops: [['herb_g', 1, 2, 3], ['herb_b', 2, 3, 5], ['spice', 0, 1, 1]] }, { lv: 11, n: 'Звёздная поляна', drops: [['herb_b', 1, 2, 3], ['herb_r', 2, 3, 4], ['herb_s', 1, 2, 2]] }] },
    hunt: { n: 'Охотник', ic: '🏹', t: 'gather', d: 'Добывает шкуры, клыки и мясо.',
      perks: { 5: { n: 'Меткий глаз', m: { crit: 3, gather: 10 } }, 10: { n: 'Следопыт', m: { crit: 5, beastDmg: 10, gather: 20 } }, 15: { n: 'Мастер охоты', m: { crit: 7, beastDmg: 20, gather: 30 } }, 20: { n: 'Хозяин леса', m: { crit: 9, beastDmg: 30, critDmg: 0.2, gather: 40 } } }, fx: 'Больше крита и урона по зверям.',
      areas: [{ lv: 1, n: 'Заячьи тропы', drops: [['hide', 2, 3, 4], ['meat', 1, 3, 4], ['fang', 0, 1, 1]] }, { lv: 5, n: 'Волчий лес', drops: [['hide', 2, 4, 4], ['meat', 2, 3, 3], ['fang', 1, 2, 3], ['silk', 0, 1, 1]] }, { lv: 11, n: 'Пустоши Вельдора', drops: [['hide', 3, 5, 4], ['fang', 2, 3, 3], ['silk', 1, 2, 3], ['meat', 2, 4, 3]] }] },
    fish: { n: 'Рыбак', ic: '🎣', t: 'gather', d: 'Ловит рыбу — основа блюд повара.',
      perks: { 5: { n: 'Терпение', m: { mpRegen: 0.5, gather: 10 } }, 10: { n: 'Чувство воды', m: { mpRegen: 1, drop: 5, gather: 20 } }, 15: { n: 'Глубинный улов', m: { mpRegen: 1, drop: 10, gather: 30 } }, 20: { n: 'Морской волк', m: { mpRegen: 1.5, drop: 15, gather: 40, xp: 5 } } }, fx: 'Больше энергии и удачи.',
      areas: [{ lv: 1, n: 'Тихая заводь', drops: [['fish_s', 2, 4, 5], ['spice', 0, 1, 1]] }, { lv: 5, n: 'Топи Тихих Огней', drops: [['fish_s', 1, 2, 2], ['fish_m', 2, 3, 5]] }, { lv: 11, n: 'Ледяные озёра', drops: [['fish_m', 1, 2, 2], ['fish_i', 2, 3, 5]] }] }
  };
  D.PROF_IDS = Object.keys(D.PROFS);
  D.PROF_MAIN_CAP = 20; D.PROF_SUB_CAP = 10;
  D.profXpNeed = (lv) => Math.round(18 + lv * lv * 5);

  // Чары (Зачарователь)
  D.ENCHANTS = [
    { id: 'en_fire', n: 'Огненные чары', lv: 3, m: { dmg_fire: 6 }, mats: { dust: 3, herb_r: 1 }, gold: 30 },
    { id: 'en_ice', n: 'Ледяные чары', lv: 3, m: { dmg_ice: 6 }, mats: { dust: 3, herb_b: 2 }, gold: 30 },
    { id: 'en_bolt', n: 'Грозовые чары', lv: 5, m: { dmg_bolt: 6 }, mats: { dust: 3, gem_ae: 1 }, gold: 40 },
    { id: 'en_light', n: 'Чары света', lv: 5, m: { dmg_light: 6, heal: 4 }, mats: { dust: 3, ess_l: 1 }, gold: 40 },
    { id: 'en_dark', n: 'Чары тени', lv: 5, m: { dmg_dark: 6, lifesteal: 1 }, mats: { dust: 3, ess: 1 }, gold: 40 },
    { id: 'en_edge', n: 'Чары остроты', lv: 7, m: { crit: 4, critDmg: 0.1 }, mats: { dust: 4, fang: 2 }, gold: 60 },
    { id: 'en_vigor', n: 'Чары живучести', lv: 9, m: { hp: 6, hpRegen: 0.5 }, mats: { dust: 4, herb_s: 1 }, gold: 70 },
    { id: 'en_ward', n: 'Чары оберега', lv: 12, m: { def: 6, res: 6, taken: -2 }, mats: { dust: 5, gem_ae: 2 }, gold: 100 },
    { id: 'en_abyss', n: 'Чары Бездны', lv: 16, m: { dmg: 8, crit: 4 }, mats: { dust: 6, gem_fr: 1, ess: 2 }, gold: 180 }
  ];

  // Рецепты
  D.RECIPES = [];
  const TIERS = [
    { lv: 0, il: 3, pre: 'Медный', ing: 'ing_cu', n: 4 }, { lv: 5, il: 8, pre: 'Железный', ing: 'ing_fe', n: 4 }, { lv: 10, il: 13, pre: 'Лунный', ing: 'ing_ms', n: 4 }, { lv: 15, il: 18, pre: 'Рубиновый', ing: 'ing_ms', n: 5, ex: { gem_fr: 1 } }
  ];
  function rc(o) { o.id = o.id || (o.prof + '_' + D.RECIPES.length); D.RECIPES.push(o); }
  // Кузнец
  rc({ prof: 'smith', id: 'smelt_cu', lv: 1, n: 'Плавка меди', mats: { ore_cu: 2 }, gold: 0, out: { kind: 'mat', id: 'ing_cu', q: 1 }, xp: 5 });
  rc({ prof: 'smith', id: 'smelt_fe', lv: 4, n: 'Плавка железа', mats: { ore_fe: 2 }, gold: 0, out: { kind: 'mat', id: 'ing_fe', q: 1 }, xp: 9 });
  rc({ prof: 'smith', id: 'smelt_ms', lv: 9, n: 'Плавка лунного серебра', mats: { ore_ms: 2 }, gold: 0, out: { kind: 'mat', id: 'ing_ms', q: 1 }, xp: 16 });
  function gearSet(prof, list) {
    TIERS.forEach((T, ti) => list.forEach((b, bi) => {
      const mats = {}; mats[T.ing] = T.n + (b.h || 0); if (b.extra) Object.keys(b.extra).forEach(k => mats[k] = (mats[k] || 0) + b.extra[k] + ti); if (T.ex) Object.keys(T.ex).forEach(k => mats[k] = T.ex[k]);
      rc({ prof, id: prof + '_' + b.k + '_' + ti, lv: Math.max(1, T.lv + 1 + bi % 3 + (b.ofs || 0)), n: T.pre + ' ' + (b.nm || D.BASES[b.k].n).toLowerCase(), mats, gold: 12 + ti * 30 + bi * 4, out: { kind: 'item', base: b.k, il: T.il, rmin: 1 }, xp: 14 + ti * 14 });
    }));
  }
  // D.BASES определяется в data-world.js; рецепты строятся лениво
  D.buildRecipes = function () {
    if (D._recBuilt) return; D._recBuilt = true;
    gearSet('smith', [{ k: 'sword' }, { k: 'axe', ofs: 1 }, { k: 'shield', ofs: 1 }, { k: 'head_h' }, { k: 'body_h', ofs: 2, h: 2 }, { k: 'boots_h', ofs: 1 }]);
    rc({ prof: 'leath', id: 'tan', lv: 1, n: 'Выделка кожи', mats: { hide: 2 }, gold: 0, out: { kind: 'mat', id: 'leather', q: 1 }, xp: 5 });
    TIERS.forEach((T, ti) => ['dagger', 'head_l', 'body_l', 'boots_l'].forEach((k, bi) => {
      const mats = { leather: 3 + ti + (k === 'body_l' ? 2 : 0) }; if (ti >= 1) mats.silk = 1 + ti; if (ti >= 3) mats.fang = 3;
      rc({ prof: 'leath', id: 'leath_' + k + '_' + ti, lv: T.lv + 1 + bi, n: T.pre.replace('Медный', 'Кожаный').replace('Железный', 'Клёпаный').replace('Лунный', 'Лунношёлковый').replace('Рубиновый', 'Закалённый') + ' ' + D.BASES[k].n.toLowerCase(), mats, gold: 10 + ti * 28, out: { kind: 'item', base: k, il: T.il, rmin: 1 }, xp: 14 + ti * 14 });
    }));
    TIERS.forEach((T, ti) => ['staff', 'wand', 'body_c', 'head_c', 'ring', 'amulet'].forEach((k, bi) => {
      const mats = { dust: 3 + ti * 2, cloth: 2 + ti }; if (k === 'ring' || k === 'amulet') { mats.gem_ae = 1 + ti; delete mats.cloth; mats[T.ing] = 2; } if (ti >= 2) mats.herb_s = 1;
      rc({ prof: 'ench', id: 'ench_' + k + '_' + ti, lv: T.lv + 1 + (bi % 3), n: ['Эфирный', 'Рунный', 'Звёздный', 'Бездновый'][ti] + ' ' + D.BASES[k].n.toLowerCase(), mats, gold: 14 + ti * 32, out: { kind: 'item', base: k, il: T.il, rmin: 1 }, xp: 14 + ti * 14 });
    }));
    const al = [
      ['pot_hp1', 1, { herb_g: 2 }, 3, 6], ['pot_mp1', 2, { herb_g: 1, dust: 1 }, 5, 8], ['antidote', 3, { herb_b: 1, herb_g: 1 }, 4, 8], ['bomb_fire', 4, { dust: 1, herb_r: 1, ore_cu: 1 }, 8, 12], ['pot_hp2', 5, { herb_b: 2, herb_g: 1 }, 10, 14],
      ['bomb_ice', 6, { dust: 1, herb_b: 2, fish_s: 1 }, 10, 14], ['pot_mp2', 8, { herb_b: 2, dust: 2 }, 14, 18], ['bomb_bolt', 8, { dust: 2, gem_ae: 1 }, 14, 20], ['el_atk', 9, { herb_r: 2, fang: 1 }, 20, 26], ['el_def', 9, { herb_r: 2, ore_fe: 1 }, 20, 26], ['pot_hp3', 12, { herb_r: 2, herb_s: 1 }, 30, 40]
    ];
    al.forEach(a => rc({ prof: 'alch', id: 'alch_' + a[0], lv: a[1], n: D.CONS[a[0]].n, mats: a[2], gold: a[3], out: { kind: 'cons', id: a[0], q: 1 }, xp: a[4] }));
    const ck = [['food_stew', 1, { meat: 1, herb_g: 1 }, 4, 6], ['food_soup', 2, { fish_s: 2, spice: 1 }, 6, 8], ['food_roast', 4, { meat: 2, spice: 1, herb_b: 1 }, 8, 12], ['food_pie', 7, { herb_r: 1, spice: 2, meat: 1 }, 10, 18], ['food_feast', 12, { meat: 2, fish_m: 1, herb_s: 1, spice: 2 }, 30, 40]];
    ck.forEach(a => rc({ prof: 'cook', id: 'cook_' + a[0], lv: a[1], n: D.CONS[a[0]].n, mats: a[2], gold: a[3], out: { kind: 'cons', id: a[0], q: 1 }, xp: a[4] }));
  };
  D.recipesFor = (prof) => { D.buildRecipes(); return D.RECIPES.filter(r => r.prof === prof); };
  if (typeof module !== 'undefined') module.exports = RPG;
})();
