#!/usr/bin/env python3
"""Импорт героя (не вырезание фона: исходники — настоящие PNG с альфой 1024×1536): /workspace/vn-art/newhero (обычный облик, cid hero) и /workspace/vn-art/newdemon (форма Короля, cid hero_demon)
-> assets/vn/hero_<mood>.webp / hero_demon_<mood>.webp. Обновляет только записи героя в manifest.json (portraits/dim/src/pre/av/v); остальные портреты не трогает.
Ключевые свойства (v2.5.2):
  • ОДИН кадр на все эмоции формы: общий bbox объединения альф всех эмоций → одинаковый размер холста, масштаб и якорь (плечи/ноги не прыгают при смене эмоции);
  • родное разрешение исходника (никакого даунскейла): файл = кроп исходника 1:1, webp q=92, alpha_quality=100;
  • лицо (fx, fy, fw) — консенсус каскада lbpcascade_animeface по всем эмоциям и ОДНО значение для всех файлов формы; логические единицы раскладки: лицо = 240 (как у остальных бюстов);
  • dim = [w, h, 1, fx, fy, fw, x0, y0, vh, fs]: vh — «видимая высота» кадра в логических единицах (герой в рост до бёдер, ниже — под диалогом), fs — масштаб файла к логическим единицам.
Запуск: python3 tools/import-hero.py normal|demon"""
import os, sys, json, hashlib
from PIL import Image
import numpy as np
import cv2
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE); OUT = os.path.join(ROOT, 'assets', 'vn')
FORM = sys.argv[1] if len(sys.argv) > 1 else 'normal'          # normal — обычный облик (cid hero), demon — форма Короля Демонов (cid hero_demon)
CFG = {'normal': dict(src='/workspace/vn-art/newhero', pre='hero_', cid='hero', alias={'despair': 'sad'}),
       'demon': dict(src='/workspace/vn-art/newdemon', pre='herod_', cid='hero_demon', alias={})}[FORM]
SRC = sys.argv[2] if len(sys.argv) > 2 else CFG['src']
CASCADE = cv2.CascadeClassifier(os.path.join(HERE, 'data', 'lbpcascade_animeface.xml'))
MOODS = ['neutral', 'angry', 'sad', 'smirk', 'shy', 'surprised']
Q, AQ = 92, 100
FACE_W = 240.0          # лицо в логических единицах раскладки (как у остальных бюстов)
BODY_FW = 3.8           # от центра лица вниз до линии «под диалогом» — в ширинах лица (бёдра/верх бедра)

