# -*- coding: utf-8 -*-
import re, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from tkparse import compile_lines, js_str

ROOT = Path('/workspace/anime-rpg')
rom_src = Path('/workspace/tekken-script-parts/rom_raw.txt').read_text(encoding='utf-8')
meet_src = Path('/workspace/tekken-script-parts/meet_raw.txt').read_text(encoding='utf-8')

HEARTS = [
    ('РЕЙНА', 'tk_reina', 'rei'),
    ('НИНА', 'tk_nina', 'nina'),
    ('АННА', 'tk_anna', 'ann'),
    ('СЯОЮЙ', 'tk_xiaoyu', 'xia'),
    ('АСУКА', 'tk_asuka', 'asu'),
    ('ЛИЛИ', 'tk_lili', 'lil'),
    ('АСУСЕНА', 'tk_azucena', 'azu'),
    ('АЛИСА', 'tk_alisa', 'ali'),
    ('ЗАФИНА', 'tk_zafina', 'zaf'),
    ('ДЖУН', 'tk_jun', 'jun'),
    ('ЛИДИЯ', 'tk_lidia', 'lid'),
    ('МИАРИ', 'tk_miary', 'mia'),
    ('КУНИМИЦУ', 'tk_kuni', 'kun'),
    ('ЛЕО', 'tk_leo', 'leo'),
]

def emit_lines(arr, indent=6):
    return ',\n'.join((' ' * indent) + x for x in arr)

def title_of(head):
    m = re.search(r'«([^»]+)»', head)
    return m.group(1) if m else head.split('—')[-1].split('.')[0].strip() if '—' in head else 'Сцена'

def body_of(section):
    # drop first header line, keep rest
    lines = section.splitlines()
    rest = '\n'.join(lines[1:]).strip('\n')
    # first header often contains a remak at the end: "Встреча — «X». [remak]"
    m = re.search(r'\[(.*)\]\s*$', lines[0])
    if m:
        rest = '[' + m.group(1) + ']\n' + rest
    # Дружеский финал: Name: text
    if lines[0].startswith('Дружеский финал'):
        after = re.sub(r'^Дружеский финал:\s*', '', lines[0]).strip()
        rest = after + ('\n' + rest if rest else '')
    return rest

# split hearts
parts = re.split(r'\n(?=СЕРДЦЕ )', rom_src)
hearts = []
for p in parts:
    if 'СЕРДЦЕ' not in p[:40] and 'СЕРДЦЕ 01' in p:
        p = p[p.find('СЕРДЦЕ 01'):]
    if not p.strip().startswith('СЕРДЦЕ'):
        continue
    title = p.splitlines()[0]
    bits = re.split(r'\n(?=Встреча |Сближение |Финал |Дружеский финал)', p)
    sections = {}
    for b in bits[1:]:
        key = b.splitlines()[0]
        if key.startswith('Встреча'): sections['meet'] = b
        elif key.startswith('Сближение'): sections['close'] = b
        elif key.startswith('Дружеский'): sections['friend'] = b
        elif key.startswith('Финал'): sections['end'] = b
    who = None
    for name, hid, sp in HEARTS:
        if name in title:
            who = (hid, sp, name)
            break
    if not who:
        print('UNMAPPED', title)
        continue
    hearts.append((who, title, sections))

print('parsed hearts', len(hearts))

