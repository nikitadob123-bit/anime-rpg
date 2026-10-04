/* Мир, часть 2: кап уровня 100, кривая опыта, стихии врагов, 9 новых подземелий (ур. 20–95), враги Церкви Пяти богов, нежити, бесов и т. д. */
(function () {
  const RPG = globalThis.RPG, D = RPG.D;
  const ES = D.ESK, EN = D.ENEMIES;

  // ───── Уровни: кап 100, мягкая кривая ─────
  D.LEVEL_CAP = 100;
  D.xpNeed = (L) => L <= 30 ? Math.round(48 * Math.pow(L, 1.7)) : Math.round(48 * Math.pow(30, 1.7) * Math.pow(L / 30, 1.3));
  D.killXpK = (L) => 1 + Math.pow(Math.max(0, L - 25) / 28, 1.35);   // множитель награды за убийство на высоких уровнях
  D.ENEMY_LV_CAP = 130;

  // ───── Новые навыки врагов ─────
  function es(id, n, ic, o) { o.id = id; o.n = n; o.ic = ic; ES[id] = o; }
  es('e_smite', 'Кара пяти богов', '☀️', { tgt: 'foe', fx: [{ k: 'dmg', s: 'mag', m: 1.3, el: 'light' }] });
  es('e_hnova', 'Священная нова', '🌟', { tgt: 'foes', tele: 1, fx: [{ k: 'dmg', s: 'mag', m: 0.9, el: 'light' }, { k: 'st', id: 'weak', p: 0.4, dur: 2 }] });
  es('e_bless', 'Благословение клира', '🙏', { tgt: 'eallies', fx: [{ k: 'st', id: 'rally', dur: 3 }, { k: 'heal', m: 0.8 }] });
  es('e_edict', 'Эдикт Церкви', '📜', { tgt: 'foe', fx: [{ k: 'dmg', s: 'mag', m: 0.7, el: 'light' }, { k: 'st', id: 'stun', p: 0.35, dur: 1 }, { k: 'st', id: 'vuln', p: 1, dur: 2 }] });
  es('e_boneshot', 'Костяной град', '🦴', { tgt: 'foes', fx: [{ k: 'dmg', s: 'atk', m: 0.7 }, { k: 'st', id: 'bleed', p: 0.4, dur: 3 }] });
  es('e_grave', 'Дыхание могилы', '⚰️', { tgt: 'foe', tele: 1, fx: [{ k: 'dmg', s: 'mag', m: 2.0, el: 'dark' }, { k: 'st', id: 'weak', p: 1, dur: 2 }] });
  es('e_magma', 'Лавовый плевок', '🌋', { tgt: 'foe', fx: [{ k: 'dmg', s: 'mag', m: 1.3, el: 'fire' }, { k: 'st', id: 'burn', p: 0.6, dur: 3 }] });
  es('e_rockfall', 'Обвал', '🪨', { tgt: 'foes', fx: [{ k: 'dmg', s: 'atk', m: 0.85, el: 'earth' }] });
  es('e_gale', 'Шквал', '🌪️', { tgt: 'foes', fx: [{ k: 'dmg', s: 'mag', m: 0.8, el: 'wind' }] });
  es('e_thunder', 'Громовой удар', '⛈️', { tgt: 'foe', tele: 1, fx: [{ k: 'dmg', s: 'mag', m: 2.2, el: 'bolt' }, { k: 'st', id: 'stun', p: 0.4, dur: 1 }] });
  es('e_tide', 'Приливная волна', '🌊', { tgt: 'foes', fx: [{ k: 'dmg', s: 'mag', m: 0.85, el: 'water' }, { k: 'st', id: 'wet', p: 1, dur: 3 }] });
  es('e_drown', 'Утопление', '🫧', { tgt: 'foe', tele: 1, fx: [{ k: 'dmg', s: 'mag', m: 2.0, el: 'water' }, { k: 'st', id: 'chill', p: 1, dur: 2 }] });
  es('e_thorn', 'Терновый шквал', '🌹', { tgt: 'foes', fx: [{ k: 'dmg', s: 'atk', m: 0.75, el: 'earth' }, { k: 'st', id: 'bleed', p: 0.5, dur: 3 }] });
  es('e_void', 'Вакуум', '🕳️', { tgt: 'foe', fx: [{ k: 'dmg', s: 'mag', m: 1.4, el: 'arcane' }] });
  es('e_unmake', 'Распад', '💠', { tgt: 'foe', tele: 1, fx: [{ k: 'dmg', s: 'mag', m: 2.6, el: 'arcane', pierce: 0.4 }] });
  es('e_entropy', 'Волна энтропии', '🌀', { tgt: 'foes', tele: 1, fx: [{ k: 'dmg', s: 'mag', m: 1.1, el: 'arcane' }, { k: 'st', id: 'vuln', p: 0.7, dur: 2 }] });
  es('e_call_wisp', 'Рой пустоты', '🔮', { tgt: 'self', fx: [{ k: 'summon', id: 'void_wisp' }] });

  // ───── Враги: стихия (own = сопротивление к ней, слабость — стихии, которые её «бьют») ─────
  const WEAK_OF = (el) => Object.keys(D.ELEM_BEATS).filter((k) => D.ELEM_BEATS[k].includes(el));
  function en(id, n, ic, role, tags, el, sk, loot, extra) {
    EN[id] = Object.assign({ id, n, ic, role, tags, el, sk, loot: loot || [['dust', 0.4, 1, 2]], weak: WEAK_OF(el).slice(0, 2), res: [el] }, extra || {});
  }
  // стихии существующих врагов (для подсказок и множителей стихий)
  const OLD_EL = { slime: 'water', wisp: 'water', toad: 'water', swamp_mother: 'water', drowned: 'water', ice_elem: 'ice', frost_wolf: 'ice', frozen_knight: 'ice', yeti: 'ice', frost_queen: 'ice', ice_captain: 'ice', snow_wraith: 'dark',
    imp: 'fire', hellhound: 'fire', mara: 'fire', golem: 'earth', beetle: 'earth', stone_king: 'earth', drill_golem: 'earth', vine: 'earth', oak_guardian: 'earth', sprite: 'wind', gargoyle: 'earth',
    bat: 'dark', miner_ghost: 'dark', shade: 'dark', acolyte: 'dark', ash_cultist: 'dark', silent_cleric: 'dark', eydran: 'dark', gatekeeper: 'earth' };
  Object.keys(OLD_EL).forEach((k) => { if (EN[k]) EN[k].el = OLD_EL[k]; });

  // Церковь Пяти богов — свет
  en('temple_guard', 'Страж Храма', '🛡️', 'tank', ['human'], 'light', ['e_hit', 'e_guard', 'e_slam'], [['ore_ms', 0.4, 1, 2], ['dust', 0.4, 1, 2]]);
  en('inquisitor', 'Инквизитор', '⚖️', 'caster', ['human'], 'light', ['e_smite', 'e_edict', 'e_curse'], [['ess', 0.4, 1, 2], ['cloth', 0.4, 1, 2]]);
  en('pilgrim', 'Фанатик-паломник', '🕯️', 'swarm', ['human'], 'light', ['e_hit', 'e_smite'], [['cloth', 0.4, 1, 1]]);
  en('chorister', 'Певчий Церкви', '🎶', 'support', ['human'], 'light', ['e_bless', 'e_heal', 'e_smite'], [['ess', 0.4, 1, 2]]);
  en('paladin', 'Паладин Пяти', '⚔️', 'brute', ['human'], 'light', ['e_slam', 'e_smite', 'e_guard'], [['ore_ms', 0.5, 1, 2], ['gem_fr', 0.1, 1, 1]]);
  en('high_priest', 'Верховный жрец Пяти', '👑', 'boss', ['human'], 'light', ['e_hnova', 'e_edict', 'e_bless', 'e_smite'], [['gem_fr', 1, 2, 3], ['ess', 1, 3, 5], ['ess_l', 0.8, 1, 3]], { ph2: 'enrage', title: 'Верховный жрец', lines: ['Свет Пяти не прощает.', 'Ты… не должен был помнить…'] });
  en('templar_captain', 'Капитан храмовников', '🗡️', 'mini', ['human'], 'light', ['e_slam', 'e_smite', 'e_guard'], [['ore_ms', 1, 2, 3]]);
  // нежить — тьма
  en('skeleton', 'Костяной стражник', '💀', 'brute', ['undead'], 'dark', ['e_hit', 'e_boneshot'], [['fang', 0.5, 1, 2], ['dust', 0.4, 1, 2]]);
  en('bone_mage', 'Костяной маг', '🧙', 'caster', ['undead'], 'dark', ['e_shade', 'e_grave', 'e_curse'], [['ess', 0.4, 1, 2]]);
  en('ghoul', 'Гуль', '🧟', 'skirm', ['undead'], 'dark', ['e_bite', 'e_claw', 'e_leech'], [['fang', 0.4, 1, 2]]);
  en('wraith', 'Призрак Склепа', '👻', 'caster', ['undead', 'spirit'], 'dark', ['e_grave', 'e_chord'], [['ess_l', 0.3, 1, 1]], { res: ['dark', 'phys'] });
  en('bone_knight', 'Рыцарь-костяк', '🛡️', 'mini', ['undead'], 'dark', ['e_slam', 'e_boneshot', 'e_guard'], [['ore_ms', 1, 2, 3]]);
  en('lich_regent', 'Лич-Регент', '☠️', 'boss', ['undead'], 'dark', ['e_grave', 'e_call_shade', 'e_chord', 'e_curse'], [['ess_l', 1, 2, 4], ['gem_fr', 1, 2, 3]], { ph2: 'enrage', title: 'Лич-Регент', lines: ['Смерть — лишь служба.', 'Мой трон… не пуст…'] });
  // огонь/земля
  en('magma_golem', 'Магмовый голем', '🌋', 'tank', ['construct'], 'fire', ['e_hit', 'e_magma', 'e_guard'], [['ore_fe', 0.6, 2, 3]]);
  en('fire_drake', 'Огненный дрейк', '🐲', 'brute', ['beast'], 'fire', ['e_claw', 'e_magma', 'e_blast'], [['hide', 0.5, 1, 2], ['fang', 0.4, 1, 2]]);
  en('cinder_imp', 'Угольный бес', '😈', 'skirm', ['demon'], 'fire', ['e_fire', 'e_claw'], [['dust', 0.4, 1, 2]]);
  en('forge_priest', 'Жрец горна', '🔥', 'support', ['human'], 'fire', ['e_heal', 'e_magma', 'e_bless'], [['ess', 0.4, 1, 2]]);
  en('ember_lord', 'Лорд Углей', '🔥', 'mini', ['demon'], 'fire', ['e_magma', 'e_blast', 'e_slam'], [['gem_fr', 0.8, 1, 2]]);
  en('ember_titan', 'Титан Кратера', '🗻', 'boss', ['construct'], 'fire', ['e_quake', 'e_magma', 'e_blast', 'e_slam'], [['gem_fr', 1, 2, 4], ['ore_ms', 1, 3, 5]], { ph2: 'enrage', title: 'Титан Кратера', lines: ['Горы помнят огонь.', 'Остыть… нельзя…'] });
  // ветер/молния
  en('storm_hawk', 'Штормовой ястреб', '🦅', 'skirm', ['beast'], 'wind', ['e_claw', 'e_gale'], [['hide', 0.4, 1, 2]]);
  en('thunder_elem', 'Грозовой элементаль', '⚡', 'caster', ['spirit'], 'bolt', ['e_zap', 'e_thunder'], [['gem_ae', 0.4, 1, 1]]);
  en('wind_dancer', 'Танцор ветра', '🌬️', 'skirm', ['human'], 'wind', ['e_gale', 'e_needle'], [['silk', 0.4, 1, 2]]);
  en('sky_priest', 'Жрец облаков', '☁️', 'support', ['human'], 'wind', ['e_heal', 'e_gale', 'e_bless'], [['ess', 0.4, 1, 2]]);
  en('storm_warden', 'Хранитель бурь', '🌩️', 'mini', ['spirit'], 'bolt', ['e_thunder', 'e_zap', 'e_guard'], [['gem_ae', 0.8, 1, 2]]);
  en('tempest_roc', 'Рух Бури', '🦅', 'boss', ['beast'], 'wind', ['e_gale', 'e_thunder', 'e_swarm', 'e_claw'], [['gem_ae', 1, 2, 4], ['silk', 1, 2, 4]], { ph2: 'enrage', title: 'Рух Бури', lines: ['Небо — моё.', 'Крылья… тяжелеют…'] });
  // вода
  en('deep_one', 'Глубинный', '🐙', 'brute', ['beast'], 'water', ['e_claw', 'e_tide'], [['fish_m', 0.5, 1, 2]]);
  en('siren', 'Сирена', '🧜', 'caster', ['spirit'], 'water', ['e_drown', 'e_tide', 'e_heal'], [['ess', 0.4, 1, 2]]);
  en('tide_knight', 'Рыцарь прилива', '🔱', 'tank', ['construct'], 'water', ['e_hit', 'e_tide', 'e_guard'], [['ore_ms', 0.4, 1, 2]]);
  en('brine_witch', 'Солёная ведьма', '🧙‍♀️', 'support', ['human'], 'water', ['e_heal', 'e_drown', 'e_curse'], [['herb_r', 0.4, 1, 2]]);
  en('abyss_priest', 'Жрец пучины', '🌊', 'mini', ['spirit'], 'water', ['e_drown', 'e_tide', 'e_call_leech'], [['ess_l', 0.8, 1, 2]]);
  en('leviathan', 'Левиафан', '🐋', 'boss', ['beast'], 'water', ['e_tide', 'e_drown', 'e_bigbite', 'e_quake'], [['ess_l', 1, 3, 5], ['fish_i', 1, 2, 4]], { ph2: 'enrage', title: 'Левиафан', lines: ['Пучина зовёт.', 'Прилив… отступает…'] });
  // земля/растения
  en('thorn_beast', 'Терновый зверь', '🦔', 'brute', ['plant'], 'earth', ['e_thorn', 'e_hit'], [['herb_g', 0.6, 1, 3]]);
  en('moss_giant', 'Мшистый великан', '🌿', 'tank', ['plant'], 'earth', ['e_rockfall', 'e_guard', 'e_regrow'], [['herb_b', 0.5, 1, 2]]);
  en('glass_dryad', 'Стеклянная дриада', '🧚', 'caster', ['spirit'], 'earth', ['e_thorn', 'e_heal', 'e_zap'], [['gem_ae', 0.4, 1, 1]]);
  en('briar_knight', 'Рыцарь терний', '🌹', 'mini', ['plant'], 'earth', ['e_thorn', 'e_slam', 'e_guard'], [['herb_r', 0.8, 1, 2]]);
  en('verdant_empress', 'Изумрудная императрица', '🌺', 'boss', ['plant'], 'earth', ['e_thorn', 'e_rockfall', 'e_regrow', 'e_vines'], [['herb_s', 1, 1, 2], ['gem_ae', 1, 2, 3]], { ph2: 'enrage', title: 'Императрица Сада', lines: ['Сад растёт на тех, кто пришёл.', 'Корни… отпускают…'] });
  // свет высшего порядка
  en('seraph_guard', 'Серафим-страж', '😇', 'tank', ['human'], 'light', ['e_smite', 'e_guard', 'e_slam'], [['ess_l', 0.4, 1, 2]]);
  en('halo_archer', 'Лучник Нимба', '🏹', 'skirm', ['human'], 'light', ['e_smite', 'e_needle'], [['silk', 0.4, 1, 1]]);
  en('hymn_angel', 'Ангел-хорал', '🎼', 'support', ['spirit'], 'light', ['e_bless', 'e_hnova', 'e_heal'], [['ess_l', 0.4, 1, 2]]);
  en('vael_champion', 'Чемпион Ваэля', '⚜️', 'mini', ['human'], 'light', ['e_slam', 'e_hnova', 'e_guard'], [['ess_l', 0.8, 1, 2]]);
  en('archangel_vael', 'Архангел Ваэль', '👼', 'boss', ['spirit'], 'light', ['e_hnova', 'e_edict', 'e_bless', 'e_smite'], [['ess_l', 1, 3, 5], ['gem_fr', 1, 2, 4]], { ph2: 'enrage', title: 'Архангел Ваэль', lines: ['Склонись перед порядком.', 'Свет… гаснет…'] });
  // Пустота
  en('void_wisp', 'Огонёк Пустоты', '🔮', 'swarm', ['spirit'], 'arcane', ['e_void'], [['dust', 0.3, 1, 2]]);
  en('voidling', 'Бездник', '🕳️', 'skirm', ['demon'], 'arcane', ['e_void', 'e_claw', 'e_shade'], [['ess', 0.4, 1, 2]]);
  en('devourer', 'Пожиратель', '👹', 'brute', ['demon'], 'dark', ['e_leech', 'e_slam', 'e_void'], [['fang', 0.5, 1, 2]]);
  en('void_oracle', 'Оракул Пустоты', '👁️', 'caster', ['demon'], 'arcane', ['e_unmake', 'e_void', 'e_curse'], [['ess_l', 0.4, 1, 2]]);
  en('abyss_knight', 'Рыцарь Бездны', '🗡️', 'tank', ['demon'], 'dark', ['e_hit', 'e_guard', 'e_grave'], [['ore_ms', 0.5, 1, 2]]);
  en('void_herald', 'Вестник Пустоты', '🌑', 'mini', ['demon'], 'arcane', ['e_unmake', 'e_call_wisp', 'e_void'], [['ess_l', 0.8, 1, 2]]);
  en('void_sovereign', 'Владыка Пустоты', '🌌', 'boss', ['demon'], 'arcane', ['e_unmake', 'e_entropy', 'e_call_wisp', 'e_grave'], [['ess_l', 1, 3, 6], ['gem_fr', 1, 3, 4]], { ph2: 'enrage', title: 'Владыка Пустоты', lines: ['Ты — всего лишь тень Короля.', 'Конец… это только начало…'] });
  en('entropy_wraith', 'Призрак Энтропии', '🌫️', 'caster', ['spirit'], 'arcane', ['e_entropy', 'e_void'], [['ess_l', 0.4, 1, 2]]);
  en('unmade', 'Нерождённый', '🫥', 'brute', ['spirit'], 'arcane', ['e_unmake', 'e_void', 'e_hit'], [['ess_l', 0.4, 1, 2]]);
  en('last_guardian', 'Последний страж', '🗿', 'mini', ['construct'], 'arcane', ['e_unmake', 'e_guard', 'e_slam'], [['ore_ms', 1, 2, 3]]);
  en('last_entropy', 'Последняя Энтропия', '⚫', 'boss', ['spirit'], 'arcane', ['e_unmake', 'e_entropy', 'e_call_wisp', 'e_chord'], [['ess_l', 1, 4, 7], ['gem_fr', 1, 3, 5]], { ph2: 'enrage', title: 'Последняя Энтропия', lines: ['Всё возвращается ко мне.', 'Даже ты.'] });

  // ───── Подземелья 7–15 ─────
  const evs = ['chest', 'rest', 'gather_ore', 'shrine'];
  const dungeons = [
    ['chapel', 'Часовня Пяти богов', '🕍', 20, 'ash', '#c8a850', 'Малая часовня на пути к Хельмору. Жрецы Пяти верят, что тьма в тебе — болезнь.', ['temple_guard', 'inquisitor', 'pilgrim', 'chorister', 'paladin'], 'templar_captain', 'high_priest', 'cathedral'],
    ['ossuary', 'Костница Хельмора', '💀', 28, 'crypt', '#6a5a7a', 'Подземные залы, где Церковь складывала тех, кто пришёл не вовремя. Они всё ещё помнят.', ['skeleton', 'bone_mage', 'ghoul', 'wraith', 'shade'], 'bone_knight', 'lich_regent', 'chapel'],
    ['crater', 'Кратер Расколотой Звезды', '🌋', 36, 'ash', '#c85a2a', 'Упавшая звезда выжгла холм. Внутри горят горны, которые никто не зажигал.', ['magma_golem', 'fire_drake', 'cinder_imp', 'forge_priest', 'hellhound'], 'ember_lord', 'ember_titan', 'ossuary'],
    ['tempest', 'Грозовой шпиль', '⛈️', 45, 'ice', '#7aa0d8', 'Башня в самом центре бури. Молнии здесь бьют по расписанию.', ['storm_hawk', 'thunder_elem', 'wind_dancer', 'sky_priest', 'gargoyle'], 'storm_warden', 'tempest_roc', 'crater'],
    ['sunken', 'Затонувший собор', '🌊', 55, 'swamp', '#3a7aa8', 'Собор, который море проглотило вместе с молящимися. Колокола звонят под водой.', ['deep_one', 'siren', 'tide_knight', 'brine_witch', 'drowned'], 'abyss_priest', 'leviathan', 'tempest'],
    ['garden', 'Стеклянный сад', '🌺', 65, 'forest', '#4aa86a', 'Сад, выращенный из стекла и терний. Здесь не гибнет ничего, кроме гостей.', ['thorn_beast', 'moss_giant', 'glass_dryad', 'vine', 'sprite'], 'briar_knight', 'verdant_empress', 'sunken'],
    ['citadel', 'Цитадель Серафимов', '⚜️', 75, 'ash', '#e8d878', 'Небесная крепость порядка. Приказы здесь исполняются раньше, чем отдаются.', ['seraph_guard', 'halo_archer', 'hymn_angel', 'paladin', 'inquisitor'], 'vael_champion', 'archangel_vael', 'garden'],
    ['abyss', 'Бездна Короля', '🕳️', 85, 'crypt', '#4a2a7a', 'Трон, пустующий тысячу лет. Он ждёт, когда ты сядешь — и боится этого.', ['voidling', 'devourer', 'void_oracle', 'abyss_knight', 'shade'], 'void_herald', 'void_sovereign', 'citadel'],
    ['nowhere', 'Край Энтропии', '⚫', 95, 'crypt', '#222244', 'Место, где мир перестаёт быть. Дальше — только то, что ты решишь стереть.', ['entropy_wraith', 'unmade', 'void_wisp', 'voidling', 'void_oracle'], 'last_guardian', 'last_entropy', 'abyss']
  ];
  dungeons.forEach((d) => { D.DUNGEONS.push({ id: d[0], n: d[1], ic: d[2], lv: d[3], floors: 3, bio: d[4], col: d[5], d: d[6], pool: d[7], mini: d[8], boss: d[9], ev: evs, need: d[10], late: 1 }); });
  D.DUN = {}; D.DUNGEONS.forEach((d) => { D.DUN[d.id] = d; });
  // ярусы сложности на высоких уровнях: добавляем «Хаос» (+12 ур.) и «Предел» (+16 ур.)
  D.TIERS.push({ n: 'Хаос', lv: 12, mul: 3.0, loot: 2.8, ic: '🟣' }, { n: 'Предел', lv: 16, mul: 3.8, loot: 3.5, ic: '💀' });
})();