def detect_faces(raw):
    bg = Image.new('RGB', raw.size, (128, 128, 128)); bg.paste(raw, mask=raw.getchannel('A'))
    g = cv2.equalizeHist(cv2.cvtColor(np.asarray(bg), cv2.COLOR_RGB2GRAY)); a = np.asarray(raw.getchannel('A')) > 127; h, w = a.shape; out = []
    for r in CASCADE.detectMultiScale(g, scaleFactor=1.05, minNeighbors=2, minSize=(60, 60)):
        x, y, ww, hh = [int(v) for v in r]
        if y + hh / 2 > h * 0.6 or not (80 <= ww <= 400) or not a[min(h - 1, y + hh // 2), min(w - 1, x + ww // 2)]: continue
        out.append((x + ww / 2, y + hh / 2, float(ww)))
    return out

RAW = {m: Image.open(os.path.join(SRC, CFG['pre'] + m + '.png')).convert('RGBA') for m in MOODS}
assert len({im.size for im in RAW.values()}) == 1, 'размеры исходников различаются'
dets = [d for m in MOODS for d in detect_faces(RAW[m])]
assert dets, 'лицо не найдено'
fx, fy, fw = (float(np.median([d[i] for d in dets])) for i in range(3))
print('лицо (исходные px): центр (%.0f, %.0f) ширина %.0f по %d детекциям' % (fx, fy, fw, len(dets)))
# общий кадр: объединение альф всех эмоций (+ отступ)
bbs = [im.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox() for im in RAW.values()]
W0, H0 = RAW['neutral'].size; pad = 4
x0 = max(0, min(b[0] for b in bbs) - pad); y0 = max(0, min(b[1] for b in bbs) - pad); x1 = min(W0, max(b[2] for b in bbs) + pad); y1 = min(H0, max(b[3] for b in bbs) + pad)
cw, ch = x1 - x0, y1 - y0; K = FACE_W / fw
dims = [round(cw * K), round(ch * K), 1, round((fx - x0) * K), round((fy - y0) * K), round(FACE_W), round(x0 * K), round(y0 * K), 0, round(1 / K, 4)]
dims[8] = min(dims[1], round(dims[4] + BODY_FW * FACE_W))
print('кадр %dx%d px (из %dx%d) -> логические %dx%d, K=%.3f, видимая высота vh=%d' % (cw, ch, W0, H0, dims[0], dims[1], K, dims[8]))

man_path = os.path.join(OUT, 'manifest.json'); man = json.load(open(man_path))
for d in (man['dim'], man['src']): d.pop('hero_despair.webp', None)      # v2.5.1 хранил дубль файла despair — теперь алиас на hero_sad.webp
cid = CFG['cid']; files = {}
def webp_name(m): return ('hero_%s.webp' % m) if FORM == 'normal' else ('hero_demon_%s.webp' % m)
for m in MOODS:
    sig = 'n1-' + hashlib.md5(open(os.path.join(SRC, CFG['pre'] + m + '.png'), 'rb').read()).hexdigest()[:10]
    crop = RAW[m].crop((x0, y0, x1, y1))
    for name in [webp_name(m)]:
        crop.save(os.path.join(OUT, name), 'WEBP', quality=Q, method=6, alpha_quality=AQ, exact=False)
        man['dim'][name] = list(dims); man['src'][name] = sig; files[name] = os.path.getsize(os.path.join(OUT, name)) // 1024
    man['portraits'].setdefault(cid, {})[m] = webp_name(m)
    for a, t in CFG['alias'].items():
        if t == m: man['portraits'][cid][a] = webp_name(m)      # алиас despair -> тот же файл hero_sad.webp (без дубля в весе и прекэше)
    if m == 'neutral':       # аватар для маленьких карточек (профиль, бой, слоты, список): кроп лица 4:5, 256×320
        aw = 2.3 * fw; ah = aw * 1.25; ax = min(max(0, fx - aw / 2), W0 - aw); ay = min(max(0, fy - 1.05 * fw), H0 - ah)
        av = RAW[m].crop((round(ax), round(ay), round(ax + aw), round(ay + ah))).resize((256, 320), Image.LANCZOS)
        an = cid + '_av.webp'; av.save(os.path.join(OUT, an), 'WEBP', quality=88, method=6, alpha_quality=100, exact=False)
        man.setdefault('av', {})[cid] = an; man['src'][an] = sig; files[an] = os.path.getsize(os.path.join(OUT, an)) // 1024
if FORM == 'demon':          # старый ключ hero.demon -> нейтральный облик Короля
    man['portraits']['hero']['demon'] = 'hero_demon_neutral.webp'
    for d in (man['dim'], man['src']): d.pop('hero_demon.webp', None)
    if os.path.exists(os.path.join(OUT, 'hero_demon.webp')): os.remove(os.path.join(OUT, 'hero_demon.webp'))
print('записано (KB):', files, '| сумма', sum(files.values()), 'KB')
man['pre'] = sorted(set(list(man['cg'].values()) + [v['neutral'] for v in man['portraits'].values() if 'neutral' in v] + list(man.get('av', {}).values()) + list(man['portraits']['hero'].values()) + list(man['portraits'].get('hero_demon', {}).values())))
man['v'] = hashlib.md5(json.dumps([man['portraits'], man['cg'], man['src'], man['dim'], man.get('av')], sort_keys=True).encode()).hexdigest()[:8]
json.dump(man, open(man_path, 'w'), ensure_ascii=False, separators=(',', ':'), sort_keys=True)
print('manifest v', man['v'], man['portraits'][cid])
