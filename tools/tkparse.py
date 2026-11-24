# -*- coding: utf-8 -*-
import re, json

SPEAK = {
    'К': 'h', 'Король': 'h',
    'Рейна': 'rei', 'Нина': 'nina', 'Анна': 'ann', 'Дзин': 'jin', 'Кадзуя': 'kaz',
    'Пол': 'paul', 'Ло': 'law', 'Кинг': 'king', 'Хворан': 'hwo', 'Ларс': 'lars',
    'Джун': 'jun', 'Хэйхати': 'hei', 'Асука': 'asu', 'Сяоюй': 'xia', 'Лин Сяоюй': 'xia',
    'Лили': 'lil', 'Алиса': 'ali', 'Лео': 'leo', 'Зафина': 'zaf', 'Асусена': 'azu',
    'Лидия': 'lid', 'Миари': 'mia', 'Кунимицу': 'kun', 'Кунимицу II': 'kun',
    'Виктор': 'vic', 'Лерой': 'ler', 'Стив': 'ste', 'Эдди': 'edd', 'Клаудио': 'cla',
    'Брайан': 'bry', 'Джек-8': 'jac', 'Джек': 'jac', 'Панда': 'pan', 'Кума': 'kum',
    'Ёсимицу': 'yos', 'Шахина': 'sha', 'Шахина': 'sha', 'Шахеен': 'sha', 'Шахин': 'sha',
    'Драгунов': 'dra', 'Сергей Драгунов': 'dra', 'Фэн': 'fen', 'Фэн Вэй': 'fen',
    'Рэйвен': 'rav', 'Ли': 'lee', 'Ли Чаолан': 'lee',
    'Клайв': 'cli', 'Клайв Росфилд': 'cli',
    'Факумрам': 'fah', 'Армор Кинг': 'ark', 'Боб': 'bob', 'Боб Ричардс': 'bob',
    'Роджер-младший': 'rog', 'Роджер': 'rog',
    'Юдзиро': 'yuj', 'Юдзиро Ханма': 'yuj',
    'Азазель': 'aza',
    'Водитель': 'drv', 'Торговец': 'mer', 'Мальчик': 'boy', 'Медик': 'med',
    'Солдат G Corporation': 'sgc', 'Солдат Yggdrasil': 'syg',
    'Боец': 'fgt', 'Распорядитель': 'fgt',
    'Дьявол Дзин': 'djin', 'Дьявольский Дзин': 'djin',
}

def js_str(s):
    return json.dumps(s, ensure_ascii=False)

# «К» in the script is the player's hero. Substitute placeholders; keep preposition «К» (к Якусиме, к вам).
_K_RE = re.compile(r'(?<![A-Za-zА-Яа-яЁё])К(?![A-Za-zА-Яа-яЁё\-])')
_KEEP_NEXT = re.compile(r'^\s+(вам|нас|нему|ней|ним|тебе|себе|мне|нам|Якусиме|Кадзуе|Хельмору)\b')
_GEN_BEFORE = {'у','от','до','из','для','без','кроме','вокруг','возле','около','напротив','с','со'}
_INS_BEFORE = {'перед','над','под','между'}
_DAT_BEFORE = {'протягивает','отдаёт','отдает','даёт','дает','вручает','кладёт','кладет','передаёт','передает','улыбается','говорит','отвечает','кивает','машет','предлагает','предлагая','помогает','подсаживает','оставляет'}
_ACC_BEFORE = {'замечает','берёт','берет','толкает','обхватывает','просит','зовёт','зовет','видит','догоняет','обнимает','встречает','обходит','держит','вытаскивает','выводит','ведёт','ведет','несёт','несет','пускает','хватает','ловит','останавливает','поднимает'}
_PH = {'nom':'{name}','gen':'{name_r}','dat':'{name_d}','acc':'{name_v}','ins':'{name_t}','prep':'{name_p}'}

def _word_before(left):
    left = re.sub(r'[\s«»\"\'\[\]\(\),.;:!?—–\-]+$', '', left.replace('\n',' '))
    m = re.search(r'([А-Яа-яЁёA-Za-z\-]+)$', left)
    return m.group(1).lower() if m else ''

def sub_hero_k(text):
    if not text:
        return text
    def repl(m):
        left, right = text[:m.start()], text[m.end():]
        if _KEEP_NEXT.search(right):
            return m.group(0)
        w = _word_before(left)
        if w in _GEN_BEFORE: kind = 'gen'
        elif w in _INS_BEFORE: kind = 'ins'
        elif w in _DAT_BEFORE: kind = 'dat'
        elif w in _ACC_BEFORE: kind = 'acc'
        else: kind = 'nom'
        return _PH[kind]
    return _K_RE.sub(repl, text)


