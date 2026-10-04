/* Враги, подземелья и вступления к вылазкам для глав сюжета. Формулы боя не трогаем: только данные (роли из D.ROLES, навыки из D.ESK).
   Новые враги арок добавляйте так же: RPG.story.defineEnemy(id, {...}) и RPG.story.defineDungeon({...}) — из этого файла или из файла своей арки. */
(function () {
  const RPG = globalThis.RPG, D = RPG.D, ST = RPG.story;
  const ES = D.ESK;
  // Новые навыки врагов (тот же формат, что в data-world.js)
  ES.e_toll = ES.e_toll || { id: 'e_toll', n: 'Погребальный звон', ic: '🔔', tgt: 'foes', tele: 1, fx: [{ k: 'dmg', s: 'mag', m: 1.5, el: 'dark' }, { k: 'st', id: 'weak', p: 1, dur: 2 }] };
  ES.e_gale = ES.e_gale || { id: 'e_gale', n: 'Небесный шквал', ic: '🌬️', tgt: 'foes', fx: [{ k: 'dmg', s: 'atk', m: 0.7 }, { k: 'st', id: 'chill', p: 0.5, dur: 2 }] };
  ES.e_goldcut = ES.e_goldcut || { id: 'e_goldcut', n: 'Золотой разрез', ic: '📏', tgt: 'foe', tele: 1, fx: [{ k: 'dmg', s: 'atk', m: 2.2, el: 'light', pierce: 0.4 }] };
  ES.e_call_cherub = ES.e_call_cherub || { id: 'e_call_cherub', n: 'Зов херувима', ic: '👼', tgt: 'self', fx: [{ k: 'summon', id: 'halo_wisp' }] };
  ES.e_call_echo = ES.e_call_echo || { id: 'e_call_echo', n: 'Зов эха', ic: '🔔', tgt: 'self', fx: [{ k: 'summon', id: 'portrait_shade' }] };

  const E = ST.defineEnemy;
  // Лестница Часов (глава 4)
  E('cloud_hound', { n: 'Облачная гончая', ic: '🐕', role: 'skirm', tags: ['beast', 'spirit'], sk: ['e_bite', 'e_zap', 'e_howl'], weak: ['fire'], res: ['bolt'], loot: [['fang', 0.4, 1, 2], ['dust', 0.3, 1, 2]] });
  E('halo_wisp', { n: 'Огонёк Нимба', ic: '✨', role: 'swarm', tags: ['spirit'], sk: ['e_zap'], weak: ['dark', 'ice'], res: ['light'], loot: [['dust', 0.4, 1, 2]] });
  E('step_cherub', { n: 'Херувим Ступеней', ic: '👼', role: 'caster', tags: ['spirit'], sk: ['e_zap', 'e_pray', 'e_halo'], weak: ['dark'], res: ['light'], loot: [['ess_l', 0.4, 1, 1], ['dust', 0.4, 1, 2]] });
  E('bell_knight', { n: 'Рыцарь Белого Звона', ic: '🔔', role: 'mini', tags: ['human'], sk: ['e_hit', 'e_slam', 'e_guard', 'e_chord'], weak: ['dark'], res: ['light'], loot: [['ore_ms', 1, 1, 2], ['ess_l', 0.7, 1, 2]], title: 'Страж Белого Звона', lines: ['Ступени считают шаги. Вы шумите.', 'Звон — это порядок!'] });
  E('step_warden', { n: 'Часовой Ступеней', ic: '⏳', role: 'boss', tags: ['construct', 'spirit'], sk: ['e_halo', 'e_judge', 'e_slam', 'e_guard', 'e_call_cherub'], ph2: 'enrage', weak: ['dark', 'bolt'], res: ['light'], loot: [['ess_l', 1, 2, 3], ['gem_ae', 1, 2, 3], ['ore_ms', 1, 2, 3]], title: 'Часовой Ступеней', lines: ['Срок вышел. Спуститесь, пожалуйста.', 'Ступени помнят каждого, кто на них упал.'] });
  // Галерея Двенадцати (глава 6)
  E('portrait_shade', { n: 'Тень портрета', ic: '🖼️', role: 'caster', tags: ['spirit'], sk: ['e_shade', 'e_curse'], weak: ['light'], res: ['dark'], loot: [['ess', 0.4, 1, 1], ['dust', 0.4, 1, 2]] });
  E('echo_knight', { n: 'Эхо рыцаря', ic: '🗡️', role: 'brute', tags: ['undead', 'spirit'], sk: ['e_hit', 'e_slam', 'e_shade'], weak: ['light', 'fire'], res: ['phys'], loot: [['ess', 0.4, 1, 2], ['ore_ms', 0.3, 1, 1]] });
  E('bell_mimic', { n: 'Колокол-подражатель', ic: '🔔', role: 'skirm', tags: ['construct'], sk: ['e_swarm', 'e_chord'], weak: ['bolt'], loot: [['ore_fe', 0.5, 1, 2], ['gem_ae', 0.2, 1, 1]] });
  E('echo_vassal', { n: 'Эхо оруженосца', ic: '🎭', role: 'mini', tags: ['spirit'], sk: ['e_needle', 'e_shade', 'e_curse', 'e_call_echo'], weak: ['light'], res: ['dark'], loot: [['ess', 1, 1, 2], ['gem_ae', 0.6, 1, 2]], title: 'Эхо оруженосца', lines: ['Король всегда приходит один. Пока не приходит с друзьями.', 'Ты — следующий портрет.'] });
  E('echo_king', { n: 'Эхо Двенадцатого Короля', ic: '👑', role: 'boss', tags: ['spirit'], sk: ['e_shade', 'e_curse', 'e_chord', 'e_call_echo', 'e_toll'], ph2: 'enrage', weak: ['light'], res: ['dark'], loot: [['ess', 1, 2, 4], ['gem_fr', 1, 1, 2], ['ess_l', 0.6, 1, 2]], title: 'Двенадцатый', lines: ['Она тоже говорила, что услышит.', 'Я был тобой. Ты будешь мной.'] });
  // Зал Хора (глава 7)
  E('choir_acolyte', { n: 'Певчий Хора', ic: '🎶', role: 'support', tags: ['human'], sk: ['e_heal', 'e_pray', 'e_curse'], weak: ['dark'], res: ['light'], loot: [['cloth', 0.5, 1, 2], ['dust', 0.4, 1, 2]] });
  E('halo_guard', { n: 'Страж с нимбом', ic: '🛡️', role: 'tank', tags: ['human'], sk: ['e_hit', 'e_guard', 'e_holysword'], weak: ['dark'], res: ['light'], loot: [['ore_ms', 0.4, 1, 1], ['ore_fe', 0.5, 1, 2]] });
  E('cantor', { n: 'Кантор Закрытия', ic: '🎼', role: 'caster', tags: ['human'], sk: ['e_zap', 'e_chord', 'e_pray'], weak: ['dark'], res: ['light'], loot: [['ess_l', 0.4, 1, 1], ['cloth', 0.4, 1, 2]] });
  E('cantor_prime', { n: 'Кантор Первого Голоса', ic: '📯', role: 'mini', tags: ['human'], sk: ['e_chord', 'e_pray', 'e_chain', 'e_toll'], weak: ['dark'], res: ['light'], loot: [['ess_l', 1, 1, 2], ['gem_ae', 0.6, 1, 2]], title: 'Первый Голос Хора', lines: ['Закрыть. Закрыть. Закрыть.', 'Нота взята!'] });
  E('regent_oldrik', { n: 'Регент Олдрик', ic: '🎩', role: 'boss', duel: 'oldrik', tags: ['human'], sk: ['e_chain', 'e_judge', 'e_pray', 'e_holysword', 'e_toll'], ph2: 'enrage', weak: ['dark'], res: ['light'], loot: [['gem_fr', 1, 1, 2], ['ess_l', 1, 2, 3], ['ore_ms', 1, 2, 3]], title: 'Регент Хора', lines: ['Врата закроются с вами или без вас!', 'Я не злой. Я дисциплинированный.'] });
  // Порог Предела (глава 9)
  E('seal_guard', { n: 'Страж Печати', ic: '🔒', role: 'mini', tags: ['construct'], sk: ['e_hit', 'e_guard', 'e_goldcut', 'e_judge'], weak: ['bolt', 'dark'], res: ['light'], loot: [['ore_ms', 1, 2, 3], ['gem_ae', 0.8, 1, 2]], title: 'Страж Печати', lines: ['Допуск не оформлен.', 'Печать закрыта по регламенту.'] });
  E('threshold_warden', { n: 'Привратник Порога', ic: '🚪', role: 'boss', tags: ['construct', 'spirit'], sk: ['e_goldcut', 'e_judge', 'e_halo', 'e_guard', 'e_call_cherub'], ph2: 'enrage', weak: ['dark', 'bolt'], res: ['light'], loot: [['gem_fr', 1, 2, 3], ['ess_l', 1, 3, 4], ['ore_ms', 1, 3, 4], ['gem_ae', 1, 2, 3]], title: 'Привратник Порога', lines: ['Пять замков. Один ключ. Расчёт не сходится.', 'Порядок — это когда вы уходите.'] });

  const D1 = ST.defineDungeon;
  D1({ id: 'stairs', n: 'Лестница Часов', ic: '🪜', lv: 16, floors: 2, bio: 'ice', col: '#7aa0d8', d: 'Лестница из твёрдого света над облаками. Ступени ведут к Вратам, но не все ведут вверх.', pool: ['cloud_hound', 'halo_wisp', 'step_cherub', 'gargoyle'], mini: 'bell_knight', boss: 'step_warden', ev: ['chest', 'rest', 'shrine'], need: 'cathedral', gate: '#pending', lockHint: 'Сначала прочтите главу «Лестница без перил».' });
  D1({ id: 'gallery_kings', n: 'Галерея Двенадцати', ic: '🖼️', lv: 19, floors: 2, bio: 'ash', col: '#8a6aa8', d: 'Длинная галерея портретов прежних Королей. Рамы дышат, а колокольчики под ними вторят вашим шагам.', pool: ['portrait_shade', 'echo_knight', 'bell_mimic', 'shade'], mini: 'echo_vassal', boss: 'echo_king', ev: ['chest', 'rest', 'shrine'], need: 'stairs', gate: '#pending', lockHint: 'Сначала прочтите главу «Галерея двенадцати».' });
  D1({ id: 'choir_hall', n: 'Зал Хора Закрытия', ic: '🎶', lv: 21, floors: 1, bio: 'ash', col: '#d8c08a', d: 'Круглый зал с хорами на четырёх ярусах. Церковь спешит закрыть Врата прямо над вашими головами.', pool: ['choir_acolyte', 'halo_guard', 'cantor', 'silent_cleric'], mini: 'cantor_prime', boss: 'regent_oldrik', ev: ['chest', 'rest', 'shrine'], need: 'gallery_kings', gate: '#pending', lockHint: 'Сначала прочтите главу «Хор Закрытия».' });
  D1({ id: 'threshold', n: 'Порог Предела', ic: '🚪', lv: 24, floors: 2, bio: 'ash', col: '#e8d8a0', d: 'Последний коридор перед Колыбелью: золотые двери, стражи с нимбами и ровный голос, предлагающий уйти.', pool: ['halo_guard', 'step_cherub', 'cloud_hound', 'gargoyle', 'cantor'], mini: 'seal_guard', boss: 'threshold_warden', ev: ['chest', 'rest', 'shrine'], need: 'choir_hall', gate: '#pending', lockHint: 'Сначала прочтите главу «Привратник Порога».' });

  // Вступления к вылазкам (играются один раз); сцена начинается с ['bg', …]
  D.INTROS.stairs = [['bg', 'stairs'], ['n', 'Ступени сложены из затвердевшего света и ничем не огорожены. Внизу, очень далеко, лежит мир, который вы только что оставили.'], ['h', 'Не смотри вниз. Не смотри вниз. Я уже посмотрел, да?', 'd']];
  D.INTROS.gallery_kings = [['bg', 'gallery'], ['n', 'Рамы тянутся вдоль стен до самого горизонта. В каждой — человек, который смотрит на вас так, будто ждал.'], ['h', 'Приятное место. Только вот вешалку для плащей не вижу.', 'n']];
  D.INTROS.choir_hall = [['bg', 'gate_hall'], ['n', 'Четыре яруса хоров заполнены певчими в белом. Они не поют — они считают такт до закрытия Врат.'], ['h', 'Концерт, значит. Билеты у меня, кажется, украли.', 'h']];
  D.INTROS.threshold = [['bg', 'gate_hall'], ['n', 'Здесь воздух пахнет сургучом и тёплым воском. Где-то далеко щёлкает печать — аккуратно, равнодушно, один раз в секунду.'], ['h', 'Знакомый звук. Так хлопает дверь, за которой сейчас что-то скажут о моём пропуске.', 'n']];
  if (typeof module !== 'undefined') module.exports = RPG;
})();