out = []
out.append("  const N = (t) => ['n', t];")
out.append("  // --- v2.31 scenes: канонический текст сценария ---")
for (hid, sp, name), title, sec in hearts:
    meet_t = title_of(sec['meet'].splitlines()[0])
    close_t = title_of(sec['close'].splitlines()[0])
    end_t = title_of(sec['end'].splitlines()[0])
    love_flag = 'love_' + hid
    friend_flag = 'friend_' + hid
    flags = {}
    chs = re.findall(r'ВЫБОР «([^»]+)»', sec['close'])
    if len(chs) >= 1: flags[chs[0]] = {love_flag: 1}
    if len(chs) >= 2: flags[chs[1]] = {friend_flag: 1}
    meet_l = compile_lines(body_of(sec['meet']))
    close_l = compile_lines(body_of(sec['close']), flags)
    end_l = compile_lines(body_of(sec['end']))
    fr_l = compile_lines(body_of(sec['friend'])) if 'friend' in sec else []
    finale = [
        "['if', %s, [\n%s\n      ]]" % (js_str(love_flag), emit_lines(end_l, 8)),
        "['if', %s, [\n%s\n      ]]" % (js_str(friend_flag), emit_lines(fr_l, 8)),
    ]
    def scene(t, sub, lines):
        return "    { t: %s, sub: %s, bg: 'tk_dojo', lines: [\n      ['title', %s, %s],\n%s\n    ] }" % (
            js_str(t), js_str(sub), js_str(t), js_str(sub), emit_lines(lines, 6))
    out.append("  if (R[%s]) {" % js_str(hid))
    out.append("    R[%s].scenes = [" % js_str(hid))
    out.append(scene(meet_t, 'Встреча', meet_l) + ',')
    out.append(scene(close_t, 'Сближение', close_l) + ',')
    out.append(scene(end_t, 'Финал', finale))
    out.append("    ];")
    out.append("  }")
    out.append("")

out.append("""
  E.tkRomGate = function (s, id, idx) {
    if (!s || !E.tkEnsure) return true;
    const t = E.tkEnsure(s);
    const has = (ch) => t.story && t.story.includes(ch);
    if (String(id).indexOf('tk_') !== 0) return true;
    if (id === 'tk_reina') {
      if (t.flags && t.flags.tk_reina_no) return false;
      if (idx === 0) return has('tk05_street');
      if (idx === 1) return has('tk11_daughter');
      if (idx === 2) return has('tk17_blood');
    }
    if (id === 'tk_jun') {
      if (idx === 0) return has('tk13_island');
      if (idx === 1) return has('tk15_last');
      if (idx === 2) return has('tk16_outcome');
    }
    if (idx === 0) return has('tk05_street');
    if (idx === 1) return has('tk10_coliseum');
    if (idx === 2) return has('tk17_blood') || has('tk16_outcome');
    return true;
  };
  const _pend2 = E.romScenePending;
  if (_pend2) E.romScenePending = function (s, id) {
    const i = _pend2.apply(this, arguments);
    if (i < 0) return i;
    if (E.tkRomGate && !E.tkRomGate(s, id, i)) return -1;
    return i;
  };
""")

# --- overwrite scenes at end of tekken-romance.js ---
rom_js = Path('/workspace/anime-rpg/js/tekken-romance.js').read_text(encoding='utf-8')
# strip previous generated tail if any
idx = rom_js.find('  // --- v2.31 scenes')
if idx < 0:
    idx = rom_js.find("  const N = (t) => ['n', t];")
if idx >= 0:
    # drop a helper just before the generated tail
    pre = rom_js[:idx]
    k = pre.rfind("  const N = (t) => ['n', t];")
    if k >= 0 and pre[k:].strip().startswith('const N'):
        idx = k
    rom_js = rom_js[:idx]
marker = "  if (typeof module !== 'undefined') module.exports = RPG;"
if marker not in rom_js:
    if not rom_js.rstrip().endswith('})();'):
        rom_js += "\n\n" + marker + "\n})();\n"
    else:
        rom_js = rom_js.rstrip()[:-5] + "\n" + marker + "\n})();\n"
rom_js = rom_js.replace(marker, '\n'.join(out) + '\n\n' + marker, 1)

Path('/workspace/anime-rpg/js/tekken-romance.js').write_text(rom_js, encoding='utf-8')
print('romance bytes', Path('/workspace/anime-rpg/js/tekken-romance.js').stat().st_size)