def compile_lines(block, start_choice_flags=None):
    """Compile a text block into list of JS line expressions (strings)."""
    raw = block.strip('\n').split('\n')
    out = []
    i = 0
    pending_choice = []
    def flush_choice():
        nonlocal pending_choice, out
        if not pending_choice:
            return
        parts = []
        for lab, body, flags in pending_choice:
            inner = compile_lines('\n'.join(body))
            fl = flags or {}
            fls = ', '.join(f"{k}: {js_str(v) if isinstance(v,str) else v}" for k,v in fl.items())
            parts.append("{ t: %s, f: { %s }, r: [\n%s\n        ] }" % (js_str(sub_hero_k(lab)), fls, ',\n'.join('          '+x for x in inner)))
        out.append("['choice', [\n        " + ',\n        '.join(parts) + "\n      ]]")
        pending_choice = []

    def add_narr(t):
        t=t.strip()
        if t.startswith('[') and t.endswith(']'):
            t=t[1:-1]
        t=re.sub(r'^Общее\.\s*', '', t)
        t=re.sub(r'^Общая сцена\.\s*', '', t)
        out.append("N(%s)" % js_str(sub_hero_k(t)))
    def add_spk(who, line):
        key = SPEAK.get(who)
        if not key:
            # unknown speaker: narrate as "Name: text" or new key
            out.append("N(%s)" % js_str(sub_hero_k(who + ': ' + line)))
            return
        mood = 'n'
        if key=='h':
            out.append("H(%s, %s)" % (js_str(sub_hero_k(line)), js_str(mood)))
        else:
            out.append("[%s, %s, %s]" % (js_str(key) if False else ("'" + key + "'"), js_str(sub_hero_k(line)), js_str(mood)))

    while i < len(raw):
        s = raw[i].rstrip()
        if not s.strip():
            i += 1
            continue
        st = s.strip()
        if st.startswith('<<END_CHOICE>>'):
            i += 1
            continue
        if st.startswith('ВЫБОР «') or st.startswith('ВЫБОР "'):
            # start / continue choice group
            m = re.match(r'ВЫБОР [«"](.+?)[»"]', st)
            lab = m.group(1) if m else st
            i += 1
            body = []
            flags = {}
            if start_choice_flags and lab in start_choice_flags:
                flags = dict(start_choice_flags[lab])
            while i < len(raw):
                nx = raw[i].rstrip()
                nxs = nx.strip()
                if not nxs:
                    i += 1
                    continue
                if nxs.startswith('ВЫБОР «') or nxs.startswith('ВЫБОР "'):
                    break
                # stop choice body if a clearly new top-level section starts
                if nxs.startswith('<<END_CHOICE>>'):
                    break
                if re.match(r'^(\d+\.|ДЗИН|КАДЗУЯ|НАБЛЮДАТЕЛЬ|А\. |Б\. |В\. |СЕРДЦЕ |БОЕЦ |Финал |Сближение |Встреча |Дружеский |\[Если Рейну не|\[Если Рейну отклонили|\[Общ)', nxs):
                    break
                body.append(nx)
                i += 1
            pending_choice.append((lab, body, flags))
            # if next is not another ВЫБОР, flush
            # lookahead
            j=i
            while j < len(raw) and not raw[j].strip():
                j += 1
            if j>=len(raw) or not raw[j].strip().startswith('ВЫБОР'):
                flush_choice()
            continue
        # if we somehow have pending and this isn't choice, flush
        if pending_choice:
            flush_choice()
        if st.startswith('[') and st.endswith(']'):
            inner=st[1:-1]
            is_fight = bool(re.search(r'(^|\. )((Парный |Короткий )?Бой[\. ]|Поединок )', inner) or inner.startswith('Бой') or inner.startswith('Парный бой') or inner.startswith('Короткий бой') or inner.startswith('Поединок') or 'три волны' in inner)
            # don't treat "Игрок может..." setup as a fight until after choices; those remaks are replaced in preprocess
            if is_fight and 'Игрок может' not in inner:
                out.append("['fight']")
                i += 1
                continue
            add_narr(st)
            i += 1
            continue
        # Name: text
        m = re.match(r'^(?:Прощание\.\s+)?([^:]{1,40}):\s*(.*)$', st)
        if m and not st.startswith('http') and m.group(1) not in ('Примечание', 'Дружеский финал'):
            who = re.sub(r',\s+.*$', '', m.group(1).strip())
            add_spk(who, m.group(2).strip())
            i += 1
            continue
        # fallback narr
        add_narr(st)
        i += 1
    if pending_choice:
        flush_choice()
    return out

if __name__=='__main__':
    sample='''[Ночь.]
К: Опять.
ВЫБОР «Помочь открыть дверь»
К: Отойдите.
Водитель: Там ещё один.
ВЫБОР «Спросить дорогу и спуститься по лестнице»
К: Где тут можно посмотреть расписание боёв?
[Общее. Затем спускается.]
'''
    for x in compile_lines(sample):
        print(x)
