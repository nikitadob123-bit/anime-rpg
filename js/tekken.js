/* v2.29 «Коллаба: Железный Кулак» — временное побочное событие (неофициальная фанатская коллаба).
   Только добавляет: окно события, побочный сюжет, турнир, магазин, награды. Основной сюжет, механики и баланс не меняются. */
(function () {
  const RPG = globalThis.RPG, D = RPG.D, E = RPG.E, C = RPG.C, S = RPG.S;
  const clamp = E.clamp;

  // ───── Окно события (одно место) ─────
  D.TK_EVENT = {
    id: 'ironfist',
    n: 'Коллаба: Железный Кулак',
    ic: '👊',
    start: Date.parse('2026-11-24T00:00:00+01:00'),
    end: Date.parse('2026-12-24T23:59:59+01:00'),
    disc: 'Неофициальная фанатская коллаба. Tekken — торговая марка Bandai Namco.'
  };
  E.tkActive = (now) => { now = now == null ? Date.now() : now; return now >= D.TK_EVENT.start && now <= D.TK_EVENT.end; };
  E.tkLeft = (now) => Math.max(0, D.TK_EVENT.end - (now == null ? Date.now() : now));
  E.tkWhyClosed = (now) => { now = now == null ? Date.now() : now; return now < D.TK_EVENT.start ? 'Событие ещё не началось' : now > D.TK_EVENT.end ? 'Коллаба завершена. Заработанные награды остаются у вас.' : ''; };

  // ───── Валюта и лимиты ─────
  D.TK_DAILY = 5;
  D.TK_TOKEN = { n: 'Жетон Турнира', ic: '🎫' };

  E.tkEnsure = function (s, now) {
    now = now == null ? Date.now() : now;
    if (!s.tk || typeof s.tk !== 'object') s.tk = {};
    const t = s.tk;
    if (t.tokens == null) t.tokens = 0;
    if (!Array.isArray(t.story)) t.story = [];
    if (!t.flags || typeof t.flags !== 'object') t.flags = {};
    if (t.stage == null) t.stage = 0;
    if (t.best == null) t.best = 0;
    if (!t.shop || typeof t.shop !== 'object') t.shop = {};
    if (!Array.isArray(t.rec)) t.rec = [];
    if (t.ending === undefined) t.ending = null;
    if (t.bolt == null) t.bolt = 0;
    const day = E.dayKey ? E.dayKey(now) : 0;
    if (t.day !== day) { t.day = day; t.fights = 0; }
    if (t.fights == null) t.fights = 0;
    return t;
  };

  // ───── Бойцы ─────
  D.SKILLS.tk_e_punch = { id: 'tk_e_punch', n: 'Хук', ic: '👊', mp: 0, cd: 0, tgt: 'foe', d: 'Прямой удар 110%.', fx: [{ k: 'dmg', s: 'atk', m: 1.1 }] };
  D.SKILLS.tk_e_kick = { id: 'tk_e_kick', n: 'Удар ногой', ic: '🦵', mp: 0, cd: 1, tgt: 'foe', d: 'Удар 140%.', fx: [{ k: 'dmg', s: 'atk', m: 1.4 }] };
  D.SKILLS.tk_e_throw = { id: 'tk_e_throw', n: 'Бросок', ic: '🤼', mp: 0, cd: 2, tgt: 'foe', d: 'Бросок 160%, «Слабость».', fx: [{ k: 'dmg', s: 'atk', m: 1.6 }, { k: 'st', id: 'weak', p: 1, dur: 2 }] };
  D.SKILLS.tk_e_rush = { id: 'tk_e_rush', n: 'Серия ударов', ic: '💥', mp: 0, cd: 2, tgt: 'foe', d: 'Три удара по 70%.', fx: [{ k: 'dmg', s: 'atk', m: 0.7, hits: 3 }] };
  D.SKILLS.tk_e_electric = { id: 'tk_e_electric', n: 'Электрический удар', ic: '⚡', mp: 0, cd: 3, tgt: 'foe', d: 'Молния 200%, 40% оглушить.', fx: [{ k: 'dmg', s: 'atk', m: 2.0, el: 'bolt' }, { k: 'st', id: 'stun', p: 0.4, dur: 1 }] };
  D.SKILLS.tk_e_laser = { id: 'tk_e_laser', n: 'Лазер дьявола', ic: '👁️', mp: 0, cd: 3, tgt: 'foes', d: 'Тьма 120% по всем.', fx: [{ k: 'dmg', s: 'mag', m: 1.2, el: 'dark' }] };
  D.SKILLS.tk_e_heal = { id: 'tk_e_heal', n: 'Свет Кадзама', ic: '🕊️', mp: 0, cd: 3, tgt: 'self', d: 'Лечение 25% HP.', fx: [{ k: 'heal', m: 0.25 }] };
  D.SKILLS.tk_mishima = { id: 'tk_mishima', n: 'Электрический Удар Мисимы', ic: '⚡', mp: 14, cd: 3, tgt: 'foe', d: 'Фирменный удар Мисимы: молния 220%, 25% оглушить.', fx: [{ k: 'dmg', s: 'atk', m: 2.2, el: 'bolt' }, { k: 'st', id: 'stun', p: 0.25, dur: 1 }], cls: null, event: 'tk' };

  const EN = D.ENEMIES;
  const ten = (id, o) => { o.id = id; o.loot = o.loot || []; EN[id] = o; };
  ten('tk_paul', { n: 'Пол Феникс', ic: '🔥', role: 'brute', tags: ['human'], sk: ['tk_e_punch', 'tk_e_kick', 'tk_e_rush'], art: 'tk_paul' });
  ten('tk_law', { n: 'Маршалл Ло', ic: '🥋', role: 'skirm', tags: ['human'], sk: ['tk_e_kick', 'tk_e_rush', 'tk_e_punch'], art: 'tk_law' });
  ten('tk_king', { n: 'Кинг', ic: '🐯', role: 'tank', tags: ['human'], sk: ['tk_e_throw', 'tk_e_punch', 'tk_e_rush'], art: 'tk_king' });
  ten('tk_nina', { n: 'Нина Уильямс', ic: '🗡️', role: 'skirm', tags: ['human'], sk: ['tk_e_rush', 'tk_e_kick', 'e_shade'], art: 'tk_nina' });
  ten('tk_hwoarang', { n: 'Хворан', ic: '🦵', role: 'skirm', tags: ['human'], sk: ['tk_e_kick', 'tk_e_rush', 'tk_e_punch'], art: 'tk_hwoarang' });
  ten('tk_lars', { n: 'Ларс Александерссон', ic: '⚔️', role: 'brute', tags: ['human'], sk: ['tk_e_punch', 'tk_e_electric', 'tk_e_rush'], art: 'tk_lars' });
  ten('tk_jun', { n: 'Джун Кадзама', ic: '🕊️', role: 'caster', tags: ['human'], sk: ['tk_e_heal', 'e_smite', 'tk_e_kick'], art: 'tk_jun', weak: ['dark'] });
  ten('tk_heihachi', { n: 'Хэйхати Мисима', ic: '👴', role: 'mini', tags: ['human', 'spirit'], sk: ['tk_e_punch', 'tk_e_electric', 'tk_e_throw', 'tk_e_rush'], art: 'tk_heihachi', ph2: 'enrage' });
  ten('tk_kazuya', { n: 'Кадзуя Мисима', ic: '👿', role: 'boss', tags: ['human'], sk: ['tk_e_electric', 'tk_e_punch', 'tk_e_laser', 'tk_e_rush'], art: 'tk_kazuya', el: 'dark', ph2: 'enrage' });
  ten('tk_jin', { n: 'Дзин Кадзама', ic: '👊', role: 'boss', tags: ['human'], sk: ['tk_e_electric', 'tk_e_rush', 'tk_e_kick', 'tk_e_punch'], art: 'tk_jin', ph2: 'enrage' });
  ten('tk_deviljin', { n: 'Дьявольский Дзин', ic: '😈', role: 'boss', tags: ['human', 'spirit'], sk: ['tk_e_laser', 'tk_e_electric', 'tk_e_rush', 'tk_e_kick'], art: 'tk_deviljin', el: 'dark', ph2: 'enrage', weak: ['light'] });

  D.TK_FIGHTERS = [
    { id: 'paul', en: 'tk_paul', n: 'Пол Феникс', ic: '🔥', off: 0 },
    { id: 'law', en: 'tk_law', n: 'Маршалл Ло', ic: '🥋', off: 2 },
    { id: 'king', en: 'tk_king', n: 'Кинг', ic: '🐯', off: 4 },
    { id: 'nina', en: 'tk_nina', n: 'Нина Уильямс', ic: '🗡️', off: 6 },
    { id: 'hwoarang', en: 'tk_hwoarang', n: 'Хворан', ic: '🦵', off: 8 },
    { id: 'lars', en: 'tk_lars', n: 'Ларс Александерссон', ic: '⚔️', off: 10 },
    { id: 'jun', en: 'tk_jun', n: 'Джун Кадзама', ic: '🕊️', off: 12 },
    { id: 'heihachi', en: 'tk_heihachi', n: 'Хэйхати Мисима', ic: '👴', off: 14 },
    { id: 'kazuya', en: 'tk_kazuya', n: 'Кадзуя Мисима', ic: '👿', off: 16 },
    { id: 'jin', en: 'tk_jin', n: 'Дзин Кадзама', ic: '👊', off: 18 },
    { id: 'deviljin', en: 'tk_deviljin', n: 'Дьявольский Дзин', ic: '😈', off: 22 }
  ];
  D.TK_FIGHTER = {}; D.TK_FIGHTERS.forEach((f, i) => { f.i = i; D.TK_FIGHTER[f.id] = f; });

  E.tkLv = (s, off) => clamp((s.hero.level | 0) + (off | 0), 8, 140);
  E.tkFoe = function (s, fid) {
    const f = D.TK_FIGHTER[fid]; if (!f) return null;
    const lv = E.tkLv(s, f.off);
    const u = C.unitFromEnemy(f.en, lv, 0, 0, 'tk_' + fid);
    const h = C.unitFromSlot(s);
    const i = f.i | 0;
    const hpMul = 1.7 + i * 0.32;
    const atkMul = 0.82 + i * 0.07;
    u.maxHp = Math.max(180, Math.round((h.maxHp || 200) * hpMul * (f.id === 'deviljin' ? 1.15 : 1)));
    u.hp = u.maxHp;
    ['atk', 'mag', 'hpow'].forEach((k) => { u[k] = Math.max(8, Math.round((h[k] || 10) * atkMul)); });
    u.def = Math.max(4, Math.round((h.def || 8) * (0.65 + i * 0.04)));
    u.res = Math.round(u.def * 0.9);
    return u;
  };

  // ───── Сюжет ─────
  D.TK_SPEAKERS = {
    paul: { n: 'Пол Феникс', art: 'tk_paul', c: '#ff9a4a' },
    law: { n: 'Маршалл Ло', art: 'tk_law', c: '#7ad87a' },
    king: { n: 'Кинг', art: 'tk_king', c: '#ffd35a' },
    nina: { n: 'Нина Уильямс', art: 'tk_nina', c: '#9ab8ff' },
    hwo: { n: 'Хворан', art: 'tk_hwoarang', c: '#ff6a4a' },
    lars: { n: 'Ларс Александерссон', art: 'tk_lars', c: '#7ab8ff' },
    jun: { n: 'Джун Кадзама', art: 'tk_jun', c: '#c8f0d0' },
    hei: { n: 'Хэйхати Мисима', art: 'tk_heihachi', c: '#e8c37a' },
    kaz: { n: 'Кадзуя Мисима', art: 'tk_kazuya', c: '#c060ff' },
    jin: { n: 'Дзин Кадзама', art: 'tk_jin', c: '#ffe0e0' },
    djin: { n: 'Дьявольский Дзин', art: 'tk_deviljin', c: '#ff4a6a' },
    tkx: { n: '???', c: '#9aa0b8' }
  };

  const SC = D.TK_SCENES = {};
  SC.tk01_rift = { t: 'Разлом', sub: 'Энтропия Реальности', bg: 'void', lines: [
    ['title', 'Коллаба: Железный Кулак', 'Сон, которого не должно было быть'],
    ['n', 'Ночь над Хельмором тяжёлая, как мокрое знамя. Вы закрываете глаза — и мир под веками трескается.'],
    ['h', 'Это не сон. Сон не пахнет озоном и чужой кровью.', 'a'],
    ['tkx', 'Энтропия Реальности любит щели. А в тебе, Король, щелей больше, чем в старом троне.'],
    ['n', 'Чёрный разлом раскрывается, как зрачок. Вас тянет внутрь — не падением, а приглашением, от которого нельзя отказаться.'],
    ['h', 'Если это ловушка — я выйду из неё тем же, кем вошёл. Если нет — тем интереснее.', 'h'],
    ['n', 'Свет вспыхивает. Где была Бездна, теперь — чужое небо, стальной ринг и рёв толпы, которая ещё не знает вашего имени.']
  ]};
  SC.tk02_paul = { t: 'Горящий американец', sub: 'Пол Феникс', bg: 'tk_arena', lines: [
    ['title', 'Первый бой', 'Турнир Короля Железного Кулака'],
    ['n', 'Песок ринга ещё тёплый после чужого нокаута. К вам уже идёт широкий плечистый мужчина в красной кофте, сверкая ухмылкой.'],
    ['paul', 'Хей! Ты новый? Отлично. Я Пол Феникс, и я как раз искал, кого отправиться в нокаут перед полуфиналом!'],
    ['h', 'Я не записывался. Меня записала сама реальность. Но отказать в бое — значит, признать, что я гость.', 'h'],
    ['paul', 'Гость? После моего удара гости обычно считают звёзды. Посмотрим, из какого ты теста!']
  ]};
  SC.tk03_law = { t: 'Додзё на углу', sub: 'Маршалл Ло', bg: 'tk_dojo', lines: [
    ['title', 'Додзё Ло', 'Лапша, честь и удары ногами'],
    ['n', 'После ринга Пол показывает вам «ресторан с характером». Над дверью — иероглифы и запах жареного лука. Внутри — маты, мешки и человек, который двигается легче дыма.'],
    ['law', 'Пол опять притащил странника. Ладно. Я Маршалл Ло. Здесь бьют честно — и кормят тех, кто умеет падать.'],
    ['h', 'Умение падать я освоил ещё в прошлой жизни. А вот ваша здешняя «честь» мне любопытна.', 'h'],
    ['law', 'Тогда на мат. Покажи, что Король из другого мира не путает силу с грубостью.']
  ]};
  SC.tk04_king = { t: 'Маска ягуара', sub: 'Кинг', bg: 'tk_arena', lines: [
    ['title', 'Кольцо', 'Тот, кто бьётся за других'],
    ['n', 'В следующем бою на ринг выходит борец в маске ягуара. Толпа скандирует одно короткое имя.'],
    ['king', '…'],
    ['h', 'Ты не говоришь. Хорошо. Иногда молчание бьёт громче любой клятвы.', 'n'],
    ['n', 'Кинг кланяется — не вам, а детям на верхнем ярусе. И только потом принимает стойку. Этот бой — не ради тщеславия.']
  ]};
  SC.tk05_hwoarang = { t: 'Красный орёл', sub: 'Хворан', bg: 'tk_arena', lines: [
    ['title', 'Удары ветра', 'Хворан'],
    ['hwo', 'Слышал, какой-то «король» проходит сетку, как по своим владениям. Я Хворан. И я не люблю, когда мне портят турнир.'],
    ['h', 'Портить — это когда ломают правила. Я пока только изучаю ваши.', 'h'],
    ['hwo', 'Правило одно: кто лучше бьёт ногой, тот прав. Пошли!']
  ]};
  SC.tk06_nina = { t: 'Контракт', sub: 'Нина Уильямс', bg: 'void', lines: [
    ['title', 'Холодный заказ', 'Нина Уильямс'],
    ['n', 'Ночью в коридоре отеля нет охраны — её уже не нужно. Женщина в обтягивающем костюме выходит из тени так, будто тень сама её родила.'],
    ['nina', 'Нина Уильямс. Меня наняли убрать «демона из разлома». Ничего личного. Просто работа.'],
    ['h', 'Любопытно. В моём мире за такие слова обычно кланяются. Здесь, видимо, стреляют.', 'h'],
    ['nina', 'Иногда и то, и другое. Выбирай: сдаёшься — или я проверяю, сколько в тебе королевской крови.']
  ]};
  SC.tk07_lars = { t: 'Мятежный генерал', sub: 'Ларс Александерссон', bg: 'tk_dojo', lines: [
    ['title', 'Армия, которая не сдалась', 'Ларс'],
    ['n', 'Вас находит не убийца, а солдат. Белые волосы, военная выправка, взгляд человека, который уже предавал семью во имя мира.'],
    ['lars', 'Ларс Александерссон. Я веду тех, кто не хочет, чтобы Ген Дьявола снова решал судьбу этого мира. А ты… резонируешь с ним.'],
    ['h', 'Я Король Демонов. Если ваш «ген» слышит меня, это не значит, что я ему отвечаю.', 'a'],
    ['lars', 'Тогда докажи это в бою. Я не враг гостю — но я не пущу к финалу того, кого может переписать тьма.']
  ]};
  SC.tk08_jun = { t: 'Голос крови', sub: 'Джун Кадзама', bg: 'void', lines: [
    ['title', 'Джун Кадзама', 'Та, что слышит оба мира'],
    ['n', 'В храме на окраине пахнет солью и кедром. Женщина в белом сидит у воды, будто ждала вас с начала времён.'],
    ['jun', 'Я Джун Кадзама. В тебе — королевская тьма другого мира. В моих сыне и… в Кадзуе — Ген Дьявола. Они зовут друг друга.'],
    ['h', 'Значит, я здесь не случайно. Энтропия любит рифмы.', 'n'],
    ['jun', 'Турнир — только сцена. Настоящий бой — за то, кем станет Дзин, и чем станет этот ген. Ты можешь помочь запечатать его. Или взять себе. Или отойти в сторону. Выбор ещё впереди, но он уже дышит вам в затылок.']
  ]};
  SC.tk09_heihachi = { t: 'Эхо патриарха', sub: 'Хэйхати Мисима', bg: 'void', lines: [
    ['title', 'Тот, кого уже нет', 'Эхо Хэйхати'],
    ['n', 'В разломе, который вёл вас сюда, появляется старик — и сразу ясно: это не тело, а упрямство, отказавшееся умереть до конца.'],
    ['hei', 'Ха! Ещё один король. Я Хэйхати Мисима. Меня хоронили чаще, чем некоторых богов. И я всё равно пришёл посмотреть на тебя.'],
    ['h', 'Привидение с характером. В Хельморе таких держат в костнице.', 'h'],
    ['hei', 'Мой сын Кадзуя продал душу силе. Мой внук Дзин пытается её вернуть. А ты стоишь между ними, как третий кулак. Покажи, достоин ли ты вмешиваться в дела Мисима!']
  ]};
  SC.tk10_feud = { t: 'Кровь Мисима', sub: 'Кадзуя и Дзин', bg: 'tk_arena', lines: [
    ['title', 'Два полюса', 'Перед финалом'],
    ['n', 'Финал турнира ещё не объявлен, но ринг уже занят. С одной стороны — Кадзуя Мисима, в глазах которого пляшет чужой зрачок. С другой — Дзин Кадзама, сдерживающий ту же тьму зубами.'],
    ['kaz', 'Интересно. Чужой король, и Ген Дьявола тянется к нему, как к родственнику. Встань ко мне — и мы перепишем оба мира.'],
    ['jin', 'Не слушай его. Я видел, чем кончается эта сила. Помоги мне запечатать её. Хотя бы в этом сне, если наш мир для тебя — только щель.'],
    ['h', 'Вы оба говорите так, будто я уже выбрал. Я ещё посмотрю ваши кулаки — и ваши души.', 'a'],
    ['n', 'Они расходятся, не ударив друг друга. Удар оставляют вам. Выбор — тоже.']
  ]};
  SC.tk11_choice = { t: 'Железный выбор', sub: 'Четыре дороги', bg: 'void', lines: [
    ['title', 'Выбор Короля', 'Он изменит и этот сюжет, и вашу добычу'],
    ['n', 'Разлом снова открывается — тонкий, как лезвие. Джун стоит в стороне и не просит. Она только смотрит.'],
    ['jun', 'Теперь скажи. Не мне — этому миру, который на миг стал твоим.'],
    ['choice', [
      { t: 'Помочь Дзину запечатать Ген Дьявола', f: { tk_side: 'jin', tk_jin: 1 } },
      { t: 'Встать на сторону Кадзуи', f: { tk_side: 'kazuya', tk_kazuya: 1 } },
      { t: 'Взять силу Дьявола себе', f: { tk_side: 'self', tk_self: 1 } },
      { t: 'Остаться в стороне — я гость, не судья', f: { tk_side: 'neutral', tk_neutral: 1 } }
    ]],
    ['n', 'Слово сказано. Турнир слышит его раньше, чем комментаторы. Финал уже не будет прежним.']
  ]};
  SC.tk12_final = { t: 'Финал Железного Кулака', sub: 'Последний бой', bg: 'tk_arena', lines: [
    ['title', 'Финал', 'Кулак, который слышит королей'],
    ['n', 'Толпа орёт так, будто от этого боя зависит не кубок — а погода в их душах. На ринг выходит тот, кого выбрали ваши слова.'],
    ['if', 'tk_jin', [
      ['jin', 'Спасибо, что встал рядом. Если я не удержу форму — бей не меня. Бей то, что во мне.'],
      ['n', 'Крылья рвут спину Дзина. В ринг ступает Дьявольский Дзин, и ваш кулак должен помочь запечатать его.']
    ]],
    ['if', 'tk_kazuya', [
      ['kaz', 'Хороший выбор. Сломай внука. Потом поговорим о твоём мире — он тоже годится в империю.'],
      ['n', 'Дзин принимает стойку напротив вас. Он не просит пощады. Он просит, чтобы вы хотя бы ударили честно.']
    ]],
    ['if', 'tk_self', [
      ['h', 'Если сила зовёт короля — король не прячется. Я возьму её и решу сам, чем она станет.', 'a'],
      ['n', 'Дьявольский Дзин сходит с разлома, как зеркало. Чтобы взять силу, её нужно сначала победить.']
    ]],
    ['if', 'tk_neutral', [
      ['n', 'Вы не берёте ничью сторону. Тогда финал проводит сам разлом: Дьявольский Дзин как испытание гостя, без права на трон этой истории.']
    ]]
  ]};
  SC.tk13_home = { t: 'Пробуждение', sub: 'Сон Энтропии', bg: 'void', lines: [
    ['title', 'Возвращение', 'Хельмор на месте. Почти.'],
    ['n', 'Ринг тает, как дыхание на стекле. Вы снова в своём лагере. Костёр тот же. Небо то же. Только в ладони — тепло чужого турнира.'],
    ['h', 'Значит, это был сон. Сон, который оставил шрамы, жетоны и имена.', 'n'],
    ['tkx', 'Энтропия Реальности не дарит снов бесплатно. Ты вмешался в чужой сюжет. Он это запомнит. Твой — нет: он ждёт тебя прежним.'],
    ['if', 'tk_jin', [['n', 'В памяти остаётся свет печати: Дзин кивает вам, и Ген Дьявола на миг умолкает. Награда за помощь уже ждёт.']]],
    ['if', 'tk_kazuya', [['n', 'В памяти — усмешка Кадзуи. Он получил свой финал. Вы — свою долю силы и тень сделки, которую не подписывали.']]],
    ['if', 'tk_self', [['n', 'В крови ещё гудит чужой ген. Вы не стали Дзином. Вы остались Королём — просто чуть более голодным.']]],
    ['if', 'tk_neutral', [['n', 'Вы ушли, не переписав их войну. Честность гостя тоже чего-то стоит: жетоны, титул наблюдателя, чистые руки.']]],
    ['n', 'Основная история Хельмора не сдвинулась ни на строчку. Но в инвентаре — вещи, которых в нём быть не должно. Значит, разлом был настоящим. Хотя бы для вас.']
  ]};

  D.TK_CH = [
    { id: 'tk01_rift', n: 'Разлом', fight: null },
    { id: 'tk02_paul', n: 'Горящий американец', fight: 'paul' },
    { id: 'tk03_law', n: 'Додзё на углу', fight: 'law' },
    { id: 'tk04_king', n: 'Маска ягуара', fight: 'king' },
    { id: 'tk05_hwoarang', n: 'Красный орёл', fight: 'hwoarang' },
    { id: 'tk06_nina', n: 'Контракт', fight: 'nina' },
    { id: 'tk07_lars', n: 'Мятежный генерал', fight: 'lars' },
    { id: 'tk08_jun', n: 'Голос крови', fight: 'jun' },
    { id: 'tk09_heihachi', n: 'Эхо патриарха', fight: 'heihachi' },
    { id: 'tk10_feud', n: 'Кровь Мисима', fight: null },
    { id: 'tk11_choice', n: 'Железный выбор', fight: null, choice: 1 },
    { id: 'tk12_final', n: 'Финал Железного Кулака', fight: 'final' },
    { id: 'tk13_home', n: 'Пробуждение', fight: null, ending: 1 }
  ];
  D.TK_CH_MAP = {}; D.TK_CH.forEach((c, i) => { c.i = i; D.TK_CH_MAP[c.id] = c; });

  E.tkSide = (s) => (E.tkEnsure(s).flags.tk_side || null);
  E.tkFinalId = function (s) {
    const side = E.tkSide(s);
    return side === 'kazuya' ? 'jin' : 'deviljin';
  };
  E.tkChapterOpen = function (s, id) {
    const t = E.tkEnsure(s), ch = D.TK_CH_MAP[id]; if (!ch) return false;
    if (t.story.includes(id)) return true;
    if (ch.i === 0) return true;
    const prev = D.TK_CH[ch.i - 1];
    if (!t.story.includes(prev.id)) return false;
    if (prev.choice && !t.flags.tk_side) return false;
    return true;
  };
  E.tkChapterDone = (s, id) => E.tkEnsure(s).story.includes(id);
  E.tkFinishChapter = function (s, id) {
    const t = E.tkEnsure(s); if (t.story.includes(id)) return '';
    if (!E.tkChapterOpen(s, id)) return 'Сначала предыдущая глава';
    const ch = D.TK_CH_MAP[id];
    if (ch.choice && !t.flags.tk_side) return 'Сначала сделайте выбор';
    if (ch.ending) {
      t.ending = t.flags.tk_side || 'neutral';
      E.tkGrantEnding(s, t.ending);
    }
    t.story.push(id); s.rev = (s.rev || 0) + 1; return '';
  };

  // ───── Бои: турнир, сюжет, ежедневные ─────
  E.tkDailyLeft = (s, now) => Math.max(0, D.TK_DAILY - E.tkEnsure(s, now).fights);
  E.tkTokenGain = function (s, n, now) { const t = E.tkEnsure(s, now); t.tokens += Math.max(0, n | 0); s.rev = (s.rev || 0) + 1; return t.tokens; };
  E.tkWhyFight = function (s, now) {
    if (s.run) return 'Сначала завершите вылазку';
    const w = E.tkWhyClosed(now); if (w && /завершена|не началось/.test(w)) return w;
    return '';
  };
  E.tkBattle = function (s, kind, fid, now) {
    const err = E.tkWhyFight(s, now); if (err) return { err };
    const t = E.tkEnsure(s, now);
    let foeId = fid, tokens = 8, mark = null;
    if (kind === 'tour') {
      const next = D.TK_FIGHTERS[t.stage]; if (!next) return { err: 'Турнир пройден' };
      if (fid && fid !== next.id) return { err: 'Сначала предыдущий этап' };
      foeId = next.id; tokens = 20 + 10 * next.i; mark = 'tour';
    } else if (kind === 'story') {
      const ch = D.TK_CH_MAP[fid]; if (!ch || !ch.fight) return { err: 'В этой главе нет боя' };
      if (!E.tkChapterOpen(s, ch.id)) return { err: 'Глава ещё закрыта' };
      if (t.story.includes(ch.id)) return { err: 'Глава уже пройдена' };
      foeId = ch.fight === 'final' ? E.tkFinalId(s) : ch.fight; tokens = 15; mark = ch.id;
    } else if (kind === 'daily') {
      if (!fid || !D.TK_FIGHTER[fid]) return { err: 'Нет такого бойца' };
      const need = D.TK_FIGHTER[fid].i;
      if (t.best <= need && t.stage <= need) return { err: 'Сначала победите в турнире' };
      if (E.tkDailyLeft(s, now) <= 0) return { err: 'На сегодня попытки кончились' };
      t.fights++; tokens = 8; mark = 'daily';
    } else return { err: 'Неизвестный бой' };
    const P = C.unitFromSlot(s), party = [P];
    (s.party || []).forEach((id) => { if (s.crew[id] && party.length < 4) party.push(C.unitFromCrew(s, id, 1)); });
    const foes = [E.tkFoe(s, foeId)];
    const B = C.create(party, foes, E.rng(((s.rev || 1) * 9176 + D.TK_FIGHTER[foeId].i * 13) >>> 0), { cons: s.cons, cmd: !!s.cmd, noFlee: true });
    B.cons = s.cons; B.tk = { kind, fid: foeId, tokens, mark }; B.noXp = 1; B.noLoot = 1;
    return B;
  };
  E.tkFinish = function (s, B, now) {
    const t = E.tkEnsure(s, now), rep = { result: B.over, tokens: 0 };
    if (B.over !== 'win' || !B.tk) return rep;
    const k = B.tk;
    E.tkTokenGain(s, k.tokens); rep.tokens = k.tokens;
    if (k.mark === 'tour') {
      const f = D.TK_FIGHTER[k.fid];
      if (f && t.stage === f.i) { t.stage = f.i + 1; t.best = Math.max(t.best, t.stage); }
    }
    if (k.mark && D.TK_CH_MAP[k.mark]) E.tkFinishChapter(s, k.mark);
    s.stats = s.stats || {}; s.stats.tkWins = (s.stats.tkWins || 0) + 1;
    return rep;
  };

  // ───── Награды и магазин ─────
  D.BASES.fists = { n: 'Кастеты', slot: 'weapon', wt: 'fists', ic: '👊', p: { atk: 1.25, agi: 0.1 } };
  const _can = E.canUse;
  E.canUse = (h, it) => { const B = D.BASES[it && it.k]; if (B && B.wt === 'fists') return true; return _can(h, it); };
  D.UNIQUE_ITEMS.tk_gloves = {
    id: 'tk_gloves', base: 'fists', r: 5, il: 40, nm: 'Перчатки Железного Кулака',
    img: 'img/tekken/tk_gloves.webp', img128: 'img/tekken/tk_gloves.webp', art: 'img/tekken/tk_gloves.webp',
    lore: 'Ими били чемпионы мира, которого нет на ваших картах. Кожа ещё помнит ринг.',
    st: { atk: 170, str: 24, agi: 22, vit: 16, luk: 14, crit: 12, dmg: 8, dmg_bolt: 18, spd: 6 },
    fx: [], cx: [{ id: 'tk_glove_sk', n: 'Железный кулак', skill: 'tk_glove_hit', d: 'Удар 180% по цели.' }],
    skill: 'tk_glove_hit', up: true, single: 1, event: 'tk'
  };
  D.SKILLS.tk_glove_hit = { id: 'tk_glove_hit', n: 'Железный кулак', ic: '👊', mp: 12, cd: 2, tgt: 'foe', d: 'Удар 180% по цели.', fx: [{ k: 'dmg', s: 'atk', m: 1.8 }], gear: 'tk_gloves' };
  if (D.UNIQUE_IDS && !D.UNIQUE_IDS.includes('tk_gloves')) D.UNIQUE_IDS.push('tk_gloves');

  D.SKILLS.ak_devilgene = { id: 'ak_devilgene', n: 'Пробуждение гена', ic: '😈', mp: 16, cd: 4, tgt: 'foes', d: 'Тьма 110% по всем, вы получаете «Ускорение».', fx: [{ k: 'dmg', s: 'mag', m: 1.1, el: 'dark' }, { k: 'st', id: 'haste', dur: 2, to: 'self' }], cls: 'art', art: 1 };
  const devilArt = { id: 'devil_gene', r: 6, n: 'Ген Дьявола', ic: '😈', foc: 'hyb', lore: 'Осколок силы Мисима, застрявший в щели между мирами. Он шепчет на языке, который Король Демонов понимает слишком хорошо.', pas: [{ n: 'Резонанс крови', m: { dmg_dark: 12, dmg_bolt: 10, spd: 4 }, d: '' }, { n: 'Чужой зрачок', m: { crit: 6, taken: -4 }, d: '' }], sk: ['ak_devilgene'], icon: 'img/tekken/tk_gene.webp', icon128: 'img/tekken/tk_gene.webp', event: 'tk' };
  if (D.ARTIFACTS && !D.ART[devilArt.id]) { D.ARTIFACTS.push(devilArt); D.ART[devilArt.id] = devilArt; D.ART_IDS.push(devilArt.id); }

  D.SKILLS.g_tk_jin = { id: 'g_tk_jin', n: 'Кадозепа', ic: '⚡', mp: 16, cd: 3, tgt: 'foe', d: 'Молния 210%, 30% оглушить.', fx: [{ k: 'dmg', s: 'atk', m: 2.1, el: 'bolt' }, { k: 'st', id: 'stun', p: 0.3, dur: 1 }], cls: 'crew' };
  D.SKILLS.g_tk_nina = { id: 'g_tk_nina', n: 'Тихий приговор', ic: '🗡️', mp: 14, cd: 3, tgt: 'foe', d: 'Удар 200% и «Слабость».', fx: [{ k: 'dmg', s: 'atk', m: 2.0 }, { k: 'st', id: 'weak', p: 1, dur: 2 }], cls: 'crew' };
  D.CREW.tk_jin = { n: 'Дзин Кадзама', t: 'col', arch: 'warrior', art: 'tk_jin', ic: '👊', c: '#ffe0e0', role: 'Гость коллабы', d: 'Чемпион, который пришёл в Свиту из чужого турнира. Держит Ген Дьявола так же крепко, как своё имя.', k: 0.96, loy0: 55, sig: 'g_tk_jin', fav: 'whet', like: ['book', 'trinket'], talk: ['Это не мой мир. Но кулак здесь всё ещё кулак.', 'Если тьма заговорит — ударь первым. Я так и делаю.', 'Спасибо, что не спросил, герой я или чудовище. Сам ещё не решил.'], event: 'tk' };
  D.CREW.tk_nina = { n: 'Нина Уильямс', t: 'col', arch: 'rogue', art: 'tk_nina', ic: '🗡️', c: '#9ab8ff', role: 'Гостья коллабы', d: 'Наёмница, у которой контракт внезапно оказался дольше турнира. Холодная, точная, иногда почти честная.', k: 0.94, loy0: 40, sig: 'g_tk_nina', fav: 'jewel', like: ['wine', 'trinket'], talk: ['Не путай службу со дружбой. Хотя за хороший бой я остаюсь.', 'В этом мире слишком много магии. Мне хватает двух рук.', 'Если прикажешь убить — уточни имя. Я не люблю работать дважды.'], event: 'tk' };
  if (D.CREW_IDS && !D.CREW_IDS.includes('tk_jin')) D.CREW_IDS.push('tk_jin', 'tk_nina');

  D.TITLES.push({ id: 'ironfist', n: 'Король Железного Кулака', ok: (s) => !!(s.tk && (s.tk.ending || (s.tk.shop && s.tk.shop.title))) });
  D.FRAMES.push({ id: 'ironfist', n: 'Железный Кулак', c: '#ff5a3a', ok: (s) => !!(s.tk && (s.tk.ending || (s.tk.shop && s.tk.shop.frame))) });

  D.TK_SHOP = [
    { id: 'pack_s', n: 'Мешок золота', ic: '🪙', cost: 25, once: 0, typ: 'gold', gold: 4000 },
    { id: 'pack_m', n: 'Знаки и пыль', ic: '✨', cost: 40, once: 0, typ: 'mats', mats: { dust: 8, asc_sigil: 1 } },
    { id: 'title', n: 'Титул «Король Железного Кулака»', ic: '🎖️', cost: 80, once: 1, typ: 'title' },
    { id: 'frame', n: 'Рамка «Железный Кулак»', ic: '🖼️', cost: 80, once: 1, typ: 'frame' },
    { id: 'bolt', n: 'Навык «Электрический Удар Мисимы»', ic: '⚡', cost: 150, once: 1, typ: 'bolt' },
    { id: 'gloves', n: 'Перчатки Железного Кулака', ic: '👊', cost: 200, once: 1, typ: 'gloves' },
    { id: 'gene', n: 'Артефакт «Ген Дьявола»', ic: '😈', cost: 280, once: 1, typ: 'art' },
    { id: 'rec_jin', n: 'Пригласить Дзина в Свиту', ic: '👊', cost: 240, once: 1, typ: 'rec', rec: 'tk_jin', need: (s) => E.tkEnsure(s).stage >= 8 || E.tkChapterDone(s, 'tk10_feud') },
    { id: 'rec_nina', n: 'Пригласить Нину в Свиту', ic: '🗡️', cost: 220, once: 1, typ: 'rec', rec: 'tk_nina', need: (s) => E.tkEnsure(s).stage >= 4 || E.tkChapterDone(s, 'tk06_nina') }
  ];
  D.TK_SHOP_MAP = {}; D.TK_SHOP.forEach((x) => { D.TK_SHOP_MAP[x.id] = x; });

  E.tkShopWhy = function (s, id, now) {
    const w = E.tkWhyClosed(now); if (w) return w;
    const it = D.TK_SHOP_MAP[id]; if (!it) return 'Нет такой позиции';
    const t = E.tkEnsure(s, now);
    if (it.once && t.shop[id]) return 'Уже получено';
    if (it.need && !it.need(s)) return 'Сначала продвиньтесь по турниру или сюжету';
    if ((t.tokens | 0) < it.cost) return 'Не хватает жетонов';
    if (it.typ === 'gloves' && E.ownsUnique && E.ownsUnique(s, 'tk_gloves')) return 'Перчатки уже у вас';
    if (it.typ === 'art' && s.arts && s.arts.devil_gene != null) return 'Артефакт уже у вас';
    if (it.typ === 'rec' && s.crew[it.rec]) return 'Уже в Свите';
    return '';
  };
  E.tkShopBuy = function (s, id, now) {
    const why = E.tkShopWhy(s, id, now); if (why) return why;
    const it = D.TK_SHOP_MAP[id], t = E.tkEnsure(s, now);
    t.tokens -= it.cost;
    if (it.once) t.shop[id] = 1;
    if (it.typ === 'gold') s.gold += it.gold;
    if (it.typ === 'mats') { for (const m in it.mats) E.addMat(s, m, it.mats[m]); }
    if (it.typ === 'title') { /* unlock via ok(); auto-equip optional */ E.setTitle(s, 'ironfist'); }
    if (it.typ === 'frame') E.setFrame(s, 'ironfist');
    if (it.typ === 'bolt') t.bolt = 1;
    if (it.typ === 'gloves') { const item = E.makeUnique('tk_gloves'); if (item) E.addItem(s, item); }
    if (it.typ === 'art') E.artGain(s, 'devil_gene');
    if (it.typ === 'rec') { E.recruit(s, it.rec); if (!t.rec.includes(it.rec)) t.rec.push(it.rec); }
    s.rev = (s.rev || 0) + 1; return '';
  };

  E.tkGrantEnding = function (s, ending) {
    const t = E.tkEnsure(s);
    if (t.shop.ending) return;
    t.shop.ending = 1; t.shop.title = 1;
    const add = ending === 'neutral' ? 80 : ending === 'jin' ? 120 : ending === 'kazuya' ? 100 : 140;
    E.tkTokenGain(s, add);
    if (ending === 'self' && !(s.arts && s.arts.devil_gene != null)) { E.artGain(s, 'devil_gene'); t.shop.gene = 1; }
    if (ending === 'jin') t.shop.frame = 1;
    if (ending === 'kazuya') t.bolt = 1;
    E.setTitle(s, 'ironfist');
    if (ending === 'jin') E.setFrame(s, 'ironfist');
  };

  // навык Мисимы — только добавление к уже собранному списку
  const _ufs = C.unitFromSlot;
  C.unitFromSlot = function (slot) {
    const u = _ufs(slot);
    if (slot && slot.tk && slot.tk.bolt && D.SKILLS.tk_mishima && u.sk && u.sk.indexOf('tk_mishima') < 0) u.sk = u.sk.concat(['tk_mishima']);
    return u;
  };

  // ───── Слоты и миграция v12 → v13 ─────
  const _ns = E.newSlot;
  E.newSlot = function (o) { const s = _ns(o); E.tkEnsure(s, o && o.now); return s; };
  if (S && S.migrations) {
    S.VERSION = 13;
    S.migrations[12] = function (p) { p.slots = (p.slots || []).map((s) => { if (s) E.tkEnsure(s); return s; }); p.v = 13; return p; };
  }
  if (typeof module !== 'undefined') module.exports = RPG;
})();
