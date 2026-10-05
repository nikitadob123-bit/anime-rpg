/* Характеристики героя: 8 основных, субстаты, стихии. Данные; расчёты — js/stats.js. */
(function () {
  const RPG = globalThis.RPG || (globalThis.RPG = {});
  const D = RPG.D = RPG.D || {};

  // ───── Основные характеристики (ключ spi оставлен для совместимости с сохранениями: теперь это «Воля») ─────
  D.STATS = ['str', 'agi', 'vit', 'int', 'spi', 'wis', 'luk', 'cha'];
  D.STAT_N = { str: 'Сила', agi: 'Ловкость', vit: 'Выносливость', int: 'Интеллект', spi: 'Воля', wis: 'Мудрость', luk: 'Удача', cha: 'Харизма' };
  D.STAT_IC = {
    str: '<svg class="stsvg c-str" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6.5 20.5 3 17l1.4-1.4 2.1 2.1 9.2-9.2-2.1-2.1L15 5l3.5 3.5-1.4 1.4-2.1-2.1-9.2 9.2 2.1 2.1L6.5 20.5zM14 4l2 2 4-4-2-2-4 4zM4 14l2 2-3 3-2-2 3-3z"/></svg>',
    agi: '<svg class="stsvg c-agi" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 12.5 14.5 2l1.4 1.4-2.1 2.1 5.7 5.7-1.4 1.4-5.7-5.7-2.1 2.1L4 12.5zm13.2 1.3 1.4-1.4 3.5 3.5-1.4 1.4-3.5-3.5zM2 20l4-1-3-3-1 4z"/></svg>',
    vit: '<svg class="stsvg c-vit" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 22 3.5 14.2c-2-2.1-2-5.5.2-7.5 2-1.9 5.1-1.7 6.9.4l1.4 1.5 1.4-1.5c1.8-2.1 4.9-2.3 6.9-.4 2.2 2 2.2 5.4.2 7.5L12 22z" opacity=".25"/><path fill="none" stroke="currentColor" stroke-width="1.8" d="M12 20.2 4.7 13.5c-1.5-1.6-1.5-4.1.2-5.6 1.5-1.4 3.8-1.3 5.1.3L12 10l2-1.8c1.3-1.6 3.6-1.7 5.1-.3 1.7 1.5 1.7 4 .2 5.6L12 20.2z"/></svg>',
    int: '<svg class="stsvg c-int" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6 4h12v2H6V4zm1 3h10v1.2c0 1.5.6 2.9 1.6 4L20 14v2H4v-2l1.4-1.8A5.8 5.8 0 0 0 7 8.2V7zm3 11h4v2H10v-2z"/></svg>',
    spi: '<svg class="stsvg c-spi" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2.5 13.8 9H20l-5 3.6 1.9 6.4L12 15.8 7.1 19l1.9-6.4L4 9h6.2L12 2.5z"/></svg>',
    wis: '<svg class="stsvg c-wis" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3c2.2 2.4 3.5 4.6 3.5 7.2 0 2.6-1.2 4.5-3.5 7.3-2.3-2.8-3.5-4.7-3.5-7.3C8.5 7.6 9.8 5.4 12 3zm0 6.2a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6zM7 18.5h10v1.8H7z"/></svg>',
    luk: '<svg class="stsvg c-luk" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 13.2c-1.4 0-2.4-1.2-2.2-2.6.4-2.2 2.2-3.4 2.2-3.4s1.8 1.2 2.2 3.4c.2 1.4-.8 2.6-2.2 2.6zm-4.8.4c-.9-1.1-.8-2.7.3-3.7 1.6-1.4 3.4-.8 3.4-.8s-.2 2-.8 3.5c-.5 1.3-1.9 1.8-2.9 1zm9.6 0c-1-.8-2.4-1.3-2.9-1-.6-1.5-.8-3.5-.8-3.5s1.8-.6 3.4.8c1.1 1 .2 2.6.3 3.7zM9.4 18c-.4-1.4.2-2.9 1.5-3.5 1.9-.9 3.1.6 3.1.6s-1.3 1.5-2.6 2.3c-1.2.7-2.4.6-2 0.6zm5.2 0c.4-1.4-.2-2.9-1.5-3.5-1.9-.9-3.1.6-3.1.6s1.3 1.5 2.6 2.3c1.2.7 2.4.6 2 .6z"/></svg>',
    cha: '<svg class="stsvg c-cha" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 20.4 4.7 13c-2-2.1-2-5.4.2-7.3 2-1.8 5-.1 7.1 1.9 2.1-2 5.1-3.7 7.1-1.9 2.2 1.9 2.2 5.2.2 7.3L12 20.4z"/></svg>'
  };
  D.STAT_D = {
    str: 'Физический урон, броня, пробитие брони',
    agi: 'Скорость, уклонение, меткость, двойной удар',
    vit: 'Здоровье, броня, блок, стойкость',
    int: 'Магический урон, энергия, пробитие магии',
    spi: 'Сопротивление магии и статусам, стойкость, исцеление',
    wis: 'Восстановление энергии, перезарядка, лечение, опыт',
    luk: 'Шанс и урон крита, добыча, двойной удар',
    cha: 'Сила Свиты, золото, инициатива, добыча'
  };
  D.STAT_PER_LEVEL = 5;          // очков характеристик за уровень героя (ручное распределение)

  // ───── Стихии: 9 + физика. Эфир внутри игры = «Пустота (Энтропия)» ─────
  Object.assign(D.ELEMS, {
    earth: { n: 'Земля', ic: '🪨', c: '#b08a5a' }, wind: { n: 'Ветер', ic: '🌪️', c: '#9fe8c8' }, water: { n: 'Вода', ic: '🌊', c: '#4aa8ff' }
  });
  D.ELEMS.arcane = { n: 'Пустота', ic: '🕳️', c: '#d08aff', alias: 'Энтропия' };
  D.ELEM_IDS = ['fire', 'ice', 'bolt', 'earth', 'wind', 'water', 'light', 'dark', 'arcane'];
  // «круг» слабостей: сильное → слабое (множитель к урону сверх сопротивлений)
  D.ELEM_BEATS = { fire: ['ice', 'wind'], ice: ['wind', 'water'], bolt: ['water', 'wind'], earth: ['bolt', 'fire'], wind: ['earth'], water: ['fire', 'earth'], light: ['dark'], dark: ['light'], arcane: [] };

  // ───── Названия модификаторов ─────
  const el = D.ELEM_IDS.concat(['phys']);
  el.forEach((e) => { D['MODN'] && (D.MODN['res_' + e] = 'Сопротивление: ' + (D.ELEMS[e] ? D.ELEMS[e].n : e) + ' %'); });
  Object.assign(D.MODN, {
    acc: 'Меткость %', pen: 'Пробитие брони %', penMag: 'Пробитие сопротивления %', blockCh: 'Шанс блока %', blockPow: 'Сила блока %', dbl: 'Двойной удар %', cdr: 'Снижение перезарядки %',
    castSpd: 'Скорость каста %', manaEff: 'Эффективность энергии %', statRes: 'Сопротивление статусам %', tenac: 'Стойкость %', bossDmg: 'Урон по боссам %', init: 'Инициатива %',
    mpRegenPct: 'Энергия за ход %', lowDmg: 'Урон при HP<30% %', fullDmg: 'Урон при HP>80% %', openDmg: 'Урон в первые 2 хода %', perCrew: 'Урон за союзника %', killRc: 'Ресурс за убийство',
    killMp: 'Энергия за убийство', lowTaken: 'Урон по вам при HP<30% %', debuffDmg: 'Урон по ослабленным %', dmgPerWil: 'Урон за 25 Воли %', dmgPerInt: 'Урон за 25 Интеллекта %', dmgPerStr: 'Урон за 25 Силы %',
    dmgPerLv: 'Урон за 20 уровней %', hpPerLv: 'Здоровье за 20 уровней %', critPerLuk: 'Крит за 25 Удачи', allStat: 'Все характеристики %', expo: 'Опыт %', lootLuck: 'Удача добычи %'
  });
})();
