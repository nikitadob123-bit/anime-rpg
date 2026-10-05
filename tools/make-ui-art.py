"""Иллюстрации интерфейса v2.7.0 → assets/ui/*.webp.
Источник: апскейлы (×4) кропов макета пользователя (/workspace/vn-art/ui-ref/crops/*_x4.png).
Генератор картинок в среде был недоступен, поэтому арт взят из макета; производные (ночной собор, фон карточки героя) — цветокоррекцией.
python3 tools/make-ui-art.py [папка_кропов]"""
import sys, os
from PIL import Image, ImageFilter, ImageEnhance, ImageChops
SRC = sys.argv[1] if len(sys.argv) > 1 else '/workspace/vn-art/ui-ref/crops'
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'ui')
os.makedirs(OUT, exist_ok=True)

def load(n, box=None):
    im = Image.open(os.path.join(SRC, n + '_x4.png')).convert('RGB')
    if box:
        w, h = im.size; l, t, r, b = box; im = im.crop((l, t, w - r, h - b))
    return im

def save(im, name, limit_kb, q=88):
    p = os.path.join(OUT, name)
    while True:
        im.save(p, 'WEBP', quality=q, method=6)
        kb = os.path.getsize(p) / 1024
        if kb <= limit_kb or q <= 40: break
        q -= 4
    print(f'{name}: {im.size[0]}x{im.size[1]} q{q} {kb:.1f} KB')

def fit_w(im, w):
    return im.resize((w, round(im.size[1] * w / im.size[0])), Image.LANCZOS)

def tint(im, rgb, a):
    return Image.blend(im, Image.new('RGB', im.size, rgb), a)

# баннер главной: руины с кольцом Нимба (обрезаны рамка и орнамент макета)
camp = load('camp', (28, 24, 28, 64))
save(fit_w(camp, 900), 'banner.webp', 150)
# плитки 3:4
for n in ['shop', 'forge', 'fire', 'altar']:
    im = load(n, (10, 10, 10, 10)); w, h = im.size; tw = round(h * 3 / 4)
    if tw < w: im = im.crop(((w - tw) // 2, 0, (w - tw) // 2 + tw, h))
    else: th = round(w * 4 / 3); im = im.crop((0, 0, w, th))
    save(im.resize((360, 480), Image.LANCZOS), f'tile_{n}.webp', 60)
# VN-фоны (портрет)
cat = load('cathedral', (26, 8, 10, 8))
save(fit_w(cat, 720), 'vn_cathedral.webp', 200)
# «ночной собор»: холодный фиолетовый тон, тёплые окна приглушены
night = ImageEnhance.Brightness(tint(cat, (40, 18, 80), .38)).enhance(.78)
save(fit_w(night, 720), 'vn_cathedral_night.webp', 200)
# руины в сумерках (портретный кроп баннера с кольцом)
w, h = camp.size; tw = round(h * 0.56)
ru = camp.crop(((w - tw) // 2, 0, (w - tw) // 2 + tw, h))
save(fit_w(ru, 640), 'vn_ruins.webp', 200)
# фон карточки героя: туман и руины (размыто, фиолетовый тон)
hb = ImageEnhance.Brightness(tint(camp.filter(ImageFilter.GaussianBlur(10)), (52, 20, 96), .5)).enhance(.62)
save(fit_w(hb, 640), 'hero_bg.webp', 80, 70)
