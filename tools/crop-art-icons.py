#!/usr/bin/env python3
"""v2.17.1: иконки артефактов из сгенерированных картинок: кроп по объекту+свечению (+6%), квадрат с цветом края → icons/<id>.webp 512 и icons/t/<id>.webp 128.
python3 tools/crop-art-icons.py [src_dir=/workspace/gen-art]"""
import sys, os, json
import numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); SRC = sys.argv[1] if len(sys.argv) > 1 else '/workspace/gen-art'
OUT = os.path.join(ROOT, 'assets/artifacts/icons')
for f in sorted(os.listdir(SRC)):
    if not f.endswith('.jpg'): continue
    i = f[:-4]; im = Image.open(os.path.join(SRC, f)).convert('RGB'); a = np.asarray(im).astype(np.int16); h, w, _ = a.shape
    edge = np.concatenate([a[:4].reshape(-1, 3), a[-4:].reshape(-1, 3), a[:, :4].reshape(-1, 3), a[:, -4:].reshape(-1, 3)])
    bg = np.median(edge, 0); d = np.abs(a - bg).sum(2); m = d > 38
    ys, xs = np.where(m)
    if len(xs) < 50: x0, y0, x1, y1 = 0, 0, w, h
    else: x0, x1 = np.percentile(xs, [0.5, 99.5]); y0, y1 = np.percentile(ys, [0.5, 99.5])
    side = max(x1 - x0, y1 - y0) * 1.12; cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    c = Image.new('RGB', (int(side), int(side)), tuple(int(v) for v in bg))
    c.paste(im, (int(side / 2 - cx), int(side / 2 - cy)))
    c.resize((512, 512), Image.LANCZOS).save(os.path.join(OUT, i + '.webp'), quality=80, method=6)
    c.resize((128, 128), Image.LANCZOS).save(os.path.join(OUT, 't', i + '.webp'), quality=80, method=6)
    print(i, int(side))
