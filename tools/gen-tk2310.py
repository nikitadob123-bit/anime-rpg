# -*- coding: utf-8 -*-
"""Generate v2.31.0 Tekken story / romance / meetings from the user's script."""
import re, sys, json
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from tkparse import compile_lines, js_str

ROOT = Path('/workspace/anime-rpg')
SRC = Path('/workspace/tekken-script.txt').read_text(encoding='utf-8')

TITLES = {
    '01': ('Разлом', 'Разлом между мирами'),
    '02': ('Девушка у служебного входа', 'Служебный вход'),
    '03': ('Бой при закрытых дверях', 'Тренировочный зал'),
    '04': ('Горячий американец', 'Первый зачётный бой'),
    '05': ('Улица после отбора', 'После отбора'),
    '06': ('Правая нога Хворана', 'Правая нога'),
    '07': ('Контракт сестёр Уильямс', 'Сестры Уильямс'),
    '08': ('Бойцы без флага', 'Фан-зона'),
    '09': ('Футляр Кадзуи', 'Ложа Кадзуи'),
    '10': ('Колизей', 'Финал прерван'),
    '11': ('Дочь Хэйхати', 'У переправы'),
    '12': ('Ночь перед Якусимой', 'Причал'),
    '13': ('Остров в огне', 'Высадка'),
    '14': ('Небо над Якусимой', 'Удар по острову'),
    '15': ('Последний удар', 'Со стороны берега'),
    '16': ('Три исхода', 'После войны'),
    '17': ('Рейна и кровь', 'После пробуждения'),
    '18': ('Одна клятва', 'Ночь на причале'),
    '19': ('Домой', 'Разлом обратно'),
}
META = {
    '01': dict(id='tk01_rift', bg='void'),
    '02': dict(id='tk02_reina', bg='tk_dojo'),
    '03': dict(id='tk03_doors', bg='tk_dojo', fight='jin'),
    '04': dict(id='tk04_paul', bg='tk_arena', fight='paul'),
    '05': dict(id='tk05_street', bg='tk_dojo'),
    '06': dict(id='tk06_hwoarang', bg='tk_dojo', fight='hwoarang'),
    '07': dict(id='tk07_sisters', bg='tk_dojo', fight='guard2'),
    '08': dict(id='tk08_flagless', bg='tk_arena'),
    '09': dict(id='tk09_case', bg='tk_dojo'),
    '10': dict(id='tk10_coliseum', bg='tk_arena', fight='route'),
    '11': dict(id='tk11_daughter', bg='tk_dojo'),
    '12': dict(id='tk12_night', bg='tk_dojo'),
    '13': dict(id='tk13_island', bg='tk_arena', fight='route'),
    '14': dict(id='tk14_sky', bg='tk_arena'),
    '15': dict(id='tk15_last', bg='tk_arena'),
    '16': dict(id='tk16_outcome', bg='tk_dojo', ending=1),
    '17': dict(id='tk17_blood', bg='tk_dojo', blood=1),
    '18': dict(id='tk18_vow', bg='tk_dojo', vow=1),
    '19': dict(id='tk19_home', bg='void'),
}
CHOICE_FLAGS = {
    '02': {'Пусть идёт рядом': {'tk_reina': 1}, 'Дальше я сам': {'tk_reina_no': 1}},
    '03': {'Дать Дзину слово': {'tk_side': 'jin', 'tk_jin': 1}, 'Оставить ответ открытым': {}},
    '07': {'Прикрыть Анну': {'tk_cover': 'anna'}, 'Прикрыть Нину': {'tk_cover': 'nina'}, 'Справиться самому': {'tk_cover': 'self'}},
    '08': {'Проводить Зафину до Клаудио': {'tk_zaf_escort': 1}, 'Дать Зафине уйти самой': {'tk_zaf_escort': 0}},
    '09': {'Договориться с Кадзуей': {'tk_side': 'kazuya', 'tk_kazuya': 1}, 'Остаться в стороне': {'tk_neutral': 1, 'tk_side': 'neutral'}},
    '11': {'Уважить её решение': {'tk_reina_respect': 1}, 'Спросить, что будет после': {'tk_reina_after': 1}},
    '13': {
        'Ударить по свободному участку': {'tk_isle': 'strike'},
        'Отправить Алису на обход': {'tk_isle': 'flank'},
        'Прикрыть носилки собой': {'tk_isle': 'cover'},
        'Освободить пирс': {'tk_pier': 'free'},
        'Отвести машину к воде': {'tk_pier': 'water'},
    },
    '14': {'Проводить его до спуска': {'tk_kaz_escort': 1}, 'Уйти сразу': {'tk_kaz_escort': 0}},
    '17': {
        'Принять Рейну в свиту и дать кровь': {'tk_reina_join': 1, 'tk_blood': 1},
        'Принять Рейну в свиту, пока без крови': {'tk_reina_join': 1, 'tk_blood': 0},
        'Отпустить Рейну': {'tk_reina_join': 0},
    },
}

