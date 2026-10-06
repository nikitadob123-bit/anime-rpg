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
    R('origin', 'Исток', '#8f7bff', 'rgba(60,40,200,.8)', { mul: 2.9, am: 7, pm: 2.9, attr: [5, 5], aff: [7, 7], fx: ['u', 'u', 'm', 'd', 'd'], w: 0, lv: 999, ramp: 1, lk: 2, up: 6, val: 30, lock: 1 }),
    R('prexist', 'До существования', '#f4f4f4', 'rgba(255,255,255,.85)', { mul: 3.4, am: 8.4, pm: 3.5, attr: [5, 6], aff: [7, 7], fx: ['u', 'u', 'm', 'm', 'd', 'd'], w: 0, lv: 999, ramp: 1, lk: 2, up: 7, val: 45, lock: 1 })
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
    allStat: 'Все характеристики', startHaste: 'Ускорение в начале боя', taken: 'Получаемый урон', gold: 'Золото', xp: 'Опыт', drop: 'Удача добычи'
  });
  EL.forEach((e) => { D.GEAR_LBL['dmg_' + e] = 'Урон ' + ELN[e]; D.GEAR_LBL['res_' + e] = 'Сопр.: ' + (e === 'phys' ? 'физ.' : D.ELEMS[e].n.toLowerCase()); if (D.MODN && !D.MODN['dmg_' + e]) D.MODN['dmg_' + e] = 'Урон ' + ELN[e] + ' %'; });
  // единица показа: '' — плоское число, '%' — проценты; critDmg хранится долей (0.12 = +12%)
  const UNIT = { mpRegen: ' за ход', killMp: '', reviveOnce: 'flag', startHaste: ' х.' };
  E.gearUnit = (k) => (D.STATS.includes(k) || D.FLAT[k] ? '' : UNIT[k] != null ? UNIT[k] : '%');
  E.gearShow = (k, v) => (k === 'critDmg' ? v * 100 : v);   // число для показа
  E.gearLabel = (k) => D.GEAR_LBL[k] || D.STAT_N[k] || D.FLAT[k] || ((D.MODN && D.MODN[k]) || k).replace(/\s*%$/, '');
  E.fmtGear = function (k, v, signed) {
    const u = E.gearUnit(k), x = Math.round(E.gearShow(k, v) * 10) / 10;
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
  if (typeof module !== 'undefined') module.exports = RPG;
})();