# ---- meetings ----
MEET_ID = {
    'КАДЗУЯ': ('kazuya', 'kaz', 'tk_kazuya'),
    'ДЗИН КАДЗАМА': ('jin', 'jin', 'tk_jin'),
    'ДЗИН ': ('jin', 'jin', 'tk_jin'),
    'КИНГ': ('king', 'king', 'tk_king'),
    'ПОЛ': ('paul', 'paul', 'tk_paul'),
    'МАРШАЛЛ ЛО': ('law', 'law', 'tk_law'),
    'ЛО ': ('law', 'law', 'tk_law'),
    'ДЖЕК-8': ('jack', 'jac', 'tk_jack'),
    'ЛАРС': ('lars', 'lars', 'tk_lars'),
    'ЛЕРОЙ': ('leroy', 'ler', 'tk_leroy'),
    'БРАЙАН': ('bryan', 'bry', 'tk_bryan'),
    'ХВОРАН': ('hwoarang', 'hwo', 'tk_hwoarang'),
    'КЛАУДИО': ('claudio', 'cla', 'tk_claudio'),
    'РЭЙВЕН': ('raven', 'rav', 'tk_raven'),
    'СТИВ': ('steve', 'ste', 'tk_steve'),
    'КУМА': ('kuma', 'kum', 'tk_kuma'),
    'ЁСИМИЦУ': ('yoshimitsu', 'yos', 'tk_yoshimitsu'),
    'ШАХИН': ('shaheen', 'sha', 'tk_shaheen'),
    'ДРАГУНОВ': ('dragunov', 'dra', 'tk_dragunov'),
    'ФЭН': ('feng', 'fen', 'tk_feng'),
    'ПАНДА': ('panda', 'pan', 'tk_panda'),
    'ЛИ ЧАОЛАН': ('lee', 'lee', 'tk_lee'),
    'ЛИ ': ('lee', 'lee', 'tk_lee'),
    'ДЬЯВОЛ ДЗИН': ('deviljin', 'djin', 'tk_deviljin'),
    'ДЬЯВОЛЬСКИЙ ДЗИН': ('deviljin', 'djin', 'tk_deviljin'),
    'ВИКТОР': ('victor', 'vic', 'tk_victor'),
    'ЭДДИ': ('eddy', 'edd', 'tk_eddy'),
    'ХЭЙХАТИ': ('heihachi', 'hei', 'tk_heihachi'),
    'КЛАЙВ': ('clive', 'cli', 'tk_clive'),
    'ФАКУМРАМ': ('fahkumram', 'fah', 'tk_fahkumram'),
    'АРМОР КИНГ': ('armorking', 'ark', 'tk_armorking'),
    'БОБ': ('bob', 'bob', 'tk_bob'),
    'РОДЖЕР': ('roger', 'rog', 'tk_roger'),
    'ЮДЗИРО': ('yujiro', 'yuj', 'tk_yujiro'),
    'АЗАЗЕЛЬ': ('azazel', 'aza', None),
}

def map_meet(head):
    nm = re.sub(r'^(БОЕЦ \d+\.\s*|СЮЖЕТНЫЙ ГОСТЬ\.\s*)', '', head)
    nm = re.sub(r'\s*—\s*«.*$', '', nm).strip()
    # longest key first
    keys = sorted(MEET_ID.keys(), key=len, reverse=True)
    for k in keys:
        if k.strip() and (nm.startswith(k.strip()) or k.strip() in nm):
            return MEET_ID[k]
    return None

# unlocks
UNLOCK = {
    'reina': 'ch02_reina',  # not a meet
    'jin': "after:tk02_reina",
    'hwoarang': "after:tk02_reina",
    'law': "after:tk02_reina",
    'paul': "after:tk02_reina",
    'leroy': "after:tk02_reina",
    'steve': "after:tk02_reina",
    'kuma': "after:tk02_reina",
    'king': "after:tk05_street",
    'asuka': "after:tk05_street",
    'lili': "after:tk05_street",
    'xiaoyu': "after:tk05_street",
    'panda': "after:tk05_street",
    'nina': "after:tk07_sisters",
    'anna': "after:tk07_sisters",
    'yoshimitsu': "after:tk07_sisters",
    'azucena': "after:tk08_flagless",
    'lidia': "after:tk08_flagless",
    'victor': "after:tk08_flagless",
    'eddy': "after:tk08_flagless",
    'bryan': "after:tk08_flagless",
    'raven': "after:tk08_flagless",
    'shaheen': "after:tk08_flagless",
    'dragunov': "after:tk08_flagless",
    'feng': "after:tk08_flagless",
    'leo': "after:tk08_flagless",
    'claudio': "after:tk08_flagless",
    'zafina': "after:tk08_flagless",
    'lee': "after:tk08_flagless",
    'jack': "after:tk08_flagless",
    'miary': "after:tk08_flagless",
    'kuni': "after:tk08_flagless",
    'bob': "after:tk08_flagless",
    'fahkumram': "after:tk08_flagless",
    'armorking': "after:tk08_flagless",
    'roger': "after:tk08_flagless",
    'kazuya': "after:tk05_street",  # lodge until ch10
    'lars': "after:tk12_night",
    'alisa': "after:tk12_night",
    'jun': "after:tk13_island",
    'deviljin': "after:tk13_island",
    'heihachi': "ending",
    'clive': "ending",
    'yujiro': "ending",
    'azazel': "after:tk09_case",
}