HEADS = [
    (re.compile(r'^ДЗИН\s*$'), 'jin'),
    (re.compile(r'^КАДЗУЯ\s*$'), 'kazuya'),
    (re.compile(r'^НАБЛЮДАТЕЛЬ\s*$'), 'neutral'),
    (re.compile(r'^А\.\s*ДЗИН'), 'jin'),
    (re.compile(r'^Б\.\s*НАБЛЮДАТЕЛЬ'), 'neutral'),
    (re.compile(r'^В\.\s*КАДЗУЯ'), 'kazuya'),
    (re.compile(r'^\[Дзин\.\]\s*$'), 'jin'),
    (re.compile(r'^\[Кадзуя\.\]\s*$'), 'kazuya'),
    (re.compile(r'^\[Наблюдатель\.\]\s*$'), 'neutral'),
    (re.compile(r'^\[Общая сцена'), 'after'),
    (re.compile(r'^\[По окончании сцены общее'), 'after'),
    (re.compile(r'^\[Если Рейна принята'), 'if_reina'),
    (re.compile(r'^\[Если принята Рейна'), 'if_reina'),
    (re.compile(r'^\[Если Рейну не приняли'), 'if_noreina'),
    (re.compile(r'^\[Если Рейну отклонили'), 'if_noreina'),
    (re.compile(r'^\[Если обещана помощь Дзину'), 'if_jin'),
    (re.compile(r'^\[Если слово свободно'), 'if_free'),
    (re.compile(r'^\[Если маршрут Кадзуи'), 'if_kaz'),
    (re.compile(r'^\[Если доступен Дзин'), 'if_crew_jin'),
    (re.compile(r'^\[Если доступна Нина'), 'if_crew_nina'),
    (re.compile(r'^\[Если доступна Рейна'), 'if_crew_reina'),
    (re.compile(r'^\[Если есть Сфера'), 'if_sphere'),
    (re.compile(r'^\[Если игрок выбирает уйти без романа'), 'if_leave'),
    (re.compile(r'^\[Если выбран роман'), 'skip'),
    (re.compile(r'^\[Игрок выбирает финальную'), 'skip'),
    (re.compile(r'^\[Выбранный собеседник из дружеских'), 'skip'),
    (re.compile(r'^\[Показываются только приглашения'), None),  # treat as skip if starts? handled below
]

# extract leftover prose from a condition remak (after first sentence)
def remak_prose(st):
    inner = st.strip()
    if inner.startswith('[') and inner.endswith(']'):
        inner = inner[1:-1]
    # drop leading "Если ...," instruction sentence
    m = re.match(r'Если[^.]+\.\s*(.*)$', inner, re.S)
    if m and m.group(1).strip():
        return m.group(1).strip()
    return ''

