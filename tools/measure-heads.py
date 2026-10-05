#!/usr/bin/env python3
"""Головы спрайтов VN: единый размер и линия глаз для ВСЕХ портретов (герой, генералы, свита, подчинённые).
Проблема: fw (ширина лица в manifest.dim) у героя и у нового каста получены разными способами (каскад по исходникам героя /
ручные кадры cast-frames.json), а fy — центр рамки каскада, а не линия глаз: при «равных» fw головы и глаза расходились.
Решение: разметка tools/data/head-metrics.json (линия зрачков eye и подбородок chin в долях 0.1·fw от центра каскада, на нейтральном спрайте)
→ manifest.head[id] = [eyeDy, k]: линия глаз = fy + eyeDy·fw, «единица головы» = k·fw, где k = ½·(1 + (chin−eye)/EC_ref) — среднее ширины лица
по каскаду и длины «глаза→подбородок» (EC_ref — медиана взрослых того же пола). Раскладка (RPG.artMetricsOf) масштабирует по k·fw и выравнивает по глазам.
  python3 tools/measure-heads.py          — записать manifest.head (+ сверка с каскадом lbpcascade_animeface)
  python3 tools/measure-heads.py --avatars — пересобрать аватары <id>_av.webp (256×320) из нейтральных спрайтов с ОДИНАКОВЫМ кадром головы
  python3 tools/measure-heads.py --sheet  — сетки для разметки/проверки: $SHOTS (/workspace/shots)/heads-grid-*.jpg (≤1200 px)"""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE); V = os.path.join(ROOT, 'assets', 'vn')
HM = json.load(open(os.path.join(HERE, 'data', 'head-metrics.json'))); MP = os.path.join(V, 'manifest.json'); man = json.load(open(MP))
ids = [k for k in HM if not k.startswith('_')]
import statistics
EC_REF = {sx: statistics.median(HM[n]['chin'] - HM[n]['eye'] for n in ids if HM[n]['kind'] == 'adult' and HM[n]['sex'] == sx and not HM[n].get('same')) for sx in 'mf'}

def sheet():
    from PIL import Image, ImageDraw
    TW, TH = 400, 500
    def tile(n):
        f = n + '_neutral.webp'; d = man['dim'][f]; im = Image.open(os.path.join(V, f)).convert('RGBA').resize((d[0], d[1]))
        fx, fy, fw = d[3], d[4], d[5]; c = im.crop(tuple(int(v) for v in (fx - 0.6 * fw, fy - 0.5 * fw, fx + 0.6 * fw, fy + 1.0 * fw)))
        bg = Image.new('RGB', c.size, (70, 70, 90)); bg.paste(c, mask=c.split()[3]); bg = bg.resize((TW, TH)); dr = ImageDraw.Draw(bg); u = TW / 12
        for i in range(-6, 7): p = TW / 2 + i * u; dr.line([(p, 0), (p, TH)], fill=(255, 0, 0) if i == 0 else (0, 200, 255)); dr.text((p + 2, 2), str(i), fill=(255, 255, 255))
        for i in range(-5, 11): p = TH / 3 + i * u; dr.line([(0, p), (TW, p)], fill=(255, 0, 0) if i == 0 else (0, 200, 255)); dr.text((2, p + 1), str(i), fill=(255, 255, 255))
        h = HM[n]
        for v, col in ((h['eye'], (0, 255, 0)), (h['chin'], (255, 0, 255))): p = TH / 3 + v * u; dr.line([(0, p), (TW, p)], fill=col, width=3)
        dr.text((40, TH - 14), n, fill=(255, 255, 0)); return bg
    for k in range(0, len(ids), 3):
        sh = Image.new('RGB', (3 * TW, TH))
        for i, n in enumerate(ids[k:k + 3]): sh.paste(tile(n), (i * TW, 0))
        out = os.path.join(os.environ.get('SHOTS', '/workspace/shots'), 'heads-grid-%d.jpg' % (k // 3)); sh.save(out, quality=85); print(out)

def apply():
    head = {}
    for n in ids:
        h = HM[n]; s = HM.get(h.get('same'), h); ec = s['chin'] - s['eye']
        head[n] = [round(h['eye'] / 10, 3), round(0.5 * (1 + ec / EC_REF[s['sex']]), 3)]
    man['head'] = head; print('медианы глаза→подбородок (0.1·fw):', EC_REF)
    try:   # сверка: ширина лица по каскаду на итоговых файлах ≈ fw (иначе разметка устарела после переимпорта)
        import cv2, numpy as np
        from PIL import Image
        C = cv2.CascadeClassifier(os.path.join(HERE, 'data', 'lbpcascade_animeface.xml'))
        for n in ids:
            f = n + '_neutral.webp'; d = man['dim'][f]; im = Image.open(os.path.join(V, f)).convert('RGBA').resize((d[0], d[1])); bg = Image.new('RGB', im.size, (128,) * 3); bg.paste(im, mask=im.split()[3])
            r = [w for x, y, w, hh in C.detectMultiScale(cv2.equalizeHist(cv2.cvtColor(np.asarray(bg), cv2.COLOR_RGB2GRAY)), 1.03, 3, minSize=(100, 100)) if y + hh / 2 < d[1] * 0.45]
            print('%-11s eye %+.2f fw  k %.3f  каскад fw %s' % (n, head[n][0], head[n][1], ('%.0f / %d' % (np.median(r), d[5])) if r else '—'))
    except ImportError: pass
    json.dump(man, open(MP, 'w'), ensure_ascii=False, sort_keys=True, separators=(',', ':')); print('manifest.head:', len(head))

def avatars():
    # кадр аватара от «единицы головы» hu = k·fw: ширина 1.75·hu, 4:5, линия глаз на 0.72·hu от верха — у всех одинаково (герой, каст, подчинённые)
    from PIL import Image
    head = man.get('head') or {}
    for n in ids:
        f = n + '_neutral.webp'; d = man['dim'][f]; im = Image.open(os.path.join(V, f)).convert('RGBA'); sc = im.size[0] / d[0]
        e, k = head[n]; hu = k * d[5]; eye = d[4] + e * d[5]; w = 1.75 * hu; h = w * 1.25; x0 = d[3] - w / 2; y0 = eye - 0.72 * hu
        box = tuple(int(round(v * sc)) for v in (x0, y0, x0 + w, y0 + h)); c = im.crop(box).resize((256, 320), Image.LANCZOS)   # вне холста — прозрачно
        out = os.path.join(V, man['av'][n]); c.save(out, 'WEBP', quality=90, method=6); print(out, box)

if '--sheet' in sys.argv: sheet()
elif '--avatars' in sys.argv: avatars()
else: apply()
