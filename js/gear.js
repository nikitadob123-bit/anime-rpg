/* Снаряжение: 11 редкостей (Обычный … До существования), генерация предметов по редкости — основные статы, линии характеристик,
   аффиксы и особые свойства (уникальное / мифическое / божественное), веса выпадения по уровню контента, цены и улучшения,
   перевод старых вещей (5 редкостей) на новую лестницу. Переопределяет предметные функции engine.js. Логика без DOM. */
(function () {
  const RPG = globalThis.RPG, D = RPG.D, E = RPG.E;
  const clamp = E.clamp;

  // ───── Лестница редкостей ─────
  // mul — множитель основных статов основы (атака/броня/здоровье…), am — линий характеристик (Сила, Ловкость…), pm — аффиксов и особых свойств;
  // attr/aff — [мин, макс] число линий характеристик и аффиксов; fx — особые свойства: u — уникальное, m — мифическое, d — божественное;
  // w/lv/ramp/lk — вес выпадения, уровень контента, с которого редкость появляется, ширина «разгона» и степень влияния удачи; boss — только с боссов;
  // up — доп. уровни улучшения; val — множитель цены; lock — ещё не открыта (никогда не создаётся источниками).
  const R = (id, n, c, g, o) => Object.assign({ id, n, c, g }, o);
  D.RARITY = [
    R('common', 'Обычный', '#b8bcc8', 'rgba(184,188,200,.28)', { mul: 1, am: 1, pm: 0.7, attr: [0, 1], aff: [0, 0], fx: [], w: 600, lv: 0, ramp: 1, lk: 0, up: 0, val: 1 }),
    R('uncommon', 'Необычный', '#6ee08a', 'rgba(110,224,138,.35)', { mul: 1.1, am: 1.4, pm: 0.82, attr: [1, 1], aff: [1, 1], fx: [], w: 260, lv: 0, ramp: 1, lk: 1, up: 0, val: 1.45 }),
    R('rare', 'Редкий', '#5aa8ff', 'rgba(90,168,255,.42)', { mul: 1.22, am: 1.9, pm: 0.95, attr: [1, 2], aff: [2, 3], fx: [], w: 90, lv: 2, ramp: 6, lk: 1.15, up: 1, val: 2.05 }),
    R('unique', 'Уникальный', '#3fe6d2', 'rgba(63,230,210,.45)', { mul: 1.36, am: 2.4, pm: 1.1, attr: [2, 2], aff: [3, 3], fx: ['u'], w: 26, lv: 10, ramp: 12, lk: 1.4, up: 1, val: 3 }),
    R('epic', 'Эпический', '#c27aff', 'rgba(194,122,255,.5)', { mul: 1.5, am: 2.9, pm: 1.26, attr: [2, 3], aff: [3, 4], fx: ['u'], w: 9, lv: 18, ramp: 15, lk: 1.6, up: 2, val: 4.3 }),
    R('legend', 'Легендарный', '#ffb23a', 'rgba(255,178,58,.55)', { mul: 1.68, am: 3.4, pm: 1.45, attr: [3, 3], aff: [4, 5], fx: ['u'], w: 3.5, lv: 28, ramp: 20, lk: 1.8, up: 2, val: 6.4 }),
    R('mythic', 'Мифический', '#ff3b5c', 'rgba(255,59,92,.58)', { mul: 1.9, am: 4, pm: 1.7, attr: [3, 4], aff: [5, 5], fx: ['u', 'm'], w: 0.9, lv: 45, ramp: 25, lk: 2.0, up: 3, val: 9.5 }),
    R('divine', 'Божественный', '#fff1c4', 'rgba(255,214,110,.75)', { mul: 2.15, am: 4.8, pm: 2.0, attr: [4, 4], aff: [5, 6], fx: ['u', 'm', 'd'], w: 0.12, lv: 65, ramp: 30, lk: 2.2, boss: 1, up: 4, val: 14 }),
    R('concept', 'Концептуальный', '#9ff0ff', 'rgba(170,140,255,.7)', { mul: 2.5, am: 5.8, pm: 2.4, attr: [4, 5], aff: [6, 6], fx: ['u', 'm', 'd', 'd'], w: 0, lv: 999, ramp: 1, lk: 2, up: 5, val: 20, lock: 1 }),
    R('origin', 'Исток', '#8f7bff', 'rgba(60,40,200,.8)', { mul: 2.9, am: 7, pm: 2.9, attr: [5, 5], aff: [7, 7], fx: ['u', 'u', 'm', 'd', 'd'], w: 0, lv: 999, ramp: 1, lk: 2, up: 7, val: 30, lock: 1 }),
    R('prexist', 'До существования', '#f4f4f4', 'rgba(255,255,255,.85)', { mul: 3.4, am: 8.4, pm: 3.5, attr: [5, 6], aff: [7, 7], fx: ['u', 'u', 'm', 'm', 'd', 'd'], w: 0, lv: 999, ramp: 1, lk: 2, up: 8, val: 45, lock: 1 })
  ];
  D.RARITY_OPEN = 7;                         // старшая редкость, которую создают дроп/лавка/ремесло/почта; 8…10 — «ещё не открыто»
  D.RARITY_IDS = D.RARITY.map((r) => r.id);
  D.RARITY_OLD = { 0: 0, 1: 1, 2: 2, 3: 4, 4: 5 }; // старая лестница (5 ступеней) → новая, по названиям: Эпический → 4, Легендарный → 5
  E.rar = (it) => D.RARITY[clamp((it && it.r) | 0, 0, D.RARITY.length - 1)];

  // ───── Подписи и единицы ─────
  const EL = D.ELEM_IDS.concat(['phys']);
  const ELN = { fire: 'огнём', ice: 'льдом', bolt: 'молнией', earth: 'землёй', wind: 'ветром', water: 'водой', light: 'светом', dark: 'тенью', arcane: 'пустотой', phys: 'физ.' };
  D.GEAR_LBL = Object.assign({}, {
    dmg: 'Весь урон', crit: 'Шанс крита', critDmg: 'Урон крита', acc: 'Меткость', pen: 'Бронепробитие', penMag: 'Пробитие сопротивления', eva: 'Уклонение', spd: 'Скорость',
    lifesteal: 'Вампиризм', heal: 'Сила лечения', bossDmg: 'Урон по боссам', counter: 'Шанс контратаки', thorns: 'Шипы', hpRegen: 'Здоровье за ход', mpRegen: 'Энергия за ход',
    castSpd: 'Скорость каста', cdr: 'Снижение перезарядки', manaEff: 'Эффективность энергии', init: 'Инициатива', dbl: 'Двойной удар', blockCh: 'Шанс блока', tenac: 'Стойкость',
    statRes: 'Сопротивление статусам', execute: 'Урон по раненым (HP<30%)', lowTaken: 'Урон по вам при HP<30%', lowDmg: 'Урон при своём HP<30%', openDmg: 'Урон в первые 2 хода',
    killMp: 'Энергия за убийство', debuffDmg: 'Урон по ослабленным', startShield: 'Щит в начале боя (от HP)', reviveOnce: 'Воскрешение раз за бой (30% HP)', dmgMul: 'Множитель урона',
    allStat: 'Все характеристики', startHaste: 'Ускорение в начале боя', taken: 'Получаемый урон', ccRes: 'Сопротивление эффектам контроля', conceptRes: 'Сопротивление концептуальному урону', gold: 'Золото', xp: 'Опыт', drop: 'Удача добычи'
  });
  EL.forEach((e) => { D.GEAR_LBL['dmg_' + e] = 'Урон ' + ELN[e]; D.GEAR_LBL['res_' + e] = 'Сопр.: ' + (e === 'phys' ? 'физ.' : D.ELEMS[e].n.toLowerCase()); if (D.MODN && !D.MODN['dmg_' + e]) D.MODN['dmg_' + e] = 'Урон ' + ELN[e] + ' %'; });
  // единица показа: '' — плоское число, '%' — проценты; critDmg хранится долей (0.12 = +12%)
  const UNIT = { mpRegen: ' за ход', killMp: '', reviveOnce: 'flag', startHaste: ' х.' };
  E.gearUnit = (k) => (D.STATS.includes(k) || D.FLAT[k] ? '' : UNIT[k] != null ? UNIT[k] : '%');
  E.gearShow = (k, v) => (k === 'critDmg' ? v * 100 : v);   // число для показа
  E.gearLabel = (k) => D.GEAR_LBL[k] || D.STAT_N[k] || D.FLAT[k] || ((D.MODN && D.MODN[k]) || k).replace(/\s*%$/, '');
  E.fmtGear = function (k, v, signed) {
    const u = E.gearUnit(k), x = u === '' && (D.STATS.includes(k) || D.FLAT[k]) ? Math.round(v) : Math.round(E.gearShow(k, v) * 10) / 10;
    if (u === 'flag') return v ? '✔' : '—';
    const s = x > 0 ? '+' : x < 0 ? '−' : (signed ? '±' : '');
    return s + Math.abs(x) + (u === '%' ? '%' : u);
  };
  // «хорошо ли» положительное значение (для получаемого урона — наоборот)
  E.gearGood = (k, dv) => (k === 'taken' ? dv < 0 : dv > 0);

  // ───── Пулы: характеристики, аффиксы, особые свойства ─────
  // линии характеристик: суффикс имени (род. падеж) и уклон по основе
  D.GEAR_ATTR_N = { str: 'Мощи', agi: 'Ловкости', vit: 'Крепости', int: 'Разума', spi: 'Духа', wis: 'Прозрения', luk: 'Фортуны', cha: 'Величия' };
  const BIAS = { sword: ['str', 'vit', 'luk'], axe: ['str', 'vit', 'luk'], shield: ['vit', 'str', 'spi'], dagger: ['agi', 'luk', 'str'], staff: ['int', 'wis', 'spi'], wand: ['int', 'wis', 'spi'],
    head_h: ['vit', 'str', 'spi'], body_h: ['vit', 'str', 'spi'], boots_h: ['vit', 'str', 'agi'], head_l: ['agi', 'luk', 'vit'], body_l: ['agi', 'luk', 'vit'], boots_l: ['agi', 'luk', 'str'],
    head_c: ['int', 'wis', 'spi'], body_c: ['int', 'wis', 'spi'], boots_c: ['wis', 'int', 'spi'], ring: ['luk', 'cha', 'str', 'int'], amulet: ['spi', 'wis', 'cha', 'vit'] };
  D.GEAR_ATTR_K = 0.035;                      // линия характеристики: K × p × am (p = 5 + 2.4·ур. предмета)
  // аффиксы: f — плоский (× p × pm), pct — [a, b]: (a + b·ур.) × pm, cap — предел одной линии, w — вес в пуле, n — суффикс имени
  const A = (k, n, o) => Object.assign({ k, n, w: 1 }, o);
  D.GEAR_AFF = [
    A('atk', 'Силы', { f: 0.28 }), A('mag', 'Мудрости', { f: 0.28 }), A('def', 'Стойкости', { f: 0.22 }), A('res', 'Оберега', { f: 0.22 }), A('hp', 'Жизни', { f: 0.8 }), A('mp', 'Эфира', { f: 0.6, w: 0.6 }),
    A('dmg', 'Ярости', { pct: [1, 0.2], cap: 45 }), A('crit', 'Остроты', { pct: [1, 0.2], cap: 25 }), A('critDmg', 'Жестокости', { pct: [3, 0.5], cap: 60, frac: 1 }),
    A('acc', 'Меткости', { pct: [1, 0.15], cap: 25 }), A('pen', 'Пробоя', { pct: [1, 0.12], cap: 25 }), A('penMag', 'Прокола', { pct: [1, 0.12], cap: 25 }),
    A('eva', 'Теней', { pct: [1, 0.15], cap: 18 }), A('spd', 'Ветра', { pct: [1, 0.15], cap: 20 }), A('lifesteal', 'Жажды', { pct: [0.5, 0.06], cap: 12 }), A('heal', 'Милости', { pct: [2, 0.3], cap: 60, w: 0.6 })
  ];
  const DMG_N = { fire: 'Пламени', ice: 'Инея', bolt: 'Грома', earth: 'Камня', wind: 'Бури', water: 'Прилива', light: 'Зари', dark: 'Мрака', arcane: 'Пустоты', phys: 'Стали' };
  const RES_N = { fire: 'Огнеупорности', ice: 'Морозостойкости', bolt: 'Заземления', earth: 'Устойчивости', wind: 'Затишья', water: 'Прибоя', light: 'Тени', dark: 'Светлой ночи', arcane: 'Цельности', phys: 'Панциря' };
  EL.forEach((e) => { D.GEAR_AFF.push(A('dmg_' + e, DMG_N[e], { pct: [2, 0.3], cap: 50, w: 0.3 }), A('res_' + e, RES_N[e], { pct: [2, 0.25], cap: 30, w: 0.3 })); });
  D.GEAR_AFF_BY = {}; D.GEAR_AFF.forEach((a) => { D.GEAR_AFF_BY[a.k] = a; });
  // особые свойства: t — u/m/d, k — модификатор боя, pct/cap как у аффиксов, fixed — постоянное значение, sign −1 — отрицательное (меньше получаемого урона)
  const F = (id, t, n, sfx, k, o) => Object.assign({ id, t, n, sfx, k }, o);
  D.GEAR_FX = [
    F('brand', 'u', 'Клеймо Короля', 'Клейма', 'bossDmg', { pct: [4, 0.25], cap: 60, d: 'Удары жгут боссов и мини-боссов сильнее.' }),
    F('riposte', 'u', 'Ответный удар', 'Ответа', 'counter', { pct: [3, 0.1], cap: 22, d: 'Шанс ответить на физический удар.' }),
    F('thorn', 'u', 'Терновый венец', 'Терний', 'thorns', { pct: [5, 0.2], cap: 45, d: 'Часть физического урона возвращается атакующему.' }),
    F('breath', 'u', 'Второе дыхание', 'Дыхания', 'hpRegen', { pct: [0.6, 0.02], cap: 4, d: 'Восстановление здоровья в начале каждого хода.' }),
    F('ether', 'u', 'Ток эфира', 'Эфира', 'mpRegen', { pct: [1, 0.03], cap: 6, d: 'Дополнительная энергия каждый ход.' }),
    F('quick', 'u', 'Быстрая рука', 'Быстроты', 'castSpd', { pct: [2, 0.1], cap: 20, d: 'После навыка следующий ход наступает раньше.' }),
    F('cold', 'u', 'Холодный расчёт', 'Расчёта', 'cdr', { pct: [2, 0.1], cap: 18, d: 'Перезарядка навыков иногда идёт быстрее.' }),
    F('thrift', 'u', 'Скупость силы', 'Скупости', 'manaEff', { pct: [2, 0.1], cap: 18, d: 'Навыки тратят меньше энергии.' }),
    F('first', 'u', 'Первый шаг', 'Первого шага', 'init', { pct: [3, 0.15], cap: 30, d: 'Шкала хода в начале боя уже заполнена.' }),
    F('echo', 'u', 'Эхо клинка', 'Эха', 'dbl', { pct: [2, 0.1], cap: 18, d: 'Шанс повторить удар с половиной силы.' }),
    F('bulwark', 'u', 'Стальная стена', 'Стены', 'blockCh', { pct: [2, 0.12], cap: 22, d: 'Шанс заблокировать физический удар.' }),
    F('will', 'u', 'Железная воля', 'Воли', 'tenac', { pct: [3, 0.15], cap: 25, d: 'Меньше урона от критов и периодических эффектов.' }),
    F('defy', 'u', 'Непокорность', 'Непокорности', 'statRes', { pct: [3, 0.15], cap: 28, d: 'Шанс стряхнуть оглушение, заморозку и ослабления.' }),
    F('exec', 'm', 'Казнь', 'Казни', 'execute', { pct: [8, 0.25], cap: 60, d: 'Больше урона по врагам с HP ниже 30%.' }),
    F('lastline', 'm', 'Последний рубеж', 'Рубежа', 'lowTaken', { pct: [6, 0.15], cap: 30, d: 'Меньше получаемого урона, пока ваше HP ниже 30%.' }),
    F('doomed', 'm', 'Ярость обречённого', 'Обречённых', 'lowDmg', { pct: [10, 0.3], cap: 60, d: 'Больше урона, пока ваше HP ниже 30%.' }),
    F('opening', 'm', 'Первая кровь', 'Первой крови', 'openDmg', { pct: [8, 0.25], cap: 50, d: 'Больше урона в первые два хода боя.' }),
    F('feast', 'm', 'Пир на костях', 'Пира', 'killMp', { pct: [2, 0.05], cap: 10, d: 'Энергия за каждое убийство.' }),
    F('hunter', 'm', 'Охота на слабых', 'Охоты', 'debuffDmg', { pct: [6, 0.2], cap: 40, d: 'Больше урона по врагам с ослаблениями.' }),
    F('aegis', 'm', 'Кровавая эгида', 'Эгиды', 'startShield', { pct: [5, 0.12], cap: 25, d: 'Щит в начале боя (доля максимума здоровья).' }),
    F('rebirth', 'd', 'Закон Возрождения', 'Возрождения', 'reviveOnce', { fixed: 1, d: 'Раз за бой смертельный удар не убивает: вы встаёте с 30% здоровья.' }),
    F('verdict', 'd', 'Приговор Небес', 'Приговора', 'dmgMul', { pct: [5, 0.07], cap: 20, d: 'Весь ваш урон умножается — сверх всех прочих бонусов.' }),
    F('axis', 'd', 'Ось Мира', 'Оси Мира', 'allStat', { pct: [3, 0.05], cap: 12, d: 'Все характеристики героя растут на процент.' }),
    F('timeless', 'd', 'Безвременье', 'Безвременья', 'startHaste', { fixed: 2, d: 'Бой начинается с «Ускорения».' }),
    F('untouch', 'd', 'Неприкосновенность', 'Неприкосновенности', 'taken', { pct: [4, 0.06], cap: 15, sign: -1, d: 'Весь получаемый урон снижен.' })
  ];
  D.GEAR_FX_BY = {}; D.GEAR_FX.forEach((f) => { D.GEAR_FX_BY[f.id] = f; });
  D.GEAR_FX_T = { u: 'Уникальное свойство', m: 'Мифическое свойство', d: 'Божественное свойство' };
  D.MYTH_NAMES = ['Багровый Венец', 'Кровь Первого Короля', 'Пасть Бездны', 'Алый Обет', 'Сердце Затмения', 'Клык Последней Ночи', 'Шёпот Расколотой Звезды', 'Рана Небес'];
  D.DIVINE_NAMES = ['Нимб Творца', 'Свет до Рассвета', 'Слово Первого Дня', 'Венец Всех Богов', 'Дыхание Вечности', 'Ось Мироздания', 'Печать Неба', 'Последняя Молитва'];
  D.CONCEPT_NAMES = ['Идея Клинка', 'Понятие Конца', 'Мысль о Свете'];

  // ───── Генерация ─────
  const pOf = (il) => 5 + il * 2.4;
  const round1 = (v) => Math.round(v * 10) / 10;
  function attrPick(rng, base, have) {
    const bias = (BIAS[base] || D.STATS).filter((k) => !have[k]), any = D.STATS.filter((k) => !have[k]);
    if (!any.length) return null; return bias.length && rng() < 0.7 ? rng.pick(bias) : rng.pick(any);
  }
  function addAttr(rng, it, ri) {
    const k = attrPick(rng, it.k, it.st); if (!k) return null;
    it.st[k] = Math.max(1, Math.round(D.GEAR_ATTR_K * pOf(it.il) * D.RARITY[ri].am * (0.85 + rng() * 0.3))); return k;
  }
  function affVal(a, il, ri, rng) {
    const Rr = D.RARITY[ri], roll = 0.85 + rng() * 0.3;
    if (a.f) return Math.max(1, Math.round(a.f * pOf(il) * Rr.pm * roll));
    let v = Math.min(a.cap || 1e9, (a.pct[0] + il * a.pct[1]) * Rr.pm * roll); v = round1(v);
    return a.frac ? Math.round(v) / 100 : Math.max(0.1, v);
  }
  function addAff(rng, it, ri) {
    const pool = D.GEAR_AFF.filter((a) => it.st[a.k] == null); if (!pool.length) return null;
    const a = pool[rng.weighted(pool.map((x) => x.w))]; it.st[a.k] = affVal(a, it.il, ri, rng); return a;
  }
  function fxVal(f, il, ri, rng) {
    if (f.fixed != null) return f.fixed;
    const v = round1(Math.min(f.cap, (f.pct[0] + il * f.pct[1]) * D.RARITY[ri].pm * (0.85 + rng() * 0.3)));
    return (f.sign || 1) * Math.max(0.1, v);
  }
  function addFx(rng, it, ri, t) {
    const used = new Set(it.fx.map((id) => D.GEAR_FX_BY[id] && D.GEAR_FX_BY[id].k));
    const pool = D.GEAR_FX.filter((f) => f.t === t && !used.has(f.k) && it.st[f.k] == null); if (!pool.length) return null;
    const f = rng.pick(pool); it.st[f.k] = fxVal(f, it.il, ri, rng); it.fx.push(f.id); return f;
  }
  E.genItem = function (rng, o) {
    o = o || {};
    const base = o.base && D.BASES[o.base] ? o.base : rng.pick(D.BASE_IDS), B = D.BASES[base], il = Math.max(1, Math.round(o.il || 1));
    const ri = clamp(Math.round(o.rarity || 0), 0, o.dev ? D.RARITY.length - 1 : D.RARITY_OPEN), Rr = D.RARITY[ri], p = pOf(il);
    const it = { id: 0, k: base, r: ri, il, nm: '', st: {}, up: 0, en: null, sl: B.slot, fx: [], gv: 2 };
    for (const k in B.p) it.st[k] = Math.max(1, Math.round(B.p[k] * p * Rr.mul * (0.95 + rng() * 0.1)));
    const nA = rng.int(Rr.attr[0], Rr.attr[1]), nF = rng.int(Rr.aff[0], Rr.aff[1]); const sfx = [];
    for (let i = 0; i < nA; i++) { const k = addAttr(rng, it, ri); if (k && !sfx.length && !nF) sfx.push(D.GEAR_ATTR_N[k]); }
    for (let i = 0; i < nF; i++) { const a = addAff(rng, it, ri); if (a && i === 0) sfx.push(a.n); }
    Rr.fx.forEach((t) => { const f = addFx(rng, it, ri, t); if (f && t === 'u') sfx.unshift(f.sfx); });
    const list = ri >= 8 ? D.CONCEPT_NAMES : ri === 7 ? D.DIVINE_NAMES : ri === 6 ? D.MYTH_NAMES : ri === 5 ? D.LEGEND_NAMES : null;
    if (o.nm) it.nm = ri > 0 && sfx.length ? o.nm + ' ' + sfx[0] : o.nm;
    else if (list) it.nm = B.n + ' «' + list[rng.int(0, list.length - 1)] + '»';
    else it.nm = ri > 0 && sfx.length ? B.n + ' ' + sfx[0] : B.n;
    return it;
  };

  // ───── Строки предмета для интерфейса: основа / характеристики / аффиксы / особые свойства ─────
  E.upK = (it) => 1 + 0.09 * ((it && it.up) || 0);
  E.gearVal = (it, k) => { const v = (it.st && it.st[k]) || 0; return D.STATS.includes(k) || D.FLAT[k] ? v * E.upK(it) : v; };
  E.gearLines = function (it) {
    const B = D.BASES[it.k] || { p: {} }, fxk = {}; (it.fx || []).forEach((id) => { const f = D.GEAR_FX_BY[id]; if (f) fxk[f.k] = f; });
    const out = [];
    Object.keys(it.st || {}).forEach((k) => {
      const kind = fxk[k] ? 'fx' : B.p[k] != null ? 'base' : D.STATS.includes(k) ? 'attr' : 'aff';
      out.push({ k, v: E.gearVal(it, k), kind, fx: fxk[k] || null, label: E.gearLabel(k), txt: E.fmtGear(k, E.gearVal(it, k)) });
    });
    const ord = { base: 0, attr: 1, aff: 2, fx: 3 }, tord = { u: 0, m: 1, d: 2 };
    return out.sort((a, b) => ord[a.kind] - ord[b.kind] || (a.fx && b.fx ? tord[a.fx.t] - tord[b.fx.t] : 0));
  };

  // ───── Оценка, цены, улучшения ─────
  const SW = { atk: 1, mag: 1, def: 1, res: 0.8, hp: 0.3, mp: 0.3, crit: 3, eva: 3, spd: 3, dmg: 4, critDmg: 250, acc: 1.5, pen: 2.5, penMag: 2.5, lifesteal: 4, heal: 1.2,
    bossDmg: 2, counter: 2, thorns: 1, hpRegen: 12, mpRegen: 5, castSpd: 2, cdr: 2.5, manaEff: 2, init: 1.5, dbl: 3, blockCh: 2, tenac: 1.5, statRes: 1.2,
    execute: 1.5, lowTaken: 2, lowDmg: 1.2, openDmg: 1.5, killMp: 4, debuffDmg: 1.5, startShield: 3, reviveOnce: 60, dmgMul: 6, allStat: 8, startHaste: 12, taken: -6, gold: 0.5 };
  EL.forEach((e) => { SW['dmg_' + e] = 1.2; SW['res_' + e] = 0.8; });
  E.itemScore = function (it) { let s = 0; for (const k in it.st) { const w = SW[k] != null ? SW[k] : 2; s += it.st[k] * w * (D.STATS.includes(k) || D.FLAT[k] ? E.upK(it) : 1); } return s; };
  E.itemValue = (it) => Math.round((8 + it.il * 6) * E.rar(it).val * (1 + (it.up || 0) * 0.5) * (it.en ? 1.3 : 1));
  E.upCap = (slot, it) => { const h = slot.hero; const sm = h.prof1 === 'smith' || h.prof2 === 'smith'; return (sm ? 6 : E.UP_BASE_CAP) + (it ? E.rar(it).up : 0); };
  const UPK = [1, 1.1, 1.25, 1.45, 1.7, 2, 2.4, 3, 3.8, 4.8, 6];
  E.upCost = function (slot, it) {
    const h = slot.hero, n = (it.up || 0) + 1, disc = (h.prof1 === 'smith' || h.prof2 === 'smith') ? 0.75 : 1, r = clamp(it.r | 0, 0, 10);
    const mat = it.il < 8 ? 'ing_cu' : it.il < 14 ? 'ing_fe' : 'ing_ms';
    return { gold: Math.round(20 * Math.pow(n, 1.6) * (1 + it.il / 6) * disc * UPK[r]), mats: { [mat]: n * 2 + Math.floor(r / 2) } };
  };
  E.upgrade = function (slot, it) {
    if ((it.up || 0) >= E.upCap(slot, it)) return 'Максимальное улучшение';
    const c = E.upCost(slot, it); if (!E.canAfford(slot, c)) return 'Не хватает ресурсов';
    E.pay(slot, c); it.up = (it.up || 0) + 1; return '';
  };

  // ───── Выпадение: веса по уровню контента ─────
  // вес редкости i = w × разгон(уровень) × удача^lk; разгон = 0 до lv, затем растёт до 1 за ramp уровней. Божественное — только с боссов/мини-боссов.
  E.rarityWeights = function (lv, luck, o) {
    lv = lv == null ? 20 : lv; luck = Math.max(1, luck || 1); o = o || {};
    return D.RARITY.map((Rr, i) => {
      if (Rr.lock || i > D.RARITY_OPEN || !Rr.w) return 0; if (Rr.boss && !o.boss) return 0;
      const ramp = i <= 1 ? 1 : lv < Rr.lv ? 0 : Math.min(1, (lv - Rr.lv + 1) / Rr.ramp);
      return Rr.w * ramp * Math.pow(luck, Rr.lk);
    });
  };
  E.rollRarity = function (rng, luck, min, lv, o) {
    const r = rng.weighted(E.rarityWeights(lv, luck, o));
    return clamp(Math.max(r, min || 0), 0, D.RARITY_OPEN);
  };
  E.rollLoot = function (rng, slot, enemy, ctx) {
    const m = ctx.mods, dropK = (1 + (m.drop || 0) / 100) * ctx.tier.loot, role = enemy.role;
    const out = { gold: 0, mats: {}, items: [] };
    const gk = 1 + (m.gold || 0) / 100;
    out.gold = Math.round((3 + 1.3 * enemy.lv) * D.ROLES[role].g * gk * (0.85 + rng() * 0.3) * (1 + (ctx.tier.mul - 1) * 0.5));
    (D.ENEMIES[enemy.eid].loot || []).forEach((l) => { if (rng() < Math.min(1, l[1] * dropK)) { const q = rng.int(l[2], l[3]); out.mats[l[0]] = (out.mats[l[0]] || 0) + q; } });
    const boss = role === 'boss', mini = role === 'mini', elite = enemy.elite;
    const p = boss ? 1 : mini ? 0.85 : elite ? 0.3 : 0.07, n = boss ? 2 : 1;
    for (let i = 0; i < n; i++) if (rng() < Math.min(1, p * dropK)) {
      const rar = E.rollRarity(rng, dropK * (boss ? 2.5 : mini ? 1.8 : elite ? 1.4 : 1), boss ? 2 : mini ? 1 : 0, enemy.lv, { boss: boss || mini });
      const cls = D.CLASSES[slot.hero.cls]; let base = rng.pick(D.BASE_IDS);
      if (D.BASES[base].wt && !cls.weapons.includes(D.BASES[base].wt) && rng() < 0.8) base = rng.pick(cls.weapons);
      out.items.push(E.genItem(rng, { base, il: Math.max(1, enemy.lv + (boss ? 1 : 0)), rarity: rar }));
    }
    return out;
  };
  // лавка: до «Редкого» в начале, «Уникальный» — после 3 подземелий, «Эпический» — после 5
  E.shopRarityWeights = (tier) => [45, 35, 20, tier >= 3 ? 4 : 0, tier >= 5 ? 1.5 : 0];
  E.shopStock = function (slot) {
    const tier = E.shopTier(slot), il = [1, 4, 8, 12, 16, 20][tier], h = slot.hero;
    const rng = E.rng(E.hash('shop' + tier + h.name + (slot.shopSeed || 0)));
    const out = [], bases = D.BASE_IDS.filter((k) => { const B = D.BASES[k]; return !B.wt || D.CLASSES[h.cls].weapons.includes(B.wt); });
    const w = E.shopRarityWeights(tier);
    bases.forEach((k) => { const it = E.genItem(rng, { base: k, il, rarity: rng.weighted(w) }); it.id = -(out.length + 1); out.push(it); });
    return out;
  };
  // ремесло: веса по уровню профессии (lv 1…20) и бонусу «шанс редкого»; выше Легендарного не создаётся
  E.craftWeights = (lv, bonus) => [60 - lv * 1.6, 30 + lv * 0.4, 8 + lv * 1.0 + (bonus || 0) * 50, 3 + lv * 0.45, 1.2 + lv * 0.3, 0.1 + lv * 0.06].map((x) => Math.max(0.05, x));

  // ───── Перевод старых вещей (rarity 0…4) на новую лестницу ─────
  // Статы не трогаем; добавляем недостающие линии/свойства до минимума новой ступени (детерминированно).
  E.migrateItem = function (it) {
    if (!it || typeof it !== 'object' || it.gv >= 2) return it;
    const old = (it.r | 0); it.r = D.RARITY_OLD[old] != null ? D.RARITY_OLD[old] : clamp(old, 0, D.RARITY_OPEN); it.gv = 2;
    it.st = it.st && typeof it.st === 'object' ? it.st : {}; it.fx = Array.isArray(it.fx) ? it.fx : [];
    const B = D.BASES[it.k]; if (!B) return it; it.il = Math.max(1, it.il | 0 || 1);
    const Rr = D.RARITY[it.r], rng = E.rng(E.hash('mig:' + it.k + ':' + it.nm + ':' + it.il + ':' + it.id));
    const keys = Object.keys(it.st), nA = keys.filter((k) => D.STATS.includes(k) && B.p[k] == null).length, nF = keys.filter((k) => !D.STATS.includes(k) && B.p[k] == null).length;
    for (let i = nA; i < Rr.attr[0]; i++) addAttr(rng, it, it.r);
    for (let i = nF; i < Rr.aff[0]; i++) addAff(rng, it, it.r);
    Rr.fx.forEach((t) => { if (!it.fx.some((id) => D.GEAR_FX_BY[id] && D.GEAR_FX_BY[id].t === t)) addFx(rng, it, it.r, t); });
    return it;
  };
  // все вещи слота: сумка, надетое, снаряжение Свиты, добыча текущей вылазки
  E.slotItems = function (s) {
    const out = []; if (!s) return out;
    (s.inv || []).forEach((x) => out.push(x)); Object.values(s.eq || {}).forEach((x) => x && out.push(x));
    Object.values(s.crew || {}).forEach((c) => { if (c && c.eq) Object.values(c.eq).forEach((x) => x && typeof x === 'object' && out.push(x)); });
    if (s.run && s.run.bag && Array.isArray(s.run.bag.items)) s.run.bag.items.forEach((x) => out.push(x));
    return out;
  };

  // ───── Уникальные предметы (фиксированные, не случайные) ─────
  // Не выпадают, не продаются в лавке, не куются и не создаются генератором: только подарком почты { unique: id }.
  // cx — концептуальные свойства (боевые моды, читает combat.js), skill — навык, который даёт предмет, пока надет.
  D.CX_T = 'Концептуальное свойство'; D.CX_IC = '✧';
  D.UNIQUE_ITEMS = {
    eden_light: {
      id: 'eden_light', base: 'sword', r: 8, il: 47, nm: 'Свет Эдема', img: 'assets/gear/eden_light_256.webp', img128: 'assets/gear/eden_light_128.webp', art: 'assets/gear/eden_light_art.webp',
      lore: 'Клинок, выкованный из первого луча, что упал на сад Эдема. Он не режет — он вспоминает миру, каким тот был до тьмы.',
      // ≈3× божественного меча ур. 47 (атака ≈333): каждая линия ×3. Линии выше предела обычных вещей отмечены — их режут глобальные пределы боя.
      st: { atk: 1000, str: 75, vit: 66, luk: 63, spi: 60, dmg: 66, crit: 63, critDmg: 1.65, pen: 42, lifesteal: 19, res_dark: 84, tenac: 75, startShield: 66, taken: -45 },
      fx: ['will', 'aegis', 'untouch'],
      cx: [
        { id: 'eden_thirst', n: 'Жажда Эдема', k: 'edenThirst', v: 15, d: 'В начале каждого хода владельца: если у любого живого врага текущее HP (число) больше текущего HP владельца — владелец восстанавливает 15% максимального здоровья.' },
        { id: 'eden_dawn', n: 'Рассвет над Тьмой', k: 'edenDark', v: 30, d: 'Урон от врагов стихии Тьмы (Тень) по владельцу снижен на 30% — множитель после всех сопротивлений.' },
        { id: 'eden_skill', n: 'Свет Эдема', skill: 'x_eden', d: 'Навык: урон врагу, равный 70% текущего HP владельца (светом, без брони), и лечение на 50% нанесённого урона.' }
      ],
      skill: 'x_eden', up: true
    }
  };
  D.SKILLS.x_eden = { id: 'x_eden', n: 'Свет Эдема', ic: '✧', img: 'assets/gear/eden_light_128.webp', cls: null, gear: 'eden_light', mp: 16, cd: 3, tgt: 'foe',
    d: 'Концептуальный навык меча: урон цели = 70% вашего текущего HP (свет, мимо брони и уклонения), затем вы исцеляетесь на 50% нанесённого урона. Перезарядка 3 хода.', fx: [{ k: 'edenLight', m: 0.7, heal: 0.5, el: 'light' }] };
  // ───── v2.12: ещё шесть Концептуальных клинков. sp — особые свойства (моды k/v), cx — концептуальные (моды k/v читает combat.js)
  const UQ = (id, nm, o) => { D.UNIQUE_ITEMS[id] = Object.assign({ id, base: 'sword', r: 8, il: 47, nm, img: 'assets/gear/' + id + '_256.webp', img128: 'assets/gear/' + id + '_128.webp', art: 'assets/gear/' + id + '_art.webp', fx: [], up: true }, o); };
  UQ('abyss_dark', 'Тьма Бездны', {
    lore: 'Тьма появилась не тогда, когда погас первый свет. Она уже ждала момента, когда ему впервые станет что скрывать.',
    st: { atk: 1030, str: 72, vit: 61, luk: 72, spi: 64, dmg: 69, crit: 68, critDmg: 1.75, pen: 47, lifesteal: 21, res_light: 84, startShield: 58, taken: -43 },
    sp: [
      { n: 'Покров Бездны', k: 'critTaken', v: 60, d: 'Получаемый урон от критических атак −60%.' },
      { n: 'Теневая оболочка', d: 'В начале боя щит на 58% максимального здоровья.' },
      { n: 'Ночная неуязвимость', d: 'Весь получаемый урон −43%.' }],
    cx: [
      { id: 'abyss_back', n: 'Тень за спиной', k: 'abyssBack', v: 20, d: 'При атаке врага с HP выше 50% шанс крита владельца дополнительно +20%. Избыточный шанс крита (сверх предела 80%, включая шанс сверх предела от характеристик) преобразуется в урон крита 1:2 (1% шанса → +2% урона крита).' },
      { id: 'abyss_fade', n: 'Угасание Света', k: 'abyssLight', v: 30, d: 'Враги стихии Света наносят владельцу на 30% меньше урона (множитель после всех сопротивлений). После получения урона Светом владелец получает «Угасание Света»: +20% ко всему урону на 1 ход.' },
      { id: 'abyss_skill', n: 'Тьма Бездны', skill: 'x_abyss', d: 'Навык: урон Тьмой = 60% макс. HP владельца + 40% потерянного HP цели, мимо брони. Если после удара HP цели ниже 25% — добивающий удар на 20% её макс. HP. Против боссов и минибоссов: часть от потерянного HP цели — не больше 200% макс. HP владельца, добивание — 6% макс. HP цели.' }],
    skill: 'x_abyss'
  });
  UQ('hell_heart', 'Сердце Преисподней', {
    lore: 'Он был выкован не демонами. Демоны лишь первыми поняли, что клинок считает их своими.',
    st: { atk: 1080, str: 80, vit: 58, luk: 64, spi: 67, dmg: 73, crit: 61, critDmg: 1.81, pen: 51, lifesteal: 27, res_light: 72 },
    sp: [
      { n: 'Демоническая плоть', k: 'hellFlesh', v: 50, d: 'Лечение от вампиризма увеличено на 50%.' },
      { n: 'Кровавый договор', k: 'hellPact', v: 30, d: 'При HP ниже 50% весь наносимый урон +30%.' },
      { n: 'Отрицание смерти', k: 'hellDeny', v: 35, d: 'Один раз за бой смертельный урон оставляет владельцу 1 HP и создаёт щит на 35% максимального здоровья.' }],
    cx: [
      { id: 'hell_price', n: 'Цена силы', k: 'hellPrice', v: 5, d: 'За каждые потерянные 10% максимального HP владелец получает +6% ко всему урону и +4% бронепробития. Максимум 5 эффектов (+30% урона, +20% пробития).' },
      { id: 'hell_feast', n: 'Пир Падших', k: 'hellFeast', v: 25, d: 'При убийстве противника восстанавливает 25% максимального HP и 20% максимальной маны.' },
      { id: 'hell_skill', n: 'Сердце Преисподней', skill: 'x_hell', d: 'Навык: владелец теряет 15% текущего HP и наносит демонический урон (Тьма) = 110% потерянного (недостающего после оплаты) HP + 50% макс. HP владельца. Мимо брони; сопротивления и снижения урона цели не могут уменьшить его более чем на 50%. Если цель погибает — потраченное здоровье полностью возвращается.' }],
    skill: 'x_hell'
  });
  UQ('first_flame', 'Пламя Первого Пожара', {
    lore: 'До того как огонь научился согревать, он умел только одно — превращать существующее в то, чем оно было прежде.',
    note: 'Этот клинок немного слабее основных Концептуальных мечей.',
    st: { atk: 890, str: 69, vit: 56, luk: 61, spi: 54, dmg: 55, crit: 57, critDmg: 1.48, pen: 36, lifesteal: 12, res_fire: 80, taken: -32 },
    sp: [
      { n: 'Раскалённая сталь', k: 'flameSteel', v: 5, d: 'Атаки накладывают Горение на 3 хода: 5% от силы атаки за ход.' },
      { n: 'Жар битвы', k: 'flameHeat', v: 5, d: 'После каждой атаки урон +5%, максимум +25% (до конца боя).' },
      { n: 'Огненная оболочка', d: 'Получаемый урон −32%.' }],
    cx: [
      { id: 'flame_eternal', n: 'Неугасимое Пламя', k: 'flameEternal', v: 1, d: 'Эффекты Горения от этого оружия (Горение и Первичное Горение) невозможно снять обычным очищением.' },
      { id: 'flame_ignite', n: 'Воспламенение', k: 'flameIgnite', v: 1, d: 'При критическом ударе весь оставшийся периодический урон Горения от этого оружия на цели (Горение и Первичное Горение: сила × оставшиеся ходы) мгновенно наносится ещё раз, не удаляя эффект.' },
      { id: 'flame_skill', n: 'Первый Пожар', skill: 'x_flame', d: 'Навык: огненный урон = 65% макс. HP владельца (мимо брони) и Первичное Горение на 3 хода: 8% макс. HP цели за ход. У боссов и минибоссов периодический компонент ограничен 2% макс. HP за ход.' }],
    skill: 'x_flame'
  });
  UQ('boundless_source', 'Безбрежный Исток', {
    lore: 'Первая вода не текла по земле. Земля возникла лишь потому, что однажды её течение решило отступить.',
    note: 'Этот клинок немного слабее основных Концептуальных мечей, но значительно сильнее в выживаемости.',
    st: { atk: 850, str: 58, vit: 72, luk: 55, spi: 66, dmg: 62, crit: 49, critDmg: 1.55, pen: 38, lifesteal: 16, res_water: 80, taken: -45 },   // v2.12.1: урон 51→62, крит. урон 137→155, пробитие 31→38, получаемый −36→−45
    sp: [
      { n: 'Текучая форма', k: 'dotTaken', v: 55, d: 'Получаемый периодический урон −55%.' },
      { n: 'Восстановление потока', k: 'srcRegen', v: 6, d: 'В начале каждого хода восстанавливает 6% максимального HP.' },
      { n: 'Глубина', d: 'Весь получаемый урон −45%.' }],
    cx: [
      { id: 'src_form', n: 'Вода принимает любую форму', k: 'srcForm', v: 50, d: 'Первый отрицательный эффект, наложенный на владельца врагом между его ходами, с шансом 50% немедленно исчезает.' },
      { id: 'src_back', n: 'Обратное течение', k: 'srcOverflow', v: 50, k2: 'srcTide', v2: 25, d: 'Избыточное лечение преобразуется в щит, суммарно не больше 50% максимального HP. Пока на владельце есть щит, весь его урон +25%.' },
      { id: 'src_skill', n: 'Безбрежный Исток', skill: 'x_source', d: 'Навык: снимает с владельца до 3 отрицательных эффектов, затем водный урон = 45% макс. HP владельца (мимо брони; +15% за каждый снятый эффект) и лечение на 35% макс. HP.' }],
    skill: 'x_source'
  });
  UQ('chronos', 'Хронос', {
    lore: 'Для этого клинка прошлое и будущее — лишь две стороны мгновения, которое ещё не решило закончиться.',
    st: { atk: 1020, str: 70, vit: 64, luk: 69, spi: 76, dmg: 67, crit: 60, critDmg: 1.61, pen: 44, lifesteal: 17, ccRes: 70, eva: 25, taken: -42 },
    sp: [
      { n: 'Вне мгновения', k: 'chronoShort', v: 1, d: 'Длительность отрицательных эффектов на владельце −1 ход, минимум 1.' },
      { n: 'Предвидение', d: 'Шанс уклонения +25%.' },
      { n: 'Застывший миг', d: 'Весь получаемый урон −42%.' }],
    cx: [
      { id: 'chrono_sec', n: 'Украденная секунда', k: 'chronoSteal', v: 50, d: 'После каждого третьего действия владельца его шкала хода немедленно продвигается на 50% (половина хода).' },
      { id: 'chrono_rew', n: 'То, чего ещё не произошло', k: 'chronoRewind', v: 30, d: 'Первый раз за бой, когда HP владельца падает ниже 30% (в том числе от смертельного удара), его HP и мана откатываются к значениям начала предыдущего собственного хода (в первом ходу — к началу текущего). Погибшие враги и союзники не возвращаются.' },
      { id: 'chrono_skill', n: 'Разрыв Хроноса', skill: 'x_chronos', d: 'Навык: урон = 65% текущего HP владельца мимо брони и уклонения; цель «Застывает во времени» и пропускает свой следующий ход; владелец сразу получает +50% шкалы хода. Против боссов и минибоссов вместо остановки их шкала хода уменьшается на 40%.' }],
    skill: 'x_chronos'
  });
  UQ('end_of_all', 'Конец Всего', {
    sub: 'Клинок Энтропии',
    lore: 'Вселенная не боится смерти. Она боится момента, когда больше не останется различий между тем, что жило, горело, двигалось — и тем, что уже остыло навсегда.',
    note: 'Самый сильный предмет Концептуальной редкости.',
    st: { atk: 1250, str: 86, vit: 72, luk: 78, spi: 82, dmg: 84, crit: 72, critDmg: 2.05, pen: 58, lifesteal: 23, conceptRes: 30, taken: -48, startShield: 75 },
    sp: [
      { n: 'Неизбежность распада', k: 'entIgnore', v: 30, d: '30% всей защиты противника игнорируется дополнительно после расчёта бронепробития.' },
      { n: 'Термодинамическое превосходство', d: 'Весь получаемый урон −48%.' },
      { n: 'Конец замкнутой системы', d: 'В начале боя щит на 75% максимального HP.' }],
    cx: [
      { id: 'ent_decay', n: 'Энтропия всегда возрастает', k: 'entDecay', v: 6, d: 'Каждый раз, когда владелец наносит противнику урон, цель получает 1 уровень Распада, максимум 6. Каждый уровень снижает весь наносимый целью урон, получаемое ею лечение и её защиту (броню и сопротивление) на 5%. Распад невозможно снять обычным очищением.' },
      { id: 'ent_heat', n: 'Тепловая смерть', k: 'entHeat', v: 35, d: 'При достижении 6 уровней Распада цель входит в Тепловую смерть на 2 хода: лечение −80%, щиты −80% (имеющиеся и новые), восстановление маны −50%, владелец наносит ей +35% урона.' },
      { id: 'ent_law', n: 'Закон необратимости', k: 'entIrrev', v: 20, d: 'После любого лечения противника 20% восстановленного значения мгновенно превращается в необратимую потерю его максимального HP (до конца боя). Для боссов и минибоссов — 5%.' },
      { id: 'ent_skill', n: 'Вселенская Энтропия', skill: 'x_entropy', d: 'Навык: урон = 80% макс. HP владельца + 20% потерянного HP цели, мимо брони и уклонения, игнорирует 50% обычного снижения урона цели; сразу +3 уровня Распада. Если у цели уже 6 уровней — вместо этого Коллапс: дополнительно 20% её текущего HP концептуальным уроном (против боссов и минибоссов — 8%). Против боссов и минибоссов часть от потерянного HP цели — не больше 300% макс. HP владельца.' }],
    skill: 'x_entropy'
  });
  const XS = (id, gear, n, mp, cd, d, fx) => { D.SKILLS[id] = { id, n, ic: '✧', img: 'assets/gear/' + gear + '_128.webp', cls: null, gear, mp, cd, tgt: 'foe', concept: true, d, fx }; };
  XS('x_abyss', 'abyss_dark', 'Тьма Бездны', 16, 3, 'Концептуальный навык меча: урон Тьмой = 60% вашего макс. HP + 40% потерянного HP цели, мимо брони. Если после удара HP цели ниже 25% — добивающий удар на 20% её макс. HP (боссы: часть от потерянного HP ≤ 200% вашего макс. HP, добивание 6%). Перезарядка 3 хода.', [{ k: 'abyssSk', m: 0.6, lost: 0.4, thr: 0.25, fin: 0.2, bossLost: 2, bossFin: 0.06, el: 'dark' }]);
  XS('x_hell', 'hell_heart', 'Сердце Преисподней', 18, 4, 'Концептуальный навык меча: вы теряете 15% текущего HP и наносите демонический урон (Тьма) = 110% недостающего HP + 50% вашего макс. HP, мимо брони, снижается не более чем на 50%. Убийство цели возвращает потраченное HP. Перезарядка 4 хода.', [{ k: 'hellSk', cost: 0.15, m: 1.1, mx: 0.5, el: 'dark' }]);
  XS('x_flame', 'first_flame', 'Первый Пожар', 14, 3, 'Концептуальный навык меча: огонь = 65% вашего макс. HP (мимо брони) и Первичное Горение на 3 хода — 8% макс. HP цели за ход (боссы — 2%). Перезарядка 3 хода.', [{ k: 'flameSk', m: 0.65, dot: 0.08, boss: 0.02, dur: 3, el: 'fire' }]);
  XS('x_source', 'boundless_source', 'Безбрежный Исток', 14, 3, 'Концептуальный навык меча: снимает с вас до 3 отрицательных эффектов, вода = 45% вашего макс. HP (+15% за каждый снятый эффект, мимо брони), лечение 35% макс. HP. Перезарядка 3 хода.', [{ k: 'sourceSk', m: 0.45, per: 0.15, n: 3, heal: 0.35, el: 'water' }]);
  XS('x_chronos', 'chronos', 'Разрыв Хроноса', 20, 4, 'Концептуальный навык меча: урон = 65% вашего текущего HP мимо брони и уклонения, цель пропускает следующий ход (боссы: −40% шкалы хода), вы получаете +50% шкалы хода. Перезарядка 4 хода.', [{ k: 'chronoSk', m: 0.65, gain: 50, boss: 40, el: 'arcane' }]);
  XS('x_entropy', 'end_of_all', 'Вселенская Энтропия', 24, 5, 'Концептуальный навык меча: урон = 80% вашего макс. HP + 20% потерянного HP цели, мимо брони и уклонения и 50% снижения урона; +3 Распада. При 6 Распада — Коллапс: +20% текущего HP цели (боссы — 8%; часть от потерянного HP у боссов ≤ 300% вашего макс. HP). Перезарядка 5 ходов.', [{ k: 'entropySk', m: 0.8, lost: 0.2, red: 0.5, add: 3, col: 0.2, boss: 0.08, bossLost: 3, el: 'arcane' }]);
  D.SKILLS.x_eden.concept = true;
  Object.assign(D.ST, {
    abyssDusk: { n: 'Угасание Света', ic: '🌘', k: 'buff', dealt: 0.2, d: '+20% ко всему урону на 1 ход' },
    fburn: { n: 'Горение', ic: '🔥', k: 'dot', el: 'fire', fixed: 1, d: 'Пламя Первого Пожара: урон огнём каждый ход; не снимается очищением' },
    primal: { n: 'Первичное Горение', ic: '☄️', k: 'dot', el: 'fire', fixed: 1, d: '8% макс. HP за ход (боссы — 2%); не снимается очищением' },
    chronoStop: { n: 'Застывшее время', ic: '⏳', k: 'ctrl', d: 'Пропускает следующий ход' },
    decay: { n: 'Распад', ic: '🌀', k: 'debuff', fixed: 1, per: 1, dealt: -0.05, def: -0.05, d: 'Каждый уровень: −5% наносимого урона, лечения и защиты; не снимается очищением' },
    heatDeath: { n: 'Тепловая смерть', ic: '🧊', k: 'debuff', fixed: 1, d: 'Лечение −80%, щиты −80%, мана −50%, Клинок Энтропии наносит +35% урона' }
  });
  // ───── v2.13: три клинка редкости «Исток» (r 9, ур. 55). sp — особые свойства, cx — индивидуальные свойства Истока; общие свойства редкости — D.ORIGIN_COMMON
  // Любая надетая вещь r ≥ 9 даёт владельцу мод origin = 1 — по нему combat.js включает пять общих свойств Истока.
  D.ORIGIN_R = 9; D.OX_T = 'Свойство Истока'; D.OX_IC = '✶';
  D.ELEMS.div = { n: 'Разделяющий', ic: '✂️', c: '#e9ecff' }; D.ELEMS.origin = { n: 'Исток', ic: '✶', c: '#b9a8ff' };   // не физ., не маг., не стихия, не концепция: стихийные слабости/стойкости к нему не применяются
  D.ORIGIN_COMMON = [
    { id: 'o_deny', n: 'Отрицание бессмертия', d: 'Урон владельца (удары, навыки, его периодический урон) не останавливают «воскрешение раз за бой», «Вторая жизнь», «Отрицание смерти» Сердца Преисподней, откат Хроноса, божественное воскрешение, «Бессмертие» (порог 1 HP), стирание ударов и неуязвимость/иммунитет к урону врагов. Исключение — правило игры, а не свойство: лимит урона по боссу за удар (с ур. 30) действует и для Истока.' },
    { id: 'o_concept', n: 'Иммунитет к концепциям', d: 'Входящий концептуальный урон теряет тег «концепция»: он проходит через броню владельца как обычный урон (сопротивление концептуальному урону тоже учитывается). Чисто концептуальных «довесков» к такому урону в игре нет — снимать больше нечего.' },
    { id: 'o_prio', n: 'Приоритет Истока', d: 'Отрицательные эффекты, наложенные свойствами ПРЕДМЕТОВ редкости ниже Истока (Горение и Первичное Горение, Распад, Тепловая смерть, Застывшее время, потеря макс. HP от «Закона необратимости», сокращение шкалы хода Хроносом), на владельца не действуют. Урон таких предметов проходит как обычно. Врождённые навыки монстров (их яды, оглушения, проклятия) работают как обычно.' },
    { id: 'o_erase', n: 'Стирание Истоком', d: 'Враг, убитый уроном владельца, «Стёрт из существования» на 10 минут реального времени: этот экземпляр (враг на этом месте этапа подземелья этой сложности) не появится при повторном входе. Если стёрты все враги этапа — этап очищается сам, но без опыта, золота и добычи; стёртый босс засчитывает прохождение, но не даёт повторной добычи. Сюжетные бои (дуэли с героинями) стереть нельзя — они всегда проходят как обычно.' },
    { id: 'o_over', n: 'Общий приоритет', d: 'Если свойство Истока противоречит свойству предмета более низкой редкости, действует свойство Истока: например, против урона Истока не работают «Рассвет над Тьмой», «Угасание Света», «Покров Бездны» и защитные свойства от смерти.' }
  ];
  const OQ = (id, nm, o) => UQ(id, nm, Object.assign({ r: 9, il: 55 }, o));
  OQ('prime_cause', 'Клинок Первопричины', {
    sub: 'Исток причин',
    lore: 'Прежде чем что-либо случилось, должно было появиться то, из-за чего оно случится. Этот клинок — то самое «из-за чего».',
    st: { atk: 1650, str: 102, vit: 94, luk: 91, spi: 105, dmg: 101, crit: 76, critDmg: 2.25, pen: 68, lifesteal: 25, conceptRes: 38, taken: -50 },
    sp: [
      { n: 'Первая причина', k: 'pcFirst', v: 70, d: 'Первый отрицательный эффект, наложенный на владельца врагом между его ходами, с шансом 70% не возникает.' },
      { n: 'До следствия', k: 'pcBefore', v: 35, d: 'Если одно действие врага сняло с владельца больше 30% макс. HP, сразу после него владелец восстанавливает 35% полученного урона. Не чаще раза между ходами владельца.' },
      { n: 'Причинная устойчивость', k: 'pcSteady', v: 15, d: 'Раз за бой мгновенное убийство (стирание/пожирание и подобные эффекты) оставляет владельцу 15% макс. HP вместо смерти.' }],
    cx: [
      { id: 'pc_mark', n: 'Причинная Метка', k: 'pcMark', v: 4, d: 'Каждый удар владельца даёт цели 1 уровень Причинной Метки (максимум 4): за уровень −6% защиты, −4% наносимого урона, −5% получаемого лечения. Удар по цели с 4 уровнями вызывает «Следствие»: дополнительный урон Истока 20% макс. HP владельца (боссы и минибоссы — 8%), после чего Метка сбрасывается.' },
      { id: 'pc_fix', n: 'Исправление причины', k: 'pcFix', v: 15, d: 'Раз в 4 хода владельца в начале его хода снимается один отрицательный эффект (даже неснимаемый обычным очищением), а шкала хода того, кто его наложил, уменьшается на 15%.' },
      { id: 'pc_skill', n: 'Первопричина', skill: 'x_prime', d: 'Навык: урон Истока = 90% макс. HP владельца + 25% потерянного HP цели, мимо брони и уклонения, игнорирует 40% снижения урона цели. Цель получает «Предопределённое Следствие» на 2 хода: 40% урона, который она наносит владельцу, возвращается ей. Против боссов и минибоссов часть от потерянного HP — не больше 300% макс. HP владельца.' }],
    skill: 'x_prime'
  });
  OQ('zero_law', 'Клинок Нулевого Закона', {
    sub: 'Исток законов',
    lore: 'До первого закона не было запретов. Этот клинок помнит то время — и возвращает его каждому, кого касается.',
    st: { atk: 1580, str: 94, vit: 98, luk: 96, spi: 112, dmg: 96, crit: 72, critDmg: 2.14, pen: 65, lifesteal: 20, ccRes: 90 },
    sp: [
      { n: 'Вне закона', k: 'dotTaken', v: 55, k2: 'zlHalf', v2: 50, d: 'Получаемый периодический урон −55%; ослабления характеристик (защиты, урона, скорости, уклонения) действуют на владельца вполовину.' },
      { n: 'Предел запретов', k: 'zlMax', v: 3, d: 'На владельце одновременно не больше 3 отрицательных эффектов: при наложении четвёртого самый старый исчезает. Сопротивление эффектам контроля +90% (в бою — не выше общего предела 75%).' },
      { n: 'Исключение из правила', k: 'zlCrit', v: 3, d: 'Если цель неуязвима к критическим ударам, раз в 3 хода владельца его крит всё равно проходит. Сейчас таких врагов в игре нет — свойство заложено на будущее.' }],
    cx: [
      { id: 'zl_cancel', n: 'Отмена Закона', k: 'zlCancel', v: 60, d: 'В начале каждого хода владельца самое сильное усиление каждого врага (щит или бонус к урону/защите/скорости) ослабляется на 60% (боссы и минибоссы — на 30%) до следующего хода владельца.' },
      { id: 'zl_noabs', n: 'Никаких абсолютов', k: 'zlNoAbs', v: 80, d: 'Абсолютные (100%) неуязвимости и иммунитеты врагов против владельца действуют не сильнее 80%. Против урона Истока они и так не работают — свойство важно для эффектов, которые не являются уроном.' },
      { id: 'zl_skill', n: 'Нулевой Закон', skill: 'x_zero', d: 'Навык: урон Истока = 75% макс. HP владельца (с учётом брони цели), цель становится «Без Закона» на 2 хода: защита −35%, уклонение обнуляется, щиты −60%, получаемое лечение −50%, неуязвимости вдвое слабее. Против боссов и минибоссов эффект вдвое слабее.' }],
    skill: 'x_zero'
  });
  OQ('first_division', 'Клинок Первого Разделения', {
    sub: 'Исток различий',
    lore: 'Первое, что случилось с ничем, — его разделили на «это» и «не это». Клинок до сих пор помнит этот разрез.',
    note: 'Самый сильный из клинков Истока.',
    st: { atk: 1780, str: 112, vit: 82, luk: 103, spi: 92, dmg: 112, crit: 83, critDmg: 2.48, pen: 76, lifesteal: 18, allRes: 27 },
    sp: [
      { n: 'Две стороны', k: 'fdTwo', v: 25, d: 'Каждый удар делится на две стороны: основной урон ×0,85 и ещё 25% от полного урона удара отдельным Разделяющим уроном (не физ., не маг., не стихия и не концепция).' },
      { n: 'Граница', k: 'fdEdge', v: 60, d: 'Бронепробитие владельца не ниже 60%. Сопротивление всему урону +27% (обычное снижение получаемого урона, общий нижний предел множителя урона 20% сохраняется).' },
      { n: 'Совершенный разрез', k: 'fdCut', v: 25, d: 'Критический удар игнорирует 25% снижения урона цели.' }],
    cx: [
      { id: 'fd_strip', n: 'Отделение свойства', k: 'fdStrip', v: 2, d: 'Каждый второй критический удар отделяет от цели случайное усиление и не даёт наложить его снова 2 хода. На боссах и минибоссах усиление не снимается, а теряет 50% силы.' },
      { id: 'fd_split', n: 'Разделение сущности', k: 'fdSplit', v: 4, d: 'После 4 ударов по одной цели она получает «Расщепление» на 2 хода: макс. HP −15% (боссы и минибоссы — −5%; по окончании возвращается без лечения), защита −25%, щиты −40%, получаемое лечение −35%.' },
      { id: 'fd_undiv', n: 'Разделить неразделимое', k: 'fdUndiv', v: 20, d: 'Раз за бой мгновенное убийство владельца вместо смерти оставляет ему 20% макс. HP, снимает все отрицательные эффекты и даёт +30% урона на 2 хода.' },
      { id: 'fd_skill', n: 'Первое Разделение', skill: 'x_division', d: 'Навык: первая сторона — урон Истока 70% макс. HP владельца мимо брони; вторая — Разделяющий урон 35% потерянного HP цели (против боссов и минибоссов не больше 300% макс. HP владельца). Затем «Разрыв Связи» на 2 хода: щиты и усиления защиты/атаки цели работают вполовину (боссы — на 75%).' }],
    skill: 'x_division'
  });
  const OS = (id, gear, n, mp, cd, d, fx) => { XS(id, gear, n, mp, cd, d, fx); D.SKILLS[id].concept = false; D.SKILLS[id].origin = true; D.SKILLS[id].ic = '✶'; };
  OS('x_prime', 'prime_cause', 'Первопричина', 24, 4, 'Навык Истока: урон = 90% вашего макс. HP + 25% потерянного HP цели, мимо брони и уклонения и 40% снижения урона; «Предопределённое Следствие» на 2 хода — 40% урона цели по вам возвращается ей (боссы: часть от потерянного HP ≤ 300% вашего макс. HP). Перезарядка 4 хода.', [{ k: 'primeSk', m: 0.9, lost: 0.25, red: 0.4, back: 0.4, dur: 2, bossLost: 3 }]);
  OS('x_zero', 'zero_law', 'Нулевой Закон', 26, 5, 'Навык Истока: урон = 75% вашего макс. HP (с учётом брони), цель «Без Закона» 2 хода — защита −35%, уклонение 0, щиты −60%, лечение −50%, неуязвимости вдвое слабее (боссы — вдвое слабее эффект). Перезарядка 5 ходов.', [{ k: 'zeroSk', m: 0.75, dur: 2, boss: 0.5 }]);
  OS('x_division', 'first_division', 'Первое Разделение', 28, 5, 'Навык Истока: 70% вашего макс. HP мимо брони + Разделяющий урон 35% потерянного HP цели (боссы: ≤ 300% вашего макс. HP); «Разрыв Связи» 2 хода — щиты и усиления цели вполовину (боссы — на 75%). Перезарядка 5 ходов.', [{ k: 'divSk', m: 0.7, lost: 0.35, bossLost: 3, dur: 2, boss: 0.5 }]);
  // item: редкость предмета-источника эффекта (Приоритет Истока: на владельца Истока не действуют эффекты предметов с item < 9)
  [['fburn', 8], ['primal', 8], ['chronoStop', 8], ['decay', 8], ['heatDeath', 8]].forEach(([id, r]) => { D.ST[id].item = r; });
  Object.assign(D.ST, {
    causeMark: { n: 'Причинная Метка', ic: '⚖️', k: 'debuff', fixed: 1, item: 9, per: 1, def: -0.06, dealt: -0.04, healIn: -0.05, d: 'Клинок Первопричины: за уровень −6% защиты, −4% урона, −5% лечения; на 4 уровнях следующий удар вызывает Следствие' },
    conseq: { n: 'Следствие', ic: '💥', k: 'info', item: 9, d: 'Причинная Метка разрешилась: нанесён урон Истока' },
    preConseq: { n: 'Предопределённое Следствие', ic: '🔮', k: 'debuff', fixed: 1, item: 9, d: '40% урона по владельцу Клинка Первопричины возвращается этой цели' },
    lawless: { n: 'Без Закона', ic: '🚫', k: 'debuff', fixed: 1, item: 9, per: 1, def: -0.35, eva: -100, shieldK: -0.6, healIn: -0.5, d: 'Защита −35%, уклонение 0, щиты −60%, лечение −50%, неуязвимости вдвое слабее (у боссов — эффект вдвое слабее)' },
    split: { n: 'Расщепление', ic: '💠', k: 'debuff', fixed: 1, item: 9, def: -0.25, shieldK: -0.4, healIn: -0.35, d: 'Макс. HP −15% (боссы −5%, возвращается по окончании без лечения), защита −25%, щиты −40%, лечение −35%' },
    severed: { n: 'Разрыв Связи', ic: '🔗', k: 'debuff', fixed: 1, item: 9, per: 1, shieldK: -0.5, d: 'Щиты и усиления защиты/атаки работают вполовину (боссы — на 75%)' },
    fdRage: { n: 'Неразделимость', ic: '⚡', k: 'buff', dealt: 0.3, d: '+30% урона: владелец пережил мгновенное убийство' },
    erasedSt: { n: 'Стёрт из существования', ic: '🌌', k: 'info', item: 9, d: 'Убит уроном Истока: не появится здесь снова 10 минут реального времени' }
  });
  D.GEAR_LBL.allRes = 'Сопротивление всему урону';
  D.UNIQUE_IDS = Object.keys(D.UNIQUE_ITEMS);
  E.uniqOf = (it) => (it && it.uq && D.UNIQUE_ITEMS[it.uq]) || null;
  E.makeUnique = function (id) {
    const U = D.UNIQUE_ITEMS[id]; if (!U) return null; const B = D.BASES[U.base];
    return { id: 0, k: U.base, r: U.r, il: U.il, nm: U.nm, st: Object.assign({}, U.st), up: 0, en: null, sl: B.slot, fx: U.fx.slice(), gv: 2, uq: id, lock: 1 };
  };
  E.itemImg = (it) => { const U = E.uniqOf(it); return U ? U.img : null; };
  // навыки от надетых вещей (герой: slot.eq, Свита: s.eq)
  E.gearSkills = function (eq) { const out = []; Object.values(eq || {}).forEach((it) => { const U = E.uniqOf(it); if (U && U.skill && !out.includes(U.skill)) out.push(U.skill); }); return out; };
  E.ownsRarity = (slot, r) => E.slotItems(slot).some((it) => (it.r | 0) >= r);
  // концептуальные моды надетых уникальных вещей → в общие моды
  const _collect = E.collect;
  E.collect = function (slot, ctx) {
    const c = _collect(slot, ctx);
    for (const sl in slot.eq || {}) { const U = E.uniqOf(slot.eq[sl]); if (U) U.cx.concat(U.sp || []).forEach((x) => { [[x.k, x.v], [x.k2, x.v2]].forEach(([k, v]) => { if (k) { c.mods[k] = Math.max(c.mods[k] || 0, v); (c.by[k] = c.by[k] || {}).gear = v; } }); }); }
    if (Object.values(slot.eq || {}).some((it) => it && (it.r | 0) >= D.ORIGIN_R)) { c.mods.origin = 1; (c.by.origin = c.by.origin || {}).gear = 1; }   // общие свойства Истока
    return c;
  };
  // продажа уникальной вещи невозможна (даже если снять замок)
  const _sell = E.sell; E.sell = function (slot, id) { const it = (slot.inv || []).find((x) => x.id === id); if (it && it.uq) return 0; return _sell(slot, id); };
  if (typeof module !== 'undefined') module.exports = RPG;
})();