def split_sections(text):
    blocks = [('main', [])]
    for line in text.splitlines():
        st = line.strip()
        kind = None
        for pat, k in HEADS:
            if pat.search(st):
                kind = k
                break
        if kind == 'skip':
            continue
        if kind:
            prose = remak_prose(st) if st.startswith('[') else ''
            blocks.append((kind, []))
            if prose:
                # keep as narration
                blocks[-1][1].append('[' + prose + ']')
            continue
        blocks[-1][1].append(line)
    # drop empty
    return [(k, '\n'.join(b).strip('\n')) for k,b in blocks if any(x.strip() for x in b) or k=='main']

def preprocess(num, text):
    if num == '08' and not re.search(r'^ВЫБОР «Проводить Зафину', text, re.M):
        text = text.replace(
            '[ВЫБОР «Проводить Зафину до Клаудио» открывает короткий бой против группы охраны. ВЫБОР «Дать Зафине уйти самой» переводит к финальной реплике сразу.]',
            'ВЫБОР «Проводить Зафину до Клаудио»\n'
            'К: Пойдём. Если хочешь сказать, чем я рискую, по дороге хватит времени.\n'
            'Зафина: По дороге лучше слушать, где шаги.\n'
            '[Короткий бой против группы охраны.]\n'
            'Клаудио: Ждали тебя с другой стороны.\n'
            'Зафина: С той стороны меня ждали больше.\n'
            'ВЫБОР «Дать Зафине уйти самой»\n'
            'К: Тогда иди, пока всё внимание на арене.\n'
            'Зафина: Я зайду через тех, кто ещё умеет смотреть себе под ноги.\n'
        )
    if num == '07' and not re.search(r'^ВЫБОР «Прикрыть Анну»', text, re.M):
        text = text.replace(
            '[На шум выходят двое охранников посредника. Парный бой вместе с любой сестрой или самостоятельно. После него Анна забирает список людей, Нина получает карту. Это местная стычка, флаг войны не меняется.]',
            'ВЫБОР «Прикрыть Анну»\n'
            'Анна: Конверт мне. Шум тебе.\n'
            'К: Могла бы предложить наоборот.\n'
            'Анна: Могла бы, но ты уже встал.\n'
            'ВЫБОР «Прикрыть Нину»\n'
            'Нина: Держи справа. Не дай им задеть посредника.\n'
            'К: Он с вами?\n'
            'Нина: Он мне ещё должен ответ.\n'
            'ВЫБОР «Справиться самому»\n'
            'К: Обе отойдите от лифта.\n'
            'Анна: Слышала? Он нас не различает.\n'
            'Нина: Он хочет, чтобы ты наконец отошла.\n'
            '<<END_CHOICE>>\n'
            '[Парный бой вместе с любой сестрой или самостоятельно. После него Анна забирает список людей, Нина получает карту. Это местная стычка, флаг войны не меняется.]\n'
        )
    if num == '13' and not re.search(r'^ВЫБОР «Ударить по свободному участку»', text, re.M):
        text = text.replace(
            '[Оборона у святилища. На второй волне идут «Джеки», смешавшиеся с отступающими. Игрок может ударить по свободному участку, отправить Алису на обход или телом принять удар, пока пройдут носилки.]',
            '[На второй волне идут «Джеки», смешавшиеся с отступающими.]\n'
            'ВЫБОР «Ударить по свободному участку»\n'
            'К: Пригнись, когда отдам сигнал.\n'
            'Алиса: Ожидаю сигнал.\n'
            'К: Уже.\n'
            '[Удар огибает носилки. Алиса сводит ворота.]\n'
            'ВЫБОР «Отправить Алису на обход»\n'
            'К: Уведи правую машину взглядом на себя. Люди выйдут, пока она разворачивается.\n'
            'Алиса: На мою сторону теперь смотрят обе. Проход открыт.\n'
            'ВЫБОР «Прикрыть носилки собой»\n'
            'Медик: Вы не успеете отойти.\n'
            'К: Зачем мне отходить? Вы идите.\n'
            '<<END_CHOICE>>\n'
            '[Бой у святилища.]\n'
        )
        text = text.replace(
            '[Одна машина не реагирует на приказ. Бой с тяжёлым «Джеком». После победы К выбрасывает его в воду. Отряды выходят с разных концов причала.]',
            'ВЫБОР «Освободить пирс»\n'
            'К: Сойдите с дерева. Оно трещит.\n'
            'ВЫБОР «Отвести машину к воде»\n'
            'К: Ударь сюда. Сюда! Вот теперь развернись.\n'
            '<<END_CHOICE>>\n'
            '[Бой с тяжёлым «Джеком». После победы К выбрасывает его в воду. Отряды выходят с разных концов причала.]\n'
            'Солдат Yggdrasil: Он с другой стороны.\n'
            'К: Встань на сушу и скажи это человеку, который будет поднимать твою лодку.\n'
        )
    if num == '13':
        text = text.replace(
            '[Север. Ларс бросает отряд наперерез. Бой с Ларсом и подкреплением. Победа — убрать командиров с дороги, оставив коридор для отхода.]',
            '[Север. Ларс бросает отряд наперерез.]\n[Бой с Ларсом и подкреплением.]'
        )
    if num == '11':
        if not text.strip().startswith('[Если Рейна принята'):
            text = '[Если Рейна принята, она ждёт у переправы.]\n' + text

    if num == '12':
        text = text.replace(
            '[Король смотрит на простреливаемый пролив. Игрок может поговорить с членами лагеря и выбрать сторону переправы.]',
            '[Король смотрит на простреливаемый пролив.]'
        )
    if num == '19':
        text = text.replace(
            '[Если есть Сфера.]\n[К закрывает футляр. Отблеск войны исчезает. Печать перестаёт пульсировать.]\n[К перешагивает порог. Капля падает. Лагерная музыка возвращается ровно с той ноты, на которой оборвалась. Конец кампании.]',
            '[Если есть Сфера.]\n[К закрывает футляр. Отблеск войны исчезает. Печать перестаёт пульсировать.]\n[Общая сцена.]\n[К перешагивает порог. Капля падает. Лагерная музыка возвращается ровно с той ноты, на которой оборвалась. Конец кампании.]'
        )
    if num == '18':
        # keep only the opening spoken line; vow UI handles the rest
        text = (
            '[Ночь, причал. Снаружи слышны шаги тех, кто готовится уйти.]\n'
            'К: Разлом открою под утро. До этого хочу договорить начатое.\n'
        )
    return text