mparts = re.split(r'\n(?=БОЕЦ |СЮЖЕТНЫЙ ГОСТЬ)', meet_src)
meets = []
for p in mparts:
    if not (p.startswith('БОЕЦ') or p.startswith('СЮЖЕТНЫЙ')):
        continue
    head = p.splitlines()[0]
    body = '\n'.join(p.splitlines()[1:])
    # first remak may be on title line
    m = re.search(r'\[(.*)\]\s*$', head)
    if m:
        body = '[' + m.group(1) + ']\n' + body
    quoted = re.search(r'«([^»]+)»', head)
    sub = quoted.group(1) if quoted else head
    mapped = map_meet(head)
    if not mapped:
        print('UNMAPPED MEET', head)
        continue
    mid, sp, art = mapped
    meets.append((mid, sp, art, head, sub, body))
print('meets', len(meets), [m[0] for m in meets])

mout = []
mout.append("/* v2.31.0 Встречи с бойцами и гостями по авторскому сценарию. */")
mout.append("(function () {")
mout.append("  const RPG = globalThis.RPG, D = RPG.D, E = RPG.E;")
mout.append("  const H = (t, m) => ['h', t, m || 'n'];")
mout.append("  const N = (t) => ['n', t];")
mout.append("  D.TK_MEETS = [];")
for mid, sp, art, head, sub, body in meets:
    # name from speakers later
    lines = compile_lines(body)
    un = UNLOCK.get(mid, 'after:tk08_flagless')
    name = head
    # nicer name: after number
    nm = re.sub(r'^(БОЕЦ \d+\.\s*|СЮЖЕТНЫЙ ГОСТЬ\.\s*)', '', head)
    nm = re.sub(r'\s*—\s*«.*$', '', nm).strip()
    mout.append("  D.TK_MEETS.push({ id: %s, n: %s, sub: %s, sp: %s, art: %s, unlock: %s, bg: 'tk_dojo', lines: [" % (
        js_str(mid), js_str(nm), js_str(sub), js_str(sp), js_str(art) if art else 'null', js_str(un)))
    mout.append(emit_lines(lines, 4))
    mout.append("  ]});")
mout.append("""
  D.TK_MEET_MAP = {};
  D.TK_MEETS.forEach((m) => { D.TK_MEET_MAP[m.id] = m; });

  E.tkMeetOpen = function (s, id) {
    const t = E.tkEnsure(s);
    const m = D.TK_MEET_MAP[id]; if (!m) return false;
    if (id === 'reina' || (m.sp === 'rei' && t.flags.tk_reina_no)) return false;
    const u = m.unlock || '';
    if (u === 'ending') return !!(t.ending && t.story && t.story.includes('tk19_home'));
    if (u.indexOf('after:') === 0) return !!(t.story && t.story.includes(u.slice(6)));
    return true;
  };
  E.tkMeetDone = function (s, id) {
    const t = E.tkEnsure(s);
    t.meets = t.meets || [];
    if (!t.meets.includes(id)) t.meets.push(id);
  };

  if (typeof module !== 'undefined') module.exports = RPG;
})();
""")
Path('/workspace/anime-rpg/js/tekken-meet.js').write_text('\n'.join(mout), encoding='utf-8')
print('meet bytes', Path('/workspace/anime-rpg/js/tekken-meet.js').stat().st_size)
