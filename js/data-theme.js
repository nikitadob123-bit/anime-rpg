/* Перекраска мира под сюжет «Нимб Мира»: враги Церкви, подземелья, героини как боссы-дуэлянты. */
(function () {
  const RPG = globalThis.RPG || (globalThis.RPG = {});
  const D = RPG.D = RPG.D || {};
  const EN = D.ENEMIES, ES = D.ESK;
  const ren = { acolyte: 'Послушник Света', gatekeeper: 'Страж Нимба', rat: 'Падальщик', rat_king: 'Король падальщиков', oak_guardian: 'Дуб-Свидетель', stone_king: 'Гхорм, Каменный Страж', hag: 'Гнилая карга', ash_cultist: 'Фанатик Света', hellhound: 'Гончая Инквизиции', silent_cleric: 'Клирик Пяти богов', gargoyle: 'Страж-горгулья', shade: 'Отблеск Нимба', frost_queen: 'Хозяйка Шпиля', ice_captain: 'Капитан Белого Колокола', bog_witch: 'Болотная ведунья', miner_ghost: 'Дух шахтёра', imp: 'Искровик', frozen_knight: 'Замёрзший храмовник' };
  for (const k in ren) if (EN[k]) EN[k].n = ren[k];
  EN.gatekeeper.lines = ['Нимб видит всё.', 'Здесь вы не пройдёте.']; EN.gatekeeper.title = 'Страж врат';
  EN.oak_guardian.lines = ['Корни помнят каждого.', 'Свет судит. Я лишь свидетель.']; EN.oak_guardian.title = 'Свидетель леса';
  EN.stone_king.lines = ['Камень не прощает!', 'Рассыпьтесь в пыль!']; EN.stone_king.title = 'Страж шахт';
  ES.e_judge = { id: 'e_judge', n: 'Свет приговора', ic: '⚖️', tgt: 'foes', tele: 1, fx: [{ k: 'dmg', s: 'mag', m: 1.6, el: 'light' }, { k: 'st', id: 'weak', p: 1, dur: 2 }] };
  ES.e_halo = { id: 'e_halo', n: 'Шторм Нимба', ic: '☀️', tgt: 'foes', fx: [{ k: 'dmg', s: 'mag', m: 0.85, el: 'light' }] };
  ES.e_holysword = { id: 'e_holysword', n: 'Удар святого меча', ic: '⚔️', tgt: 'foe', tele: 1, fx: [{ k: 'dmg', s: 'atk', m: 2.5, el: 'light' }] };
  ES.e_pray = { id: 'e_pray', n: 'Молитва', ic: '🙏', tgt: 'eallies', fx: [{ k: 'heal', m: 1.0 }, { k: 'st', id: 'bless', dur: 2 }] };
  ES.e_chain = { id: 'e_chain', n: 'Цепи покаяния', ic: '⛓️', tgt: 'foe', fx: [{ k: 'dmg', s: 'mag', m: 1.0, el: 'light' }, { k: 'st', id: 'stun', p: 0.4, dur: 1 }] };
  function en(id, o) { o.id = id; o.loot = o.loot || []; EN[id] = o; }
  en('h_fiora', { n: 'Фиора, жрица-ученица', ic: '🙏', role: 'mini', duel: 'fiora', tags: ['human'], sk: ['e_zap', 'e_pray', 'e_halo', 'e_heal'], weak: ['dark'], res: ['light'], loot: [['ess_l', 1, 1, 2], ['cloth', 1, 2, 3]], title: 'Жрица-ученица', lines: ['Простите… но я должна!', 'Свет, дай мне силу!'] });
  en('h_elvira', { n: 'Эльвира, героиня света', ic: '⚔️', role: 'boss', duel: 'elvira', tags: ['human'], sk: ['e_holysword', 'e_hit', 'e_halo', 'e_howl'], ph2: 'enrage', weak: ['dark'], res: ['light'], loot: [['gem_fr', 1, 2, 3], ['ore_ms', 1, 2, 3], ['ess_l', 1, 1, 3]], title: 'Героиня Света', lines: ['Во имя Нимба — остановись, Король!', 'Мой меч не знает сомнений!'] });
  en('h_selestina', { n: 'Селестина, инквизитор', ic: '⛓️', role: 'mini', duel: 'selestina', tags: ['human'], sk: ['e_chain', 'e_judge', 'e_curse', 'e_pray'], weak: ['dark'], res: ['light'], loot: [['gem_fr', 1, 1, 2], ['ess', 1, 1, 3]], title: 'Инквизитор Церкви', lines: ['Допрос окончен. Начинается приговор.', 'Ересь будет стёрта.'] });
  en('lumiel', { n: 'Люмиэль, Апостол Света', ic: '👼', role: 'boss', tags: ['spirit'], sk: ['e_halo', 'e_judge', 'e_pray', 'e_call_acolyte', 'e_chord'], ph2: 'enrage', weak: ['dark'], res: ['light'], loot: [['gem_fr', 1, 2, 3], ['ess', 1, 3, 5], ['ess_l', 1, 2, 3], ['ore_ms', 1, 2, 4]], title: 'Апостол Света', lines: ['Дитя Бездны, ты нарушил равновесие.', 'Нимб не погаснет. Нимб — это мир.'] });
  const nm = { mill: ['Руины Хельмора', 'Воронка на месте родного города. Тишина, пепел и всё, что Церковь прислала проверить, что осталось.'], wood: ['Лес Шёпота', 'Священный лес у границы. Здесь стоит передовой пост Церкви — и там слышат Нимб ближе всего.'], mines: ['Шахты Тихого Камня', 'Заброшенные выработки, которыми церковь прикрывает свои тайны. Камень здесь будто слушает.'], swamp: ['Топи Мёртвых Огней', 'Болото, где гаснут и зажигаются огни, не имеющие отношения к жизни.'], spire: ['Белый Шпиль', 'Обсерватория Нимба, вмёрзшая в вечную зиму. Отсюда Церковь следит за каждым вздохом Бездны.'], cathedral: ['Собор Пяти Богов', 'Сердце Церкви под самым Нимбом. Здесь открывается Врата Богов — если упадёт тот, кто их стережёт.'] };
  D.DUNGEONS.forEach((d) => { if (nm[d.id]) { d.n = nm[d.id][0]; d.d = nm[d.id][1]; } });
  D.DUN.wood.mini = 'h_fiora'; D.DUN.spire.mini = 'ice_captain'; D.DUN.spire.boss = 'h_elvira'; D.DUN.cathedral.mini = 'h_selestina'; D.DUN.cathedral.boss = 'lumiel';
  D.LEGEND_NAMES = ['Безмолвный Нимб', 'Последний Рассвет Хельмора', 'Слеза Лирии', 'Трон Пустоты', 'Пепел Энтропии', 'Клятва Девяти', 'Тихий Шторм', 'Корона без Короля'];
  D.DUEL_SCENE = { h_fiora: 'duel_fiora', h_elvira: 'duel_elvira', h_selestina: 'duel_selestina' };
  D.PRE_BOSS = { cathedral: 'ch3_pre' };
  if (typeof module !== 'undefined') module.exports = RPG;
})();