def emit_lines(arr, indent=4):
    pad = ' ' * indent
    if not arr:
        return pad + '// empty'
    return ',\n'.join(pad + x for x in arr)

def wrap_if(flag, arr, indent=4):
    inner = emit_lines(arr, indent + 2)
    return "%s['if', %s, [\n%s\n%s]]" % (' ' * indent, js_str(flag), inner, ' ' * indent)

# ---- load chapters ----
body = re.search(r'II\. ГЛАВЫ 01–19\n\n(.*)\n\nIII\. ЛИЧНЫЕ', SRC, re.S).group(1)
parts = re.split(r'\n(?=\d{2}\. )', '\n' + body)
chs = []
for p in parts:
    p = p.strip()
    if not p: continue
    m = re.match(r'(\d{2})\. ([^\n]+)\n([\s\S]*)', p)
    chs.append((m.group(1), m.group(3)))

out = []
out.append("/* v2.31.0 Сюжет коллабы по авторскому сценарию «По ту сторону Железного Кулака». */")
out.append("(function () {")
out.append("  const RPG = globalThis.RPG, D = RPG.D, E = RPG.E;")
out.append("  const SC = D.TK_SCENES = {};")
out.append("  const H = (t, m) => ['h', t, m || 'n'];")
out.append("  const N = (t) => ['n', t];")
out.append("""
  E.tkSide = function (s, lock) {
    const t = E.tkEnsure(s);
    const f = t.flags || {};
    if (f.tk_jin || f.tk_side === 'jin') { f.tk_jin = 1; f.tk_side = 'jin'; return 'jin'; }
    if (f.tk_kazuya || f.tk_side === 'kazuya') { f.tk_kazuya = 1; f.tk_side = 'kazuya'; return 'kazuya'; }
    if (lock || f.tk_neutral || f.tk_side === 'neutral' || f.tk_side === 'self') {
      if (!f.tk_jin && !f.tk_kazuya) { f.tk_side = 'neutral'; f.tk_neutral = 1; }
      return 'neutral';
    }
    return f.tk_side || '';
  };
""")

