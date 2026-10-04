#!/usr/bin/env python3
"""Точечный импорт «обычного» облика героя (не демона): /workspace/vn-art/newhero/hero_<mood>.png (настоящие PNG с альфой, 1024×1536) ->
assets/vn/hero_<mood>.webp тем же пайплайном, что tools/import-art.py (бюст 720 px по высоте, кадр по bbox альфы, масштаб FS=0.7, геометрия лица tools/geom.py),
но БЕЗ вырезания фона и без пересборки остальных портретов: обновляет только записи hero_* в manifest.json (portraits/dim/src/pre/v).
hero_despair = hero_sad (старый ключ). hero_demon не трогается. Запуск: python3 tools/import-hero.py [папка]"""
import os, sys, json, hashlib
from PIL import Image
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE); OUT = os.path.join(ROOT, 'assets', 'vn')
FORM = sys.argv[1] if len(sys.argv) > 1 else 'normal'          # normal — обычный облик (cid hero), demon — форма Короля Демонов (cid hero_demon)
CFG = {'normal': dict(src='/workspace/vn-art/newhero', pre='hero_', cid='hero', alias={'despair': 'sad'}),
       'demon': dict(src='/workspace/vn-art/newdemon', pre='herod_', cid='hero_demon', alias={})}[FORM]
SRC = sys.argv[2] if len(sys.argv) > 2 else CFG['src']
sys.path.insert(0, HERE); import geom
import cv2
CASCADE = cv2.CascadeClassifier(os.path.join(HERE, 'data', 'lbpcascade_animeface.xml'))
PORT_H, Q, AQ, FS = 720, 74, 68, 0.7
MOODS = ['neutral', 'angry', 'sad', 'smirk', 'shy', 'surprised']

def silhouette_estimate(alpha):
    a = np.asarray(alpha) > 127; h, w = a.shape
    est = 0.45 * float(np.sqrt(a.sum())); rows = np.where(a.sum(axis=1) > 6)[0]; top = int(rows[0]) if len(rows) else 0
    hb = a[top: top + max(30, int((h - top) * 0.3))]; ys, xs = np.where(hb)
    return (float(xs.mean()) if len(xs) else w / 2, top + 0.62 * est, est)

