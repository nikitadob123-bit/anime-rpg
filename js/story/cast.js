/* Сюжет на 300 глав: реестр говорящих, фонов и эффектов, которые понимают VN-плеер и линтер.
   Новый персонаж: RPG.story.speaker('id', { n: 'Имя', c: '#цвет', art?: 'id портрета' }). Без art — реплика показывается без спрайта (как «Проповедник»).
   Новый фон: RPG.story.bg('id', ['#верх', '#середина', '#низ'], 'r,g,b'). Фоны из vn.css (camp, ruins…) уже существуют. */
(function () {
  const RPG = globalThis.RPG || (globalThis.RPG = {});
  const D = RPG.D = RPG.D || {};
  const ST = RPG.story = RPG.story || {};
  D.SPEAKERS = D.SPEAKERS || {};
  const RESERVED = ['bg', 'cg', 'fx', 'title', 'hide', 'set', 'give', 'rec', 'loy', 'aff', 'date', 'if', 'choice'];

  ST.MOODS = ['n', 'h', 'a', 's', 'd', 'm'];                               // нейтрально, радость/ухмылка, гнев, смущение, печаль, облик Короля
  ST.FX = ['stars', 'embers', 'fireflies', 'snow', 'silence', 'flash', 'entropy', 'halo', 'shake'];
  ST.CGS = ['halo_city', 'demon_king'];                                    // CG, которые лежат в assets/vn
  ST.DIRECTIVES = RESERVED;

  ST.speaker = function (id, def) {
    if (RESERVED.includes(id)) throw new Error('Имя говорящего занято служебной командой: ' + id);
    D.SPEAKERS[id] = Object.assign({ n: id, c: '#c8c8e0' }, def); return D.SPEAKERS[id];
  };
  // Новые персонажи без портретов (портрет можно подключить позже через art)
  [['clerk', 'Писец Порога', '#ffe9a0'], ['warden', 'Привратник', '#ffd35a'], ['regent', 'Регент Олдрик', '#f0e0c0'], ['choir', 'Хор', '#fff0c8'],
    ['voice', 'Голос', '#d8e6ff'], ['echo', 'Эхо Короля', '#a89aff'], ['crowd', 'Толпа', '#b8bcc8']].forEach(([id, n, c]) => { if (!D.SPEAKERS[id]) ST.speaker(id, { n, c }); });

  // Действующие лица арок 2–30 (портретов пока нет — реплики показываются без спрайта; когда появится арт, добавьте art: 'id')
  [['sist', 'Сестра-Утешительница', '#bfe8c8'], ['ranie', 'Раниэль', '#c8f0d8'], ['renel', 'Ренелла Железная', '#ff9a6a'], ['kaeli', 'Каэлиэль', '#ff8a5a'], ['darni', 'Дарниэль', '#d8d8f0'],
    ['mort', 'Мортимер', '#c8c0b0'], ['evri', 'Эвриэль', '#e8b0ff'], ['aure', 'Аурелий', '#fff0a0'], ['octav', 'Октавиан Грей', '#ffe0a0'], ['safi', 'Сафира', '#ffd080'],
    ['hash', 'Хаш-Намур', '#f0b060'], ['nere', 'Нерейя', '#8ae0e8'], ['torv', 'Торвальд', '#9ab8e0'], ['levi', 'Мать Глубин', '#6ac0e8'], ['helg', 'Хельдгрим', '#d89a5a'],
    ['seraf', 'Серафима', '#e8a0b0'], ['malf', 'Мальфеон', '#d84a7a'], ['azura', 'Азура', '#ff6aa0'], ['eukl', 'Эвклид', '#c0c8e8'], ['nol', 'Ноль', '#a0a0b0'],
    ['khan', 'Хан Багровый Клык', '#ff7a50'], ['aelin', 'Аэлин', '#a0e8d0'], ['rootf', 'Корень-Отец', '#80c890'], ['veil', 'Мадам Вуаль', '#d8a0c8'], ['lucid', 'Люцидус', '#c0f0d0'],
    ['agata', 'Агата Златоокая', '#ffe070'], ['eydran', 'Эйдран Вейл', '#b8b0d8'], ['igna', 'Игнац', '#f0d878'], ['pontif', 'Понтифик Аврелиан', '#fff0b0'], ['ferry', 'Перевозчик', '#a8a0d8'],
    ['valdor', 'Вальдор', '#ff9060'], ['tarn', 'Тарн', '#d0d0e8'], ['issel', 'Иссель', '#e0a0f0'], ['miara', 'Миара', '#b8f0c0'], ['colos', 'Колосс Хор', '#ffd860'],
    ['zero', 'Нулевой Король', '#9a8ad8']].forEach(([id, n, c]) => { if (!D.SPEAKERS[id]) ST.speaker(id, { n, c }); });

  // ───── Фоны ─────
  const NATIVE = ['courtyard', 'street_fest', 'void', 'void_dusk', 'camp', 'ruins', 'forest', 'mines', 'swamp', 'spire', 'cathedral', 'hub'];
  const BG = ST.BG = {};
  NATIVE.forEach((id) => { BG[id] = { native: true }; });
  ST.bg = function (id, c, rim) { BG[id] = { c, rim: rim || '150,160,255' }; return BG[id]; };
  const B = ST.bg;
  // Арка 1 (Порог)
  B('stairs', ['#0a1030', '#4a6aa8', '#f2e6c0'], '255,236,170'); B('gate_hall', ['#10122a', '#5a5a88', '#f4efe0'], '255,240,200'); B('gallery', ['#0c0a18', '#3a2a4a', '#8a7050'], '200,170,255');
  B('mist_bell', ['#0a0e18', '#2a3a4a', '#8aa0b0'], '170,200,230'); B('cradle_door', ['#04040a', '#2a2040', '#e8d8a8'], '255,224,150');
  // Части I–II: Предел и смертный мир
  B('garden', ['#0a1a14', '#3a7a5a', '#d8f0c8'], '170,255,190'); B('dream', ['#1a1030', '#6a5a9a', '#f0d8e8'], '255,200,235'); B('arsenal', ['#1a0a0a', '#6a2a1a', '#e0a050'], '255,150,80');
  B('battlefield', ['#140808', '#4a2a2a', '#a07050'], '255,130,90'); B('court', ['#0c0a14', '#3a3a5a', '#d8d0b0'], '220,220,255'); B('scales', ['#0a0a14', '#505068', '#e8e8f0'], '230,230,255');
  B('thread', ['#0a0614', '#4a2a6a', '#f0c8e0'], '255,170,230'); B('loom', ['#080410', '#3a1a4a', '#c88ad0'], '230,150,255'); B('road', ['#0e1420', '#3a5a6a', '#d8c890'], '255,230,150');
  B('plains', ['#101828', '#3a6a4a', '#c8d890'], '200,255,160'); B('desert', ['#1a0e08', '#8a5a2a', '#f0d090'], '255,200,120'); B('oasis', ['#081a1a', '#2a7a7a', '#e8d890'], '150,255,230');
  B('harbor', ['#0a1830', '#2a5a8a', '#e0c8a0'], '150,210,255'); B('sea', ['#040a1c', '#1a4a8a', '#7ad0e0'], '120,200,255'); B('reef', ['#04141c', '#1a6a7a', '#c8f0e0'], '120,255,230');
  B('mountain', ['#0e1018', '#3a4258', '#a8b0c0'], '190,200,230'); B('forge', ['#140804', '#7a2a0a', '#ffa040'], '255,150,60'); B('dwarf_hall', ['#0c0a08', '#4a3a2a', '#c8a060'], '255,200,120');
  B('crypt', ['#060810', '#1a2a3a', '#6a8a8a'], '120,220,220'); B('throne_pale', ['#08060e', '#2a2038', '#a898c0'], '200,170,255');
  // Часть III: Бездна
  B('abyss', ['#02020a', '#1a0a2a', '#6a1a3a'], '200,80,140'); B('abyss_city', ['#06020c', '#3a0a3a', '#c0305a'], '255,90,150'); B('library', ['#0a0c14', '#2a2a50', '#c8a860'], '255,220,140');
  B('steppe', ['#181008', '#7a5a2a', '#e8c078'], '255,200,110'); B('war_camp', ['#140c08', '#5a3a22', '#d08a48'], '255,160,80'); B('elf_forest', ['#040e10', '#1a4a40', '#7ad0b0'], '130,255,200');
  B('night_city', ['#06060e', '#2a2a4a', '#e0a860'], '255,190,110');
  // Часть IV: Вера
  B('lab_city', ['#0a1018', '#2a4a5a', '#80e0c0'], '120,255,210'); B('alchemy', ['#100a14', '#4a2a5a', '#e080c0'], '255,130,220'); B('shards', ['#0a0c1e', '#4a4a8a', '#ffe8a0'], '255,236,160');
  B('cult', ['#100808', '#4a2a2a', '#e8c070'], '255,190,100'); B('helmor_echo', ['#0a0a12', '#2a2a38', '#8a8a98'], '180,180,210'); B('sky_city', ['#0a1838', '#5a8ac8', '#fff0d0'], '200,230,255');
  B('belltower', ['#0a0814', '#4a3a2a', '#f0d070'], '255,220,110');
  // Части V–VI: боги, Колыбель
  B('void_bridge', ['#020208', '#1a1a38', '#6a5aa8'], '150,130,255'); B('god_hall', ['#14100a', '#7a6a3a', '#fff4c8'], '255,240,170'); B('inside_ring', ['#1a1004', '#8a6a1a', '#ffe070'], '255,220,90');
  B('kings_hall', ['#08060c', '#2a1a3a', '#a07ab0'], '200,150,255'); B('cradle', ['#060610', '#3a3a6a', '#fff4e0'], '255,244,210'); B('battle_end', ['#100a14', '#5a2a3a', '#ffd090'], '255,180,120');
  B('dawn', ['#14102a', '#8a5a7a', '#ffd8a0'], '255,210,160');
  ST.BG_IDS = () => Object.keys(BG);

  if (typeof module !== 'undefined') module.exports = RPG;
})();
