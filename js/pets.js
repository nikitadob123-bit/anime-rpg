/* v2.19 «Питомцы»: один слот питомца у героя; 9 редкостей (наполнены до Божественного), статы как у снаряжения той же редкости (растут с уровнем питомца),
   навыки открываются уровнем, пассивы — узами; звёзды — за дубликаты; яйца и инкубатор (яйца падают с боссов, дёшево — в лавке; Божественные — только поздние этапы).
   В сохранении: s.pets {id:{lv,xp,star,bond,bxp}}, s.petEq, s.petFood, s.eggs {редкость:кол-во}, s.hatch {r,end}|null, s.petProg. Статы не хранятся — считаются из данных. Логика без DOM. */
(function () {
  const RPG = globalThis.RPG, D = RPG.D, E = RPG.E, C = RPG.C, S = RPG.S;
  const clamp = E.clamp;

  // ───── 9 редкостей питомцев ─────
  // gr — редкость снаряжения-эталона (индекс D.RARITY), k — множитель сверх эталона Божественного; open — есть ли питомцы в этой редкости
  const PR = [['common', 'Обычный', 0, 1], ['uncommon', 'Необычный', 1, 1], ['rare', 'Редкий', 2, 1], ['epic', 'Эпический', 4, 1], ['legend', 'Легендарный', 5, 1], ['divine', 'Божественный', 7, 1],
    ['concept', 'Концептуальный', 7, 1.22], ['origin', 'Исток', 7, 1.5], ['prexist', 'До существования', 7, 1.85]];
  const RC = [0, 1, 2, 4, 5, 7, 8, 9, 10];   // цвета — из лестницы редкостей снаряжения
  D.PET_RAR = PR.map(([id, n, gr, k], i) => ({ id, n, gr, k, c: D.RARITY[RC[i]].c, g: D.RARITY[RC[i]].g, open: i <= 5 }));
  D.PET_OPEN = 5;                        // наполнены редкости 0…5 (до Божественного)
  D.PET_LV_MAX = 50; D.PET_STAR_MAX = 5; D.PET_STAR_K = 0.08; D.PET_BOND_K = 0.03;
  D.PET_BOND_AT = [0, 8, 24, 50, 90, 150];   // порог очков уз для уровней уз 0…5
  D.PET_SK_LV = [1, 15, 30];                 // уровень питомца для 1-го, 2-го, 3-го навыка
  D.PET_FOOD_XP = 30; D.PET_FOOD_PRICE = 120;
  D.EGG_PRICE = [1500, 6000, 24000];         // лавка: яйца Обычное … Редкое (цены ×3 к экономике)
  D.EGG_MIN = [1, 5, 15, 45, 180, 480];      // минут инкубации
  D.EGG_NAME = ['обычное', 'необычное', 'редкое', 'эпическое', 'легендарное', 'божественное', 'концептуальное', 'яйцо Истока', 'яйцо До существования'].map((n, i) => (i < 7 ? 'Яйцо: ' + n : n[0].toUpperCase() + n.slice(1)));

  // ───── Навыки питомцев: генерируются по виду и стихии, сила растёт с редкостью ─────
  const STS = { fire: 'burn', ice: 'chill', bolt: 'stun', dark: 'poison', light: 'weak', arcane: 'vuln', phys: 'bleed', earth: 'weak', wind: 'chill', water: 'wet', div: 'weak', origin: 'vuln' };
  const KINDS = {
    strike: (t, el) => ({ tgt: 'foe', cd: 2, fx: [{ k: 'dmg', s: 'atk', m: 1.5 * (1 + 0.16 * t), el }], d: 'Удар' }),
    spell: (t, el) => ({ tgt: 'foe', cd: 2, fx: [{ k: 'dmg', s: 'mag', m: 1.5 * (1 + 0.16 * t), el }], d: 'Заклинание' }),
    burst: (t, el) => ({ tgt: 'foes', cd: 3, fx: [{ k: 'dmg', s: 'mag', m: 0.75 * (1 + 0.16 * t), el }, { k: 'st', id: STS[el] || 'weak', p: 0.4, dur: 2 }], d: 'По всем врагам' }),
    flurry: (t, el) => ({ tgt: 'rfoe', cd: 2, fx: [{ k: 'dmg', s: 'atk', m: 0.6 * (1 + 0.14 * t), hits: 3, el }], d: 'Три быстрых удара' }),
    heal: (t) => ({ tgt: 'allies', cd: 3, fx: [{ k: 'heal', m: 0.8 * (1 + 0.16 * t) }], d: 'Лечит отряд' }),
    guard: () => ({ tgt: 'self', cd: 4, fx: [{ k: 'st', id: 'guard', dur: 2 }, { k: 'st', id: 'rally', dur: 2 }], d: '«Стойка» и «Боевой дух»' }),
    rally: (t) => ({ tgt: 'allies', cd: 4, fx: [{ k: 'st', id: t >= 4 ? 'bless' : 'rally', dur: 2 }, { k: 'st', id: 'haste', dur: 1 }], d: 'Отряд воодушевлён' }),
    mark: (t, el) => ({ tgt: 'foe', cd: 3, fx: [{ k: 'dmg', s: 'atk', m: 1.1 * (1 + 0.16 * t), el }, { k: 'st', id: 'mark', p: 1, dur: 2 }], d: 'Удар и «Метка»' })
  };
  const SK = D.SKILLS;
  const pk = (pid, i, t, [n, ic, kind, el]) => { const o = KINDS[kind](t, el || 'phys'); const id = 'pk_' + pid + '_' + (i + 1);
    SK[id] = Object.assign({ id, n, ic, cls: 'art', art: 1, pet: 1, mp: 8 + 2 * t + (kind === 'burst' || kind === 'heal' ? 4 : 0) }, o); return id; };
  const P = (n, m, d) => ({ n, m, d: d || '' });
  const PET = (id, r, n, ic, foc, el, lore, sk, pas, o) => Object.assign({ id, r, n, ic, foc, el, lore, sk, pas, art: 'assets/pets/' + id + '.webp', thumb: 'assets/pets/t/' + id + '.webp' }, o || {});
  const ph = (id, r, n, foc, el, ic, sk, pas) => PET(id, r, n, ic || '🥚', foc, el, 'Образ этого питомца ещё не раскрыт — его рисунок появится в одном из ближайших обновлений.', sk, pas, { ph: 1 });

  D.PETS = [
    // ── Обычные ──
    PET('stray_cat', 0, 'Уличная кошка', '🐱', 'atk', 'phys', 'Пришла за крошками, осталась за компанию. Спит на вашем плече и делает вид, что охраняет.', [['Царапка', '🐾', 'strike', 'phys']], [P('Ловкие лапы', { eva: 4, acc: 4 })],
      { vp: 'a scruffy street tabby cat with bright eyes, small ragged ear, sitting proudly, dark fantasy town alley' }),
    PET('field_dog', 0, 'Дворовый пёс', '🐶', 'def', 'phys', 'Нашёл вас у ворот Хельмора и с тех пор не отходит ни на шаг. Лает только на врагов и на кота.', [['Грозный лай', '🦴', 'guard', 'phys']], [P('Верный нюх', { drop: 5, hpRegen: 1 })],
      { vp: 'a loyal shaggy mongrel dog with floppy ears and a red scarf, wagging tail, dark fantasy village gate' }),
    PET('jelly_slime', 0, 'Желейный слайм', '🟢', 'hyb', 'water', 'Тёплое, мягкое и подозрительно довольное жизнью. Съедает всё, что вы уронили, и становится чуть больше.', [['Липкий плевок', '💧', 'spell', 'water']], [P('Пружинистое тело', { taken: -3, heal: 5 })],
      { vp: 'a cute translucent green slime blob with a happy face and a tiny crown of leaves, glossy highlights' }),
    // ── Необычные ──
    PET('uncommon_a', 1, 'Розовая хрюша', '🐷', 'def', 'earth', 'Нашла в подвале забытый кошелёк, закопала в огород и теперь утверждает, что это её клад. Хрюкает, когда рядом звенит золото.', [['Копытный топот', '🐾', 'strike', 'earth'], ['Толстая шкура', '🛡️', 'guard', 'earth']], [P('Нюх на монеты', { gold: 8, drop: 4 }), P('Сытая удача', { hpRegen: 2, taken: -3 })],
      { vp: 'a plump pink pig with a curled tail and rosy cheeks, raising one hoof cheerfully, soft anime shading' }),
    PET('uncommon_b', 1, 'Жаба-Король', '🐸', 'mag', 'water', 'Когда-то её поцеловала принцесса — и ничего не изменилось. Жаба решила, что корона ей и так к лицу, и теперь невозмутимо правит ближайшей лужей.', [['Королевский плевок', '💧', 'spell', 'water'], ['Указ о тишине', '👑', 'mark', 'water']], [P('Величие', { dmg_water: 8, xp: 4 }), P('Болотная мудрость', { mpRegen: 2, statRes: 5 })],
      { vp: 'a huge plump green toad with a cream belly wearing a tiny golden crown with a ruby, smug half-lidded eyes' }),
    PET('uncommon_c', 1, 'Пухлый хомяк', '🐹', 'atk', 'phys', 'Набивает щёки всем, что плохо лежит, — включая ваши припасы. Зато в бою выдаёт всё накопленное одним лихим ударом.', [['Щёчный запас', '🌰', 'strike', 'phys'], ['Хомячий кураж', '✨', 'rally', 'phys']], [P('Запасливость', { drop: 8, gold: 4 }), P('Полные щёки', { dmg: 4, hpRegen: 1 })],
      { vp: 'a fat round orange-and-cream hamster standing upright with chubby cheeks and a happy smile, tiny pink paws' }),
    // ── Редкие ──
    PET('red_fox', 2, 'Лисица-огнехвостка', '🦊', 'mag', 'fire', 'Хвост тлеет, но не горит. Говорят, лисы-огнехвостки выбирают тех, кто умеет красиво врать.', [['Огненный хвост', '🔥', 'spell', 'fire'], ['Дымная завеса', '💨', 'burst', 'fire']], [P('Тлеющий мех', { dmg_fire: 8, penMag: 4 }), P('Хитрый взгляд', { crit: 5, gold: 5 })],
      { vp: 'an elegant red fox with a tail wreathed in soft flame, amber eyes, magical embers floating, forest at dusk' }),
    PET('river_otter', 2, 'Речная выдра', '🦦', 'def', 'water', 'Приносит со дна блестящие камушки и редкие травы. Иногда — чужие кошельки, но об этом лучше не спрашивать.', [['Брызги прилива', '🌊', 'heal', 'water'], ['Хлёсткий хвост', '🐟', 'strike', 'water']], [P('Речная удача', { drop: 8, hpRegen: 2 }), P('Скользкая шкура', { taken: -4, eva: 4 })],
      { vp: 'a cheerful river otter holding a glowing blue pebble, wet shiny fur, small water ripples, misty river bank' }),
    PET('night_owl', 2, 'Сова-молчальница', '🦉', 'mag', 'dark', 'Не издаёт ни звука — даже когда роняет вашу сумку. Видит в темноте ровно то, что вы хотели бы не видеть.', [['Беззвучный клюв', '🪶', 'mark', 'dark'], ['Ночной взгляд', '🌙', 'spell', 'dark']], [P('Ночное зрение', { acc: 8, crit: 5 }), P('Тихий полёт', { init: 8, eva: 5 })],
      { vp: 'a large silent owl with deep violet feathers and glowing moon-yellow eyes, perched on a dead branch, moonlit night' }),
    // ── Эпические ──
    PET('storm_hawk', 3, 'Грозовой ястреб', '🦅', 'atk', 'bolt', 'Родился в грозе и с тех пор носит её с собой. Перья потрескивают, когда он видит добычу.', [['Удар молнии', '⚡', 'strike', 'bolt'], ['Грозовой шквал', '🌩️', 'burst', 'bolt']], [P('Заряд', { dmg_bolt: 12, spd: 5 }), P('Раскат', { crit: 6, critDmg: 0.15 })],
      { vp: 'a majestic hawk with electric blue-white plumage crackling with lightning, wings spread, storm clouds' }),
    PET('frost_wolf', 3, 'Ледяной волк', '🐺', 'hyb', 'ice', 'Шерсть из инея, дыхание — метель. Идёт рядом молча, и вокруг становится тише и холоднее.', [['Ледяной клык', '❄️', 'strike', 'ice'], ['Вьюга', '🌨️', 'burst', 'ice']], [P('Иней', { dmg_ice: 12, res_ice: 12 }), P('Стая', { dmg: 6, taken: -4 })],
      { vp: 'a large frost wolf with icy silver-blue fur, glowing pale eyes, frozen breath, snowy pine forest' }),
    PET('crystal_slime', 3, 'Кристальный слайм', '💎', 'def', 'arcane', 'Однажды проглотил осколок эфирного кристалла и так и не смог его переварить. Зато теперь он почти несокрушим.', [['Грань кристалла', '💎', 'guard', 'arcane'], ['Эфирный всплеск', '🔮', 'spell', 'arcane']], [P('Кристальная броня', { taken: -6, statRes: 8 }), P('Отражение', { thorns: 10, manaEff: 6 })],
      { vp: 'a glossy slime with a glowing violet crystal core and faceted crystal shards on its body, sparkling cave' }),
    // ── Легендарные ──
    PET('ember_dragon', 4, 'Угольный дракончик', '🐉', 'atk', 'fire', 'Размером с собаку, зато характером — с вулкан. Спит на тёплых камнях и изредка выдыхает колечки дыма.', [['Огненное дыхание', '🔥', 'burst', 'fire'], ['Коготь жара', '🐲', 'strike', 'fire']], [P('Драконья кровь', { dmg_fire: 16, dmg: 6 }), P('Жар чешуи', { thorns: 12, bossDmg: 8 })],
      { dragon: 1, vp: 'a small fierce baby dragon with charcoal-black scales glowing with orange cracks like embers, tiny wings, smoke curling' }),
    PET('glacier_dragon', 4, 'Ледниковый дракон', '🐲', 'mag', 'ice', 'Родом с ледников, которые старше людей. Его чешуя звенит, как колокольчики, а взгляд замораживает воду в кружке.', [['Ледяное дыхание', '❄️', 'burst', 'ice'], ['Морозный шип', '🧊', 'spell', 'ice'], ['Покров стужи', '🛡️', 'guard', 'ice']], [P('Хрупкий мороз', { dmg_ice: 18, penMag: 8 }), P('Ледяная чешуя', { taken: -6, res_ice: 20 })],
      { dragon: 1, vp: 'an elegant young ice dragon with pale blue scales like frosted glass, crystal horns, mist of cold breath, glacier cave' }),
    PET('phoenix_fledgling', 4, 'Птенец феникса', '🔥', 'hyb', 'fire', 'Сгорает и возрождается каждое утро — ради завтрака. Перья оставляют на ладони тёплый пепел и ни одного ожога.', [['Пепельный взмах', '🪶', 'burst', 'fire'], ['Тёплое перо', '💛', 'heal', 'fire']], [P('Возрождение', { reviveOnce: 1, hpRegen: 2 }), P('Пламя надежды', { heal: 12, dmg_fire: 10 })],
      { vp: 'a baby phoenix chick with golden-red feathers and a flame crest, big eyes, glowing ash around, warm light' }),
    // ── Божественные (дракон — заглушка: арт пришлёт автор) ──
    PET('divine_dragon', 5, 'Дракон Беззвёздной Ночи', '🐲', 'atk', 'dark', 'Старше первой ночи и тише неё. Когда он расправляет крылья, гаснут звёзды — не от страха, а из уважения. Говорят, этот дракон не служит никому, но почему-то выбрал вас.', [['Дыхание беззвёздной ночи', '🌑', 'burst', 'dark'], ['Коготь тьмы', '🐲', 'strike', 'dark'], ['Крылья затмения', '🦇', 'rally', 'dark']], [P('Печать ночи', { dmg_dark: 24, dmg: 10 }), P('Память веков', { xp: 15, bossDmg: 14 }), P('Тёмный покров', { allStat: 4, statRes: 12 })],
      { dragon: 1, vp: 'a majestic black dragon with glossy obsidian scales, violet-tinted bat wings spread wide, standing on four legs' }),
    PET('nimbus_kitsune', 5, 'Кицунэ Нимба', '🦊', 'mag', 'light', 'Девять хвостов — девять оттенков света. Каждый из них помнит одно из обещаний, данных миру до его раскола.', [['Хвост света', '✨', 'burst', 'light'], ['Лисье благословение', '🌟', 'rally', 'light'], ['Девятый хвост', '☄️', 'spell', 'light']], [P('Девять хвостов', { dmg_light: 22, cdr: 8 }), P('Лисья хитрость', { drop: 15, gold: 15, xp: 10 }), P('Обещание', { reviveOnce: 1, startShield: 10 })],
      { vp: 'a divine nine-tailed fox with white and gold fur, nine glowing tails, a faint halo above its head, radiant celestial sky' }),
    PET('astral_kirin', 5, 'Астральный цилинь', '🦄', 'def', 'arcane', 'Ступает по воздуху, не касаясь земли. Там, где проходит цилинь, цветут звёзды, а раны перестают болеть.', [['Звёздный шаг', '⭐', 'heal', 'arcane'], ['Небесная стойка', '🛡️', 'guard', 'arcane'], ['Рог созвездий', '🌌', 'spell', 'arcane']], [P('Звёздная кожа', { taken: -10, statRes: 14 }), P('Лунный бальзам', { heal: 25, hpRegen: 4 }), P('Небесный путь', { allStat: 4, ccRes: 20 })],
      { vp: 'a divine qilin with a starry deep-blue mane, a luminous horn, sparkling hooves walking on clouds, galaxy backdrop' })
  ];
  D.PET = {}; D.PETS.forEach((p) => { D.PET[p.id] = p; });
  D.PET_IDS = D.PETS.map((p) => p.id);
  // навыки и пассивы по редкости
  D.PETS.forEach((p) => { p.sk = p.sk.map((s, i) => pk(p.id, i, p.r, s)); });
  if (D.SRC_N) D.SRC_N.pet = 'Питомец';
  const _srcName = E.srcName; E.srcName = (k) => (k === 'pet' ? 'Питомец' : _srcName(k));

  // ───── Статы: «как у снаряжения той же редкости» — берутся первичные статы эталонной вещи нужного уровня ─────
  const KEEP = { atk: ['atk', 'str', 'agi', 'vit', 'luk'], mag: ['mag', 'int', 'spi', 'wis', 'vit'], def: ['def', 'res', 'hp', 'vit'] };
  const BASE = { atk: 'sword', mag: 'staff', def: 'body_h' };
  const cache = {};
  const core = (kind, gr, il) => { const key = kind + gr + ':' + il; if (cache[key]) return cache[key]; const it = E.genItem(E.rng(7), { base: BASE[kind], il, rarity: gr }), o = {}; KEEP[kind].forEach((k) => { if (it.st[k]) o[k] = it.st[k]; }); return (cache[key] = o); };
  E.petIl = (lv) => Math.round(10 + (clamp(lv | 0, 1, D.PET_LV_MAX) - 1) * 90 / (D.PET_LV_MAX - 1));
  E.petNeed = (lv) => 20 + 12 * lv;
  E.petBondLv = (bxp) => { let l = 0; D.PET_BOND_AT.forEach((t, i) => { if ((bxp | 0) >= t) l = i; }); return l; };
  E.petStats = function (id, lv, star, bond) {
    const p = D.PET[id]; if (!p) return {}; const R = D.PET_RAR[p.r], il = E.petIl(lv), gr = Math.min(7, R.gr);
    const k = R.k * (1 + D.PET_STAR_K * clamp(star | 0, 0, D.PET_STAR_MAX)) * (1 + D.PET_BOND_K * clamp(bond | 0, 0, 5)), out = {};
    const add = (src, m) => { for (const key in src) out[key] = (out[key] || 0) + src[key] * m * k; };
    if (p.foc === 'hyb') { add(core('atk', gr, il), 0.6); add(core('mag', gr, il), 0.6); } else add(core(p.foc, gr, il), 1);
    for (const key in out) out[key] = Math.round(out[key]);
    return out;
  };
  const rec = (s, id) => (s && s.pets && s.pets[id]) || null;
  E.petPasUnlocked = (p, bond) => p.pas.filter((x, i) => bond >= i);   // пассив №i открывается при уровне уз i
  E.petMods = function (id, bond) { const p = D.PET[id], m = {}; if (!p) return m; E.petPasUnlocked(p, bond).forEach((x) => { for (const k in x.m) m[k] = (k === 'reviveOnce' ? Math.max(m[k] || 0, x.m[k]) : (m[k] || 0) + x.m[k]); }); return m; };
  E.petSkillsOf = (p, lv) => p.sk.filter((id, i) => lv >= D.PET_SK_LV[i]);

  // ───── Состояние ─────
  E.petEnsure = function (s) {
    if (!s) return s; if (!s.pets || typeof s.pets !== 'object' || Array.isArray(s.pets)) s.pets = {};
    for (const id in s.pets) { if (!D.PET[id]) { delete s.pets[id]; continue; } const r = s.pets[id]; r.lv = clamp(r.lv | 0 || 1, 1, D.PET_LV_MAX); r.xp = Math.max(0, r.xp | 0); r.star = clamp(r.star | 0, 0, D.PET_STAR_MAX); r.bxp = Math.max(0, r.bxp | 0); }
    if (!s.petEq || !s.pets[s.petEq]) s.petEq = null;
    s.petFood = Math.max(0, s.petFood | 0); if (!s.eggs || typeof s.eggs !== 'object' || Array.isArray(s.eggs)) s.eggs = {};
    if (s.hatch && !(s.hatch.r >= 0 && s.hatch.end > 0)) s.hatch = null; if (s.hatch === undefined) s.hatch = null;
    if (!s.petProg || typeof s.petProg !== 'object') s.petProg = { hatched: 0, fed: 0, eggs: 0 };
    return s;
  };
  E.petBond = (s, id) => E.petBondLv((rec(s, id) || {}).bxp);
  E.petEquipped = (s) => (s && s.pets && s.petEq && s.pets[s.petEq] && D.PET[s.petEq]) ? s.petEq : null;
  E.petEquip = function (s, id) { E.petEnsure(s); if (id && !s.pets[id]) return 'Нет такого питомца'; if (s.run) return 'Во время вылазки питомец не меняется'; s.petEq = id || null; s.rev = (s.rev || 0) + 1; return ''; };
  E.petLvCap = (s) => Math.min(D.PET_LV_MAX, Math.max(1, (s.hero && s.hero.level) || 1));
  // питомец → характеристики героя как у снаряжения
  const _collect = E.collect;
  E.collect = function (slot, ctx) {
    const c = _collect(slot, ctx), id = E.petEquipped(slot); if (!id) return c;
    const r = slot.pets[id], bl = E.petBondLv(r.bxp), st = E.petStats(id, r.lv, r.star, bl), mods = E.petMods(id, bl);
    for (const k in st) { const v = st[k]; if (D.STATS.includes(k)) { c.stats[k] += v; const b = c.sby[k] || (c.sby[k] = {}); b.pet = (b.pet || 0) + v; } else if (D.FLAT[k]) c.flat[k] = (c.flat[k] || 0) + v; else mods[k] = (mods[k] || 0) + v; }
    for (const k in mods) { if (k === 'reviveOnce') c.mods[k] = Math.max(c.mods[k] || 0, mods[k]); else c.mods[k] = (c.mods[k] || 0) + mods[k]; const b = c.by[k] || (c.by[k] = {}); b.pet = (b.pet || 0) + mods[k]; }
    if (mods.allStat) D.STATS.forEach((s) => { c.stats[s] += c.stats[s] * mods.allStat / 100; });
    return c;
  };
  E.petSkills = function (s) { const id = E.petEquipped(s); return id ? E.petSkillsOf(D.PET[id], s.pets[id].lv) : []; };
  const _ufs = C.unitFromSlot;
  C.unitFromSlot = function (slot) { const u = _ufs(slot); E.petSkills(slot).forEach((id) => { if (!u.sk.includes(id)) u.sk.push(id); }); return u; };

  // ───── Получение, корм, уровни ─────
  E.petGain = function (s, id) {
    E.petEnsure(s); const p = D.PET[id]; if (!p) return null; const res = { id, n: p.n, r: p.r, isNew: false, star: 0, conv: null };
    if (!s.pets[id]) { s.pets[id] = { lv: 1, xp: 0, star: 0, bond: 0, bxp: 0 }; res.isNew = true; }
    else if (s.pets[id].star < D.PET_STAR_MAX) { s.pets[id].star++; res.star = s.pets[id].star; }
    else { const f = 10 * (p.r + 1); s.petFood += f; res.conv = { food: f }; }
    s.rev = (s.rev || 0) + 1; return res;
  };
  E.petAddXp = function (s, id, xp) {
    const r = rec(s, id); if (!r) return 0; const cap = E.petLvCap(s); let up = 0; r.xp += xp;
    while (r.lv < cap && r.xp >= E.petNeed(r.lv)) { r.xp -= E.petNeed(r.lv); r.lv++; up++; }
    if (r.lv >= cap) r.xp = Math.min(r.xp, E.petNeed(r.lv) - 1); return up;
  };
  E.petFeed = function (s, id, n) {
    E.petEnsure(s); const r = rec(s, id); if (!r) return { err: 'Нет такого питомца' }; n = Math.max(1, n | 0);
    if (r.lv >= E.petLvCap(s)) return { err: r.lv >= D.PET_LV_MAX ? 'Максимальный уровень' : 'Уровень питомца не выше уровня героя' };
    if (s.petFood < 1) return { err: 'Нет корма' }; let used = 0, up = 0;
    while (used < n && s.petFood > 0 && r.lv < E.petLvCap(s)) { s.petFood--; used++; up += E.petAddXp(s, id, D.PET_FOOD_XP); r.bxp++; }
    s.petProg.fed += used; s.rev++; return { used, up, lv: r.lv };
  };
  E.foodBuy = function (s, n) { n = Math.max(1, n | 0); const cost = n * D.PET_FOOD_PRICE; if (s.gold < cost) return 'Не хватает золота'; s.gold -= cost; s.petFood = (s.petFood | 0) + n; s.rev++; return ''; };

  // ───── Яйца и инкубатор ─────
  E.petsOf = (r) => D.PETS.filter((p) => p.r === r);
  E.eggAdd = function (s, r, n) { E.petEnsure(s); if (!(r >= 0 && r <= D.PET_OPEN)) return false; s.eggs[r] = (s.eggs[r] | 0) + (n || 1); s.petProg.eggs += n || 1; s.rev++; return true; };
  E.eggBuy = function (s, r) { const price = D.EGG_PRICE[r]; if (!price) return 'Это яйцо в лавке не продаётся'; if (s.gold < price) return 'Не хватает золота'; s.gold -= price; E.eggAdd(s, r, 1); return ''; };
  E.hatchStart = function (s, r, now) {
    E.petEnsure(s); if (s.hatch) return 'Инкубатор занят'; if (!(s.eggs[r] > 0)) return 'Нет такого яйца'; s.eggs[r]--; if (!s.eggs[r]) delete s.eggs[r];
    s.hatch = { r, end: (now == null ? Date.now() : now) + D.EGG_MIN[r] * 60000 }; s.rev++; return '';
  };
  E.hatchLeft = (s, now) => (s.hatch ? Math.max(0, s.hatch.end - (now == null ? Date.now() : now)) : 0);
  E.hatchRush = (s, now) => Math.ceil(E.hatchLeft(s, now) / 60000) * 20 * (s.hatch ? s.hatch.r + 1 : 0);   // золото за ускорение
  E.hatchSpeedUp = function (s, now) { if (!s.hatch) return 'Инкубатор пуст'; const c = E.hatchRush(s, now); if (s.gold < c) return 'Не хватает золота (' + c + ')'; s.gold -= c; s.hatch.end = now == null ? Date.now() : now; s.rev++; return ''; };
  E.hatchClaim = function (s, now) {
    E.petEnsure(s); if (!s.hatch) return { err: 'Инкубатор пуст' }; if (E.hatchLeft(s, now)) return { err: 'Яйцо ещё не проклюнулось' };
    const r = s.hatch.r, pool = E.petsOf(r); s.hatch = null; s.petProg.hatched++;
    const rng = E.rng((s.petProg.hatched * 2654435761 + r * 40503 + E.hash(String(s.hero && s.hero.name))) >>> 0), id = pool[Math.floor(rng() * pool.length) % pool.length].id;
    const g = E.petGain(s, id); g.egg = r; return g;
  };
  // выпадение с боссов: потолок редкости зависит от подземелья; Божественные — только поздние этапы Артефактов/Материалов
  const LV_STEP = [0, 10, 25, 45, 70];
  E.eggCeil = function (d) {
    if (!d) return -1;
    if (d.art) { const i = d.art - 1; return i >= 8 ? 5 : i >= 4 ? 4 : 3; }
    if (d.sp === 'mats') return d.i >= 8 ? 5 : d.i >= 5 ? 4 : d.i >= 2 ? 3 : 2;
    if (d.sp === 'gold') return d.i >= 6 ? 4 : d.i >= 3 ? 3 : 2;
    let c = 0; LV_STEP.forEach((t, i) => { if ((d.lv | 0) >= t) c = i; }); return c;
  };
  E.eggChance = (d) => (d && d.art ? 0.3 : d && d.sp ? 0.2 : 0.14);
  E.rollEgg = function (d, rng) {
    const c = E.eggCeil(d); if (c < 0 || rng() >= E.eggChance(d)) return -1;
    const w = []; for (let t = 0; t <= c; t++) w.push(t === 5 ? 0.15 : Math.pow(0.42, c - t)); let u = rng() * w.reduce((a, b) => a + b, 0);
    for (let t = 0; t <= c; t++) { if (u < w[t]) return t; u -= w[t]; } return c;
  };
  const _finish = C.finishBattle;
  C.finishBattle = function (slot, B) {
    const run = slot.run, node = run && run.nodes[run.node], d = run && D.DUN[run.did]; const rep = _finish(slot, B);
    if (d && node && node.t === 'boss' && B.over === 'win') {
      E.petEnsure(slot); const rng = E.rng(((run.seed | 0) * 53 + 11 + (slot.petProg.eggs + slot.petProg.fed) * 131) >>> 0), pr = { };
      const r = E.rollEgg(d, rng); if (r >= 0) { E.eggAdd(slot, r, 1); pr.egg = r; }
      const f = 1 + Math.floor(rng() * 3) + Math.floor(Math.max(0, E.eggCeil(d)) / 2); slot.petFood += f; pr.food = f;
      const eq = E.petEquipped(slot); if (eq) { const b0 = E.petBondLv(slot.pets[eq].bxp); slot.pets[eq].bxp += 1; pr.bond = 1; pr.bondUp = E.petBondLv(slot.pets[eq].bxp) > b0; }
      rep.pet = pr;
    }
    return rep;
  };

  // ───── Новые сохранения и миграция v7 → v8 ─────
  const _newSlot = E.newSlot; if (_newSlot) E.newSlot = function (o) { const s = _newSlot(o); s.pets = {}; s.petEq = null; s.petFood = 0; s.eggs = {}; s.hatch = null; s.petProg = { hatched: 0, fed: 0, eggs: 0 }; return s; };
  E.migratePetSlot = (s) => (s ? E.petEnsure(s) : s);
  if (S && S.migrations) {
    S.VERSION = 8;
    S.migrations[7] = function (p) { p.slots = (p.slots || []).map((s) => (s ? E.migratePetSlot(s) : s)); p.v = 8; return p; };
  }
  if (typeof module !== 'undefined') module.exports = RPG;
})();