IF_FLAGS = {
    'if_reina': 'tk_reina',
    'if_noreina': '!tk_reina',
    'if_jin': 'tk_jin',
    'if_free': '!tk_jin',
    'if_kaz': 'tk_kazuya',
    'if_crew_jin': 'tk_has_jin',
    'if_crew_nina': 'tk_has_nina',
    'if_crew_reina': 'tk_has_reina',
    'if_sphere': 'tk_sphere',
    'jin': 'tk_jin',
    'kazuya': 'tk_kazuya',
    'neutral': 'tk_neutral',
}

for num, text in chs:
    meta = META[num]
    title, sub = TITLES[num]
    cid, bg = meta['id'], meta['bg']
    text = preprocess(num, text)
    sections = split_sections(text)
    flags = CHOICE_FLAGS.get(num)
    compiled = []
    compiled.append("['title', %s, %s]" % (js_str(title), js_str(sub)))
    for kind, block in sections:
        lines = compile_lines(block, flags)
        if not lines and kind != 'main':
            continue
        if kind in ('main', 'after'):
            compiled.extend(lines)
        elif kind in IF_FLAGS:
            compiled.append("['if', %s, [\n%s\n    ]]" % (js_str(IF_FLAGS[kind]), emit_lines(lines, 6)))
        else:
            compiled.extend(lines)
    extra = []
    if meta.get('fight') and meta['fight'] != 'route':
        extra.append('fight: %s' % js_str(meta['fight']))
    if meta.get('fight') == 'route':
        extra.append("fight: 'route'")
    if meta.get('ending'): extra.append('ending: 1')
    if meta.get('blood'): extra.append('blood: 1')
    if meta.get('vow'): extra.append('vow: 1')
    ex = (', ' + ', '.join(extra)) if extra else ''
    out.append("  SC.%s = { t: %s, sub: %s, bg: %s%s, lines: [" % (cid, js_str(title), js_str(sub), js_str(bg), ex))
    out.append(emit_lines(compiled, 4))
    out.append("  ]};")
    out.append("")

out.append("  D.TK_CH = [")
for num in [f'{i:02d}' for i in range(1,20)]:
    meta = META[num]
    fields = ["id: %s" % js_str(meta['id']), 'need: 0']
    if meta.get('fight') and meta['fight'] != 'route':
        fields.append('fight: %s' % js_str(meta['fight']))
    if meta.get('fight') == 'route':
        fields.append("fight: 'route'")
    if meta.get('ending'): fields.append('ending: 1')
    if meta.get('blood'): fields.append('blood: 1')
    if meta.get('vow'): fields.append('vow: 1')
    out.append("    { %s }," % ', '.join(fields))
out.append("  ];")

