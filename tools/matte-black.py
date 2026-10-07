#!/usr/bin/env python3
"""Снятие ЧЁРНОГО фона с арта (свечение остаётся мягким полупрозрачным светом, без чёрной каймы).
   alpha = max(яркостный ключ max(R,G,B)/T, тело клинка); цвет «распремножается» (rgb/alpha), так что поверх чёрного картинка совпадает с исходником.
   Тело = силуэт (max>thr) с заполненными дырами; body — минимальная непрозрачность тела (1.0 — сплошной металл, 0.6 — стекло).
   python3 tools/matte-black.py in.png out_prefix [--T 140] [--thr 28] [--body 0.6]  → out_prefix_{art,256,128}.webp"""
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
args = sys.argv[1:]; src, out = args[0], args[1]
opt = {'T': 140.0, 'thr': 28.0, 'body': 0.6}
for i, a in enumerate(args):
    if a.startswith('--'): opt[a[2:]] = float(args[i + 1])
im = Image.open(src).convert('RGB'); rgb = np.asarray(im).astype(np.float32); m = rgb.max(2)
sil = Image.fromarray(((m > opt['thr']) * 255).astype(np.uint8))
fill = sil.copy(); W, H = fill.size
for p in [(0, 0), (W - 1, 0), (0, H - 1), (W - 1, H - 1)]:
    if fill.getpixel(p) == 0: ImageDraw.floodfill(fill, p, 128)
f = np.asarray(fill); body = ((f == 255) | (f == 0)).astype(np.uint8) * 255          # силуэт + внутренние дыры
body = np.asarray(Image.fromarray(body).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.2))).astype(np.float32) / 255
a = np.maximum(np.clip(m / opt['T'], 0, 1), body * opt['body'])
a = np.where((m < 3) & (body < 0.01), 0, a)                                                           # чистый фон
safe = np.maximum(a, 1e-3)[..., None]
col = np.clip(rgb / safe, 0, 255)
out_im = Image.fromarray(np.dstack([col, a * 255]).astype(np.uint8), 'RGBA')
bb = Image.fromarray((a * 255 > 6).astype(np.uint8) * 255).getbbox(); out_im = out_im.crop(bb)
w, h = out_im.size; s = 512 / h
out_im.resize((max(1, round(w * s)), 512), Image.LANCZOS).save(out + '_art.webp', quality=88, method=6)
for S in (128, 256):
    pad = S * 0.04; sc = min((S - 2 * pad) / w, (S - 2 * pad) / h); r = out_im.resize((max(1, round(w * sc)), max(1, round(h * sc))), Image.LANCZOS)
    c = Image.new('RGBA', (S, S), (0, 0, 0, 0)); c.paste(r, ((S - r.width) // 2, (S - r.height) // 2), r); c.save(out + '_%d.webp' % S, quality=90, method=6)
print(out, bb, out_im.size)