def detect_faces(rgb, alpha, minsz=40):
    a = np.asarray(alpha) > 127; h, w = a.shape; est = 0.45 * float(np.sqrt(a.sum())); out = []
    g = cv2.equalizeHist(cv2.cvtColor(np.asarray(rgb), cv2.COLOR_RGB2GRAY))
    for r in CASCADE.detectMultiScale(g, scaleFactor=1.05, minNeighbors=2, minSize=(minsz, minsz)):
        x, y, ww, hh = [int(v) for v in r]
        if y + hh / 2 > h * 0.6 or not (0.3 * est <= ww <= 1.5 * est): continue
        if not a[min(h - 1, y + hh // 2), min(w - 1, x + ww // 2)]: continue
        out.append((x + ww / 2, y + hh / 2, float(ww)))
    return out

RAW, DET = {}, {}
for m in MOODS:
    raw = Image.open(os.path.join(SRC, CFG['pre'] + m + '.png')).convert('RGBA'); RAW[m] = raw
    bg = Image.new('RGB', raw.size, (128, 128, 128)); bg.paste(raw, mask=raw.getchannel('A'))      # детекция лица — на исходном разрешении
    DET[m] = detect_faces(bg, raw.getchannel('A'), 60)
alphas = {m: RAW[m].getchannel('A') for m in MOODS}
res, how, T = geom.solve(alphas, lambda mn: DET[mn], silhouette_estimate)
print('лица (исходные px):', {m: (tuple(round(v) for v in res[m]), how[m]) for m in MOODS})
# Исходник — персонаж в полный рост (1024×1536, голова ≈170 px). Остальные бюсты в игре: высота 720, лицо ≈240 логических px (раскладка VN выравнивает головы по fw).
# Поэтому масштабируем так, чтобы лицо героя стало FACE_W логических px, и берём верхние PORT_H строк (голова + грудь/плечи) — тот же кадр, что у прежних бюстов, и родное разрешение (FS·k ≈ 1).
FACE_W = 240.0; K = FACE_W / res['neutral'][2]
CUT = {}
for m in MOODS:
    raw = RAW[m]; im = raw.resize((round(raw.width * K), round(raw.height * K)), Image.LANCZOS); CUT[m] = im.crop((0, 0, im.width, PORT_H))
    fx, fy, fw = res[m]; res[m] = (fx * K, fy * K, fw * K)
print('масштаб K=%.3f, исходник %s -> %s' % (K, RAW['neutral'].size, CUT['neutral'].size))

man_path = os.path.join(OUT, 'manifest.json'); man = json.load(open(man_path))
cid = CFG['cid']; files = {}
def webp_name(m): return ('hero_%s.webp' % m) if FORM == 'normal' else ('hero_demon_%s.webp' % m)
for m in MOODS:
    k = CUT[m]; fx, fy, fw = res[m]
    bb = k.getchannel('A').point(lambda v: 255 if v > 10 else 0).getbbox()
    pad = max(6, int(0.02 * k.size[0])); x0 = max(0, bb[0] - pad); x1 = min(k.size[0], bb[2] + pad); y0 = max(0, bb[1] - pad)
    kk = k.crop((x0, y0, x1, k.size[1])); fx -= x0; fy -= y0; w, h = kk.size    # низ — кадр целиком (уходит под окно диалога)
    dims = [w, h, 1, round(fx), round(fy), round(fw), x0, y0]
    sig = 'm6n-' + hashlib.md5(open(os.path.join(SRC, CFG['pre'] + m + '.png'), 'rb').read()).hexdigest()[:10]
    names = [webp_name(m)] + [webp_name(a) for a, t in CFG['alias'].items() if t == m]
    for name in names:
        kk.resize((max(1, round(w * FS)), max(1, round(h * FS))), Image.LANCZOS).save(os.path.join(OUT, name), 'WEBP', quality=Q, method=6, alpha_quality=AQ, exact=False)
        man['dim'][name] = dims; man['src'][name] = sig; files[name] = os.path.getsize(os.path.join(OUT, name)) // 1024
    man['portraits'].setdefault(cid, {})[m] = webp_name(m)
    for a, t in CFG['alias'].items():
        if t == m: man['portraits'][cid][a] = webp_name(a)
    if m == 'neutral':       # аватар для маленьких карточек (профиль, бой, список слотов): кроп лица ~ 4:5, 256 px по ширине
        cw = 2.3 * fw; ch = cw * 1.25; ax = min(max(0, fx + x0 - cw / 2), k.size[0] - cw); ay = min(max(0, fy + y0 - 1.05 * fw), k.size[1] - ch)
        av = k.crop((round(ax), round(ay), round(ax + cw), round(ay + ch))).resize((256, 320), Image.LANCZOS)
        an = cid + '_av.webp'; av.save(os.path.join(OUT, an), 'WEBP', quality=80, method=6, alpha_quality=80, exact=False)
        man.setdefault('av', {})[cid] = an; man['src'][an] = sig; files[an] = os.path.getsize(os.path.join(OUT, an)) // 1024
if FORM == 'demon':          # старый ключ hero.demon -> нейтральный облик Короля (прежний hero_demon.webp заменён)
    man['portraits']['hero']['demon'] = 'hero_demon_neutral.webp'
    for d in (man['dim'], man['src']): d.pop('hero_demon.webp', None)
    if os.path.exists(os.path.join(OUT, 'hero_demon.webp')): os.remove(os.path.join(OUT, 'hero_demon.webp'))
print('записано (KB):', files)
man['pre'] = sorted(set(list(man['cg'].values()) + [v['neutral'] for v in man['portraits'].values() if 'neutral' in v] + list(man.get('av', {}).values())))   # аватары героя — в прекэш
man['v'] = hashlib.md5(json.dumps([man['portraits'], man['cg'], man['src'], man['dim'], man.get('av')], sort_keys=True).encode()).hexdigest()[:8]
json.dump(man, open(man_path, 'w'), ensure_ascii=False, separators=(',', ':'), sort_keys=True)
print('manifest v', man['v'], man['portraits'][cid])