out.append("""
  E.tkVisibleChapters = function (s) {
    E.tkEnsure(s);
    return D.TK_CH.slice();
  };

  D.TK_CH.forEach((c, i) => {
    const sc = D.TK_SCENES[c.id] || {};
    c.n = c.n || sc.t;
    c.i = i;
  });
  D.TK_CH_MAP = {};
  D.TK_CH.forEach((c) => { D.TK_CH_MAP[c.id] = c; });

  E.tkChapterOpen = function (s, id) {
    const t = E.tkEnsure(s);
    if (t.story.includes(id)) return true;
    const vis = E.tkVisibleChapters(s);
    const i = vis.findIndex((c) => c.id === id);
    if (i < 0) return false;
    if (i === 0) return true;
    const prev = vis[i - 1];
    if (prev && !t.story.includes(prev.id)) return false;
    return true;
  };

  E.tkFinishChapter = function (s, id) {
    const t = E.tkEnsure(s); if (t.story.includes(id)) return '';
    if (!E.tkChapterOpen(s, id)) return 'Сначала предыдущая глава';
    const ch = D.TK_CH_MAP[id]; if (!ch) return 'Нет такой главы';
    if (ch.vow && !t.vowDone) return 'Сначала сделайте выбор';
    if (id === 'tk10_coliseum') {
      E.tkSide(s, true);
      E.tkSyncFlags && E.tkSyncFlags(s);
    }
    if (id === 'tk16_outcome') {
      t.mig230 = 1;
      const side = E.tkSide(s, true);
      if (!t.ending || t.ending === 'self') t.ending = side;
      else t.ending = t.ending; // keep historical title key if already set
      if (!t.ending) t.ending = side;
      if (t.ending === 'self') t.ending = side;
      t.flags.tk_side = side;
      if (side === 'jin') { t.flags.tk_has_jin = 1; E.tkGrantComp(s, 'tk_jin'); }
      if (side === 'neutral') { t.flags.tk_has_nina = 1; E.tkGrantComp(s, 'tk_nina'); }
      if (side === 'kazuya') E.tkGrantSphere && E.tkGrantSphere(s);
      E.tkGrantEnding(s, t.ending === 'self' ? 'neutral' : t.ending);
    }
    if (id === 'tk17_blood') {
      if (t.flags.tk_reina_join) { t.flags.tk_has_reina = 1; E.tkGrantComp(s, 'tk_reina'); }
      if (t.flags.tk_blood) E.tkGiveBlood(s, 1);
    }
    t.story.push(id); s.rev = (s.rev || 0) + 1; return '';
  };

  E.tkSceneLines = function (s, sc) {
    const lines = (sc && sc.lines) || [];
    if (s) {
      const t = E.tkEnsure(s);
      if (t.rec && t.rec.includes('tk_jin')) t.flags.tk_has_jin = 1;
      if (t.rec && t.rec.includes('tk_nina')) t.flags.tk_has_nina = 1;
      if (t.rec && t.rec.includes('tk_reina')) t.flags.tk_has_reina = 1;
      if (t.sphere || t.flags.tk_sphere) t.flags.tk_sphere = 1;
      E.tkSyncFlags && E.tkSyncFlags(s);
    }
    return lines;
  };

  E.tkSyncFlags = function (s) {
    const t = E.tkEnsure(s);
    s.story = s.story || { flags: {}, done: [] };
    s.story.flags = s.story.flags || {};
    Object.assign(s.story.flags, t.flags);
  };

  E.tkFightFor = function (s, ch) {
    if (!ch) return null;
    if (ch.id === 'tk08_flagless') {
      const t = E.tkEnsure(s);
      return t.flags.tk_zaf_escort ? 'guard2' : null;
    }
    if (ch.fight && ch.fight !== 'route') return ch.fight;
    if (ch.fight !== 'route') return null;
    const side = E.tkSide(s);
    if (ch.id === 'tk10_coliseum') {
      if (side === 'jin') return ['jackmob', 'jackmob', 'jackmob'];
      if (side === 'kazuya') return 'victor';
      return ['jackmob', 'jackmob'];
    }
    if (ch.id === 'tk13_island') {
      if (side === 'jin') return ['jackmob', 'jackmob'];
      if (side === 'kazuya') return 'lars';
      return 'jackmob';
    }
    return null;
  };

  if (typeof module !== 'undefined') module.exports = RPG;
})();
""")

path = ROOT / 'js/tekken-story.js'
path.write_text('\n'.join(out), encoding='utf-8')
print('story', path.stat().st_size)
